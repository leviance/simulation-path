#pragma once
#include "mesh.hpp"

namespace lab {
#if LAB_CHECKPOINT >= 5
// Normalize bằng một uniform scale để vừa khung mà không làm méo model.
struct Bounds3 {
    Vec3 minimum{};
    Vec3 maximum{};
};

inline std::optional<Bounds3> meshBounds(const ObjMesh& mesh) {
    if (mesh.positions.empty()) {
        return std::nullopt;
    }
    Bounds3 bounds{mesh.positions.front(), mesh.positions.front()};
    for (const Vec3 position : mesh.positions) {
        bounds.minimum.x = std::min(bounds.minimum.x, position.x);
        bounds.minimum.y = std::min(bounds.minimum.y, position.y);
        bounds.minimum.z = std::min(bounds.minimum.z, position.z);
        bounds.maximum.x = std::max(bounds.maximum.x, position.x);
        bounds.maximum.y = std::max(bounds.maximum.y, position.y);
        bounds.maximum.z = std::max(bounds.maximum.z, position.z);
    }
    return bounds;
}

inline Vec3 boundsCenter(const Bounds3& bounds) {
    return (bounds.minimum + bounds.maximum) * 0.5;
}

inline double boundsMaxExtent(const Bounds3& bounds) {
    const Vec3 extent = bounds.maximum - bounds.minimum;
    return std::max({extent.x, extent.y, extent.z});
}

inline bool normalizeMesh(ObjMesh& mesh, double targetExtent = 2.0) {
    const std::optional<Bounds3> bounds = meshBounds(mesh);
    if (!bounds) {
        return false;
    }
    const double maxExtent = boundsMaxExtent(*bounds);
    if (!std::isfinite(maxExtent) || maxExtent <= 1e-9 || !std::isfinite(targetExtent) || targetExtent <= 0.0) {
        return false;
    }
    const Vec3 center = boundsCenter(*bounds);
    const double scale = targetExtent / maxExtent;
    for (Vec3& position : mesh.positions) {
        position = (position - center) * scale;
    }
    return true;
}
#endif

} // namespace lab
