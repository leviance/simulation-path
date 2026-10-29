#pragma once
#include "benchmark.hpp"
#include "render.hpp"
#include <SDL3/SDL.h>

namespace project31 {
inline void drawTrails(std::span<std::uint32_t> pixels, int width, int height, const lab::Simulation& simulation) {
    for (std::size_t frame = 1; frame < simulation.trails.size(); ++frame) {
        for (std::size_t body = 0; body < simulation.trails[frame].size(); ++body) {
            const auto a = projectToScreen(simulation.trails[frame - 1][body], simulation.camera, width, height);
            const auto b = projectToScreen(simulation.trails[frame][body], simulation.camera, width, height);
            if (a.visible && b.visible) {
                drawLine(pixels, width, height, a.x, a.y, b.x, b.y, 0x34566fffU);
            }
        }
    }
}

// [snippet:drawScene]
inline void drawScene(std::span<std::uint32_t> pixels, int width, int height, const lab::Simulation& simulation, std::vector<StarLight>& light) {
    drawBodies(pixels, width, height, simulation.bodies, simulation.camera, light);
    drawTrails(pixels, width, height, simulation);
#if LAB_CHECKPOINT >= 6
    if (simulation.debug) {
        lab::ForceTrace trace{};
        const auto approximate = lab::barnesHutAcceleration(simulation.tree, simulation.bodies, simulation.selected, simulation.theta, lab::gravity, simulation.epsilon, &trace);
        for (std::size_t i = 0; i < std::min<std::size_t>(512, trace.opened.size()); ++i) {
            drawBoxWireframe(pixels, width, height, simulation.tree.nodes[trace.opened[i]].bounds, simulation.camera, 0x3f5878ffU);
        }
        for (std::size_t i = 0; i < std::min<std::size_t>(512, trace.accepted.size()); ++i) {
            drawBoxWireframe(pixels, width, height, simulation.tree.nodes[trace.accepted[i]].bounds, simulation.camera, 0xe5c07bffU);
        }
        drawForceArrow(pixels, width, height, simulation.bodies[simulation.selected], approximate.acceleration, simulation.camera);
    }
#elif LAB_CHECKPOINT >= 5
    if (simulation.debug) {
        drawMassOctree(pixels, width, height, simulation.tree, simulation.camera);
    }
#elif LAB_CHECKPOINT >= 3
    const auto force = lab::directAcceleration(simulation.bodies, simulation.selected, lab::gravity, simulation.epsilon);
    drawForceArrow(pixels, width, height, simulation.bodies[simulation.selected], force.acceleration, simulation.camera);
#elif LAB_CHECKPOINT >= 2
    drawForceArrow(pixels, width, height, simulation.bodies[simulation.selected], lab::pairAccelerationForSelected(simulation), simulation.camera);
#endif
#if LAB_CHECKPOINT >= 2
    // Vòng tròn rỗng đánh dấu target, không thay màu/kích thước của ngôi sao.
    drawTargetMarker(pixels, width, height, simulation.bodies[simulation.selected], simulation.camera);
#endif
}

// [/snippet:drawScene]

inline void drawHud(SDL_Renderer* renderer, const lab::Simulation& simulation) {
    SDL_SetRenderDrawColor(renderer, 210, 220, 235, 255);
    const char* motion = "RUNNING";
    if (simulation.paused) {
        motion = "PAUSED";
    }
    const char* solver = "Barnes-Hut";
    if (simulation.direct) {
        solver = "Direct";
    }
    SDL_RenderDebugTextFormat(renderer, 12, 586, "N=%zu step=%zu t=%.6f dt=%.6f theta=%.2f eps=%.3f | %s | solver=%s", simulation.bodies.size(), simulation.steps, simulation.time, simulation.dt, simulation.theta, simulation.epsilon, motion, solver);
    SDL_RenderDebugText(renderer, 12, 606, "XYZ / G=0.001 | gold core -> blue: radius 0..0.75 | size: log mass / depth | yellow ring: target");
    SDL_RenderDebugTextFormat(renderer, 12, 626, "Camera dolly %.3f (can cross 0) | trails: 24 IDs / 64 samples | debug: opened blue, accepted gold", simulation.camera.distance);
#if LAB_CHECKPOINT >= 3
    const auto direct = lab::directAcceleration(simulation.bodies, simulation.selected, lab::gravity, simulation.epsilon);
    SDL_RenderDebugTextFormat(renderer, 12, 646, "Target %zu direct a=(%.5f,%.5f,%.5f); exact sources=%zu", simulation.selected, direct.acceleration.x, direct.acceleration.y, direct.acceleration.z, direct.metrics.exactInteractions);
#elif LAB_CHECKPOINT >= 2
    const auto pair = lab::pairAccelerationForSelected(simulation);
    SDL_RenderDebugTextFormat(renderer, 12, 646, "Pair a=(%.7f,%.7f,%.7f) norm=%.7f; arrow length is normalized for readability", pair.x, pair.y, pair.z, lab::length(pair));
#endif
#if LAB_CHECKPOINT >= 6
    const auto approximate = lab::barnesHutAcceleration(simulation.tree, simulation.bodies, simulation.selected, simulation.theta, lab::gravity, simulation.epsilon);
    const double error = lab::length(approximate.acceleration - direct.acceleration);
    SDL_RenderDebugTextFormat(renderer, 12, 666, "BH a=(%.5f,%.5f,%.5f) absErr=%.3e rel=%.3e visit=%zu accept=%zu exact=%zu", approximate.acceleration.x, approximate.acceleration.y, approximate.acceleration.z, error, error / std::max(lab::length(direct.acceleration), 1e-12), approximate.metrics.visitedNodes, approximate.metrics.approximatedNodes, approximate.metrics.exactInteractions);
#endif
    SDL_RenderDebugText(renderer, 12, 710, "Space run/pause | N step | R reset | 1 disk, 2 collision, 3 binary, 4 N=256, 5 N=3 | M solver");
    SDL_RenderDebugText(renderer, 12, 730, "Drag orbit, right pan | wheel or W/S: fly through | arrows orbit | comma/period target | Home camera");
    SDL_RenderDebugText(renderer, 12, 750, "[ ] theta | - + softening | D dt (1/60,1/120,1/240) | F debug | T force sweep | B runtime");
    SDL_RenderDebugText(renderer, 12, 770, "E full energy sample | I fixed-theta dt study | Esc cancel job/exit. Jobs freeze physics, not camera.");
    SDL_RenderDebugText(renderer, 12, 790, simulation.notice.c_str());
}
} // namespace project31
