#pragma once
#include "star-render.hpp"

void testGalaxyAppearance() {
    const auto bodies = lab::makeGalaxyBodies(4096, lab::galaxySeed);
    std::size_t core = 0;
    std::size_t disk = 0;
    std::size_t innerDisk = 0;
    for (std::size_t i = 1; i < bodies.size(); ++i) {
        const auto p = bodies[i].position;
        const double radius = std::hypot(p.x, p.y);
        if (i % 3 == 0) {
            const double ellipsoidRadius = std::sqrt(p.x * p.x + p.y * p.y + p.z * p.z / (0.85 * 0.85));
            check(ellipsoidRadius >= 0.06 && ellipsoidRadius <= 0.61, "seeded ellipsoid core has real XYZ volume");
            ++core;
        } else if (i % 11 != 0) {
            check(radius >= 0.2 && radius <= 1.6, "disk has bounded actual 3D bodies");
            ++disk;
            if (radius < 0.7) {
                ++innerDisk;
            }
        }
    }
    check(core == 1365 && disk == 2482, "large core and thick disk contain actual bodies");
    const auto cumulative = [](double r) { return 1.0 - (1.0 + r / 0.36) * std::exp(-r / 0.36); };
    check(std::abs(double(innerDisk) / double(disk) - cumulative(0.5) / cumulative(1.4)) < 0.05, "radial density agrees with independently integrated exponential CDF");
    lab::OrbitCamera camera{};
    for (int i = 0; i < 30; ++i) {
        lab::dollyCamera(camera, 1);
    }
    check(camera.distance < 0, "camera can fly through the core without positive-radius clamp");
    const auto encounter = lab::presetBodies(1, 4096);
    std::size_t cores = 0;
    for (const auto& body : encounter) {
        if (body.mass > 1) {
            check(body.mass == 60, "each encounter disk has its own half-mass core");
            ++cores;
        }
    }
    check(cores == 2 && encounter.size() == 4096, "encounter contains two physical galaxies");
    check(lab::length(lab::totalMomentum(encounter)) < 1e-10, "encounter has balanced momentum");
    std::vector<std::uint32_t> pixels(800 * 570);
    std::vector<project31::StarLight> light{};
    lab::OrbitCamera wideCamera{};
    wideCamera.distance = 4;
    const auto drawn = project31::renderStarField(pixels, 800, 570, bodies, wideCamera, light);
    check(drawn == 4096, "renderer visits every body, no decorative replacement points");
    const auto first = pixels;
    project31::renderStarField(pixels, 800, 570, bodies, wideCamera, light);
    check(first == pixels, "same snapshot produces identical pixels without time/random inputs");
    std::vector<project31::StarLight> isolated(32 * 32);
    project31::addStarLight(isolated, 32, 32, 16.5, 16.5, {1, 0.5, 0.25, 1, 1});
    check(std::abs(isolated[16 * 32 + 16].red - 1.055) < 1e-6, "single star center matches independent light oracle");
    check(isolated[16 * 32 + 23].red == 0, "halo has finite support");
    check(project31::displayLight(1.055F, 0.00025) == std::uint32_t(std::lround(255 * std::sqrt(1.05525 / 2.05525))), "tone mapping matches independent oracle");
}
