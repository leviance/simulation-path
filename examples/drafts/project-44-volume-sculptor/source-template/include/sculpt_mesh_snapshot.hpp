#pragma once

#include "sculpt_math.hpp"
#include <cstring>
#include <span>
#include <vector>

namespace sculpt {

// Validation payloads only: no GL buffers or runtime extraction are owned here.
using MeshSnapshot = std::vector<std::vector<SurfaceVertex>>;

inline bool sameSurfaceBytes(std::span<const SurfaceVertex> first, std::span<const SurfaceVertex> second) {
    if (first.size() != second.size())
        return false;
    if (first.empty())
        return true;
    return std::memcmp(first.data(), second.data(), checkedProduct(first.size(), sizeof(SurfaceVertex))) == 0;
}

} // namespace sculpt
