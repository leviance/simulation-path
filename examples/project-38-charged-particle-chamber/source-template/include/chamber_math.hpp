#pragma once

#ifndef LAB_CHECKPOINT
#define LAB_CHECKPOINT 12
#endif

#include <algorithm>
#include <array>
#include <cmath>
#include <cstddef>
#include <cstdint>
#include <limits>
#include <string>

namespace chamber {

struct Vec3 {
    float x{};
    float y{};
    float z{};
};

inline Vec3 operator+(Vec3 a, Vec3 b) {
    return {a.x + b.x, a.y + b.y, a.z + b.z};
}

inline Vec3 operator-(Vec3 a, Vec3 b) {
    return {a.x - b.x, a.y - b.y, a.z - b.z};
}

inline Vec3 operator*(Vec3 a, float scale) {
    return {a.x * scale, a.y * scale, a.z * scale};
}

inline float dot(Vec3 a, Vec3 b) {
    return a.x * b.x + a.y * b.y + a.z * b.z;
}

inline Vec3 cross(Vec3 a, Vec3 b) {
    return {a.y * b.z - a.z * b.y, a.z * b.x - a.x * b.z, a.x * b.y - a.y * b.x};
}

inline float length(Vec3 value) {
    return std::sqrt(dot(value, value));
}

inline bool finite(Vec3 value) {
    return std::isfinite(value.x) && std::isfinite(value.y) && std::isfinite(value.z);
}

inline bool sameVector(Vec3 a, Vec3 b) {
    return a.x == b.x && a.y == b.y && a.z == b.z;
}

inline Vec3 normalized(Vec3 value) {
    const float magnitude = length(value);
    if (magnitude <= 1.0e-8F || !std::isfinite(magnitude))
        return {};
    return value * (1.0F / magnitude);
}

#if LAB_CHECKPOINT >= 2
// Two vec4 records make the CPU offsets agree with std430, without padding guesses.
struct alignas(16) Vec4 {
    float x{}, y{}, z{}, w{};
};

struct alignas(16) Particle {
    Vec4 positionCharge{};
    Vec4 velocityMass{};
};

static_assert(sizeof(Particle) == 32);
static_assert(alignof(Particle) == 16);
static_assert(offsetof(Particle, velocityMass) == 16);

inline Vec3 position(const Particle& p) {
    return {p.positionCharge.x, p.positionCharge.y, p.positionCharge.z};
}

inline Vec3 velocity(const Particle& p) {
    return {p.velocityMass.x, p.velocityMass.y, p.velocityMass.z};
}

inline void setPosition(Particle& p, Vec3 value) {
    p.positionCharge.x = value.x;
    p.positionCharge.y = value.y;
    p.positionCharge.z = value.z;
}

inline void setVelocity(Particle& p, Vec3 value) {
    p.velocityMass.x = value.x;
    p.velocityMass.y = value.y;
    p.velocityMass.z = value.z;
}

inline bool validParticle(const Particle& p) {
    return finite(position(p)) && finite(velocity(p)) && std::isfinite(p.positionCharge.w) && std::isfinite(p.velocityMass.w) && p.velocityMass.w > 0.0F;
}

enum class Preset : int {
    Straight,
    Circle,
    Helix,
    Electric
};

struct Fields {
    Vec3 electric{};
    Vec3 magnetic{0.0F, 1.2F, 0.0F};
    float chargeScale{1.0F};
};

struct Settings {
    std::size_t count{1'000'000U};
    std::uint32_t seed{0x38c0ffeeU};
    Vec3 initialVelocity{2.2F, 0.65F, 0.0F};
    Fields fields{{}, {0.35F, 1.1F, 0.3F}, 1.0F};
    float dt{1.0F / 240.0F};
    Preset preset{Preset::Helix};
#if LAB_CHECKPOINT >= 6
    float phaseSpan{6.0F};
#else
    float phaseSpan{};
#endif
};

inline bool sameSettings(const Settings& a, const Settings& b) {
    return a.count == b.count && a.seed == b.seed && a.dt == b.dt && a.preset == b.preset && a.phaseSpan == b.phaseSpan && a.fields.chargeScale == b.fields.chargeScale && sameVector(a.initialVelocity, b.initialVelocity) && sameVector(a.fields.electric, b.fields.electric) && sameVector(a.fields.magnetic, b.fields.magnetic);
}

inline Settings presetSettings(Preset preset) {
    Settings settings{};
    settings.preset = preset;
    if (preset == Preset::Straight) {
        settings.fields.magnetic = {};
        settings.initialVelocity = {1.8F, 0.35F, 0.0F};
    }
    if (preset == Preset::Circle) {
        settings.fields.magnetic = {0.0F, 1.2F, 0.0F};
        settings.initialVelocity = {2.2F, 0.0F, 0.0F};
    }
    if (preset == Preset::Electric) {
        settings.fields.magnetic = {};
        settings.fields.electric = {0.0F, 0.6F, 0.0F};
        settings.initialVelocity = {1.3F, 0.0F, 0.0F};
    }
    return settings;
}

inline std::uint32_t mixBits(std::uint32_t value) {
    value = (value ^ (value >> 16U)) * 0x7feb352dU;
    value = (value ^ (value >> 15U)) * 0x846ca68bU;
    return value ^ (value >> 16U);
}

inline float random01(std::uint32_t id, std::uint32_t channel, std::uint32_t seed) {
    const std::uint32_t bits = mixBits(id ^ (channel * 0x9e3779b9U) ^ seed);
    return static_cast<float>(bits & 0xffffU) / 65535.0F;
}

inline Particle initialParticle(std::uint32_t id, const Settings& settings) {
    float charge = 1.0F;
    if ((id & 1U) != 0U)
        charge = -1.0F;
    const float speedScale = 0.97F + 0.06F * random01(id, 3U, settings.seed);
    Particle p{};
    p.positionCharge = {
        (random01(id, 0U, settings.seed) - 0.5F) * 0.18F,
        (random01(id, 1U, settings.seed) - 0.5F) * 0.16F,
        (random01(id, 2U, settings.seed) - 0.5F) * 0.18F,
        charge};
    const Vec3 v = settings.initialVelocity * speedScale;
    p.velocityMass = {v.x, v.y, v.z, 0.98F + 0.04F * random01(id, 4U, settings.seed)};
    // The first pair starts together: opposite curvature cannot be blamed on a different seed.
    if (id < 2U) {
        p.positionCharge = {0.0F, 0.0F, 0.0F, charge};
        p.velocityMass = {settings.initialVelocity.x, settings.initialVelocity.y, settings.initialVelocity.z, 1.0F};
    }
    return p;
}

inline bool validSettings(const Settings& settings, std::string& reason) {
    if (!finite(settings.fields.electric) || !finite(settings.fields.magnetic) || !finite(settings.initialVelocity) || !std::isfinite(settings.fields.chargeScale) || !std::isfinite(settings.dt) || !std::isfinite(settings.phaseSpan)) {
        reason = "Non-finite configuration rejected";
        return false;
    }
    if (length(settings.fields.electric) > 8.0F || length(settings.fields.magnetic) > 8.0F || length(settings.initialVelocity) > 20.0F || std::abs(settings.fields.chargeScale) > 4.0F || settings.dt < 1.0F / 1000.0F || settings.dt > 1.0F / 30.0F || settings.phaseSpan < 0 || settings.phaseSpan > 12) {
        reason = "Outside teaching limits: |E|,|B|<=8, |v0|<=20, |q scale|<=4, 0.001<=dt<=1/30";
        return false;
    }
    if (settings.count < 1U || settings.count > 5'000'000U) {
        reason = "Choose 1..5000000 particles; unsupported requests are not silently reduced";
        return false;
    }
    reason.clear();
    return true;
}
#endif

#if LAB_CHECKPOINT >= 3
inline Vec3 lorentzAcceleration(const Particle& p, const Fields& fields) {
    const float chargeOverMass = p.positionCharge.w * fields.chargeScale / p.velocityMass.w;
    return (fields.electric + cross(velocity(p), fields.magnetic)) * chargeOverMass;
}

// This baseline is intentionally retained for the error experiment, not used by final GPU update.
inline bool stepEuler(Particle& p, const Fields& fields, float dt) {
    if (!validParticle(p) || !finite(fields.electric) || !finite(fields.magnetic) || !std::isfinite(fields.chargeScale) || !std::isfinite(dt) || dt <= 0.0F)
        return false;
    const Vec3 nextPosition = position(p) + velocity(p) * dt;
    const Vec3 nextVelocity = velocity(p) + lorentzAcceleration(p, fields) * dt;
    if (!finite(nextPosition) || !finite(nextVelocity))
        return false;
    setPosition(p, nextPosition);
    setVelocity(p, nextVelocity);
    return true;
}
#endif

#if LAB_CHECKPOINT >= 4
inline bool stepBoris(Particle& p, const Fields& fields, float dt) {
    if (!validParticle(p) || !finite(fields.electric) || !finite(fields.magnetic) || !std::isfinite(fields.chargeScale) || !std::isfinite(dt) || dt <= 0.0F)
        return false;

    // x and v are BOTH stored at full time t. This is not a staggered v(t-dt/2) record.
    const Vec3 oldVelocity = velocity(p);
    const float halfImpulse = 0.5F * dt * p.positionCharge.w * fields.chargeScale / p.velocityMass.w;
    const Vec3 vMinus = oldVelocity + fields.electric * halfImpulse;
    const Vec3 t = fields.magnetic * halfImpulse;
    const Vec3 s = t * (2.0F / (1.0F + dot(t, t)));
    const Vec3 vPrime = vMinus + cross(vMinus, t);
    const Vec3 vPlus = vMinus + cross(vPrime, s);
    const Vec3 nextVelocity = vPlus + fields.electric * halfImpulse;

    // Symmetric half drift before and after the velocity push gives x(t+dt).
    const Vec3 nextPosition = position(p) + (oldVelocity + nextVelocity) * (0.5F * dt);
    if (!finite(nextPosition) || !finite(nextVelocity))
        return false;
    setPosition(p, nextPosition);
    setVelocity(p, nextVelocity);
    return true;
}
#endif

#if LAB_CHECKPOINT >= 6
constexpr std::uint32_t kLocalSize = 256U;
constexpr std::size_t kProbeCount = 33U;
constexpr std::size_t kTrailCount = 17U;
constexpr std::size_t kTrailCapacity = 256U;
constexpr std::size_t kMemoryBudget = 640U * 1024U * 1024U;

struct ComputeLimits {
    int major{};
    int minor{};
    std::int64_t maximumBlockBytes{};
    int maximumGroupsX{};
    int maximumLocalX{};
    int maximumInvocations{};
    int storageBindings{};
    int computeStorageBlocks{};
};

struct Budget {
    std::size_t stateBytes{};
    std::size_t reservedBytes{};
    std::uint32_t groups{};
    std::size_t tailLanes{};
};

inline bool makeBudget(const Settings& settings, const ComputeLimits& limits, Budget& result, std::string& reason) {
    if (!validSettings(settings, reason))
        return false;
    if (settings.count > std::numeric_limits<std::size_t>::max() / (3U * sizeof(Particle))) {
        reason = "Size multiplication overflow";
        return false;
    }
    Budget candidate{};
    candidate.stateBytes = settings.count * sizeof(Particle);
    // Reserve room for current, candidate/job state, probe staging and bounded trails BEFORE allocating.
    candidate.reservedBytes = candidate.stateBytes * 3U + 2U * kProbeCount * sizeof(Particle) + kTrailCount * kTrailCapacity * sizeof(Particle) + 4096U;
#if LAB_CHECKPOINT >= 12
    // Covers both old and candidate bounded HDR targets during a transactional resize.
    candidate.reservedBytes += 64U * 1024U * 1024U;
#endif
    const std::size_t groups = 1U + (settings.count - 1U) / kLocalSize;
    if (limits.major < 4 || (limits.major == 4 && limits.minor < 3) || limits.maximumLocalX < static_cast<int>(kLocalSize) || limits.maximumInvocations < static_cast<int>(kLocalSize) || limits.storageBindings < 3 || limits.computeStorageBlocks < 2 || limits.maximumBlockBytes <= 0 || limits.maximumGroupsX <= 0 || candidate.stateBytes > static_cast<std::uint64_t>(limits.maximumBlockBytes) || groups > static_cast<std::size_t>(limits.maximumGroupsX) || candidate.reservedBytes > kMemoryBudget) {
        reason = "Requested scale NOT verified: OpenGL 4.3, SSBO, workgroup, binding or memory budget exceeded";
        return false;
    }
    candidate.groups = static_cast<std::uint32_t>(groups);
    candidate.tailLanes = groups * kLocalSize - settings.count;
    result = candidate;
    reason.clear();
    return true;
}
#endif

#if LAB_CHECKPOINT >= 2
struct FixedClock {
    double accumulator{};
    double discardedSeconds{};
    double simulatedSeconds{};
    std::uint64_t tick{};

    int advance(double wallSeconds, float dt, bool paused, bool singleStep) {
        if (!std::isfinite(wallSeconds) || !std::isfinite(dt) || dt <= 0.0F)
            return 0;
        if (paused) {
            accumulator = 0.0;
            if (singleStep)
                return 1;
            return 0;
        }
        const double accepted = std::clamp(wallSeconds, 0.0, 0.1);
        discardedSeconds += std::max(0.0, wallSeconds - accepted);
        accumulator += accepted;
        const int available = static_cast<int>(std::floor(accumulator / dt));
        const int steps = std::min(available, 8);
        accumulator -= static_cast<double>(steps) * dt;
        if (available > steps) {
            const double discarded = static_cast<double>(available - steps) * dt;
            accumulator -= discarded;
            discardedSeconds += discarded;
        }
        return steps;
    }

    void commit(int steps, float dt) {
        tick += static_cast<std::uint64_t>(steps);
        simulatedSeconds = static_cast<double>(tick) * static_cast<double>(dt);
    }

    void reset() {
        *this = {};
    }
};
#endif

} // namespace chamber
