#pragma once
#include "gpu/api.hpp"
#include "gpu/failure.hpp"
#include <chrono>

namespace water51 {
// Poll timestamps without blocking or reusing an unfinished query.

class RenderTimer {
    Gl& gl_;
    GLuint queries_[2]{};
    bool waiting_ = false;
    std::chrono::steady_clock::time_point submitted_{};

    public:
    double milliseconds = 0;

    explicit RenderTimer(Gl& gl)
        : gl_(gl) {
        gl_.GenQueries(2, queries_);
    }

    ~RenderTimer() {
        gl_.DeleteQueries(2, queries_);
    }

    bool waiting() const {
        return waiting_;
    }

    bool poll() {
        if (!waiting_)
            return false;
        GLint available = 0;
        gl_.GetQueryObjectiv(queries_[1], GL_QUERY_RESULT_AVAILABLE, &available);
        if (!available) {
            if (std::chrono::steady_clock::now() - submitted_ > std::chrono::seconds(5))
                fatalGpu("Render timestamp deadline exceeded");
            return false;
        }
        GLuint64 begin = 0, end = 0;
        gl_.GetQueryObjectui64v(queries_[0], GL_QUERY_RESULT, &begin);
        gl_.GetQueryObjectui64v(queries_[1], GL_QUERY_RESULT, &end);
        milliseconds = static_cast<double>(end - begin) * 1e-6;
        waiting_ = false;
        return true;
    }

    void begin() {
        if (waiting_)
            throw std::logic_error("Render query still pending");
        gl_.QueryCounter(queries_[0], GL_TIMESTAMP);
    }

    void end() {
        gl_.QueryCounter(queries_[1], GL_TIMESTAMP);
        waiting_ = true;
        submitted_ = std::chrono::steady_clock::now();
    }
};
} // namespace water51
