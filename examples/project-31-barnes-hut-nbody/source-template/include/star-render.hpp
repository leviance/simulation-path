#pragma once

#include "lab.hpp"
#include "light-field.hpp"

namespace project31 {

struct StarStyle {
    double red{};
    double green{};
    double blue{};
    double radius{};
    double intensity{};
    double haloRadius{};
    double diffuse{};
};

inline StarStyle starStyle(const lab::Body& body, double depth, int height, double coreDistance = -1, double meanMass = 1) {
    const double speed = lab::length(body.velocity);
    const double heat = std::clamp((speed - 0.35) / 0.95, 0.0, 1.0);
    if (coreDistance < 0) {
        coreDistance = lab::length(body.position);
    }
    const double radial = std::clamp((coreDistance - 0.12) / 0.80, 0.0, 1.0);
    const double t = radial * radial * (3.0 - 2.0 * radial);
    const double transition = 4.0 * t * (1.0 - t);
    // Màu biểu diễn khoảng cách tới lõi gần nhất; không suy ra nhiệt độ thiên văn.
    const double red = 1.0 - 0.63 * t + 0.07 * transition;
    const double green = 0.72 - 0.17 * t - 0.07 * transition;
    const double blue = 0.38 + 0.62 * t * (0.70 + 0.30 * t);
    const double rank = std::clamp((body.mass / meanMass - 0.7) / 0.6, 0.0, 1.0);
    const double bright = std::pow(rank, 5.0);
    const double perspective = std::clamp(4.0 / depth, 0.45, 2.8);
    const double radius = std::clamp((0.43 + 0.94 * bright) * perspective * height / 570.0, 0.40, 2.4);
    const double intensity = (0.25 + 0.15 * rank + 3.25 * bright) * (0.84 + 0.55 * heat);
    const double haloRadius = std::clamp(radius * (2.8 + bright), 1.6, 7.4);
    return {red, green, blue, radius, intensity, haloRadius, 0.85 + 0.36 * rank + 0.17 * heat};
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
    const int cell = std::clamp(int(std::lround(height / 112.0)), 3, 8);
    const int columns = (width + cell - 1) / cell + 2 * LightField::margin + 1;
    const int rows = (height + cell - 1) / cell + 2 * LightField::margin + 1;
    const std::size_t coarse = std::size_t(columns * rows);
    // Tái sử dụng vùng nhớ của frame trước: ảnh đầy đủ và ba lưới thô.
    light.resize(pixels.size() + 3 * coarse);
    std::span<StarLight> storage(light);
    auto fine = storage.first(pixels.size());
    auto layers = storage.subspan(pixels.size());
    LightField field{cell, columns, rows, layers.first(coarse), layers.subspan(coarse, coarse), layers.last(coarse)};
    std::fill(fine.begin(), fine.end(), StarLight{});
    std::fill(field.detail.begin(), field.detail.end(), StarLight{});
    lab::OrbitCamera lens = camera;
    lens.aspect = double(width) / double(height);
    std::size_t drawn = 0;
    std::vector<lab::Vec3> cores{};
    double discMass = 0;
    std::size_t stars = 0;
    for (const auto& body : bodies) {
        if (body.mass > 10) {
            cores.push_back(body.position);
        } else {
            discMass += body.mass;
            ++stars;
        }
    }
    double meanMass = 1.0;
    if (stars > 0) {
        meanMass = discMass / double(stars);
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
        const StarStyle style = starStyle(body, p.depth, height, coreDistance, meanMass);
        const double reach = 9.0 * field.cell;
        if (x < -reach || x >= width + reach || y < -reach || y >= height + reach) {
            continue;
        }
        addStarLight(fine, width, height, x, y, style);
        exposeStar(field, x, y, {float(style.red * style.diffuse), float(style.green * style.diffuse), float(style.blue * style.diffuse)});
        ++drawn;
    }
    if (drawn > 0) {
        developField(field, fine, width, height);
    }
    for (std::size_t i = 0; i < pixels.size(); ++i) {
        pixels[i] = (displayLight(light[i].red, 0.00025) << 24U) | (displayLight(light[i].green, 0.0005) << 16U) | (displayLight(light[i].blue, 0.0012) << 8U) | 255U;
    }
    return drawn;
}
} // namespace project31
