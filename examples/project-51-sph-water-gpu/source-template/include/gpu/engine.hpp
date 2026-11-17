#pragma once
#include "fluid/reference.hpp"
#include "gpu/capabilities.hpp"
#include "gpu/failure.hpp"
#include "gpu/passes.hpp"
#include "gpu/timer.hpp"
#include <chrono>
#include <memory>

namespace water51 {
// One nonblocking transaction at a time; a failed batch never replaces the committed bank.

class Engine {
    Gl& gl_;
    Capabilities capabilities_;
    Passes passes_;
    BatchTimer timer_;
    std::unique_ptr<Storage> storage_;
    GLsync fence_ = nullptr;
    std::chrono::steady_clock::time_point submitted_{};
    int committed_ = 0;
    int candidate_ = 0;
    bool initializing_ = false;
    bool stopped_ = false;
    GpuMeta meta_{};

    void fence() {
        gl_.MemoryBarrier(GL_SHADER_STORAGE_BARRIER_BIT | GL_BUFFER_UPDATE_BARRIER_BIT);
        fence_ = gl_.FenceSync(GL_SYNC_GPU_COMMANDS_COMPLETE, 0);
        if (fence_ == nullptr)
            throw std::runtime_error("Cannot create GPU completion fence");
        gl_.Flush();
        submitted_ = std::chrono::steady_clock::now();
    }

    public:
    Parameters parameters;
    GpuTiming timing;
    double modelTime = 0;
    double completionMs = 0;
    double enqueueMs = 0;
    std::uint64_t ticks = 0;

    Engine(Gl& gl, const std::filesystem::path& root, Model model)
        : gl_(gl), capabilities_(gl), passes_(gl, root), timer_(gl) {
        reset(model);
    }

    ~Engine() {
        if (fence_ != nullptr)
            gl_.DeleteSync(fence_);
    }

    bool pending() const {
        return fence_ != nullptr;
    }

    bool ready() const {
        return !initializing_ && !stopped_;
    }

    bool stopped() const {
        return stopped_;
    }

    const Model& model() const {
        return storage_->model;
    }

    const GpuMeta& meta() const {
        return meta_;
    }

    Storage& storage() {
        return *storage_;
    }

    int bank() const {
        return committed_;
    }

    void stop() {
        stopped_ = true;
    }

    // [snippet reset-transaction]
    void reset(Model model) {
#if LAB_CHECKPOINT < 6
        if (model.count > 512)
            throw std::length_error("All-pairs checkpoint is limited to 512 particles");
#endif
        if (pending())
            throw std::logic_error("Wait for the pending transaction before reset");
        // Same-size resets reuse an idle bank; one million particles need no second allocation.
        const bool reuse = storage_ && model.count == storage_->model.count && model.cells == storage_->model.cells;
        std::size_t previous = 0;
        if (storage_ && !reuse)
            previous = plannedBytes(storage_->model);
        capabilities_.validateModel(model, previous);
        std::unique_ptr<Storage> candidate;
        Storage* work = nullptr;
        int targetBank = 0;
        if (reuse) {
            work = storage_.get();
            targetBank = (committed_ + 1) % 3;
        } else {
            candidate = std::make_unique<Storage>(gl_, model);
            work = candidate.get();
        }
        work->model = model;
        GpuMeta initial;
        if (model.preset == Preset::Obstacle)
            initial.body.w = 0.14f;
        work->meta.write(&initial, sizeof(initial));
#if LAB_CHECKPOINT < 3
        {
            std::vector<Float4> positions(model.count), velocities(model.count), accelerations(model.count);
            std::vector<DensityPressure> fields(model.count, {1000, 0});
#if LAB_CHECKPOINT == 2
            auto reference = makeReference(model);
            Body body;
            referenceFields(model, parameters, body, reference);
            for (std::uint32_t i = 0; i < model.count; ++i)
                fields[i] = {static_cast<float>(reference.density[i]), static_cast<float>(reference.pressure[i])};
#endif
            for (std::uint32_t i = 0; i < model.count; ++i) {
                const auto point = seedPoint(model, i);
                positions[i] = {static_cast<float>(point.x), static_cast<float>(point.y), static_cast<float>(point.z), 1};
            }
            work->banks[targetBank].position.write(positions.data(), positions.size() * sizeof(Float4));
            work->banks[targetBank].velocity.write(velocities.data(), velocities.size() * sizeof(Float4));
            work->banks[targetBank].field.write(fields.data(), fields.size() * sizeof(DensityPressure));
            work->acceleration.write(accelerations.data(), accelerations.size() * sizeof(Float4));
        }
#else
        passes_.initialize(*work, targetBank);
#endif
#if LAB_CHECKPOINT >= 4
#if LAB_CHECKPOINT >= 6
        const bool grid = true;
        passes_.grid(*work, targetBank, parameters);
#else
        const bool grid = false;
#endif
        passes_.density(*work, targetBank, parameters, grid);
#if LAB_CHECKPOINT >= 5
        passes_.force(*work, targetBank, parameters, grid);
        passes_.extrema(*work, targetBank, parameters);
#endif
#endif
        gl_.check("Initialize water model");
        if (!reuse)
            storage_ = std::move(candidate);
        candidate_ = targetBank;
        meta_ = initial;
        modelTime = 0;
        ticks = 0;
        timing = {};
        enqueueMs = 0;
        completionMs = 0;
        stopped_ = false;
        initializing_ = true;
        fence();
    }

