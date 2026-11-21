#pragma once
#include "star-render.hpp"

void testGalaxyAppearance() {
    const auto bodies = lab::makeGalaxyBodies(4096, lab::galaxySeed);
    std::size_t core = 0, disk = 0, halo = 0, inner = 0, overlap = 0;
    double diskZ2 = 0.0, coreZ2 = 0.0;
    for (std::size_t id = 1; id < bodies.size(); ++id) {
        const auto p = bodies[id].position;
        const double radius = std::hypot(p.x, p.y);
        if (id % 5 == 0) {
            check(std::hypot(radius, p.z / 0.76) <= 0.66, "bulge is an ellipsoid, not a sphere painted on the disk");
            coreZ2 += p.z * p.z;
            ++core;
        } else if (id % 23 == 0) {
            const double radial = std::hypot(radius, p.z / 0.86);
            check(radial >= 0.48 && radial <= 1.66, "sparse halo has real height");
            ++halo;
        } else {
            check(radius <= 1.82, "bounded disk");
            ++disk;
            diskZ2 += p.z * p.z;
            if (radius < 0.7) ++inner;
            if (radius < 0.2) ++overlap;
        }
    }
    check(core == 819 && disk == 3133 && halo == 143, "populations partition all satellite bodies");
    check(overlap > 100 && diskZ2 / disk > 0.001 && coreZ2 / core > 2.0 * diskZ2 / disk, "disk reaches the center and is thinner than the bulge");
    const auto cumulative = [](double r) { return 1.0 - (1.0 + r / 0.47) * std::exp(-r / 0.47); };
    check(std::abs(double(inner) / double(disk) - cumulative(0.7) / cumulative(1.82)) < 0.04, "radial density matches area-weighted exponential disk");
    check(std::abs(bodies[1].position.y - 1.1827046559686794) < 1e-10, "same seed sequence as Canvas");
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
    wideCamera.distance = 7.8;
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
