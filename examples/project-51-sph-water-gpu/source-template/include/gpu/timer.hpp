#pragma once
#include "gpu/api.hpp"
#include <array>
#include <vector>

namespace water51 {
enum class Phase { Grid, Density, Force, Extrema, Integration, Count };
inline constexpr std::array<const char*, 5> phaseNames{"grid", "density", "force", "extrema", "integration"};

struct GpuTiming {
    std::array<double, 5> milliseconds{};
    double total = 0;
};

class BatchTimer {
    Gl& gl_;
    std::array<GLuint, 64> queries_{};

    struct Span {
        Phase phase;
        int begin;
        int end;
    };

    std::vector<Span> spans_;
    int used_ = 0;

    public:
    explicit BatchTimer(Gl& gl)
        : gl_(gl) {
        gl_.GenQueries(static_cast<GLsizei>(queries_.size()), queries_.data());
    }

    ~BatchTimer() {
        gl_.DeleteQueries(static_cast<GLsizei>(queries_.size()), queries_.data());
    }

    void start() {
        spans_.clear();
        used_ = 0;
        stamp();
    }

    int stamp() {
        if (used_ >= static_cast<int>(queries_.size()))
            throw std::length_error("Timestamp budget exceeded");
        gl_.QueryCounter(queries_[used_], GL_TIMESTAMP);
        return used_++;
    }

    template <class Function>
    void measure(Phase phase, Function action) {
        const int begin = stamp();
        action();
        const int end = stamp();
        spans_.push_back({phase, begin, end});
    }

    void finish() {
        stamp();
    }

    bool ready() {
        for (int i = 0; i < used_; ++i) {
            GLint available = 0;
            gl_.GetQueryObjectiv(queries_[i], GL_QUERY_RESULT_AVAILABLE, &available);
            if (!available)
                return false;
        }
        return true;
    }

    // The queue's fence has already signalled. Never read an unfinished query.
    GpuTiming read() {
        std::array<GLuint64, 64> values{};
        for (int i = 0; i < used_; ++i)
            gl_.GetQueryObjectui64v(queries_[i], GL_QUERY_RESULT, &values[i]);
        GpuTiming result;
        for (const auto& span : spans_)
            result.milliseconds[static_cast<std::size_t>(span.phase)] += static_cast<double>(values[span.end] - values[span.begin]) * 1e-6;
        result.total = static_cast<double>(values[used_ - 1] - values[0]) * 1e-6;
        return result;
    }
};
} // namespace water51
