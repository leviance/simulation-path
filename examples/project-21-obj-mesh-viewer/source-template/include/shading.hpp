#pragma once
#include "geometry.hpp"

namespace lab {
#if LAB_CHECKPOINT >= 6
// Ánh sáng mặt phẳng dùng normal tự tính, không lấy vn từ file.
struct Color {
    std::uint8_t red{};
    std::uint8_t green{};
    std::uint8_t blue{};
    std::uint8_t alpha{255};
};

inline std::optional<Vec3> faceNormal(Vec3 a, Vec3 b, Vec3 c) {
    return normalized(cross(b - a, c - a));
}

inline bool isFrontFacing(Vec3 normal, Vec3 a, Vec3 b, Vec3 c) {
    const Vec3 centroid = (a + b + c) * (1.0 / 3.0);
    return dot(normal, centroid) < 0.0;
}

inline double lambertIntensity(Vec3 normal, Vec3 directionToLight, double ambient = 0.18) {
    const std::optional<Vec3> light = normalized(directionToLight);
    if (!light) {
        return std::clamp(ambient, 0.0, 1.0);
    }
    const double diffuse = std::max(0.0, dot(normal, *light));
    return std::clamp(ambient + (1.0 - ambient) * diffuse, 0.0, 1.0);
}

inline Color shadeColor(Color base, double intensity) {
    const double safe = std::clamp(intensity, 0.0, 1.0);
    return {
        std::uint8_t(std::lround(double(base.red) * safe)),
        std::uint8_t(std::lround(double(base.green) * safe)),
        std::uint8_t(std::lround(double(base.blue) * safe)),
        base.alpha,
    };
}

inline std::uint32_t packColor(Color color) {
    return (std::uint32_t(color.red) << 24U) | (std::uint32_t(color.green) << 16U) |
        (std::uint32_t(color.blue) << 8U) | std::uint32_t(color.alpha);
}

#endif

} // namespace lab
