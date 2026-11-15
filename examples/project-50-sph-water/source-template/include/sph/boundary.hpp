#pragma once
#include "model.hpp"

namespace water {
#if LAB_CHECKPOINT >= 2
// [snippet boundary]
inline void collide(State& state, Particle& p) {
    const double radius = spacing / 2;
    if (p.x < radius) {
        p.x = radius;
        if (p.vx < 0) {
            p.vx *= -0.05;
        }
        ++state.contacts;
    }
    if (p.x > width - radius) {
        p.x = width - radius;
        if (p.vx > 0) {
            p.vx *= -0.05;
        }
        ++state.contacts;
    }
    if (p.y < radius) {
        p.y = radius;
        if (p.vy < 0) {
            p.vy *= -0.05;
        }
        ++state.contacts;
    }
    if (p.y > height - radius) {
        p.y = height - radius;
        if (p.vy > 0) {
            p.vy *= -0.05;
        }
        ++state.contacts;
    }
#if LAB_CHECKPOINT >= 11
    if (state.paddle.enabled) {
        double dx = p.x - state.paddle.x;
        double dy = p.y - state.paddle.y;
        double distance = std::hypot(dx, dy);
        const double minimum = state.paddle.radius + radius;
        if (distance < minimum) {
            if (distance < 1e-12) {
                dx = 0;
                dy = 1;
                distance = 1;
            }
            const double nx = dx / distance;
            const double ny = dy / distance;
            p.x = state.paddle.x + minimum * nx;
            p.y = state.paddle.y + minimum * ny;
            const double normal = (p.vx - state.paddle.vx) * nx + (p.vy - state.paddle.vy) * ny;
            if (normal < 0) {
                p.vx -= 1.05 * normal * nx;
                p.vy -= 1.05 * normal * ny;
            }
            ++state.contacts;
        }
    }
#endif
}

// [/snippet boundary]
// [snippet integrate]
inline void integrate(State& state, double dt) {
    for (auto& p : state.particles) {
        p.vx += p.ax * dt;
        p.vy += p.ay * dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        collide(state, p);
    }
    state.time += dt;
    state.dt = dt;
    ++state.tick;
    state.updated = state.particles.size();
}

// [/snippet integrate]
#endif
#if LAB_CHECKPOINT >= 11
// [snippet paddle]
inline void movePaddle(State& state, double dt) {
    auto& paddle = state.paddle;
    if (!paddle.enabled) {
        return;
    }
    const double dx = paddle.targetX - paddle.x;
    const double dy = paddle.targetY - paddle.y;
    const double distance = std::hypot(dx, dy);
    double fraction = 0;
    if (distance > 1e-12) {
        fraction = std::min(1.0, 3.0 * dt / distance);
    }
    paddle.vx = dx * fraction / dt;
    paddle.vy = dy * fraction / dt;
    paddle.x += dx * fraction;
    paddle.y += dy * fraction;
}

inline void targetPaddle(State& state, double x, double y) {
    if (!std::isfinite(x) || !std::isfinite(y)) {
        throw std::invalid_argument("Invalid paddle target");
    }
    const double margin = state.paddle.radius + 2 * spacing;
    state.paddle.targetX = std::clamp(x, margin, width - margin);
    state.paddle.targetY = std::clamp(y, margin, height - margin);
}

// [/snippet paddle]
#endif
} // namespace water
