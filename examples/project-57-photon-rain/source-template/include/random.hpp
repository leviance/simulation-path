#pragma once
#include "model.hpp"

namespace photon {
#if LAB_CHECKPOINT >= 2
// Xorshift32 không dùng cho mật mã. State 0 được ánh xạ sang seed khác 0.
class Random {
    public:
    explicit Random(std::uint32_t seed)
        : state(seed) {
        if (state == 0) {
            state = 0x6d2b79f5u;
        }
    }

    std::uint32_t next() {
        state ^= state << 13;
        state ^= state >> 17;
        state ^= state << 5;
        return state;
    }

    double uniform() {
        return (static_cast<double>(next()) + 0.5) / 4294967296.0;
    }

    private:
    std::uint32_t state;
};

inline std::uint32_t photonSeed(std::uint32_t seed, int id) {
    if (id < 0 || id >= maximumPhotons) {
        throw std::invalid_argument("Invalid photon id");
    }
    // MurmurHash3 fmix32 (public domain) decorrelates neighboring IDs.
    std::uint32_t value = seed + 0x9e3779b9u * (static_cast<std::uint32_t>(id) + 1u);
    value ^= value >> 16;
    value *= 0x85ebca6bu;
    value ^= value >> 13;
    value *= 0xc2b2ae35u;
    value ^= value >> 16;
    return value;
}

inline Photon launch(Random& random) {
    const double y = 0.75 * (2 * random.uniform() - 1);
    return {{left, y}, {1, 0}};
}

// Đơn vị distance là world unit, muT là 1/world-unit.
inline double freePath(double muT, double u) {
    if (!std::isfinite(muT) || muT < 0 || muT > 6 || !std::isfinite(u) || u <= 0 || u >= 1) {
        throw std::invalid_argument("Invalid exponential sample");
    }
    if (muT == 0) {
        return std::numeric_limits<double>::infinity();
    }
    return -std::log1p(-u) / muT;
}

struct Sample {
    Photon photon;
    double u;
    double distance;
};

inline Sample sampleFirst(Settings settings, int id) {
    validate(settings);
    Random random(photonSeed(settings.seed, id));
    const Photon initial = launch(random);
    const double u = random.uniform();
    return {initial, u, freePath(settings.muA + settings.muS, u)};
}
#endif
} // namespace photon
