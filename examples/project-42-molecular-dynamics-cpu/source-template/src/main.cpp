#ifndef LAB_CHECKPOINT
#define LAB_CHECKPOINT 8
#endif

#include "framebuffer.hpp"
#if LAB_CHECKPOINT >= 1
#include "molecular_dynamics.hpp"
#include "molecular_dynamics_diagnostics.hpp"
#include "molecular_dynamics_ui.hpp"
#endif

#include <SDL3/SDL.h>
#include <algorithm>
#include <cmath>
#include <cstddef>
#include <cstdint>
#include <cstdio>
#include <cstdlib>
#include <iostream>
#include <limits>
#include <vector>

namespace {

constexpr int kInitialWidth = 1180;
constexpr int kInitialHeight = 720;
constexpr std::uint32_t kBackground = 0x0b1020ffU;
constexpr std::uint32_t kGrid = 0x3e4451ffU;
constexpr std::uint32_t kParticle = 0x61afefffU;

bool resizeSurface(
    SDL_Renderer* renderer,
    SDL_Texture*& texture,
    std::vector<std::uint32_t>& pixels,
    int& width,
    int& height,
    int newWidth,
    int newHeight
) {
    if (newWidth <= 0 || newHeight <= 0) {
        return true;
    }
    SDL_Texture* replacement = SDL_CreateTexture(
        renderer,
        SDL_PIXELFORMAT_RGBA8888,
        SDL_TEXTUREACCESS_STREAMING,
        newWidth,
        newHeight
    );
    if (!replacement) {
        return false;
    }
    SDL_DestroyTexture(texture);
    texture = replacement;
    width = newWidth;
    height = newHeight;
    pixels.assign(std::size_t(width) * std::size_t(height), kBackground);
    return true;
}

void drawStarterScene(std::vector<std::uint32_t>& pixels, int width, int height) {
    framebuffer::clear(pixels, kBackground);
    const int left = 70;
    const int top = 70;
    const int right = width - 70;
    const int bottom = height - 70;
    framebuffer::drawRectangle(pixels, width, height, left, top, right, bottom, kGrid);
    for (int row = 0; row < 9; ++row) {
        for (int column = 0; column < 16; ++column) {
            const int x = left + (2 * column + 1) * (right - left) / 32;
            const int y = top + (2 * row + 1) * (bottom - top) / 18;
            framebuffer::fillCircle(pixels, width, height, x, y, 3, kParticle);
        }
    }
}

#if LAB_CHECKPOINT >= 1
md::MolecularSystem makeCheckpointOneSystem(std::size_t particleCount, double density, std::uint32_t seed) {
    md::MolecularSystem system{};
    system.box = md::makeBoxForDensity(particleCount, density);
    system.particles = md::createLatticeParticles(particleCount, system.box, seed);
    return system;
}

std::size_t nearestParticle(
    const md::MolecularSystem& system,
    const md_ui::WorldView& view,
    float pointerX,
    float pointerY
) {
    const double worldX =
        (double(pointerX) - double(view.left)) / double(view.right - view.left) * system.box.width;
    const double worldY =
        (double(pointerY) - double(view.top)) / double(view.bottom - view.top) * system.box.height;
    std::size_t nearestIndex = 0U;
    double nearestDistance = std::numeric_limits<double>::infinity();
    for (std::size_t index = 0; index < system.particles.size(); ++index) {
        const md::Vec2 delta = md::subtract(system.particles[index].position, {worldX, worldY});
        const double distance = md::lengthSquared(delta);
        if (distance < nearestDistance) {
            nearestDistance = distance;
            nearestIndex = index;
        }
    }
    return nearestIndex;
}
#endif

} // namespace

