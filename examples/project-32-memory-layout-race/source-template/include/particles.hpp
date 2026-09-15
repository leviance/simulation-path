#pragma once

#ifndef LAB_CHECKPOINT
#define LAB_CHECKPOINT 8
#endif

#include <algorithm>
#include <array>
#include <cmath>
#include <cstddef>
#include <cstdint>
#include <limits>
#include <span>
#include <vector>

namespace lab {

inline constexpr std::size_t kParticleFieldCount = 6U;
inline constexpr float kWorldMinimum = -1.0F;
inline constexpr float kWorldMaximum = 1.0F;

// Checkpoint 1: AoS giữ toàn bộ state của một particle trong cùng struct.
#if LAB_CHECKPOINT >= 1
struct ParticleAoS {
    float positionX{};
    float positionY{};
    float positionZ{};
    float velocityX{};
    float velocityY{};
    float velocityZ{};
};

static_assert(sizeof(ParticleAoS) == sizeof(float) * kParticleFieldCount);

class XorShift32 {
    public:
    explicit XorShift32(std::uint32_t seed)
        : state_(seed) {
        if (state_ == 0U) {
            state_ = 0x6d2b79f5U;
        }
    }

    std::uint32_t nextU32() {
        state_ ^= state_ << 13U;
        state_ ^= state_ >> 17U;
        state_ ^= state_ << 5U;
        return state_;
    }

    float nextSigned() {
        const double unit = double(nextU32()) / double(std::numeric_limits<std::uint32_t>::max());
        return float(unit * 2.0 - 1.0);
    }

    private:
    std::uint32_t state_{};
};

inline std::vector<ParticleAoS> makeParticlesAoS(std::size_t count, std::uint32_t seed) {
    std::vector<ParticleAoS> particles{};
    particles.reserve(count);
    XorShift32 random{seed};
    for (std::size_t index = 0; index < count; ++index) {
        ParticleAoS particle{};
        particle.positionX = random.nextSigned();
        particle.positionY = random.nextSigned();
        particle.positionZ = random.nextSigned();
        particle.velocityX = random.nextSigned() * 0.35F;
        particle.velocityY = random.nextSigned() * 0.35F;
        particle.velocityZ = random.nextSigned() * 0.35F;
        particles.push_back(particle);
    }
    return particles;
}

inline bool allFinite(std::span<const ParticleAoS> particles) {
    for (const ParticleAoS& particle : particles) {
        const bool finite = std::isfinite(particle.positionX) &&
            std::isfinite(particle.positionY) &&
            std::isfinite(particle.positionZ) &&
            std::isfinite(particle.velocityX) &&
            std::isfinite(particle.velocityY) &&
            std::isfinite(particle.velocityZ);
        if (!finite) {
            return false;
        }
    }
    return true;
}
#endif

// Checkpoint 2: kernel AoS cập nhật position, còn velocity giữ nguyên.
#if LAB_CHECKPOINT >= 2
inline float wrapCoordinate(float value) {
    float wrapped = value;
    if (wrapped > kWorldMaximum) {
        wrapped -= kWorldMaximum - kWorldMinimum;
    }
    if (wrapped < kWorldMinimum) {
        wrapped += kWorldMaximum - kWorldMinimum;
    }
    return wrapped;
}

inline void integrateAoS(std::span<ParticleAoS> particles, float deltaSeconds) {
    for (ParticleAoS& particle : particles) {
        particle.positionX = wrapCoordinate(
            particle.positionX + particle.velocityX * deltaSeconds
        );
        particle.positionY = wrapCoordinate(
            particle.positionY + particle.velocityY * deltaSeconds
        );
        particle.positionZ = wrapCoordinate(
            particle.positionZ + particle.velocityZ * deltaSeconds
        );
    }
}

inline double sumPositionXAoS(std::span<const ParticleAoS> particles) {
    double sum = 0.0;
    for (const ParticleAoS& particle : particles) {
        sum += double(particle.positionX);
    }
    return sum;
}

inline void dampVelocitiesAoS(std::span<ParticleAoS> particles, float factor) {
    for (ParticleAoS& particle : particles) {
        particle.velocityX *= factor;
        particle.velocityY *= factor;
        particle.velocityZ *= factor;
    }
}
#endif

// Checkpoint 4: SoA giữ mỗi field trong một vector liên tục riêng.
#if LAB_CHECKPOINT >= 4
struct ParticlesSoA {
    std::vector<float> positionX{};
    std::vector<float> positionY{};
    std::vector<float> positionZ{};
    std::vector<float> velocityX{};
    std::vector<float> velocityY{};
    std::vector<float> velocityZ{};

