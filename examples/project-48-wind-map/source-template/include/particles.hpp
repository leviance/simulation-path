#pragma once
#include "field.hpp"
#include <cstdint>

namespace wind {
#if LAB_CHECKPOINT >= 7
inline constexpr double dt = 1.0 / 60.0;

inline bool sampleVelocity(const Field& field, Vec2 p, Vec2& result) {
    if (!inside(p)) {
        return false;
    }
    const double gx = (p.x + 2) / field.dx;
    const double gy = (p.y + 1.5) / field.dy;
    const int x = std::min(field.width - 2, static_cast<int>(std::floor(gx)));
    const int y = std::min(field.height - 2, static_cast<int>(std::floor(gy)));
    const double tx = gx - x;
    const double ty = gy - y;
    const auto i = field.index(x, y);
    const auto blend = [&](const std::vector<double>& values) {
        const double bottom = (1 - tx) * values[i] + tx * values[i + 1];
        const double top = (1 - tx) * values[i + field.width] + tx * values[i + field.width + 1];
        return (1 - ty) * bottom + ty * top;
    };
    result = {blend(field.vx), blend(field.vy)};
    return true;
}

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

struct Particle {
    Vec2 position;
    double age = 0;
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
        } else {
            particle.position = next;
        }
    }
}

struct StepPlan {
    int steps = 0;
    double remainder = 0;
    double dropped = 0;
};

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
#endif
} // namespace wind
