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
    // Khởi tạo SDL; starter chỉ mở window, renderer và event loop.
    if (!SDL_Init(SDL_INIT_VIDEO)) {
        std::cerr << SDL_GetError() << '\n';
        return EXIT_FAILURE;
    }
    SDL_WindowFlags flags = SDL_WINDOW_RESIZABLE | SDL_WINDOW_HIGH_PIXEL_DENSITY;
    if (smoke) {
        flags |= SDL_WINDOW_HIDDEN;
    }
    SDL_Window* window = SDL_CreateWindow("Toy CT | XY cross-section", ct::viewWidth, ct::viewHeight, flags);
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

    SDL_Texture* texture = nullptr;
    bool failed = false;
    try {
        ct::require(SDL_SetRenderLogicalPresentation(renderer, ct::viewWidth, ct::viewHeight, SDL_LOGICAL_PRESENTATION_LETTERBOX));
        SDL_SetRenderVSync(renderer, 1);
        ct::Controls controls;
        [[maybe_unused]] bool dirty = true;
#if LAB_CHECKPOINT >= 5
        auto scan = ct::makeScan(controls.settings);
        ct::acquireOne(scan);
        int textureViews = 0;
#endif
#if LAB_CHECKPOINT >= 4
        ct::Projection preview;
#endif
        std::cout << "Esc: quit\n";
#if LAB_CHECKPOINT >= 2
        std::cout << "Arrows: detector/view (pause) | R: reset\n";
#endif
#if LAB_CHECKPOINT >= 4
        std::cout << "P: phantom | W/S: strength\n";
#endif
#if LAB_CHECKPOINT >= 5
        std::cout << "N: one row and pause | I: invert | L: display range | Click/drag: inspect cell\n";
#endif
#if LAB_CHECKPOINT >= 6
        std::cout << "Space: scan/pause\n";
#endif
#if LAB_CHECKPOINT >= 7
        std::cout << "T: point trace\n";
#endif
#if LAB_CHECKPOINT >= 8
        std::cout << "Q: 30/60/120 views\n";
#endif
#if LAB_CHECKPOINT >= 9
        std::cout << "V: independent circular phantom audit\n";
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
                    const auto before = controls;
                    ct::keyDown(event.key.key, controls);
                    dirty = true;
#if LAB_CHECKPOINT >= 5
                    if (controls.settings != before.settings || event.key.key == SDLK_R) {
                        scan = ct::makeScan(controls.settings);
                        controls.paused = true;
                        controls.step = false;
                    }
#else
                    (void)before;
#endif
#if LAB_CHECKPOINT >= 9
                    if (event.key.key == SDLK_V) {
                        const double maximumError = ct::audit();
                        std::cout << "Audit PASS | max error " << maximumError << '\n';
                    }
#endif
                }
