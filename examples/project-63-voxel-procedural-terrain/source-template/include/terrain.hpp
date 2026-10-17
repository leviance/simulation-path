#pragma once
#include "noise.hpp"

namespace voxel {
// Mọi chunk trong một thế hệ dùng chung cấu hình, không cộng Key vào seed.
struct TerrainConfig {
    std::uint32_t seed = 42;
    int scale = 32;
    int octaves = 3;
};

inline void validateConfig(const TerrainConfig& config) {
    if (config.seed > 65535u || (config.scale != 16 && config.scale != 32 && config.scale != 64) || config.octaves < 1 || config.octaves > 4) {
        throw std::out_of_range("seed 0..65535, scale 16/32/64, octaves 1..4");
    }
}

inline double terrainSignal(double x, double z, const TerrainConfig& config) {
    validateConfig(config);
    if (!std::isfinite(x) || !std::isfinite(z) || std::abs(x) > 2048 || std::abs(z) > 2048) {
        throw std::out_of_range("world -2048..2048");
    }
#if LAB_CHECKPOINT >= 5
    double sum = 0;
    double weight = 0;
    double amplitude = 1;
    double frequency = 1.0 / config.scale;
    for (int octave = 0; octave < config.octaves; ++octave) {
        sum += amplitude * valueNoise(x * frequency, z * frequency, config.seed);
        weight += amplitude;
        amplitude *= 0.5;
        frequency *= 2;
    }
    return sum / weight;
#elif LAB_CHECKPOINT >= 4
    return valueNoise(x / config.scale, z / config.scale, config.seed);
#elif LAB_CHECKPOINT >= 3
    return latticeValue(static_cast<int>(std::floor(x / config.scale)), static_cast<int>(std::floor(z / config.scale)), config.seed);
#elif LAB_CHECKPOINT >= 2
    return std::sin(x / 16) * std::cos(z / 16);
#else
    return 0;
#endif
}

inline int heightAt(double x, double z, const TerrainConfig& config) {
    const double signal = terrainSignal(x, z, config);
#if LAB_CHECKPOINT >= 2
    return std::clamp(static_cast<int>(std::floor(8 + 6 * signal)), 2, 14);
#else
    (void)signal;
    return 4;
#endif
}

inline Block materialAt(int y, int height, const TerrainConfig& config) {
    (void)config;
    if (y < 0 || y >= height) {
        return Block::Air;
    }
#if LAB_CHECKPOINT >= 6
    if (y == height - 1 && height < 11) {
        return Block::Grass;
    }
    if (height < 11 && y >= height - 3 && y > 0) {
        return Block::Dirt;
    }
#endif
    return Block::Stone;
}

inline Chunk generateTerrain(Key key, const TerrainConfig& config) {
    validateKey(key);
    validateConfig(config);
    Chunk blocks{};
    for (int z = 0; z < side; ++z) {
        for (int x = 0; x < side; ++x) {
            const int worldX = key.x * side + x;
            const int worldZ = key.z * side + z;
            const int height = heightAt(worldX, worldZ, config);
            for (int y = 0; y < height; ++y) {
                set(blocks, x, y, z, materialAt(y, height, config));
            }
        }
    }
    return blocks;
}
} // namespace voxel
