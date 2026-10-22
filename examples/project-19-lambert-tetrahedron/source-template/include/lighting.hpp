#pragma once
#include "geometry.hpp"

namespace lab {
struct Material {
    Color baseColor{100, 180, 240};
    double ambient{0.16};
    double diffuseStrength{0.84};
};

struct DirectionalLight {
    Vec3 surfaceToLight{0, 0, -1};
};

struct LightingSample {
    double dotValue{};
    double diffuse{};
    double intensity{1.0};
    Color shadedColor{};
};
#if LAB_CHECKPOINT >= 3
inline DirectionalLight makeDirectionalLight(Vec3 surfaceToLight) {
    // Đây là hướng TỚI đèn, không phải hướng truyền của tia sáng.
    return {normalize(surfaceToLight)};
}

inline DirectionalLight orbitLight(double azimuth, double elevation) {
    const double radius = std::cos(elevation);
    return makeDirectionalLight({radius * std::sin(azimuth), std::sin(elevation), -radius * std::cos(azimuth)});
}
#endif
#if LAB_CHECKPOINT >= 4
inline double lambertDiffuse(Vec3 unitNormal, Vec3 unitSurfaceToLight) {
    const double cosine = dot(unitNormal, unitSurfaceToLight);
    return std::clamp(cosine, 0.0, 1.0);
}
#endif
inline Color multiplyColor(Color color, double intensity) {
    return {std::clamp(color.red * intensity, 0.0, 255.0), std::clamp(color.green * intensity, 0.0, 255.0), std::clamp(color.blue * intensity, 0.0, 255.0)};
}
#if LAB_CHECKPOINT >= 5
inline LightingSample shadeMaterial(Vec3 unitNormal, const DirectionalLight& light, const Material& material) {
    LightingSample sample;
    sample.dotValue = dot(unitNormal, light.surfaceToLight);
    sample.diffuse = lambertDiffuse(unitNormal, light.surfaceToLight);
    sample.intensity = std::clamp(material.ambient + material.diffuseStrength * sample.diffuse, 0.0, 1.0);
    sample.shadedColor = multiplyColor(material.baseColor, sample.intensity);
    return sample;
}
#endif
// Dùng chung material để nhìn rõ ánh sáng; palette chỉ là thí nghiệm A/B.
inline Color baseColorFor(std::size_t side, bool palette) {
    if (!palette) {
        return {100, 180, 240};
    }
    const std::array<Color, 6> colors = {{{239, 90, 102}, {92, 140, 246}, {169, 112, 232}, {74, 214, 166}, {246, 184, 72}, {55, 190, 220}}};
    return colors[side % colors.size()];
}

inline LightingSample sampleFace(Vec3 normal, const DirectionalLight& light, const Material& material, bool enabled) {
    LightingSample sample;
    sample.shadedColor = material.baseColor;
#if LAB_CHECKPOINT >= 4
    sample.dotValue = dot(normal, light.surfaceToLight);
    sample.diffuse = lambertDiffuse(normal, light.surfaceToLight);
    sample.intensity = sample.diffuse;
    sample.shadedColor = multiplyColor({220, 220, 220}, sample.intensity);
#endif
#if LAB_CHECKPOINT >= 5
    sample = shadeMaterial(normal, light, material);
#endif
    if (!enabled) {
        sample.shadedColor = material.baseColor;
    }
    (void)normal;
    (void)light;
    return sample;
}
} // namespace lab
