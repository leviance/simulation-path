#pragma once
#include <algorithm>
#include <cmath>
#include <cstddef>
#include <stdexcept>
#include <string>
#include <vector>

#ifndef LAB_CHECKPOINT
#define LAB_CHECKPOINT 12
#endif

namespace water {
// Đơn vị của mô hình 2D: m, s, kg; density kg/m², pressure N/m.
inline constexpr double width = 12.6;
inline constexpr double height = 7.56;
inline constexpr double spacing = 0.07;
inline constexpr double h = 1.3 * spacing;
inline constexpr double support = 2 * h;
inline constexpr double restDensity = 1000;
inline constexpr double mass = restDensity * spacing * spacing;
inline constexpr std::size_t capacity = 12000;
inline constexpr double maxDt = 0.001;

struct Vec2 {
    double x = 0;
    double y = 0;
};

// [snippet particle]
struct Particle {
    double x = 0;
    double y = 0;
    double vx = 0;
    double vy = 0;
    double density = restDensity;
    double pressure = 0;
    double ax = 0;
    double ay = 0;
};

// [/snippet particle]
enum class Preset {
    Dam,
    Pool,
    Obstacle,
    Empty
};

struct Settings {
    double soundSpeed = 20;
    double alpha = 0.3;
    double gravity = 9.81;
    bool useGrid = true;
};

struct Paddle {
    bool enabled = false;
    double x = 6.3;
    double y = 2.2;
    double targetX = x;
    double targetY = y;
    double vx = 0;
    double vy = 0;
    double radius = 0.63;
};

struct State {
    std::vector<Particle> particles;
    std::vector<Particle> walls;
    Paddle paddle;
    double time = 0;
    double dt = 0;
    std::size_t tick = 0;
    std::size_t updated = 0;
    std::size_t emitted = 0;
    std::size_t rejected = 0;
    std::size_t contacts = 0;
    std::size_t candidates = 0;
};

inline void validate(const Settings& settings) {
    if (!std::isfinite(settings.soundSpeed) || settings.soundSpeed < 12 || settings.soundSpeed > 40 || !std::isfinite(settings.alpha) || settings.alpha < 0 || settings.alpha > 1 || !std::isfinite(settings.gravity) || settings.gravity < 0 || settings.gravity > 12) {
        throw std::invalid_argument("Parameters outside c=[12,40], alpha=[0,1], g=[0,12]");
    }
}

inline void requireFinite(const State& state) {
    if (state.particles.size() > capacity || !std::isfinite(state.time) || !std::isfinite(state.paddle.x) || !std::isfinite(state.paddle.y)) {
        throw std::invalid_argument("Invalid SPH state size/time/paddle");
    }
    for (const auto& p : state.particles) {
        if (!std::isfinite(p.x) || !std::isfinite(p.y) || !std::isfinite(p.vx) || !std::isfinite(p.vy) || !std::isfinite(p.density) || p.density <= 0 || !std::isfinite(p.pressure) || !std::isfinite(p.ax) || !std::isfinite(p.ay)) {
            throw std::invalid_argument("Nonfinite particle: pause and reset, do not clamp velocity");
        }
    }
}
} // namespace water
