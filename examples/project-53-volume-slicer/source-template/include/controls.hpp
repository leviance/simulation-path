#pragma once
#include "layout.hpp"

namespace slices {
// Logical rectangles are shared by drawing and hit testing.
inline Rect presetButton(int index) {
    return {1048.0 + (index % 2) * 180, 146.0 + (index / 2) * 38, 164, 32};
}

inline constexpr Rect resolutionButton{1228, 222, 164, 32};
inline constexpr Rect sceneViewport{16, 116, 672, 630};
inline constexpr Rect cutawayButton{1048, 272, 164, 32};
inline constexpr Rect cameraButton{1228, 272, 164, 32};
inline constexpr Rect samplerButton{1048, 316, 164, 32};
inline constexpr Rect paletteButton{1228, 316, 164, 32};
inline constexpr Rect levelSlider{1048, 378, 344, 22};
inline constexpr Rect widthSlider{1048, 444, 344, 22};
inline constexpr Rect scanButton{1048, 492, 164, 32};
inline constexpr Rect resetButton{1228, 492, 164, 32};
inline constexpr Rect auditButton{1048, 538, 344, 32};
inline constexpr Rect histogramButton{1048, 582, 164, 30};
inline constexpr Rect themeButton{1228, 582, 164, 30};

inline double sliderPosition(Rect rect, double x) {
    return std::clamp((x - rect.x) / rect.width, 0.0, 1.0);
}
} // namespace slices
