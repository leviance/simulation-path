#include "neighbor_dynamics.hpp"
#include <cstdlib>
#include <iostream>
#include <string_view>

namespace {
int failures = 0;

// Cả Debug và Release đều thực thi các phép kiểm, không phụ thuộc assert/NDEBUG.
void check(bool condition, std::string_view label) {
    if (!condition) {
        ++failures;
        std::cerr << "FAIL: " << label << '\n';
    }
}

neighbors::System makeApproach() {
    neighbors::System system = pbc::makeGas(4, 44);
    system.particles.resize(2);
    for (std::size_t i = 0; i < 2; ++i) {
        system.particles[i].position = {3.0 + 3.2 * double(i), 6.0};
        system.particles[i].unwrapped = system.particles[i].position;
        system.particles[i].velocity = {};
    }
    return system;
}

void move(neighbors::System& system, std::size_t index, pbc::Vec2 delta) {
    pbc::Particle& particle = system.particles[index];
    particle.position = pbc::wrapPosition(pbc::add(particle.position, delta), system.box);
    particle.unwrapped = pbc::add(particle.unwrapped, delta);
}

void testBuilders() {
    for (const pbc::Box box : {pbc::Box{6.0, 6.0}, pbc::Box{6.0, 10.0}, pbc::Box{12.0, 8.0}}) {
        neighbors::System system = pbc::makeGas(36, 44);
        system.box = box;
        for (std::size_t i = 0; i < system.particles.size(); ++i) {
            system.particles[i].position = {std::fmod(double(i) * 0.61803398875, 1.0) * box.width, std::fmod(double(i) * 0.41421356237 + 0.13, 1.0) * box.height};
            system.particles[i].unwrapped = system.particles[i].position;
        }
        neighbors::NeighborList naive;
        neighbors::NeighborList grid;
        check(neighbors::rebuildNaive(system, 0.4, 0, naive), "naive build");
        check(neighbors::rebuildGrid(system, 0.4, 0, grid), "grid build");
        check(grid.pairs == naive.pairs, "grid equals naive including two-cell wrapped axes");
        check(std::adjacent_find(grid.pairs.begin(), grid.pairs.end()) == grid.pairs.end(), "no duplicate pairs");
    }
    neighbors::System pair = makeApproach();
    move(pair, 0, {0.4, 0.0});
    neighbors::NeighborList list;
    check(neighbors::ensureList(pair, 0.4, 0, list), "buffer pair build");
    check(list.pairs.size() == 1, "pair inside list radius");
    check(neighbors::evaluateListed(pair, list).activePairs == 0, "buffer has no force");
    check(neighbors::auditForces(pair, list).passed, "buffer agrees with all pairs");
    pair.particles[0].position = {0.2, 0.2};
    pair.particles[1].position = {11.3, 11.3};
    for (pbc::Particle& particle : pair.particles)
        particle.unwrapped = particle.position;
    check(neighbors::ensureList(pair, 0.4, 1, list), "corner refresh");
    check(list.pairs.size() == 1 && neighbors::auditForces(pair, list).passed, "periodic diagonal pair");
}

void testLifetime() {
    neighbors::System system = makeApproach();
    neighbors::NeighborList list;
    check(neighbors::ensureList(system, 0.5, 0, list), "initial list");
    move(system, 0, {0.125, 0.0});
    check(!neighbors::needsRebuild(system, 0.5, 0, list), "reuse below half skin");
    move(system, 0, {0.125, 0.0});
    check(neighbors::needsRebuild(system, 0.5, 0, list), "exact half skin rebuilds");
    check(neighbors::ensureList(system, 0.5, 0, list), "threshold refresh");
    move(system, 0, {-24.0, 0.0});
    check(neighbors::maximumDisplacement(system, list) == 24.0, "unwrapped detects multiple crossings");
    check(neighbors::ensureList(system, 0.5, 0, list), "multiple wrap refresh");
    check(neighbors::needsRebuild(system, 0.5, 1, list), "generation invalidation");
    check(neighbors::needsRebuild(system, 0.8, 0, list), "skin invalidation");
    system.box.width += 1.0;
    check(neighbors::needsRebuild(system, 0.5, 0, list), "box invalidation");
    system.box.width -= 1.0;
    system.parameters.cutoff = 2.4;
    check(neighbors::needsRebuild(system, 0.5, 0, list), "cutoff invalidation");
    system.parameters.cutoff = 2.5;
    system.particles.pop_back();
    check(neighbors::needsRebuild(system, 0.5, 0, list), "count invalidation");
    for (const double skin : {0.0, -1.0, 4.0, std::numeric_limits<double>::infinity()}) {
        check(!neighbors::ensureList(system, skin, 0, list), "invalid skin rejected");
    }
}

void testStaleList() {
    neighbors::System system = makeApproach();
    neighbors::NeighborList list;
    check(neighbors::ensureList(system, 0.4, 0, list), "initial empty list");
    move(system, 0, {0.8, 0.0});
    const neighbors::Audit stale = neighbors::auditForces(system, list);
    check(!stale.passed && stale.missingPairs == 1 && stale.forceError > 0.0, "stale list misses interacting pair");
    check(neighbors::evaluateListed(system, list).valid, "finite is not the same as complete");
    check(neighbors::ensureList(system, 0.4, 0, list), "refresh stale list");
    check(neighbors::auditForces(system, list).passed, "repaired list agrees with all pairs");
}

void testVerletAndRollback() {
    neighbors::System system = makeApproach();
    system.particles[0].velocity.x = 400.0;
    neighbors::System reference = system;
    neighbors::NeighborList list;
    check(neighbors::ensureList(system, 0.4, 0, list), "pre-drift build");
    check(neighbors::cachedVerletStep(system, list, 0.4, 0, 0.002), "cached step");
    check(pbc::verletStep(reference, 0.002), "reference step");
    check(list.rebuilds == 2, "refresh after drift before second force");
    for (std::size_t i = 0; i < system.particles.size(); ++i) {
        check(pbc::length(pbc::subtract(system.particles[i].velocity, reference.particles[i].velocity)) < 1.0e-10, "same velocity as all pairs");
    }
    system = makeApproach();
    system.particles[0].velocity.x = 1600.0;
    list = {};
    check(neighbors::ensureList(system, 0.4, 0, list), "rollback starting list");
    const neighbors::System saved = system;
    const neighbors::NeighborList savedList = list;
    check(!neighbors::cachedVerletStep(system, list, 0.4, 0, 0.002), "overlap after drift rejected");
    check(system.elapsed == saved.elapsed && system.particles[0].position.x == saved.particles[0].position.x && system.particles[0].unwrapped.x == saved.particles[0].unwrapped.x && system.particles[0].velocity.x == saved.particles[0].velocity.x, "model rollback");
    check(list.pairs == savedList.pairs && list.rebuilds == savedList.rebuilds && list.buildChecks == savedList.buildChecks && list.forceChecks == savedList.forceChecks && list.reference[0].x == savedList.reference[0].x, "cache and counters rollback");
    list.pairs = {{1, 0}};
    check(!neighbors::evaluateListed(system, list).valid, "invalid pair indices rejected");
}

void testWorkAndTrajectory() {
    check(neighbors::validateNeighborList(), "200-step trajectory, force, energy and momentum validation");
    const neighbors::WorkReport a = neighbors::measureWork(64, 0.4);
    const neighbors::WorkReport b = neighbors::measureWork(64, 0.4);
    check(a.passed && b.passed, "work experiment force check");
    check(a.buildChecks == b.buildChecks && a.forceChecks == b.forceChecks && a.rebuilds == b.rebuilds, "deterministic counts");
    check(a.allPairsChecks == 200 * 64 * 63, "two force evaluations per step");
    check(a.buildChecks > 0 && a.forceChecks > 0 && a.buildChecks + a.forceChecks < a.allPairsChecks, "count both construction and force work");
    check(!neighbors::measureWork(1000, 0.4).passed && !neighbors::measureWork(64, 0.4, 10000).passed, "work budget enforced");
}
} // namespace

int main() {
    testBuilders();
    testLifetime();
    testStaleList();
    testVerletAndRollback();
    testWorkAndTrajectory();
    if (failures != 0)
        return EXIT_FAILURE;
    std::cout << "Project 44: all checks passed.\n";
    return EXIT_SUCCESS;
}
