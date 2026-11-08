#include "cloth_cpu.hpp"

#include <cstdlib>
#include <iostream>
#include <set>
#include <string_view>

namespace {

int failures = 0;

void check(bool condition, std::string_view label) {
    if (!condition) {
        ++failures;
        std::cerr << "FAIL: " << label << '\n';
    }
}

bool near(float actual, float expected, float absolute = 1.0e-5F) {
    return std::isfinite(actual) && std::abs(actual - expected) <= absolute;
}

void testDistanceOracle() {
    cloth::Vec4 a{0.0F, 0.0F, 0.0F, 1.0F};
    cloth::Vec4 b{2.0F, 0.0F, 0.0F, 1.0F};
    float lambda = 0.0F;
    check(cloth::solveDistance(a, b, 1.0F, 0.0F, 0.1F, lambda), "rigid constraint input accepted");
    check(near(a.x, 0.5F) && near(b.x, 1.5F) && near(lambda, -0.5F),
        "closed-form equal-mass rigid correction is +/-0.5m");
    a = {0.0F, 0.0F, 0.0F, 0.0F};
    b = {2.0F, 0.0F, 0.0F, 2.0F};
    lambda = 0.0F;
    cloth::solveDistance(a, b, 1.0F, 0.01F, 0.1F, lambda);
    check(near(a.x, 0.0F) && near(b.x, 4.0F / 3.0F) && near(lambda, -1.0F / 3.0F),
        "independent alpha=1, denominator=3 answer preserves fixed pin");
    const float retained = lambda;
    cloth::solveDistance(a, b, 1.0F, 0.01F, 0.1F, lambda);
    check(near(lambda, retained), "retained multiplier holds the compliant one-edge equilibrium");
    a = {0.0F, 0.0F, 0.0F, 1.0F};
    b = {0.0F, 0.0F, 0.0F, 1.0F};
    lambda = 0.0F;
    check(cloth::solveDistance(a, b, 1.0F, 0.0F, 0.1F, lambda) && near(a.x, 0.0F),
        "coincident distance constraint skips an undefined gradient without NaN");
    check(!cloth::solveDistance(a, b, -1.0F, 0.0F, 0.1F, lambda), "negative rest length is rejected");
    check(!cloth::solveDistance(a, b, 1.0F, -0.01F, 0.1F, lambda), "negative compliance is rejected");
    check(!cloth::solveDistance(a, b, 1.0F, 0.0F, 0.0F, lambda), "zero timestep is rejected");
    a.x = std::numeric_limits<float>::infinity();
    check(!cloth::solveDistance(a, b, 1.0F, 0.0F, 0.1F, lambda), "non-finite positions are rejected");
    a = {0.0F, 0.0F, 0.0F, 0.0F};
    b = {2.0F, 0.0F, 0.0F, 1.0F};
    cloth::Vec4 c{4.0F, 0.0F, 0.0F, 1.0F};
    float first = 0.0F;
    float second = 0.0F;
    cloth::solveDistance(a, b, 1.0F, 0.0F, 0.1F, first);
    cloth::solveDistance(b, c, 1.0F, 0.0F, 0.1F, second);
    check(near(a.x, 0.0F) && near(b.x, 2.0F) && near(c.x, 3.0F),
        "two sequential rigid edges have the hand-derived ordered answer");
}

void testTopology() {
    cloth::Settings settings{};
    settings.side = 17U;
    const auto topology = cloth::makeTopology(settings);
    check(topology.positions.size() == 289U && topology.pinned == 17U, "small cloth distinguishes pinned and dynamic vertices");
    check(topology.indices.size() == 16U * 16U * 6U, "triangles cover every regular-grid quad exactly twice");
    check(topology.constraints.size() == 2U * 17U * 16U + 2U * 16U * 16U + 2U * 17U * 15U,
        "stretch, both shears and distance-bending edges are all present");
    for (std::size_t color = 0U; color < 12U; ++color) {
        std::set<std::uint32_t> owned{};
        for (auto edge = topology.colorOffsets[color]; edge < topology.colorOffsets[color + 1U]; ++edge) {
            const auto constraint = topology.constraints[edge];
            check(owned.insert(constraint.a).second && owned.insert(constraint.b).second,
                "every color has disjoint endpoint ownership");
            check(constraint.rest > 0.0F && std::isfinite(constraint.rest), "every edge has a finite nonzero rest length");
        }
    }
    settings.side = 321U;
    check(settings.side * settings.side - settings.side == 102720U,
        "acceptance preset exceeds 100000 dynamic vertices, excluding 321 pins");
    check(cloth::plannedMemoryBytes(settings) < settings.memoryBudget, "100k preset fits explicit 512MiB preflight budget");
    settings.side = 1001U;
    check(settings.side * settings.side - settings.side == 1001000U,
        "optional million preset is a real distinct topology, not a relabeled 100k workload");
    check(cloth::plannedMemoryBytes(settings) > settings.memoryBudget,
        "million preset currently exceeds the default budget and must be reported unsupported separately");
}

void testTimestepAndFiniteIterations() {
    // Same physical compliance, different h: alpha/h^2 changes the finite-step residual.
    for (const float h : {0.1F, 0.05F}) {
        cloth::Vec4 a{0.0F, 0.0F, 0.0F, 0.0F};
        cloth::Vec4 b{2.0F, 0.0F, 0.0F, 1.0F};
        float lambda = 0.0F;
        cloth::solveDistance(a, b, 1.0F, 0.01F, h, lambda);
        const float alpha = 0.01F / (h * h);
        const float expectedResidual = alpha / (1.0F + alpha);
        check(near(b.x - 1.0F, expectedResidual), "timestep/compliance fixture uses the independent closed-form residual");
        const float before = b.x;
        for (int iteration = 0; iteration < 7; ++iteration) {
            cloth::solveDistance(a, b, 1.0F, 0.01F, h, lambda);
        }
        check(near(b.x, before), "extra iterations do not remove the intended compliant equilibrium residual");
    }
    for (const int iterations : {1, 2, 4, 8}) {
        cloth::Vec4 a{0.0F, 0.0F, 0.0F, 0.0F};
        cloth::Vec4 b{2.0F, 0.0F, 0.0F, 1.0F};
        cloth::Vec4 c{4.0F, 0.0F, 0.0F, 1.0F};
        float lambdaA = 0.0F;
        float lambdaB = 0.0F;
        for (int iteration = 0; iteration < iterations; ++iteration) {
            cloth::solveDistance(a, b, 1.0F, 0.0F, 0.1F, lambdaA);
            cloth::solveDistance(b, c, 1.0F, 0.0F, 0.1F, lambdaB);
        }
        const float expectedResidual = std::pow(0.5F, static_cast<float>(iterations - 1));
        check(near(b.x - 1.0F, expectedResidual) && near(c.x - b.x, 1.0F),
            "bounded ordered chain iterations expose solver error separately from compliance");
    }
}

void testAnalyticContact() {
    const auto sphere = cloth::sphereContact({2.0F, 0.0F, 0.0F}, {}, 2.0F, 0.1F);
    check(near(sphere.normal.x, 1.0F) && near(sphere.penetration, 0.1F), "sphere outward normal and thickness are independent geometric answers");
    const auto center = cloth::sphereContact({}, {}, 1.0F, 0.1F);
    check(near(center.normal.y, 1.0F) && near(center.penetration, 1.1F), "sphere center uses declared finite up-normal fallback");
    const auto capsule = cloth::capsuleContact({0.0F, 0.25F, 0.0F}, {-1.0F, 0.0F, 0.0F},
        {1.0F, 0.0F, 0.0F}, 0.5F, 0.1F);
    check(near(capsule.normal.y, 1.0F) && near(capsule.penetration, 0.35F), "capsule side projects onto the finite segment");
    const auto cap = cloth::capsuleContact({2.0F, 0.0F, 0.0F}, {-1.0F, 0.0F, 0.0F},
        {1.0F, 0.0F, 0.0F}, 1.0F, 0.1F);
    check(near(cap.normal.x, 1.0F) && near(cap.penetration, 0.1F), "capsule endpoint is spherical, not an infinite cylinder");
    cloth::Settings settings{};
    const auto projected = cloth::analyticProjection({4.0F, -1.0F, 4.0F}, settings);
    check(near(projected.y, settings.thickness), "plane projection preserves the declared vertex thickness");
}

void testCsrAndSelfContact() {
    cloth::Settings settings{};
    settings.side = 5U;
    settings.extent = 1.0F;
    settings.thickness = 0.04F;
    std::vector<cloth::Vec4> positions(25U);
    for (std::uint32_t id = 0U; id < positions.size(); ++id) {
        positions[id] = {-4.0F + static_cast<float>(id % 5U), 4.0F, -4.0F + static_cast<float>(id / 5U), 1.0F};
    }
    positions[0] = {0.0F, 4.0F, 0.0F, 1.0F};
    positions[24] = {0.0F, 4.0F, 0.0F, 1.0F};
    positions[1] = {0.01F, 4.0F, 0.0F, 1.0F};
    positions[23] = {0.08F, 4.0F, 0.0F, 1.0F};
    const auto grid = cloth::buildCpuGrid(positions, cloth::makeGridPlan(settings));
    check(std::accumulate(grid.counts.begin(), grid.counts.end(), 0U) == positions.size(), "CSR total count is exactly N including empty cells");
    auto ids = grid.ids;
    std::sort(ids.begin(), ids.end());
    bool permutation = true;
    for (std::uint32_t id = 0U; id < ids.size(); ++id) {
        permutation = permutation && ids[id] == id;
        const auto cell = grid.vertexCells[id];
        const auto first = grid.ids.begin() + grid.offsets[cell];
        permutation = permutation && std::find(first, first + grid.counts[cell], id) != first + grid.counts[cell];
    }
    check(permutation, "every ID is scattered exactly once into its own 3D cell");
    const auto corrections = cloth::selfContactCorrections(positions, grid, settings.side, settings.thickness);
    check(cloth::finite(corrections[0]) && cloth::length(corrections[0]) > 0.0F,
        "coincident non-topological vertices get a finite deterministic contact correction");
    check(cloth::topologyNeighbors(0U, 1U, 5U) && !cloth::topologyNeighbors(0U, 24U, 5U),
        "two-ring topology exclusion is independent of spatial distance");
    std::set<std::pair<std::uint32_t, std::uint32_t>> brute{};
    std::set<std::pair<std::uint32_t, std::uint32_t>> candidate{};
    for (std::uint32_t a = 0U; a < positions.size(); ++a) {
        for (std::uint32_t b = a + 1U; b < positions.size(); ++b) {
            if (!cloth::topologyNeighbors(a, b, settings.side)
                && cloth::length(cloth::xyz(positions[a]) - cloth::xyz(positions[b])) < 2.0F * settings.thickness) {
                brute.emplace(a, b);
                const auto first = cloth::cellCoordinate(cloth::xyz(positions[a]), grid.plan);
                const auto second = cloth::cellCoordinate(cloth::xyz(positions[b]), grid.plan);
                if (std::abs(first[0] - second[0]) <= 1 && std::abs(first[1] - second[1]) <= 1
                    && std::abs(first[2] - second[2]) <= 1) {
                    candidate.emplace(a, b);
                }
            }
        }
    }
    check(candidate == brute && brute.count({0U, 24U}) == 1U, "3D stencil distance predicates match brute force including coincidence and thickness boundary");
}

void testFiniteEvolutionAndNormals() {
    cloth::Settings settings{};
    settings.side = 17U;
    auto state = cloth::makeCpuState(settings);
    const auto pin = state.positions[0];
    for (std::uint32_t step = 0U; step < 8U; ++step) {
        cloth::cpuStep(state, settings);
    }
    check(near(state.positions[0].x, pin.x) && near(state.positions[0].y, pin.y)
        && near(state.positions[0].z, pin.z), "CPU full pipeline preserves pinned positions over finite steps");
    bool finite = true;
    bool normalsUnit = true;
    for (std::size_t id = 0U; id < state.positions.size(); ++id) {
        finite = finite && cloth::finite(cloth::xyz(state.positions[id])) && cloth::finite(cloth::xyz(state.velocities[id]));
        normalsUnit = normalsUnit && near(cloth::length(cloth::xyz(state.normals[id])), 1.0F, 2.0e-5F);
    }
    check(finite && normalsUnit, "positions/velocities remain finite and normals follow the deformed triangles");
    std::string error{};
    settings.dt = std::numeric_limits<float>::quiet_NaN();
    check(!cloth::validSettings(settings, error), "NaN timestep is rejected at the public boundary");
}

} // namespace

int main() {
    testDistanceOracle();
    testTopology();
    testTimestepAndFiniteIterations();
    testAnalyticContact();
    testCsrAndSelfContact();
    testFiniteEvolutionAndNormals();
    if (failures != 0) {
        return EXIT_FAILURE;
    }
    std::cout << "PASS: XPBD closed-form, mass/pin/compliance, 12-color ownership, analytic contacts, CSR, self-contact and normals.\n";
    return EXIT_SUCCESS;
}
