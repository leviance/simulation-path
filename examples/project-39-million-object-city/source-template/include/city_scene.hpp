#pragma once

#include "city_types.hpp"

#include <algorithm>
#include <cmath>
#include <cstdint>
#include <limits>
#include <stdexcept>
#include <vector>

namespace city {

inline std::uint32_t hash(std::uint32_t value) {
    value ^= value >> 16U;
    value *= 0x7feb352dU;
    value ^= value >> 15U;
    value *= 0x846ca68bU;
    return value ^ (value >> 16U);
}

inline float randomUnit(std::uint32_t id, std::uint32_t seed, std::uint32_t channel) {
    return static_cast<float>(hash(id ^ seed ^ (channel * 0x9e3779b9U)) & 0xffffU) / 65535.0F;
}

inline Object makeObject(std::uint32_t id, std::uint32_t seed, std::uint32_t count) {
    const unsigned side = static_cast<unsigned>(std::ceil(std::sqrt(static_cast<double>(std::max(count, 1U)))));
    const unsigned column = id % side;
    const unsigned row = id / side;
    const float offset = static_cast<float>(side) * 10.875F;
    const float x = column * 20.0F + (column / 8U) * 14.0F - offset;
    const float z = row * 20.0F + (row / 8U) * 14.0F - offset;
    const float district = randomUnit((row / 8U) * side + column / 8U, seed, 1U);
    const float density = 0.3F + district;
    Object object{};
    object.halfX = 3.1F + randomUnit(id, seed, 2U) * 3.5F;
    object.halfZ = 3.1F + randomUnit(id, seed, 3U) * 3.5F;
    object.halfY = 3.0F + std::pow(randomUnit(id, seed, 4U), 1.8F) * 48.0F * density;
    object.mesh = hash(id ^ seed) % 3U;
    if (id % 4096U == 0U) {
        object.halfY = 95.0F;
        object.mesh = 1U;
    }
    const float radius = std::sqrt(object.halfX * object.halfX + object.halfY * object.halfY + object.halfZ * object.halfZ);
    object.centerRadius = {x, object.halfY, z, radius};
    object.red = 0.32F + district * 0.43F;
    object.green = 0.42F + randomUnit(id, seed, 5U) * 0.28F;
    object.blue = 0.52F + (1.0F - district) * 0.28F;
    object.id = id;
    return object;
}

inline std::uint64_t estimatedBytes(std::uint32_t count) {
    // Resident scene, visibility, prefix, compacted IDs, reference and transactional spare.
    return static_cast<std::uint64_t>(count) * 288ULL + 4ULL * 1024ULL * 1024ULL;
}

struct SceneBuilder {
    std::vector<Object> objects{};
    std::uint32_t requested{};
    std::uint32_t seed{39U};
    bool active{};

    void begin(std::uint32_t count, std::uint32_t newSeed) {
        if (count > 2'000'003U || estimatedBytes(count) > 512ULL * 1024ULL * 1024ULL) {
            throw std::runtime_error("Scene request exceeds the declared 512 MiB budget");
        }
        std::vector<Object> next{};
        next.reserve(count);
        objects.swap(next);
        requested = count;
        seed = newSeed;
        active = true;
    }

    bool advance() {
        // Only one bounded chunk per UI tick. Cancel never waits for a million-record loop.
        const std::size_t end = std::min(objects.size() + 8192U, static_cast<std::size_t>(requested));
        while (objects.size() < end) {
            objects.push_back(makeObject(static_cast<std::uint32_t>(objects.size()), seed, requested));
        }
        active = objects.size() != requested;
        return !active;
    }

    void cancel() {
        active = false;
        objects.clear();
    }
};

inline int rejectedPlane(const Frustum& planes, const Object& object) {
    for (std::size_t i = 0; i < planes.size(); ++i) {
        const Vec4 plane = planes[i];
        const auto center = object.centerRadius;
        const float distance = plane.x * center.x + plane.y * center.y + plane.z * center.z + plane.w;
        if (distance < -center.w) {
            return static_cast<int>(i);
        }
    }
    return -1;
}

inline float raySphere(Vec3 origin, Vec3 direction, const Object& object) {
    const Vec3 center{object.centerRadius.x, object.centerRadius.y, object.centerRadius.z};
    const Vec3 offset = origin - center;
    const float b = dot(offset, direction);
    const float discriminant = b * b - dot(offset, offset) + object.centerRadius.w * object.centerRadius.w;
    if (discriminant < 0.0F) {
        return std::numeric_limits<float>::infinity();
    }
    const float nearHit = -b - std::sqrt(discriminant);
    const float farHit = -b + std::sqrt(discriminant);
    if (farHit < 0.0F) {
        return std::numeric_limits<float>::infinity();
    }
    return std::max(nearHit, 0.0F);
}

} // namespace city
