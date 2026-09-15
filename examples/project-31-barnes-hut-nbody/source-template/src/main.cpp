#include "lab.hpp"
#include "render.hpp"

#include <SDL3/SDL.h>

#include <algorithm>
#include <array>
#include <cstddef>
#include <cstdint>
#include <cstdio>
#include <cstdlib>
#include <iostream>
#include <vector>

int main() {
    // Setup SDL chỉ lo window, input và present; mọi phép tính lực và pixel đều do ta tự viết.
    if (!SDL_Init(SDL_INIT_VIDEO)) {
        std::cerr << "SDL_Init failed: " << SDL_GetError() << '\n';
        return EXIT_FAILURE;
    }

    SDL_Window* window = SDL_CreateWindow(
        "Project 31 | Barnes-Hut N-body",
        project31::kInitialWidth,
        project31::kInitialHeight,
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

    int width = project31::kInitialWidth;
    int height = project31::kInitialHeight;
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
        project31::kBackground
    );

    constexpr std::uint32_t seed = 0x31c0ffeeU;
#if LAB_CHECKPOINT >= 2
    constexpr double gravitationalConstant = 0.001;
#endif
#if LAB_CHECKPOINT >= 4
    constexpr double fixedDeltaSeconds = 1.0 / 240.0;
#endif
#if LAB_CHECKPOINT >= 6
    constexpr std::size_t initialBodyCount = 2'048U;
#else
    constexpr std::size_t initialBodyCount = 512U;
#endif
    std::vector<lab::Body> bodies = lab::makeGalaxyBodies(initialBodyCount, seed);
    lab::OrbitCamera camera{};
    std::size_t selectedBody = std::min<std::size_t>(1U, bodies.size() - 1U);
    double theta = 0.5;
    double softening = 0.02;
    bool paused = true;
    bool rotatingCamera = false;

#if LAB_CHECKPOINT >= 4
    double accumulatorSeconds = 0.0;
    std::uint64_t previousTicks = SDL_GetTicks();
#endif
#if LAB_CHECKPOINT >= 5
    lab::BarnesHutTree tree = lab::buildMassOctree(bodies);
#endif
#if LAB_CHECKPOINT >= 7
    lab::BarnesHutTopologyReport topology = lab::inspectMassOctree(tree, bodies);
#endif
#if LAB_CHECKPOINT >= 8
    const std::array<double, 4> thetaValues{0.25, 0.5, 0.8, 1.1};
    std::vector<lab::AccuracyRow> accuracyRows{};
#endif
#if LAB_CHECKPOINT >= 9
    std::vector<lab::ScalingRow> scalingRows{};
#endif
#if LAB_CHECKPOINT >= 10
    const std::size_t diagnosticCount = std::min<std::size_t>(512U, bodies.size());
    lab::SystemDiagnostics diagnostics = lab::systemDiagnostics(
        std::span<const lab::Body>(bodies).first(diagnosticCount),
        gravitationalConstant,
        softening
    );
    lab::BarnesHutValidationReport validation = lab::validateBarnesHutExperiment(
        bodies,
        theta,
        gravitationalConstant,
        softening
    );
    bool diagnosticsStale = false;
    bool validationCurrent = true;
    std::uint64_t lastDiagnosticsTicks = SDL_GetTicks();
#endif

    bool running = true;
    while (running) {
        SDL_Event event{};
        while (SDL_PollEvent(&event)) {
            if (event.type == SDL_EVENT_QUIT) {
                running = false;
            } else if (event.type == SDL_EVENT_WINDOW_PIXEL_SIZE_CHANGED) {
                width = std::max(1, event.window.data1);
                height = std::max(1, event.window.data2);
                SDL_DestroyTexture(texture);
                texture = SDL_CreateTexture(
                    renderer,
                    SDL_PIXELFORMAT_RGBA8888,
                    SDL_TEXTUREACCESS_STREAMING,
                    width,
                    height
                );
                if (!texture) {
                    std::cerr
                        << "SDL_CreateTexture failed after resize: "
                        << SDL_GetError() << '\n';
                    running = false;
                }
                pixels.assign(
                    std::size_t(width) * std::size_t(height),
                    project31::kBackground
                );
            } else if (
                event.type == SDL_EVENT_MOUSE_BUTTON_DOWN &&
                event.button.button == SDL_BUTTON_LEFT
            ) {
                rotatingCamera = true;
                paused = true;
                SDL_CaptureMouse(true);
            } else if (event.type == SDL_EVENT_MOUSE_MOTION && rotatingCamera) {
                camera.yaw += double(event.motion.xrel) * 0.008;
                camera.pitch += double(event.motion.yrel) * 0.008;
                camera.pitch = std::clamp(camera.pitch, -1.35, 1.35);
            } else if (
                event.type == SDL_EVENT_MOUSE_BUTTON_UP &&
                event.button.button == SDL_BUTTON_LEFT
            ) {
                rotatingCamera = false;
                SDL_CaptureMouse(false);
            } else if (event.type == SDL_EVENT_MOUSE_WHEEL) {
                camera.distance += double(event.wheel.y) * -0.12;
                camera.distance = std::clamp(camera.distance, 1.3, 5.0);
            } else if (event.type == SDL_EVENT_KEY_DOWN && !event.key.repeat) {
                if (event.key.key == SDLK_ESCAPE) {
                    running = false;
                } else if (event.key.key == SDLK_SPACE) {
                    paused = !paused;
                } else if (event.key.key == SDLK_LEFT) {
                    camera.yaw -= 0.08;
                } else if (event.key.key == SDLK_RIGHT) {
                    camera.yaw += 0.08;
                } else if (event.key.key == SDLK_UP) {
                    camera.pitch = std::max(-1.35, camera.pitch - 0.08);
                } else if (event.key.key == SDLK_DOWN) {
                    camera.pitch = std::min(1.35, camera.pitch + 0.08);
                } else if (event.key.key == SDLK_COMMA) {
                    if (selectedBody == 0U) {
                        selectedBody = bodies.size() - 1U;
                    } else {
                        selectedBody -= 1U;
                    }
                } else if (event.key.key == SDLK_PERIOD) {
                    selectedBody = (selectedBody + 1U) % bodies.size();
                } else if (event.key.key == SDLK_LEFTBRACKET) {
                    theta = std::max(0.1, theta - 0.05);
                    paused = true;
#if LAB_CHECKPOINT >= 8
                    accuracyRows.clear();
#endif
#if LAB_CHECKPOINT >= 9
                    scalingRows.clear();
#endif
#if LAB_CHECKPOINT >= 10
                    validationCurrent = false;
#endif
                } else if (event.key.key == SDLK_RIGHTBRACKET) {
                    theta = std::min(1.2, theta + 0.05);
                    paused = true;
#if LAB_CHECKPOINT >= 8
                    accuracyRows.clear();
#endif
#if LAB_CHECKPOINT >= 9
                    scalingRows.clear();
#endif
#if LAB_CHECKPOINT >= 10
                    validationCurrent = false;
#endif
                } else if (event.key.key == SDLK_MINUS) {
                    softening = std::max(0.005, softening - 0.005);
                    paused = true;
#if LAB_CHECKPOINT >= 8
                    accuracyRows.clear();
#endif
#if LAB_CHECKPOINT >= 9
                    scalingRows.clear();
#endif
#if LAB_CHECKPOINT >= 10
                    diagnosticsStale = true;
                    validationCurrent = false;
#endif
                } else if (event.key.key == SDLK_EQUALS) {
                    softening = std::min(0.08, softening + 0.005);
                    paused = true;
#if LAB_CHECKPOINT >= 8
                    accuracyRows.clear();
#endif
#if LAB_CHECKPOINT >= 9
                    scalingRows.clear();
#endif
#if LAB_CHECKPOINT >= 10
                    diagnosticsStale = true;
                    validationCurrent = false;
#endif
                } else if (event.key.key == SDLK_R) {
                    SDL_CaptureMouse(false);
                    rotatingCamera = false;
                    paused = true;
                    theta = 0.5;
                    softening = 0.02;
                    selectedBody = 1U;
                    camera = {};
                    bodies = lab::makeGalaxyBodies(initialBodyCount, seed);
#if LAB_CHECKPOINT >= 4
                    accumulatorSeconds = 0.0;
                    previousTicks = SDL_GetTicks();
#endif
#if LAB_CHECKPOINT >= 5
                    tree = lab::buildMassOctree(bodies);
#endif
#if LAB_CHECKPOINT >= 7
                    topology = lab::inspectMassOctree(tree, bodies);
#endif
#if LAB_CHECKPOINT >= 8
                    accuracyRows.clear();
#endif
#if LAB_CHECKPOINT >= 9
                    scalingRows.clear();
#endif
#if LAB_CHECKPOINT >= 10
                    diagnosticsStale = true;
                    validationCurrent = false;
#endif
                }
#if LAB_CHECKPOINT >= 8
                else if (event.key.key == SDLK_T) {
                    accuracyRows = lab::measureThetaAccuracy(
                        bodies,
                        thetaValues,
                        24,
                        gravitationalConstant,
                        softening
                    );
                    project31::printAccuracyTable(accuracyRows);
                    paused = true;
                }
#endif
#if LAB_CHECKPOINT >= 9
                else if (event.key.key == SDLK_B) {
                    const std::array<std::size_t, 4> counts{256U, 512U, 1'024U, 2'048U};
                    scalingRows = lab::makeScalingStudy(
                        counts,
                        seed,
                        theta,
                        gravitationalConstant,
                        softening
                    );
                    project31::printScalingTable(scalingRows);
                    paused = true;
                }
#endif
            }
        }

#if LAB_CHECKPOINT >= 4
        const std::uint64_t currentTicks = SDL_GetTicks();
        const double frameSeconds = double(currentTicks - previousTicks) / 1000.0;
        previousTicks = currentTicks;
        lab::FixedStepPlan stepPlan{};
        bool bodiesChanged = false;
        if (!paused) {
            stepPlan = lab::planFixedSteps(
                accumulatorSeconds,
                frameSeconds,
                fixedDeltaSeconds,
                4
            );
            accumulatorSeconds = stepPlan.remainingSeconds;
        }
        for (int step = 0; step < stepPlan.steps; ++step) {
#if LAB_CHECKPOINT >= 6
            tree = lab::buildMassOctree(bodies);
            const std::vector<lab::Vec3> accelerations = lab::barnesHutAccelerations(
                tree,
                bodies,
                theta,
                gravitationalConstant,
                softening
            );
#else
            const std::vector<lab::Vec3> accelerations = lab::directAccelerations(
                bodies,
                gravitationalConstant,
                softening
            );
#endif
            lab::integrateSymplecticEuler(bodies, accelerations, fixedDeltaSeconds);
            bodiesChanged = true;
        }
#endif

#if LAB_CHECKPOINT >= 5
        if (bodiesChanged) {
            tree = lab::buildMassOctree(bodies);
        }
#endif
#if LAB_CHECKPOINT >= 7
        if (bodiesChanged) {
            topology = lab::inspectMassOctree(tree, bodies);
        }
#endif
#if LAB_CHECKPOINT >= 8
        if (bodiesChanged) {
            accuracyRows.clear();
        }
#endif
#if LAB_CHECKPOINT >= 9
        if (bodiesChanged) {
            scalingRows.clear();
        }
#endif
#if LAB_CHECKPOINT >= 10
        if (bodiesChanged) {
            diagnosticsStale = true;
            validationCurrent = false;
        }
        const bool diagnosticsDue = currentTicks - lastDiagnosticsTicks >= 250U;
        if (diagnosticsStale && (paused || diagnosticsDue)) {
            diagnostics = lab::systemDiagnostics(
                std::span<const lab::Body>(bodies).first(diagnosticCount),
                gravitationalConstant,
                softening
            );
            diagnosticsStale = false;
            lastDiagnosticsTicks = currentTicks;
        }
        if (paused && !validationCurrent) {
            validation = lab::validateBarnesHutExperiment(
                bodies,
                theta,
                gravitationalConstant,
                softening
            );
            validationCurrent = true;
        }
#endif

#if LAB_CHECKPOINT >= 3
        const lab::AccelerationResult exactForce = lab::directAcceleration(
            bodies,
            selectedBody,
            gravitationalConstant,
            softening
        );
#elif LAB_CHECKPOINT >= 2
        const lab::Vec3 pairAcceleration = lab::softenedAcceleration(
            bodies[selectedBody].position,
            bodies[0].position,
            bodies[0].mass,
            gravitationalConstant,
            softening
        );
#endif
#if LAB_CHECKPOINT >= 6
        const lab::AccelerationResult approximateForce = lab::barnesHutAcceleration(
            tree,
            bodies,
            selectedBody,
            theta,
            gravitationalConstant,
            softening
        );
        const double relativeError = lab::length(approximateForce.acceleration - exactForce.acceleration) / std::max(lab::length(exactForce.acceleration), 1.0e-12);
#endif

        std::fill(pixels.begin(), pixels.end(), project31::kBackground);
#if LAB_CHECKPOINT >= 5
        project31::drawMassOctree(pixels, width, height, tree, camera);
#endif
        project31::drawBodies(pixels, width, height, bodies, camera, selectedBody);
#if LAB_CHECKPOINT >= 6
        project31::drawForceArrow(
            pixels,
            width,
            height,
            bodies[selectedBody],
            approximateForce.acceleration,
            camera
        );
#elif LAB_CHECKPOINT >= 3
        project31::drawForceArrow(
            pixels,
            width,
            height,
            bodies[selectedBody],
            exactForce.acceleration,
            camera
        );
#elif LAB_CHECKPOINT >= 2
        project31::drawForceArrow(
            pixels,
            width,
            height,
            bodies[selectedBody],
            pairAcceleration,
            camera
        );
#endif

#if LAB_CHECKPOINT >= 10
        const bool validationPassed = validation.topologyValid && validation.finiteState &&
            validation.zeroSelfForce && validation.thetaAccuracyAcceptable &&
            validation.workReduced;
        const char* validationLabel = "stale";
        if (validationCurrent) {
            if (validationPassed) {
                validationLabel = "valid";
            } else {
                validationLabel = "INVALID";
            }
        }
        char title[720]{};
        std::snprintf(
            title,
            sizeof(title),
            "Project 31 | N %zu theta %.2f eps %.3f | nodes %zu depth %d build %.1f us | selected %zu error %.3f%% visited %zu aggregate %zu exact %zu | E %.4f P %.2e | validation %s | Space pause T accuracy B scaling",
            bodies.size(),
            theta,
            softening,
            tree.nodes.size(),
            tree.maximumObservedDepth,
            tree.rebuildMicroseconds,
            selectedBody,
            relativeError * 100.0,
            approximateForce.metrics.visitedNodes,
            approximateForce.metrics.approximatedNodes,
            approximateForce.metrics.exactInteractions,
            diagnostics.totalEnergy,
            lab::length(diagnostics.momentum),
            validationLabel
        );
        SDL_SetWindowTitle(window, title);
#elif LAB_CHECKPOINT >= 9
        char title[540]{};
        std::snprintf(
            title,
            sizeof(title),
            "Project 31 | N %zu theta %.2f | error %.3f%% | aggregate %zu exact %zu | B scaling rows %zu",
            bodies.size(),
            theta,
            relativeError * 100.0,
            approximateForce.metrics.approximatedNodes,
            approximateForce.metrics.exactInteractions,
            scalingRows.size()
        );
        SDL_SetWindowTitle(window, title);
#elif LAB_CHECKPOINT >= 8
        char title[500]{};
        std::snprintf(
            title,
            sizeof(title),
            "Project 31 | theta %.2f | selected error %.3f%% | T theta sweep (%zu rows)",
            theta,
            relativeError * 100.0,
            accuracyRows.size()
        );
        SDL_SetWindowTitle(window, title);
#elif LAB_CHECKPOINT >= 7
        const bool topologyValid = topology.everyBodyStoredOnce &&
            topology.internalNodesEmpty && topology.childIndicesValid &&
            topology.childBoundsValid && topology.aggregateMassValid &&
            topology.centerOfMassValid && topology.statisticsMatch;
        const char* topologyLabel = "INVALID";
        if (topologyValid) {
            topologyLabel = "valid";
        }
        char title[460]{};
        std::snprintf(
            title,
            sizeof(title),
            "Project 31 | topology %s | theta %.2f | selected error %.3f%% | aggregate %zu exact %zu",
            topologyLabel,
            theta,
            relativeError * 100.0,
            approximateForce.metrics.approximatedNodes,
            approximateForce.metrics.exactInteractions
        );
        SDL_SetWindowTitle(window, title);
#elif LAB_CHECKPOINT >= 6
        char title[420]{};
        std::snprintf(
            title,
            sizeof(title),
            "Project 31 | Barnes-Hut theta %.2f | error %.3f%% | visited %zu aggregate %zu exact %zu",
            theta,
            relativeError * 100.0,
            approximateForce.metrics.visitedNodes,
            approximateForce.metrics.approximatedNodes,
            approximateForce.metrics.exactInteractions
        );
        SDL_SetWindowTitle(window, title);
#elif LAB_CHECKPOINT >= 5
        char title[360]{};
        std::snprintf(
            title,
            sizeof(title),
            "Project 31 | Mass Octree %zu nodes | depth %d | root mass %.2f | direct pairs %zu",
            tree.nodes.size(),
            tree.maximumObservedDepth,
            tree.nodes[0].totalMass,
            exactForce.metrics.exactInteractions
        );
        SDL_SetWindowTitle(window, title);
#elif LAB_CHECKPOINT >= 4
        const char* fixedStepTitle = "Project 31 | fixed-step direct N-body | paused";
        if (!paused) {
            fixedStepTitle = "Project 31 | fixed-step direct N-body | running";
        }
        SDL_SetWindowTitle(window, fixedStepTitle);
#elif LAB_CHECKPOINT >= 3
        char title[300]{};
        std::snprintf(
            title,
            sizeof(title),
            "Project 31 | direct O(N^2) | selected %zu uses %zu source bodies",
            selectedBody,
            exactForce.metrics.exactInteractions
        );
        SDL_SetWindowTitle(window, title);
#elif LAB_CHECKPOINT >= 2
        SDL_SetWindowTitle(window, "Project 31 | softened pair acceleration");
#elif LAB_CHECKPOINT >= 1
        char title[320]{};
        std::snprintf(
            title,
            sizeof(title),
            "Project 31 | %zu bodies | mass %.2f | COM (%.3f, %.3f, %.3f)",
            bodies.size(),
            lab::totalMass(bodies),
            lab::centerOfMass(bodies).x,
            lab::centerOfMass(bodies).y,
            lab::centerOfMass(bodies).z
        );
        SDL_SetWindowTitle(window, title);
#else
        SDL_SetWindowTitle(window, "Project 31 starter | deterministic galaxy | drag to orbit");
#endif

        if (!texture) {
            break;
        }
        SDL_UpdateTexture(
            texture,
            nullptr,
            pixels.data(),
            width * int(sizeof(std::uint32_t))
        );
        SDL_RenderClear(renderer);
        SDL_RenderTexture(renderer, texture, nullptr, nullptr);
        SDL_RenderPresent(renderer);
    }

    // Cleanup theo thứ tự ngược với setup và luôn nhả mouse capture trước.
    SDL_CaptureMouse(false);
    SDL_DestroyTexture(texture);
    SDL_DestroyRenderer(renderer);
    SDL_DestroyWindow(window);
    SDL_Quit();
    return EXIT_SUCCESS;
}
