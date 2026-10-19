#pragma once
#include "scene.hpp"
#include <array>

namespace lab {
#if LAB_CHECKPOINT >= 7
// Slider lưu miền giá trị; vị trí nút luôn được suy từ scene, không có state UI trùng lặp.
struct Slider {
    const char* label;
    double minimum;
    double maximum;
    double step;
};

inline constexpr std::array<Slider, 7> kSliders{{
    {"scaleX", -2.0, 2.0, 0.1},
    {"scaleY", -2.0, 2.0, 0.1},
    {"angle (rad)", -kPi, kPi, kPi / 36.0},
    {"shearX", -1.0, 1.0, 0.1},
    {"shearY", -1.0, 1.0, 0.1},
    {"translation X", -2.0, 2.0, 0.1},
    {"translation Y", -2.0, 2.0, 0.1},
}};
inline constexpr double kTrackLeft = 960.0;
inline constexpr double kTrackWidth = 270.0;

inline double sliderY(int index) {
    return 160.0 + 66.0 * index;
}

inline double parameterValue(const Scene& scene, int index) {
    const auto& p = scene.parameters;
    const std::array<double, 7> values{p.scaleX, p.scaleY, p.angle, p.shearX, p.shearY, p.translation.x, p.translation.y};
    return values.at(static_cast<std::size_t>(index));
}

inline void setParameter(Scene& scene, int index, double value) {
    if (index < 0 || index >= 7 || !std::isfinite(value)) {
        return;
    }
    const Slider& slider = kSliders[static_cast<std::size_t>(index)];
    value = std::clamp(value, slider.minimum, slider.maximum);
    auto& p = scene.parameters;
    switch (index) {
    case 0:
        p.scaleX = value;
        break;
    case 1:
        p.scaleY = value;
        break;
    case 2:
        p.angle = value;
        scene.paused = true;
        break;
    case 3:
        p.shearX = value;
        break;
    case 4:
        p.shearY = value;
        break;
    case 5:
        p.translation.x = value;
        break;
    case 6:
        p.translation.y = value;
        break;
    }
}

inline int hitSlider(Vec2 screen) {
    for (int index = 0; index < 7; ++index) {
        if (screen.x >= kTrackLeft - 12.0 && screen.x <= kTrackLeft + kTrackWidth + 12.0 && std::abs(screen.y - sliderY(index)) <= 16.0) {
            return index;
        }
    }
    return -1;
}

inline void updateSlider(Scene& scene, int index, double screenX) {
    const Slider& slider = kSliders.at(static_cast<std::size_t>(index));
    const double fraction = std::clamp((screenX - kTrackLeft) / kTrackWidth, 0.0, 1.0);
    setParameter(scene, index, slider.minimum + fraction * (slider.maximum - slider.minimum));
}

inline void nudgeSlider(Scene& scene, int index, int direction) {
    const Slider& slider = kSliders.at(static_cast<std::size_t>(index));
    setParameter(scene, index, parameterValue(scene, index) + direction * slider.step);
}
#endif

inline bool inViewport(Vec2 screen) {
    return screen.x >= 20.0 && screen.x <= 880.0 && screen.y >= 110.0 && screen.y <= 720.0;
}
} // namespace lab
