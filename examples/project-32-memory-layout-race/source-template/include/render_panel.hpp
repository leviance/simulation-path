#pragma once
#include "render.hpp"
#include <SDL3/SDL.h>

namespace project32 {
// Tách số hạt sống, đã cập nhật và đã vẽ để không nhầm sampling với mô phỏng.
inline void drawFountainPanel(SDL_Renderer* renderer, const lab::Simulation& simulation, const lab::RenderStats& drawn, double renderMs, double frameMs) {
    SDL_SetRenderDrawColor(renderer, 12, 21, 35, 255);
    const SDL_FRect panel{0, 570, 1120, 250};
    SDL_RenderFillRect(renderer, &panel);
    SDL_SetRenderDrawColor(renderer, 40, 67, 86, 255);
    SDL_RenderLine(renderer, 0, 570, 1120, 570);

    float scaleX = 1, scaleY = 1;
    SDL_GetRenderScale(renderer, &scaleX, &scaleY);
    SDL_SetRenderScale(renderer, scaleX * 2, scaleY * 2);
    SDL_SetRenderDrawColor(renderer, 227, 246, 255, 255);
    SDL_RenderDebugText(renderer, 9, 293, "CPU PARTICLE FOUNTAIN");
    SDL_SetRenderScale(renderer, scaleX, scaleY);
    SDL_SetRenderDrawColor(renderer, 128, 154, 178, 255);
    SDL_RenderDebugText(renderer, 420, 592, "white/cyan -> blue: age | grid: 1m / 5m");

    SDL_SetRenderDrawColor(renderer, 27, 51, 66, 255);
    const SDL_FRect badge{913, 584, 188, 23};
    SDL_RenderFillRect(renderer, &badge);
    SDL_SetRenderDrawColor(renderer, 133, 222, 242, 255);
    const char* layoutName = "SoA";
    if (simulation.layout == lab::Layout::aos) {
        layoutName = "AoS";
    }
    const char* motion = "RUNNING";
    if (simulation.paused) {
        motion = "PAUSED";
    }
    SDL_RenderDebugTextFormat(renderer, 925, 592, "%s / %s", layoutName, motion);

    SDL_SetRenderDrawColor(renderer, 201, 222, 236, 255);
    SDL_RenderDebugTextFormat(renderer, 18, 616, "ALIVE %zu  |  UPDATED %zu / step  |  DRAWN %zu of %zu samples  |  ALLOCATED %zu", simulation.active, simulation.committedUpdated, drawn.rendered, drawn.sampled, simulation.count);
    SDL_RenderDebugTextFormat(renderer, 18, 636, "t=%.4fs step=%llu | UPDATE %.3fms COPY %.3fms CONVERT %.3fms STEP-WALL %.3fms", simulation.time, static_cast<unsigned long long>(simulation.steps), simulation.updateMs, simulation.copyMs, simulation.conversionMs, simulation.wholeStepMs);
    double millionUpdatesPerSecond = 0;
    if (simulation.updateMs > 0)
        millionUpdatesPerSecond = double(simulation.committedUpdated) / (simulation.updateMs * 1000);
    SDL_RenderDebugTextFormat(renderer, 18, 656, "PAYLOAD AoS %.2f MB / SoA %.2f MB | UPDATE %.2f M/s | DRAW/UPLOAD %.3fms FRAME-CPU %.3fms", simulation.aosBytes() / 1e6, simulation.soaBytes() / 1e6, millionUpdatesPerSecond, renderMs, frameMs);
    SDL_RenderDebugTextFormat(renderer, 18, 676, "EMITTER x=%.2f SPEED=%.1f GRAVITY=%.2f BIRTH LIFE=%.2fs RATE=%.0f/s | BIRTHS %zu RESPAWNS %zu", simulation.config.emitterX, simulation.config.launchSpeed, simulation.config.gravity, simulation.config.lifetime, simulation.config.emissionRate, simulation.born, simulation.respawned);

    SDL_SetRenderDrawColor(renderer, 128, 154, 178, 255);
#if LAB_CHECKPOINT >= 4
    SDL_RenderDebugText(renderer, 18, 700, "Space run/pause  N step  R reset  1 cold / 2 warm 10k / 3 warm 1M  L layout  X cancel");
#elif LAB_CHECKPOINT >= 2
    SDL_RenderDebugText(renderer, 18, 700, "Space run/pause  N step  R reset  1 cold / 2 warm 10k / 3 warm 1M  X cancel");
#else
    SDL_RenderDebugText(renderer, 18, 700, "STATIC INITIAL STATE: inspect the camera and particles; physics starts in checkpoint 02. R resets.");
#endif
#if LAB_CHECKPOINT >= 2
    SDL_RenderDebugText(renderer, 18, 718, "A/D emitter  W/S launch speed  G/H gravity  [ ] birth lifetime  - + emission rate");
#endif
    SDL_RenderDebugText(renderer, 18, 736, "Drag left orbit / right pan, wheel zoom  |  arrows orbit  Home camera  F grid/reports  Esc cancel/exit");
#if LAB_CHECKPOINT >= 7
    SDL_RenderDebugText(renderer, 18, 754, "T benchmark workload  B selected N  C scaling both workloads  |  1 warm-up + 5 samples x 3 passes");
#elif LAB_CHECKPOINT >= 3
    SDL_RenderDebugText(renderer, 18, 754, "T benchmark workload  B AoS baseline  |  SoA paired measurement arrives in checkpoint 07");
#endif
    SDL_SetRenderDrawColor(renderer, 113, 209, 223, 255);
    SDL_RenderDebugText(renderer, 18, 798, simulation.notice.c_str());
}
} // namespace project32
