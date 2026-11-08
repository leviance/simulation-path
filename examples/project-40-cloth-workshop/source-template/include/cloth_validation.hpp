#pragma once
#include "cloth_gpu.hpp"

#include <sstream>

namespace cloth {

// UI validation owns a separate 17x17 state, never pauses to read the user's full cloth.
// poll() performs at most one small CPU batch, one GPU submission, or one completed readback.
class ValidationJob {
    enum class Phase { Prepare,
                    Submit,
                    Await,
                    Compare };
    GlApi* gl_{};
    std::unique_ptr<GpuCloth> gpu_{};
    CpuState cpu_{};
    Settings settings_{};
    Phase phase_{Phase::Prepare};
    bool active_{};
    bool passed_{};
    std::uint32_t caseIndex_{};
    std::uint32_t completedSteps_{};
    std::uint32_t caseSteps_{};
    std::uint32_t caseContactEvents_{};
    float worstPosition_{};
    float worstVelocity_{};
    float worstNormal_{};
    std::string message_{"Validation is idle"};
    std::chrono::steady_clock::time_point deadline_{};

    void fail(const std::string& reason) {
        active_ = false;
        passed_ = false;
        message_ = "Validation failed: " + reason;
    }

    std::string caseLabel() const {
        std::string label = "hanging";
        if (settings_.preset == Preset::SphereDrape) {
            label = "sphere drape";
        }
        if (settings_.preset == Preset::DropTable) {
            label = "table drop";
        }
        if (caseIndex_ % 2U != 0U) {
            label += " / 4 substeps";
        } else {
            label += " / 2 substeps";
        }
        return label;
    }

    void prepareCase() {
        settings_ = {};
        settings_.side = 17U;
        settings_.preset = static_cast<Preset>(caseIndex_ / 2U);
        settings_.dt = 1.0F / 30.0F;
        settings_.wind = 0.75F;
        settings_.gravity = 20.0F;
        if (caseIndex_ % 2U != 0U) {
            settings_.substeps = 4U;
        }
        if (settings_.preset == Preset::DropTable) {
            settings_.floorHeight = 0.7F;
            // This independent plane-contact fixture puts the other two obstacles below its table.
            settings_.sphereCenter.y = 0.5F;
            settings_.sphereRadius = 0.1F;
            settings_.capsuleA.y = 0.5F;
            settings_.capsuleB.y = 0.5F;
            settings_.capsuleRadius = 0.1F;
        }
        std::string error{};
        if (!gpu_->reset(settings_, error)) {
            fail(error);
            return;
        }
        cpu_ = makeCpuState(settings_);
        // Contact fixtures begin near a collider, rather than spending four steps in free fall.
        // Translation preserves every rest length and therefore the supplied distance topology.
        float verticalShift = 0.0F;
        if (settings_.preset == Preset::SphereDrape) {
            verticalShift = -1.86F;
        }
        if (settings_.preset == Preset::DropTable) {
            verticalShift = -3.5F;
        }
        if (verticalShift != 0.0F) {
            for (auto& position : cpu_.positions) {
                position.y += verticalShift;
            }
            cpu_.normals = meshNormals(cpu_.positions, settings_.side);
            gl_->BindBuffer(GL_SHADER_STORAGE_BUFFER, gpu_->positionBuffer());
            gl_->BufferSubData(GL_SHADER_STORAGE_BUFFER, 0, static_cast<GLsizeiptr>(cpu_.positions.size() * sizeof(Vec4)), cpu_.positions.data());
            gl_->MemoryBarrier(GL_BUFFER_UPDATE_BARRIER_BIT | GL_SHADER_STORAGE_BARRIER_BIT);
        }
        caseSteps_ = 0U;
        caseContactEvents_ = 0U;
        phase_ = Phase::Submit;
        message_ = "Validation case " + std::to_string(caseIndex_ + 1U) + "/6: " + caseLabel();
    }

