#pragma once
#include "framebuffer.hpp"
#include "scene.hpp"

namespace lab {
struct WorldView {
    double scale{};
    double originX{};
    double originY{};
};

inline WorldView makeWorldView(const Scene& scene) {
#if LAB_CHECKPOINT == 2
    static_cast<void>(scene);
    return {200.0, 240.0, 350.0};
#else
    const double links = double(std::max(2, scene.count) - 1);
    double expectedExtension = 0.0;
    if (scene.gravityEnabled && scene.stiffness > 0.0) {
        expectedExtension = scene.mass * std::abs(scene.gravity.y) * links * (links + 1.0) / (2.0 * scene.stiffness);
    }
    const double height = std::max(3.0, links * scene.restLength + expectedExtension + 1.6);
    return {std::min(110.0, 500.0 / height), 350.0, 130.0};
#endif
}

inline Vec2 worldToScreen(Vec2 point, const WorldView& view) {
    return {view.originX + view.scale * point.x, view.originY - view.scale * point.y};
}

inline Vec2 screenToWorld(Vec2 point, const WorldView& view) {
    return {(point.x - view.originX) / view.scale, (view.originY - point.y) / view.scale};
}

inline Vec2 boundedPointer(Vec2 point, const WorldView& view) {
    point.x = std::clamp(point.x, 40.0, 690.0);
    point.y = std::clamp(point.y, 100.0, 650.0);
    return screenToWorld(point, view);
}

inline void drawNode(Framebuffer& image, Vec2 center, double radius, std::uint32_t color) {
    if (!finiteVec2(center) || !std::isfinite(radius) || center.x < -20.0 || center.x > 1120.0 || center.y < -20.0 || center.y > 840.0) {
        return;
    }
    radius = std::clamp(radius, 2.0, 9.0);
    const int left = static_cast<int>(std::floor(center.x - radius));
    const int top = static_cast<int>(std::floor(center.y - radius));
    const int diameter = static_cast<int>(2.0 * radius) + 2;
    for (int y = top; y <= top + diameter; ++y) {
        for (int x = left; x <= left + diameter; ++x) {
            const double nx = (double(x) - center.x) / radius;
            const double ny = (double(y) - center.y) / radius;
            if (nx * nx + ny * ny > 1.0) {
                continue;
            }
            const double light = std::clamp(0.65 - 0.25 * nx - 0.25 * ny, 0.2, 1.0);
            const auto r = static_cast<std::uint32_t>(double((color >> 24) & 255U) * light);
            const auto g = static_cast<std::uint32_t>(double((color >> 16) & 255U) * light);
            const auto b = static_cast<std::uint32_t>(double((color >> 8) & 255U) * light);
            image.putPixel(x, y, (r << 24) | (g << 16) | (b << 8) | 255U);
        }
    }
}

inline void drawCoil(Framebuffer& image, Vec2 a, Vec2 b, std::uint32_t color) {
    const Vec2 delta = subtract(b, a);
    const double distance = length(delta);
    if (!std::isfinite(distance) || distance <= 1e-12) {
        return;
    }
    const Vec2 normal{-delta.y / distance, delta.x / distance};
    Vec2 previous = a;
    for (int i = 1; i <= 12; ++i) {
        const double t = double(i) / 12.0;
        double offset = 0.0;
        if (i != 12) {
            // Đổi bên sau mỗi đỉnh để vẽ lò xo; không dùng đường này tính lực.
            double direction = 1.0;
            if (i % 2 == 0) {
                direction = -1.0;
            }
            offset = direction * std::min(4.0, distance * 0.12);
        }
        const Vec2 current = add(add(a, scale(delta, t)), scale(normal, offset));
        drawLine(image, previous.x, previous.y, current.x, current.y, color);
        previous = current;
    }
}

inline void drawForceArrow(Framebuffer& image, Vec2 start, Vec2 end) {
    const Vec2 delta = subtract(end, start);
    const double distance = length(delta);
    if (!std::isfinite(distance) || distance <= 1e-9) {
        return;
    }
    if (distance > 80.0) {
        end = add(start, scale(delta, 80.0 / distance));
    }
    drawLine(image, start.x, start.y, end.x, end.y, 0xff7b72ffU);
    const double angle = std::atan2(delta.y, delta.x);
    for (const double sign : {-1.0, 1.0}) {
        drawLine(image, end.x, end.y, end.x - 6.0 * std::cos(angle + sign * 0.4), end.y - 6.0 * std::sin(angle + sign * 0.4), 0xff7b72ffU);
    }
}

inline void drawChain(Framebuffer& image, const Scene& scene, const WorldView& view) {
    for (const auto& spring : scene.chain.springs) {
        const auto& a = scene.chain.particles[spring.first];
        const auto& b = scene.chain.particles[spring.second];
        std::uint32_t color = 0x66738cffU;
#if LAB_CHECKPOINT >= 2
        const double stretch = length(subtract(b.position, a.position)) - spring.restLength;
        if (stretch > 0.002) {
            color = 0xe5c07bffU;
        } else if (stretch < -0.002) {
            color = 0x56b6c2ffU;
        }
#endif
        drawCoil(image, worldToScreen(a.position, view), worldToScreen(b.position, view), color);
    }
    for (std::size_t i = 0; i < scene.chain.particles.size(); ++i) {
        const auto& particle = scene.chain.particles[i];
        const Vec2 center = worldToScreen(particle.position, view);
        if (i == scene.selected) {
            drawNode(image, center, std::max(5.0, particle.radius * view.scale + 3.0), 0xffffffffU);
        }
        std::uint32_t color = 0x53f0aeffU;
        if (i == 0) {
            color = 0xc678ddffU;
        }
        drawNode(image, center, particle.radius * view.scale, color);
#if LAB_CHECKPOINT >= 3
        if (scene.debug) {
            const Vec2 tip = worldToScreen(add(particle.position, scale(particle.force, 0.08)), view);
            drawForceArrow(image, center, tip);
        }
#endif
    }
}
#if LAB_CHECKPOINT >= 8
inline void drawEnergy(Framebuffer& image, const Scene& scene) {
    if (scene.history.empty()) {
        return;
    }
    double low = 0.0;
    double high = 0.0;
    for (const auto& value : scene.history) {
        low = std::min({low, value.total, value.kinetic, value.elastic, value.gravity});
        high = std::max({high, value.total, value.kinetic, value.elastic, value.gravity});
    }
    const double range = std::max(1e-6, high - low);
    const double firstTime = scene.history.front().time;
    const double span = std::max(kStepOptions[scene.dtIndex], scene.history.back().time - firstTime);
    const auto point = [&](double time, double value) {
        return Vec2{735.0 + 325.0 * (time - firstTime) / span, 610.0 - 150.0 * (value - low) / range};
    };
    rectangle(image, 735, 460, 1060, 610, kGrid, false);
    const Vec2 zero = point(firstTime, 0.0);
    drawLine(image, 735.0, zero.y, 1060.0, zero.y, kRail);
    for (std::size_t i = 1; i < scene.history.size(); ++i) {
        const auto& a = scene.history[i - 1];
        const auto& b = scene.history[i];
        const double left[]{a.total, a.kinetic, a.elastic, a.gravity};
        const double right[]{b.total, b.kinetic, b.elastic, b.gravity};
        const std::uint32_t colors[]{0xffffffffU, 0x53f0aeffU, 0xe5c07bffU, 0xc792eaffU};
        for (int component = 0; component < 4; ++component) {
            const Vec2 start = point(a.time, left[component]);
            const Vec2 end = point(b.time, right[component]);
            drawLine(image, start.x, start.y, end.x, end.y, colors[component]);
        }
    }
}
#endif
inline void renderScene(Framebuffer& image, const Scene& scene) {
    image.clear();
    const WorldView view = makeWorldView(scene);
    rectangle(image, 40, 100, 690, 650, kRail, false);
    if (scene.debug) {
        for (int row = 1; row <= 10; ++row) {
            const double y = 100.0 + 50.0 * double(row);
            drawLine(image, 40, y, 690, y, kGrid);
        }
    }
    drawChain(image, scene, view);
    const Vec2 anchor = worldToScreen(scene.chain.anchorPosition, view);
    rectangle(image, int(anchor.x - 20), int(anchor.y - 25), int(anchor.x + 20), int(anchor.y - 10), 0xc678ddffU, true);
    drawLine(image, anchor.x, anchor.y - 10, anchor.x, anchor.y, 0xc678ddffU);
#if LAB_CHECKPOINT == 2
    const auto pair = sampleElasticSpring(scene.chain, scene.chain.springs.front());
    const auto a = scene.chain.particles[0].position;
    const auto b = scene.chain.particles[1].position;
    drawForceArrow(image, worldToScreen(a, view), worldToScreen(add(a, scale(pair.forceOnFirst, 0.08)), view));
    drawForceArrow(image, worldToScreen(b, view), worldToScreen(subtract(b, scale(pair.forceOnFirst, 0.08)), view));
#endif
#if LAB_CHECKPOINT >= 6
    Vec2 previous{};
    for (std::size_t i = 0; i < scene.chain.particles.size(); ++i) {
        const double x = 735.0 + 325.0 * double(i) / double(scene.chain.particles.size() - 1);
        const double y = std::clamp(260.0 - 60.0 * scene.chain.particles[i].position.x, 150.0, 360.0);
        if (i > 0) {
            drawLine(image, previous.x, previous.y, x, y, 0x53f0aeffU);
        }
        previous = {x, y};
    }
    rectangle(image, 735, 150, 1060, 360, kGrid, false);
#endif
#if LAB_CHECKPOINT >= 8
    drawEnergy(image, scene);
#endif
}
} // namespace lab
