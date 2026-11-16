#pragma once
#include "passes.hpp"
#include "queue.hpp"

namespace water3 {
// Readback is a byte copy; this host-only record needs size16, not vector alignment16.
struct StepStats {
    float x = 0, y = 0, z = 0, w = 0;
};

static_assert(sizeof(StepStats) == 16);

// Never swap/read a bank until its fence signals. Cancellation suppresses future ticks only.
class Engine {
    public:
    Storage storage;
    Programs programs;
    Queue queue;
    Settings settings;
    bool grid = true, ready = false, initializing = false;
    int current = 0;
    std::uint64_t steps = 0;
    double time = 0, lastDt = 0;
    StepStats lastStats;
    Diagnostics lastDiagnostics;
    double enqueueMilliseconds = 0;
    double commitMilliseconds = 0;
    GLuint statsRoot = 0;

    void startSubmitTimer() {
        submitted_ = std::chrono::steady_clock::now();
    }

    void finishSubmitTimer() {
        enqueueMilliseconds = std::chrono::duration<double, std::milli>(std::chrono::steady_clock::now() - submitted_).count();
    }

    void initialize(lab::GlApi& gl, const std::string& directory) {
        programs.load(gl, directory);
    }

    void reset(lab::GlApi& gl, const Plan& plan) {
        if (queue.pending()) {
            throw std::runtime_error("Wait for pending batch before reset");
        }
#if LAB_CHECKPOINT < 11
        if (plan.count > 512) {
            throw std::runtime_error("Large workloads start at checkpoint11");
        }
#endif
        if (!storage.positions[0] || storage.plan.side != plan.side || storage.plan.count != plan.count) {
            if (storage.plan.residentBytes + plan.residentBytes > 192ULL * 1024 * 1024) {
                throw std::runtime_error("Peak allocation would exceed192MiB; choose a smaller workload first");
            }
            Storage candidate;
            candidate.create(gl, plan);
            storage.destroy(gl);
            storage = std::move(candidate);
        }
        current = 0;
        steps = 0;
        time = 0;
        ready = false;
        initializing = true;
        lastStats = StepStats{};
        lastDiagnostics = Diagnostics{};
        enqueueMilliseconds = 0;
        commitMilliseconds = 0;
        queue.begin(gl);
        // [snippet initialize-pass]
        use(gl, programs.initialize, plan, settings, grid);
        bind(gl, 0, storage.positions[0]);
        bind(gl, 1, storage.velocities[0]);
        bind(gl, 2, storage.density);
        bind(gl, 3, storage.acceleration);
        dispatch(gl, plan.count);
        // [/snippet initialize-pass]
        queue.mark(gl, "Initialize");
        queue.end(gl);
    }

    bool poll(lab::GlApi& gl) {
        if (!queue.pending() || !queue.poll(gl)) {
            return false;
        }
        if (initializing) {
            initializing = false;
            ready = true;
            return true;
        }
        lastDt = maxDt;
#if LAB_CHECKPOINT >= 5
#if LAB_CHECKPOINT < 9
        // Early lessons are capped at512; inspect small outputs before reduction is introduced.
        const auto density = readVector<Float4>(gl, storage.density, storage.plan.count);
        for (const auto value : density) {
            if (!finite(xyz(value)) || !std::isfinite(value.w) || value.w > 0 || value.x <= 0) {
                throw std::runtime_error("Invalid density: tick not committed");
            }
        }
#if LAB_CHECKPOINT >= 6
        const auto acceleration = readVector<Float4>(gl, storage.acceleration, storage.plan.count);
        for (const auto value : acceleration) {
            if (!finite(xyz(value)) || value.w > 0) {
                throw std::runtime_error("Invalid acceleration: tick not committed");
            }
        }
#endif
#if LAB_CHECKPOINT >= 7
        for (const auto buffer : {storage.positions[1 - current], storage.velocities[1 - current]}) {
            for (const auto value : readVector<Float4>(gl, buffer, storage.plan.count)) {
                if (!finite(xyz(value))) {
                    throw std::runtime_error("Invalid integration: tick not committed");
                }
            }
        }
#endif
#endif
#endif
#if LAB_CHECKPOINT >= 9
        gl.BindBuffer(GL_SHADER_STORAGE_BUFFER, statsRoot);
        gl.GetBufferSubData(GL_SHADER_STORAGE_BUFFER, 0, sizeof(StepStats), &lastStats);
        if (!finite({lastStats.x, lastStats.y, lastStats.z}) || !std::isfinite(lastStats.w) || lastStats.w > 0) {
            throw std::runtime_error("Nonfinite state or >4096 candidates: tick not committed");
        }
        lastDt = chooseDt(storage.plan, lastStats.x, lastStats.y, settings.soundSpeed);
        gl.BindBuffer(GL_SHADER_STORAGE_BUFFER, storage.diagnostics);
        gl.GetBufferSubData(GL_SHADER_STORAGE_BUFFER, 0, sizeof(Diagnostics), &lastDiagnostics);
        if (lastDiagnostics.updated() != storage.plan.count || lastDiagnostics.inspected() != storage.plan.count || lastDiagnostics.invalid() > 0 || lastDiagnostics.leaked() > 0) {
            throw std::runtime_error("GPU diagnostics failed: count/nonfinite/leakage, tick not committed");
        }
#endif
#if LAB_CHECKPOINT >= 7
        // [snippet bank-commit]
        current = 1 - current;
        ++steps;
        time += lastDt;
        // [/snippet bank-commit]
        commitMilliseconds = std::chrono::duration<double, std::milli>(std::chrono::steady_clock::now() - submitted_).count();
#endif
        return true;
    }

