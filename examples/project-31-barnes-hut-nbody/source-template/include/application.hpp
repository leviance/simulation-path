#pragma once
// Event loop only coordinates the model, bounded jobs and presentation.
#include "presentation.hpp"
#include <iostream>
#include <string_view>

namespace project31 {
inline int runApplication(SDL_Window* window, SDL_Renderer* renderer, SDL_Texture* texture, bool smoke, bool workflow) {
    lab::Simulation simulation{};
    simulation.reset();
    std::vector<std::uint32_t> pixels(1120 * 570);
    bool running = true;
    bool singleStep = false;
    bool jobsPaused = false;
    bool dragging = false;
    Uint8 dragButton = 0;
    SDL_MouseID mouse = 0;
    float previousX = 0;
    float previousY = 0;
    float startX = 0;
    float startY = 0;
    lab::OrbitCamera beforeDrag{};
    std::size_t frames = 0;
    const auto started = SDL_GetTicks();
#if LAB_CHECKPOINT >= 8
    lab::SurveyJob survey{};
#endif
#if LAB_CHECKPOINT >= 9
    lab::RuntimeJob runtime{};
#endif
#if LAB_CHECKPOINT >= 10
    lab::EnergyJob energy{};
    std::vector<lab::DiagnosticSample> history{};
    std::vector<lab::TimestepRow> timestepRows{};
    energy.start(simulation);
#endif

    const auto cancel = [&]() {
        jobsPaused = false;
        singleStep = false;
        simulation.paused = true;
#if LAB_CHECKPOINT >= 4
        simulation.physicsPending = false;
#endif
#if LAB_CHECKPOINT >= 8
        survey = {};
#endif
#if LAB_CHECKPOINT >= 9
        runtime = {};
#endif
#if LAB_CHECKPOINT >= 10
        energy = {};
#endif
        simulation.notice = "Cancelled; no partial physics step committed";
    };
    // Cancelling unfinished work does not erase completed measurements. Reset or
    // a configuration change starts a new experiment and discards its history.
    const auto clearDiagnostics = [&]() {
#if LAB_CHECKPOINT >= 10
        history.clear();
        timestepRows.clear();
#endif
    };
    const auto release = [&]() {
        dragging = false;
        SDL_CaptureMouse(false);
    };
    const auto rotateOrPan = [&](float x, float y) {
        const double dx = double(x - previousX);
        const double dy = double(y - previousY);
        if (dragButton == SDL_BUTTON_LEFT) {
            simulation.camera.yaw += dx * 0.006;
            simulation.camera.pitch = std::clamp(simulation.camera.pitch + dy * 0.006, -1.4, 1.4);
        } else {
            simulation.camera.target.x -= dx * simulation.camera.distance / 570.0;
            simulation.camera.target.y += dy * simulation.camera.distance / 570.0;
        }
        previousX = x;
        previousY = y;
    };

    while (running) {
        bool experimentActive = false;
#if LAB_CHECKPOINT >= 8
        experimentActive = experimentActive || survey.active;
#endif
#if LAB_CHECKPOINT >= 9
        experimentActive = experimentActive || runtime.active;
#endif
#if LAB_CHECKPOINT >= 10
        experimentActive = experimentActive || energy.active;
#endif
        SDL_Event event{};
        while (SDL_PollEvent(&event)) {
            SDL_ConvertEventToRenderCoordinates(renderer, &event);
            if (event.type == SDL_EVENT_QUIT) {
                running = false;
            } else if (event.type == SDL_EVENT_WINDOW_FOCUS_LOST) {
                release();
                if (!smoke) {
                    simulation.paused = true;
                    jobsPaused = true;
                }
            } else if (event.type == SDL_EVENT_WINDOW_PIXEL_SIZE_CHANGED) {
                // Logical framebuffer stays 1120x570; initial resize must not pause jobs.
                release();
            } else if (event.type == SDL_EVENT_MOUSE_BUTTON_DOWN && !dragging && event.button.x >= 0 && event.button.x < 1120 && event.button.y >= 0 && event.button.y < 570 && (event.button.button == SDL_BUTTON_LEFT || event.button.button == SDL_BUTTON_RIGHT)) {
                mouse = event.button.which;
                dragButton = event.button.button;
                previousX = startX = event.button.x;
                previousY = startY = event.button.y;
                beforeDrag = simulation.camera;
                dragging = SDL_CaptureMouse(true);
            } else if (event.type == SDL_EVENT_MOUSE_MOTION && dragging && event.motion.which == mouse) {
                rotateOrPan(event.motion.x, event.motion.y);
            } else if (event.type == SDL_EVENT_MOUSE_BUTTON_UP && dragging && event.button.which == mouse && event.button.button == dragButton) {
                rotateOrPan(event.button.x, event.button.y);
                if (dragButton == SDL_BUTTON_LEFT && std::hypot(event.button.x - startX, event.button.y - startY) < 3) {
                    double nearest = 100;
                    for (std::size_t i = 0; i < simulation.bodies.size(); ++i) {
                        const auto p = projectToScreen(simulation.bodies[i].position, simulation.camera, 1120, 570);
                        const double d2 = std::pow(p.x - event.button.x, 2) + std::pow(p.y - event.button.y, 2);
                        if (p.visible && d2 < nearest) {
                            nearest = d2;
                            simulation.selected = i;
                        }
                    }
                }
                release();
            } else if (event.type == SDL_EVENT_MOUSE_WHEEL) {
                simulation.camera.distance = std::clamp(simulation.camera.distance * std::exp(-double(event.wheel.y) * 0.08), 0.3, 30.0);
            } else if (event.type == SDL_EVENT_KEY_DOWN && !event.key.repeat) {
                const auto key = event.key.key;
                if (key == SDLK_ESCAPE) {
                    if (dragging) {
                        simulation.camera = beforeDrag;
                        release();
                    } else if (experimentActive) {
                        cancel();
                    } else {
                        running = false;
                    }
                } else if (key == SDLK_SPACE) {
                    if (experimentActive) {
                        jobsPaused = !jobsPaused;
                    } else {
                        simulation.paused = !simulation.paused;
                    }
                } else if (key == SDLK_HOME) {
                    simulation.camera = {};
                } else if (key == SDLK_F) {
                    simulation.debug = !simulation.debug;
                } else if (key == SDLK_LEFT || key == SDLK_RIGHT) {
                    double change = 0.08;
                    if (key == SDLK_LEFT) {
                        change = -change;
                    }
                    simulation.camera.yaw += change;
                } else if (key == SDLK_UP || key == SDLK_DOWN) {
                    double change = 0.08;
                    if (key == SDLK_UP) {
                        change = -change;
                    }
                    simulation.camera.pitch = std::clamp(simulation.camera.pitch + change, -1.4, 1.4);
                } else if (key == SDLK_COMMA || key == SDLK_PERIOD) {
                    std::size_t change = 1;
                    if (key == SDLK_COMMA) {
                        change = simulation.bodies.size() - 1;
                    }
                    simulation.selected = (simulation.selected + change) % simulation.bodies.size();
                } else if (key == SDLK_R || (key >= SDLK_1 && key <= SDLK_5)) {
                    int preset = simulation.preset;
                    if (key != SDLK_R) {
                        preset = int(key - SDLK_1);
                    }
                    cancel();
                    clearDiagnostics();
                    release();
                    simulation.reset(preset);
                    simulation.notice = "Reset selected preset/seed; physics paused";
                }
#if LAB_CHECKPOINT >= 4
                else if (key == SDLK_N) {
                    cancel();
                    lab::beginPhysics(simulation);
                    singleStep = true;
                } else if (key == SDLK_D) {
                    cancel();
                    clearDiagnostics();
                    simulation.dt *= 0.5;
                    if (simulation.dt < 1.0 / 240.0 - 1e-12) {
                        simulation.dt = 1.0 / 60.0;
                    }
                }
#endif
#if LAB_CHECKPOINT >= 6
                else if (key == SDLK_M) {
                    cancel();
                    if (simulation.bodies.size() <= 256) {
                        clearDiagnostics();
                        simulation.direct = !simulation.direct;
                    } else {
                        simulation.notice = "Direct simulation budget N<=256; choose preset 3,4,5. Large reference uses sampled targets.";
                    }
                } else if (key == SDLK_LEFTBRACKET || key == SDLK_RIGHTBRACKET) {
                    cancel();
                    clearDiagnostics();
                    double change = 0.05;
                    if (key == SDLK_LEFTBRACKET) {
                        change = -change;
                    }
                    simulation.theta = std::clamp(simulation.theta + change, 0.05, 1.2);
                } else if (key == SDLK_MINUS || key == SDLK_EQUALS) {
                    cancel();
                    clearDiagnostics();
                    double change = 0.005;
                    if (key == SDLK_MINUS) {
                        change = -change;
                    }
                    simulation.epsilon = std::clamp(simulation.epsilon + change, 0.005, 0.08);
                }
#endif
#if LAB_CHECKPOINT >= 8
                else if (key == SDLK_T) {
                    cancel();
                    survey.start(simulation);
                }
#endif
#if LAB_CHECKPOINT >= 7
                else if (key == SDLK_V) {
                    const auto report = lab::inspectMassOctree(simulation.tree, simulation.bodies);
                    const bool valid = report.everyBodyStoredOnce && report.internalNodesEmpty && report.childIndicesValid && report.childBoundsValid && report.aggregateMassValid && report.centerOfMassValid && report.statisticsMatch;
                    simulation.notice = "Topology valid=" + std::to_string(valid) + " storage=" + std::to_string(report.everyBodyStoredOnce) + " mass=" + std::to_string(report.aggregateMassValid) + " COM=" + std::to_string(report.centerOfMassValid) + " child=" + std::to_string(report.childIndicesValid);
                }
#endif
#if LAB_CHECKPOINT >= 9
                // [snippet:startRuntimeJob]
                else if (key == SDLK_B) {
                    cancel();
                    runtime.start(simulation.theta, simulation.epsilon);
                }
                // [/snippet:startRuntimeJob]
#endif
#if LAB_CHECKPOINT >= 10
                else if (key == SDLK_E) {
                    simulation.paused = true;
                    simulation.physicsPending = false;
                    survey = {};
                    runtime = {};
                    energy.start(simulation);
                    jobsPaused = false;
                } else if (key == SDLK_I) {
                    cancel();
                    timestepRows = lab::timestepStudy();
                    for (const auto& row : timestepRows) {
                        std::cout << "dt=" << row.dt << " position error=" << row.positionError << " dE/E0=" << row.energyDrift << '\n';
                    }
                    simulation.notice = "dt study: binary T=1 theta=0.5 eps=0.02; results above viewport and terminal";
                }
#endif
            }
        }
        experimentActive = false;
#if LAB_CHECKPOINT >= 8
        if (survey.active && !jobsPaused) {
            survey.tick();
        }
        experimentActive = experimentActive || survey.active;
#endif
#if LAB_CHECKPOINT >= 9
        if (runtime.active && !jobsPaused) {
            runtime.tick();
        }
        experimentActive = experimentActive || runtime.active;
#endif
#if LAB_CHECKPOINT >= 10
        // [snippet:consumeEnergySample]
        if (energy.active && !jobsPaused) {
            energy.tick();
            if (!energy.active) {
                history.push_back({energy.time, energy.result});
                if (history.size() > 64) {
                    history.erase(history.begin());
                }
            }
        }
        // [/snippet:consumeEnergySample]
        experimentActive = experimentActive || energy.active;
#endif
#if LAB_CHECKPOINT >= 4
        if (workflow && simulation.steps < 2 && !simulation.physicsPending) {
            lab::beginPhysics(simulation);
            singleStep = true;
        }
        if (!experimentActive && (!simulation.paused || singleStep)) {
            if (!simulation.physicsPending) {
                lab::beginPhysics(simulation);
            }
            if (lab::advancePhysics(simulation)) {
                singleStep = false;
#if LAB_CHECKPOINT >= 10
                if (simulation.steps % 32 == 0) {
                    energy.start(simulation);
                }
#endif
            }
        }
#endif
        drawScene(pixels, 1120, 570, simulation);
        if (!SDL_UpdateTexture(texture, nullptr, pixels.data(), 1120 * int(sizeof(std::uint32_t)))) {
            throw std::runtime_error(SDL_GetError());
        }
        SDL_SetRenderDrawColor(renderer, 11, 16, 32, 255);
        SDL_RenderClear(renderer);
        const SDL_FRect viewport{0, 0, 1120, 570};
        SDL_RenderTexture(renderer, texture, nullptr, &viewport);
        drawHud(renderer, simulation);
#if LAB_CHECKPOINT >= 8
        if (survey.row > 0) {
            double maxError = 1e-12;
            for (std::size_t i = 0; i < survey.row; ++i) {
                maxError = std::max(maxError, survey.rows[i].normalizedRmsError);
            }
            for (std::size_t i = 0; i < survey.row; ++i) {
                const auto& row = survey.rows[i];
                SDL_RenderDebugTextFormat(renderer, 12, 12 + float(i * 19), "theta %.2f absRMS %.3e normRMS %.3e work %zu @t=%.4f", row.theta, row.absoluteRmsError, row.normalizedRmsError, row.metrics.exactInteractions + row.metrics.approximatedNodes, survey.snapshotTime);
                const SDL_FRect bar{760, 12 + float(i * 19), float(std::min(300.0, row.normalizedRmsError / maxError * 300)), 10};
                SDL_RenderFillRect(renderer, &bar);
            }
        }
        if (survey.active || survey.timedOut) {
            SDL_RenderDebugTextFormat(renderer, 12, 83, "Sweep row %zu/4 target %zu/%zu | %s; Space pause/resume, Escape cancel", survey.row, survey.sample, survey.reference.size(), survey.timedOut ? "INCOMPLETE: deadline" : jobsPaused ? "PAUSED"
                                                                                                                                                                                                                                            : "RUNNING");
        }
#endif
#if LAB_CHECKPOINT >= 9
        for (std::size_t i = 0; i < runtime.rows.size(); ++i) {
            const auto& row = runtime.rows[i];
            SDL_RenderDebugTextFormat(renderer, 12, 100 + float(i * 19), "N %zu direct %.1f [%.1f,%.1f]us BH %.1f [%.1f,%.1f]us build %.1fus work %zu/%zu", row.count, row.directMedian, row.directMinimum, row.directMaximum, row.treeMedian, row.treeMinimum, row.treeMaximum, row.buildMicroseconds, row.directWork, row.treeWork);
        }
        if (runtime.active) {
            SDL_RenderDebugTextFormat(renderer, 12, 180, "Runtime size %d/3 warmup+sample %d/6 method %d/2 target %zu/%zu; Space pause, Escape cancel", runtime.sizeIndex + 1, runtime.sample, runtime.method, runtime.target, runtime.bodies.size());
        }
        if (runtime.timedOut) {
            SDL_RenderDebugText(renderer, 12, 180, "Runtime INCOMPLETE: 30 second deadline; only completed rows are shown.");
        }
#endif
#if LAB_CHECKPOINT >= 10
        if (!history.empty()) {
            const auto& sample = history.back();
            const auto& reference = history.front();
            // The first retained sample is the reference, not necessarily t=0
            // after the bounded history has started dropping old measurements.
            const double relativeEnergyChange = (sample.values.totalEnergy - reference.values.totalEnergy) / std::max(std::abs(reference.values.totalEnergy), 1e-12);
            const double momentumChange = lab::length(sample.values.momentum - reference.values.momentum);
            SDL_RenderDebugTextFormat(renderer, 12, 687, "N=%zu t=%.5f E=%.4e dE/|Eref|=%.2e |P|=%.2e |dP|=%.2e ref t=%.5f samples=%zu", simulation.bodies.size(), sample.time, sample.values.totalEnergy, relativeEnergyChange, lab::length(sample.values.momentum), momentumChange, reference.time, history.size());
        }
        for (std::size_t i = 0; i < timestepRows.size(); ++i) {
            const auto& row = timestepRows[i];
            SDL_RenderDebugTextFormat(renderer, 12, 210 + float(i * 19), "Binary T=1 dt=%.6f error=%.3e dE/E0=%.3e", row.dt, row.positionError, row.energyDrift);
        }
#endif
        SDL_RenderPresent(renderer);
        SDL_Delay(1);
        ++frames;
        bool finishedWorkflow = false;
#if LAB_CHECKPOINT >= 4
        finishedWorkflow = simulation.steps >= 2;
#endif
        if ((smoke && !workflow && frames >= 4) || (workflow && finishedWorkflow)) {
            std::cout << "P31 N=" << simulation.bodies.size() << " steps=" << simulation.steps << " seed=" << lab::galaxySeed << '\n';
            break;
        }
        if ((smoke || workflow) && SDL_GetTicks() - started > 10000) {
            throw std::runtime_error("Finite smoke deadline exceeded");
        }
    }
    release();
    SDL_SetWindowTitle(window, "Project 31 complete");
    return EXIT_SUCCESS;
}
} // namespace project31
