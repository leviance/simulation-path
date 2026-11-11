#pragma once

#include "morph_settings.hpp"
#include "spatial_order.hpp"
#include <chrono>
#include <memory>
#include <optional>
#include <string>

namespace morph {

struct Mapping {
    std::uint32_t random{};
    std::uint32_t spatial{};
};
static_assert(sizeof(Mapping) == 8);

struct Prepared {
    Settings settings;
    std::vector<Vec4> source;
    std::vector<Vec4> target;
    std::vector<Vec4> path;
    std::vector<Mapping> mapping;
    std::array<std::uint32_t, histogramBins> observed{};
    std::array<double, histogramBins> expected{};
    double setupMs{};
    double preparationWallMs{};
    double samplingMs{};
    double matchingMs{};
    std::uint64_t generation{};
};

class Preparation {
    public:
    Preparation(Settings settings, std::uint64_t generation)
        : sourceMesh_(makeMesh(settings.source)), targetMesh_(makeMesh(settings.target)),
          sourceArea_(sourceMesh_), targetArea_(targetMesh_),
          sourceRandom_(settings.seed ^ 0x13579bdfU), targetRandom_(settings.seed ^ 0x2468ace0U),
          shuffleRandom_(settings.seed ^ 0x51f15e5dU) {
        validateSettings(settings);
        planMemory(settings.count);
        output_ = std::make_shared<Prepared>();
        output_->settings = settings;
        output_->generation = generation;
        output_->expected = sourceArea_.expected();
        output_->source.reserve(settings.count);
        output_->target.reserve(settings.count);
        output_->path.reserve(settings.count);
        output_->mapping.reserve(settings.count);
        output_->setupMs = milliseconds(start_);
    }

    bool advance(std::size_t batch = 32768) {
        if (finished_)
            return true;
        if (cancelled_)
            return false;
        if (std::chrono::steady_clock::now() - start_ > std::chrono::seconds(30))
            throw std::runtime_error("Preparation exceeded its 30-second deadline");
        batch = std::clamp<std::size_t>(batch, 1, 32768);
        const auto begin = std::chrono::steady_clock::now();
        const std::size_t count = output_->settings.count;
        if (phase_ == 0) {
            const std::size_t end = std::min(count, cursor_ + batch);
            for (; cursor_ < end; ++cursor_) {
                const SurfacePoint a = sourceArea_.sample(sourceMesh_, sourceRandom_, output_->settings.sampling);
                const SurfacePoint b = targetArea_.sample(targetMesh_, targetRandom_, output_->settings.sampling);
                output_->source.push_back(pack(a.position, static_cast<float>(a.bin)));
                output_->target.push_back(pack(b.position));
                ++output_->observed[a.bin];
                const auto id = static_cast<std::uint32_t>(cursor_);
                output_->path.push_back(pack(curveOffset(a.position)));
                output_->mapping.push_back({id, id});
            }
            output_->samplingMs += milliseconds(begin);
            if (cursor_ == count) {
                phase_ = 1;
                cursor_ = 0;
            }
            return false;
        }
        if (phase_ == 1) {
            const std::size_t end = std::min(count, cursor_ + batch);
            for (; cursor_ < end; ++cursor_) {
                const std::size_t bin = static_cast<std::size_t>(output_->source[cursor_].w);
                const double expected = output_->expected[bin] * static_cast<double>(count);
                double ratio = 0.0;
                if (expected > 0.0)
                    ratio = static_cast<double>(output_->observed[bin]) / expected;
#if LAB_CHECKPOINT >= 3
                output_->path[cursor_].w = static_cast<float>(ratio);
#else
                (void)ratio;
                output_->path[cursor_].w = 1.0F;
#endif
            }
            if (cursor_ == count) {
                phase_ = 2;
                cursor_ = count - 1;
            }
        } else if (phase_ == 2) {
#if LAB_CHECKPOINT >= 4
            std::size_t steps = 0;
            while (cursor_ > 0 && steps++ < batch) {
                const std::uint32_t other = shuffleRandom_.index(static_cast<std::uint32_t>(cursor_ + 1));
                std::swap(output_->mapping[cursor_].random, output_->mapping[other].random);
                --cursor_;
            }
            if (cursor_ == 0) {
                phase_ = 3;
                sourceOrder_.begin(count);
            }
        } else if (phase_ == 3) {
            if (sourceOrder_.advance(output_->source, batch)) {
                phase_ = 4;
                targetOrder_.begin(count);
            }
        } else if (phase_ == 4) {
            if (targetOrder_.advance(output_->target, batch)) {
                phase_ = 5;
                cursor_ = 0;
            }
        } else if (phase_ == 5) {
            const std::size_t end = std::min(count, cursor_ + batch);
            for (; cursor_ < end; ++cursor_) {
                const auto id = sourceOrder_.order()[cursor_];
                output_->mapping[id].spatial = targetOrder_.order()[cursor_];
            }
            if (cursor_ == count)
                finished_ = true;
#else
            // The first three lessons keep identity pairs; no shuffle needs draining.
            finished_ = true;
#endif
        }
        output_->matchingMs += milliseconds(begin);
        return finished_;
    }

