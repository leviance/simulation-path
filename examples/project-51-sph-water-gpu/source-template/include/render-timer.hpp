#pragma once
#include "gl_api.hpp"
#include <array>
#include <cstdint>

namespace water3 {
// Một cặp timestamp đang chờ; không đọc GL_QUERY_RESULT khi chưa available.
class RenderTimer {
    public:
    std::uint64_t sequence = 0;
    double milliseconds = 0;

    bool pending() const {
        return pending_;
    }

    bool begin(lab::GlApi& gl) {
        if (pending_) {
            GLint first = GL_FALSE, last = GL_FALSE;
            gl.GetQueryObjectiv(queries_[0], GL_QUERY_RESULT_AVAILABLE, &first);
            gl.GetQueryObjectiv(queries_[1], GL_QUERY_RESULT_AVAILABLE, &last);
            if (first != GL_TRUE || last != GL_TRUE)
                return false;
            GLuint64 a = 0, b = 0;
            gl.GetQueryObjectui64v(queries_[0], GL_QUERY_RESULT, &a);
            gl.GetQueryObjectui64v(queries_[1], GL_QUERY_RESULT, &b);
            milliseconds = static_cast<double>(b - a) / 1e6;
            ++sequence;
            pending_ = false;
        }
        if (!queries_[0])
            gl.GenQueries(2, queries_.data());
        gl.QueryCounter(queries_[0], GL_TIMESTAMP);
        return true;
    }

    void end(lab::GlApi& gl, bool measured) {
        if (!measured)
            return;
        gl.QueryCounter(queries_[1], GL_TIMESTAMP);
        pending_ = true;
    }

    void destroy(lab::GlApi& gl) {
        gl.DeleteQueries(2, queries_.data());
        queries_.fill(0);
        pending_ = false;
    }

    private:
    std::array<GLuint, 2> queries_{};
    bool pending_ = false;
};
} // namespace water3
