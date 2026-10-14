#pragma once
#include "geometry.hpp"
#include <vector>

namespace xray {
#if LAB_CHECKPOINT >= 3
// Overlapping boxes represent additive attenuation, not replacement material.
struct Material {
    Point minimum;
    Point maximum;
    double muLow = 0;
    double muHigh = 0;

    bool operator==(const Material&) const = default;
};

using Scene = std::vector<Material>;

inline Scene makeScene([[maybe_unused]] int preset) {
    const Material slab{{-1.2, -1.05, -0.55}, {1.2, 1.05, 0.55}, 0.55, 0.18};
#if LAB_CHECKPOINT >= 4
    if (preset == 1) {
        // Two slabs along z, separated by air. Name fields to expose their meaning.
        Material frontLayer;
        frontLayer.minimum = {-1.2, -1.05, -1.1};
        frontLayer.maximum = {1.2, 1.05, -0.25};
        frontLayer.muLow = 0.35;
        frontLayer.muHigh = 0.12;

        Material backLayer;
        backLayer.minimum = {-1.2, -1.05, 0.25};
        backLayer.maximum = {1.2, 1.05, 1.1};
        backLayer.muLow = 0.9;
        backLayer.muHigh = 0.32;

        // An off-centre insert makes axis or orientation mistakes visible.
        Material smallInsert;
        smallInsert.minimum = {0.25, -0.45, 1.35};
        smallInsert.maximum = {0.7, 0.1, 1.85};
        smallInsert.muLow = 1.8;
        smallInsert.muHigh = 0.65;
        return {frontLayer, backLayer, smallInsert};
    }
    if (preset == 2) {
        Material additionalMedium;
        additionalMedium.minimum = {-0.6, -0.5, -0.8};
        additionalMedium.maximum = {0.6, 0.5, 0.8};
        additionalMedium.muLow = 1.1;
        additionalMedium.muHigh = 0.4;
        return {slab, additionalMedium};
    }
#endif
    return {slab};
}

inline void validateScene(const Scene& scene) {
    if (scene.empty() || scene.size() > 8) {
        throw std::invalid_argument("1..8 boxes required");
    }
    for (const auto& material : scene) {
        for (int a = 0; a < 3; ++a) {
            if (!std::isfinite(material.minimum[a]) || !std::isfinite(material.maximum[a]) || material.minimum[a] >= material.maximum[a]) {
                throw std::invalid_argument("Invalid material bounds");
            }
        }
        if (!std::isfinite(material.muLow) || !std::isfinite(material.muHigh) || material.muLow < 0 || material.muLow > 4 || material.muHigh < 0 || material.muHigh > 4) {
            throw std::invalid_argument("mu must be in [0,4]");
        }
    }
}

inline double materialLength(Beam beam, const Material& material) {
    const auto interval = boxInterval(beam, material.minimum, material.maximum);
    if (!interval) {
        return 0;
    }
    return interval->exit - interval->entry;
}
#if LAB_CHECKPOINT >= 5
inline bool contains(const Material& m, Point p) {
    for (int a = 0; a < 3; ++a) {
        if (p[a] < m.minimum[a] || p[a] > m.maximum[a]) {
            return false;
        }
    }
    return true;
}
#endif
#endif
} // namespace xray