    // [/snippet reset-transaction]
    // [snippet paddle-target]
    void target(Vec3 point) {
        if (!finite(point))
            return;
        if (storage_->model.preset != Preset::Obstacle)
            return;
        const double margin = 0.14 + model().spacing;
        meta_.target = {static_cast<float>(std::clamp(point.x, margin, tank.x - margin)), 0.22f, static_cast<float>(std::clamp(point.z, margin, tank.z - margin)), 0};
    }

    // [/snippet paddle-target]

    // [snippet submit-batch]
    void submit(int steps = 4) {
#if LAB_CHECKPOINT < 5
        (void)steps;
        return;
#else
        if (pending() || !ready())
            return;
        if (steps < 1 || steps > 4)
            throw std::invalid_argument("A batch contains one to four ticks");
        validate(parameters);
        const auto start = std::chrono::steady_clock::now();
        meta_.elapsed = 0;
        meta_.ticks = 0;
        meta_.flags = 0;
        meta_.updated = 0;
        meta_.leakage = 0;
        meta_.invalid = 0;
        storage_->meta.write(&meta_, sizeof(meta_));
        timer_.start();
        int source = committed_;
        const int a = (committed_ + 1) % 3;
        const int b = (committed_ + 2) % 3;
#if LAB_CHECKPOINT >= 6
        const bool grid = true;
#else
        const bool grid = false;
#endif
        for (int tick = 0; tick < steps; ++tick) {
            int target = a;
            if (source == a)
                target = b;
            passes_.prepare(*storage_);
            if (grid)
                timer_.measure(Phase::Grid, [&] {
                    passes_.grid(*storage_, source, parameters);
                });
            timer_.measure(Phase::Density, [&] {
                passes_.density(*storage_, source, parameters, grid);
            });
            timer_.measure(Phase::Force, [&] {
                passes_.force(*storage_, source, parameters, grid);
            });
            timer_.measure(Phase::Extrema, [&] {
                passes_.extrema(*storage_, source, parameters);
            });
            timer_.measure(Phase::Integration, [&] {
                passes_.integrate(*storage_, source, target);
            });
            source = target;
        }
        candidate_ = source;
        timer_.finish();
        fence();
        enqueueMs = std::chrono::duration<double, std::milli>(std::chrono::steady_clock::now() - start).count();
#endif
    }

    // [/snippet submit-batch]
    // [snippet poll-fence]
    bool poll() {
        if (!pending())
            return false;
        const GLenum result = gl_.ClientWaitSync(fence_, 0, 0);
        if (result == GL_TIMEOUT_EXPIRED) {
            if (std::chrono::steady_clock::now() - submitted_ > std::chrono::seconds(5)) {
                stopped_ = true;
                fatalGpu("GPU batch exceeded five seconds; stopping without further GL calls");
            }
            return false;
        }
        if (result == GL_WAIT_FAILED) {
            stopped_ = true;
            fatalGpu("GPU fence failed; stopping without further GL calls");
        }
        if (!initializing_ && !timer_.ready()) {
            if (std::chrono::steady_clock::now() - submitted_ > std::chrono::seconds(5)) {
                stopped_ = true;
                fatalGpu("GPU timestamp result exceeded five seconds");
            }
            return false;
        }
        gl_.DeleteSync(fence_);
        fence_ = nullptr;
        const auto target = meta_.target;
        storage_->meta.read(&meta_, sizeof(meta_));
        meta_.target = target;
        completionMs = std::chrono::duration<double, std::milli>(std::chrono::steady_clock::now() - submitted_).count();
        if (meta_.flags != 0) {
            stopped_ = true;
            throw std::runtime_error("GPU transaction rejected; flags=" + std::to_string(meta_.flags));
        }
        if (!initializing_) {
            if (meta_.updated != model().count)
                throw std::runtime_error("Incomplete particle update");
            timing = timer_.read();
            modelTime += meta_.elapsed;
            ticks += meta_.ticks;
        }
        committed_ = candidate_;
        initializing_ = false;
        return true;
    }

    // [/snippet poll-fence]
};
} // namespace water51
