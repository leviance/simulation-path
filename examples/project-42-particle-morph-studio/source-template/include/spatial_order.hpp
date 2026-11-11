#pragma once

#include "morph_math.hpp"
#include <vector>

namespace morph {

constexpr std::uint32_t spatialCellCount = 32768;

inline std::uint32_t spread5(std::uint32_t value) {
    std::uint32_t result = 0;
    for (std::uint32_t bit = 0; bit < 5; ++bit)
        result |= ((value >> bit) & 1U) << (3U * bit);
    return result;
}

inline std::uint32_t quantizeAxis(double value) {
    const double normalized = std::clamp((value + 3.5) / 7.0, 0.0, 1.0);
    return static_cast<std::uint32_t>(std::min(31.0, std::floor(normalized * 32.0)));
}

inline std::uint32_t spatialKey(Vec3 point) {
    if (!finite(point))
        throw std::invalid_argument("Spatial key requires a finite point");
    return spread5(quantizeAxis(point.x)) | (spread5(quantizeAxis(point.y)) << 1U) | (spread5(quantizeAxis(point.z)) << 2U);
}

// Stable counting sort on a fixed 32^3 Morton grid. Inside a cell, ascending ID breaks ties.
class SpatialOrder {
    public:
    void begin(std::size_t count) {
        counts_.assign(spatialCellCount, 0);
        offsets_.assign(spatialCellCount, 0);
        order_.resize(count);
        cursor_ = 0;
        phase_ = 0;
        total_ = 0;
    }
    bool advance(const std::vector<Vec4> &points, std::size_t batch = 32768) {
        batch = std::clamp<std::size_t>(batch, 1, 32768);
        if (phase_ == 0) {
            const std::size_t end = std::min(points.size(), cursor_ + batch);
            for (; cursor_ < end; ++cursor_)
                ++counts_[spatialKey(xyz(points[cursor_]))];
            if (cursor_ == points.size()) {
                phase_ = 1;
                cursor_ = 0;
            }
        } else if (phase_ == 1) {
            const std::size_t end = std::min<std::size_t>(spatialCellCount, cursor_ + batch);
            for (; cursor_ < end; ++cursor_) {
                offsets_[cursor_] = total_;
                total_ += counts_[cursor_];
            }
            if (cursor_ == spatialCellCount) {
                phase_ = 2;
                cursor_ = 0;
            }
        } else if (phase_ == 2) {
            const std::size_t end = std::min(points.size(), cursor_ + batch);
            for (; cursor_ < end; ++cursor_) {
                const auto key = spatialKey(xyz(points[cursor_]));
                order_[offsets_[key]++] = static_cast<std::uint32_t>(cursor_);
            }
            if (cursor_ == points.size())
                phase_ = 3;
        }
        return phase_ == 3;
    }
    const std::vector<std::uint32_t> &order() const {
        return order_;
    }

    private:
    std::vector<std::uint32_t> counts_;
    std::vector<std::uint32_t> offsets_;
    std::vector<std::uint32_t> order_;
    std::size_t cursor_{};
    std::uint32_t total_{};
    int phase_{};
};

} // namespace morph
