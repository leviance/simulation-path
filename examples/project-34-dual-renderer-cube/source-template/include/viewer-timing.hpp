#pragma once
#include "gl_api.hpp"
#include <array>
#include <chrono>
#include <cstdint>

namespace lab {
using ViewerClock = std::chrono::steady_clock;

inline double viewerMilliseconds(ViewerClock::time_point start) {
    return std::chrono::duration<double, std::milli>(ViewerClock::now() - start).count();
}

struct ViewerFrameStats {
    double prepareMs{}, cpuRenderMs{}, uploadMs{}, submitMs{}, presentMs{}, frameMs{};
    bool cpuPathExecuted{};
    std::uint64_t frame{};
};

// Query results belong to an earlier tagged frame. Never block interactive
// rendering on GL_QUERY_RESULT before GL_QUERY_RESULT_AVAILABLE is true.
struct ViewerGpuTimer {
    std::array<GLuint, 3> queries{};
    std::array<bool, 3> pending{};
    std::array<std::uint64_t, 3> frames{};
    bool supported{}, hasSample{};
    double milliseconds{};
    std::uint64_t sampleFrame{};
    int active{-1};

    void initialize(GlApi& gl) {
        supported = gl.GenQueries && gl.DeleteQueries && gl.BeginQuery && gl.EndQuery && gl.GetQueryiv && gl.GetQueryObjectiv && gl.GetQueryObjectui64v;
        if (!supported)
            return;
        GLint bits = 0;
        gl.GetQueryiv(GL_TIME_ELAPSED, GL_QUERY_COUNTER_BITS, &bits);
        const GLenum error = gl.GetError();
        if (bits <= 0 || error != GL_NO_ERROR) {
            supported = false;
            return;
        }
        gl.GenQueries(GLsizei(queries.size()), queries.data());
        for (GLuint query : queries) {
            if (!query)
                supported = false;
        }
    }

    void poll(GlApi& gl) {
        if (!supported)
            return;
        for (std::size_t index = 0; index < queries.size(); ++index) {
            if (!pending[index])
                continue;
            GLint ready = GL_FALSE;
            gl.GetQueryObjectiv(queries[index], GL_QUERY_RESULT_AVAILABLE, &ready);
            if (ready != GL_TRUE)
                continue;
            GLuint64 elapsed = 0;
            gl.GetQueryObjectui64v(queries[index], GL_QUERY_RESULT, &elapsed);
            if (!hasSample || frames[index] >= sampleFrame) {
                milliseconds = double(elapsed) / 1'000'000;
                sampleFrame = frames[index];
                hasSample = true;
            }
            pending[index] = false;
        }
    }

    bool begin(GlApi& gl, std::uint64_t frame) {
        poll(gl);
        if (!supported || active >= 0)
            return false;
        for (std::size_t index = 0; index < queries.size(); ++index) {
            if (pending[index])
                continue;
            gl.BeginQuery(GL_TIME_ELAPSED, queries[index]);
            frames[index] = frame;
            active = int(index);
            return true;
        }
        return false;
    }

    void end(GlApi& gl) {
        if (active < 0)
            return;
        gl.EndQuery(GL_TIME_ELAPSED);
        pending[std::size_t(active)] = true;
        active = -1;
    }

    void destroy(GlApi& gl) {
        end(gl);
        if (gl.DeleteQueries)
            gl.DeleteQueries(GLsizei(queries.size()), queries.data());
        queries = {};
        pending = {};
        supported = hasSample = false;
    }
};
} // namespace lab
