#pragma once
#include "gl_api.hpp"

#include <algorithm>
#include <array>
#include <vector>

#if LAB_CHECKPOINT >= 11
namespace chamber {

class TimerRing {
    // Each query stays pending until its result is available and consumed; the UI never waits here.
    std::array<GLuint, 4> queries_{};
    std::array<bool, 4> pending_{};
    std::size_t cursor_{};
    bool active_{};

    public:
    std::vector<double> samples{};

    void initialize(GlApi& gl) {
        gl.GenQueries(static_cast<GLsizei>(queries_.size()), queries_.data());
    }

    bool begin(GlApi& gl) {
        if (active_ || pending_[cursor_])
            return false;
        gl.BeginQuery(GL_TIME_ELAPSED, queries_[cursor_]);
        active_ = true;
        return true;
    }

    void end(GlApi& gl) {
        if (!active_)
            return;
        gl.EndQuery(GL_TIME_ELAPSED);
        pending_[cursor_] = true;
        cursor_ = (cursor_ + 1U) % queries_.size();
        active_ = false;
    }

    void poll(GlApi& gl) {
        for (std::size_t slot = 0; slot < queries_.size(); ++slot) {
            if (!pending_[slot])
                continue;
            GLint available = GL_FALSE;
            gl.GetQueryObjectiv(queries_[slot], GL_QUERY_RESULT_AVAILABLE, &available);
            if (available != GL_TRUE)
                continue;
            GLuint64 elapsed = 0;
            gl.GetQueryObjectui64v(queries_[slot], GL_QUERY_RESULT, &elapsed);
            samples.push_back(static_cast<double>(elapsed) / 1'000'000.0);
            if (samples.size() > 60U)
                samples.erase(samples.begin());
            pending_[slot] = false;
        }
    }

    double median() const {
        if (samples.empty())
            return 0.0;
        auto ordered = samples;
        std::sort(ordered.begin(), ordered.end());
        const std::size_t middle = ordered.size() / 2U;
        if (ordered.size() % 2U != 0U)
            return ordered[middle];
        return 0.5 * (ordered[middle - 1U] + ordered[middle]);
    }

    void destroy(GlApi& gl) {
        if (active_)
            gl.EndQuery(GL_TIME_ELAPSED);
        if (queries_[0] != 0)
            gl.DeleteQueries(static_cast<GLsizei>(queries_.size()), queries_.data());
        queries_.fill(0);
        pending_.fill(false);
        samples.clear();
        active_ = false;
        cursor_ = 0;
    }

    void reset(GlApi& gl) {
        destroy(gl);
        initialize(gl);
    }
};

} // namespace chamber
#endif
