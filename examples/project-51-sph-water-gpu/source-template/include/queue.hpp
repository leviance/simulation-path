#pragma once
#include "gl_api.hpp"
#include <chrono>
#include <stdexcept>

namespace water3 {
// One whole tick is fenced. Poll never blocks the SDL event loop or sleeps for GPU work.
class Queue {
    public:
    bool pending() const {
        return fence_ != nullptr;
    }

    void begin(lab::GlApi& gl) {
        if (pending()) {
            throw std::runtime_error("Only one GPU batch may be pending");
        }
        if (!query_) {
            gl.GenQueries(1, &query_);
        }
        gl.BeginQuery(GL_TIME_ELAPSED, query_);
        started_ = std::chrono::steady_clock::now();
    }

    void end(lab::GlApi& gl) {
        gl.EndQuery(GL_TIME_ELAPSED);
        gl.MemoryBarrier(GL_SHADER_STORAGE_BARRIER_BIT | GL_BUFFER_UPDATE_BARRIER_BIT);
        fence_ = gl.FenceSync(GL_SYNC_GPU_COMMANDS_COMPLETE, 0);
        gl.Flush();
        if (!fence_ || gl.GetError() != GL_NO_ERROR) {
            throw std::runtime_error("GPU batch/fence failed");
        }
    }

    bool poll(lab::GlApi& gl) {
        if (!pending()) {
            return true;
        }
        const auto result = gl.ClientWaitSync(fence_, 0, 0);
        if (result == GL_WAIT_FAILED || std::chrono::steady_clock::now() - started_ > std::chrono::seconds(5)) {
            throw std::runtime_error("GPU failed or exceeded 5s; no further batches will be sent");
        }
        if (result == GL_TIMEOUT_EXPIRED) {
            return false;
        }
        GLint available = GL_FALSE;
        gl.GetQueryObjectiv(query_, GL_QUERY_RESULT_AVAILABLE, &available);
        if (available != GL_TRUE) {
            return false;
        }
        GLuint64 ns = 0;
        gl.GetQueryObjectui64v(query_, GL_QUERY_RESULT, &ns);
        milliseconds = static_cast<double>(ns) / 1e6;
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

    double milliseconds = 0;

    private:
    GLsync fence_ = nullptr;
    GLuint query_ = 0;
    std::chrono::steady_clock::time_point started_{};
};
} // namespace water3
