#pragma once

#include "atom_gpu.hpp"

namespace atom {

struct ProbeSettings {
    int clipAxis{-1};
    float clipOffset{};
    Vec3 center{};
    float radius{2};
};

#if LAB_CHECKPOINT >= 8
// Lesson 8 replaces the harmless interface below with this measurement pass.
// Histogram and region counts always use the entire accepted cloud denominator.
// The clipping count is separate, not a normalization of the remaining samples.
class GpuProbe {
    public:
    GpuProbe(GlApi& gl, MemoryBudget& budget) :
        gl_(gl),
        program_(gl, "probe.comp"),
        counts_(gl, budget, 22 * sizeof(std::uint32_t)) {
        gl_.GenQueries(1, &query_);
    }

    ~GpuProbe() {
        if (fence_)
            gl_.DeleteSync(fence_);
        gl_.DeleteQueries(1, &query_);
    }

    bool busy() const {
        return cloud_ != nullptr;
    }

    bool ready() const {
        return ready_;
    }

    double gpuMs() const {
        return gpuMs_;
    }

    const std::array<std::uint32_t, 22>& values() const {
        return values_;
    }

    void request(const GpuCloud& cloud, ProbeSettings settings) {
        if (busy())
            throw std::logic_error("Do not replace a probe while its source is in flight");
        if (!cloud.ready() || !finite(settings.center) || std::abs(settings.center.x) > 128 || std::abs(settings.center.y) > 128 || std::abs(settings.center.z) > 128 || !std::isfinite(settings.radius) || settings.radius < 0 || settings.radius > 128 || settings.clipAxis < -1 || settings.clipAxis > 2 || !std::isfinite(settings.clipOffset) || std::abs(settings.clipOffset) > 128)
            throw std::invalid_argument("Probe needs a current cloud and finite sphere");
        cloud_ = &cloud;
        settings_ = settings;
        next_ = 0;
        gpuMs_ = 0;
        ready_ = false;
        gl_.BindBuffer(GL_SHADER_STORAGE_BUFFER, counts_.id());
        const std::uint32_t zero = 0;
        gl_.ClearBufferData(GL_SHADER_STORAGE_BUFFER, GL_R32UI, GL_RED_INTEGER, GL_UNSIGNED_INT, &zero);
    }

    // snippet:atom-probe-batch
    void tick() {
        if (!cloud_)
            return;
        if (fence_) {
            const auto status = gl_.ClientWaitSync(fence_, 0, 0);
            if (status == GL_WAIT_FAILED)
                throw std::runtime_error("Probe fence failed");
            if (status == GL_TIMEOUT_EXPIRED) {
                if (std::chrono::steady_clock::now() - submitted_ > std::chrono::seconds(3))
                    throw std::runtime_error("Probe deadline");
                return;
            }
            gl_.DeleteSync(fence_);
            fence_ = nullptr;
            GLuint64 elapsed{};
            gl_.GetQueryObjectui64v(query_, GL_QUERY_RESULT, &elapsed);
            gpuMs_ += elapsed / 1000000.0;
        }
        if (next_ == cloud_->accepted()) {
            counts_.read(0, sizeof(values_), values_.data());
            if (values_[0] != cloud_->accepted() || values_[1] != cloud_->accepted() || values_[21])
                throw std::runtime_error("Probe detected invalid/incomplete point records");
            cloud_ = nullptr;
            ready_ = true;
            return;
        }
        const auto batch = std::min<std::uint32_t>(32768, cloud_->accepted() - next_);
        cloud_->points().bind(2);
        counts_.bind(4);
        program_.use();
        gl_.Uniform1ui(program_.uniform("pointCount"), cloud_->accepted());
        gl_.Uniform1ui(program_.uniform("startIndex"), next_);
        gl_.Uniform1ui(program_.uniform("batchCount"), batch);
        gl_.Uniform1f(program_.uniform("rMax"), cloud_->config().radius);
        Vec3 normal{};
        if (settings_.clipAxis == 0)
            normal.x = 1;
        if (settings_.clipAxis == 1)
            normal.y = 1;
        if (settings_.clipAxis == 2)
            normal.z = 1;
        gl_.Uniform1i(program_.uniform("clipEnabled"), settings_.clipAxis >= 0);
        gl_.Uniform4f(program_.uniform("clipPlane"), normal.x, normal.y, normal.z, settings_.clipOffset);
        gl_.Uniform4f(program_.uniform("regionSphere"), settings_.center.x, settings_.center.y, settings_.center.z, settings_.radius);
        gl_.BeginQuery(GL_TIME_ELAPSED, query_);
        gl_.DispatchCompute((batch + 255) / 256, 1, 1);
        gl_.MemoryBarrier(GL_SHADER_STORAGE_BARRIER_BIT);
        gl_.EndQuery(GL_TIME_ELAPSED);
        fence_ = gl_.FenceSync(GL_SYNC_GPU_COMMANDS_COMPLETE, 0);
        gl_.Flush();
        if (!fence_ || gl_.GetError() != GL_NO_ERROR)
            throw std::runtime_error("Probe dispatch failed");
        next_ += batch;
        submitted_ = std::chrono::steady_clock::now();
    }

    // end-snippet:atom-probe-batch
    private:
    GlApi& gl_;
    Program program_;
    Buffer counts_;
    const GpuCloud* cloud_{};
    ProbeSettings settings_;
    std::array<std::uint32_t, 22> values_{};
    std::uint32_t next_{};
    GLuint query_{};
    GLsync fence_{};
    bool ready_{};
    double gpuMs_{};
    std::chrono::steady_clock::time_point submitted_;
};
#else
// The app can keep its supplied probe interface before lesson 8, but this stub
// neither compiles a measurement kernel nor invents counts for an absent pass.
class GpuProbe {
    public:
    GpuProbe(GlApi&, MemoryBudget&) {
    }

    bool busy() const {
        return false;
    }

    bool ready() const {
        return false;
    }

    double gpuMs() const {
        return 0;
    }

    const std::array<std::uint32_t, 22>& values() const {
        return values_;
    }

    void request(const GpuCloud&, ProbeSettings) {
        throw std::logic_error("GPU region/histogram measurement is introduced at checkpoint 8");
    }

    void tick() {
    }

    private:
    std::array<std::uint32_t, 22> values_{};
};
#endif

} // namespace atom
