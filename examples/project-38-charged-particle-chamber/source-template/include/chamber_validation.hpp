#pragma once
#include "chamber_gpu.hpp"
#include "chamber_reference.hpp"

#include <vector>

#if LAB_CHECKPOINT >= 10
namespace chamber {

class ValidationJob {
    GpuState state_{};
    GLsync fence_{};
    Uint64 deadline_{};
    std::size_t offset_{};
    int steps_{};
    bool reading_{};
    bool running_{};
    std::vector<Particle> scratch_{};

    public:
    Settings measured{};
    ValidationReport report{};
    std::size_t analyticFailures{};
    std::size_t firstAnalyticMismatch{std::numeric_limits<std::size_t>::max()};
    bool complete{};
    std::string status{"Not run"};

    bool busy() const {
        return running_;
    }

    bool passed() const {
        return complete && report.passed() && analyticFailures == 0U;
    }

    std::size_t progress() const {
        return offset_;
    }

    void cancel(GlApi& gl, const std::string& message = "Cancelled: incomplete, not PASS") {
        if (fence_)
            gl.DeleteSync(fence_);
        fence_ = nullptr;
        state_.destroy(gl);
        running_ = false;
        reading_ = false;
        complete = false;
        status = message;
    }

    bool start(GlApi& gl, const ComputePipeline& pipeline, const Settings& settings, int steps, std::uint64_t generation, std::string& error) {
        if (busy()) {
            error = "Cancel the running validation first";
            return false;
        }
        if (steps < 1 || steps > 512) {
            error = "Validation step count must be 1..512";
            return false;
        }
        cancel(gl);
        report = {};
        analyticFailures = 0;
        firstAnalyticMismatch = std::numeric_limits<std::size_t>::max();
        offset_ = 0;
        steps_ = steps;
        measured = settings;
        if (!pipeline.createState(gl, settings, generation, state_, error)) {
            status = error;
            return false;
        }
        pipeline.step(gl, state_, steps_);
        gl.MemoryBarrier(GL_BUFFER_UPDATE_BARRIER_BIT);
        fence_ = gl.FenceSync(GL_SYNC_GPU_COMMANDS_COMPLETE, 0);
        if (!fence_) {
            cancel(gl, "Validation fence allocation failed");
            return false;
        }
        scratch_.resize(8192U);
        deadline_ = SDL_GetTicks() + 30000;
        running_ = true;
        status = "GPU running; main state is untouched";
        gl.Flush();
        return true;
    }

    void poll(GlApi& gl) {
        if (!running_)
            return;
        if (SDL_GetTicks() > deadline_) {
            cancel(gl, "Validation timeout: incomplete, not PASS");
            return;
        }
        if (!reading_) {
            std::string error{};
            if (!fenceReady(gl, fence_, error)) {
                if (!error.empty())
                    cancel(gl, error);
                return;
            }
            gl.DeleteSync(fence_);
            fence_ = nullptr;
            reading_ = true;
        }
        const std::size_t count = std::min(scratch_.size(), measured.count - offset_);
        gl.BindBuffer(GL_SHADER_STORAGE_BUFFER, state_.buffer);
        gl.GetBufferSubData(GL_SHADER_STORAGE_BUFFER, static_cast<GLintptr>(offset_ * sizeof(Particle)), static_cast<GLsizeiptr>(count * sizeof(Particle)), scratch_.data());
        if (gl.GetError() != GL_NO_ERROR) {
            cancel(gl, "Readback failed: incomplete, not PASS");
            return;
        }
        const double time = static_cast<double>(steps_) * static_cast<double>(measured.dt);
        for (std::size_t local = 0; local < count; ++local) {
            const std::size_t id = offset_ + local;
            const Particle initial = snapshotParticle(static_cast<std::uint32_t>(id), measured);
            Particle expected = initial;
            for (int stepIndex = 0; stepIndex < steps_; ++stepIndex)
                stepBoris(expected, measured.fields, measured.dt);
            const ReferenceState reference = analyticState(initial, measured.fields, time);
            inspectParticle(report, id, scratch_[local], expected, reference);
            // The analytic gate is separate: matching another Boris implementation is not enough.
            const double positionScale = 1.0 + exact::norm(reference.position);
            const double velocityScale = 1.0 + exact::norm(reference.velocity);
            if (!validParticle(scratch_[local]) || positionError(scratch_[local], reference) > 0.005 * positionScale || velocityError(scratch_[local], reference) > 0.005 * velocityScale) {
                if (analyticFailures == 0U)
                    firstAnalyticMismatch = id;
                ++analyticFailures;
            }
        }
        offset_ += count;
        status = "Reading/checking bounded batches: " + std::to_string(offset_) + "/" + std::to_string(measured.count);
        if (offset_ == measured.count) {
            running_ = false;
            complete = true;
            state_.destroy(gl);
            if (passed())
                status = "PASS: full CPU mirror AND analytic gates";
            else
                status = "FAIL: inspect CPU/analytic errors, dt and first mismatch";
        }
    }
};

} // namespace chamber
#endif
