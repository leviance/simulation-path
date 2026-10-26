#pragma once
#include "simulation.hpp"
#include <array>

namespace lab {
struct Vec3 {
    double x{}, y{}, z{};
};

struct Camera {
    double yaw{0.45}, pitch{-0.18}, distance{13};
    Vec3 target{0, 2.5, 0};
};

struct ScreenPoint {
    int x{}, y{};
    bool visible{};
};

inline ScreenPoint projectPoint(Vec3 point, const Camera& camera, int width, int height) {
    const double x = point.x - camera.target.x;
    const double y = point.y - camera.target.y;
    const double z = point.z - camera.target.z;
    const double rotatedX = std::cos(camera.yaw) * x - std::sin(camera.yaw) * z;
    const double rotatedZ = std::sin(camera.yaw) * x + std::cos(camera.yaw) * z;
    const double rotatedY = std::cos(camera.pitch) * y - std::sin(camera.pitch) * rotatedZ;
    const double depth = std::sin(camera.pitch) * y + std::cos(camera.pitch) * rotatedZ + camera.distance;
    if (!std::isfinite(depth) || depth <= 0.1)
        return {};
    const double scale = double(height) * 0.86602540378 / depth;
    const double screenX = width * 0.5 + rotatedX * scale;
    const double screenY = height * 0.5 - rotatedY * scale;
    if (screenX < 0 || screenY < 0 || screenX >= width || screenY >= height)
        return {};
    return {int(screenX), int(screenY), true};
}

struct Framebuffer {
    int width{1120}, height{570};
    std::vector<std::uint32_t> pixels = std::vector<std::uint32_t>(1120 * 570);

    void putPixel(int x, int y, std::uint32_t color) {
        if (x >= 0 && y >= 0 && x < width && y < height)
            pixels[std::size_t(y) * width + x] = color;
    }
};

inline void drawLine(Framebuffer& image, ScreenPoint first, ScreenPoint second, std::uint32_t color) {
    if (!first.visible || !second.visible)
        return;
    int x = first.x, y = first.y;
    const int dx = std::abs(second.x - x), dy = -std::abs(second.y - y);
    const int sx = x < second.x ? 1 : -1, sy = y < second.y ? 1 : -1;
    int error = dx + dy;
    for (;;) {
        image.putPixel(x, y, color);
        if (x == second.x && y == second.y)
            break;
        const int twice = 2 * error;
        if (twice >= dy) {
            error += dy;
            x += sx;
        }
        if (twice <= dx) {
            error += dx;
            y += sy;
        }
    }
}

inline std::uint32_t particleColor(const ParticleAoS& particle) {
    const float life = std::clamp(particle.age / particle.lifetime, 0.0F, 1.0F);
    const auto red = std::uint32_t(60 + 195 * life);
    const auto green = std::uint32_t(220 - 125 * life);
    const auto blue = std::uint32_t(250 - 180 * life + 5 * particle.hue);
    return red << 24U | green << 16U | blue << 8U | 255U;
}

struct RenderStats {
    std::size_t sampled{}, rendered{};
};

// [snippet:drawFountain]
inline RenderStats drawFountain(Framebuffer& image, const Simulation& simulation, const Camera& camera, std::size_t drawBudget = 40'000) {
    std::fill(image.pixels.begin(), image.pixels.end(), 0x0b1020ffU);
    for (int line = -6; line <= 6; ++line) {
        drawLine(image, projectPoint({double(line), 0, -6}, camera, image.width, image.height), projectPoint({double(line), 0, 6}, camera, image.width, image.height), 0x203249ffU);
        drawLine(image, projectPoint({-6, 0, double(line)}, camera, image.width, image.height), projectPoint({6, 0, double(line)}, camera, image.width, image.height), 0x203249ffU);
    }
    const Vec3 emitter{simulation.config.emitterX, 0, simulation.config.emitterZ};
    drawLine(image, projectPoint(emitter, camera, image.width, image.height), projectPoint({emitter.x, 1, emitter.z}, camera, image.width, image.height), 0x6be6bbffU);
    RenderStats stats{};
    stats.sampled = std::min(simulation.active, drawBudget);
    for (std::size_t sample = 0; sample < stats.sampled; ++sample) {
        // Deterministic display sampling, never a reduction of simulation N.
        const std::size_t index = sample * simulation.active / stats.sampled;
        const ParticleAoS particle = simulation.particle(index);
        const auto point = projectPoint({particle.positionX, particle.positionY, particle.positionZ}, camera, image.width, image.height);
        if (!point.visible)
            continue;
        const std::uint32_t color = particleColor(particle);
        image.putPixel(point.x, point.y, color);
        if (particle.age < particle.lifetime * 0.3F)
            image.putPixel(point.x + 1, point.y, color);
        ++stats.rendered;
    }
    return stats;
}

// [/snippet:drawFountain]
} // namespace lab
