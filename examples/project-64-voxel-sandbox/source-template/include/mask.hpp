#pragma once
#include "model.hpp"

namespace voxel {
// Mask theo face/plane, Air là ô không có mặt ngoài.
using Mask = std::array<Block, side * side>;

} // namespace voxel
