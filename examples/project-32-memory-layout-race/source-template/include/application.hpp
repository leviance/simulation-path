#pragma once
#include "benchmark.hpp"
#include "render.hpp"
#include "render_panel.hpp"
#include <SDL3/SDL.h>
#include <iostream>

namespace project32 {
#if LAB_CHECKPOINT >= 2
// SDL calls this once per frame; unfinished work resumes on the next frame.
inline void advanceSimulation(lab::Simulation& simulation, bool measuring, bool workflow) {
    if (workflow && simulation.steps == 0 && simulation.pending == lab::PendingWork::none) {
        simulation.singleStep = true;
        simulation.beginStep();
    }

    if (measuring || (simulation.paused && !simulation.singleStep)) {
        return;
    }

    if (simulation.pending == lab::PendingWork::none) {
        simulation.beginStep();
    }
    simulation.tickStep();
}
#endif

inline int runApplication(SDL_Window* window, SDL_Renderer* renderer, SDL_Texture* texture, bool smoke, bool workflow) {
    lab::Simulation simulation{};
#if LAB_CHECKPOINT >= 8
    simulation.reset(1'000'000);
#elif LAB_CHECKPOINT >= 3
    simulation.reset(10'000);
#elif LAB_CHECKPOINT >= 2
    simulation.reset(256, true);
#else
    simulation.reset(256);
#endif
    if (workflow)
        simulation.reset(simulation.count, false);
    lab::Framebuffer image{};
    lab::Camera camera{}, beforeDrag{};
    bool running = true, dragging = false, jobsPaused = false, showReports = false;
    SDL_MouseID mouse{};
    Uint8 button{};
    float previousX{}, previousY{};
    std::size_t frames = 0;
    double renderMs = 0, frameMs = 0;
    const auto started = SDL_GetTicks();
#if LAB_CHECKPOINT >= 3
    lab::MemoryWorkload workload = lab::MemoryWorkload::fullLifecycle;
    lab::BenchmarkJob benchmark{};
#endif
    const auto release = [&]() {
        dragging = false;
        SDL_CaptureMouse(false);
    };
    const auto cancel = [&]() {
        simulation.cancel();
        jobsPaused = false;
#if LAB_CHECKPOINT >= 3
        benchmark.cancel();
#endif
    };
    const auto moveCamera = [&](float x, float y) {
        const double dx = x - previousX, dy = y - previousY;
        if (button == SDL_BUTTON_LEFT) {
            camera.yaw += dx * 0.006;
            camera.pitch = std::clamp(camera.pitch + dy * 0.006, -1.1, 1.1);
        } else {
            lab::panCamera(camera, dx, dy, 570);
        }
        previousX = x;
        previousY = y;
    };
    while (running) {
        const auto frameStarted = lab::Clock::now();
        SDL_Event event{};
        while (SDL_PollEvent(&event)) {
            SDL_ConvertEventToRenderCoordinates(renderer, &event);
            if (event.type == SDL_EVENT_QUIT)
                running = false;
            else if (event.type == SDL_EVENT_WINDOW_FOCUS_LOST) {
                release();
                if (!smoke) {
                    simulation.paused = true;
                    jobsPaused = true;
                }
            } else if (event.type == SDL_EVENT_WINDOW_PIXEL_SIZE_CHANGED)
                release();
            else if (event.type == SDL_EVENT_MOUSE_BUTTON_DOWN && !dragging && event.button.x >= 0 && event.button.x < 1120 && event.button.y >= 0 && event.button.y < 570 && (event.button.button == SDL_BUTTON_LEFT || event.button.button == SDL_BUTTON_RIGHT)) {
                mouse = event.button.which;
                button = event.button.button;
                previousX = event.button.x;
                previousY = event.button.y;
                beforeDrag = camera;
                dragging = SDL_CaptureMouse(true);
            } else if (event.type == SDL_EVENT_MOUSE_MOTION && dragging && event.motion.which == mouse)
                moveCamera(event.motion.x, event.motion.y);
            else if (event.type == SDL_EVENT_MOUSE_BUTTON_UP && dragging && event.button.which == mouse && event.button.button == button) {
                moveCamera(event.button.x, event.button.y);
                release();
            } else if (event.type == SDL_EVENT_MOUSE_WHEEL)
                camera.distance = std::clamp(camera.distance * std::exp(-event.wheel.y * 0.08), 4.0, 40.0);
            else if (event.type == SDL_EVENT_KEY_DOWN && !event.key.repeat && !(event.key.mod & (SDL_KMOD_CTRL | SDL_KMOD_ALT | SDL_KMOD_GUI))) {
                const auto key = event.key.key;
                if (key == SDLK_ESCAPE) {
                    if (dragging) {
                        camera = beforeDrag;
                        release();
                    } else if (simulation.pending != lab::PendingWork::none
#if LAB_CHECKPOINT >= 3
                               || benchmark.active
#endif
                    )
                        cancel();
                    else
                        running = false;
                } else if (key == SDLK_X)
                    cancel();
                else if (key == SDLK_HOME)
                    camera = {};
                else if (key == SDLK_F)
                    showReports = !showReports;
                else if (key == SDLK_LEFT || key == SDLK_RIGHT)
                    camera.yaw += key == SDLK_LEFT ? -0.08 : 0.08;
                else if (key == SDLK_UP || key == SDLK_DOWN)
                    camera.pitch = std::clamp(camera.pitch + (key == SDLK_UP ? -0.08 : 0.08), -1.1, 1.1);
                else if (key == SDLK_R || key == SDLK_1 || key == SDLK_2 || key == SDLK_3) {
                    cancel();
                    std::size_t count = simulation.count;
                    bool cold = simulation.cold;
                    if (key == SDLK_1) {
                        count = 256;
#if LAB_CHECKPOINT >= 2
                        cold = true;
#else
                        // A static checkpoint cannot emit into an empty pool yet.
                        cold = false;
#endif
                    }
                    if (key == SDLK_2) {
                        count = 10'000;
                        cold = false;
                    }
                    if (key == SDLK_3) {
                        count = 1'000'000;
                        cold = false;
                    }
                    if (key != SDLK_R)
                        simulation.config.emissionRate = float(count) * 0.5F;
                    simulation.reset(count, cold);
                }
#if LAB_CHECKPOINT >= 2
                else if (key == SDLK_SPACE) {
                    bool measuring = false;
#if LAB_CHECKPOINT >= 3
                    measuring = benchmark.active;
#endif
                    if (measuring || simulation.pending == lab::PendingWork::conversion)
                        jobsPaused = !jobsPaused;
                    else
                        simulation.paused = !simulation.paused;
                } else if (key == SDLK_N) {
                    cancel();
                    simulation.singleStep = true;
                    simulation.beginStep();
                } else if (key == SDLK_A || key == SDLK_D || key == SDLK_W || key == SDLK_S || key == SDLK_G || key == SDLK_H || key == SDLK_LEFTBRACKET || key == SDLK_RIGHTBRACKET || key == SDLK_MINUS || key == SDLK_EQUALS) {
                    cancel();
                    if (key == SDLK_A)
                        simulation.config.emitterX = std::max(-5.0F, simulation.config.emitterX - 0.25F);
                    if (key == SDLK_D)
                        simulation.config.emitterX = std::min(5.0F, simulation.config.emitterX + 0.25F);
                    if (key == SDLK_W)
                        simulation.config.launchSpeed = std::min(20.0F, simulation.config.launchSpeed + 0.5F);
                    if (key == SDLK_S)
                        simulation.config.launchSpeed = std::max(1.0F, simulation.config.launchSpeed - 0.5F);
                    if (key == SDLK_G)
                        simulation.config.gravity = std::max(-20.0F, simulation.config.gravity - 0.5F);
                    if (key == SDLK_H)
                        simulation.config.gravity = std::min(0.0F, simulation.config.gravity + 0.5F);
                    if (key == SDLK_LEFTBRACKET)
                        simulation.config.lifetime = std::max(0.5F, simulation.config.lifetime - 0.25F);
                    if (key == SDLK_RIGHTBRACKET)
                        simulation.config.lifetime = std::min(8.0F, simulation.config.lifetime + 0.25F);
                    if (key == SDLK_MINUS)
                        simulation.config.emissionRate = std::max(1.0F, simulation.config.emissionRate * 0.5F);
                    if (key == SDLK_EQUALS)
                        simulation.config.emissionRate = std::min(2'000'000.0F, simulation.config.emissionRate * 2.0F);
                    simulation.notice = "Gravity applies next step; emitter/lifetime affect future births. R recreates all slots.";
                }
#endif
#if LAB_CHECKPOINT >= 4
                else if (key == SDLK_L) {
                    cancel();
                    simulation.beginConversion();
                }
#endif
#if LAB_CHECKPOINT >= 3
                else if (key == SDLK_T) {
                    cancel();
                    workload = workload == lab::MemoryWorkload::fullLifecycle ? lab::MemoryWorkload::gravityOnly : lab::MemoryWorkload::fullLifecycle;
                    benchmark.rows.clear();
                    simulation.notice = "T selects benchmark only; the fountain always updates its complete lifecycle";
                } else if (key == SDLK_B) {
                    cancel();
                    benchmark.start(simulation.config, {simulation.count}, {workload});
                    showReports = true;
                }
#endif
#if LAB_CHECKPOINT >= 7
                else if (key == SDLK_C) {
                    cancel();
                    benchmark.start(simulation.config, {10'000, 100'000, 1'000'000}, {lab::MemoryWorkload::gravityOnly, lab::MemoryWorkload::fullLifecycle});
                    showReports = true;
                }
#endif
            }
        }
#if LAB_CHECKPOINT >= 2
        bool measuring = false;
#endif
#if LAB_CHECKPOINT >= 3
        benchmark.paused = jobsPaused;
        benchmark.tick();
        measuring = benchmark.active;
#endif
#if LAB_CHECKPOINT >= 4
        if (!jobsPaused && simulation.pending == lab::PendingWork::conversion)
            simulation.tickConversion();
#endif
#if LAB_CHECKPOINT >= 2
        advanceSimulation(simulation, measuring, workflow);
#endif
        const auto renderStarted = lab::Clock::now();
        const lab::RenderStats drawn = lab::drawFountain(image, simulation, camera, 40'000, showReports);
        if (!SDL_UpdateTexture(texture, nullptr, image.pixels.data(), image.width * int(sizeof(std::uint32_t))))
            throw std::runtime_error(SDL_GetError());
        SDL_SetRenderDrawColor(renderer, 11, 16, 32, 255);
        SDL_RenderClear(renderer);
        const SDL_FRect viewport{0, 0, 1120, 570};
        SDL_RenderTexture(renderer, texture, nullptr, &viewport);
        renderMs = lab::milliseconds(renderStarted);
        drawFountainPanel(renderer, simulation, drawn, renderMs, frameMs);
#if LAB_CHECKPOINT >= 3
        SDL_RenderDebugTextFormat(renderer, 12, 770, "Benchmark: %s | %s | case %zu target %zu; state/seed captured, physics frozen", workload == lab::MemoryWorkload::gravityOnly ? "gravity-only" : "full lifecycle", benchmark.notice.c_str(), benchmark.caseIndex, benchmark.target);
        if (showReports) {
            SDL_SetRenderDrawColor(renderer, 9, 18, 30, 245);
            const SDL_FRect reportPanel{6, 6, 1108, 173};
            SDL_RenderFillRect(renderer, &reportPanel);
            SDL_SetRenderDrawColor(renderer, 184, 222, 238, 255);
            SDL_RenderDebugTextFormat(renderer, 12, 135, "Measurement input: seed=%u gravity=%.2f launch=%.1f lifetime=%.2f; clock excludes reset/copy/render/RAF", benchmark.config.seed, benchmark.config.gravity, benchmark.config.launchSpeed, benchmark.config.lifetime);
            for (std::size_t index = 0; index < benchmark.rows.size(); ++index) {
                const auto& row = benchmark.rows[index];
                if (row.paired) {
                    SDL_RenderDebugTextFormat(renderer, 12, 12 + float(index * 19), "N=%zu %s AoS %.3f [%.3f,%.3f]ms SoA %.3f [%.3f,%.3f]ms errorRatio=%.2e sum=%.4e", row.count, row.workload == lab::MemoryWorkload::gravityOnly ? "gravity" : "lifecycle", row.aos.median, row.aos.minimum, row.aos.maximum, row.soa.median, row.soa.minimum, row.soa.maximum, row.maximumErrorRatio, row.checksumAoS);
                } else {
                    SDL_RenderDebugTextFormat(renderer, 12, 12 + float(index * 19), "N=%zu %s AoS %.3f [%.3f,%.3f]ms | SoA NOT MEASURED | checksum=%.4e", row.count, row.workload == lab::MemoryWorkload::gravityOnly ? "gravity" : "lifecycle", row.aos.median, row.aos.minimum, row.aos.maximum, row.checksumAoS);
                }
            }
        }
#endif
#if LAB_CHECKPOINT >= 6
        if (showReports) {
            const auto traffic = lab::modelTraffic(simulation.count, simulation.layout, workload);
            SDL_RenderDebugTextFormat(renderer, 12, 155, "64B aligned-base model: useful=%zu B uniqueLines=%zu loaded=%zu B %s; NOT measured cache misses", traffic.usefulBytes, traffic.uniqueLines, traffic.loadedBytes, traffic.upperBound ? "ALL-FIELD UPPER BOUND" : "gravity-only");
        }
#endif
        SDL_RenderPresent(renderer);
        frameMs = lab::milliseconds(frameStarted);
        SDL_Delay(1);
        ++frames;
        if ((smoke && !workflow && frames >= 4) || (workflow && simulation.steps >= 1)) {
            if (workflow) {
#if LAB_CHECKPOINT >= 2
                if (simulation.active != simulation.count || simulation.committedUpdated != simulation.count)
                    throw std::runtime_error("Workflow did not update every live slot");
                for (std::size_t index = 0; index < simulation.count; ++index) {
                    const auto& old = simulation.nextAoS[index];
                    const auto& next = simulation.aos[index];
                    const float remaining = old.lifetime - old.age;
                    const bool expired = lab::fixedDt >= remaining;
                    const float expectedAge = expired ? lab::fixedDt - remaining : old.age + lab::fixedDt;
                    if (next.id != index || next.generation != old.generation + std::uint32_t(expired) || std::abs(next.age - expectedAge) > 1e-6F || !lab::finiteParticle(next))
                        throw std::runtime_error("Untouched/invalid slot in full-N workflow");
                }
#endif
            }
            std::cout << "P32 allocated=" << simulation.count << " alive=" << simulation.active << " updated=" << simulation.committedUpdated << " sampled=" << drawn.sampled << " rendered=" << drawn.rendered << " bytes=" << simulation.aosBytes() + simulation.soaBytes() << '\n';
            break;
        }
        if ((smoke || workflow) && SDL_GetTicks() - started > 10000)
            throw std::runtime_error("P32 finite smoke deadline");
    }
    release();
    static_cast<void>(window);
    return EXIT_SUCCESS;
}
} // namespace project32
