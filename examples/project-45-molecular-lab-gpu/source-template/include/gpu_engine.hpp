#pragma once

#include "gpu_kernels.hpp"
#include "gpu_queue.hpp"

#include <bit>
#include <cmath>
#include <string>

namespace molecular {

struct Features {
    bool force = false;
    bool grid = false;
    bool integrate = false;
    bool cache = false;
    bool diagnostics = false;
};

class Engine {
    public:
    Storage storage{};
    int current = 0;
    bool ready = false;
    bool failed = false;
    std::uint64_t steps = 0;
    std::uint64_t rebuilds = 0;
    std::uint32_t maximumOccupancy = 0;
    double maximumDisplacement = 0;
    double gpuMilliseconds = 0;
    double wallMilliseconds = 0;
    Float4 totals{};
    std::string message = "Ready to initialize.";

    void initialize(lab::GlApi& gl, const std::string& directory, Features features) {
        features_ = features;
        kernels_.load(gl, directory);
        queue_.initialize(gl);
    }

    bool busy() const {
        return pass_ != Pass::Idle;
    }

    const char* phase() const {
        return passName(pass_);
    }

    void reset(lab::GlApi& gl, std::uint32_t count) {
        if (busy() || queue_.pending()) {
            message = "Wait for the current batch, or cancel before resetting.";
            return;
        }
        const auto plan = makePlan(count);
        if (!features_.grid && count > 1024) {
            throw std::runtime_error("All-pairs checkpoint is limited to 1024 particles.");
        }
        const auto reason = rejectPlan(plan, queryLimits(gl), storage.plan.residentBytes);
        if (!reason.empty()) {
            message = reason;
            return;
        }
        // Nếu allocation lỗi, bank cũ vẫn còn. Peak budget tính cả hai bộ.
        Storage candidate{};
        candidate.allocate(gl, plan);
        std::swap(storage, candidate);
        candidate.destroy(gl);
        current = 0;
        target_ = 0;
        ready = false;
        failed = false;
        cacheValid_ = false;
        initializing_ = true;
        cancelled_ = false;
        steps = 0;
        rebuilds = 0;
        maximumOccupancy = 0;
        maximumDisplacement = 0;
        totals = {};
        beginJob(gl, Pass::Initialize);
    }

    void step(lab::GlApi& gl) {
        if (busy() || !ready || failed || !features_.integrate) {
            return;
        }
        target_ = 1 - current;
        initializing_ = false;
        cancelled_ = false;
        beginJob(gl, Pass::Drift);
    }

    void cancel() {
        cancelled_ = true;
    }

    void tick(lab::GlApi& gl) {
        if (!busy()) {
            return;
        }
        try {
            if (queue_.pending()) {
                if (!queue_.poll(gl)) {
                    return;
                }
                jobGpuMilliseconds_ += queue_.lastMilliseconds;
                if (base_ >= passCount_) {
                    completePass(gl);
                }
            }
            if (cancelled_ && busy()) {
                cacheValid_ = false;
                pass_ = Pass::Idle;
                message = "Cancelled between batches; last committed bank retained.";
                return;
            }
            if (busy()) {
                submitBatch(gl);
            }
        } catch (const std::exception& error) {
            failed = true;
            cacheValid_ = false;
            pass_ = Pass::Idle;
            message = error.what();
        }
    }

    // Chỉ dùng sau fence cuối, tối đa 1024 phần tử và theo yêu cầu kiểm chứng.
    std::vector<Float4> readParticles(lab::GlApi& gl, GLuint buffer) const {
        if (busy() || !ready || storage.plan.count > 1024) {
            throw std::runtime_error("Readback is only allowed for an idle, small validation case.");
        }
        std::vector<Float4> result(storage.plan.count);
        gl.BindBuffer(GL_SHADER_STORAGE_BUFFER, buffer);
        gl.GetBufferSubData(GL_SHADER_STORAGE_BUFFER, 0, static_cast<GLsizeiptr>(result.size() * sizeof(Float4)), result.data());
        return result;
    }

    void destroy(lab::GlApi& gl) {
        queue_.destroy(gl);
        kernels_.destroy(gl);
        storage.destroy(gl);
    }

    private:
    Features features_{};
    Kernels kernels_{};
    GpuQueue queue_{};
    Pass pass_ = Pass::Idle;
    int target_ = 0;
    bool initializing_ = false;
    bool cacheValid_ = false;
    bool cancelled_ = false;
    std::uint32_t base_ = 0;
    std::uint32_t passCount_ = 0;
    std::uint32_t reductionCount_ = 0;
    int reductionInput_ = 1;
    int reductionOutput_ = 0;
    bool reducing_ = false;
    double jobGpuMilliseconds_ = 0;
    GpuQueue::Clock::time_point started_{};

