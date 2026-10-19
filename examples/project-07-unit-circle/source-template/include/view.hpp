#pragma once
#include "framebuffer.hpp"
#include "scene.hpp"

namespace lab {
inline void lineBetween(Framebuffer& image, Vec2 a, Vec2 b, std::uint32_t color) {
    drawLine(image, static_cast<int>(std::lround(a.x)), static_cast<int>(std::lround(a.y)), static_cast<int>(std::lround(b.x)), static_cast<int>(std::lround(b.y)), color);
}

inline void drawBoard(Framebuffer& image) {
    image.clear(kBackground);
    drawLine(image, 55, 390, 495, 390, kGuide);
    drawLine(image, 275, 170, 275, 610, kGuide);
    drawCircle(image, 275, 390, 185, kGuide);
    for (int sign : {-1, 1}) {
        drawLine(image, 275 + sign * 185, 385, 275 + sign * 185, 395, kWhite);
        drawLine(image, 270, 390 + sign * 185, 280, 390 + sign * 185, kWhite);
    }
}

#if LAB_CHECKPOINT >= 1
inline void drawAngleArc(Framebuffer& image, double angle) {
    Vec2 previous{kCenter.x + 55.0, kCenter.y};
    const int steps = static_cast<int>(std::ceil(angle * 24.0));
    for (int index = 1; index <= steps; ++index) {
        const double phase = angle * static_cast<double>(index) / static_cast<double>(steps);
        const Vec2 next{kCenter.x + 55.0 * std::cos(phase), kCenter.y - 55.0 * std::sin(phase)};
        lineBetween(image, previous, next, kArc);
        previous = next;
    }
}
#endif

#if LAB_CHECKPOINT >= 4
inline void drawProjections(Framebuffer& image, Vec2 direction) {
    const Vec2 endpoint = worldToScreen(direction);
    const Vec2 cosinePoint = worldToScreen(projectOntoXAxis(direction));
    const Vec2 sinePoint = worldToScreen(projectOntoYAxis(direction));
    lineBetween(image, endpoint, cosinePoint, kGrid);
    lineBetween(image, endpoint, sinePoint, kGrid);
    lineBetween(image, kCenter, cosinePoint, kCosine);
    lineBetween(image, kCenter, sinePoint, kSine);
    disc(image, static_cast<int>(std::lround(cosinePoint.x)), 390, 4, kCosine);
    disc(image, 275, static_cast<int>(std::lround(sinePoint.y)), 4, kSine);
}
#endif

#if LAB_CHECKPOINT >= 5
inline Vec2 wavePoint(const WaveSample& sample, bool sine, double newestTime) {
    const double x = mapSampleTimeToX(sample.time, newestTime, 570.0, 1050.0);
    double value = sample.cosine;
    if (sine) {
        value = sample.sine;
    }
    return {x, 400.0 - value * 130.0};
}

inline void drawWaveGraph(Framebuffer& image, const Scene& scene) {
    for (int offset : {-130, 0, 130}) {
        drawLine(image, 570, 400 + offset, 1050, 400 + offset, kGrid);
    }
    drawLine(image, 570, 240, 570, 560, kGuide);
    drawLine(image, 1050, 240, 1050, 560, kNeedle);
    const double oldestTime = scene.elapsedTime - kVisibleHistorySeconds;
    for (std::size_t index = 1; index < scene.samples.size(); ++index) {
        const WaveSample& previous = scene.samples[index - 1];
        const WaveSample& current = scene.samples[index];
        // Bỏ đoạn cắt mép trái thay vì ép mẫu cũ lên trục.
        if (previous.time < oldestTime - 1e-10) {
            continue;
        }
        lineBetween(image, wavePoint(previous, true, scene.elapsedTime), wavePoint(current, true, scene.elapsedTime), kSine);
        lineBetween(image, wavePoint(previous, false, scene.elapsedTime), wavePoint(current, false, scene.elapsedTime), kCosine);
    }
}
#endif

inline void renderScene(Framebuffer& image, const Scene& scene) {
    drawBoard(image);
#if LAB_CHECKPOINT >= 1
    drawAngleArc(image, scene.angle);
#endif
#if LAB_CHECKPOINT >= 2
    const Vec2 direction = unitDirection(scene.angle);
#if LAB_CHECKPOINT >= 4
    drawProjections(image, direction);
#endif
    const Vec2 endpoint = worldToScreen(direction);
    lineBetween(image, kCenter, endpoint, kNeedle);
    disc(image, static_cast<int>(std::lround(endpoint.x)), static_cast<int>(std::lround(endpoint.y)), 7, kNeedle);
#endif
#if LAB_CHECKPOINT >= 5
    drawWaveGraph(image, scene);
#endif
#if LAB_CHECKPOINT == 0
    (void)scene;
#endif
}
} // namespace lab