    [[nodiscard]] std::size_t size() const {
        return positionX.size();
    }
};

inline ParticlesSoA makeParticlesSoA(std::span<const ParticleAoS> particles) {
    ParticlesSoA result{};
    result.positionX.reserve(particles.size());
    result.positionY.reserve(particles.size());
    result.positionZ.reserve(particles.size());
    result.velocityX.reserve(particles.size());
    result.velocityY.reserve(particles.size());
    result.velocityZ.reserve(particles.size());
    for (const ParticleAoS& particle : particles) {
        result.positionX.push_back(particle.positionX);
        result.positionY.push_back(particle.positionY);
        result.positionZ.push_back(particle.positionZ);
        result.velocityX.push_back(particle.velocityX);
        result.velocityY.push_back(particle.velocityY);
        result.velocityZ.push_back(particle.velocityZ);
    }
    return result;
}

inline bool validSoA(const ParticlesSoA& particles) {
    const std::size_t count = particles.positionX.size();
    return particles.positionY.size() == count &&
        particles.positionZ.size() == count &&
        particles.velocityX.size() == count &&
        particles.velocityY.size() == count &&
        particles.velocityZ.size() == count;
}
#endif

// Checkpoint 5: SoA chạy cùng công thức và được đối chiếu field-by-field với AoS.
#if LAB_CHECKPOINT >= 5
inline void integrateSoA(ParticlesSoA& particles, float deltaSeconds) {
    if (!validSoA(particles)) {
        return;
    }
    for (std::size_t index = 0; index < particles.size(); ++index) {
        particles.positionX[index] = wrapCoordinate(
            particles.positionX[index] + particles.velocityX[index] * deltaSeconds
        );
        particles.positionY[index] = wrapCoordinate(
            particles.positionY[index] + particles.velocityY[index] * deltaSeconds
        );
        particles.positionZ[index] = wrapCoordinate(
            particles.positionZ[index] + particles.velocityZ[index] * deltaSeconds
        );
    }
}

inline double sumPositionXSoA(const ParticlesSoA& particles) {
    double sum = 0.0;
    for (const float positionX : particles.positionX) {
        sum += double(positionX);
    }
    return sum;
}

inline void dampVelocitiesSoA(ParticlesSoA& particles, float factor) {
    if (!validSoA(particles)) {
        return;
    }
    for (std::size_t index = 0; index < particles.size(); ++index) {
        particles.velocityX[index] *= factor;
        particles.velocityY[index] *= factor;
        particles.velocityZ[index] *= factor;
    }
}

inline float maximumLayoutDifference(
    std::span<const ParticleAoS> aos,
    const ParticlesSoA& soa
) {
    if (aos.size() != soa.size() || !validSoA(soa)) {
        return std::numeric_limits<float>::infinity();
    }
    float maximum = 0.0F;
    for (std::size_t index = 0; index < aos.size(); ++index) {
        maximum = std::max(maximum, std::abs(aos[index].positionX - soa.positionX[index]));
        maximum = std::max(maximum, std::abs(aos[index].positionY - soa.positionY[index]));
        maximum = std::max(maximum, std::abs(aos[index].positionZ - soa.positionZ[index]));
        maximum = std::max(maximum, std::abs(aos[index].velocityX - soa.velocityX[index]));
        maximum = std::max(maximum, std::abs(aos[index].velocityY - soa.velocityY[index]));
        maximum = std::max(maximum, std::abs(aos[index].velocityZ - soa.velocityZ[index]));
    }
    return maximum;
}
#endif

} // namespace lab
