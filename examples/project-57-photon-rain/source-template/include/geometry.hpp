#pragma once
#include "random.hpp"

namespace photon {
#if LAB_CHECKPOINT >= 3
inline void validatePhoton(const Photon& value) {
    const auto& p = value.position;
    const auto& d = value.direction;
    if (!std::isfinite(p[0]) || !std::isfinite(p[1]) || p[0] < left - 1e-10 || p[0] > right + 1e-10 || p[1] < bottom - 1e-10 || p[1] > top + 1e-10 || !std::isfinite(d[0]) || !std::isfinite(d[1]) || std::abs(d[0] * d[0] + d[1] * d[1] - 1) > 1e-10) {
        throw std::invalid_argument("Expected an inside photon and unit direction");
    }
}

// Khoảng cách tới biên theo hướng đang đi, kể cả distance=0 khi đi ra ngoài.
inline double exitDistance(const Photon& value) {
    validatePhoton(value);
    double distance = std::numeric_limits<double>::infinity();
    for (int axis = 0; axis < 2; ++axis) {
        const double direction = value.direction[axis];
        if (direction == 0) {
            continue;
        }
        double boundary = right;
        if (axis == 1) {
            boundary = top;
        }
        if (direction < 0) {
            boundary = left;
            if (axis == 1) {
                boundary = bottom;
            }
        }
        distance = std::min(distance, (boundary - value.position[axis]) / direction);
    }
    return std::max(0.0, distance);
}

struct Flight {
    Point endpoint;
    double sampled;
    double boundary;
    bool escaped;
};

inline Flight sampleFlight(const Photon& value, Random& random, Settings settings) {
    const double boundary = exitDistance(value);
    const double muT = settings.muA + settings.muS;
    double sampled = std::numeric_limits<double>::infinity();
    if (muT > 0) {
        sampled = freePath(muT, random.uniform());
    }
    const double distance = std::min(sampled, boundary);
    Point endpoint = move(value.position, value.direction, distance);
    const bool escaped = sampled >= boundary;
    if (escaped) {
        // Chỉ sửa sai số số học ở điểm thoát, không đẩy photon vào trong vật liệu.
        endpoint[0] = std::clamp(endpoint[0], left, right);
        endpoint[1] = std::clamp(endpoint[1], bottom, top);
    }
    return {endpoint, sampled, boundary, escaped};
}

inline Flight firstFlight(Settings settings, int id) {
    validate(settings);
    Random random(photonSeed(settings.seed, id));
    const Photon initial = launch(random);
    return sampleFlight(initial, random, settings);
}
#endif
} // namespace photon
