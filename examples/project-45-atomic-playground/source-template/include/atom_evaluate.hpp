#pragma once

#include "atom_gpu.hpp"

namespace atom {

// A separate GPU pass reads positions, evaluates the supplied density, compares
// the stored density/sign and counts mismatches. Its timer includes all of that
// work, including SSBO reads and atomics; it is not a pure ALU benchmark.
// Reusing density.glsl checks GPU record consistency, not the scientific model.
// Independent closed-form/integral CPU fixtures establish the supplied formulas.
#if LAB_CHECKPOINT >= 11
class GpuEvaluation {
    public:
    GpuEvaluation(GlApi& gl, MemoryBudget& budget) :
        gl_(gl),
        program_(gl, "evaluate.comp"),
        counters_(gl, budget, 2 * sizeof(std::uint32_t)) {
        gl_.GenQueries(1, &query_);
        if (!query_ || gl_.GetError() != GL_NO_ERROR) {
            if (query_)
                gl_.DeleteQueries(1, &query_);
            query_ = 0;
            throw std::runtime_error("Could not prepare the GPU field-evaluation query");
        }
    }

    ~GpuEvaluation() {
        if (fence_)
            gl_.DeleteSync(fence_);
        if (query_)
            gl_.DeleteQueries(1, &query_);
    }

    GpuEvaluation(const GpuEvaluation&) = delete;
    GpuEvaluation& operator=(const GpuEvaluation&) = delete;

    bool busy() const {
        return cloud_ != nullptr;
    }

    bool ready() const {
        return ready_;
    }

    double gpuMs() const {
        return gpuMs_;
    }

    // [0] records actually examined; [1] invalid records or field mismatches.
    const std::array<std::uint32_t, 2>& values() const {
        return values_;
    }

    // The caller must retain this cloud while busy, just as it does for a probe.
    // Requesting evaluation neither mutates positions nor regenerates the cloud.
    void request(const GpuCloud& cloud) {
        if (busy())
            throw std::logic_error("Do not replace a GPU evaluation while its source is in flight");
        if (!cloud.ready() || cloud.accepted() != cloud.config().count || cloud.invalid() != 0)
            throw std::invalid_argument("GPU evaluation requires a complete accepted cloud");
        cloud.config().validate();
        ready_ = false;
        values_.fill(0);
        gpuMs_ = 0;
        next_ = 0;
        gl_.BindBuffer(GL_SHADER_STORAGE_BUFFER, counters_.id());
        const std::uint32_t zero = 0;
        gl_.ClearBufferData(GL_SHADER_STORAGE_BUFFER, GL_R32UI, GL_RED_INTEGER, GL_UNSIGNED_INT, &zero);
        if (gl_.GetError() != GL_NO_ERROR)
            throw std::runtime_error("Could not reset GPU evaluation counters");
        started_ = Clock::now();
        cloud_ = &cloud;
    }