    void beginJob(lab::GlApi& gl, Pass pass) {
        resetControl(gl, storage.control);
        jobGpuMilliseconds_ = 0;
        started_ = GpuQueue::Clock::now();
        enter(pass);
        message = "Working in bounded batches.";
    }

    void enter(Pass pass) {
        pass_ = pass;
        base_ = 0;
        passCount_ = storage.plan.count;
        if (pass == Pass::Clear) {
            passCount_ = storage.plan.cells;
            cacheValid_ = false;
        }
        if (pass == Pass::Diagnostics) {
            passCount_ = ceilDivide(reductionCount_, groupSize);
        }
    }

    void submitBatch(lab::GlApi& gl) {
        std::uint32_t batch = cheapBatch;
        if (pass_ == Pass::Force) {
            batch = forceBatch;
        }
        if (pass_ == Pass::Diagnostics) {
            batch = 256;
        }
        const auto count = std::min(batch, passCount_ - base_);
        kernels_.prepare(gl, pass_, storage, current, target_, base_, features_.grid, reductionCount_, reductionInput_, reductionOutput_, reducing_);
        GLuint groups = ceilDivide(count, groupSize);
        if (pass_ == Pass::Diagnostics) {
            groups = count;
        }
        queue_.dispatch(gl, groups);
        base_ += count;
    }

    void finishOrMeasure() {
        if (features_.diagnostics) {
            reductionCount_ = storage.plan.count;
            reductionInput_ = 1;
            reductionOutput_ = 0;
            reducing_ = false;
            enter(Pass::Diagnostics);
        } else {
            commit();
        }
    }

    void commit() {
        current = target_;
        ready = true;
        if (!initializing_) {
            ++steps;
        }
        gpuMilliseconds = jobGpuMilliseconds_;
        wallMilliseconds = std::chrono::duration<double, std::milli>(GpuQueue::Clock::now() - started_).count();
        pass_ = Pass::Idle;
        message = "Committed. Space: run/pause; N: one step; R: reset; C: cancel.";
    }

    void completePass(lab::GlApi& gl) {
        const auto control = readSmall<Control>(gl, storage.control);
        if (control.flags != 0) {
            cacheValid_ = false;
            if ((control.flags & 1U) != 0) {
                throw std::runtime_error("Cell overflow (>16). Step rejected; no truncated force accepted.");
            }
            throw std::runtime_error("Overlap, non-finite value or excessive drift. Step rejected.");
        }
        // Hủy trước khi completePass được phép commit một bank ứng viên.
        if (cancelled_) {
            cacheValid_ = false;
            pass_ = Pass::Idle;
            message = "Cancelled. Last committed state retained; cache invalidated.";
            return;
        }
        switch (pass_) {
        case Pass::Initialize:
            if (features_.grid) {
                enter(Pass::Clear);
            } else if (features_.force) {
                enter(Pass::Force);
            } else {
                commit();
            }
            break;
        case Pass::Clear:
            enter(Pass::Build);
            break;
        case Pass::Build:
            maximumOccupancy = control.maxOccupancy;
            cacheValid_ = true;
            ++rebuilds;
            enter(Pass::Force);
            break;
        case Pass::Force:
            if (initializing_) {
                finishOrMeasure();
            } else {
                enter(Pass::Kick);
            }
            break;
        case Pass::Drift: {
            const float distance2 = std::bit_cast<float>(control.maxDisplacementBits);
            maximumDisplacement = std::sqrt(distance2);
            if (!cacheValid_ || !features_.cache || distance2 >= skin * skin * 0.25F) {
                enter(Pass::Clear);
            } else {
                enter(Pass::Force);
            }
            break;
        }
        case Pass::Kick:
            finishOrMeasure();
            break;
        case Pass::Diagnostics:
            if (passCount_ > 1) {
                reductionCount_ = passCount_;
                reductionInput_ = reductionOutput_;
                reductionOutput_ = 1 - reductionInput_;
                reducing_ = true;
                enter(Pass::Diagnostics);
            } else {
                totals = readSmall<Float4>(gl, storage.scratch.at(reductionOutput_));
                if (!std::isfinite(totals.x) || !std::isfinite(totals.y) || !std::isfinite(totals.z) || !std::isfinite(totals.w)) {
                    throw std::runtime_error("Diagnostic reduction is not finite.");
                }
                commit();
            }
            break;
        case Pass::Idle:
            break;
        }
    }
};

} // namespace molecular
