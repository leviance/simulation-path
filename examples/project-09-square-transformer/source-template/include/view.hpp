#pragma once
#include "controls.hpp"
#include "framebuffer.hpp"

namespace lab {
inline void worldLine(Framebuffer& image, Vec2 a, Vec2 b, std::uint32_t color) {
    a = worldToScreen(a);
    b = worldToScreen(b);
    drawLine(image, static_cast<int>(std::lround(a.x)), static_cast<int>(std::lround(a.y)), static_cast<int>(std::lround(b.x)), static_cast<int>(std::lround(b.y)), color);
}

inline void drawSquare(Framebuffer& image, const Square& square, std::uint32_t color) {
    for (std::size_t index = 0; index < square.size(); ++index) {
        worldLine(image, square[index], square[(index + 1) % square.size()], color);
        const Vec2 screen = worldToScreen(square[index]);
        disc(image, static_cast<int>(std::lround(screen.x)), static_cast<int>(std::lround(screen.y)), 4, color);
    }
}

inline void arrow(Framebuffer& image, Vec2 from, Vec2 to, std::uint32_t color) {
    worldLine(image, from, to, color);
    const double dx = to.x - from.x;
    const double dy = to.y - from.y;
    const double length = std::hypot(dx, dy);
    if (length > 1e-12) {
        const Vec2 back{to.x - 0.2 * dx / length, to.y - 0.2 * dy / length};
        const Vec2 side{-0.1 * dy / length, 0.1 * dx / length};
        worldLine(image, to, add(back, side), color);
        worldLine(image, to, {back.x - side.x, back.y - side.y}, color);
    }
    const Vec2 screen = worldToScreen(to);
    disc(image, static_cast<int>(std::lround(screen.x)), static_cast<int>(std::lround(screen.y)), 5, color);
}

inline void fillRectangle(Framebuffer& image, int left, int top, int right, int bottom, std::uint32_t color) {
    for (int y = top; y <= bottom; ++y) {
        for (int x = left; x <= right; ++x) {
            image.putPixel(x, y, color);
        }
    }
}

inline void renderScene(Framebuffer& image, const Scene& scene, int selectedSlider) {
    image.clear(kBackground);
    for (int index = -8; index <= 8; ++index) {
        const double value = static_cast<double>(index);
        worldLine(image, {value, -6.0}, {value, 6.0}, kGrid);
    }
    for (int index = -6; index <= 6; ++index) {
        const double value = static_cast<double>(index);
        worldLine(image, {-8.0, value}, {8.0, value}, kGrid);
    }
    worldLine(image, {-8.0, 0.0}, {8.0, 0.0}, kGhost);
    worldLine(image, {0.0, -6.0}, {0.0, 6.0}, kGhost);
#if LAB_CHECKPOINT >= 6
    // Cả lưới local đi qua cùng ma trận, không chỉ hai trục.
    for (int index = -2; index <= 2; ++index) {
        const double value = static_cast<double>(index);
        worldLine(image, worldPoint({value, -2.0}, scene), worldPoint({value, 2.0}, scene), 0x335E59FFu);
        worldLine(image, worldPoint({-2.0, value}, scene), worldPoint({2.0, value}, scene), 0x335E59FFu);
    }
#endif
#if LAB_CHECKPOINT >= 1
    drawSquare(image, makeSquare(1.0), kGhost);
    drawSquare(image, transformedSquare(scene), kShape);
    const Vec2 origin = worldPoint({}, scene);
    arrow(image, origin, worldPoint({1.0, 0.0}, scene), kAxisX);
    arrow(image, origin, worldPoint({0.0, 1.0}, scene), kAxisY);
    const Vec2 screenOrigin = worldToScreen(origin);
    disc(image, static_cast<int>(std::lround(screenOrigin.x)), static_cast<int>(std::lround(screenOrigin.y)), 5, kMarker);
#endif
    // Che vùng ngoài viewport để geometry không đè lên panel/HUD.
    fillRectangle(image, 0, 0, 1279, 109, kBackground);
    fillRectangle(image, 0, 721, 1279, 799, kBackground);
    fillRectangle(image, 0, 110, 19, 720, kBackground);
    fillRectangle(image, 881, 110, 1279, 720, kBackground);
#if LAB_CHECKPOINT >= 7
    for (int index = 0; index < 7; ++index) {
        const Slider& slider = kSliders[static_cast<std::size_t>(index)];
        const double fraction = (parameterValue(scene, index) - slider.minimum) / (slider.maximum - slider.minimum);
        const int y = static_cast<int>(sliderY(index));
        std::uint32_t color = kGhost;
        if (index == selectedSlider) {
            color = kMarker;
        }
        drawLine(image, 960, y, 1230, y, color);
        disc(image, static_cast<int>(std::lround(960.0 + 270.0 * fraction)), y, 7, color);
    }
#else
    (void)selectedSlider;
#endif
#if LAB_CHECKPOINT == 0
    (void)scene;
#endif
}
} // namespace lab