    // snippet:atom-evaluate-batch
    void tick() {
        if (!cloud_)
            return;
        try {
            checkJobDeadline();
            if (fence_) {
                const auto status = gl_.ClientWaitSync(fence_, 0, 0);
                if (status == GL_WAIT_FAILED)
                    throw std::runtime_error("GPU evaluation fence failed");
                if (status == GL_TIMEOUT_EXPIRED) {
                    checkBatchDeadline();
                    return;
                }

                // Do not request a blocking query result. Even after the fence,
                // keep polling if a driver has not exposed the timer result yet.
                GLint available = 0;
                gl_.GetQueryObjectiv(query_, GL_QUERY_RESULT_AVAILABLE, &available);
                if (gl_.GetError() != GL_NO_ERROR)
                    throw std::runtime_error("Could not poll the GPU evaluation timer");
                if (!available) {
                    checkBatchDeadline();
                    return;
                }
                GLuint64 elapsed = 0;
                gl_.GetQueryObjectui64v(query_, GL_QUERY_RESULT, &elapsed);
                if (gl_.GetError() != GL_NO_ERROR)
                    throw std::runtime_error("Could not read the GPU evaluation timer");
                gpuMs_ += static_cast<double>(elapsed) / 1000000.0;
                gl_.DeleteSync(fence_);
                fence_ = nullptr;
                counters_.read(0, sizeof(values_), values_.data());
                if (values_[0] != next_ || values_[1] != 0)
                    throw std::runtime_error("GPU field evaluation found incomplete or inconsistent records");
            }

            if (next_ == cloud_->accepted()) {
                cloud_ = nullptr;
                ready_ = true;
                return;
            }

            // Query objects may be pending concurrently, but GL_TIME_ELAPSED
            // queries cannot be active at the same time. Never end somebody
            // else's draw/probe/sample query to make room for this one.
            GLint activeQuery = 0;
            gl_.GetQueryiv(GL_TIME_ELAPSED, GL_CURRENT_QUERY, &activeQuery);
            if (gl_.GetError() != GL_NO_ERROR)
                throw std::runtime_error("Could not check GPU timer ownership");
            if (activeQuery != 0)
                return;

            const auto batchCount = std::min<std::uint32_t>(32768, cloud_->accepted() - next_);
            cloud_->points().bind(2);
            counters_.bind(5);
            program_.use();
            gl_.Uniform1i(program_.uniform("orbital"), static_cast<int>(cloud_->config().orbital));
            gl_.Uniform1ui(program_.uniform("pointCount"), cloud_->accepted());
            gl_.Uniform1ui(program_.uniform("startIndex"), next_);
            gl_.Uniform1ui(program_.uniform("batchCount"), batchCount);
            if (gl_.GetError() != GL_NO_ERROR)
                throw std::runtime_error("Could not bind the GPU evaluation input");

            gl_.BeginQuery(GL_TIME_ELAPSED, query_);
            gl_.DispatchCompute((batchCount + 255) / 256, 1, 1);
            gl_.MemoryBarrier(GL_SHADER_STORAGE_BARRIER_BIT | GL_BUFFER_UPDATE_BARRIER_BIT);
            gl_.EndQuery(GL_TIME_ELAPSED);
            fence_ = gl_.FenceSync(GL_SYNC_GPU_COMMANDS_COMPLETE, 0);
            gl_.Flush();
            if (!fence_ || gl_.GetError() != GL_NO_ERROR)
                throw std::runtime_error("GPU evaluation dispatch failed");
            next_ += batchCount;
            submitted_ = Clock::now();
        } catch (...) {
            // Deleting a sync does not wait for the device. GL retains resources
            // referenced by submitted commands until those commands finish.
            if (fence_) {
                gl_.DeleteSync(fence_);
                fence_ = nullptr;
            }
            cloud_ = nullptr;
            ready_ = false;
            throw;
        }
    }

    // end-snippet:atom-evaluate-batch

    private:
    using Clock = std::chrono::steady_clock;

    void checkJobDeadline() const {
        if (Clock::now() - started_ > std::chrono::seconds(15))
            throw std::runtime_error("GPU field evaluation exceeded its fifteen-second job deadline");
    }

    void checkBatchDeadline() const {
        if (Clock::now() - submitted_ > std::chrono::seconds(3))
            throw std::runtime_error("GPU field evaluation exceeded its three-second fence deadline");
    }

    GlApi& gl_;
    Program program_;
    Buffer counters_;
    const GpuCloud* cloud_{};
    std::array<std::uint32_t, 2> values_{};
    std::uint32_t next_{};
    GLuint query_{};
    GLsync fence_{};
    bool ready_{};
    double gpuMs_{};
    Clock::time_point started_, submitted_;
};

#else
// The application may name this interface before lesson 11, but there is no
// field-validation pass yet. Replace this interface with the implementation in
// that lesson; do not add a second class with the same name.
class GpuEvaluation {
    public:
    GpuEvaluation(GlApi&, MemoryBudget&) {
        throw std::logic_error("GPU field evaluation is introduced at checkpoint 11");
    }

    void request(const GpuCloud&) {
        throw std::logic_error("GPU field evaluation is introduced at checkpoint 11");
    }

    void tick() {
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

    const std::array<std::uint32_t, 2>& values() const {
        return values_;
    }

    private:
    std::array<std::uint32_t, 2> values_{};
};
#endif

} // namespace atom
