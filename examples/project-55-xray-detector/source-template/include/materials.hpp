#pragma once
#include "geometry.hpp"
#include <vector>

namespace xray {
#if LAB_CHECKPOINT >= 3
enum class Part { Fixture, Case, Cover, Aerial, Board, Chip, Cell, Contact, Grille, Display, Key };

// Overlapping boxes represent additive attenuation, not replacement material.
struct Material {
    Point minimum;
    Point maximum;
    double muLow = 0;
    double muHigh = 0;
    Part part = Part::Fixture;

    bool operator==(const Material&) const = default;
};

using Scene = std::vector<Material>;

#if LAB_CHECKPOINT >= 4
// Synthetic coefficients per world unit. These are not measured material data.
inline std::array<double, 2> radioCoefficients(Part part) {
    switch (part) {
        case Part::Case:
        case Part::Cover:   return {0.42, 0.15};
        case Part::Aerial:  return {1.30, 0.48};
        case Part::Board:   return {0.95, 0.34};
        case Part::Chip:    return {1.80, 0.65};
        case Part::Cell:    return {2.10, 0.82};
        case Part::Contact: return {2.80, 1.02};
        case Part::Grille:  return {1.55, 0.54};
        case Part::Display: return {0.95, 0.39};
        case Part::Key:     return {0.72, 0.27};
        default: throw std::invalid_argument("Radio part required");
    }
}

inline Scene makeRadio() {
    Scene radio;
    auto add = [&](Part part, Point minimum, Point maximum) {
        const auto mu = radioCoefficients(part);
        radio.push_back({minimum, maximum, mu[0], mu[1], part});
    };

    // Six thin panels enclose air. A single solid plastic block would overcount the interior.
    add(Part::Case, {-0.64, -0.86, -0.29}, {-0.56, 0.53, 0.26});
    add(Part::Case, {0.56, -0.86, -0.29}, {0.64, 0.53, 0.26});
    add(Part::Case, {-0.56, -0.86, -0.29}, {0.56, -0.78, 0.26});
    add(Part::Case, {-0.56, 0.45, -0.29}, {0.56, 0.53, 0.26});
    add(Part::Cover, {-0.64, -0.86, -0.35}, {0.64, 0.53, -0.29});
    add(Part::Cover, {-0.64, -0.86, 0.26}, {0.64, 0.53, 0.32});
    add(Part::Aerial, {-0.53, 0.53, -0.15}, {-0.30, 0.67, 0.09});
    add(Part::Aerial, {-0.49, 0.67, -0.10}, {-0.35, 1.01, 0.04});
    add(Part::Key, {0.26, 0.53, -0.15}, {0.49, 0.66, 0.08});
    add(Part::Key, {-0.72, 0.02, -0.18}, {-0.64, 0.28, 0.07});

    // Electronics sit at the back; the two prismatic cells are below the board.
    // [snippet board-and-cells]
    add(Part::Board, {-0.49, -0.13, 0.08}, {0.49, 0.40, 0.17});
    add(Part::Chip, {-0.35, 0.09, -0.05}, {-0.12, 0.28, 0.08});
    add(Part::Chip, {0.14, -0.05, -0.03}, {0.31, 0.08, 0.08});
    for (double left : {-0.48, 0.05}) {
        add(Part::Cell, {left, -0.71, -0.19}, {left + 0.43, -0.21, 0.18});
        add(Part::Contact, {left + 0.13, -0.21, -0.10}, {left + 0.29, -0.145, 0.09});
    }

    // [/snippet board-and-cells]
    // Five separate speaker ribs cast five shadows. No painted stripe enters the detector.
    for (int rib = 0; rib < 5; ++rib) {
        const double bottom = -0.105 + 0.102 * rib;
        add(Part::Grille, {-0.49, bottom, -0.435}, {0.025, bottom + 0.057, -0.35});
    }
    add(Part::Display, {0.115, 0.15, -0.405}, {0.49, 0.36, -0.35});
    add(Part::Key, {0.125, -0.05, -0.43}, {0.26, 0.07, -0.35});
    add(Part::Key, {0.35, -0.05, -0.43}, {0.485, 0.07, -0.35});
    return radio;
}
#endif

inline Scene makeScene([[maybe_unused]] int preset) {
    const Material slab{{-1.2, -1.05, -0.55}, {1.2, 1.05, 0.55}, 0.55, 0.18};
#if LAB_CHECKPOINT >= 4
    if (preset == 3)
        return makeRadio();
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
    if (scene.empty() || scene.size() > 32) {
        throw std::invalid_argument("1..32 boxes required");
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

// [snippet path-length]
inline double materialLength(Beam beam, const Material& material) {
    const auto interval = boxInterval(beam, material.minimum, material.maximum);
    if (!interval) {
        return 0;
    }
    return interval->exit - interval->entry;
}
// [/snippet path-length]
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
