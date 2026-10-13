#pragma once
#include <algorithm>
#include <cmath>
#include <stdexcept>
#include <vector>

#ifndef LAB_CHECKPOINT
#define LAB_CHECKPOINT 10
#endif

namespace water {
// World uses metres with y up. Density is areal (kg/m^2), not volumetric.
struct Vec2 {
    double x = 0;
    double y = 0;
};

inline Vec2 subtract(Vec2 a, Vec2 b) {
    return {a.x - b.x, a.y - b.y};
}

inline double dot(Vec2 a, Vec2 b) {
    return a.x * b.x + a.y * b.y;
}

inline double length(Vec2 a) {
    return std::hypot(a.x, a.y);
}

constexpr double spacing = 0.045;
constexpr double h = 1.3 * spacing;
constexpr double support = 2 * h;
constexpr double restDensity = 1000;
constexpr double mass = restDensity * spacing * spacing;
constexpr std::size_t capacity = 384;
constexpr double maxDt = 0.001;

struct Particle {
    Vec2 position;
    Vec2 velocity;
    double density = restDensity;
    double pressure = 0;
};

struct State {
    std::vector<Particle> particles;
    std::vector<Vec2> walls;
    double time = 0;
    int emitted = 0;
    int rejected = 0;
};

struct Settings {
    double soundSpeed = 12;
    double alpha = 0.15;
    double gravity = 9.81;
    bool useGrid = true;
};

enum class Preset {
    Dam,
    Pool,
    Pair,
    Empty,
};

#if LAB_CHECKPOINT >= 1
inline State makeState(Preset preset = Preset::Dam) {
    State state;
    if (preset == Preset::Pair) {
        state.particles = {{{0.47, 0.4}, {0.3, 0}}, {{0.53, 0.4}, {-0.3, 0}}};
    } else if (preset != Preset::Empty) {
        int columns = 8;
        int rows = 12;
        if (preset == Preset::Pool) {
            columns = 20;
            rows = 5;
        }
        for (int y = 0; y < rows; ++y) {
            for (int x = 0; x < columns; ++x) {
                Vec2 position{spacing / 2 + x * spacing, spacing / 2 + y * spacing};
                state.particles.push_back({position, {0, 0}});
            }
        }
    }
#if LAB_CHECKPOINT >= 4
    // Three layers cover the kernel support; do not duplicate the corners.
    for (int y = -3; y <= 18; ++y) {
        for (int x = -3; x <= 24; ++x) {
            Vec2 position{spacing / 2 + x * spacing, spacing / 2 + y * spacing};
            if (position.y < 0 || position.x < 0 || position.x > 1) {
                state.walls.push_back(position);
            }
        }
    }
#endif
    return state;
}
#endif

inline void validateSettings(const Settings& settings) {
    if (!std::isfinite(settings.soundSpeed) || settings.soundSpeed < 8 || settings.soundSpeed > 20 || !std::isfinite(settings.alpha) || settings.alpha < 0 || settings.alpha > 0.3 || !std::isfinite(settings.gravity) || settings.gravity < 0 || settings.gravity > 9.81) {
        throw std::invalid_argument("SPH parameters outside the teaching range");
    }
}

inline bool finiteState(const State& state) {
    if (state.particles.size() > capacity) {
        return false;
    }
    for (const auto& p : state.particles) {
        if (!std::isfinite(p.position.x) || !std::isfinite(p.position.y) || !std::isfinite(p.velocity.x) || !std::isfinite(p.velocity.y) || !std::isfinite(p.density) || !std::isfinite(p.pressure) || p.density <= 0) {
            return false;
        }
    }
    return true;
}
} // namespace water
