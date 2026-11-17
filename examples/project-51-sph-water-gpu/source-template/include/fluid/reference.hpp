#pragma once
#include "fluid/kernel.hpp"
#include <vector>

namespace water51 {
#if LAB_CHECKPOINT >= 2
struct ReferenceState {
    std::vector<Vec3> position;
    std::vector<Vec3> velocity;
    std::vector<Vec3> acceleration;
    std::vector<double> density;
    std::vector<double> pressure;
};

inline ReferenceState makeReference(const Model& model) {
    ReferenceState state;
    state.position.resize(model.count);
    state.velocity.resize(model.count);
    state.acceleration.resize(model.count);
    state.density.resize(model.count);
    state.pressure.resize(model.count);
    for (std::uint32_t i = 0; i < model.count; ++i)
        state.position[i] = seedPoint(model, i);
    return state;
}

struct BoundarySample {
    Vec3 position;
    Vec3 velocity;
};

// A volume lattice of solid samples supplies missing support at all six walls.
// [snippet wall-samples]
inline std::vector<BoundarySample> boundarySamples(const Model& model, Vec3 point, const Body& body) {
    const double radius = 2 * model.h;
    bool nearWall = false;
    for (int a = 0; a < 3; ++a)
        if (point[a] < radius || point[a] > tank[a] - radius)
            nearWall = true;
    const bool nearBody = body.enabled && length(subtract(point, body.position)) < body.radius + radius;
    if (!nearWall && !nearBody)
        return {};
    const int nx = 3 * model.side;
    const int ny = 3 * model.side / 2;
    const int nz = 2 * model.side;
    const int cx = static_cast<int>(std::floor(point.x / model.spacing));
    const int cy = static_cast<int>(std::floor(point.y / model.spacing));
    const int cz = static_cast<int>(std::floor(point.z / model.spacing));
    std::vector<BoundarySample> samples;
    for (int z = cz - 3; z <= cz + 3; ++z) {
        for (int y = cy - 3; y <= cy + 3; ++y) {
            for (int x = cx - 3; x <= cx + 3; ++x) {
                const Vec3 sample{(x + 0.5) * model.spacing, (y + 0.5) * model.spacing, (z + 0.5) * model.spacing};
                const bool outside = x < 0 || x >= nx || y < 0 || y >= ny || z < 0 || z >= nz;
                const bool insideBody = body.enabled && length(subtract(sample, body.position)) < body.radius;
                if (!outside && !insideBody)
                    continue;
                if (length(subtract(point, sample)) >= radius)
                    continue;
                Vec3 velocity{};
                if (insideBody && !outside)
                    velocity = body.velocity;
                samples.push_back({sample, velocity});
            }
        }
    }
    return samples;
}

// [/snippet wall-samples]

// [snippet viscosity]
inline double artificialViscosity(Vec3 displacement, Vec3 relativeVelocity, double rhoi, double rhoj, const Model& m, const Parameters& p) {
    const double approach = dot(relativeVelocity, displacement);
    if (approach >= 0)
        return 0;
    const double mu = m.h * approach / (dot(displacement, displacement) + 0.01 * m.h * m.h);
    return -p.alpha * p.soundSpeed * mu / (0.5 * (rhoi + rhoj));
}

// [/snippet viscosity]
inline void referenceFields(const Model& model, const Parameters& parameters, const Body& body, ReferenceState& state) {
    validate(parameters);
    if (state.position.size() != model.count || state.velocity.size() != model.count)
        throw std::invalid_argument("Reference shape mismatch");
    if (model.count > 1024)
        throw std::length_error("All-pairs is only a small-N correctness oracle");
    for (std::uint32_t i = 0; i < model.count; ++i) {
        double rho = 0;
        for (std::uint32_t j = 0; j < model.count; ++j)
            rho += model.mass * kernel3(length(subtract(state.position[i], state.position[j])), model.h);
        for (const auto& sample : boundarySamples(model, state.position[i], body))
            rho += model.mass * kernel3(length(subtract(state.position[i], sample.position)), model.h);
        if (!std::isfinite(rho) || rho <= 0)
            throw std::runtime_error("Invalid reference density");
        state.density[i] = rho;
        state.pressure[i] = std::max(0.0, parameters.soundSpeed * parameters.soundSpeed * (rho - referenceDensity));
    }
    // [snippet reference-force]
    for (std::uint32_t i = 0; i < model.count; ++i) {
        Vec3 acceleration{0, -parameters.gravity, 0};
        for (std::uint32_t j = 0; j < model.count; ++j) {
            if (i == j)
                continue;
            const Vec3 displacement = subtract(state.position[i], state.position[j]);
            if (length(displacement) >= 2 * model.h)
                continue;
            const double viscosity = artificialViscosity(displacement, subtract(state.velocity[i], state.velocity[j]), state.density[i], state.density[j], model, parameters);
            const double pressureTerm = state.pressure[i] / (state.density[i] * state.density[i]) + state.pressure[j] / (state.density[j] * state.density[j]);
            acceleration = add(acceleration, scale(kernelGradient(displacement, model.h), -model.mass * (pressureTerm + viscosity)));
        }
        for (const auto& sample : boundarySamples(model, state.position[i], body)) {
            const Vec3 displacement = subtract(state.position[i], sample.position);
            const double viscosity = artificialViscosity(displacement, subtract(state.velocity[i], sample.velocity), state.density[i], referenceDensity, model, parameters);
            const double pressureTerm = state.pressure[i] / (state.density[i] * state.density[i]) + state.pressure[i] / (referenceDensity * referenceDensity);
            acceleration = add(acceleration, scale(kernelGradient(displacement, model.h), -model.mass * (pressureTerm + viscosity)));
        }
        state.acceleration[i] = acceleration;
    }
    // [/snippet reference-force]
}

inline double referenceTimestep(const Model& model, const Parameters& parameters, const ReferenceState& state) {
    double vmax = 0;
    double amax = 0;
    for (std::size_t i = 0; i < state.position.size(); ++i) {
        if (!finite(state.velocity[i]) || !finite(state.acceleration[i]))
            throw std::runtime_error("Nonfinite reference state");
        vmax = std::max(vmax, length(state.velocity[i]));
        amax = std::max(amax, length(state.acceleration[i]));
    }
    // [snippet timestep]
    const double acoustic = 0.25 * model.h / (parameters.soundSpeed + vmax + 1);
    const double force = 0.25 * std::sqrt(model.h / std::max(1e-12, amax));
    const double dt = std::min({maximumDt, acoustic, force});
    if (!std::isfinite(dt) || dt < 1e-7)
        throw std::runtime_error("Timestep below safety limit");
    return dt;
    // [/snippet timestep]
}

inline void collide(const Model& model, const Body& body, Vec3& point, Vec3& velocity) {
    const double margin = 0.5 * model.spacing;
    for (int axis = 0; axis < 3; ++axis) {
        if (point[axis] < margin) {
            point[axis] = margin;
            if (velocity[axis] < 0)
                velocity[axis] *= -0.1;
        }
        if (point[axis] > tank[axis] - margin) {
            point[axis] = tank[axis] - margin;
            if (velocity[axis] > 0)
                velocity[axis] *= -0.1;
        }
    }
    if (!body.enabled)
        return;
    const Vec3 delta = subtract(point, body.position);
    const double distance = length(delta);
    const double radius = body.radius + margin;
    if (distance >= radius)
        return;
    Vec3 normal{0, 1, 0};
    if (distance > 1e-12)
        normal = scale(delta, 1 / distance);
    point = add(body.position, scale(normal, radius));
    const double normalSpeed = dot(subtract(velocity, body.velocity), normal);
    if (normalSpeed < 0)
        velocity = subtract(velocity, scale(normal, 1.1 * normalSpeed));
}

inline void referenceIntegrate(const Model& model, const Body& body, ReferenceState& state, double dt) {
    // [snippet integrate]
    for (std::uint32_t i = 0; i < model.count; ++i) {
        state.velocity[i] = add(state.velocity[i], scale(state.acceleration[i], dt));
        state.position[i] = add(state.position[i], scale(state.velocity[i], dt));
        collide(model, body, state.position[i], state.velocity[i]);
    }
    // [/snippet integrate]
}
#endif
} // namespace water51
