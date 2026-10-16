#pragma once
#include "editor.hpp"

namespace voxel {
// Oracle quét từng AABB riêng, không dùng tMax/tDelta hoặc thứ tự DDA.
inline void requireCheck(bool condition, const char* message) {
    if (!condition) {
        throw std::runtime_error(message);
    }
}

#if LAB_CHECKPOINT >= 9
inline std::optional<Hit> brutePick(const Chunk& chunk, const Ray& ray, double reach) {
    std::optional<Hit> best;
    for (int y = 0; y < side; ++y) {
        for (int z = 0; z < side; ++z) {
            for (int x = 0; x < side; ++x) {
                if (get(chunk, x, y, z) == Block::Air) {
                    continue;
                }
                const auto interval = clipBox(ray, {static_cast<double>(x), static_cast<double>(y), static_cast<double>(z)}, {static_cast<double>(x + 1), static_cast<double>(y + 1), static_cast<double>(z + 1)}, reach);
                if (interval.has_value() && (!best.has_value() || interval->enter < best->distance)) {
                    best = Hit{{x, y, z}, interval->normal, interval->enter};
                }
            }
        }
    }
    return best;
}

inline void audit() {
    Camera camera;
    for (int preset : {0, 1, 2, 3, 4, 5, 6}) {
        const auto chunk = makeChunk(preset);
        const auto before = chunk;
        for (int x : {80, 160, 240}) {
            for (int y : {60, 120, 180}) {
                const auto ray = cameraRay(camera, x + 0.5, y + 0.5);
                const auto dda = traverse(chunk, ray, 64);
                const auto brute = brutePick(chunk, ray, 64);
                requireCheck(dda.hit.has_value() == brute.has_value(), "DDA/brute hit presence");
                if (brute.has_value()) {
                    requireCheck(dda.hit->cell == brute->cell && std::abs(dda.hit->distance - brute->distance) < 1e-8, "DDA/brute nearest hit");
                }
                requireCheck(dda.visits.size() <= 64, "bounded DDA");
            }
        }
        requireCheck(chunk == before, "queries must not mutate chunk");
    }
}
#endif
} // namespace voxel