    bool submit(lab::GlApi& gl) {
        if (!ready || queue.pending()) {
            return false;
        }
        validateSettings(settings);
        startSubmitTimer();
        if (!grid && storage.plan.count > 512) {
            throw std::runtime_error("All-pairs capped at 512");
        }
        queue.begin(gl);
#if LAB_CHECKPOINT >= 9
        beginDiagnostics(gl, programs, storage);
        queue.mark(gl, "Clear diagnostics");
#endif
#if LAB_CHECKPOINT >= 8
        if (grid) {
            buildGrid(gl, programs, storage, current, &queue);
        }
#endif
#if LAB_CHECKPOINT >= 5
        // [snippet density-pass]
        use(gl, programs.density, storage.plan, settings, grid);
        bind(gl, 0, storage.positions[current]);
        bind(gl, 1, storage.density);
        bind(gl, 2, storage.counts);
        bind(gl, 3, storage.offsets);
        bind(gl, 4, storage.indices);
        dispatch(gl, storage.plan.count);
        // [/snippet density-pass]
        queue.mark(gl, "Density / EOS");
#endif
#if LAB_CHECKPOINT >= 6
        // [snippet force-pass]
        use(gl, programs.force, storage.plan, settings, grid);
        bind(gl, 0, storage.positions[current]);
        bind(gl, 1, storage.velocities[current]);
        bind(gl, 2, storage.density);
        bind(gl, 3, storage.acceleration);
        bind(gl, 4, storage.counts);
        bind(gl, 5, storage.offsets);
        bind(gl, 6, storage.indices);
        dispatch(gl, storage.plan.count);
        queue.mark(gl, "Forces");
        // [/snippet force-pass]
#endif
#if LAB_CHECKPOINT >= 9
        statsRoot = reduceStats(gl, programs, storage, current, settings);
        queue.mark(gl, "Reduction / dt");
#endif
#if LAB_CHECKPOINT >= 7
        // [snippet integrate-pass]
        use(gl, programs.integrate, storage.plan, settings, grid);
        bind(gl, 0, storage.positions[current]);
        bind(gl, 1, storage.velocities[current]);
        bind(gl, 2, storage.acceleration);
        bind(gl, 3, storage.positions[1 - current]);
        bind(gl, 4, storage.velocities[1 - current]);
        bind(gl, 5, statsRoot);
#if LAB_CHECKPOINT >= 9
        bind(gl, 6, storage.diagnostics);
#endif
        dispatch(gl, storage.plan.count);
        queue.mark(gl, "Integration");
        // [/snippet integrate-pass]
#endif
#if LAB_CHECKPOINT >= 9
        finishDiagnostics(gl, programs, storage, 1 - current);
        queue.mark(gl, "Diagnostics");
#endif
        queue.end(gl);
        finishSubmitTimer();
        return true;
    }

    void destroy(lab::GlApi& gl) {
        queue.destroy(gl);
        storage.destroy(gl);
        programs.destroy(gl);
    }

    private:
    std::chrono::steady_clock::time_point submitted_{};
};
} // namespace water3