    void compareCompletedStep() {
        SmallSnapshot snapshot{};
        std::string error{};
        if (!gpu_->snapshotSmall(snapshot, error)) {
            fail(error);
            return;
        }
        float positionError = 0.0F;
        float velocityError = 0.0F;
        float normalError = 0.0F;
        for (std::size_t id = 0U; id < snapshot.positions.size(); ++id) {
            if (!finite(xyz(snapshot.positions[id])) || !finite(xyz(snapshot.velocities[id])) || !finite(xyz(snapshot.normals[id])) || snapshot.positions[id].w != cpu_.positions[id].w) {
                fail("non-finite state or an inverse-mass mismatch");
                return;
            }
            positionError = std::max(positionError, length(xyz(snapshot.positions[id]) - xyz(cpu_.positions[id])));
            velocityError = std::max(velocityError, length(xyz(snapshot.velocities[id]) - xyz(cpu_.velocities[id])));
            normalError = std::max(normalError, length(xyz(snapshot.normals[id]) - xyz(cpu_.normals[id])));
        }
        worstPosition_ = std::max(worstPosition_, positionError);
        worstVelocity_ = std::max(worstVelocity_, velocityError);
        worstNormal_ = std::max(worstNormal_, normalError);
        // Four-step nonlinear parity uses absolute norms, not bit equality across GPU summation order.
        if (positionError > 0.0005F || velocityError > 0.05F || normalError > 0.005F) {
            std::ostringstream output{};
            output << caseLabel() << " step " << caseSteps_ + 1U << ": position " << positionError
                << "m, velocity " << velocityError << "m/s, normal " << normalError;
            fail(output.str());
            return;
        }
        const Stats& stats = gpu_->stats();
        caseContactEvents_ += stats.analyticContacts;
        const auto vertices = static_cast<std::uint32_t>(cpu_.positions.size());
        const auto pinned = cpu_.topology.pinned;
        const auto visits = static_cast<std::uint32_t>(cpu_.topology.constraints.size()) * settings_.iterations * settings_.substeps;
        if (stats.updated != vertices - pinned || stats.pinned != pinned || stats.normals != vertices || stats.constraints != visits || stats.countedVertices != vertices || stats.overflow != 0U || stats.invalid != 0U) {
            fail("incomplete vertex/constraint/grid/normal coverage");
            return;
        }
        auto ids = snapshot.ids;
        std::sort(ids.begin(), ids.end());
        for (std::uint32_t id = 0U; id < vertices; ++id) {
            if (ids[id] != id || snapshot.vertexCells[id] >= snapshot.counts.size()) {
                fail("CSR permutation or cell range is invalid");
                return;
            }
        }
        if (std::accumulate(snapshot.counts.begin(), snapshot.counts.end(), 0U) != vertices) {
            fail("CSR counts do not sum to N");
            return;
        }
        ++completedSteps_;
        ++caseSteps_;
        if (caseSteps_ < 4U) {
            phase_ = Phase::Submit;
            message_ = "Validation case " + std::to_string(caseIndex_ + 1U) + "/6 step " + std::to_string(caseSteps_) + "/4 passed";
            return;
        }
        if (settings_.preset != Preset::Hanging && caseContactEvents_ == 0U) {
            fail("the translated sphere/table fixture never exercised analytic contact");
            return;
        }
        ++caseIndex_;
        if (caseIndex_ < 6U) {
            phase_ = Phase::Prepare;
            return;
        }
        active_ = false;
        passed_ = true;
        std::ostringstream output{};
        output << "Validation PASS: 6 CPU/GPU cases x 4 steps; max differences " << worstPosition_
            << "m, " << worstVelocity_ << "m/s, normal " << worstNormal_
            << ". Full independent primitive fixtures remain available with --verify.";
        message_ = output.str();
    }

    public:
    bool initialize(GlApi& gl, const std::filesystem::path& directory, std::string& error) {
        destroy();
        gl_ = &gl;
        gpu_ = std::make_unique<GpuCloth>(gl);
        if (!gpu_->initialize(directory, error)) {
            gpu_.reset();
            return false;
        }
        message_ = "Validation ready: 6 small CPU/GPU cases, 4 steps each";
        return true;
    }

    void begin() {
        active_ = false;
        passed_ = false;
        if (!gpu_) {
            message_ = "Validation is not initialized";
            return;
        }
        caseIndex_ = 0U;
        completedSteps_ = 0U;
        caseSteps_ = 0U;
        worstPosition_ = 0.0F;
        worstVelocity_ = 0.0F;
        worstNormal_ = 0.0F;
        deadline_ = std::chrono::steady_clock::now() + std::chrono::seconds(10);
        phase_ = Phase::Prepare;
        active_ = true;
        message_ = "Validation started: 24 bounded 17x17 steps; Cancel leaves the user's cloth unchanged";
    }

    void poll() {
        if (!active_) {
            return;
        }
        if (std::chrono::steady_clock::now() >= deadline_) {
            fail("ten-second total deadline exceeded; incomplete runs are not PASS");
            return;
        }
        if (phase_ == Phase::Prepare) {
            prepareCase();
            return;
        }
        if (phase_ == Phase::Submit) {
            cpuStep(cpu_, settings_);
            std::string error{};
            if (!gpu_->step(settings_, {}, error)) {
                fail(error);
                return;
            }
            phase_ = Phase::Await;
            return;
        }
        if (phase_ == Phase::Await) {
            std::string error{};
            if (!gpu_->poll(error)) {
                fail(error);
                return;
            }
            if (!gpu_->busy()) {
                phase_ = Phase::Compare;
            }
            return;
        }
        compareCompletedStep();
    }

    void cancel() {
        if (active_) {
            active_ = false;
            passed_ = false;
            message_ = "Validation canceled after " + std::to_string(completedSteps_) + "/24 steps; no PASS";
        }
    }

    void destroy() {
        cancel();
        gpu_.reset();
        gl_ = nullptr;
        cpu_ = {};
    }

    bool active() const {
        return active_;
    }

    bool passed() const {
        return passed_;
    }

    float progress() const {
        return static_cast<float>(completedSteps_) / 24.0F;
    }

    const std::string& message() const {
        return message_;
    }
};

} // namespace cloth
