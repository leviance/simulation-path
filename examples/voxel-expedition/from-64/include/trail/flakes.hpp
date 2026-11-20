#pragma once
#include "wind.hpp"
#include <array>

namespace trail {
#if LAB_CHECKPOINT >= 6401
struct Flake {
    Vec3 point;
    double fall = 1, age = 0;
    bool alive = false;
};
struct Snow {
    std::array<Flake, 768> pool{};
    std::uint32_t rng = 57;
    double carry = 0;
    double noise() {
        rng = 1664525u * rng + 1013904223u;
        return double(rng >> 8) / 16777216.0;
    }

    void update(Vec3 eye, double dt, double intensity, Wind wind, double seconds) {
        dt = std::clamp(dt, 0.0, 0.05);
        carry += dt * std::clamp(intensity, 0.0, 1.0) * 135;
        for (Flake& flake : pool) {
            // [snippet snow-emit]
            if (!flake.alive && carry >= 1) {
                carry -= 1;
                flake = {{eye.x + (noise() - 0.5) * 24, eye.y + 2 + noise() * 7, eye.z + (noise() - 0.5) * 24}, 1.3 + noise() * 1.8, 0, true};
            }
            // [/snippet snow-emit]
            if (!flake.alive)
                continue;
            // [snippet snow-step]
            const Vec3 gust = windAt(flake.point, seconds, wind);
            flake.point = flake.point + Vec3{gust.x, -flake.fall, gust.z} * dt;
            flake.age += dt;
            if (flake.point.y < eye.y - 5 || flake.age > 12 || std::abs(flake.point.x - eye.x) > 19 || std::abs(flake.point.z - eye.z) > 19) {
                flake.alive = false;
            }
            // [/snippet snow-step]
        }
        carry = std::min(carry, 1.0);
    }
};
#endif
} // namespace trail