#endif
#if LAB_CHECKPOINT >= 5
                const bool down = event.type == SDL_EVENT_MOUSE_BUTTON_DOWN && event.button.button == SDL_BUTTON_LEFT;
                const bool move = event.type == SDL_EVENT_MOUSE_MOTION && controls.dragging;
                if (down || move) {
                    ct::require(SDL_ConvertEventToRenderCoordinates(renderer, &event));
                    float x = 0;
                    float y = 0;
                    if (down) {
                        x = event.button.x;
                        y = event.button.y;
                    } else {
                        x = event.motion.x;
                        y = event.motion.y;
                    }
                    const auto cell = ct::pickCell(x, y, controls.settings.views);
                    if (cell) {
                        controls.column = (*cell)[0];
                        controls.row = (*cell)[1];
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
#if LAB_CHECKPOINT >= 5
            // A requested single step wins over automatic scan in this frame.
            if (controls.step) {
                controls.paused = true;
            }
            const bool measured = controls.step && ct::acquireOne(scan);
            controls.step = false;
            if (measured) {
                controls.row = scan.acquired - 1;
                dirty = true;
            }
#if LAB_CHECKPOINT >= 6
            if (!controls.paused) {
                const int completed = ct::advance(scan, 2);
                if (completed > 0) {
                    controls.row = scan.acquired - 1;
                    dirty = true;
                }
                if (scan.acquired == scan.settings.views) {
                    controls.paused = true;
                }
            }
#endif
#endif
            // Inspector and detector preview update only when their inputs change.
            if (dirty) {
#if LAB_CHECKPOINT >= 5
#if LAB_CHECKPOINT >= 8
                ct::resizeSinogramTexture(renderer, texture, textureViews, controls.settings.views);
#else
                if (textureViews != controls.settings.views) {
                    SDL_DestroyTexture(texture);
                    texture = SDL_CreateTexture(renderer, SDL_PIXELFORMAT_RGBA32, SDL_TEXTUREACCESS_STREAMING, ct::detectorCount, controls.settings.views);
                    if (texture == nullptr) {
                        throw std::runtime_error(SDL_GetError());
                    }
                    ct::require(SDL_SetTextureScaleMode(texture, SDL_SCALEMODE_NEAREST));
                    textureViews = controls.settings.views;
                }
#endif
                ct::upload(texture, scan, controls.displayRange, controls.invert);
#endif
                std::ostringstream title;
                title << std::fixed << std::setprecision(5) << "Toy CT | row=" << controls.row << " col=" << controls.column;
#if LAB_CHECKPOINT >= 3
                const double angle = 2 * ct::pi * controls.row / controls.settings.views;
                const auto beam = ct::detectorRay(angle, (controls.column + 0.5) / ct::detectorCount);
                title << " L0=" << ct::chordLength(beam, ct::makeScene(controls.settings.preset).front());
#endif
#if LAB_CHECKPOINT >= 4
                preview = ct::project(angle, ct::makeScene(controls.settings.preset), controls.settings.strength);
                const auto measurement = ct::measure(beam, ct::makeScene(controls.settings.preset), controls.settings.strength);
                title << " preview p=" << measurement.projection << " T=" << measurement.ratio;
#endif
#if LAB_CHECKPOINT >= 5
                title << " acquired=" << scan.acquired << '/' << scan.settings.views;
                const double stored = scan.values[controls.column + ct::detectorCount * controls.row];
                if (std::isfinite(stored)) {
                    title << " stored=" << stored;
                } else {
                    title << " stored=UNMEASURED";
                }
#endif
                ct::require(SDL_SetWindowTitle(window, title.str().c_str()));
                dirty = false;
            }
            ct::require(SDL_SetRenderDrawColor(renderer, 11, 16, 32, 255));
            ct::require(SDL_RenderClear(renderer));
#if LAB_CHECKPOINT >= 1
            ct::drawScene(renderer, ct::makeScene(controls.settings.preset));
#endif
#if LAB_CHECKPOINT >= 2
            const double angle = 2 * ct::pi * controls.row / controls.settings.views;
            ct::drawScanner(renderer, angle, controls.column);
#endif
#if LAB_CHECKPOINT >= 4
            ct::drawProjection(renderer, preview);
#endif
#if LAB_CHECKPOINT >= 5
            ct::require(SDL_RenderTexture(renderer, texture, nullptr, &ct::sinogramRect));
            ct::require(SDL_SetRenderDrawColor(renderer, 255, 195, 80, 255));
            const float y = ct::sinogramRect.y + static_cast<float>((controls.row + 0.5) / controls.settings.views * ct::sinogramRect.h);
            ct::require(SDL_RenderLine(renderer, ct::sinogramRect.x, y, ct::sinogramRect.x + ct::sinogramRect.w, y));
#endif
#if LAB_CHECKPOINT >= 7
            if (controls.trace) {
                ct::drawTrace(renderer, controls.settings.views, {0.65, 0.3});
            }
#endif
            ct::require(SDL_RenderPresent(renderer));
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

    // Giải phóng texture trước renderer/window, kể cả khi khởi tạo thất bại.
    SDL_CaptureMouse(false);
    SDL_DestroyTexture(texture);
    SDL_DestroyRenderer(renderer);
    SDL_DestroyWindow(window);
    SDL_Quit();
    if (failed) {
        return EXIT_FAILURE;
    }
    return EXIT_SUCCESS;
}
