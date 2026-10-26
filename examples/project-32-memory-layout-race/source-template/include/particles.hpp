#pragma once
#ifndef LAB_CHECKPOINT
#define LAB_CHECKPOINT 8
#endif
#include <algorithm>
#include <cmath>
#include <cstddef>
#include <cstdint>
#include <limits>
#include <span>
#include <stdexcept>
#include <vector>

namespace lab {
inline constexpr std::size_t maximumParticles = 1'000'000;
inline constexpr std::uint32_t defaultSeed = 0x32c0ffeeU;
inline constexpr float fixedDt = 1.0F / 120.0F;

// [snippet:ParticleAoS]
struct ParticleAoS {
    std::uint32_t id{};
    std::uint32_t generation{};
    float positionX{};
    float positionY{};
    float positionZ{};
    float velocityX{};
    float velocityY{};
    float velocityZ{};
    float age{};
    float lifetime{2.5F};
    float hue{};
};

// [/snippet:ParticleAoS]
static_assert(sizeof(float) == 4 && sizeof(ParticleAoS) == 44);

// Metres, seconds and metres/second squared; every dynamic field is float32.
struct FountainConfig {
    std::uint32_t seed{defaultSeed};
    float emitterX{};
    float emitterZ{};
    float launchSpeed{9.0F};
    float spread{2.0F};
    float gravity{-9.81F};
    float lifetime{2.5F};
    float emissionRate{128.0F};
};

inline void validateConfig(const FountainConfig& config, float dt = fixedDt) {
    for (float value : {config.emitterX, config.emitterZ, config.launchSpeed, config.spread, config.gravity, config.lifetime, config.emissionRate, dt}) {
        if (!std::isfinite(value)) {
            throw std::invalid_argument("Non-finite fountain input");
        }
    }
    if (dt <= 0 || dt > 1.0F / 30.0F || config.lifetime < 0.5F || config.lifetime > 8 || config.launchSpeed < 1 || config.launchSpeed > 20 || config.spread < 0 || config.spread > 5 || config.gravity < -20 || config.gravity > 0 || config.emissionRate < 0 || config.emissionRate > 2'000'000 || std::abs(config.emitterX) > 10 || std::abs(config.emitterZ) > 10) {
        throw std::invalid_argument("Fountain parameter budget exceeded");
    }
}

// [snippet:randomUnit]
inline float randomUnit(std::uint32_t seed, std::uint32_t id, std::uint32_t generation, std::uint32_t channel) {
    std::uint32_t value = seed ^ (id * 0x9e3779b9U) ^ (generation * 0x85ebca6bU) ^ (channel * 0xc2b2ae35U);
    value ^= value >> 16U;
    value *= 0x7feb352dU;
    value ^= value >> 15U;
    value *= 0x846ca68bU;
    value ^= value >> 16U;
    return float(value >> 8U) * (1.0F / 16777216.0F);
}

// [/snippet:randomUnit]

// [snippet:spawnParticle]
inline ParticleAoS spawnParticle(std::uint32_t id, std::uint32_t generation, const FountainConfig& config) {
    ParticleAoS particle{};
    particle.id = id;
    particle.generation = generation;
    const float angle = randomUnit(config.seed, id, generation, 1) * 6.28318530718F;
    const float radialSpeed = std::sqrt(randomUnit(config.seed, id, generation, 2)) * config.spread;
    particle.positionX = config.emitterX;
    particle.positionZ = config.emitterZ;
    particle.velocityX = std::cos(angle) * radialSpeed;
    particle.velocityZ = std::sin(angle) * radialSpeed;
    particle.velocityY = config.launchSpeed * (0.85F + 0.3F * randomUnit(config.seed, id, generation, 3));
    particle.lifetime = config.lifetime * (0.75F + 0.5F * randomUnit(config.seed, id, generation, 4));
    particle.hue = randomUnit(config.seed, id, generation, 5);
    return particle;
}

// [/snippet:spawnParticle]

inline ParticleAoS warmParticle(std::uint32_t id, const FountainConfig& config) {
    ParticleAoS particle = spawnParticle(id, 0, config);
    particle.age = randomUnit(config.seed, particle.id, 0, 6) * particle.lifetime;
    // Pre-warm initializes a ballistic state, never a scripted trajectory.
    particle.positionX += particle.velocityX * particle.age;
    particle.positionY = particle.velocityY * particle.age + 0.5F * config.gravity * particle.age * particle.age;
    particle.positionZ += particle.velocityZ * particle.age;
    particle.velocityY += config.gravity * particle.age;
    return particle;
}

inline std::vector<ParticleAoS> makeParticlesAoS(std::size_t count, const FountainConfig& config, bool warm = true) {
    validateConfig(config);
    if (count < 1 || count > maximumParticles) {
        throw std::invalid_argument("Particle count: 1..1000000");
    }
    std::vector<ParticleAoS> particles(count);
    for (std::size_t index = 0; index < count; ++index) {
        particles[index].id = std::uint32_t(index);
#if LAB_CHECKPOINT >= 1
        if (warm) {
            particles[index] = warmParticle(std::uint32_t(index), config);
        }
#else
        // The supplied scaffold shows eight manually emitted particles.
        if (index < 8) {
            particles[index] = spawnParticle(std::uint32_t(index), 0, config);
            particles[index].positionY = float(index) * 0.35F;
        }
#endif
    }
    return particles;
}

// [snippet:integrateParticle]
inline void integrateParticle(ParticleAoS& particle, float dt, float gravity) {
    particle.velocityY += gravity * dt;
    particle.positionX += particle.velocityX * dt;
    particle.positionY += particle.velocityY * dt;
    particle.positionZ += particle.velocityZ * dt;
    particle.age += dt;
}

// [/snippet:integrateParticle]

#if LAB_CHECKPOINT >= 2
// [snippet:advanceParticle]
inline bool advanceParticle(ParticleAoS& particle, const FountainConfig& config, float dt, bool newlyEmitted = false) {
    if (newlyEmitted) {
        particle = spawnParticle(particle.id, 0, config);
    }
    const float remaining = particle.lifetime - particle.age;
    if (dt < remaining) {
        integrateParticle(particle, dt, config.gravity);
        return false;
    }
    if (particle.generation == std::numeric_limits<std::uint32_t>::max()) {
        throw std::overflow_error("Particle generation overflow");
    }
    particle = spawnParticle(particle.id, particle.generation + 1, config);
    // Consume the remainder after death, not an additional whole timestep.
    integrateParticle(particle, dt - remaining, config.gravity);
    return true;
}

// [/snippet:advanceParticle]

struct EmissionPlan {
    std::size_t active{};
    double remainder{};
};

// [snippet:planEmission]
inline EmissionPlan planEmission(std::size_t active, std::size_t capacity, double remainder, const FountainConfig& config, float dt) {
    validateConfig(config, dt);
    if (active > capacity || !std::isfinite(remainder) || remainder < 0 || remainder >= 1) {
        throw std::invalid_argument("Invalid emission state");
    }
    const double available = remainder + double(config.emissionRate) * double(dt);
    const std::size_t births = std::min(capacity - active, std::size_t(std::floor(available)));
    if (active + births == capacity) {
        return {capacity, 0};
    }
    return {active + births, available - std::floor(available)};
}
// [/snippet:planEmission]

enum class MemoryWorkload { gravityOnly,
                            fullLifecycle };

// [snippet:updateAoSRange]
inline std::size_t updateAoSRange(std::span<ParticleAoS> particles, std::size_t begin, std::size_t end, const FountainConfig& config, float dt, MemoryWorkload workload, std::size_t oldActive) {
    std::size_t respawned = 0;
    if (workload == MemoryWorkload::gravityOnly) {
        for (std::size_t index = begin; index < end; ++index) {
            particles[index].velocityY += config.gravity * dt;
        }
    } else {
        for (std::size_t index = begin; index < end; ++index) {
            if (advanceParticle(particles[index], config, dt, index >= oldActive)) {
                ++respawned;
            }
        }
    }
    return respawned;
}

// [/snippet:updateAoSRange]
#endif

inline bool finiteParticle(const ParticleAoS& particle) {
    for (float value : {particle.positionX, particle.positionY, particle.positionZ, particle.velocityX, particle.velocityY, particle.velocityZ, particle.age, particle.lifetime, particle.hue}) {
        if (!std::isfinite(value)) {
            return false;
        }
    }
    return particle.age >= 0 && particle.age < particle.lifetime && particle.lifetime > 0;
}
} // namespace lab
