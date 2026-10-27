#pragma once
#include "render_surface.hpp"
#include "simulation.hpp"

namespace lab {
inline std::uint32_t particleColor(const ParticleAoS& particle) {
    const double life = std::clamp(double(particle.age / particle.lifetime), 0.0, 1.0);
    const double young = std::min(1.0, life / 0.4);
    const double old = std::max(0.0, (life - 0.4) / 0.6);
    return rgbColor(228 - 167 * young + 5 * particle.hue, 250 - 65 * young - 45 * old, 255 - 25 * old);
}

inline bool drawWaterParticle(Framebuffer& image, const Camera& camera, const ViewBasis& basis, const ParticleAoS& particle, double opacity) {
    const auto point = projectVertex({particle.positionX, particle.positionY, particle.positionZ}, basis, image.width, image.height);
    if (!point.valid || point.x < 0 || point.y < 0 || point.x >= image.width || point.y >= image.height)
        return false;
    const std::size_t centre = std::size_t(int(point.y)) * image.width + int(point.x);
    if (point.depth > double(image.surfaceDepth[centre]) + 0.001)
        return false;
    const double life = std::clamp(double(particle.age / particle.lifetime), 0.0, 1.0);
    const double radius = std::clamp(point.scale * (0.027 - 0.009 * life), 1.1, 2.4);
    const auto color = particleColor(particle);
    const double depthFade = std::clamp(camera.distance / point.depth, 0.45, 1.2);
    const double alpha = opacity * depthFade;

    // A short velocity glyph, not a fabricated past trajectory or a physics update.
    const double exposure = 1.0 / 90.0;
    const auto tail = projectVertex({particle.positionX - particle.velocityX * exposure, particle.positionY - particle.velocityY * exposure, particle.positionZ - particle.velocityZ * exposure}, basis, image.width, image.height);
    if (tail.valid) {
        const double dx = tail.x - point.x, dy = tail.y - point.y;
        const double length = std::sqrt(dx * dx + dy * dy);
        const int samples = int(std::min(8.0, length));
        for (int sample = 1; sample <= samples; ++sample) {
            const double t = double(sample) / std::max(1.0, length);
            image.addLight(int(point.x + dx * t), int(point.y + dy * t), point.depth, color, alpha * 0.18);
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
                visible = image.addLight(x, y, point.depth, color, alpha * softCore) || visible;
            }
        }
    }
    return visible;
}

struct RenderStats {
    std::size_t sampled{}, rendered{};
};

// [snippet:drawFountain]
inline RenderStats drawFountain(Framebuffer& image, const Simulation& simulation, const Camera& camera, std::size_t drawBudget = 40'000, bool debug = false) {
    prepareFountainSurface(image, camera, debug);
    // Camera trigonometry is shared by every sampled particle in this frame.
    const ViewBasis basis = viewBasis(camera);
    RenderStats stats{};
    stats.sampled = std::min(simulation.active, drawBudget);
    const double opacity = std::clamp(30.0 / std::sqrt(double(std::max<std::size_t>(1, stats.sampled))), 0.2, 0.8);
    for (std::size_t sample = 0; sample < stats.sampled; ++sample) {
        // Deterministic display sampling, never a reduction of simulation N.
        const std::size_t index = sample * simulation.active / stats.sampled;
        const ParticleAoS particle = simulation.particle(index);
        if (drawWaterParticle(image, camera, basis, particle, opacity))
            ++stats.rendered;
    }
    return stats;
}

// [/snippet:drawFountain]
} // namespace lab
