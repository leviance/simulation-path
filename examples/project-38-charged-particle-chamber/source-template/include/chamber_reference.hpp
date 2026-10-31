#pragma once
#include "chamber_math.hpp"

#if LAB_CHECKPOINT >= 5
namespace chamber {

// Independent double-precision closed form, not another call to stepBoris.
namespace exact {
struct Vector {
    double x{}, y{}, z{};
};

inline Vector from(Vec3 v) {
    return {v.x, v.y, v.z};
}

inline Vector operator+(Vector a, Vector b) {
    return {a.x + b.x, a.y + b.y, a.z + b.z};
}

inline Vector operator-(Vector a, Vector b) {
    return {a.x - b.x, a.y - b.y, a.z - b.z};
}

inline Vector operator*(Vector a, double scale) {
    return {a.x * scale, a.y * scale, a.z * scale};
}

inline double dot(Vector a, Vector b) {
    return a.x * b.x + a.y * b.y + a.z * b.z;
}

inline Vector cross(Vector a, Vector b) {
    return {a.y * b.z - a.z * b.y, a.z * b.x - a.x * b.z, a.x * b.y - a.y * b.x};
}

inline double norm(Vector a) {
    return std::sqrt(dot(a, a));
}
} // namespace exact

struct ReferenceState {
    exact::Vector position{}, velocity{};
};

inline ReferenceState analyticState(const Particle& initial, const Fields& fields, double time) {
    const exact::Vector x0 = exact::from(position(initial));
    const exact::Vector v0 = exact::from(velocity(initial));
    const exact::Vector electric = exact::from(fields.electric);
    const exact::Vector magnetic = exact::from(fields.magnetic);
    const double chargeOverMass = static_cast<double>(initial.positionCharge.w) * static_cast<double>(fields.chargeScale) / initial.velocityMass.w;
    const exact::Vector acceleration = electric * chargeOverMass;
    const double fieldLength = exact::norm(magnetic);

    if (fieldLength < 1.0e-12 || std::abs(chargeOverMass) < 1.0e-12) {
        return {x0 + v0 * time + acceleration * (0.5 * time * time), v0 + acceleration * time};
    }

    const exact::Vector axis = magnetic * (1.0 / fieldLength);
    const double omega = chargeOverMass * fieldLength;
    const exact::Vector parallelVelocity = axis * exact::dot(v0, axis);
    const exact::Vector parallelAcceleration = axis * exact::dot(acceleration, axis);
    const exact::Vector drift = exact::cross(acceleration, axis) * (1.0 / omega);
    const exact::Vector perpendicular = v0 - parallelVelocity - drift;
    const exact::Vector turn = exact::cross(perpendicular, axis);
    const double angle = omega * time;
    const double sine = std::sin(angle);
    const double cosine = std::cos(angle);
    // 2 sin^2(angle/2) avoids cancellation in 1-cos(angle) near zero.
    const double oneMinusCosine = 2.0 * std::sin(0.5 * angle) * std::sin(0.5 * angle);
    return {
        x0 + (parallelVelocity + drift) * time + parallelAcceleration * (0.5 * time * time) + perpendicular * (sine / omega) + turn * (oneMinusCosine / omega),
        parallelVelocity + parallelAcceleration * time + drift + perpendicular * cosine + turn * sine};
}

inline float preparedPhaseSpan(const Settings& settings) {
    if (length(settings.fields.electric) > 1.0e-7F || length(settings.fields.magnetic) < 1.0e-5F || std::abs(settings.fields.chargeScale) < 1.0e-5F)
        return 0;
    return settings.phaseSpan;
}

inline Particle snapshotParticle(std::uint32_t id, const Settings& settings) {
    Particle p = initialParticle(id, settings);
    const float span = preparedPhaseSpan(settings);
    if (id < 2U || span == 0)
        return p;
    // This prepares x0/v0 once, using the uniform-B reference. Rendering never evaluates this formula.
    // After tick zero, ALL particles are advanced only by the force-based Boris kernel.
    const float phase = span * random01(id, 5U, settings.seed);
    const ReferenceState prepared = analyticState(p, settings.fields, phase);
    setPosition(p, {static_cast<float>(prepared.position.x), static_cast<float>(prepared.position.y), static_cast<float>(prepared.position.z)});
    setVelocity(p, {static_cast<float>(prepared.velocity.x), static_cast<float>(prepared.velocity.y), static_cast<float>(prepared.velocity.z)});
    return p;
}

inline double positionError(const Particle& actual, const ReferenceState& expected) {
    return exact::norm(exact::from(position(actual)) - expected.position);
}

inline double velocityError(const Particle& actual, const ReferenceState& expected) {
    return exact::norm(exact::from(velocity(actual)) - expected.velocity);
}

struct ValidationReport {
    std::size_t checked{};
    std::size_t mismatchCount{};
    std::size_t firstMismatch{std::numeric_limits<std::size_t>::max()};
    double maximumPositionError{};
    double maximumVelocityError{};
    bool allFinite{true};

    bool passed() const {
        return checked > 0U && mismatchCount == 0U && allFinite;
    }
};

inline bool nearComponent(float actual, float expected, float absoluteTolerance, float relativeTolerance) {
    if (!std::isfinite(actual) || !std::isfinite(expected))
        return false;
    return std::abs(actual - expected) <= absoluteTolerance + relativeTolerance * std::abs(expected);
}

inline bool sameParticle(const Particle& actual, const Particle& expected, float absoluteTolerance, float relativeTolerance) {
    if (!validParticle(actual) || !validParticle(expected))
        return false;
    const std::array<float, 8> a{actual.positionCharge.x, actual.positionCharge.y, actual.positionCharge.z, actual.positionCharge.w, actual.velocityMass.x, actual.velocityMass.y, actual.velocityMass.z, actual.velocityMass.w};
    const std::array<float, 8> b{expected.positionCharge.x, expected.positionCharge.y, expected.positionCharge.z, expected.positionCharge.w, expected.velocityMass.x, expected.velocityMass.y, expected.velocityMass.z, expected.velocityMass.w};
    for (std::size_t component = 0; component < a.size(); ++component) {
        if (!nearComponent(a[component], b[component], absoluteTolerance, relativeTolerance))
            return false;
    }
    return true;
}

inline void inspectParticle(ValidationReport& report, std::size_t id, const Particle& actual, const Particle& expected, const ReferenceState& analytic, float absoluteTolerance = 3.0e-4F, float relativeTolerance = 3.0e-4F) {
    ++report.checked;
    if (!validParticle(actual))
        report.allFinite = false;
    if (!sameParticle(actual, expected, absoluteTolerance, relativeTolerance)) {
        if (report.mismatchCount == 0U)
            report.firstMismatch = id;
        ++report.mismatchCount;
    }
    if (validParticle(actual)) {
        report.maximumPositionError = std::max(report.maximumPositionError, positionError(actual, analytic));
        report.maximumVelocityError = std::max(report.maximumVelocityError, velocityError(actual, analytic));
    }
}

} // namespace chamber
#endif
