#pragma once

#include "sculpt_grid.hpp"

namespace sculpt {

struct SampleBox {
    std::array<int, 3> low{}, high{};
    bool empty{true};

    void include(int x, int y, int z) {
        const std::array<int, 3> coordinate{x, y, z};
        if (empty) {
            low = coordinate;
            high = coordinate;
            empty = false;
            return;
        }
        for (int axis = 0; axis < 3; ++axis) {
            low[axis] = std::min(low[axis], coordinate[axis]);
            high[axis] = std::max(high[axis], coordinate[axis]);
        }
    }

    void include(const SampleBox& other) {
        if (!other.empty) {
            include(other.low[0], other.low[1], other.low[2]);
            include(other.high[0], other.high[1], other.high[2]);
        }
    }
};

enum class BrushMode {
    add,
    subtract
};

struct Brush {
    Vec3 center;
    float radius{0.28F};
    float strength{0.35F};
    BrushMode mode{BrushMode::add};

    void validate() const {
        if (mode != BrushMode::add && mode != BrushMode::subtract)
            throw std::invalid_argument("Unknown brush mode");
        if (!finite(center) || std::abs(center.x) > 8 || std::abs(center.y) > 8 || std::abs(center.z) > 8)
            throw std::invalid_argument("Brush center is outside the finite working domain");
        if (!std::isfinite(radius) || radius < 0.03F || radius > 0.6F || !std::isfinite(strength) || strength < 0.01F || strength > 0.8F)
            throw std::invalid_argument("Brush radius or strength exceeds its bounded range");
    }
};

enum class BrushParameter {
    radius,
    strength,
    depth
};

inline void adjustBrushParameter(Brush& brush, float& depth, BrushParameter parameter, bool increase, bool coarse) {
    brush.validate();
    if (!std::isfinite(depth) || std::abs(depth) > 1)
        throw std::invalid_argument("Brush depth must stay inside [-1, 1]");
    float step = 0.025F;
    if (coarse)
        step = 0.1F;
    if (parameter == BrushParameter::depth) {
        step = 0.05F;
        if (coarse)
            step = 0.25F;
    }
    if (!increase)
        step = -step;
    if (parameter == BrushParameter::radius)
        brush.radius = std::clamp(brush.radius + step, 0.03F, 0.6F);
    else if (parameter == BrushParameter::strength)
        brush.strength = std::clamp(brush.strength + step, 0.01F, 0.8F);
    else if (parameter == BrushParameter::depth)
        depth = std::clamp(depth + step, -1.0F, 1.0F);
    else
        throw std::invalid_argument("Unknown brush parameter");
}

// snippet:sculpt-brush-falloff
inline float brushFalloff(float normalizedDistance) {
    if (!std::isfinite(normalizedDistance) || normalizedDistance < 0)
        throw std::invalid_argument("Falloff needs a finite nonnegative radius ratio");
    const float remaining = std::max(0.0F, 1.0F - normalizedDistance * normalizedDistance);
    return remaining * remaining;
}

// end-snippet:sculpt-brush-falloff

// snippet:sculpt-brush-edit
#if LAB_CHECKPOINT >= 4
inline SampleBox applyBrush(ScalarGrid& grid, Brush brush) {
    brush.validate();
    if (grid.spec().samples < 3 || grid.spec().samples > 64)
        throw std::invalid_argument("CPU brush is only the 3..64-sample teaching/reference path");
    const auto& spec = grid.spec();
    const Vec3 low = spec.gridFromWorld(brush.center - Vec3{brush.radius, brush.radius, brush.radius});
    const Vec3 high = spec.gridFromWorld(brush.center + Vec3{brush.radius, brush.radius, brush.radius});
    const int x0 = std::clamp(static_cast<int>(std::floor(low.x)), 1, spec.samples - 2);
    const int y0 = std::clamp(static_cast<int>(std::floor(low.y)), 1, spec.samples - 2);
    const int z0 = std::clamp(static_cast<int>(std::floor(low.z)), 1, spec.samples - 2);
    const int x1 = std::clamp(static_cast<int>(std::ceil(high.x)), 1, spec.samples - 2);
    const int y1 = std::clamp(static_cast<int>(std::ceil(high.y)), 1, spec.samples - 2);
    const int z1 = std::clamp(static_cast<int>(std::ceil(high.z)), 1, spec.samples - 2);
    SampleBox changed;
    for (int z = z0; z <= z1; ++z)
        for (int y = y0; y <= y1; ++y)
            for (int x = x0; x <= x1; ++x) {
                const Vec3 point = spec.worldFromGrid({static_cast<float>(x), static_cast<float>(y), static_cast<float>(z)});
                float delta = brush.strength * brushFalloff(length(point - brush.center) / brush.radius);
                if (delta == 0)
                    continue;
                if (brush.mode == BrushMode::add)
                    delta = -delta;
                const float before = grid.at(x, y, z);
                const float after = std::clamp(before + delta, -4.0F, 4.0F);
                if (after != before) {
                    grid.set(x, y, z, after);
                    changed.include(x, y, z);
                }
            }
    return changed;
}
#else
SampleBox applyBrush(ScalarGrid& grid, Brush brush);
#endif

// end-snippet:sculpt-brush-edit

// snippet:sculpt-dirty-chunks
inline std::vector<std::uint32_t> dirtyChunks(const GridSpec& spec, const SampleBox& changed) {
    spec.validate();
    if (changed.empty)
        return {};
    for (int axis = 0; axis < 3; ++axis)
        if (changed.low[axis] < 0 || changed.high[axis] >= spec.samples || changed.low[axis] > changed.high[axis])
            throw std::invalid_argument("Dirty sample bounds must be ordered and inside the grid");
    constexpr int chunkCells = 16;
    const int chunksPerAxis = (spec.samples - 2) / chunkCells + 1;
    std::array<int, 3> first{}, last{};
    // Trilinear geometry depends on adjacent samples; finite differences add one more cell.
    for (int axis = 0; axis < 3; ++axis) {
        first[axis] = std::clamp(changed.low[axis] - 2, 0, spec.samples - 2) / chunkCells;
        last[axis] = std::clamp(changed.high[axis] + 1, 0, spec.samples - 2) / chunkCells;
    }
    std::vector<std::uint32_t> result;
    for (int z = first[2]; z <= last[2]; ++z)
        for (int y = first[1]; y <= last[1]; ++y)
            for (int x = first[0]; x <= last[0]; ++x)
                result.push_back(static_cast<std::uint32_t>((z * chunksPerAxis + y) * chunksPerAxis + x));
    return result;
}

// end-snippet:sculpt-dirty-chunks

// snippet:sculpt-stroke-sampler
class StrokeSampler {
    public:
#if LAB_CHECKPOINT >= 5
    StrokeSampler(Vec3 start, float radius)
        : previous_(start), spacing_(radius * 0.25F) {
        if (!finite(start) || !std::isfinite(radius) || radius < 0.03F || radius > 0.6F)
            throw std::invalid_argument("Stroke needs a finite start and a valid brush radius");
    }

    std::vector<Vec3> advance(Vec3 target) {
        if (!finite(target))
            throw std::invalid_argument("Stroke target must be finite");
        const Vec3 segment = target - previous_;
        const float distance = length(segment);
        if (!std::isfinite(distance) || (distance + carry_) / spacing_ > 256)
            throw std::overflow_error("Stroke segment exceeds its finite stamp budget");
        std::vector<Vec3> stamps;
        if (distance <= 1e-8F) {
            previous_ = target;
            return stamps;
        }
        float along = spacing_ - carry_;
        for (; along <= distance; along += spacing_)
            stamps.push_back(previous_ + segment * (along / distance));
        carry_ = std::clamp(distance - (along - spacing_), 0.0F, spacing_);
        previous_ = target;
        return stamps;
    }
#else
    StrokeSampler(Vec3 start, float radius);
    std::vector<Vec3> advance(Vec3 target);
#endif

    private:
    Vec3 previous_;
    float spacing_{};
    float carry_{};
};

// end-snippet:sculpt-stroke-sampler

} // namespace sculpt
