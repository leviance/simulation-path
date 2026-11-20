#include "input.hpp"
#include "run-options.hpp"
#include <cstdlib>
#include <iostream>

int main(int argc, char** argv) {
    picking::RunOptions options;
    if (!picking::parseOptions(argc, argv, options)) {
        return EXIT_FAILURE;
    }

    // Acquire resources one at a time; every failing branch releases predecessors.
    // [snippet sdl-window]
    if (!SDL_Init(SDL_INIT_VIDEO)) {
        std::cerr << SDL_GetError() << '\n';
        return EXIT_FAILURE;
    }
    SDL_Window* window = SDL_CreateWindow("Project 52 - Optical measurement bench", picking::viewWidth, picking::viewHeight, SDL_WINDOW_RESIZABLE | SDL_WINDOW_HIGH_PIXEL_DENSITY);
    if (window == nullptr) {
        std::cerr << SDL_GetError() << '\n';
        SDL_Quit();
        return EXIT_FAILURE;
    }
    SDL_Renderer* renderer = SDL_CreateRenderer(window, nullptr);
    if (renderer == nullptr) {
        std::cerr << SDL_GetError() << '\n';
        SDL_DestroyWindow(window);
        SDL_Quit();
        return EXIT_FAILURE;
    }
    // [/snippet sdl-window]
    if (!SDL_SetRenderLogicalPresentation(renderer, picking::viewWidth, picking::viewHeight, SDL_LOGICAL_PRESENTATION_LETTERBOX)) {
        std::cerr << SDL_GetError() << '\n';
        SDL_DestroyRenderer(renderer);
        SDL_DestroyWindow(window);
        SDL_Quit();
        return EXIT_FAILURE;
    }

    SDL_Texture* sceneTexture = SDL_CreateTexture(renderer, SDL_PIXELFORMAT_ARGB8888, SDL_TEXTUREACCESS_STREAMING, picking::sceneWidth, picking::viewHeight);
    if (sceneTexture == nullptr) {
        std::cerr << SDL_GetError() << '\n';
        SDL_DestroyRenderer(renderer);
        SDL_DestroyWindow(window);
        SDL_Quit();
        return EXIT_FAILURE;
    }
    SDL_Texture* aimTexture = SDL_CreateTexture(renderer, SDL_PIXELFORMAT_ARGB8888, SDL_TEXTUREACCESS_STREAMING, 280, 190);
    if (aimTexture == nullptr) {
        std::cerr << SDL_GetError() << '\n';
        SDL_DestroyTexture(sceneTexture);
        SDL_DestroyRenderer(renderer);
        SDL_DestroyWindow(window);
        SDL_Quit();
        return EXIT_FAILURE;
    }

    picking::Workshop state;
    picking::Interaction input;
    picking::Raster sceneRaster(picking::sceneWidth, picking::viewHeight);
    picking::Raster aimRaster(280, 190);
#if LAB_CHECKPOINT >= 7
    if (options.preset != 0) {
        state.preset(options.preset);
    }
#endif
    bool failed = false;
    int frame = 0;
    std::uint64_t previous = SDL_GetTicksNS();
    while (input.running && !failed) {
        if (!picking::readInput(renderer, state, input)) {
            failed = true;
            break;
        }
        if (!input.running) {
            break;
        }
        // Always refresh the clock while paused; resume excludes paused wall time.
        const auto now = SDL_GetTicksNS();
        [[maybe_unused]] const double dt = static_cast<double>(now - previous) / 1e9;
        previous = now;
        // The samples are static while a measurement is held. Keep servicing
        // input, but do not rerasterize two viewports while the learner reads.
        bool redraw = input.redraw || options.frames > 0;
#if LAB_CHECKPOINT >= 7
        state.update(dt);
        if (!state.paused) {
            redraw = true;
        }
#endif
        if (!redraw) {
            SDL_Delay(16);
            continue;
        }
        input.redraw = false;
        SDL_SetRenderDrawColor(renderer, 12, 20, 35, 255);
        if (!SDL_RenderClear(renderer)) {
            failed = true;
            break;
        }
        // [snippet frame-presentation]
        picking::drawWorkshop(sceneRaster, state);
        const SDL_FRect viewport{0, 0, picking::sceneWidth, picking::viewHeight};
        if (!picking::presentRaster(renderer, sceneTexture, sceneRaster, viewport)) {
            failed = true;
            break;
        }
        // [/snippet frame-presentation]
#if LAB_CHECKPOINT >= 1
        picking::drawPanel(renderer, state);
        picking::drawHeading(renderer);
        if (state.debug) {
            picking::drawLabels(renderer, state);
        }
#endif
#if LAB_CHECKPOINT >= 2
        picking::drawWorkshop(aimRaster, state, true);
        if (!picking::presentRaster(renderer, aimTexture, aimRaster, picking::aimRect)) {
            failed = true;
            break;
        }
        picking::aimOverlay(renderer, state);
        picking::distanceStrip(renderer, state);
#endif
        ++frame;
        if (frame == options.frames && !options.capture.empty()) {
            SDL_Surface* capture = SDL_RenderReadPixels(renderer, nullptr);
            if (capture == nullptr) {
                failed = true;
            } else {
                bool saved = false;
                if (options.capture.ends_with(".png") || options.capture.ends_with(".PNG")) {
                    saved = SDL_SavePNG(capture, options.capture.c_str());
                } else {
                    saved = SDL_SaveBMP(capture, options.capture.c_str());
                }
                if (!saved) {
                    failed = true;
                }
                SDL_DestroySurface(capture);
            }
        }
        if (!SDL_RenderPresent(renderer)) {
            failed = true;
        }
        if (options.frames > 0 && frame >= options.frames) {
            input.running = false;
        }
        SDL_Delay(16);
    }
    if (failed) {
        std::cerr << SDL_GetError() << '\n';
    }
    picking::releasePointer(input);
    SDL_DestroyTexture(aimTexture);
    SDL_DestroyTexture(sceneTexture);
    SDL_DestroyRenderer(renderer);
    SDL_DestroyWindow(window);
    SDL_Quit();
    if (failed) {
        return EXIT_FAILURE;
    }
    std::cout << "Completed " << frame << " frame(s)\n";
    return EXIT_SUCCESS;
}
