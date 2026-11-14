#pragma once

#ifndef LAB_CHECKPOINT
#define LAB_CHECKPOINT 12
#endif

#include "sculpt_math.hpp"
#include <vector>

namespace sculpt {

struct GridSpec {
    int samples{32};
    Vec3 origin{-1.5F, -1.5F, -1.5F};
    float extent{3.0F};

    void validate() const {
        if (samples < 2 || samples > 192 || !finite(origin) || !std::isfinite(extent) || extent < 0.1F || extent > 16.0F)
            throw std::invalid_argument("Grid needs 2..192 samples per axis and a finite bounded domain");
        if (std::abs(origin.x) > 8 || std::abs(origin.y) > 8 || std::abs(origin.z) > 8)
            throw std::invalid_argument("Grid origin exceeds the finite working domain");
    }

    float spacing() const {
        return extent / static_cast<float>(samples - 1);
    }

    std::size_t sampleCount() const {
        validate();
        const auto side = static_cast<std::size_t>(samples);
        return checkedProduct(checkedProduct(side, side), side);
    }

    std::size_t cellCount() const {
        validate();
        const auto side = static_cast<std::size_t>(samples - 1);
        return checkedProduct(checkedProduct(side, side), side);
    }

    // snippet:sculpt-grid-index
    std::size_t sampleIndex(int x, int y, int z) const {
        if (x < 0 || y < 0 || z < 0 || x >= samples || y >= samples || z >= samples)
            throw std::out_of_range("Sample index is outside the scalar grid");
        return (static_cast<std::size_t>(z) * samples + y) * samples + x;
    }

    // end-snippet:sculpt-grid-index

    // snippet:sculpt-grid-transform
    Vec3 worldFromGrid(Vec3 coordinate) const {
        return origin + coordinate * spacing();
    }

    Vec3 gridFromWorld(Vec3 world) const {
        return (world - origin) / spacing();
    }

    // end-snippet:sculpt-grid-transform
};

enum class Shape {
    sphere,
    separatedSpheres,
    torus
};

inline float initialField(Vec3 point, Shape shape) {
    if (shape == Shape::sphere)
        return length(point) - 0.82F;
    if (shape == Shape::separatedSpheres) {
        const float left = length(point - Vec3{-0.55F, 0, 0}) - 0.42F;
        const float right = length(point - Vec3{0.55F, 0, 0}) - 0.42F;
        return std::min(left, right);
    }
    if (shape == Shape::torus) {
        const float radial = std::sqrt(point.x * point.x + point.z * point.z) - 0.68F;
        return std::sqrt(radial * radial + point.y * point.y) - 0.22F;
    }
    throw std::invalid_argument("Unknown scalar-field preset");
}

class ScalarGrid {
    public:
    explicit ScalarGrid(GridSpec spec)
        : spec_(spec), values_(spec.sampleCount(), 4.0F) {
    }

    const GridSpec& spec() const {
        return spec_;
    }

    const std::vector<float>& values() const {
        return values_;
    }

    float at(int x, int y, int z) const {
        return values_.at(spec_.sampleIndex(x, y, z));
    }

    void set(int x, int y, int z, float value) {
        if (!std::isfinite(value) || std::abs(value) > 32)
            throw std::invalid_argument("Scalar sample must be finite and within the field range");
        values_.at(spec_.sampleIndex(x, y, z)) = value;
    }

    void replaceValues(const std::vector<float>& values) {
        if (values.size() != values_.size())
            throw std::invalid_argument("Snapshot sample count does not match this grid");
        for (float value : values)
            if (!std::isfinite(value) || std::abs(value) > 32)
                throw std::invalid_argument("Snapshot contains invalid scalar samples");
        values_ = values;
    }

    // snippet:sculpt-fill-grid
#if LAB_CHECKPOINT >= 2
    void fill(Shape shape) {
        for (int z = 0; z < spec_.samples; ++z)
            for (int y = 0; y < spec_.samples; ++y)
                for (int x = 0; x < spec_.samples; ++x) {
                    const Vec3 point = spec_.worldFromGrid({static_cast<float>(x), static_cast<float>(y), static_cast<float>(z)});
                    set(x, y, z, initialField(point, shape));
                }
    }
#else
    void fill(Shape shape);
#endif

