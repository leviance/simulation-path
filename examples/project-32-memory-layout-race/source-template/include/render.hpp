#pragma once
#include "render_surface.hpp"
#include "simulation.hpp"

namespace lab {
inline constexpr std::size_t displayBudget = 40'000;
inline std::uint32_t particleColor(const ParticleAoS& particle) {
    const double life = std::clamp(double(particle.age / particle.lifetime), 0.0, 1.0);
    const double young = std::min(1.0, life / 0.4);
    const double old = std::max(0.0, (life - 0.4) / 0.6);
    // Màu ngọc nhạt lúc rời vòi, xanh thép ở màn giọt rơi. Giữ một ít ánh bạc.
    const double glint = std::pow(double(particle.hue), 4.0);
    return rgbColor(207 - 100 * young - 24 * old + 46 * glint, 227 - 59 * young - 26 * old + 27 * glint, 235 - 36 * young - 26 * old + 20 * glint);
}

inline void lightFootprint(Framebuffer& image, const ViewBasis& basis, const ParticleAoS& drop) {
    if (drop.positionY < 0 || drop.positionY > 0.6F) return;
    const auto p = projectVertex({drop.positionX, fountainFloorY, drop.positionZ}, basis, image.width, image.height);
    if (!p.valid || p.x < 0 || p.y < 0 || p.x >= image.width || p.y >= image.height) return;
    const int radius = int(std::clamp(p.scale * 0.09, 2.0, 8.0));
    const double strength = 0.032 * (1.0 - drop.positionY / 0.6);
    // Vệt sáng mờ của giọt ở gần lưới: không sinh thêm hạt, không tính va chạm.
    for (int dy = -radius; dy <= radius; ++dy) {
        for (int dx = -radius; dx <= radius; ++dx) {
            const double falloff = 1.0 - double(dx * dx + 2 * dy * dy) / (radius * radius);
            if (falloff > 0) image.addLight(int(p.x) + dx, int(p.y) + dy, p.depth - 0.12, rgbColor(63, 177, 190), strength * falloff);
        }
    }
}

inline bool drawWaterParticle(Framebuffer& image, const Camera& camera, const ViewBasis& basis, const ParticleAoS& particle, double opacity) {
    if (particle.positionY < fountainFloorY) return false;
    const auto point = projectVertex({particle.positionX, particle.positionY, particle.positionZ}, basis, image.width, image.height);
    if (!point.valid || point.x < 0 || point.y < 0 || point.x >= image.width || point.y >= image.height)
        return false;
    const std::size_t centre = std::size_t(int(point.y)) * image.width + int(point.x);
    if (point.depth > double(image.surfaceDepth[centre]) + 0.001)
        return false;
    const double life = std::clamp(double(particle.age / particle.lifetime), 0.0, 1.0);
    const double radius = std::clamp(point.scale * (0.029 - 0.006 * life), 1.18, 2.6);
    const auto color = particleColor(particle);
    const double depthFade = std::clamp(camera.distance / point.depth, 0.45, 1.2);
    const double alpha = opacity * depthFade;

    // A short velocity glyph, not a fabricated past trajectory or a physics update.
    const double exposure = 1.0 / 48.0;
    const auto tail = projectVertex({particle.positionX - particle.velocityX * exposure, particle.positionY - particle.velocityY * exposure, particle.positionZ - particle.velocityZ * exposure}, basis, image.width, image.height);
    if (tail.valid) {
        const double dx = tail.x - point.x, dy = tail.y - point.y;
        const double length = std::sqrt(dx * dx + dy * dy);
        const int samples = int(std::min(8.0, length));
        for (int sample = 1; sample <= samples; ++sample) {
            const double t = double(sample) / std::max(1.0, length);
            image.layWater(int(point.x + dx * t), int(point.y + dy * t), point.depth, color, alpha * 0.62 * (1.0 - 0.42 * t));
        }
    }
    bool visible = false;
    const int reach = int(std::ceil(radius));
    for (int y = int(point.y) - reach; y <= int(point.y) + reach; ++y) {
        for (int x = int(point.x) - reach; x <= int(point.x) + reach; ++x) {
            const double dx = x + 0.5 - point.x, dy = y + 0.5 - point.y;
            const double coverage = 1 - (dx * dx + dy * dy) / (radius * radius);
            if (coverage > 0) {
                const double squared = coverage * coverage;
                const double softCore = 0.7 * squared + 1.8 * squared * squared * squared * squared;
                visible = image.layWater(x, y, point.depth, color, alpha * softCore) || visible;
            }
        }
    }
    if (visible) image.spray.record(point.x, point.y, float(0.20 * depthFade));
    return visible;
}

struct RenderStats {
    std::size_t sampled{}, rendered{};
};

// [snippet draw-fountain]
inline RenderStats drawFountain(Framebuffer& image, const Simulation& simulation, const Camera& camera, std::size_t drawBudget = displayBudget, bool debug = false) {
    prepareFountainSurface(image, camera, debug);
    image.spray.clear(image.width, image.height);
    // Camera trigonometry is shared by every sampled particle in this frame.
    const ViewBasis basis = viewBasis(camera);
    RenderStats stats{};
    stats.sampled = std::min(simulation.active, drawBudget);
    const double opacity = std::clamp(30.0 / std::sqrt(double(std::max<std::size_t>(1, stats.sampled))), 0.2, 0.8);
    for (std::size_t sample = 0; sample < stats.sampled; ++sample) {
        // Deterministic display sampling, never a reduction of simulation N.
        const std::size_t index = sample * simulation.active / stats.sampled;
        const ParticleAoS particle = simulation.particle(index);
        if (sample % 4 == 0) lightFootprint(image, basis, particle);
        if (drawWaterParticle(image, camera, basis, particle, opacity))
            ++stats.rendered;
    }
    image.spray.develop(image.pixels, image.width, image.height);
    return stats;
}

// [/snippet draw-fountain]

// Khi CPU còn tính trong buffer kế tiếp, ảnh của bước đã xong chưa đổi.
struct FountainFrame {
    RenderStats drawn{};
    std::uint64_t version{}, step{};
    std::array<double, 9> view{};
    bool ready{};

    bool refresh(Framebuffer& image, const Simulation& sim, const Camera& camera, bool reports) {
        const std::array<double, 9> nextView{camera.yaw, camera.pitch, camera.distance, camera.target.x, camera.target.y,
                                             camera.target.z, double(image.width), double(image.height), double(reports)};
        if (ready && version == sim.resetVersion && step == sim.steps && view == nextView) return false;
        drawn = drawFountain(image, sim, camera, displayBudget, reports);
        version = sim.resetVersion;
        step = sim.steps;
        view = nextView;
        ready = true;
        return true;
    }
};
} // namespace lab
