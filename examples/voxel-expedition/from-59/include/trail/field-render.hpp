#pragma once
#if LAB_CHECKPOINT >= 5901
#include "sky.hpp"
#include "region.hpp"
#if LAB_CHECKPOINT >= 6102
#include "wind.hpp"
#endif
#if LAB_CHECKPOINT >= 6203
#include "cloud.hpp"
#endif
#if LAB_CHECKPOINT >= 6303
#include "water.hpp"
#endif
#if LAB_CHECKPOINT >= 6402
#include "day.hpp"
#endif

namespace trail {
struct WeatherView {
    double time = 0, hour = 10, windAngle = 0.48, windSpeed = 1;
    std::uint32_t seed = 73;
    bool wire = false, clouds = true;
};

inline void fieldSky(Drawing& draw, const WeatherView& weather) {
#if LAB_CHECKPOINT >= 6203
    double daylight = 1, dusk = 0;
#if LAB_CHECKPOINT >= 6402
    // [snippet shared-sun]
    const Daylight sun = skyAtHour(weather.hour);
    draw.sun = sun.direction;
    daylight = sun.daylight;
    dusk = sun.dusk;
    // [/snippet shared-sun]
#endif
    const Color horizon = blend(blend({27, 42, 66}, {194, 220, 220}, daylight), {255, 173, 113}, dusk * 0.76);
    const Color top = blend({14, 25, 49}, {80, 155, 212}, daylight);
    draw.haze = horizon;
    const Vec3 drift{0.74 * std::cos(weather.windAngle), 0, 0.74 * std::sin(weather.windAngle)};
    Frame& f = draw.frame;
    // Bầu trời ít chi tiết hơn địa hình. Lấy mẫu theo ô ảnh nhỏ để dành ngân sách cho mesh.
    constexpr int step = 4;
    for (int y = 0; y < f.height; y += step) {
        for (int x = 0; x < f.width; x += step) {
            const double u = (x + step * 0.5 - f.width * 0.5) / draw.focal, v = (f.height * 0.5 - y - step * 0.5) / draw.focal;
            const Vec3 ray = normalized(draw.axes.forward + draw.axes.right * u + draw.axes.up * v);
            Color color = blend(horizon, top, smooth(-0.04, 0.83, ray.y));
#if LAB_CHECKPOINT >= 6402
            // [snippet sun-disk]
            const double toSun = dot(ray, draw.sun);
            if (ray.y > -0.04 && toSun > 0.978) {
                color = blend(color, {255, 221, 159}, 0.45 * smooth(0.978, 0.999, toSun));
                color = blend(color, {255, 243, 194}, smooth(0.9987, 0.9994, toSun));
            }
            // [/snippet sun-disk]
#endif
#if LAB_CHECKPOINT >= 6304
            if (ray.y < -0.001 && draw.camera.eye.y > 13.0) {
                const double distance = (13 - draw.camera.eye.y) / ray.y;
                const Vec3 far = draw.camera.eye + ray * distance;
                if (distance > 22 && far.z < -12) {
                    const double haze = smooth(26, 280, distance);
                    const double fade = smooth(22, 38, distance) * (1 - smooth(-58, -12, far.z));
                    color = blend(color, blend({64, 137, 154}, horizon, 0.18 + 0.76 * haze), fade);
                }
            }
#endif
            if (weather.clouds) {
                const double cover = cloudCover(draw.camera.eye, ray, weather.time, drift, weather.seed);
                const Color cloud = blend({63, 71, 91}, {246, 245, 230}, daylight);
                color = blend(color, cloud, 0.87 * cover);
            }
            for (int j = y; j < std::min(y + step, f.height); ++j)
                std::fill_n(f.pixels.begin() + j * f.width + x, std::min(step, f.width - x), color);
        }
    }
#else
    (void)weather;
    drawSky(draw);
#endif
}

inline void depthDot(Drawing& draw, Vec3 world, Color color, double radius, bool line = false) {
    const Vec3 v = cameraSpace(world, draw.camera.eye, draw.axes);
    if (v.z < nearPlane || v.z > 90)
        return;
    const PixelVertex p = draw.project({v, 0, 0});
    const int cx = int(std::round(p.x)), cy = int(std::round(p.y));
    const int r = std::clamp(int(std::round(radius * draw.focal / v.z)), 1, 5);
    int end = r;
    if (line)
        end = 2 * r;
    for (int y = std::max(0, cy - r); y <= std::min(draw.frame.height - 1, cy + end); ++y) {
        for (int x = std::max(0, cx - r); x <= std::min(draw.frame.width - 1, cx + r); ++x) {
            const int i = y * draw.frame.width + x;
            if (p.q >= draw.frame.depth[i] - 0.0001)
                draw.frame.pixels[i] = color;
        }
    }
}

inline void meshEdge(Drawing& draw, Vec3 a, Vec3 b) {
    const Vec3 va = cameraSpace(a, draw.camera.eye, draw.axes), vb = cameraSpace(b, draw.camera.eye, draw.axes);
    if (va.z < nearPlane || vb.z < nearPlane)
        return;
    const auto pa = draw.project({va, 0, 0}), pb = draw.project({vb, 0, 0});
    const int count = std::clamp(int(std::max(std::abs(pb.x - pa.x), std::abs(pb.y - pa.y))), 1, 400);
    for (int j = 0; j <= count; ++j) {
        const double t = double(j) / count;
        const int x = int(std::lerp(pa.x, pb.x, t)), y = int(std::lerp(pa.y, pb.y, t));
        if (x < 0 || x >= draw.frame.width || y < 0 || y >= draw.frame.height)
            continue;
        const int i = y * draw.frame.width + x;
        if (std::lerp(pa.q, pb.q, t) >= draw.frame.depth[i] - 0.00012)
            draw.frame.pixels[i] = {54, 68, 62};
    }
}

inline void terrainFace(Drawing& draw, const Face& f, [[maybe_unused]] const Tile& tile, const WeatherView& weather) {
    // [snippet face-light]
    const Cell ni = neighbors[f.direction];
    const Vec3 normal{double(ni.x), double(ni.y), double(ni.z)};
    if (dot(draw.camera.eye - f.origin, normal) <= -0.55)
        return;
    const Vec3 u = faceU[f.direction] * f.width, v = faceV[f.direction] * f.height;
    std::array<Vec3, 4> points{f.origin, f.origin + u, f.origin + u + v, f.origin + v};
    double brightness = 0.59 + 0.48 * std::max(0.0, dot(normal, draw.sun)) + normal.y * 0.055;
#if LAB_CHECKPOINT >= 6402
    brightness *= 0.48 + 0.52 * smooth(-0.12, 0.30, draw.sun.y);
#endif
    // [/snippet face-light]
    bool painted = false;
#if LAB_CHECKPOINT >= 6102
    if (f.block == Block::Leaves || f.block == Block::Needles) {
        const Vec3 center = f.origin + (u + v) * 0.5;
        const Tree* best = nullptr;
        double closest = 20;
        for (const auto& tree : tile.data.trees) {
            const double dx = center.x - tree.x - 0.5, dz = center.z - tree.z - 0.5, dy = center.y - tree.y - tree.height;
            const double d = dx * dx + dz * dz + 0.22 * dy * dy;
            if (d < closest) {
                closest = d;
                best = &tree;
            }
        }
        if (best) {
            // [snippet crown-tip]
            const Vec3 root{best->x + 0.5, double(best->y), best->z + 0.5};
            for (Vec3& point : points)
                point = sway(point, root, best->height + 1.0, 0.42, weather.time, {weather.windAngle, weather.windSpeed});
            // [/snippet crown-tip]
        }
    }
#endif
#if LAB_CHECKPOINT >= 6303
    if (f.block == Block::Water && f.direction == 2) {
        const Site site = siteAt(int(std::floor(f.origin.x)), int(std::floor(f.origin.z)), weather.seed);
        if (site.ocean) {
#if LAB_CHECKPOINT >= 6304
            // [snippet sea-vertices]
            for (Vec3& point : points)
                point.y += oceanAt(point.x, point.z, weather.time).height;
            const Vec3 n = oceanAt(f.origin.x + 0.5, f.origin.z + 0.5, weather.time).normal;
            const Vec3 half = normalized(draw.sun + normalized(draw.camera.eye - f.origin));
            const Vec3 eye = normalized(draw.camera.eye - f.origin);
            const double crest = oceanAt(f.origin.x + 0.5, f.origin.z + 0.5, weather.time).height;
            brightness = 0.64 + 0.40 * std::max(0.0, dot(n, draw.sun)) + 0.24 * (1 - std::abs(dot(n, eye))) + 0.32 * crest + 0.68 * std::pow(std::max(0.0, dot(n, half)), 18);
#if LAB_CHECKPOINT >= 6402
            brightness *= 0.42 + 0.58 * smooth(-0.12, 0.30, draw.sun.y);
#endif
            // [/snippet sea-vertices]
#endif
        } else {
            // Mặt trên trải theo X/Z. Dòng sông trong cảnh mẫu chảy chủ yếu về -Z.
            // [snippet river-skin]
            std::array<Vertex, 4> skin{};
            for (int i = 0; i < 4; ++i) {
                const Vec3 point = points[i];
                const double across = point.x - riverCenter(point.z, weather.seed);
                const double downstreamUV = point.z + 0.72 * weather.time;
                skin[i] = {cameraSpace(point, draw.camera.eye, draw.axes), across, downstreamUV};
            }
            brightness += 0.09 * std::cos(2 * pi * flowPhase(-f.origin.z, weather.time, 0.72, 4.0));
            draw.finishQuad(skin, f.block, f.direction, brightness);
            painted = true;
            // [/snippet river-skin]
        }
    }
#endif
    if (!painted)
        draw.quad(points, f.width, f.height, f.block, f.direction, brightness);
    // [snippet wire-overlay]
    if (weather.wire) {
        for (int i = 0; i < 4; ++i)
            meshEdge(draw, points[i], points[(i + 1) % 4]);
        meshEdge(draw, points[0], points[2]);
    }
    // [/snippet wire-overlay]
}

#if LAB_CHECKPOINT >= 6103
inline void drawTuft(Drawing& draw, Vec3 root, const WeatherView& w) {
    if (dot(root - draw.camera.eye, root - draw.camera.eye) > 30 * 30)
        return;
    for (int n = 0; n < 3; ++n) {
        const double offset = (n - 1) * 0.12;
        // [snippet grass-tip]
        const Vec3 base = root + Vec3{offset, 0, 0.03 * n};
        const Vec3 tip = base + Vec3{offset, 0.38 + 0.09 * n, 0.04};
        const Vec3 bent = sway(tip, base, 0.55, 0.35, w.time, {w.windAngle, w.windSpeed});
        draw.quad({base + Vec3{-0.055, 0, -0.03}, base + Vec3{0.055, 0, 0.03}, bent + Vec3{0.012, 0, 0}, bent - Vec3{0.012, 0, 0}}, 0.2, 0.5, Block::Leaves, 2, 0.56 + 0.55 * smooth(-0.12, 0.3, draw.sun.y));
        // [/snippet grass-tip]
    }
}
#endif

inline void drawRegion(Drawing& draw, const Region& region, const WeatherView& w) {
    for (const auto& entry : region.tiles) {
        const Tile& tile = entry.second;
        const Vec3 center{tile.data.cx * side + 8.0, tile.data.height() * 0.5, tile.data.cz * side + 8.0};
        const Vec3 camera = cameraSpace(center, draw.camera.eye, draw.axes);
        const double radius = std::sqrt(128.0 + tile.data.height() * tile.data.height() * 0.25);
        if (camera.z + radius < nearPlane || camera.z - radius > 95 || std::abs(camera.x) > std::max(0.0, camera.z) * draw.frame.width / (2 * draw.focal) + 2 * radius)
            continue;
        for (const Face& face : tile.mesh)
            terrainFace(draw, face, tile, w);
#if LAB_CHECKPOINT >= 6103
        // [snippet draw-grass]
        for (Vec3 root : tile.grass)
            drawTuft(draw, root, w);
        // [/snippet draw-grass]
#endif
    }
}
} // namespace trail
#endif
