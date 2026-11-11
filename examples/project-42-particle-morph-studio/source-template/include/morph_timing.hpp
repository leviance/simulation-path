#pragma once
#include "morph_gl.hpp"

namespace morph {

// Four delayed query pairs: never wait for a GPU timer in the ordinary frame loop.
class GpuTimings {
    public:
    explicit GpuTimings(GlApi &gl)
        : gl_(gl) {
        gl_.GenQueries(8, queries_.data());
    }
    ~GpuTimings() {
        gl_.DeleteQueries(8, queries_.data());
    }
    void beginUpdate(bool hasWork) {
        measured_ = false;
#if LAB_CHECKPOINT >= 9
        collect();
        if (!pending_[slot_]) {
            measured_ = true;
            hasWork_[slot_] = hasWork;
            serial_[slot_] = ++submitted_;
            gl_.BeginQuery(GL_TIME_ELAPSED, queries_[slot_ * 2]);
        }
#else
        (void)hasWork;
#endif
    }
    void endUpdate() {
        if (measured_)
            gl_.EndQuery(GL_TIME_ELAPSED);
    }
    void beginDraw() {
        if (measured_)
            gl_.BeginQuery(GL_TIME_ELAPSED, queries_[slot_ * 2 + 1]);
    }
    void endDraw() {
        if (measured_) {
            gl_.EndQuery(GL_TIME_ELAPSED);
            pending_[slot_] = true;
            slot_ = (slot_ + 1) % pending_.size();
        }
    }
    double updateMs() const {
        return updateMs_;
    }
    double drawMs() const {
        return drawMs_;
    }
    bool available() const {
        return available_;
    }

    private:
    void collect() {
        for (std::size_t index = 0; index < pending_.size(); ++index) {
            if (!pending_[index])
                continue;
            GLint updateReady{};
            GLint drawReady{};
            gl_.GetQueryObjectiv(queries_[index * 2], GL_QUERY_RESULT_AVAILABLE, &updateReady);
            gl_.GetQueryObjectiv(queries_[index * 2 + 1], GL_QUERY_RESULT_AVAILABLE, &drawReady);
            if (updateReady && drawReady) {
                GLuint64 update{};
                GLuint64 draw{};
                gl_.GetQueryObjectui64v(queries_[index * 2], GL_QUERY_RESULT, &update);
                gl_.GetQueryObjectui64v(queries_[index * 2 + 1], GL_QUERY_RESULT, &draw);
                if (hasWork_[index] && serial_[index] > lastUpdate_) {
                    updateMs_ = static_cast<double>(update) / 1e6;
                    lastUpdate_ = serial_[index];
                }
                if (serial_[index] > lastDraw_) {
                    drawMs_ = static_cast<double>(draw) / 1e6;
                    lastDraw_ = serial_[index];
                }
                available_ = true;
                pending_[index] = false;
            }
        }
    }
    GlApi &gl_;
    std::array<GLuint, 8> queries_{};
    std::array<bool, 4> pending_{};
    std::array<bool, 4> hasWork_{};
    std::array<std::uint64_t, 4> serial_{};
    std::uint64_t submitted_{};
    std::uint64_t lastUpdate_{};
    std::uint64_t lastDraw_{};
    std::size_t slot_{};
    bool measured_{};
    bool available_{};
    double updateMs_{};
    double drawMs_{};
};

} // namespace morph
