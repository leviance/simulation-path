#pragma once

#include "gpu_engine.hpp"

#include <iostream>

namespace molecular {

// Kiểm buffer nhỏ đã hoàn tất. Không readback toàn hệ khi chạy tương tác.
inline bool validateForces(lab::GlApi& gl, const Engine& engine) {
    const auto& bank = engine.storage.banks.at(engine.current);
    const auto positions = engine.readParticles(gl, bank.positions);
    const auto actual = engine.readParticles(gl, bank.forces);
    const auto expected = referenceForces(engine.storage.plan, positions);
    double maximumError = 0;
    for (std::size_t i = 0; i < actual.size(); ++i) {
        maximumError = std::max(maximumError, std::abs(static_cast<double>(actual[i].x) - expected[i].x));
        maximumError = std::max(maximumError, std::abs(static_cast<double>(actual[i].y) - expected[i].y));
        if (!closeEnough(actual[i].x, expected[i].x) || !closeEnough(actual[i].y, expected[i].y) || !closeEnough(actual[i].z, expected[i].z)) {
            std::cerr << "Force/U mismatch at particle " << i << '\n';
            return false;
        }
    }
    std::cout << "N=" << positions.size() << " step=" << engine.steps << " maximum force error=" << maximumError << '\n';
    return true;
}

inline bool validateDiagnostics(lab::GlApi& gl, const Engine& engine) {
    const auto& bank = engine.storage.banks.at(engine.current);
    const auto velocities = engine.readParticles(gl, bank.velocities);
    const auto forces = engine.readParticles(gl, bank.forces);
    double kinetic = 0;
    double potential = 0;
    double momentumX = 0;
    double momentumY = 0;
    for (std::size_t i = 0; i < velocities.size(); ++i) {
        const auto& velocity = velocities[i];
        kinetic += 0.5 * (static_cast<double>(velocity.x) * velocity.x + static_cast<double>(velocity.y) * velocity.y);
        potential += forces[i].z;
        momentumX += velocity.x;
        momentumY += velocity.y;
    }
    return closeEnough(engine.totals.x, kinetic) && closeEnough(engine.totals.y, potential) && closeEnough(engine.totals.z, momentumX) && closeEnough(engine.totals.w, momentumY);
}

// Đối chiếu một bước với oracle CPU trên chính input float đã đọc, không đòi bitwise equality.
inline bool validateStep(lab::GlApi& gl, const Engine& engine, const std::vector<Float4>& previousPositions, const std::vector<Float4>& previousVelocities) {
    const auto& plan = engine.storage.plan;
    const auto beforeForces = referenceForces(plan, previousPositions);
    std::vector<Float4> predictedPositions(plan.count);
    std::vector<Float4> halfVelocities(plan.count);
    for (std::uint32_t i = 0; i < plan.count; ++i) {
        const float vx = previousVelocities[i].x + 0.5F * timeStep * beforeForces[i].x;
        const float vy = previousVelocities[i].y + 0.5F * timeStep * beforeForces[i].y;
        const auto driftX = compensatedDrift(previousPositions[i].x, timeStep * vx, previousVelocities[i].z, plan.width);
        const auto driftY = compensatedDrift(previousPositions[i].y, timeStep * vy, previousVelocities[i].w, plan.height);
        predictedPositions[i] = {driftX.position, driftY.position, 0, 0};
        halfVelocities[i] = {vx, vy, 0, 0};
    }
    const auto afterForces = referenceForces(plan, predictedPositions);
    const auto& bank = engine.storage.banks.at(engine.current);
    const auto positions = engine.readParticles(gl, bank.positions);
    const auto velocities = engine.readParticles(gl, bank.velocities);
    for (std::uint32_t i = 0; i < plan.count; ++i) {
        const float vx = halfVelocities[i].x + 0.5F * timeStep * afterForces[i].x;
        const float vy = halfVelocities[i].y + 0.5F * timeStep * afterForces[i].y;
        if (!closeEnough(minimumImage(positions[i].x - predictedPositions[i].x, plan.width), 0) || !closeEnough(minimumImage(positions[i].y - predictedPositions[i].y, plan.height), 0) || !closeEnough(velocities[i].x, vx) || !closeEnough(velocities[i].y, vy)) {
            return false;
        }
    }
    return true;
}

} // namespace molecular