    void cancel() {
        cancelled_ = true;
        output_.reset();
    }
    bool finished() const {
        return finished_;
    }
    int phase() const {
        return phase_;
    }
    std::shared_ptr<Prepared> take() {
        if (!finished_ || cancelled_ || !output_)
            throw std::logic_error("Only a complete generation may publish");
        output_->preparationWallMs = milliseconds(start_);
        auto result = std::move(output_);
        cancelled_ = true;
        return result;
    }

    private:
    static double milliseconds(std::chrono::steady_clock::time_point start) {
        return std::chrono::duration<double, std::milli>(std::chrono::steady_clock::now() - start).count();
    }
    std::chrono::steady_clock::time_point start_{std::chrono::steady_clock::now()};
    Mesh sourceMesh_;
    Mesh targetMesh_;
    AreaDistribution sourceArea_;
    AreaDistribution targetArea_;
    Random sourceRandom_;
    Random targetRandom_;
    Random shuffleRandom_;
    SpatialOrder sourceOrder_;
    SpatialOrder targetOrder_;
    std::shared_ptr<Prepared> output_;
    std::size_t cursor_{};
    int phase_{};
    bool finished_{};
    bool cancelled_{};
};

inline Vec3 positionAt(const Prepared &data, std::size_t id, double t, Matching matching, Easing easing, Path path) {
    std::uint32_t target = data.mapping[id].random;
#if LAB_CHECKPOINT >= 4
    if (matching == Matching::spatial)
        target = data.mapping[id].spatial;
#else
    (void)matching;
#endif
    return morphPosition(xyz(data.source[id]), xyz(data.target[target]), xyz(data.path[id]), t, easing, path, static_cast<std::uint32_t>(id));
}

// ACTIVE is replaced only after the viewer has uploaded every candidate buffer.
class PreparationSession {
    public:
    bool request(Settings settings) {
        try {
            validateSettings(settings);
            std::uint32_t activeCount = 0;
            if (active_)
                activeCount = active_->settings.count;
            planMemory(settings.count, activeCount);
            candidate_.reset();
            ready_.reset();
            candidate_ = std::make_unique<Preparation>(settings, ++generation_);
            error_.clear();
            return true;
        } catch (const std::exception &error) {
            cancel();
            error_ = error.what();
            return false;
        }
    }
    void advance() {
        if (!candidate_ || ready_)
            return;
        try {
#if LAB_CHECKPOINT >= 8
            if (candidate_->advance())
                ready_ = candidate_->take();
#else
            while (!candidate_->finished())
                candidate_->advance();
            ready_ = candidate_->take();
#endif
        } catch (const std::exception &error) {
            cancel();
            error_ = error.what();
        }
    }
    void accept() {
        if (!ready_)
            throw std::logic_error("No complete CPU candidate");
        active_ = std::move(ready_);
        candidate_.reset();
    }
    void cancel() {
        candidate_.reset();
        ready_.reset();
    }
    void reject(std::string error) {
        cancel();
        error_ = std::move(error);
    }
    bool busy() const {
        return candidate_ != nullptr;
    }
    int phase() const {
        if (candidate_)
            return candidate_->phase();
        return -1;
    }
    const std::shared_ptr<Prepared> &ready() const {
        return ready_;
    }
    const std::shared_ptr<Prepared> &active() const {
        return active_;
    }
    const std::string &error() const {
        return error_;
    }

    private:
    std::unique_ptr<Preparation> candidate_;
    std::shared_ptr<Prepared> ready_;
    std::shared_ptr<Prepared> active_;
    std::string error_;
    std::uint64_t generation_{};
};

} // namespace morph
