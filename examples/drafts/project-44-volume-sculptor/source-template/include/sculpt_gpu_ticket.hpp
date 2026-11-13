#pragma once

#include "sculpt_gl.hpp"
#include <algorithm>
#include <chrono>
#include <optional>
#include <vector>

namespace sculpt {

// One bounded command batch owns its fence and non-overlapping elapsed GPU queries.
class GpuTicket {
    public:
    explicit GpuTicket(GlApi& gl)
        : gl_(gl) {
        gl_.GenQueries(static_cast<GLsizei>(queries_.size()), queries_.data());
        for (GLuint query : queries_) {
            if (!query) {
                gl_.DeleteQueries(static_cast<GLsizei>(queries_.size()), queries_.data());
                throw std::runtime_error("Could not allocate elapsed GPU queries");
            }
        }
    }

    ~GpuTicket() {
        if (fence_)
            gl_.DeleteSync(fence_);
        gl_.DeleteQueries(static_cast<GLsizei>(queries_.size()), queries_.data());
    }

    GpuTicket(const GpuTicket&) = delete;
    GpuTicket& operator=(const GpuTicket&) = delete;

    bool busy() const {
        return fence_ != nullptr;
    }

    void begin(std::size_t index) {
        if (busy() || index >= queries_.size())
            throw std::logic_error("GPU timer cannot overlap a pending batch");
        count_ = std::max(count_, index + 1);
        gl_.BeginQuery(GL_TIME_ELAPSED, queries_[index]);
    }

    void end() {
        gl_.EndQuery(GL_TIME_ELAPSED);
    }

    void submit() {
        if (busy() || count_ == 0)
            throw std::logic_error("A GPU ticket needs one submitted finite batch");
        fence_ = gl_.FenceSync(GL_SYNC_GPU_COMMANDS_COMPLETE, 0);
        if (!fence_)
            throw std::runtime_error("Could not create GPU completion fence");
        started_ = std::chrono::steady_clock::now();
        gl_.Flush();
    }

    std::optional<std::array<double, 2>> poll() {
        if (!busy())
            return {};
        if (std::chrono::steady_clock::now() - started_ > std::chrono::seconds(3))
            throw std::runtime_error("Sculpt GPU batch exceeded its three-second fence deadline");
        const GLenum state = gl_.ClientWaitSync(fence_, 0, 0);
        if (state == GL_WAIT_FAILED)
            throw std::runtime_error("GPU fence wait failed");
        if (state != GL_ALREADY_SIGNALED && state != GL_CONDITION_SATISFIED)
            return {};
        for (std::size_t index = 0; index < count_; ++index) {
            GLint available{};
            gl_.GetQueryObjectiv(queries_[index], GL_QUERY_RESULT_AVAILABLE, &available);
            if (!available)
                return {};
        }
        std::array<double, 2> times{};
        for (std::size_t index = 0; index < count_; ++index) {
            GLuint64 nanoseconds{};
            gl_.GetQueryObjectui64v(queries_[index], GL_QUERY_RESULT, &nanoseconds);
            times[index] = static_cast<double>(nanoseconds) / 1000000.0;
        }
        gl_.DeleteSync(fence_);
        fence_ = nullptr;
        count_ = 0;
        return times;
    }

    private:
    GlApi& gl_;
    std::array<GLuint, 2> queries_{};
    std::size_t count_{};
    GLsync fence_{};
    std::chrono::steady_clock::time_point started_;
};

} // namespace sculpt
