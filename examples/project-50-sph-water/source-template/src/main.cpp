#include "app/cli.hpp"
#include "app/input.hpp"
#include <cstdlib>

int main(int argc, char** argv) {
    tank::Options options;
    try {
        options = tank::options(argc, argv);
#if LAB_CHECKPOINT >= 12
        if (options.verify) {
            const auto report = water::reference();
            std::cout << "REFERENCE passed=" << report.passed << " integral=" << report.integral << " grid=" << report.gridError << " force=" << report.forceError << " equilibrium_drift=" << report.equilibriumDrift << '\n';
            if (!report.passed) {
                return EXIT_FAILURE;
            }
            return EXIT_SUCCESS;
        }
#endif
    } catch (const std::exception& error) {
        std::cerr << error.what() << '\n';
        return EXIT_FAILURE;
    }

    // [snippet window]
    if (!SDL_Init(SDL_INIT_VIDEO)) {
        std::cerr << SDL_GetError() << '\n';
        return EXIT_FAILURE;
    }
    SDL_WindowFlags flags = SDL_WINDOW_RESIZABLE;
    if (options.hidden) {
        flags |= SDL_WINDOW_HIDDEN;
    }
    SDL_Window* window = SDL_CreateWindow("Project 50 - SPH Water Tank", 1280, 820, flags);
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
    if (!SDL_SetRenderLogicalPresentation(renderer, 1280, 820, SDL_LOGICAL_PRESENTATION_LETTERBOX)) {
        std::cerr << SDL_GetError() << '\n';
        SDL_DestroyRenderer(renderer);
        SDL_DestroyWindow(window);
        SDL_Quit();
        return EXIT_FAILURE;
    }

    // [/snippet window]
    int result = EXIT_SUCCESS;
    SDL_Texture* texture = SDL_CreateTexture(renderer, SDL_PIXELFORMAT_RGBA32, SDL_TEXTUREACCESS_STREAMING, 720, 432);
    if (texture == nullptr) {
        std::cerr << SDL_GetError() << '\n';
        SDL_DestroyRenderer(renderer);
        SDL_DestroyWindow(window);
        SDL_Quit();
        return EXIT_FAILURE;
    }
    SDL_SetTextureScaleMode(texture, SDL_SCALEMODE_LINEAR);
    SDL_SetRenderVSync(renderer, 1);
    if (options.hidden || options.ticks > 0) {
        SDL_SetRenderVSync(renderer, 0);
    }
    try {
        tank::App app;
        app.preset = options.preset;
        if (options.count != 0) {
            app.requested = options.count;
        }
        app.rebuild();
#if LAB_CHECKPOINT >= 8
        if (!options.paused) {
            app.paused = false;
        }
#endif
        const auto started = SDL_GetTicksNS();
        auto previous = started;
        while (app.running) {
            // [snippet loop]
            SDL_Event event{};
            while (SDL_PollEvent(&event)) {
                tank::handle(app, renderer, event);
            }
            const auto now = SDL_GetTicksNS();
            const double elapsed = (now - previous) / 1e9;
            previous = now;
            if (options.ticks > 0) {
                for (int k = 0; k < 16 && app.state.tick < static_cast<std::size_t>(options.ticks); ++k) {
                    if (!app.oneStep()) {
                        break;
                    }
                }
            }
#if LAB_CHECKPOINT >= 8
            else {
                app.advance(elapsed);
            }
#else
            static_cast<void>(elapsed);
#endif
            if (app.dirty) {
                app.refresh();
            }
            tank::draw(app, renderer, texture);
            // [/snippet loop]
            bool finished = options.ticks > 0 && app.state.tick >= static_cast<std::size_t>(options.ticks);
            if (options.seconds > 0 && (now - started) / 1e9 >= options.seconds) {
                finished = true;
            }
            if (finished || !app.error.empty()) {
                if (!options.capture.empty()) {
                    SDL_Surface* image = SDL_RenderReadPixels(renderer, nullptr);
                    if (image == nullptr) {
                        throw std::runtime_error(SDL_GetError());
                    }
                    if (!SDL_SaveBMP(image, options.capture.c_str())) {
                        const std::string error = SDL_GetError();
                        SDL_DestroySurface(image);
                        throw std::runtime_error(error);
                    }
                    SDL_DestroySurface(image);
                }
                app.running = false;
            }
            SDL_RenderPresent(renderer);
            if (options.hidden) {
                SDL_Delay(1);
            }
        }
        tank::log(app);
        if (!app.error.empty() || (options.ticks > 0 && app.state.tick < static_cast<std::size_t>(options.ticks))) {
            throw std::runtime_error("Simulation failed or finite tick target was not reached: " + app.error);
        }
    } catch (const std::exception& error) {
        std::cerr << error.what() << '\n';
        result = EXIT_FAILURE;
    }

    SDL_DestroyTexture(texture);
    SDL_DestroyRenderer(renderer);
    SDL_DestroyWindow(window);
    SDL_Quit();
    return result;
}
