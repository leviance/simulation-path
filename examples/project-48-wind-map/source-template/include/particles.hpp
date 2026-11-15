#pragma once
#include "field.hpp"
#include <array>
#include <cstdint>

namespace wind {
#if LAB_CHECKPOINT >= 7
inline constexpr double dt = 1.0 / 60.0;

// [snippet bilinear]
// [snippet bilinear-component]
inline double bilinear(double bottomLeft, double bottomRight, double topLeft, double topRight, double tx, double ty) {
    const double bottom = (1 - tx) * bottomLeft + tx * bottomRight;
    const double top = (1 - tx) * topLeft + tx * topRight;
    return (1 - ty) * bottom + ty * top;
}

// [/snippet bilinear-component]

inline bool sampleVelocity(const Field& field, Vec2 p, Vec2& result) {
    if (!inside(p)) {
        return false;
    }
    // [snippet bilinear-cell]
    const double gx = (p.x + 2) / field.dx;
    const double gy = (p.y + 1.5) / field.dy;
    const int x = std::min(field.width - 2, static_cast<int>(std::floor(gx)));
    const int y = std::min(field.height - 2, static_cast<int>(std::floor(gy)));
    const double tx = gx - x;
    const double ty = gy - y;
    // [/snippet bilinear-cell]
    const auto i = field.index(x, y);
    result.x = bilinear(field.vx[i], field.vx[i + 1], field.vx[i + field.width], field.vx[i + field.width + 1], tx, ty);
    result.y = bilinear(field.vy[i], field.vy[i + 1], field.vy[i + field.width], field.vy[i + field.width + 1], tx, ty);
    return std::isfinite(result.x) && std::isfinite(result.y);
}

// [/snippet bilinear]

// [snippet midpoint]
inline bool midpointStep(const Field& field, Vec2 p, double step, Vec2& result) {
    if (!std::isfinite(step) || step <= 0 || step > 0.05) {
        return false;
    }
    Vec2 first;
    if (!sampleVelocity(field, p, first)) {
        return false;
    }
    const Vec2 middle{p.x + 0.5 * step * first.x, p.y + 0.5 * step * first.y};
    Vec2 second;
    if (!sampleVelocity(field, middle, second)) {
        return false;
    }
    result = {p.x + step * second.x, p.y + step * second.y};
    return inside(result);
}

// [/snippet midpoint]

struct Particle {
    Vec2 position;
    double age = 0;
    // Ring buffer: chỉ giữ 24 vị trí, không nối đường qua lần gieo lại.
    std::array<Vec2, 24> trail{};
    int trailHead = 0;
    int trailSize = 0;
};

inline Vec2 seedParticle(int index) {
    return {-1.8 + 3.6 * ((index * 37 % 131) / 130.0), -1.3 + 2.6 * ((index * 53 % 131) / 130.0)};
}

inline std::vector<Particle> makeParticles() {
    std::vector<Particle> particles;
    for (int i = 0; i < 128; ++i) {
        particles.push_back({seedParticle(i), 0});
    }
    return particles;
}

// [snippet advance-tracers]
inline void advanceParticles(const Field& field, std::vector<Particle>& particles) {
    for (std::size_t i = 0; i < particles.size(); ++i) {
        auto& particle = particles[i];
        Vec2 next;
        const bool accepted = midpointStep(field, particle.position, dt, next);
        particle.age += dt;
        // Hạt chỉ đánh dấu đường đi. Ra khỏi miền hoặc quá 8s thì gieo lại.
        if (!accepted || particle.age >= 8) {
            particle.position = seedParticle(static_cast<int>(i));
            particle.age = 0;
            particle.trailHead = 0;
            particle.trailSize = 0;
        } else {
            particle.trail[particle.trailHead] = particle.position;
            particle.trailHead = (particle.trailHead + 1) % 24;
            particle.trailSize = std::min(24, particle.trailSize + 1);
            particle.position = next;
        }
    }
}

// [/snippet advance-tracers]

struct StepPlan {
    int steps = 0;
    double remainder = 0;
    double dropped = 0;
};

// [snippet clock]
inline StepPlan planSteps(double accumulator, double elapsed) {
    if (!std::isfinite(accumulator) || accumulator < 0 || accumulator >= dt) {
        accumulator = 0;
    }
    if (!std::isfinite(elapsed) || elapsed < 0) {
        elapsed = 0;
    }
    const double accepted = std::min(elapsed, 0.25);
    const double total = accumulator + accepted;
    const double due = std::floor((total + 1e-10) / dt);
    StepPlan plan;
    plan.steps = static_cast<int>(std::min(8.0, due));
    plan.remainder = std::max(0.0, total - due * dt);
    plan.dropped = elapsed - accepted + (due - plan.steps) * dt;
    return plan;
}

// [/snippet clock]
#endif
} // namespace wind
