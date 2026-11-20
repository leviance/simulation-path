#pragma once
#include "blocks.hpp"
#include "camera.hpp"
#include <limits>

namespace trail {
#if LAB_CHECKPOINT >= 6001
struct Sample {
    bool known;
    Block block;
};
struct Hit {
    Cell cell, normal;
    Block material = Block::Air;
    double distance = 0;
    int visited = 0;
    bool found = false, unknown = false;
};

// [snippet eye-ray]
inline Vec3 eyeRay(const Camera& camera, double screenX, double screenY, int width, int height) {
    const Basis axes = basis(camera);
    const double focal = focalLength(height, camera.verticalFov);
    const double u = (screenX - width * 0.5) / focal;
    const double v = (height * 0.5 - screenY) / focal;
    return normalized(axes.forward + axes.right * u + axes.up * v);
}
// [/snippet eye-ray]
#endif

#if LAB_CHECKPOINT >= 6002
struct Interval {
    double enter = 0, leave = 0;
    bool crosses = false;
};

// Chỉ dò đoạn nằm trong hộp. Hộp ngoài không biến lỗ chưa nạp thành Air.
inline Interval clipVolume(Vec3 eye, Vec3 dir, Vec3 low, Vec3 high, double reach) {
    Interval cut{0, reach, true};
    const double start[]{eye.x, eye.y, eye.z}, direction[]{dir.x, dir.y, dir.z};
    const double lo[]{low.x, low.y, low.z}, hi[]{high.x, high.y, high.z};
    for (int a = 0; a < 3; ++a) {
        if (direction[a] == 0) {
            if (start[a] < lo[a] || start[a] >= hi[a])
                return {};
            continue;
        }
        const double t0 = (lo[a] - start[a]) / direction[a], t1 = (hi[a] - start[a]) / direction[a];
        cut.enter = std::max(cut.enter, std::min(t0, t1));
        cut.leave = std::min(cut.leave, std::max(t0, t1));
        if (cut.enter >= cut.leave)
            return {};
    }
    return cut;
}

struct RayAxis {
    int cell, step;
    double next, spacing;
};

// [snippet ray-axis]
inline RayAxis startAxis(double position, double direction) {
    int cell = static_cast<int>(std::floor(position));
    const double infinity = std::numeric_limits<double>::infinity();
    if (direction == 0)
        return {cell, 0, infinity, infinity};
    int step = 1;
    if (direction < 0) {
        step = -1;
        if (position == cell)
            --cell;
    }
    double boundary = cell;
    if (step > 0)
        boundary += 1;
    return {cell, step, (boundary - position) / direction, 1 / std::abs(direction)};
}
// [/snippet ray-axis]
// [snippet full-probe]
template <class ReadWorld>
Hit probe(Vec3 eye, Vec3 direction, double reach, ReadWorld read) {
    Hit hit{};
    const auto inDomain = [](Vec3 v) { return std::isfinite(v.x) && std::isfinite(v.y) && std::isfinite(v.z) && std::max({std::abs(v.x), std::abs(v.y), std::abs(v.z)}) < 1000000000.0; };
    if (!inDomain(eye) || !inDomain(direction))
        return hit;
    const Vec3 d = normalized(direction);
    if (!std::isfinite(reach) || reach <= 0 || reach > 128 || dot(d, d) < 0.9)
        return hit;
    auto x = startAxis(eye.x, d.x), y = startAxis(eye.y, d.y), z = startAxis(eye.z, d.z);
    if (eye.x == std::floor(eye.x) && x.step)
        hit.normal.x = -x.step;
    else if (eye.y == std::floor(eye.y) && y.step)
        hit.normal.y = -y.step;
    else if (eye.z == std::floor(eye.z) && z.step)
        hit.normal.z = -z.step;
    while (hit.distance < reach && hit.visited < 390) {
        hit.cell = {x.cell, y.cell, z.cell};
        ++hit.visited;
        // [snippet read-only-hit]
        const Sample sample = read(hit.cell);
        if (!sample.known) {
            hit.unknown = true;
            return hit;
        }
        if (sample.block != Block::Air) {
            hit.material = sample.block;
            hit.found = true;
            return hit;
        }
        // [/snippet read-only-hit]
        // [snippet dda-cross]
        const double at = std::min({x.next, y.next, z.next});
        if (at >= reach)
            break;
        const double eps = 1e-10 * std::max(1.0, at);
        hit.normal = {};
        if (x.next <= at + eps) {
            x.cell += x.step;
            x.next += x.spacing;
            hit.normal.x = -x.step;
        }
        if (y.next <= at + eps) {
            y.cell += y.step;
            y.next += y.spacing;
            if (!hit.normal.x)
                hit.normal.y = -y.step;
        }
        if (z.next <= at + eps) {
            z.cell += z.step;
            z.next += z.spacing;
            if (!hit.normal.x && !hit.normal.y)
                hit.normal.z = -z.step;
        }
        hit.distance = at;
        // [/snippet dda-cross]
    }
    return hit;
}
// [/snippet full-probe]
#endif
} // namespace trail
