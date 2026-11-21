#pragma once
#include "lab.hpp"

#if LAB_CHECKPOINT >= 5
#include "framebuffer.hpp"
#include "scene.hpp"
#include <array>

namespace lab {
// Cùng một seed tạo đúng cùng một bầu trời ở C++ và Canvas.
inline double nextStarSample(int& seed) {
    seed = (73 * seed + 19) % 9973;
    return static_cast<double>(seed) / 9973.0;
}

// [snippet star-catalog]
inline std::array<Vec3, 96> makeStarCatalog() {
    std::array<Vec3, 96> stars{};
    stars[0] = {1.0, 0.6, 4.0};  // Sao vàng để kiểm bằng tay.
    stars[1] = {0.0, 0.0, 10.0}; // Sao trên trục nhìn.
    int seed = 1066;
    for (int i = 2; i < static_cast<int>(stars.size()); ++i) {
        const double depth = 2.8 + 13.0 * nextStarSample(seed);
        const double x = (2.0 * nextStarSample(seed) - 1.0) * 0.92 * depth;
        const double y = (2.0 * nextStarSample(seed) - 1.0) * 0.52 * depth;
        const double bandStart = 6.0 * ((i - 2) % 3);
        stars[i] = {x, y, bandStart + depth};
    }
    return stars;
}
// [/snippet star-catalog]

inline const std::array<Vec3, 96>& starCatalog() {
    static const auto stars = makeStarCatalog();
    return stars;
}

namespace starInk {
constexpr std::uint32_t sky = 0x0a1020ffu;

// Dấu sao chỉ là một chấm có rìa mềm. Màu gắn với ID, không đổi mỗi khung hình.
inline std::uint32_t color(std::size_t id) {
    constexpr std::array<std::uint32_t, 4> tones{0xdae9ffffu, 0xafceffffu, 0xf4f6ffffu, 0xd7d9ffffu};
    if (id == 0) return 0xffca80ffu;
    return tones[id % tones.size()];
}

inline int clippedEdge(double edge, int limit) {
    return static_cast<int>(std::ceil(std::clamp(edge, 0.0, static_cast<double>(limit)) - 0.5));
}

inline void clearSky(Framebuffer& image, const Viewport& view) {
    const int left = clippedEdge(view.x, image.width);
    const int right = clippedEdge(view.x + view.width, image.width);
    const int bottom = clippedEdge(view.y + view.height, image.height);
    for (int y = clippedEdge(view.y, image.height); y < bottom; ++y) {
        auto row = image.pixels.begin() + y * image.width;
        std::fill(row + left, row + right, sky);
    }
}

// Quầng sáng chỉ trang trí chấm đã chiếu. Không cộng thêm bất kỳ vận tốc nào vào pixel.
inline double opacityAt(double t) {
    if (t < 0.20) return 1.0;
    if (t < 0.36) return 1.0 - 0.50 * (t - 0.20) / 0.16;
    if (t < 0.62) return 0.50 - 0.42 * (t - 0.36) / 0.26;
    return 0.08 * (1.0 - t) / 0.38;
}

inline std::uint32_t blend(std::uint32_t below, std::uint32_t tint, double alpha) {
    std::uint32_t result = 255u;
    for (int shift : {8, 16, 24}) {
        const int a = static_cast<int>((below >> shift) & 255u);
        const int b = static_cast<int>((tint >> shift) & 255u);
        const auto channel = static_cast<std::uint32_t>(std::lround(a + (b - a) * alpha));
        result |= channel << shift;
    }
    return result;
}

inline void stamp(Framebuffer& image, const Viewport& view, Vec2 center, double radius, std::uint32_t tint) {
    const double extent = radius * 2.7;
    const int left = clippedEdge(std::max(view.x, center.x - extent), image.width);
    const int right = clippedEdge(std::min(view.x + view.width, center.x + extent), image.width);
    const int top = clippedEdge(std::max(view.y, center.y - extent), image.height);
    const int bottom = clippedEdge(std::min(view.y + view.height, center.y + extent), image.height);
    for (int y = top; y < bottom; ++y) {
        for (int x = left; x < right; ++x) {
            const double t = std::hypot(x + 0.5 - center.x, y + 0.5 - center.y) / extent;
            if (t >= 1.0) continue;
            const auto below = image.pixels[y * image.width + x];
            image.putPixel(x, y, blend(below, tint, opacityAt(t)));
        }
    }
}
} // namespace starInk

// [snippet paint-starfield]
inline void drawStarfield(Framebuffer& image, const Scene& scene, const Viewport& viewport) {
    if (!validLens(scene.lens, viewport)) return;
    starInk::clearSky(image, viewport);
    const double focalPixels = 0.5 * viewport.height * verticalFocalScale(scene.lens);
    const auto& stars = starCatalog();
    for (std::size_t i = 0; i < stars.size(); ++i) {
        const auto hit = projectPerspective(stars[i], scene.camera, scene.lens, viewport);
        if (hit.status != ProjectionStatus::Visible || !hit.screen) continue;
        const double worldRadius = 0.025 + 0.006 * (i % 5);
        const double radius = std::clamp(focalPixels * worldRadius / hit.cameraPoint.z, 1.0, 5.0);
        starInk::stamp(image, viewport, *hit.screen, radius, starInk::color(i));
    }
}
// [/snippet paint-starfield]
} // namespace lab
#endif
