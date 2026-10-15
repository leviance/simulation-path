#include "audit.hpp"
#include "controls.hpp"
#include <cstdlib>
#include <iomanip>
#include <iostream>
#include <sstream>
#include <string_view>

int main(int argc, char** argv) {
    bool smoke = false;
    for (int i = 1; i < argc; ++i) {
        if (std::string_view(argv[i]) == "--smoke") {
            smoke = true;
        }
    }
    // Khởi tạo SDL; starter chỉ có window, renderer và event loop.
    if (!SDL_Init(SDL_INIT_VIDEO)) {
        std::cerr << SDL_GetError() << '\n';
        return EXIT_FAILURE;
    }
    SDL_WindowFlags flags = SDL_WINDOW_RESIZABLE | SDL_WINDOW_HIGH_PIXEL_DENSITY;
    if (smoke) {
        flags |= SDL_WINDOW_HIDDEN;
    }
    SDL_Window* window = SDL_CreateWindow("Photon rain | analog 2D transport", photon::viewWidth, photon::viewHeight, flags);
    SDL_Renderer* renderer = nullptr;
    if (window != nullptr) {
        renderer = SDL_CreateRenderer(window, nullptr);
    }
    if (renderer == nullptr) {
        std::cerr << SDL_GetError() << '\n';
        SDL_DestroyWindow(window);
        SDL_Quit();
        return EXIT_FAILURE;
    }

    bool failed = false;
    try {
        photon::require(SDL_SetRenderLogicalPresentation(renderer, photon::viewWidth, photon::viewHeight, SDL_LOGICAL_PRESENTATION_LETTERBOX));
        SDL_SetRenderVSync(renderer, 1);
        photon::Controls controls;
        photon::Trace selected;
        bool dirty = true;
#if LAB_CHECKPOINT >= 6
        auto experiment = photon::makeExperiment(controls.settings);
#endif
        std::cout << "Esc: quit\n";
#if LAB_CHECKPOINT >= 2
        std::cout << "Up/Down: preview photon ID | A/D: muA | B: seed | P: preset | R: reset\n";
#endif
#if LAB_CHECKPOINT >= 5
        std::cout << "J/K: muS | L: event limit1/8/64 | Left/Right or drag timeline: inspect vertices\n";
#endif
#if LAB_CHECKPOINT >= 6
        std::cout << "N: add1 photon | M: add32 | Q: count512/2048/8192\n";
#endif
#if LAB_CHECKPOINT >= 8
        std::cout << "Space: run/pause | V: bounded pure-absorption audit\n";
#endif
        bool running = true;
        while (running) {
            SDL_Event event{};
            while (SDL_PollEvent(&event)) {
                if (event.type == SDL_EVENT_QUIT || (event.type == SDL_EVENT_KEY_DOWN && event.key.key == SDLK_ESCAPE)) {
                    running = false;
                }
                if (event.type == SDL_EVENT_WINDOW_FOCUS_LOST || event.type == SDL_EVENT_WINDOW_MINIMIZED) {
                    controls.paused = true;
                    controls.dragging = false;
                    SDL_CaptureMouse(false);
                }
#if LAB_CHECKPOINT >= 2
                if (event.type == SDL_EVENT_KEY_DOWN && !event.key.repeat) {
                    [[maybe_unused]] const auto before = controls.settings;
                    photon::keyDown(event.key.key, controls, std::max(1, static_cast<int>(selected.vertices.size())));
                    dirty = true;
#if LAB_CHECKPOINT >= 6
                    if (controls.settings != before || event.key.key == SDLK_R) {
                        experiment = photon::makeExperiment(controls.settings);
                        controls.id = 0;
                        controls.requested = 0;
                        controls.paused = true;
                        controls.visible = photon::maximumEvents + 1;
                        controls.dragging = false;
                        SDL_CaptureMouse(false);
                    }
#endif
#if LAB_CHECKPOINT >= 8
                    if (event.key.key == SDLK_V) {
                        const double error = photon::audit();
                        std::cout << "Audit PASS | absolute error=" << error << '\n';
                    }
#endif
                }
#endif
#if LAB_CHECKPOINT >= 5
                const bool down = event.type == SDL_EVENT_MOUSE_BUTTON_DOWN && event.button.button == SDL_BUTTON_LEFT;
                const bool move = event.type == SDL_EVENT_MOUSE_MOTION && controls.dragging;
                if (down || move) {
                    photon::require(SDL_ConvertEventToRenderCoordinates(renderer, &event));
                    float x = 0;
                    float y = 0;
                    if (down) {
                        x = event.button.x;
                        y = event.button.y;
                    } else {
                        x = event.motion.x;
                        y = event.motion.y;
                    }
                    const auto vertex = photon::pickVertex(x, y, std::max(1, static_cast<int>(selected.vertices.size())));
                    if (vertex) {
                        controls.visible = *vertex;
                        controls.paused = true;
                        dirty = true;
                        if (down) {
                            controls.dragging = SDL_CaptureMouse(true);
                        }
                    }
                }
                if (event.type == SDL_EVENT_MOUSE_BUTTON_UP && event.button.button == SDL_BUTTON_LEFT) {
                    controls.dragging = false;
                    SDL_CaptureMouse(false);
                }
#endif
            }
            if (!running) {
                break;
            }
#if LAB_CHECKPOINT >= 6
            int budget = controls.requested;
            controls.requested = 0;
            if (budget > 0) {
                controls.paused = true;
            }
#if LAB_CHECKPOINT >= 8
            if (!controls.paused) {
                budget = 32;
            }
#endif
            if (photon::advance(experiment, budget) > 0) {
                controls.id = experiment.counts.completed - 1;
                controls.visible = photon::maximumEvents + 1;
                dirty = true;
            }
            if (experiment.counts.completed == experiment.settings.count) {
                controls.paused = true;
            }
#endif
            if (dirty) {
#if LAB_CHECKPOINT >= 1
                selected = photon::preview(controls.settings, controls.id);
#endif
                std::ostringstream title;
                title << std::fixed << std::setprecision(6) << "Photon rain | id=" << controls.id << " muA=" << controls.settings.muA << " muS=" << controls.settings.muS;
#if LAB_CHECKPOINT >= 3
                title << " preview outcome=" << photon::statusName(selected.status);
#endif
#if LAB_CHECKPOINT >= 2
                const auto sample = photon::sampleFirst(controls.settings, controls.id);
                title << " u=" << sample.u << " first s=" << sample.distance;
#endif
#if LAB_CHECKPOINT >= 5
                title << " collisions=" << selected.collisions << " scatters=" << selected.scatters << " event limit=" << controls.settings.eventLimit;
#endif
#if LAB_CHECKPOINT >= 6
                const auto counts = experiment.counts;
                title << " N=" << counts.completed << '/' << controls.settings.count << " A/E/C=" << counts.absorbed << '/' << counts.escaped << '/' << counts.censored;
#endif
#if LAB_CHECKPOINT >= 7
                if (counts.completed > 0) {
                    const auto interval = photon::wilson(counts.ballistic, counts.completed);
                    title << " ballistic=" << static_cast<double>(counts.ballistic) / counts.completed << " CI=[" << interval[0] << ',' << interval[1] << "] theory=" << photon::expectedBallistic(controls.settings);
                }
#endif
                photon::require(SDL_SetWindowTitle(window, title.str().c_str()));
                dirty = false;
            }
            photon::require(SDL_SetRenderDrawColor(renderer, 11, 16, 32, 255));
            photon::require(SDL_RenderClear(renderer));
#if LAB_CHECKPOINT >= 1
            photon::drawMedium(renderer);
#if LAB_CHECKPOINT >= 6
            for (const auto& trace : experiment.recent) {
                photon::drawTrace(renderer, trace, photon::maximumEvents + 1, true);
            }
#endif
            photon::drawTrace(renderer, selected, controls.visible);
#endif
#if LAB_CHECKPOINT >= 2
            photon::drawSample(renderer, controls.settings, controls.id);
#endif
#if LAB_CHECKPOINT >= 5
            photon::drawTimeline(renderer, static_cast<int>(selected.vertices.size()), controls.visible);
#endif
#if LAB_CHECKPOINT >= 6
            photon::drawCounts(renderer, experiment.counts);
#endif
            photon::require(SDL_RenderPresent(renderer));
            if (smoke) {
                running = false;
                std::cout << "SDL smoke PASS\n";
            }
            SDL_Delay(16);
        }
    } catch (const std::exception& error) {
        failed = true;
        std::cerr << error.what() << '\n';
    }

    // Giải phóng renderer trước window; mọi nhánh lỗi đều gọi SDL_Quit.
    SDL_CaptureMouse(false);
    SDL_DestroyRenderer(renderer);
    SDL_DestroyWindow(window);
    SDL_Quit();
    if (failed) {
        return EXIT_FAILURE;
    }
    return EXIT_SUCCESS;
}