    // end-snippet:sculpt-fill-grid

    void fillPlane(Vec3 normal, float offset) {
        normal = normalized(normal);
        if (!std::isfinite(offset) || std::abs(offset) > 8)
            throw std::invalid_argument("Plane offset is not finite or is outside the fixture range");
        for (int z = 0; z < spec_.samples; ++z)
            for (int y = 0; y < spec_.samples; ++y)
                for (int x = 0; x < spec_.samples; ++x) {
                    const Vec3 point = spec_.worldFromGrid({static_cast<float>(x), static_cast<float>(y), static_cast<float>(z)});
                    set(x, y, z, dot(point, normal) - offset);
                }
    }

    // snippet:sculpt-trilinear-sample
#if LAB_CHECKPOINT >= 3
    float sample(Vec3 point) const {
        if (!finite(point))
            throw std::invalid_argument("Field probe needs a finite world position");
        Vec3 coordinate = spec_.gridFromWorld(point);
        const float last = static_cast<float>(spec_.samples - 1);
        coordinate.x = std::clamp(coordinate.x, 0.0F, last);
        coordinate.y = std::clamp(coordinate.y, 0.0F, last);
        coordinate.z = std::clamp(coordinate.z, 0.0F, last);
        const int x = std::min(static_cast<int>(std::floor(coordinate.x)), spec_.samples - 2);
        const int y = std::min(static_cast<int>(std::floor(coordinate.y)), spec_.samples - 2);
        const int z = std::min(static_cast<int>(std::floor(coordinate.z)), spec_.samples - 2);
        const float tx = coordinate.x - x, ty = coordinate.y - y, tz = coordinate.z - z;
        const float lowY = interpolate(at(x, y, z), at(x + 1, y, z), tx);
        const float highY = interpolate(at(x, y + 1, z), at(x + 1, y + 1, z), tx);
        const float lowNextY = interpolate(at(x, y, z + 1), at(x + 1, y, z + 1), tx);
        const float highNextY = interpolate(at(x, y + 1, z + 1), at(x + 1, y + 1, z + 1), tx);
        return interpolate(interpolate(lowY, highY, ty), interpolate(lowNextY, highNextY, ty), tz);
    }
#else
    float sample(Vec3 point) const;
#endif

    // end-snippet:sculpt-trilinear-sample

    // snippet:sculpt-grid-gradient
#if LAB_CHECKPOINT >= 3
    Vec3 gradient(Vec3 point) const {
        const float h = spec_.spacing() * 0.5F;
        // At a domain boundary use the actual one-sided separation, not a fictitious 2h.
        const Vec3 maximum = spec_.origin + Vec3{spec_.extent, spec_.extent, spec_.extent};
        const float x0 = std::clamp(point.x - h, spec_.origin.x, maximum.x);
        const float x1 = std::clamp(point.x + h, spec_.origin.x, maximum.x);
        const float y0 = std::clamp(point.y - h, spec_.origin.y, maximum.y);
        const float y1 = std::clamp(point.y + h, spec_.origin.y, maximum.y);
        const float z0 = std::clamp(point.z - h, spec_.origin.z, maximum.z);
        const float z1 = std::clamp(point.z + h, spec_.origin.z, maximum.z);
        if (!finite(point) || x1 <= x0 || y1 <= y0 || z1 <= z0)
            throw std::invalid_argument("Gradient probe must lie in the finite grid domain");
        return {
            (sample({x1, point.y, point.z}) - sample({x0, point.y, point.z})) / (x1 - x0),
            (sample({point.x, y1, point.z}) - sample({point.x, y0, point.z})) / (y1 - y0),
            (sample({point.x, point.y, z1}) - sample({point.x, point.y, z0})) / (z1 - z0)};
    }
#else
    Vec3 gradient(Vec3 point) const;
#endif

    // end-snippet:sculpt-grid-gradient

    private:
    GridSpec spec_;
    std::vector<float> values_;
};

} // namespace sculpt
