#pragma once

#include "city_camera.hpp"
#include "city_gpu_validation.hpp"

namespace city {

class CityValidationJob {
    public:
    bool initialize(GlApi& gl, const std::filesystem::path& directory, std::string& error) {
#if LAB_CHECKPOINT >= 11
        if (!pipeline_.initialize(gl, directory, error)) {
            return false;
        }
        objects_.resize(257);
        for (std::size_t index = 0; index < objects_.size(); ++index) {
            Object object = fixtureObject(static_cast<std::uint32_t>(index));
            // Spread the fixture across the camera boundary, not just its center.
            object.centerRadius.x *= 30.0F;
            object.centerRadius.z *= 30.0F;
            object.centerRadius.y = std::abs(object.centerRadius.y) + 1.0F;
            objects_[index] = object;
        }
        if (!pipeline_.rebuild(gl, objects_, error)) {
            pipeline_.destroy(gl);
            return false;
        }
        initialized_ = true;
        message_ = "V: validate 257 records on six fixed cameras, culling on/off";
        return true;
#else
        (void)gl;
        (void)directory;
        (void)error;
        message_ = "Validation job is introduced at checkpoint 11";
        return true;
#endif
    }

    bool begin() {
#if LAB_CHECKPOINT >= 11
        if (!initialized_ || active_) {
            return false;
        }
        batch_ = 0;
        waiting_ = false;
        active_ = true;
        passed_ = false;
        deadline_ = SDL_GetTicks() + 10000;
        message_ = "Validation 0/12 - X cancels between bounded batches";
        return true;
#else
        return false;
#endif
    }

    void poll(GlApi& gl) {
#if LAB_CHECKPOINT >= 11
        if (!active_) {
            return;
        }
        const Uint64 now = SDL_GetTicks();
        if (now >= deadline_) {
            finish(gl, "Validation stopped: ten-second total deadline", false);
            return;
        }
        if (!waiting_) {
            camera_ = cameraSnapshot(static_cast<unsigned>(batch_ / 2));
            planes_ = camera_.frustum(16.0F / 9.0F);
            culling_ = batch_ % 2 != 0;
            pipeline_.run(gl, planes_, camera_.position, culling_);
            fence_ = gl.FenceSync(GL_SYNC_GPU_COMMANDS_COMPLETE, 0);
            if (fence_ == nullptr) {
                finish(gl, "Validation failed: cannot create GPU fence", false);
                return;
            }
            gl.Flush();
            batchDeadline_ = now + 5000;
            waiting_ = true;
            // At most one dispatch batch is submitted in a UI frame.
            return;
        }
        if (now >= batchDeadline_) {
            finish(gl, "Validation stopped: five-second GPU batch deadline", false);
            return;
        }
        std::string error{};
        if (!fenceReady(gl, fence_, error)) {
            if (!error.empty()) {
                finish(gl, error, false);
            }
            // Zero-timeout polling leaves camera and Cancel input responsive.
            return;
        }
        gl.DeleteSync(fence_);
        fence_ = nullptr;
        waiting_ = false;
        const GpuSnapshot snapshot = pipeline_.readSnapshot(gl, objects_.size());
        if (!snapshotMatches(objects_, planes_, camera_.position, culling_, snapshot, error)) {
            finish(gl, "Validation failed: " + error, false);
            return;
        }
        if (!pipeline_.guardRecordsIntact(gl) || gl.GetError() != GL_NO_ERROR) {
            finish(gl, "Validation failed: buffer guard or OpenGL error", false);
            return;
        }
        ++batch_;
        if (batch_ == kBatchCount) {
            finish(gl, "Validation PASS: 12/12 camera/toggle fixtures, exact IDs/commands", true);
            return;
        }
        message_ = "Validation " + std::to_string(batch_) + "/12 - X cancels between batches";
#else
        (void)gl;
#endif
    }

    void cancel(GlApi& gl) {
        if (active_) {
            finish(gl, "Validation cancelled; city scene unchanged", false);
        }
    }

    void destroy(GlApi& gl) {
        cancel(gl);
        pipeline_.destroy(gl);
        objects_.clear();
        initialized_ = false;
    }

    bool active() const {
        return active_;
    }

    bool passed() const {
        return passed_;
    }

    float progress() const {
        return static_cast<float>(batch_) / static_cast<float>(kBatchCount);
    }

    const std::string& message() const {
        return message_;
    }

    private:
    void finish(GlApi& gl, std::string message, bool passed) {
        if (fence_ != nullptr) {
            gl.DeleteSync(fence_);
            fence_ = nullptr;
        }
        message_ = std::move(message);
        passed_ = passed;
        active_ = false;
        waiting_ = false;
    }

    inline static constexpr std::size_t kBatchCount = 12;
    CityGpu pipeline_{};
    std::vector<Object> objects_{};
    Camera camera_{};
    Frustum planes_{};
    GLsync fence_{};
    Uint64 deadline_{}, batchDeadline_{};
    std::size_t batch_{};
    bool initialized_{}, active_{}, waiting_{}, culling_{}, passed_{};
    std::string message_{"Validation is idle"};
};

} // namespace city
