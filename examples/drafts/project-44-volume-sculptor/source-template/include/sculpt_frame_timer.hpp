#pragma once

#include "sculpt_gl.hpp"
#include <chrono>
#include <cstdint>

namespace sculpt {

// Nonblocking timer for rendering only. Compute/file commands are submitted before begin().
class FrameTimer {
    public:
    explicit FrameTimer(GlApi& gl)
        : gl_(gl) {
        gl_.GenQueries(static_cast<GLsizei>(queries_.size()), queries_.data());
        for (const auto query : queries_)
            if (!query) {
                gl_.DeleteQueries(static_cast<GLsizei>(queries_.size()), queries_.data());
                throw std::runtime_error("Could not allocate rendering timer queries");
            }
    }

    ~FrameTimer() {
        if (active_)
            gl_.EndQuery(GL_TIME_ELAPSED);
        gl_.DeleteQueries(static_cast<GLsizei>(queries_.size()), queries_.data());
    }

    FrameTimer(const FrameTimer&) = delete;
    FrameTimer& operator=(const FrameTimer&) = delete;

    double milliseconds() const {
        return latest_;
    }

    std::uint64_t samples() const {
        return samples_;
    }

    const std::string& error() const {
        return error_;
    }

    std::uint64_t sceneEpoch() const {
        return latestEpoch_;
    }

    std::uint32_t meshGeneration() const {
        return latestMesh_;
    }

    void begin() {
        if (active_)
            throw std::logic_error("A rendering timer query is already active");
        poll();
        if (!error_.empty() || pending_ == queries_.size())
            return;
        const auto index = (first_ + pending_) % queries_.size();
        gl_.BeginQuery(GL_TIME_ELAPSED, queries_[index]);
        active_ = true;
    }

    void end(std::uint64_t sceneEpoch, std::uint32_t meshGeneration) {
        if (!active_)
            return;
        gl_.EndQuery(GL_TIME_ELAPSED);
        submitted_[(first_ + pending_) % queries_.size()] = std::chrono::steady_clock::now();
        epochs_[(first_ + pending_) % queries_.size()] = sceneEpoch;
        meshes_[(first_ + pending_) % queries_.size()] = meshGeneration;
        ++pending_;
        active_ = false;
    }

    private:
    void poll() {
        while (pending_ != 0) {
            GLint available{};
            gl_.GetQueryObjectiv(queries_[first_], GL_QUERY_RESULT_AVAILABLE, &available);
            if (!available) {
                if (std::chrono::steady_clock::now() - submitted_[first_] > std::chrono::seconds(3))
                    error_ = "DRAW TIMER UNAVAILABLE / THREE-SECOND DEADLINE";
                return;
            }
            GLuint64 nanoseconds{};
            gl_.GetQueryObjectui64v(queries_[first_], GL_QUERY_RESULT, &nanoseconds);
            latest_ = static_cast<double>(nanoseconds) / 1000000.0;
            latestEpoch_ = epochs_[first_];
            latestMesh_ = meshes_[first_];
            ++samples_;
            first_ = (first_ + 1) % queries_.size();
            --pending_;
        }
    }

    GlApi& gl_;
    std::array<GLuint, 4> queries_{};
    std::array<std::chrono::steady_clock::time_point, 4> submitted_{};
    std::array<std::uint64_t, 4> epochs_{};
    std::array<std::uint32_t, 4> meshes_{};
    std::size_t first_{}, pending_{};
    std::uint64_t samples_{};
    std::uint64_t latestEpoch_{};
    std::uint32_t latestMesh_{};
    double latest_{};
    std::string error_;
    bool active_{};
};

} // namespace sculpt
