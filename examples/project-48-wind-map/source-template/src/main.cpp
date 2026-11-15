#ifndef LAB_CHECKPOINT
#define LAB_CHECKPOINT 9
#endif
#include "input.hpp"
#include "options.hpp"
#include <SDL3/SDL_main.h>
#include <cstdlib>

int main(int argc, char** argv) {
    wind::Options options;
    try {
        options = wind::parseOptions(argc, argv);
    } catch (const std::exception& error) {
        std::cerr << error.what() << '\n';
        return EXIT_FAILURE;
    }
    if (options.help) {
        std::cout << "P48 Wind Map: --hidden --seconds=0.1 --run --capture=frame.bmp --verify\n";
        return EXIT_SUCCESS;
    }
#if LAB_CHECKPOINT >= 9
    if (options.verify) {
        const auto report = wind::validateMap();
        std::cout << "affine_error=" << report.derivativeError << " curl_grad=" << report.gradientCurl << " coarse_interior=" << report.coarse.interior << " refined_interior=" << report.refined.interior << " coarse_boundary=" << report.coarse.boundary << " refined_boundary=" << report.refined.boundary << '\n';
        if (!report.passed)
            return EXIT_FAILURE;
        std::cout << "WIND REFERENCE PASS\n";
        return EXIT_SUCCESS;
    }
#else
    if (options.verify) {
        std::cerr << "Reference validation is introduced in checkpoint 9.\n";
        return EXIT_FAILURE;
    }
#endif
    // [snippet sdl-setup]
    if (!SDL_Init(SDL_INIT_VIDEO)) {
        std::cerr << SDL_GetError() << '\n';
        return EXIT_FAILURE;
    }
    SDL_WindowFlags flags = SDL_WINDOW_RESIZABLE | SDL_WINDOW_HIGH_PIXEL_DENSITY;
    if (options.hidden)
        flags |= SDL_WINDOW_HIDDEN;
    SDL_Window* window = SDL_CreateWindow("Project 48 / Wind Map", 1180, 780, flags);
    if (!window) {
        std::cerr << SDL_GetError() << '\n';
        SDL_Quit();
        return EXIT_FAILURE;
    }
    SDL_Renderer* renderer = SDL_CreateRenderer(window, nullptr);
    if (!renderer) {
        std::cerr << SDL_GetError() << '\n';
        SDL_DestroyWindow(window);
        SDL_Quit();
        return EXIT_FAILURE;
    }
    // [/snippet sdl-setup]
    bool failed = !SDL_SetRenderLogicalPresentation(renderer, wind::logicalWidth, wind::logicalHeight, SDL_LOGICAL_PRESENTATION_LETTERBOX);
    wind::Workshop app;
#if LAB_CHECKPOINT >= 7
    app.paused = !options.run;
#endif
    std::cout << "P preset | L overlay | H scalar | G grid | arrows probe | M edit vortex\n";
    std::cout << "Space pause/run | N step | T tracers | R reset | F1 clean | B vortex | S reverse | Enter place | V verify\n";
    const std::uint64_t started = SDL_GetTicksNS();
    std::uint64_t previousTime = started;
    while (app.running && !failed) {
        // [snippet event-loop]
        SDL_Event event{};
        while (SDL_PollEvent(&event)) {
            wind::handleInput(renderer, app, event);
        }
        const std::uint64_t now = SDL_GetTicksNS();
        const double elapsed = static_cast<double>(now - previousTime) / 1e9;
        previousTime = now;
#if LAB_CHECKPOINT >= 7
        app.advance(elapsed);
#else
        static_cast<void>(elapsed);
#endif
        failed = !wind::drawWorkshop(renderer, app);
        // [/snippet event-loop]
        const bool lastFrame = options.seconds > 0 && static_cast<double>(now - started) / 1e9 >= options.seconds;
        if (lastFrame && !options.capture.empty() && !failed) {
            SDL_Surface* surface = SDL_RenderReadPixels(renderer, nullptr);
            if (!surface) {
                failed = true;
            } else {
                failed = !SDL_SaveBMP(surface, options.capture.c_str());
                SDL_DestroySurface(surface);
            }
        }
        if (!SDL_RenderPresent(renderer))
            failed = true;
        if (lastFrame)
            app.running = false;
        SDL_Delay(16);
    }
    std::size_t coloredNodes = 0;
    std::size_t glyphs = 0;
#if LAB_CHECKPOINT >= 1
    const int stride = std::max(1, (app.field.width - 1) / 16);
    glyphs = static_cast<std::size_t>((1 + (app.field.width - 1) / stride) * (1 + (app.field.height - 1) / stride));
#endif
#if LAB_CHECKPOINT >= 3
    if (app.layer != wind::Layer::Arrows) {
        coloredNodes = app.field.scalar.size();
    }
#endif
    std::cout << "FIELD allocated=" << app.field.scalar.size() << " sampled=" << app.field.vx.size() << " overlay_nodes=" << coloredNodes << " glyphs=" << glyphs;
#if LAB_CHECKPOINT >= 7
    std::size_t drawnTracers = 0;
    if (app.tracers) {
        drawnTracers = app.particles.size();
    }
    std::cout << " tracers_allocated=" << app.particles.size() << " visited_last_step=" << app.visitedLastStep << " drawn_tracers=" << drawnTracers << " tick=" << app.tick << " model_time=" << app.tick * wind::dt << " dropped=" << app.dropped;
#endif
    std::cout << '\n';
    if (failed)
        std::cerr << SDL_GetError() << '\n';
    // [snippet cleanup]
    SDL_DestroyRenderer(renderer);
    SDL_DestroyWindow(window);
    SDL_Quit();
    if (failed) {
        return EXIT_FAILURE;
    }
    return EXIT_SUCCESS;
    // [/snippet cleanup]
}
