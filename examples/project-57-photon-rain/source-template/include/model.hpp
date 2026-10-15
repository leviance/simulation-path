#pragma once
#include <algorithm>
#include <array>
#include <cmath>
#include <cstdint>
#include <limits>
#include <numbers>
#include <stdexcept>
#include <vector>

#ifndef LAB_CHECKPOINT
#define LAB_CHECKPOINT 8
#endif

namespace photon {
using Point = std::array<double, 2>;
constexpr double left = -1.5;
constexpr double right = 1.5;
constexpr double bottom = -1;
constexpr double top = 1;
constexpr int maximumPhotons = 8192;
constexpr int maximumEvents = 64;

// Hình học dùng world XY; chỉ hàm vẽ mới đảo chiều trục y.
struct Photon {
    Point position{left, 0};
    Point direction{1, 0};
};

enum class Event {
    Emission,
    Candidate,
    Absorption,
    Scatter,
    Escape,
};

enum class Status {
    Alive,
    Absorbed,
    Escaped,
    Censored,
};

struct Vertex {
    Point position;
    Event event;
};

struct Trace {
    std::vector<Vertex> vertices;
    Status status = Status::Alive;
    int collisions = 0;
    int scatters = 0;
};

struct Settings {
    double muA = 0.4;
#if LAB_CHECKPOINT >= 5
    double muS = 0.9;
#else
    double muS = 0;
#endif
    std::uint32_t seed = 42;
    int count = 2048;
    int eventLimit = 64;
    bool operator==(const Settings&) const = default;
};

inline void validate(Settings settings) {
    if (!std::isfinite(settings.muA) || !std::isfinite(settings.muS) || settings.muA < 0 || settings.muA > 3 || settings.muS < 0 || settings.muS > 3) {
        throw std::invalid_argument("Coefficients must be finite and in [0,3]");
    }
    if (settings.count < 1 || settings.count > maximumPhotons || settings.eventLimit < 1 || settings.eventLimit > maximumEvents) {
        throw std::invalid_argument("Photon count or event limit exceeds budget");
    }
#if LAB_CHECKPOINT < 5
    if (settings.muS != 0) {
        throw std::invalid_argument("Scattering is introduced in checkpoint 5");
    }
#endif
}

inline Point move(Point position, Point direction, double distance) {
    return {position[0] + direction[0] * distance, position[1] + direction[1] * distance};
}
} // namespace photon
