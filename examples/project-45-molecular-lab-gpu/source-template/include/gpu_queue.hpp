#pragma once

#include "gl_api.hpp"

#include <chrono>
#include <stdexcept>

namespace molecular {

// Một dispatch đang bay; poll trả về SDL loop ngay khi GPU chưa xong.
class GpuQueue {
    public:
    using Clock = std::chrono::steady_clock;

    void initialize(lab::GlApi& gl) {
        gl.GenQueries(1, &query_);
        if (query_ == 0) {
            throw std::runtime_error("Cannot create GPU timer query.");
        }
    }

    bool pending() const {
        return fence_ != nullptr;
    }

    void dispatch(lab::GlApi& gl, GLuint groups) {
        if (pending() || groups == 0 || groups > 256) {
            throw std::runtime_error("Invalid or overlapping compute dispatch.");
        }
        gl.BeginQuery(GL_TIME_ELAPSED, query_);
        gl.DispatchCompute(groups, 1, 1);
        gl.EndQuery(GL_TIME_ELAPSED);
        gl.MemoryBarrier(GL_SHADER_STORAGE_BARRIER_BIT | GL_BUFFER_UPDATE_BARRIER_BIT);
        fence_ = gl.FenceSync(GL_SYNC_GPU_COMMANDS_COMPLETE, 0);
        gl.Flush();
        started_ = Clock::now();
        if (!fence_ || gl.GetError() != GL_NO_ERROR) {
            throw std::runtime_error("Compute dispatch or fence failed.");
        }
    }

    bool poll(lab::GlApi& gl) {
        if (!pending()) {
            return true;
        }
        const GLenum result = gl.ClientWaitSync(fence_, 0, 0);
        if (result == GL_WAIT_FAILED) {
            throw std::runtime_error("GPU fence wait failed.");
        }
        if (Clock::now() - started_ > std::chrono::seconds(5)) {
            throw std::runtime_error("GPU batch exceeded 5 seconds. No further work will be submitted.");
        }
        if (result == GL_TIMEOUT_EXPIRED) {
            return false;
        }
        GLint available = GL_FALSE;
        gl.GetQueryObjectiv(query_, GL_QUERY_RESULT_AVAILABLE, &available);
        if (available != GL_TRUE) {
            return false;
        }
        GLuint64 nanoseconds = 0;
        gl.GetQueryObjectui64v(query_, GL_QUERY_RESULT, &nanoseconds);
        lastMilliseconds = static_cast<double>(nanoseconds) / 1000000.0;
        gl.DeleteSync(fence_);
        fence_ = nullptr;
        return true;
    }

    void destroy(lab::GlApi& gl) {
        if (fence_) {
            gl.DeleteSync(fence_);
            fence_ = nullptr;
        }
        gl.DeleteQueries(1, &query_);
        query_ = 0;
    }

    double lastMilliseconds = 0;

    private:
    GLsync fence_ = nullptr;
    GLuint query_ = 0;
    Clock::time_point started_{};
};

} // namespace molecular
