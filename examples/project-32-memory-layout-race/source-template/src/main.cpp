#include "application.hpp"
#include <cstdlib>
#include <cstring>

namespace {
#if LAB_CHECKPOINT >= 3
int runBenchmark() {
    lab::BenchmarkJob job{};
    job.start({}, {10'000, 100'000, 1'000'000}, {lab::MemoryWorkload::gravityOnly, lab::MemoryWorkload::fullLifecycle});
    while (job.active)
        job.tick();
    if (job.timedOut) {
        std::cerr << job.notice << '\n';
        return EXIT_FAILURE;
    }
#ifdef NDEBUG
    std::cout << "configuration=Release ";
#else
    std::cout << "configuration=Debug (not the performance baseline) ";
#endif
#ifdef _MSC_VER
    std::cout << "compiler=MSVC-" << _MSC_VER;
#else
    std::cout << "compiler=" << __VERSION__;
#endif
    std::cout << " C++20 single-thread float32 no-manual-SIMD seed=" << job.config.seed << " dt=" << lab::fixedDt << " warmup=1 samples=5 passes=3\n";
    for (const auto& row : job.rows) {
        std::cout << "N=" << row.count << " alive=" << row.count << " actualUpdated=" << row.updated
                  << " workload=" << (row.workload == lab::MemoryWorkload::gravityOnly ? "gravity-only" : "full-lifecycle")
                  << " AoS_ms=" << row.aos.median << " range=" << row.aos.minimum << ':' << row.aos.maximum;
        if (row.paired) {
            std::cout << " SoA_ms=" << row.soa.median << " range=" << row.soa.minimum << ':' << row.soa.maximum
                      << " conversion_ms=" << row.conversionMs << " maxDifference=" << row.maximumDifference << " errorRatio=" << row.maximumErrorRatio
                      << " checksum=" << row.checksumAoS << '/' << row.checksumSoA;
        } else {
            std::cout << " SoA=not-measured checksumAoS=" << row.checksumAoS;
        }
        std::cout << " copy_ms=" << row.copyMs << " logicalBytesEach=" << row.count * sizeof(lab::ParticleAoS) << '\n';
    }
    return EXIT_SUCCESS;
}
#endif
} // namespace

int main(int argc, char** argv) {
    bool smoke = false;
    bool workflow = false;
    bool benchmark = false;
    for (int index = 1; index < argc; ++index) {
        if (std::strcmp(argv[index], "--smoke") == 0)
            smoke = true;
        else if (std::strcmp(argv[index], "--smoke-workflow") == 0) {
            smoke = true;
            workflow = true;
        } else if (std::strcmp(argv[index], "--benchmark") == 0)
            benchmark = true;
        else {
            std::cerr << "Unknown argument: " << argv[index] << '\n';
            return EXIT_FAILURE;
        }
    }
    if (benchmark) {
#if LAB_CHECKPOINT >= 3
        return runBenchmark();
#else
        std::cerr << "Benchmark is introduced in checkpoint 03\n";
        return EXIT_FAILURE;
#endif
    }
#if LAB_CHECKPOINT < 2
    if (workflow) {
        std::cerr << "Physics starts in checkpoint 02\n";
        return EXIT_FAILURE;
    }
#endif
    if (!SDL_Init(SDL_INIT_VIDEO)) {
        std::cerr << SDL_GetError() << '\n';
        return EXIT_FAILURE;
    }
    SDL_Window* window = SDL_CreateWindow("Project 32 | CPU fountain: AoS / SoA", 1120, 820, SDL_WINDOW_RESIZABLE | SDL_WINDOW_HIGH_PIXEL_DENSITY);
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
    int result = EXIT_SUCCESS;
    if (!SDL_SetRenderLogicalPresentation(renderer, 1120, 820, SDL_LOGICAL_PRESENTATION_LETTERBOX)) {
        std::cerr << SDL_GetError() << '\n';
        result = EXIT_FAILURE;
    } else {
        try {
            result = project32::runApplication(window, renderer, texture, smoke, workflow);
        } catch (const std::exception& error) {
            std::cerr << error.what() << '\n';
            result = EXIT_FAILURE;
        }
    }
    SDL_DestroyTexture(texture);
    SDL_DestroyRenderer(renderer);
    SDL_DestroyWindow(window);
    SDL_Quit();
    return result;
}
