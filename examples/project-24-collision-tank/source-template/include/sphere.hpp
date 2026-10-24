#pragma once
#include "lab.hpp"

namespace lab {
#if LAB_CHECKPOINT >= 9
#define COURSE_HAS_3D 1

struct Vec3 {
    double x = 0.0;
    double y = 0.0;
    double z = 0.0;
};

inline Vec3 add3(Vec3 a, Vec3 b) {
    return {a.x + b.x, a.y + b.y, a.z + b.z};
}

inline Vec3 sub3(Vec3 a, Vec3 b) {
    return {a.x - b.x, a.y - b.y, a.z - b.z};
}

inline Vec3 mul3(Vec3 a, double s) {
    return {a.x * s, a.y * s, a.z * s};
}

inline double dot3(Vec3 a, Vec3 b) {
    return a.x * b.x + a.y * b.y + a.z * b.z;
}

inline Vec3 cross3(Vec3 a, Vec3 b) {
    return {a.y * b.z - a.z * b.y, a.z * b.x - a.x * b.z, a.x * b.y - a.y * b.x};
}

inline bool finite3(Vec3 v) {
    return std::isfinite(v.x) && std::isfinite(v.y) && std::isfinite(v.z);
}

inline Vec3 unit3(Vec3 value, Vec3 fallback = {1.0, 0.0, 0.0}) {
    const double length = std::sqrt(dot3(value, value));
    return std::isfinite(length) && length > kCollisionEpsilon ? mul3(value, 1.0 / length) : fallback;
}

struct Sphere {
    Vec3 position{};
    Vec3 velocity{};
    double radius = 0.4;
    double inverseMass = 1.0;
    std::uint32_t color = 0xffffffffU;
    double restitution = 1.0;
};

inline bool finiteSphere(const Sphere& body) {
    return finite3(body.position) && finite3(body.velocity) && std::isfinite(body.radius) && body.radius > 0.0 && std::isfinite(body.inverseMass) && body.inverseMass >= 0.0 && std::isfinite(body.restitution) && body.restitution >= 0.0 && body.restitution <= 1.0;
}

struct SphereContact {
    bool colliding = false;
    Vec3 normal{1.0, 0.0, 0.0};
    double penetration = 0.0;
};

inline SphereContact findSphereContact(const Sphere& a, const Sphere& b) {
    if (!finiteSphere(a) || !finiteSphere(b)) {
        return {};
    }
    const Vec3 delta = sub3(b.position, a.position);
    const double distanceSquared = dot3(delta, delta);
    const double radiusSum = a.radius + b.radius;
    if (!std::isfinite(distanceSquared) || !std::isfinite(radiusSum) || distanceSquared >= radiusSum * radiusSum) {
        return {};
    }
    if (distanceSquared <= kCollisionEpsilon * kCollisionEpsilon) {
        return {true, unit3(mul3(sub3(b.velocity, a.velocity), -1.0)), radiusSum};
    }
    const double distance = std::sqrt(distanceSquared);
    return {true, mul3(delta, 1.0 / distance), radiusSum - distance};
}

// Vẫn là cùng phương trình j; chỉ normal/velocity nay có ba thành phần.
inline double applySphereImpulse(Sphere& a, Sphere& b, const SphereContact& contact, double restitution) {
    if (!contact.colliding || !finiteSphere(a) || !finiteSphere(b) || !finite3(contact.normal) || std::abs(dot3(contact.normal, contact.normal) - 1.0) > 1e-8 || !std::isfinite(contact.penetration) || contact.penetration < 0.0) {
        return 0.0;
    }
    const double speed = dot3(sub3(b.velocity, a.velocity), contact.normal);
    const double bounce = restitution * std::min(a.restitution, b.restitution);
    const double j = normalImpulseMagnitude(speed, a.inverseMass + b.inverseMass, bounce);
    if (!std::isfinite(j)) {
        return 0.0;
    }
    const Vec3 impulse = mul3(contact.normal, j);
    a.velocity = sub3(a.velocity, mul3(impulse, a.inverseMass));
    b.velocity = add3(b.velocity, mul3(impulse, b.inverseMass));
    return j;
}

inline void correctSpherePenetration(Sphere& a, Sphere& b, const SphereContact& contact, double percentage, double slop) {
    const double inverseSum = a.inverseMass + b.inverseMass;
    if (!contact.colliding || !finiteSphere(a) || !finiteSphere(b) || !finite3(contact.normal) || std::abs(dot3(contact.normal, contact.normal) - 1.0) > 1e-8 || !std::isfinite(contact.penetration) || contact.penetration < 0.0 || !std::isfinite(percentage) || !std::isfinite(slop) || !std::isfinite(inverseSum) || inverseSum <= kCollisionEpsilon) {
        return;
    }
    const double amount = std::max(contact.penetration - std::max(0.0, slop), 0.0) * std::clamp(percentage, 0.0, 1.0) / inverseSum;
    a.position = sub3(a.position, mul3(contact.normal, amount * a.inverseMass));
    b.position = add3(b.position, mul3(contact.normal, amount * b.inverseMass));
}

inline std::vector<Sphere> makeSpheres(std::uint32_t seed, bool elastic = false) {
    std::vector<Sphere> bodies;
    SeededRandom random(seed);
    const auto colors = makeTankBalls(seed, elastic);
    for (int z = 0; z < 4; ++z) {
        for (int y = 0; y < 8; ++y) {
            for (int x = 0; x < 8; ++x) {
                const auto index = bodies.size();
                const double nz = 2.0 * random.nextUnit() - 1.0;
                const double angle = 2.0 * kPi * random.nextUnit();
                const double radial = std::sqrt(std::max(0.0, 1.0 - nz * nz));
                const double speed = 2.2 * (0.75 + 0.5 * random.nextUnit());
                bodies.push_back({{-7.0 + 2.0 * x, -4.375 + 1.25 * y, -4.5 + 3.0 * z}, {speed * radial * std::cos(angle), speed * radial * std::sin(angle), speed * nz}, 0.32 + 0.04 * static_cast<double>(index % 4), colors[index].inverseMass, colors[index].color, colors[index].restitution});
            }
        }
    }
    return bodies;
}

// Sáu mặt tường đứng yên; delta momentum của bóng là impulse bên ngoài.
inline Vec3 resolveSphereWalls(Sphere& body, double restitution) {
    if (!finiteSphere(body) || !std::isfinite(restitution) || body.inverseMass == 0.0 || body.radius >= 5.0) {
        return {};
    }
    const Vec3 previous = body.velocity;
    double* positions[] = {&body.position.x, &body.position.y, &body.position.z};
    double* velocities[] = {&body.velocity.x, &body.velocity.y, &body.velocity.z};
    const double extents[] = {8.0, 5.0, 6.0};
    const double e = std::clamp(restitution, 0.0, 1.0) * body.restitution;
    for (int axis = 0; axis < 3; ++axis) {
        const double limit = extents[axis] - body.radius;
        if (*positions[axis] < -limit) {
            *positions[axis] = -limit;
            if (*velocities[axis] < 0.0)
                *velocities[axis] = -*velocities[axis] * e;
        }
        if (*positions[axis] > limit) {
            *positions[axis] = limit;
            if (*velocities[axis] > 0.0)
                *velocities[axis] = -*velocities[axis] * e;
        }
    }
    return mul3(sub3(body.velocity, previous), 1.0 / body.inverseMass);
}

struct SphereDebug {
    Vec3 point{};
    Vec3 normal{};
    double impulse = 0.0;
};

struct SphereStats {
    std::size_t pairChecks = 0;
    std::size_t contacts = 0;
    std::size_t impulses = 0;
    Vec3 wallImpulse{};
    std::vector<SphereDebug> debugContacts;
    bool valid = true;
};

inline SphereStats stepSpheres(std::vector<Sphere>& bodies, const CollisionStepSettings& settings) {
    SphereStats stats;
    if (bodies.size() > 512 || !std::isfinite(settings.deltaSeconds) || settings.deltaSeconds <= 0.0 || settings.deltaSeconds > 1.0 / 30.0 || !std::isfinite(settings.restitution) || settings.restitution < 0.0 || settings.restitution > 1.0 || settings.solverIterations < 1 || settings.solverIterations > 8 || !std::isfinite(settings.correctionPercent) || settings.correctionPercent < 0.0 || settings.correctionPercent > 1.0 || !std::isfinite(settings.penetrationSlop) || settings.penetrationSlop < 0.0) {
        stats.valid = false;
        return stats;
    }
    for (const auto& body : bodies) {
        if (!finiteSphere(body) || body.radius >= 5.0) {
            stats.valid = false;
            return stats;
        }
    }
    for (auto& body : bodies) {
        if (body.inverseMass > 0.0)
            body.position = add3(body.position, mul3(body.velocity, settings.deltaSeconds));
    }
    for (int iteration = 0; iteration < settings.solverIterations; ++iteration) {
        for (auto& body : bodies)
            stats.wallImpulse = add3(stats.wallImpulse, resolveSphereWalls(body, settings.restitution));
        for (std::size_t i = 0; i < bodies.size(); ++i) {
            for (std::size_t j = i + 1; j < bodies.size(); ++j) {
                ++stats.pairChecks;
                const auto contact = findSphereContact(bodies[i], bodies[j]);
                if (!contact.colliding)
                    continue;
                ++stats.contacts;
                const double impulse = applySphereImpulse(bodies[i], bodies[j], contact, settings.restitution);
                if (impulse > 0.0)
                    ++stats.impulses;
                if (iteration == 0 && stats.debugContacts.size() < 48)
                    stats.debugContacts.push_back({add3(bodies[i].position, mul3(contact.normal, bodies[i].radius)), contact.normal, impulse});
                correctSpherePenetration(bodies[i], bodies[j], contact, settings.correctionPercent, settings.penetrationSlop);
            }
        }
    }
    for (auto& body : bodies)
        stats.wallImpulse = add3(stats.wallImpulse, resolveSphereWalls(body, settings.restitution));
    return stats;
}

struct SphereMetrics {
    Vec3 momentum{};
    double energy = 0.0;
    double penetration = 0.0;
    std::size_t overlaps = 0;
    bool finite = true;
};

inline SphereMetrics measureSpheres(const std::vector<Sphere>& bodies) {
    SphereMetrics metrics;
    for (const auto& body : bodies) {
        metrics.finite = metrics.finite && finiteSphere(body);
        if (body.inverseMass > 0.0) {
            metrics.momentum = add3(metrics.momentum, mul3(body.velocity, 1.0 / body.inverseMass));
            metrics.energy += 0.5 * dot3(body.velocity, body.velocity) / body.inverseMass;
        }
    }
    for (std::size_t i = 0; i < bodies.size(); ++i) {
        for (std::size_t j = i + 1; j < bodies.size(); ++j) {
            const auto contact = findSphereContact(bodies[i], bodies[j]);
            if (contact.colliding) {
                ++metrics.overlaps;
                metrics.penetration = std::max(metrics.penetration, contact.penetration);
            }
        }
    }
    return metrics;
}
#endif
} // namespace lab
