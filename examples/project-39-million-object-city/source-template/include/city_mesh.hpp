#pragma once

#include "city_types.hpp"

namespace city {

// Counter-clockwise from outside. The cross product therefore points outwards.
inline constexpr std::array<unsigned, 36> kBoxIndices{
    0, 1, 2, 0, 2, 3,
    4, 6, 5, 4, 7, 6,
    0, 5, 1, 0, 4, 5,
    1, 6, 2, 1, 5, 6,
    2, 7, 3, 2, 6, 7,
    3, 4, 0, 3, 7, 4};

inline std::array<Vec3, 8> boxCorners(float taper) {
    return {{{-1, -1, -1}, {1, -1, -1}, {1, -1, 1}, {-1, -1, 1}, {-taper, 1, -taper}, {taper, 1, -taper}, {taper, 1, taper}, {-taper, 1, taper}}};
}

inline constexpr std::array<Vec3, 5> kPyramidCorners{{{-1, -1, -1}, {1, -1, -1}, {1, -1, 1}, {-1, -1, 1}, {0, 1, 0}}};
inline constexpr std::array<unsigned, 18> kPyramidIndices{
    0, 1, 2, 0, 2, 3,
    0, 4, 1, 1, 4, 2,
    2, 4, 3, 3, 4, 0};

} // namespace city
