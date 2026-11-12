#pragma once
#include "bulb_camera.hpp"
#include "bulb_settings.hpp"
#include <optional>

namespace bulb {

struct Snapshot {
    Settings settings;
    Camera camera;
    std::uint32_t generation{};
};

struct Tile {
    int x{}, y{}, width{}, height{}, sample{};
    bool preview{};
};

struct Counters {
    std::uint64_t samples{}, hits{}, misses{}, budget{}, inside{}, invalid{}, steps{}, iterations{}, fallbacks{};

    void add(const Counters& b) {
        samples += b.samples;
        hits += b.hits;
        misses += b.misses;
        budget += b.budget;
        inside += b.inside;
        invalid += b.invalid;
        steps += b.steps;
        iterations += b.iterations;
        fallbacks += b.fallbacks;
    }
};

// One immutable snapshot per generation. The previous ACTIVE remains honestly labelled until preview publishes.
class RenderPlan {
    public:
    // snippet:bulb-request
    void request(Settings settings, Camera camera) {
        validate(settings);
        validateCamera(camera);
        batchBound(previewSettings(settings), previewWidth * previewHeight, false);
        batchBound(settings, tileWidth * tileHeight, true);
        if (generation_ == UINT32_MAX)
            throw std::runtime_error("Generation ID exhausted; restart viewer");
        requested_ = {settings, camera, ++generation_};
        needsPreview_ = true;
        cancelled_ = false;
    }

    // end-snippet:bulb-request
    std::optional<Tile> next() const {
        if (needsPreview_)
            return Tile{0, 0, previewWidth, previewHeight, 0, true};
#if LAB_CHECKPOINT >= 7
        if (!active_ || cancelled_ || paused_ || complete())
            return std::nullopt;
        const int columns = (imageWidth + tileWidth - 1) / tileWidth;
        const int rows = (imageHeight + tileHeight - 1) / tileHeight;
        const int local = tile_ % (columns * rows);
        const int x = (local % columns) * tileWidth, y = (local / columns) * tileHeight;
        return Tile{x, y, std::min(tileWidth, imageWidth - x), std::min(tileHeight, imageHeight - y), tile_ / (columns * rows), false};
#else
        return std::nullopt;
#endif
    }

    Snapshot snapshotFor(Tile tile) const {
        if (tile.preview)
            return requested_;
        if (!active_)
            throw std::logic_error("Refinement needs ACTIVE");
        return *active_;
    }

    bool accept(const Snapshot& snapshot, Tile tile, const Counters& counters) {
        if (tile.width < 1 || tile.height < 1 || counters.samples != static_cast<std::uint64_t>(tile.width) * tile.height)
            throw std::invalid_argument("Cannot accept a partially written GPU batch");
        if (tile.preview) {
            if (snapshot.generation != requested_.generation || !needsPreview_)
                return false;
            active_ = snapshot;
            previewCounters_ = counters;
            finalCounters_ = {};
            tile_ = 0;
            needsPreview_ = false;
            return true;
        }
        // An already-issued batch may finish while a new preview is requested. Count its real work.
        if (active_ && snapshot.generation == active_->generation) {
            finalCounters_.add(counters);
            ++tile_;
        }
        return false;
    }

    bool complete() const {
#if LAB_CHECKPOINT >= 7
        return active_ && finalCounters_.samples == static_cast<std::uint64_t>(imageWidth) * imageHeight * active_->settings.samples;
#else
        return active_.has_value();
#endif
    }

    void cancel() {
        cancelled_ = true;
        needsPreview_ = false;
    }

    void pause(bool value) {
        paused_ = value;
    }

    bool paused() const {
        return paused_;
    }

    bool cancelled() const {
        return cancelled_;
    }

    bool needsPreview() const {
        return needsPreview_;
    }

    const std::optional<Snapshot>& active() const {
        return active_;
    }

    const Snapshot& requested() const {
        return requested_;
    }

    const Counters& previewCounters() const {
        return previewCounters_;
    }

    const Counters& finalCounters() const {
        return finalCounters_;
    }

    private:
    Snapshot requested_;
    std::optional<Snapshot> active_;
    std::uint32_t generation_{};
    int tile_{};
    bool needsPreview_{}, cancelled_{}, paused_{};
    Counters previewCounters_, finalCounters_;
};

} // namespace bulb
