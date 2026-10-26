#pragma once
#include "benchmark.hpp"

// Independent small fixtures, not a second call to the production gravity helper.
void testProductContract() {
    const std::vector<lab::Body> pair{{{-1, 0, 0}, {}, 2}, {{1, 0, 0}, {}, 3}};
    const auto acceleration = lab::directAcceleration(pair, 0, 1, 0.1).acceleration;
    check(std::abs(acceleration.x - 6.0 / std::pow(4.01, 1.5)) < 1e-12, "pair agrees with hand calculation");
    const auto triple = lab::presetBodies(4, 3);
    const auto three = lab::directAcceleration(triple, 2, 1, 0.1).acceleration;
    check(std::abs(three.x) < 1e-12 && std::abs(three.y + 2.0 / std::pow(2.01, 1.5)) < 1e-12, "three-body symmetry agrees with hand calculation");
    std::vector<lab::Body> coincident(256, {{}, {}, 1});
    const auto bounded = lab::buildMassOctree(coincident);
    check(bounded.maximumObservedDepth <= 16, "coincident tree respects depth bound");
    check(lab::length(lab::barnesHutAcceleration(bounded, coincident, 17, 1.2, 1, 0.1).acceleration) == 0, "coincident finite zero acceleration");
    auto corrupt = bounded;
    corrupt.nodes.back().totalMass += 100;
    check(!lab::inspectMassOctree(corrupt, coincident).aggregateMassValid, "inspector checks leaf mass against actual bodies");
    const auto cloud = lab::makeGalaxyBodies(256, lab::galaxySeed);
    const auto tree = lab::buildMassOctree(cloud);
    lab::ForceTrace trace{};
    lab::barnesHutAcceleration(tree, cloud, 17, 1.1, lab::gravity, 0.02, &trace);
    for (const auto index : trace.accepted) {
        check(!lab::pointInsideBounds(cloud[17].position, tree.nodes[index].bounds), "accepted node never contains target");
    }
    lab::Simulation simulation{};
    simulation.reset();
    check(simulation.bodies.size() == 4096, "final preset really has 4096 bodies");
    const auto before = simulation.bodies;
    lab::beginPhysics(simulation);
    std::size_t ticks = 0;
    while (!lab::advancePhysics(simulation) && ++ticks < 10000) {
    }
    check(simulation.steps == 1 && simulation.time == simulation.dt, "all targets commit exactly one fixed step");
    std::size_t moved = 0;
    for (std::size_t i = 0; i < before.size(); ++i) {
        if (lab::length(simulation.bodies[i].position - before[i].position) > 0)
            ++moved;
    }
    check(moved == 4096, "all 4096 bodies update, not a rendered subset");
    lab::EnergyJob energy{};
    energy.start(simulation);
    ticks = 0;
    while (energy.active && ++ticks < 10000)
        energy.tick();
    const auto exactEnergy = lab::systemDiagnostics(simulation.bodies, lab::gravity, simulation.epsilon);
    check(!energy.active && std::abs(energy.result.totalEnergy - exactEnergy.totalEnergy) < 1e-10, "batched energy includes the whole 4096-body snapshot");
    const auto rows = lab::timestepStudy();
    check(rows.size() == 3 && rows[2].positionError < rows[1].positionError && rows[1].positionError < rows[0].positionError, "fixed theta dt study converges to independent circular orbit");
    lab::SurveyJob survey{};
    survey.start(simulation);
    ticks = 0;
    while (survey.active && ++ticks < 10000)
        survey.tick();
    check(!survey.active && survey.row == 4, "full 4096 snapshot force sweep completes bounded work");
    for (const auto& row : survey.rows) {
        check(std::isfinite(row.absoluteRmsError) && std::isfinite(row.normalizedRmsError), "sweep publishes finite absolute/RMS errors");
    }
}