int main() {
    // Khởi tạo SDL và mọi tài nguyên dùng để trình bày framebuffer CPU.
    if (!SDL_Init(SDL_INIT_VIDEO)) {
        std::cerr << "SDL_Init failed: " << SDL_GetError() << '\n';
        return EXIT_FAILURE;
    }

    int width = kInitialWidth;
    int height = kInitialHeight;
    SDL_Window* window = SDL_CreateWindow(
        "Project 42 - CPU Molecular Dynamics Lab",
        width,
        height,
        SDL_WINDOW_RESIZABLE
    );
    if (!window) {
        std::cerr << "SDL_CreateWindow failed: " << SDL_GetError() << '\n';
        SDL_Quit();
        return EXIT_FAILURE;
    }

    SDL_Renderer* renderer = SDL_CreateRenderer(window, nullptr);
    if (!renderer) {
        std::cerr << "SDL_CreateRenderer failed: " << SDL_GetError() << '\n';
        SDL_DestroyWindow(window);
        SDL_Quit();
        return EXIT_FAILURE;
    }

    SDL_Texture* texture = SDL_CreateTexture(
        renderer,
        SDL_PIXELFORMAT_RGBA8888,
        SDL_TEXTUREACCESS_STREAMING,
        width,
        height
    );
    if (!texture) {
        std::cerr << "SDL_CreateTexture failed: " << SDL_GetError() << '\n';
        SDL_DestroyRenderer(renderer);
        SDL_DestroyWindow(window);
        SDL_Quit();
        return EXIT_FAILURE;
    }
    std::vector<std::uint32_t> pixels(
        std::size_t(width) * std::size_t(height),
        kBackground
    );

#if LAB_CHECKPOINT >= 1
    std::size_t particleCount = 1000U;
#if LAB_CHECKPOINT >= 2
    double targetTemperature = 0.2;
#endif
    double density = 0.55;
    std::uint32_t seed = 42U;
#if LAB_CHECKPOINT == 1
    md::MolecularSystem system = makeCheckpointOneSystem(particleCount, density, seed);
#elif LAB_CHECKPOINT >= 2
    md::MolecularSystem system = md::makeMolecularSystem(
        particleCount,
        targetTemperature,
        seed,
        density
    );
#endif
    std::size_t selectedIndex = 0U;
#endif

#if LAB_CHECKPOINT >= 4
    md::ForceEvaluation forceEvaluation = md::accumulatePairForces(
        system.particles,
        system.parameters
    );
#endif
#if LAB_CHECKPOINT >= 5
    bool paused = true;
    double fixedDt = 0.001;
    double accumulator = 0.0;
    double droppedTime = 0.0;
    int completedSubsteps = 0;
    const char* stepError = "none";
    std::uint64_t previousCounter = SDL_GetPerformanceCounter();
#endif
#if LAB_CHECKPOINT >= 6
    md::SystemMetrics metrics = md::measureSystem(system);
    system.initialEnergy = metrics.totalEnergy;
    std::vector<md_ui::HistorySample> history;
    md_ui::appendHistory(history, system, metrics);
    double nextHistoryTime = 0.02;
    double maximumEnergyDrift = 0.0;
#endif
#if LAB_CHECKPOINT >= 7
    bool showScaling = false;
    double lastStepMilliseconds = 0.0;
#endif
#if LAB_CHECKPOINT >= 8
    md_ui::ValidationState validationState = md_ui::ValidationState::notRun;
#endif

#if LAB_CHECKPOINT >= 2
    const auto rebuildSystem = [&]() {
        system = md::makeMolecularSystem(
            particleCount,
            targetTemperature,
            seed,
            density
        );
        selectedIndex = 0U;
#if LAB_CHECKPOINT >= 4
        forceEvaluation = md::accumulatePairForces(system.particles, system.parameters);
#endif
#if LAB_CHECKPOINT >= 5
        paused = true;
        accumulator = 0.0;
        droppedTime = 0.0;
        completedSubsteps = 0;
        stepError = "none";
#endif
#if LAB_CHECKPOINT >= 6
        metrics = md::measureSystem(system);
        system.initialEnergy = metrics.totalEnergy;
        history.clear();
        md_ui::appendHistory(history, system, metrics);
        nextHistoryTime = 0.02;
        maximumEnergyDrift = 0.0;
#endif
#if LAB_CHECKPOINT >= 7
        lastStepMilliseconds = 0.0;
#endif
#if LAB_CHECKPOINT >= 8
        validationState = md_ui::ValidationState::notRun;
#endif
    };
#endif

    bool running = true;
    bool failed = false;
    while (running) {
        SDL_Event event{};
        while (SDL_PollEvent(&event)) {
            if (event.type == SDL_EVENT_QUIT) {
                running = false;
            }
            if (event.type == SDL_EVENT_WINDOW_PIXEL_SIZE_CHANGED) {
                if (!resizeSurface(
                        renderer,
                        texture,
                        pixels,
                        width,
                        height,
                        event.window.data1,
                        event.window.data2
                    )) {
                    std::cerr << "Resize failed: " << SDL_GetError() << '\n';
                    failed = true;
                    running = false;
                }
            }
            if (event.type == SDL_EVENT_KEY_DOWN) {
                if (event.key.key == SDLK_ESCAPE) {
                    running = false;
                }
#if LAB_CHECKPOINT >= 2
                if (event.key.key == SDLK_R) {
                    particleCount = 1000U;
                    targetTemperature = 0.2;
                    density = 0.55;
                    seed = 42U;
#if LAB_CHECKPOINT >= 5
                    fixedDt = 0.001;
#endif
                    rebuildSystem();
                }
                if (event.key.key == SDLK_T) {
                    targetTemperature += 0.15;
                    if (targetTemperature > 0.65) {
                        targetTemperature = 0.1;
                    }
                    rebuildSystem();
                }
                if (event.key.key == SDLK_S) {
                    ++seed;
                    rebuildSystem();
                }
                if (event.key.key == SDLK_D) {
                    density += 0.05;
                    if (density > 0.7501) {
                        density = 0.35;
                    }
                    rebuildSystem();
                }
#endif
#if LAB_CHECKPOINT >= 5
                if (event.key.key == SDLK_SPACE) {
                    paused = !paused;
                }
                if (event.key.key == SDLK_LEFTBRACKET) {
                    fixedDt = std::max(0.0005, fixedDt * 0.5);
                    rebuildSystem();
                }
                if (event.key.key == SDLK_RIGHTBRACKET) {
                    fixedDt = std::min(0.004, fixedDt * 2.0);
                    rebuildSystem();
                }
                if (event.key.key == SDLK_N && paused) {
                    const std::uint64_t stepStart = SDL_GetPerformanceCounter();
                    if (md::velocityVerletStep(system, fixedDt, &forceEvaluation)) {
                        completedSubsteps = 1;
#if LAB_CHECKPOINT >= 6
                        metrics = md::measureSystem(system, forceEvaluation);
                        maximumEnergyDrift = std::max(maximumEnergyDrift, std::abs(md::relativeEnergyDrift(metrics.totalEnergy, system.initialEnergy)));
#endif
                    } else {
                        stepError = "step rejected; reduce dt or density";
                    }
#if LAB_CHECKPOINT >= 7
                    const std::uint64_t stepEnd = SDL_GetPerformanceCounter();
                    lastStepMilliseconds =
                        1000.0 * double(stepEnd - stepStart) / double(SDL_GetPerformanceFrequency());
#else
                    static_cast<void>(stepStart);
#endif
#if LAB_CHECKPOINT >= 6
                    md_ui::appendHistory(history, system, metrics);
#endif
                }
#endif
#if LAB_CHECKPOINT >= 7
                if (event.key.key == SDLK_1) {
                    particleCount = 64U;
                    rebuildSystem();
                }
                if (event.key.key == SDLK_2) {
                    particleCount = 144U;
                    rebuildSystem();
                }
                if (event.key.key == SDLK_3) {
                    particleCount = 256U;
                    rebuildSystem();
                }
                if (event.key.key == SDLK_4) {
                    particleCount = 1000U;
                    rebuildSystem();
                }
                if (event.key.key == SDLK_B) {
                    showScaling = !showScaling;
                }
#endif
#if LAB_CHECKPOINT >= 8
                if (event.key.key == SDLK_V) {
                    const md::ValidationReport report = md::validateMolecularDynamics();
                    if (report.passed()) {
                        validationState = md_ui::ValidationState::passed;
                    } else {
                        validationState = md_ui::ValidationState::failed;
                    }
                    md_ui::printValidationReport(report);
                }
#endif
            }
#if LAB_CHECKPOINT >= 1
            if (event.type == SDL_EVENT_MOUSE_BUTTON_DOWN &&
                event.button.button == SDL_BUTTON_LEFT) {
                bool reservePanel = false;
#if LAB_CHECKPOINT >= 3
                reservePanel = true;
#endif
                const md_ui::WorldView view = md_ui::makeWorldView(width, height, reservePanel);
                selectedIndex = nearestParticle(
                    system,
                    view,
                    event.button.x,
                    event.button.y
                );
            }
#endif
        }

#if LAB_CHECKPOINT >= 5
        const std::uint64_t currentCounter = SDL_GetPerformanceCounter();
        const double frameTime =
            double(currentCounter - previousCounter) / double(SDL_GetPerformanceFrequency());
        previousCounter = currentCounter;
        if (!paused) {
            completedSubsteps = 0;
            int maximumSteps = 4;
            if (system.particles.size() >= 1000U) {
                maximumSteps = 1;
            }
            const md::FixedStepPlan plan = md::planFixedSteps(
                accumulator,
                frameTime * 0.05,
                fixedDt,
                maximumSteps,
                0.05
            );
            accumulator = plan.remainder;
            droppedTime += plan.droppedTime;
            const std::uint64_t stepStart = SDL_GetPerformanceCounter();
            for (int step = 0; step < plan.steps; ++step) {
                if (!md::velocityVerletStep(system, fixedDt, &forceEvaluation)) {
                    paused = true;
                    stepError = "step rejected; reduce dt or density";
                    break;
                }
                ++completedSubsteps;
#if LAB_CHECKPOINT >= 6
                metrics = md::measureSystem(system, forceEvaluation);
                maximumEnergyDrift = std::max(maximumEnergyDrift, std::abs(md::relativeEnergyDrift(metrics.totalEnergy, system.initialEnergy)));
#endif
            }
#if LAB_CHECKPOINT >= 7
            const std::uint64_t stepEnd = SDL_GetPerformanceCounter();
            if (completedSubsteps > 0) {
                lastStepMilliseconds =
                    1000.0 * double(stepEnd - stepStart) /
                    double(SDL_GetPerformanceFrequency()) / double(completedSubsteps);
            }
#else
            static_cast<void>(stepStart);
#endif
            if (completedSubsteps > 0) {
#if LAB_CHECKPOINT >= 6
                if (system.elapsed >= nextHistoryTime) {
                    md_ui::appendHistory(history, system, metrics);
                    nextHistoryTime = system.elapsed + 0.02;
                }
#endif
            }
        }
#endif

        framebuffer::clear(pixels, kBackground);
#if LAB_CHECKPOINT == 0
        drawStarterScene(pixels, width, height);
#elif LAB_CHECKPOINT >= 1
        bool reservePanel = false;
#if LAB_CHECKPOINT >= 3
        reservePanel = true;
#endif
        const md_ui::WorldView view = md_ui::makeWorldView(width, height, reservePanel);
        bool drawVelocities = false;
#if LAB_CHECKPOINT >= 2
        drawVelocities = true;
#endif
        md_ui::drawSystem(
            pixels,
            width,
            height,
            system,
            view,
            selectedIndex,
            drawVelocities
        );
#if LAB_CHECKPOINT >= 3
        md_ui::drawCutoffGraph(pixels, width, height, system.parameters);
#endif
#if LAB_CHECKPOINT >= 6
        md_ui::drawEnergyHistory(pixels, width, height, history);
#endif
#if LAB_CHECKPOINT >= 7
        if (showScaling) {
            md_ui::drawScalingBars(pixels, width, height);
        }
#endif
#endif

        char title[512]{};
#if LAB_CHECKPOINT == 0
        std::snprintf(title, sizeof(title), "Project 42 starter | static particle box");
#elif LAB_CHECKPOINT == 1
        std::snprintf(
            title,
            sizeof(title),
            "Project 42 | N=%zu | box %.2f x %.2f | selected=%zu",
            system.particles.size(),
            system.box.width,
            system.box.height,
            selectedIndex
        );
#elif LAB_CHECKPOINT == 2
        const md::Vec2 momentum = md::linearMomentum(system.particles);
        std::snprintf(
            title,
            sizeof(title),
            "Project 42 | N=%zu | T=%.4f | |P|=%.3e | cutoff=%.2f",
            system.particles.size(),
            md::kineticTemperature(system.particles),
            md::length(momentum),
            system.parameters.cutoff
        );
#elif LAB_CHECKPOINT == 3
        const md::Vec2 momentum = md::linearMomentum(system.particles);
        std::snprintf(
            title,
            sizeof(title),
            "Project 42 | N=%zu | T=%.4f | |P|=%.3e | cutoff=%.2f",
            system.particles.size(),
            md::kineticTemperature(system.particles),
            md::length(momentum),
            system.parameters.cutoff
        );
#elif LAB_CHECKPOINT == 4
        std::snprintf(
            title,
            sizeof(title),
            "Project 42 | N=%zu | pairs=%zu | active=%zu | t=%.4f",
            system.particles.size(),
            forceEvaluation.evaluatedPairs,
            forceEvaluation.activePairs,
            system.elapsed
        );
#elif LAB_CHECKPOINT == 5
        std::snprintf(
            title,
            sizeof(title),
            "Project 42 | N=%zu | pairs=%zu | active=%zu | t=%.4f",
            system.particles.size(),
            forceEvaluation.evaluatedPairs,
            forceEvaluation.activePairs,
            system.elapsed
        );
#elif LAB_CHECKPOINT == 6
        std::snprintf(
            title,
            sizeof(title),
            "Project 42 | N=%zu | T=%.4f | E=%.5f | drift=%.4f%% | dropped=%.3f sim units",
            system.particles.size(),
            metrics.temperature,
            metrics.totalEnergy,
            100.0 * md::relativeEnergyDrift(metrics.totalEnergy, system.initialEnergy),
            droppedTime
        );
#elif LAB_CHECKPOINT == 7
        std::snprintf(
            title,
            sizeof(title),
            "Project 42 | N=%zu | pairs=%zu | step=%.3fms | B scaling | 1-4 presets",
            system.particles.size(),
            forceEvaluation.evaluatedPairs,
            lastStepMilliseconds
        );
#elif LAB_CHECKPOINT >= 8
        std::snprintf(
            title,
            sizeof(title),
            "Project 42 | N=%zu | pairs=%zu | T=%.4f | E drift=%.4f%% | VALID %s",
            system.particles.size(),
            forceEvaluation.evaluatedPairs,
            metrics.temperature,
            100.0 * md::relativeEnergyDrift(metrics.totalEnergy, system.initialEnergy),
            md_ui::validationLabel(validationState)
        );
#endif
        SDL_SetWindowTitle(window, title);

        if (!SDL_UpdateTexture(
                texture,
                nullptr,
                pixels.data(),
                width * int(sizeof(std::uint32_t))
            )) {
            std::cerr << "SDL_UpdateTexture failed: " << SDL_GetError() << '\n';
            failed = true;
            running = false;
        }
        if (!SDL_RenderClear(renderer) || !SDL_RenderTexture(renderer, texture, nullptr, nullptr)) {
            failed = true;
            running = false;
        }
#if LAB_CHECKPOINT >= 6
        std::vector<std::string> lines;
        char line[256]{};
        std::snprintf(line, sizeof(line), "N=%zu rho=%.2f T0=%.2f seed=%u dt=%.4f", particleCount, density, targetTemperature, unsigned(seed), fixedDt);
        lines.emplace_back(line);
        std::snprintf(line, sizeof(line), "t=%.3f steps=%zu dropped=%.4f wall=%zu", system.elapsed, system.stepCount, droppedTime, system.wallCollisions);
        lines.emplace_back(line);
        std::snprintf(line, sizeof(line), "K=%.3f U=%.3f E=%.3f T(com)=%.4f", metrics.kinetic, metrics.potential, metrics.totalEnergy, metrics.temperature);
        lines.emplace_back(line);
        std::snprintf(line, sizeof(line), "|P|=%.4f max |dE/E0|=%.4f%%", md::length(metrics.momentum), 100.0 * maximumEnergyDrift);
        lines.emplace_back(line);
        const md::Particle& selected = system.particles[selectedIndex];
        std::snprintf(line, sizeof(line), "#%zu x=(%.3f,%.3f) v=(%.3f,%.3f)", selectedIndex, selected.position.x, selected.position.y, selected.velocity.x, selected.velocity.y);
        lines.emplace_back(line);
#if LAB_CHECKPOINT >= 7
        std::snprintf(line, sizeof(line), "pairs/pass=%zu visits/step=%zu", forceEvaluation.evaluatedPairs, 2U * forceEvaluation.evaluatedPairs);
        lines.emplace_back(line);
        std::snprintf(line, sizeof(line), "step+metrics=%.3fms (no render)", lastStepMilliseconds);
        lines.emplace_back(line);
#endif
        lines.emplace_back("T temp / D density / S seed / [ ] dt / R reset");
        lines.emplace_back("Space pause / N step / playback 0.05 sim-unit/s");
        lines.emplace_back(stepError);
        if (!md_ui::drawDiagnostics(renderer, height, lines)) {
            failed = true;
            running = false;
        }
#endif
        if (!SDL_RenderPresent(renderer)) {
            failed = true;
            running = false;
        }
        SDL_Delay(1);
    }

    if (failed) {
        std::cerr << "SDL rendering failed: " << SDL_GetError() << '\n';
    }
    // Giải phóng theo thứ tự ngược với lúc tạo để không còn resource phụ thuộc.
    SDL_DestroyTexture(texture);
    SDL_DestroyRenderer(renderer);
    SDL_DestroyWindow(window);
    SDL_Quit();
    if (failed) {
        return EXIT_FAILURE;
    }
    return EXIT_SUCCESS;
}
