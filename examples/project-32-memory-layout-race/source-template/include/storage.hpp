#pragma once
#include "particles.hpp"

namespace lab {
#if LAB_CHECKPOINT >= 4
// [snippet:ParticlesSoA]
struct ParticlesSoA {
    std::vector<std::uint32_t> id{};
    std::vector<std::uint32_t> generation{};
    std::vector<float> positionX{};
    std::vector<float> positionY{};
    std::vector<float> positionZ{};
    std::vector<float> velocityX{};
    std::vector<float> velocityY{};
    std::vector<float> velocityZ{};
    std::vector<float> age{};
    std::vector<float> lifetime{};
    std::vector<float> hue{};

    std::size_t size() const {
        return id.size();
    }

    void resize(std::size_t count) {
        if (count > maximumParticles)
            throw std::invalid_argument("SoA allocation budget");
        id.resize(count);
        generation.resize(count);
        positionX.resize(count);
        positionY.resize(count);
        positionZ.resize(count);
        velocityX.resize(count);
        velocityY.resize(count);
        velocityZ.resize(count);
        age.resize(count);
        lifetime.resize(count);
        hue.resize(count);
    }

    bool valid() const {
        const std::size_t count = size();
        return generation.size() == count && positionX.size() == count && positionY.size() == count && positionZ.size() == count && velocityX.size() == count && velocityY.size() == count && velocityZ.size() == count && age.size() == count && lifetime.size() == count && hue.size() == count;
    }
};

// [/snippet:ParticlesSoA]
inline ParticleAoS readParticle(const ParticlesSoA& source, std::size_t index) {
    return {source.id[index], source.generation[index], source.positionX[index], source.positionY[index], source.positionZ[index], source.velocityX[index], source.velocityY[index], source.velocityZ[index], source.age[index], source.lifetime[index], source.hue[index]};
}

// [snippet:writeParticle]
inline void writeParticle(ParticlesSoA& destination, std::size_t index, const ParticleAoS& particle) {
    destination.id[index] = particle.id;
    destination.generation[index] = particle.generation;
    destination.positionX[index] = particle.positionX;
    destination.positionY[index] = particle.positionY;
    destination.positionZ[index] = particle.positionZ;
    destination.velocityX[index] = particle.velocityX;
    destination.velocityY[index] = particle.velocityY;
    destination.velocityZ[index] = particle.velocityZ;
    destination.age[index] = particle.age;
    destination.lifetime[index] = particle.lifetime;
    destination.hue[index] = particle.hue;
}

// [/snippet:writeParticle]
inline ParticlesSoA makeParticlesSoA(std::span<const ParticleAoS> source) {
    ParticlesSoA destination{};
    destination.resize(source.size());
    for (std::size_t index = 0; index < source.size(); ++index)
        writeParticle(destination, index, source[index]);
    return destination;
}

#if LAB_CHECKPOINT >= 5
// [snippet:updateSoARange]
inline std::size_t updateSoARange(ParticlesSoA& particles, std::size_t begin, std::size_t end, const FountainConfig& config, float dt, MemoryWorkload workload, std::size_t oldActive) {
    std::size_t respawned = 0;
    if (workload == MemoryWorkload::gravityOnly) {
        for (std::size_t index = begin; index < end; ++index) {
            particles.velocityY[index] += config.gravity * dt;
        }
    } else {
        for (std::size_t index = begin; index < end; ++index) {
            if (index >= oldActive || dt >= particles.lifetime[index] - particles.age[index]) {
                ParticleAoS particle = readParticle(particles, index);
                if (advanceParticle(particle, config, dt, index >= oldActive))
                    ++respawned;
                writeParticle(particles, index, particle);
            } else {
                particles.velocityY[index] += config.gravity * dt;
                particles.positionX[index] += particles.velocityX[index] * dt;
                particles.positionY[index] += particles.velocityY[index] * dt;
                particles.positionZ[index] += particles.velocityZ[index] * dt;
                particles.age[index] += dt;
            }
        }
    }
    return respawned;
}

// [/snippet:updateSoARange]
#endif

inline std::size_t allocatedBytes(const ParticlesSoA& source) {
    return (source.id.capacity() + source.generation.capacity()) * sizeof(std::uint32_t) + (source.positionX.capacity() + source.positionY.capacity() + source.positionZ.capacity() + source.velocityX.capacity() + source.velocityY.capacity() + source.velocityZ.capacity() + source.age.capacity() + source.lifetime.capacity() + source.hue.capacity()) * sizeof(float);
}
#endif

inline float particleDifference(const ParticleAoS& first, const ParticleAoS& second) {
    if (first.id != second.id || first.generation != second.generation || !finiteParticle(first) || !finiteParticle(second))
        return std::numeric_limits<float>::infinity();
    float maximum = 0;
    for (float error : {std::abs(first.positionX - second.positionX), std::abs(first.positionY - second.positionY), std::abs(first.positionZ - second.positionZ), std::abs(first.velocityX - second.velocityX), std::abs(first.velocityY - second.velocityY), std::abs(first.velocityZ - second.velocityZ), std::abs(first.age - second.age), std::abs(first.lifetime - second.lifetime), std::abs(first.hue - second.hue)})
        maximum = std::max(maximum, error);
    return maximum;
}

inline double particleChecksum(const ParticleAoS& particle) {
    return double(particle.positionX) + 2.0 * particle.positionY + 3.0 * particle.positionZ + 5.0 * particle.velocityX + 7.0 * particle.velocityY + 11.0 * particle.velocityZ + 13.0 * particle.age + 17.0 * particle.lifetime + 19.0 * particle.hue;
}

inline double checksum(std::span<const ParticleAoS> particles, std::size_t active) {
    double sum = 0;
    for (std::size_t index = 0; index < active; ++index)
        sum += particleChecksum(particles[index]);
    return sum;
}
#if LAB_CHECKPOINT >= 4
inline double checksum(const ParticlesSoA& particles, std::size_t active) {
    double sum = 0;
    for (std::size_t index = 0; index < active; ++index)
        sum += particleChecksum(readParticle(particles, index));
    return sum;
}

// [snippet:maximumLayoutDifference]
inline float maximumLayoutDifference(std::span<const ParticleAoS> aos, const ParticlesSoA& soa) {
    if (!soa.valid() || aos.size() != soa.size())
        return std::numeric_limits<float>::infinity();
    float maximum = 0;
    for (std::size_t index = 0; index < aos.size(); ++index) {
        maximum = std::max(maximum, particleDifference(aos[index], readParticle(soa, index)));
    }
    return maximum;
}

// [/snippet:maximumLayoutDifference]
#endif
} // namespace lab
