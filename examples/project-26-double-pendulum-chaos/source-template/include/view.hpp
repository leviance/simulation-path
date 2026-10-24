#pragma once
#include "framebuffer.hpp"
#include "scene.hpp"

namespace lab {
inline constexpr std::uint32_t kPrimary = 0x61afefffU;
inline constexpr std::uint32_t kPerturbed = 0xe06c75ffU;
inline constexpr std::uint32_t kReference = 0x98c379ffU;
inline constexpr std::uint32_t kPhysicalGraph = 0xc678ddffU;
inline constexpr std::uint32_t kNumericalGraph = 0xe5c07bffU;

struct WorldView {
    double scale{};
    double pivotX{};
    double pivotY{};
};

inline WorldView makeWorldView(const DoublePendulumParameters& parameters, int lane) {
    double pivotX = 285.0;
    if (lane == 1) {
        pivotX = 815.0;
    }
    return {180.0 / (parameters.length1 + parameters.length2), pivotX, 315.0};
}

inline Vec2 worldToScreen(Vec2 point, const WorldView& view) {
    return {view.pivotX + point.x * view.scale, view.pivotY - point.y * view.scale};
}

inline Vec2 screenToWorld(Vec2 point, const WorldView& view) {
    return {(point.x - view.pivotX) / view.scale, (view.pivotY - point.y) / view.scale};
}

inline void drawBob(Framebuffer& image, Vec2 center, int radius, std::uint32_t color) {
    for (int y = -radius; y <= radius; ++y) {
        for (int x = -radius; x <= radius; ++x) {
            if (x * x + y * y <= radius * radius) {
                image.putPixel(static_cast<int>(std::lround(center.x)) + x, static_cast<int>(std::lround(center.y)) + y, color);
            }
        }
    }
    image.putPixel(static_cast<int>(std::lround(center.x)) - 2, static_cast<int>(std::lround(center.y)) - 2, kExact);
}

#if LAB_CHECKPOINT >= 1
inline void drawPendulum(Framebuffer& image, const DoublePendulumState& state, const DoublePendulumParameters& parameters, const WorldView& view, std::uint32_t color) {
    const auto geometry = pendulumGeometry(state, parameters);
    const Vec2 pivot = worldToScreen(geometry.pivot, view);
    const Vec2 bob1 = worldToScreen(geometry.bob1, view);
    const Vec2 bob2 = worldToScreen(geometry.bob2, view);
    drawLine(image, pivot.x, pivot.y, bob1.x, bob1.y, color);
    drawLine(image, bob1.x, bob1.y, bob2.x, bob2.y, color);
    drawBob(image, bob1, 8, color);
    drawBob(image, bob2, 11, color);
    drawBob(image, pivot, 4, kExact);
}
#endif

#if LAB_CHECKPOINT >= 4
inline void drawTrail(Framebuffer& image, const std::vector<Vec2>& trail, const WorldView& view, std::uint32_t color) {
    for (std::size_t i = 1; i < trail.size(); ++i) {
        const Vec2 first = worldToScreen(trail[i - 1], view);
        const Vec2 second = worldToScreen(trail[i], view);
        drawLine(image, first.x, first.y, second.x, second.y, color);
    }
}
#endif

#if LAB_CHECKPOINT >= 3
inline double graphTimeX(double time, double first, double span, double left) {
    return left + 490.0 * (time - first) / span;
}

inline double energyGraphBound(const Scene& scene) {
    double bound = 1e-12;
    for (const auto& sample : scene.history) {
        bound = std::max(bound, std::abs(sample.energyErrorA));
#if LAB_CHECKPOINT >= 4
        bound = std::max(bound, std::abs(sample.energyErrorB));
#endif
#if LAB_CHECKPOINT >= 6
        if (scene.debug) {
            bound = std::max(bound, std::abs(sample.energyErrorReference));
        }
#endif
    }
    return bound;
}

inline void drawEnergyGraph(Framebuffer& image, const Scene& scene) {
    rectangle(image, 570, 590, 1060, 730, kGrid, false);
    drawLine(image, 570, 660, 1060, 660, kRail);
    if (scene.history.empty()) {
        return;
    }
    const double first = scene.history.front().time;
    const double span = std::max(kStepOptions[scene.dtIndex], scene.history.back().time - first);
    const double bound = energyGraphBound(scene);
    for (std::size_t i = 1; i < scene.history.size(); ++i) {
        const auto& a = scene.history[i - 1];
        const auto& b = scene.history[i];
        const double x0 = graphTimeX(a.time, first, span, 570);
        const double x1 = graphTimeX(b.time, first, span, 570);
        drawLine(image, x0, 660.0 - 70.0 * a.energyErrorA / bound, x1, 660.0 - 70.0 * b.energyErrorA / bound, kPrimary);
#if LAB_CHECKPOINT >= 4
        drawLine(image, x0, 660.0 - 70.0 * a.energyErrorB / bound, x1, 660.0 - 70.0 * b.energyErrorB / bound, kPerturbed);
#endif
#if LAB_CHECKPOINT >= 6
        if (scene.debug) {
            drawLine(image, x0, 660.0 - 70.0 * a.energyErrorReference / bound, x1, 660.0 - 70.0 * b.energyErrorReference / bound, kReference);
        }
#endif
    }
}
#endif

#if LAB_CHECKPOINT >= 5
// Floor/clamp chỉ dành cho trục log hiển thị, không sửa separation thật.
inline double separationGraphY(double value) {
    const double logarithm = std::log10(std::max(1e-12, value));
    const double normalized = std::clamp((logarithm + 12.0) / 14.0, 0.0, 1.0);
    return 730.0 - 140.0 * normalized;
}

inline void drawSeparationGraph(Framebuffer& image, const Scene& scene) {
    rectangle(image, 40, 590, 530, 730, kGrid, false);
    if (scene.history.empty()) {
        return;
    }
    const double first = scene.history.front().time;
    const double span = std::max(kStepOptions[scene.dtIndex], scene.history.back().time - first);
    for (std::size_t i = 1; i < scene.history.size(); ++i) {
        const auto& a = scene.history[i - 1];
        const auto& b = scene.history[i];
        const double x0 = graphTimeX(a.time, first, span, 40);
        const double x1 = graphTimeX(b.time, first, span, 40);
        drawLine(image, x0, separationGraphY(a.physical), x1, separationGraphY(b.physical), kPhysicalGraph);
#if LAB_CHECKPOINT >= 6
        drawLine(image, x0, separationGraphY(a.numerical), x1, separationGraphY(b.numerical), kNumericalGraph);
#endif
    }
}
#endif

inline void drawScene(Framebuffer& image, const Scene& scene) {
    image.clear();
    rectangle(image, 40, 100, 530, 530, kGrid, false);
    rectangle(image, 570, 100, 1060, 530, kGrid, false);
    const WorldView viewA = makeWorldView(scene.parameters, 0);
#if LAB_CHECKPOINT >= 4
    const WorldView viewB = makeWorldView(scene.parameters, 1);
    drawTrail(image, scene.trailA, viewA, 0x284c6fff);
    drawTrail(image, scene.trailB, viewB, 0x66373fff);
    drawPendulum(image, perturbedState(scene), scene.parameters, viewB, kPerturbed);
#endif
#if LAB_CHECKPOINT >= 6
    if (scene.debug) {
        drawPendulum(image, scene.experiment.halfStepReference, scene.parameters, viewA, kReference);
    }
#endif
#if LAB_CHECKPOINT >= 1
    if (scene.debug) {
        drawLine(image, viewA.pivotX, viewA.pivotY, viewA.pivotX, viewA.pivotY + 180, kGrid);
    }
    drawPendulum(image, primaryState(scene), scene.parameters, viewA, kPrimary);
#else
    (void)viewA;
#endif
#if LAB_CHECKPOINT >= 3
    drawEnergyGraph(image, scene);
#endif
#if LAB_CHECKPOINT >= 5
    drawSeparationGraph(image, scene);
#endif
}
} // namespace lab
