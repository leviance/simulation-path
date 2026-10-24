#pragma once
#include "view.hpp"

void runExtraCases() {
    const std::vector<lab::Particle> boundary{{{1, 0}}, {{-1, 0}}, {{0, 1}}, {{0, -1}}, {{1.01, 0}}};
    lab::QueryWorkspace workspace{};
    lab::queryBruteForceSquared(boundary, {{0, 0}, 1}, workspace);
    check(workspace.hitIndices == std::vector<std::size_t>({0, 1, 2, 3}), "inclusive axis boundary and stable tie");
    check(workspace.nearestIndex == 0, "equal nearest distances retain first index");
    lab::queryBruteForceSquared(boundary, {{0, 0}, 0}, workspace);
    check(workspace.hitIndices.empty() && workspace.nearestIndex == 0 && workspace.scanned == 5, "nearest is global even when radius contains nothing");
    lab::queryBruteForceSquared({}, {{0, 0}, 1}, workspace);
    check(workspace.scanned == 0 && workspace.nearestIndex == lab::kNoParticle && workspace.hitIndices.empty(), "empty query clears prior results");
    lab::queryBruteForceSquared(boundary, {{0, 0}, -1}, workspace);
    check(workspace.scanned == 0 && workspace.hitIndices.empty(), "negative radius rejected");

    lab::Scene scene{};
    lab::resetScene(scene);
    const auto original = scene.particles;
    bool identical = true;
    lab::resetScene(scene);
    for (std::size_t index = 0; index < scene.particles.size(); ++index) {
        identical = identical && scene.particles[index].position.x == original[index].position.x && scene.particles[index].position.y == original[index].position.y;
    }
    check(identical, "all one hundred thousand positions reproduce exactly");
    const auto probes = lab::makeProbeQueries(24, lab::Scene::bounds, 0.08, 0x12345678U);
    for (const auto& query : probes) {
        const auto reference = lab::queryBruteForce(scene.particles, query);
        lab::queryBruteForceSquared(scene.particles, query, workspace);
        check(reference.hitIndices == workspace.hitIndices && reference.nearestIndex == workspace.nearestIndex, "24 full-scale queries agree with sqrt reference");
        std::vector<std::size_t> oracle{};
        std::size_t nearest = lab::kNoParticle;
        long double nearestDistance = std::numeric_limits<long double>::infinity();
        for (std::size_t index = 0; index < original.size(); ++index) {
            const long double dx = static_cast<long double>(original[index].position.x) - query.center.x;
            const long double dy = static_cast<long double>(original[index].position.y) - query.center.y;
            const long double d = std::hypot(dx, dy);
            if (d <= query.radius)
                oracle.push_back(index);
            if (d < nearestDistance) {
                nearestDistance = d;
                nearest = index;
            }
        }
        check(workspace.hitIndices == oracle && workspace.nearestIndex == nearest, "independent hypot oracle checks complete set");
    }

    const lab::WorldView view{};
    for (const lab::Vec2 point : std::vector<lab::Vec2>{{0, 0}, {1, 1}, {0.23, 0.78}}) {
        const auto restored = lab::screenToWorld(lab::worldToScreen(point, view), view);
        check(closeEnough(restored.x, point.x) && closeEnough(restored.y, point.y), "logical view round-trip");
    }
    lab::requestBenchmark(scene, true);
    std::size_t frames = 0;
    while (scene.job.active && frames < 217) {
        lab::advanceJob(scene);
        ++frames;
    }
    check(frames == 216 && scene.rows.size() == 3, "bounded scaling job uses exactly 216 single-query ticks");
    for (std::size_t index = 0; index < scene.rows.size(); ++index) {
        const auto& row = scene.rows[index];
        lab::QueryWorkspace oracleWorkspace{};
        const auto oracle = lab::benchmarkBruteForce(std::span<const lab::Particle>(scene.particles).first(row.particleCount), scene.job.probes, 2, oracleWorkspace);
        check(row.metrics.totalScanned == row.particleCount * 48, "scaling UI exact N times Q");
        check(row.metrics.checksum == oracle.checksum, "incremental and synchronous benchmark agree");
    }
    lab::requestBenchmark(scene, false);
    lab::advanceJob(scene);
    lab::stopScene(scene);
    const auto cursor = scene.job.cursor;
    lab::advanceJob(scene);
    check(!scene.job.active && scene.job.cursor == cursor, "cancelled job cannot advance");
    lab::invalidateMeasurement(scene);
    check(scene.rows.empty() && scene.benchmark.queryCount == 0, "changed workload clears stale measurements");

    lab::Framebuffer image{};
    scene.query.radius = 0;
    lab::refreshQuery(scene);
    lab::drawScene(image, scene);
    std::size_t visible = 0;
    for (const auto& particle : scene.particles) {
        const auto p = lab::worldToScreen(particle.position, view);
        const auto color = image.pixels[static_cast<std::size_t>(std::lround(p.y)) * lab::Framebuffer::width + static_cast<std::size_t>(std::lround(p.x))];
        if (color != lab::kBackground)
            ++visible;
    }
    check(visible == 100'000, "all one hundred thousand particles contribute pixels");
}
