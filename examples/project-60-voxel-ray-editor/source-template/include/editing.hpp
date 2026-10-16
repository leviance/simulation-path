#pragma once
#include "traversal.hpp"
#include <string>

namespace voxel {
// Chỉ mutation khi action được gọi; ray query và preview luôn chỉ đọc.
struct EditResult {
    bool changed = false;
    std::string message;
};

#if LAB_CHECKPOINT >= 6
inline EditResult breakBlock(Chunk& chunk, const Ray& ray, double reach) {
    const auto trace = traverse(chunk, ray, reach);
    if (!trace.hit.has_value()) {
        return {false, "No solid block in reach"};
    }
    const auto cell = trace.hit->cell;
    set(chunk, cell[0], cell[1], cell[2], Block::Air);
    return {true, "Removed exactly one block"};
}
#endif

#if LAB_CHECKPOINT >= 7
inline std::optional<Cell> placementCell(const Chunk& chunk, const std::optional<Hit>& hit) {
    if (!hit.has_value()) {
        return std::nullopt;
    }
    const auto source = hit->cell;
    if (!inside(source[0], source[1], source[2]) || get(chunk, source[0], source[1], source[2]) == Block::Air) {
        return std::nullopt;
    }
    const auto normal = hit->normal;
    if (std::abs(normal[0]) + std::abs(normal[1]) + std::abs(normal[2]) != 1) {
        return std::nullopt;
    }
    const Cell target{source[0] + normal[0], source[1] + normal[1], source[2] + normal[2]};
    if (!inside(target[0], target[1], target[2]) || get(chunk, target[0], target[1], target[2]) != Block::Air) {
        return std::nullopt;
    }
    return target;
}

inline EditResult placeBlock(Chunk& chunk, const Ray& ray, double reach, Block material) {
    if (material != Block::Grass && material != Block::Dirt && material != Block::Stone) {
        throw std::invalid_argument("placement material must be opaque ID 1..3");
    }
    const auto trace = traverse(chunk, ray, reach);
    const auto target = placementCell(chunk, trace.hit);
    if (!target.has_value()) {
        return {false, "Cannot place: no valid empty adjacent cell inside chunk"};
    }
    set(chunk, (*target)[0], (*target)[1], (*target)[2], material);
    return {true, "Placed exactly one block"};
}
#endif
} // namespace voxel
