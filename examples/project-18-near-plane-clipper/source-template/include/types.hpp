#pragma once
#include <algorithm>
#include <array>
#include <cmath>
#include <cstddef>
#include <cstdint>
#include <limits>
#include <optional>
#include <utility>

#ifndef LAB_CHECKPOINT
#define LAB_CHECKPOINT 8
#endif

namespace lab {
// Kiểu dữ liệu có sẵn trong Starter; màu giữ double đến lúc ghi framebuffer.
struct Vec2 {
    double x{};
    double y{};
};

struct Vec3 {
    double x{};
    double y{};
    double z{};
};

struct Color {
    double red{};
    double green{};
    double blue{};
};

struct ClipVertex {
    Vec3 position{};
    Color color{};
};

struct Triangle3 {
    ClipVertex a{};
    ClipVertex b{};
    ClipVertex c{};
};

struct Plane {
    Vec3 normal{0.0, 0.0, 1.0};
    double offset{-1.0};
};

struct NearPlaneCounts {
    int inside{};
    int outside{};
    int onPlane{};
    bool valid{true};
};

struct ClippedPolygon {
    std::array<ClipVertex, 4> vertices{};
    std::size_t count{};
    bool valid{true};
};

struct TriangleBatch {
    std::array<Triangle3, 2> triangles{};
    std::size_t count{};
    bool valid{true};
};

struct ClipResult {
    NearPlaneCounts inputCounts{};
    ClippedPolygon polygon{};
    TriangleBatch batch{};
};

struct Viewport {
    int left{};
    int top{};
    int width{};
    int height{};
};

struct ScreenVertex {
    Vec2 position{};
    Color color{};
};

struct ScreenTriangle {
    ScreenVertex a{};
    ScreenVertex b{};
    ScreenVertex c{};
};

struct RasterStats {
    std::size_t candidateCount{};
    std::size_t coveredCount{};
};

inline bool isFinite(const ClipVertex& v) {
    return std::isfinite(v.position.x) && std::isfinite(v.position.y) && std::isfinite(v.position.z) && std::isfinite(v.color.red) && std::isfinite(v.color.green) && std::isfinite(v.color.blue);
}

inline ClipVertex vertexAt(const Triangle3& t, int index) {
    if (index == 0) {
        return t.a;
    }
    if (index == 1) {
        return t.b;
    }
    return t.c;
}

inline Triangle3 moveAlongDepth(Triangle3 t, double offset) {
    t.a.position.z += offset;
    t.b.position.z += offset;
    t.c.position.z += offset;
    return t;
}
} // namespace lab
