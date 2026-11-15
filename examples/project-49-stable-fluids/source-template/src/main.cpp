#include "app/cli.hpp"
#include "app/input.hpp"
#include <SDL3/SDL_main.h>
#include <cstdlib>
#include <iostream>

int main(int argc, char** argv) {
    smoke::Options options;
    try {
        options = smoke::parseOptions(argc, argv);
    } catch (const std::exception& error) {
        std::cerr << error.what() << '\n';
        return EXIT_FAILURE;
    }
    if (options.help) {
        std::cout << "--paused --resolution=8|16|32|64|128|256 --seconds=0.05..60 --ticks=1..360 --hidden --capture=file.bmp | --verify\n";
        return EXIT_SUCCESS;
    }

    if (options.verify) {
#if LAB_CHECKPOINT >= 15
        const auto report = fluid::validate();
        std::cout << "REFERENCE passed=" << report.passed << " small_div=" << report.small.before << " -> " << report.small.after << " large_div=" << report.large.before << " -> " << report.large.after << " residual=" << report.large.residual << " k=" << report.large.iterations << '\n';
        if (report.passed) {
            return EXIT_SUCCESS;
        }
        return EXIT_FAILURE;
#else
        std::cerr << "Reference command is introduced in checkpoint 15.\n";
        return EXIT_FAILURE;
#endif
    }

    // Khởi tạo SDL: mỗi tài nguyên được kiểm trước khi tạo tài nguyên phụ thuộc.
    if (!SDL_Init(SDL_INIT_VIDEO)) {
        std::cerr << SDL_GetError() << '\n';
        return EXIT_FAILURE;
    }
    SDL_WindowFlags flags = SDL_WINDOW_RESIZABLE;
    if (options.hidden) {
        flags |= SDL_WINDOW_HIDDEN;
    }
    SDL_Window* window = SDL_CreateWindow("Project 49 - Smoke Chamber", 1280, 900, flags);
    if (!window) {
        std::cerr << SDL_GetError() << '\n';
        SDL_Quit();
        return EXIT_FAILURE;
    }
    // [snippet renderer]
    SDL_Renderer* renderer = SDL_CreateRenderer(window, nullptr);
    if (!renderer) {
        std::cerr << SDL_GetError() << '\n';
        SDL_DestroyWindow(window);
        SDL_Quit();
        return EXIT_FAILURE;
    }
    // [/snippet renderer]
    if (!SDL_SetRenderLogicalPresentation(renderer, 1280, 900, SDL_LOGICAL_PRESENTATION_LETTERBOX)) {
        std::cerr << SDL_GetError() << '\n';
        SDL_DestroyRenderer(renderer);
        SDL_DestroyWindow(window);
        SDL_Quit();
        return EXIT_FAILURE;
    }

    bool failed = false;
    smoke::Image image;
    try {
        smoke::App app;
        if (options.resolution != 0) {
            app.rebuild(options.resolution, app.scene);
#if LAB_CHECKPOINT >= 10
            app.paused = false;
#endif
        }
        if (options.paused) {
            app.pause();
        }
        const auto start = SDL_GetTicksNS();
        auto previousTime = start;
        while (app.running && !failed) {
            // [snippet event-loop]
            SDL_Event event{};
            int events = 0;
            while (events < 256 && SDL_PollEvent(&event)) {
                smoke::handleEvent(app, renderer, event);
                ++events;
            }
            // [/snippet event-loop]
            const auto now = SDL_GetTicksNS();
            [[maybe_unused]] const double elapsed = static_cast<double>(now - previousTime) / 1e9;
            previousTime = now;
#if LAB_CHECKPOINT >= 3
            if (options.ticks > 0) {
                if (app.grid.tick < options.ticks && !app.singleStep()) {
                    failed = true;
                }
            } else {
#if LAB_CHECKPOINT >= 10
                app.advance(elapsed);
#endif
            }
#endif
            if (!smoke::draw(renderer, app, image) || !SDL_RenderPresent(renderer)) {
                std::cerr << "Render: " << SDL_GetError() << '\n';
                failed = true;
            }
            if (options.seconds > 0 && static_cast<double>(SDL_GetTicksNS() - start) / 1e9 >= options.seconds) {
                break;
            }
            if (options.ticks > 0 && app.grid.tick >= options.ticks) {
                break;
            }
            SDL_Delay(8);
        }
        if (options.ticks > 0 && app.grid.tick != options.ticks) {
            std::cerr << "Tick deadline exceeded.\n";
            failed = true;
        }
        if (!options.capture.empty() && !failed) {
            if (!smoke::draw(renderer, app, image)) {
                failed = true;
            }
            SDL_Surface* surface = SDL_RenderReadPixels(renderer, nullptr);
            if (!surface || !SDL_SaveBMP(surface, options.capture.c_str())) {
                failed = true;
            }
            SDL_DestroySurface(surface);
        }
        std::cout << "GRID allocated=" << app.grid.density.size() << " updated=" << app.updated << " drawn=" << app.grid.density.size() << " tick=" << app.grid.tick << " model_time=" << app.grid.tick * fluid::fixedDt << '\n';
#if LAB_CHECKPOINT >= 4
        std::cout << "VELOCITY faces=" << app.grid.u.size() + app.grid.v.size() << " div=" << fluid::rms(app.grid.divergence) << '\n';
#endif
#if LAB_CHECKPOINT >= 6
        std::cout << "PROJECTION " << app.grid.projection.before << " -> " << app.grid.projection.after << " residual=" << app.grid.projection.residual << " target=" << app.grid.projection.target << " k=" << app.grid.projection.iterations << " converged=" << app.grid.projection.converged << '\n';
#endif
        if (!app.error.empty()) {
            std::cerr << app.error << '\n';
            failed = true;
        }
    } catch (const std::exception& error) {
        std::cerr << error.what() << '\n';
        failed = true;
    }

    // Giải phóng texture trước renderer; mọi đường thoát sau vòng lặp đều đi qua đây.
    image.dispose();
    SDL_DestroyRenderer(renderer);
    SDL_DestroyWindow(window);
    SDL_Quit();
    if (failed) {
        return EXIT_FAILURE;
    }
    return EXIT_SUCCESS;
}
