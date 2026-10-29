#pragma once

#include "lab.hpp"

namespace project31 {

// Bộ tích lũy sáng tuyến tính. Mỗi sprite ứng với đúng một Body thật;
// không sinh thêm bụi/sao nền và không đọc hay thay đổi bước thời gian.
struct StarLight {
    float red{};
    float green{};
    float blue{};
};

struct StarStyle {
    double red{};
    double green{};
    double blue{};
    double radius{};
    double intensity{};
    double haloRadius{};
};

inline StarStyle starStyle(const lab::Body& body, double depth, int height, double coreDistance = -1) {
    const double speed = lab::length(body.velocity);
    const double heat = std::clamp((speed - 0.35) / 0.95, 0.0, 1.0);
    if (coreDistance < 0) {
        coreDistance = lab::length(body.position);
    }
    const double radial = std::clamp(coreDistance / 0.75, 0.0, 1.0);
    const double warmth = 1.0 - radial * radial * (3.0 - 2.0 * radial);
    // Vàng ở gần lõi -> xanh ở ngoài; đây là bảng màu khoảng cách,
    // không suy ra tuổi/nhiệt độ sao từ mô hình N-body đơn giản này.
    const double red = 0.14 + 0.86 * warmth;
    const double green = 0.38 + 0.35 * warmth;
    const double blue = 1.0 - 0.78 * warmth;
    const double massScale = std::clamp(1.0 + 0.18 * std::log1p(body.mass), 1.0, 1.9);
    const double perspective = std::clamp(2.5 / depth, 0.45, 2.0);
    const double radius = std::clamp(0.55 * massScale * perspective * double(height) / 570.0, 0.4, 1.8);
    const double haloRadius = std::clamp(12.0 * perspective * double(height) / 570.0, 6.0, 24.0);
    return {red, green, blue, radius, 0.35 + 0.35 * heat, haloRadius};
}

inline void addStarLight(
    std::span<StarLight> light, int width, int height,
    double centerX, double centerY, const StarStyle& style
) {
    double haloRadius = style.radius * 6.0;
    if (style.haloRadius > 0) {
        haloRadius = style.haloRadius;
    }
    const int minimumX = std::max(0, int(std::floor(centerX - haloRadius)));
    const int maximumX = std::min(width - 1, int(std::ceil(centerX + haloRadius)));
    const int minimumY = std::max(0, int(std::floor(centerY - haloRadius)));
    const int maximumY = std::min(height - 1, int(std::ceil(centerY + haloRadius)));
    for (int y = minimumY; y <= maximumY; ++y) {
        for (int x = minimumX; x <= maximumX; ++x) {
            const double dx = double(x) + 0.5 - centerX;
            const double dy = double(y) + 0.5 - centerY;
            const double radiusSquared = dx * dx + dy * dy;
            if (radiusSquared > haloRadius * haloRadius) {
                continue;
            }
            // Soft core và halo hữu hạn; không biến một sao thành đĩa màu đặc.
            const double core = std::max(0.0, 1.0 - radiusSquared / (2.25 * style.radius * style.radius));
            const double halo = std::max(0.0, 1.0 - radiusSquared / (haloRadius * haloRadius));
            const double intensity = style.intensity * (core * core + 0.055 * halo * halo * halo);
            StarLight& pixel = light[std::size_t(y) * std::size_t(width) + std::size_t(x)];
            pixel.red += float(style.red * intensity);
            pixel.green += float(style.green * intensity);
            pixel.blue += float(style.blue * intensity);
        }
    }
}

inline std::uint32_t displayLight(float value, double background) {
    // Tone mapping giới hạn độ sáng, giữ được chi tiết khi nhiều sao chồng nhau.
    const double linear = background + double(value);
    return std::uint32_t(std::lround(255.0 * std::sqrt(linear / (1.0 + linear))));
}

inline std::size_t renderStarField(
    std::span<std::uint32_t> pixels, int width, int height,
    std::span<const lab::Body> bodies, const lab::OrbitCamera& camera,
    std::vector<StarLight>& light
) {
    if (width < 1 || height < 1 || width > 4096 || height > 4096 ||
        pixels.size() != std::size_t(width) * std::size_t(height)) {
        throw std::invalid_argument("Invalid galaxy framebuffer");
    }
    light.assign(pixels.size(), {});
    lab::OrbitCamera lens = camera;
    lens.aspect = double(width) / double(height);
    std::size_t drawn = 0;
    std::vector<lab::Vec3> cores{};
    for (const auto& body : bodies) {
        if (body.mass > 10) {
            cores.push_back(body.position);
        }
    }
    if (cores.empty()) {
        cores.push_back({});
    }
    for (const lab::Body& body : bodies) {
        const auto p = lab::projectBodyPoint(body.position, lens);
        if (!p.visible || !std::isfinite(p.x) || !std::isfinite(p.y)) {
            continue;
        }
        const double x = double(width) * 0.5 + p.x * double(width) * 0.5;
        const double y = double(height) * 0.47 - p.y * double(height) * 0.5;
        double coreDistance = std::numeric_limits<double>::infinity();
        for (const auto& center : cores) {
            coreDistance = std::min(coreDistance, lab::length(body.position - center));
        }
        const StarStyle style = starStyle(body, p.depth, height, coreDistance);
        const double reach = style.haloRadius;
        if (x < -reach || x >= width + reach || y < -reach || y >= height + reach) {
            continue;
        }
        addStarLight(light, width, height, x, y, style);
        ++drawn;
    }
    for (std::size_t i = 0; i < pixels.size(); ++i) {
        pixels[i] = (displayLight(light[i].red, 0.00025) << 24U) | (displayLight(light[i].green, 0.0005) << 16U) | (displayLight(light[i].blue, 0.0012) << 8U) | 255U;
    }
    return drawn;
}
} // namespace project31
