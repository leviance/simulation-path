#pragma once
#include "framebuffer.hpp"
#include "scene.hpp"

namespace lab {
inline double positionToScreen(double position) {
    return 560.0 + 100.0 * position;
}

inline double screenToPosition(double screenX) {
    return (screenX - 560.0) / 100.0;
}

inline int laneY(std::size_t index) {
    return 140 + 110 * static_cast<int>(index);
}

inline void drawSpring(Framebuffer& image, double massX, double centerY, std::uint32_t color) {
    double previousX = 55.0;
    double previousY = centerY;
    for (int segment = 1; segment <= 12; ++segment) {
        const double x = 55.0 + (massX - 16.0 - 55.0) * static_cast<double>(segment) / 12.0;
        double y = centerY;
        if (segment < 12) {
            if (segment % 2 == 0) {
                y -= 8.0;
            } else {
                y += 8.0;
            }
        }
        drawLine(image, previousX, previousY, x, y, color);
        previousX = x;
        previousY = y;
    }
}

inline void drawLane(Framebuffer& image, std::size_t index, double position, double exactPosition, bool available, bool debug) {
    if (index >= 3 || !std::isfinite(position)) {
        return;
    }
    const int y = laneY(index);
    const auto color = kColors[index];
    drawLine(image, 30, y + 25, 1070, y + 25, kRail);
    rectangle(image, 40, y - 32, 50, y + 25, kRail, true);
    if (debug) {
        drawLine(image, positionToScreen(0.0), y - 32, positionToScreen(0.0), y + 25, kGrid);
    }
    const double screenX = positionToScreen(position);
    const int massX = static_cast<int>(std::lround(std::clamp(screenX, 25.0, 1075.0)));
    drawSpring(image, massX, y, color);
    rectangle(image, massX - 15, y - 15, massX + 15, y + 15, color, available);
    const double exactX = positionToScreen(exactPosition);
    if (std::isfinite(exactX) && exactX >= 20.0 && exactX <= 1080.0) {
        const int ghost = static_cast<int>(std::lround(exactX));
        rectangle(image, ghost - 19, y - 19, ghost + 19, y + 19, kExact, false);
    }
    if (screenX < 25.0 || screenX > 1075.0) {
        // Đây là chỉ báo ngoài khung, không sửa position vật lý.
        drawLine(image, massX - 8, y - 23, massX, y - 31, color);
        drawLine(image, massX, y - 31, massX + 8, y - 23, color);
    }
}

inline bool laneAvailable(std::size_t index) {
#if LAB_CHECKPOINT >= 4
    return index < 3;
#elif LAB_CHECKPOINT >= 3
    return index < 2;
#elif LAB_CHECKPOINT >= 2
    return index == 0;
#else
    (void)index;
    return false;
#endif
}

inline double displayedPosition(const Scene& scene, std::size_t index) {
    if (laneAvailable(index)) {
        return scene.race.lanes[index].state.position;
    }
#if LAB_CHECKPOINT >= 1
    return analyticOscillatorState(scene.initial, scene.parameters, scene.elapsed).position;
#else
    return scene.initial.position;
#endif
}

inline std::optional<double> hitMass(const Scene& scene, double x, double y) {
    if (!std::isfinite(x) || !std::isfinite(y)) {
        return std::nullopt;
    }
    for (std::size_t index = 0; index < 3; ++index) {
        const double center = positionToScreen(displayedPosition(scene, index));
        if (center >= 25.0 && center <= 1075.0 && std::abs(x - center) <= 24.0 && std::abs(y - laneY(index)) <= 24.0) {
            return center;
        }
    }
    return std::nullopt;
}

#if LAB_CHECKPOINT >= 6
struct GraphScale {
    double extent = 1.0;
    double firstTime = 0.0;
    double lastTime = 1.0;
};

inline double graphValue(const HistorySample& sample, Graph graph, std::size_t lane) {
    if (graph == Graph::error) {
        return sample.errors[lane];
    }
    if (graph == Graph::energy) {
        return sample.energies[lane];
    }
    return sample.positions[lane];
}

inline GraphScale graphScale(const Scene& scene) {
    GraphScale scale;
    double largest = 1e-6;
    for (const auto& sample : scene.history) {
        if (scene.graph == Graph::position) {
            largest = std::max(largest, std::abs(sample.exactPosition));
        }
        for (std::size_t index = 0; index < 3; ++index) {
            const double value = graphValue(sample, scene.graph, index);
            if (std::isfinite(value)) {
                largest = std::max(largest, std::abs(value));
            }
        }
    }
    scale.extent = largest * 1.1;
    if (!scene.history.empty()) {
        scale.firstTime = scene.history.front().time;
        scale.lastTime = std::max(scale.firstTime + fixedDelta(scene), scene.history.back().time);
    }
    return scale;
}

inline double graphY(double value, const Scene& scene, const GraphScale& scale) {
    if (scene.graph == Graph::error) {
        return 650.0 - value / scale.extent * 210.0;
    }
    return 545.0 - value / scale.extent * 105.0;
}

inline void drawGraph(Framebuffer& image, const Scene& scene) {
    const auto scale = graphScale(scene);
    if (scene.debug) {
        for (int y = 440; y <= 650; y += 35) {
            drawLine(image, 40, y, 1060, y, kGrid);
        }
    }
    for (std::size_t index = 1; index < scene.history.size(); ++index) {
        const auto& a = scene.history[index - 1];
        const auto& b = scene.history[index];
        const double x0 = 40.0 + 1020.0 * (a.time - scale.firstTime) / (scale.lastTime - scale.firstTime);
        const double x1 = 40.0 + 1020.0 * (b.time - scale.firstTime) / (scale.lastTime - scale.firstTime);
        if (scene.graph == Graph::position) {
            drawLine(image, x0, graphY(a.exactPosition, scene, scale), x1, graphY(b.exactPosition, scene, scale), kExact);
        }
        for (std::size_t lane = 0; lane < 3; ++lane) {
            drawLine(image, x0, graphY(graphValue(a, scene.graph, lane), scene, scale), x1, graphY(graphValue(b, scene.graph, lane), scene, scale), kColors[lane]);
        }
    }
}
#endif

inline void renderScene(Framebuffer& image, const Scene& scene) {
    image.clear();
    double exactPosition = scene.initial.position;
#if LAB_CHECKPOINT >= 1
    exactPosition = analyticOscillatorState(scene.initial, scene.parameters, scene.elapsed).position;
#endif
    for (std::size_t index = 0; index < 3; ++index) {
        drawLane(image, index, displayedPosition(scene, index), exactPosition, laneAvailable(index), scene.debug);
    }
#if LAB_CHECKPOINT >= 6
#if LAB_CHECKPOINT >= 8
    if (!scene.showBenchmark) {
        drawGraph(image, scene);
    }
#else
    drawGraph(image, scene);
#endif
#endif
}
} // namespace lab
