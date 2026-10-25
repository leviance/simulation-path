#pragma once
#ifndef LAB_CHECKPOINT
#define LAB_CHECKPOINT 9
#endif
#include <algorithm>
#include <cmath>
#include <cstdint>
#include <stdexcept>
#include <vector>

namespace lab {
inline constexpr double vectorEpsilon = 1e-9;
inline constexpr double fixedDt = 1.0 / 60.0;
inline constexpr double responseTime = 1.0;

struct Vec2 {
    double x{};
    double y{};
};

inline Vec2 add(Vec2 a, Vec2 b) {
    return {a.x + b.x, a.y + b.y};
}

inline Vec2 subtract(Vec2 a, Vec2 b) {
    return {a.x - b.x, a.y - b.y};
}

inline Vec2 multiply(Vec2 v, double scale) {
    return {v.x * scale, v.y * scale};
}

inline double length(Vec2 v) {
    return std::hypot(v.x, v.y);
}

// [snippet:limit]
inline Vec2 limit(Vec2 v, double maximum) {
    const double magnitude = length(v);
    if (magnitude <= maximum || magnitude == 0.0) {
        return v;
    }
    return multiply(v, maximum / magnitude);
}
// [/snippet:limit]

struct Boid {
    std::uint32_t id{};
    Vec2 position{};
    Vec2 velocity{};
};

struct Params {
    double width = 960.0;
    double height = 600.0;
    double radius = 64.0;
    double maxSpeed = 90.0;
    double maxAcceleration = 60.0;
    double separationWeight = 1.5;
    double alignmentWeight = 1.0;
    double cohesionWeight = 0.8;
};

inline bool validParams(const Params& params) {
    const double values[]{params.width, params.height, params.radius, params.maxSpeed, params.maxAcceleration, params.separationWeight, params.alignmentWeight, params.cohesionWeight};
    for (double value : values) {
        if (!std::isfinite(value)) {
            return false;
        }
    }
    if (params.width <= 0.0 || params.height <= 0.0 || params.radius < 0.0 || params.radius >= std::min(params.width, params.height) / 2.0) {
        return false;
    }
    if (params.width > 1e6 || params.height > 1e6) {
        return false;
    }
    if (params.maxSpeed <= 0.0 || params.maxSpeed > 1000.0 || params.maxAcceleration <= 0.0 || params.maxAcceleration > 1000.0) {
        return false;
    }
    for (double weight : {params.separationWeight, params.alignmentWeight, params.cohesionWeight}) {
        if (weight < 0.0 || weight > 5.0) {
            return false;
        }
    }
    return true;
}

// Miền tuần hoàn giữ cá thể trong ảnh nhưng không tạo lực giả ở bốn cạnh.
inline double wrap(double value, double span) {
    double result = std::fmod(value, span);
    if (result < 0.0) {
        result += span;
    }
    // Làm tròn sát mép không được tạo position == span ngoài miền hợp lệ.
    if (result >= span || result == 0.0) {
        return 0.0;
    }
    return result;
}

#if LAB_CHECKPOINT >= 1
// [snippet:integrateBoid]
inline Boid integrateBoid(const Boid& boid, Vec2 acceleration, const Params& params, double dt) {
    Boid next = boid;
    next.velocity = limit(add(boid.velocity, multiply(acceleration, dt)), params.maxSpeed);
    next.position = add(boid.position, multiply(next.velocity, dt));
    next.position.x = wrap(next.position.x, params.width);
    next.position.y = wrap(next.position.y, params.height);
    return next;
}
// [/snippet:integrateBoid]
#else
// Starter: bài 01 thay thân hàm này; clock/input đã có từ Project 02.
inline Boid integrateBoid(const Boid& boid, Vec2, const Params&, double) {
    return boid;
}
#endif
} // namespace lab
