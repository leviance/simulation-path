#include "application.hpp"
#include <SDL3/SDL_main.h>
#include <cstring>

// SDL owns the window and presentation. Physics and pixels stay in our code.
// [snippet:main]
int main(int argc, char** argv) {
    bool smoke = false;
    bool workflow = false;
    bool benchmark = false;
    for (int index = 1; index < argc; ++index) {
        if (std::strcmp(argv[index], "--smoke") == 0) {
            smoke = true;
        } else if (std::strcmp(argv[index], "--smoke-workflow") == 0) {
            smoke = true;
            workflow = true;
        } else if (std::strcmp(argv[index], "--benchmark") == 0) {
            benchmark = true;
        } else {
            std::cerr << "Unknown argument: " << argv[index] << '\n';
            return EXIT_FAILURE;
        }
    }
#if LAB_CHECKPOINT >= 9
    if (benchmark) {
        lab::RuntimeJob job{};
        job.start(0.5, 0.02);
        while (job.active) {
            job.tick();
        }
        for (const auto& row : job.rows) {
            std::cout << "N=" << row.count << " seed=" << lab::galaxySeed << " theta=0.5 eps=0.02 warmup=1 samples=5 directMedianUs=" << row.directMedian << " directRange=" << row.directMinimum << ':' << row.directMaximum << " bhMedianUs=" << row.treeMedian << " bhRange=" << row.treeMinimum << ':' << row.treeMaximum << " buildUs=" << row.buildMicroseconds << " work=" << row.directWork << '/' << row.treeWork << " checksum=" << row.checksum << '\n';
        }
        if (job.timedOut) {
            std::cerr << "Benchmark incomplete: 30 second deadline\n";
            return EXIT_FAILURE;
        }
        return EXIT_SUCCESS;
    }
#else
    if (benchmark) {
        std::cerr << "Runtime study starts at checkpoint 09\n";
        return EXIT_FAILURE;
    }
#endif
    if (!SDL_Init(SDL_INIT_VIDEO)) {
        std::cerr << SDL_GetError() << '\n';
        return EXIT_FAILURE;
    }
    SDL_Window* window = SDL_CreateWindow("Project 31 | 3D Barnes-Hut galaxy", 1120, 820, SDL_WINDOW_RESIZABLE | SDL_WINDOW_HIGH_PIXEL_DENSITY);
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
    SDL_Texture* texture = SDL_CreateTexture(renderer, SDL_PIXELFORMAT_RGBA8888, SDL_TEXTUREACCESS_STREAMING, 1120, 570);
    if (!texture) {
        std::cerr << SDL_GetError() << '\n';
        SDL_DestroyRenderer(renderer);
        SDL_DestroyWindow(window);
        SDL_Quit();
        return EXIT_FAILURE;
    }
    SDL_SetRenderLogicalPresentation(renderer, 1120, 820, SDL_LOGICAL_PRESENTATION_LETTERBOX);
    SDL_SetRenderVSync(renderer, 1);
    int result = EXIT_SUCCESS;
    try {
        result = project31::runApplication(window, renderer, texture, smoke, workflow);
    } catch (const std::exception& error) {
        std::cerr << error.what() << '\n';
        result = EXIT_FAILURE;
    }
    // Reverse ownership order on every exit, including bounded-job failures.
    SDL_CaptureMouse(false);
    SDL_DestroyTexture(texture);
    SDL_DestroyRenderer(renderer);
    SDL_DestroyWindow(window);
    SDL_Quit();
    return result;
}

// [/snippet:main]
