#pragma once
#include "overlay.hpp"
#include "state.hpp"
#include <iomanip>
#include <sstream>

namespace volume54 {
struct ScreenPoint {
    float x;
    float y;
};

#if LAB_CHECKPOINT >= 7
inline std::optional<ScreenPoint> projectAnnotation(Vec3 point, Camera camera, int width, int height) {
    const Basis basis = cameraBasis(camera);
    const Vec3 relative = point - basis.origin;
    const double depth = dot(relative, basis.forward);
    if (depth <= 0.05)
        return std::nullopt;
    const double tangent = std::tan(50 * 3.141592653589793 / 360);
    const double aspect = static_cast<double>(width) / height;
    return ScreenPoint{static_cast<float>((0.5 + dot(relative, basis.right) / (2 * depth * tangent * aspect)) * width), static_cast<float>((0.5 - dot(relative, basis.up) / (2 * depth * tangent)) * height)};
}
#endif

// A label reads the scalar at a fixed world-space point, never the gamma image color.
inline void drawCloudContext(Overlay& ui, const State& state, int width, int height) {
#if LAB_CHECKPOINT >= 7
    if (state.preset != Preset::Cloud || state.camera.inside || state.camera.distance < 2)
        return;
    struct Landmark {
        Vec3 point;
        const char* label;
        float x;
        float y;
    };
    const std::array<Landmark, 3> landmarks{{
        {{-0.20, 0.25, 0}, "DENSE BILLOW", 36, 208},
        {{-0.85, -0.03, 0.04}, "THIN EDGE", 36, static_cast<float>(height - 314)},
        {{0.32, -0.20, 0.07}, "LOW-DENSITY OPENING", static_cast<float>(width - 280), static_cast<float>(height - 314)}
    }};
    for (const Landmark& item : landmarks) {
        const auto projected = projectAnnotation(item.point, state.camera, width, height);
        if (!projected || projected->x < 0 || projected->x > width || projected->y < 135 || projected->y > height - 220)
            continue;
        const double density = sampleDensity(*state.volume, item.point);
        ui.line(item.x + 14, item.y + 27, projected->x, projected->y, {0.22F, 0.43F, 0.49F}, 1);
        ui.rectangle({projected->x - 2, projected->y - 2, 4, 4}, teal);
        ui.rectangle({item.x - 6, item.y - 5, 225, 40}, {0.025F, 0.055F, 0.073F, 0.85F});
        ui.text(item.x, item.y, item.label, ink, 1.5F);
        std::ostringstream value;
        value << "RAW DENSITY " << std::fixed << std::setprecision(3) << density;
        ui.text(item.x, item.y + 18, value.str(), teal, 1.25F);
    }
    const float y = static_cast<float>(height - 265);
    ui.text(24, y, "SCALAR PALETTE: 0 EMPTY / 1 DENSE", muted, 1.25F);
    for (int i = 0; i < 100; ++i) {
        const Vec3 color = transferColor(i / 99.0, state.settings.palette);
        ui.rectangle({24 + i * 2.6F, y + 17, 2.8F, 7}, {static_cast<float>(std::pow(color.x, 1 / 2.2)), static_cast<float>(std::pow(color.y, 1 / 2.2)), static_cast<float>(std::pow(color.z, 1 / 2.2))});
    }
    if (width >= 900)
        ui.text(306, y + 8, "ALPHA BLENDS SAMPLES; PIXEL COLOR IS NOT A DENSITY MEASUREMENT", muted, 1.1F);
    else
        ui.text(306, y + 8, "ALPHA MIXES MANY SAMPLES", muted, 1.1F);
#else
    (void)ui;
    (void)state;
    (void)width;
    (void)height;
#endif
}
} // namespace volume54
