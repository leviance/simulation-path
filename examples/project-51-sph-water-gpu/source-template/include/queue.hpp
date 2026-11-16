#pragma once
#include "gl_api.hpp"
#include "gpu-error.hpp"
#include <array>
#include <chrono>
#include <stdexcept>

namespace water3 {
struct PassTiming {
    const char* label = "";
    double milliseconds = 0;
};

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
        if (!queries_[0]) {
            gl.GenQueries(static_cast<GLsizei>(queries_.size()), queries_.data());
        }
        stampCount_ = 1;
        gl.QueryCounter(queries_[0], GL_TIMESTAMP);
        started_ = std::chrono::steady_clock::now();
    }

    // Timestamp nằm trong hàng đợi GPU, không lấy thời gian enqueue CPU làm chi phí pass.
    // [snippet gpu-timestamp]
    void mark(lab::GlApi& gl, const char* label) {
        if (stampCount_ >= queries_.size()) {
            throw std::runtime_error("Too many GPU profiler intervals");
        }
        timings[stampCount_ - 1].label = label;
        gl.QueryCounter(queries_[stampCount_], GL_TIMESTAMP);
        ++stampCount_;
    }

    // [/snippet gpu-timestamp]

    void end(lab::GlApi& gl) {
        mark(gl, "Finish");
        gl.MemoryBarrier(GL_SHADER_STORAGE_BARRIER_BIT | GL_BUFFER_UPDATE_BARRIER_BIT);
        fence_ = gl.FenceSync(GL_SYNC_GPU_COMMANDS_COMPLETE, 0);
        gl.Flush();
        if (!fence_ || gl.GetError() != GL_NO_ERROR) {
            throw GpuBatchError("GPU batch/fence failed");
        }
    }

    // [snippet fence-poll]
    bool poll(lab::GlApi& gl) {
        if (!pending()) {
            return true;
        }
        const auto result = gl.ClientWaitSync(fence_, 0, 0);
        if (result == GL_WAIT_FAILED || std::chrono::steady_clock::now() - started_ > std::chrono::seconds(5)) {
            throw GpuBatchError("GPU failed or exceeded 5s; no further batches will be sent");
        }
        if (result == GL_TIMEOUT_EXPIRED) {
            return false;
        }
        // Chỉ đọc kết quả khi tất cả timestamp đã sẵn sàng; không chờ bận.
        for (std::size_t i = 0; i < stampCount_; ++i) {
            GLint available = GL_FALSE;
            gl.GetQueryObjectiv(queries_[i], GL_QUERY_RESULT_AVAILABLE, &available);
            if (available != GL_TRUE)
                return false;
        }
        std::array<GLuint64, 16> ns{};
        for (std::size_t i = 0; i < stampCount_; ++i) {
            gl.GetQueryObjectui64v(queries_[i], GL_QUERY_RESULT, &ns[i]);
        }
        passCount = stampCount_ - 1;
        for (std::size_t i = 0; i < passCount; ++i) {
            timings[i].milliseconds = static_cast<double>(ns[i + 1] - ns[i]) / 1e6;
        }
        milliseconds = static_cast<double>(ns[stampCount_ - 1] - ns[0]) / 1e6;
        gl.DeleteSync(fence_);
        fence_ = nullptr;
        return true;
    }

    // [/snippet fence-poll]

    void destroy(lab::GlApi& gl) {
        if (fence_) {
            gl.DeleteSync(fence_);
            fence_ = nullptr;
        }
        gl.DeleteQueries(static_cast<GLsizei>(queries_.size()), queries_.data());
        queries_.fill(0);
    }

    double milliseconds = 0;
    std::array<PassTiming, 16> timings{};
    std::size_t passCount = 0;

    private:
    GLsync fence_ = nullptr;
    std::array<GLuint, 16> queries_{};
    std::size_t stampCount_ = 0;
    std::chrono::steady_clock::time_point started_{};
};
} // namespace water3
