#include "benchmark.hpp"
#include "render.hpp"

#include <SDL3/SDL.h>
#include <array>
#include <cstdio>
#include <cstdlib>
#include <iostream>

namespace {

constexpr int kInitialWidth = 1120;
constexpr int kInitialHeight = 720;
constexpr std::size_t kParticleCount = 1'000'000U;
constexpr std::uint32_t kSeed = 0x32c0ffeeU;
constexpr float kFixedDeltaSeconds = 1.0F / 120.0F;

bool resizeSurface(
    SDL_Renderer* renderer,
    SDL_Texture*& texture,
    lab::Framebuffer& framebuffer,
    int width,
    int height
) {
    if (width <= 0 || height <= 0) {
        return true;
    }
    SDL_Texture* nextTexture = SDL_CreateTexture(
        renderer,
        SDL_PIXELFORMAT_RGBA8888,
        SDL_TEXTUREACCESS_STREAMING,
        width,
        height
    );
    if (!nextTexture) {
        return false;
    }
    SDL_DestroyTexture(texture);
    texture = nextTexture;
    framebuffer.resize(width, height);
    return true;
}

#if LAB_CHECKPOINT >= 3
void cycleWorkload(lab::MemoryWorkload& workload) {
    if (workload == lab::MemoryWorkload::positionX) {
        workload = lab::MemoryWorkload::velocityOnly;
    } else if (workload == lab::MemoryWorkload::velocityOnly) {
        workload = lab::MemoryWorkload::integrate;
    } else {
        workload = lab::MemoryWorkload::positionX;
    }
}
#endif

} // namespace

int main() {
    // Setup: mọi checkpoint dùng cùng window, streaming texture và framebuffer CPU.
    if (!SDL_Init(SDL_INIT_VIDEO)) {
        std::cerr << "SDL_Init failed: " << SDL_GetError() << '\n';
        return EXIT_FAILURE;
    }
    SDL_Window* window = SDL_CreateWindow(
        "Project 32 | Memory Layout Race",
        kInitialWidth,
        kInitialHeight,
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
    SDL_Texture* texture = SDL_CreateTexture(
        renderer,
        SDL_PIXELFORMAT_RGBA8888,
        SDL_TEXTUREACCESS_STREAMING,
        kInitialWidth,
        kInitialHeight
    );
    if (!texture) {
        std::cerr << "SDL_CreateTexture failed: " << SDL_GetError() << '\n';
        SDL_DestroyRenderer(renderer);
        SDL_DestroyWindow(window);
        SDL_Quit();
        return EXIT_FAILURE;
    }

    lab::Framebuffer framebuffer{};
    framebuffer.resize(kInitialWidth, kInitialHeight);
    bool running = true;
    bool paused = true;
#if LAB_CHECKPOINT >= 1
    const std::vector<lab::ParticleAoS> source = lab::makeParticlesAoS(kParticleCount, kSeed);
    std::vector<lab::ParticleAoS> particlesAoS = source;
#endif
#if LAB_CHECKPOINT >= 3
    lab::MemoryWorkload workload = lab::MemoryWorkload::positionX;
    lab::AoSBaseline aosBaseline{};
#endif
#if LAB_CHECKPOINT >= 4
    lab::ParticlesSoA particlesSoA = lab::makeParticlesSoA(source);
    bool showSoA = true;
#else
    bool showSoA = false;
#endif
#if LAB_CHECKPOINT >= 7
    lab::LayoutBenchmark layoutBenchmark{};
    std::vector<lab::LayoutScalingRow> scalingRows{};
#endif
#if LAB_CHECKPOINT >= 8
    const lab::MemoryLayoutValidationReport validation =
        lab::validateMemoryLayoutExperiment(kSeed);
#endif

    // Event loop chỉ đổi state hoặc chạy một experiment hữu hạn theo phím bấm.
    while (running) {
        bool singleStep = false;
        SDL_Event event{};
        while (SDL_PollEvent(&event)) {
            if (event.type == SDL_EVENT_QUIT) {
                running = false;
            } else if (event.type == SDL_EVENT_WINDOW_PIXEL_SIZE_CHANGED) {
                if (!resizeSurface(
                        renderer,
                        texture,
                        framebuffer,
                        event.window.data1,
                        event.window.data2
                    )) {
                    std::cerr << "Resize failed: " << SDL_GetError() << '\n';
                    running = false;
                }
            } else if (event.type == SDL_EVENT_KEY_DOWN && !event.key.repeat) {
                if (event.key.key == SDLK_ESCAPE) {
                    running = false;
                } else if (event.key.key == SDLK_SPACE) {
                    paused = !paused;
                } else if (event.key.key == SDLK_N) {
                    singleStep = true;
                } else if (event.key.key == SDLK_R) {
#if LAB_CHECKPOINT >= 1
                    particlesAoS = source;
#endif
#if LAB_CHECKPOINT >= 4
                    particlesSoA = lab::makeParticlesSoA(source);
#endif
                    paused = true;
                }
#if LAB_CHECKPOINT >= 3
                else if (event.key.key == SDLK_W) {
                    cycleWorkload(workload);
                }
#endif
#if LAB_CHECKPOINT >= 4
                else if (event.key.key == SDLK_L) {
                    showSoA = !showSoA;
                }
#endif
#if LAB_CHECKPOINT >= 3
                else if (event.key.key == SDLK_B) {
                    paused = true;
                    aosBaseline = lab::benchmarkAoSBaseline(source, workload, 5);
#if LAB_CHECKPOINT >= 7
                    layoutBenchmark = lab::benchmarkLayoutRace(source, workload, 5);
#endif
                }
#endif
#if LAB_CHECKPOINT >= 7
                else if (event.key.key == SDLK_S) {
                    paused = true;
                    const std::array<std::size_t, 3> counts{10'000U, 100'000U, 1'000'000U};
                    scalingRows = lab::makeLayoutScalingStudy(counts, kSeed, workload, 3);
                    std::cout << "\nProject 32 scaling: " << lab::workloadName(workload) << '\n';
                    std::cout << "N\tAoS ms\tSoA ms\tAoS lines\tSoA lines\tdiff\n";
                    for (const lab::LayoutScalingRow& row : scalingRows) {
                        std::printf(
                            "%zu\t%.3f\t%.3f\t%zu\t%zu\t%.7g\n",
                            row.particleCount,
                            row.benchmark.aosMilliseconds,
                            row.benchmark.soaMilliseconds,
                            row.aosTraffic.cacheLines,
                            row.soaTraffic.cacheLines,
                            double(row.benchmark.maximumDifference)
                        );
                    }
                    std::cout << std::flush;
                }
#endif
            }
        }

#if LAB_CHECKPOINT >= 2
        if (!paused || singleStep) {
#if LAB_CHECKPOINT >= 5
            lab::integrateAoS(particlesAoS, kFixedDeltaSeconds);
            lab::integrateSoA(particlesSoA, kFixedDeltaSeconds);
#else
            lab::integrateAoS(particlesAoS, kFixedDeltaSeconds);
#endif
        }
#endif

        framebuffer.clear();
        std::array<bool, 6> activeFields{true, false, false, false, false, false};
#if LAB_CHECKPOINT >= 6
        activeFields.fill(false);
        const lab::FieldSelection selection = lab::fieldsForWorkload(workload);
        for (std::size_t field = 0; field < selection.count; ++field) {
            activeFields[selection.offsets[field]] = true;
        }
#endif
        lab::drawMemoryDiagram(framebuffer, showSoA, activeFields);
#if LAB_CHECKPOINT >= 4
        if (showSoA) {
            lab::drawSoAParticles(framebuffer, particlesSoA);
        } else {
            lab::drawAoSParticles(framebuffer, particlesAoS, false);
        }
#elif LAB_CHECKPOINT >= 1
        lab::drawAoSParticles(framebuffer, particlesAoS, false);
#endif

        char title[500]{};
#if LAB_CHECKPOINT >= 8
        const bool valid = validation.deterministic && validation.conversionExact &&
            validation.kernelsAgree && validation.singleFieldReducesTraffic &&
            validation.fullWorkloadUsesAllBytes && validation.benchmarkObservable;
        const char* validationLabel = "INVALID";
        if (valid) {
            validationLabel = "valid";
        }
        std::snprintf(
            title,
            sizeof(title),
            "Project 32 | N %zu | %s | AoS %.3f ms SoA %.3f ms | diff %.7g | validation %s | L layout W workload B benchmark S scaling",
            source.size(),
            lab::workloadName(workload).data(),
            layoutBenchmark.aosMilliseconds,
            layoutBenchmark.soaMilliseconds,
            double(lab::maximumLayoutDifference(particlesAoS, particlesSoA)),
            validationLabel
        );
#elif LAB_CHECKPOINT >= 7
        std::snprintf(
            title,
            sizeof(title),
            "Project 32 | %s | AoS %.3f ms SoA %.3f ms | diff %.7g | scaling rows %zu",
            lab::workloadName(workload).data(),
            layoutBenchmark.aosMilliseconds,
            layoutBenchmark.soaMilliseconds,
            double(layoutBenchmark.maximumDifference),
            scalingRows.size()
        );
#elif LAB_CHECKPOINT >= 6
        const lab::MemoryTrafficEstimate aosTraffic = lab::estimateMemoryTraffic(
            lab::MemoryLayout::aos,
            workload,
            source.size()
        );
        const lab::MemoryTrafficEstimate soaTraffic = lab::estimateMemoryTraffic(
            lab::MemoryLayout::soa,
            workload,
            source.size()
        );
        std::snprintf(
            title,
            sizeof(title),
            "Project 32 | %s | AoS %zu lines %.1f%% | SoA %zu lines %.1f%%",
            lab::workloadName(workload).data(),
            aosTraffic.cacheLines,
            aosTraffic.efficiency * 100.0,
            soaTraffic.cacheLines,
            soaTraffic.efficiency * 100.0
        );
#elif LAB_CHECKPOINT >= 5
        std::snprintf(
            title,
            sizeof(title),
            "Project 32 | AoS <-> SoA maximum difference %.7g | L changes layout",
            double(lab::maximumLayoutDifference(particlesAoS, particlesSoA))
        );
#elif LAB_CHECKPOINT >= 4
        SDL_strlcpy(title, "Project 32 | Structure of Arrays: six contiguous vectors", sizeof(title));
#elif LAB_CHECKPOINT >= 3
        std::snprintf(
            title,
            sizeof(title),
            "Project 32 | AoS baseline %s | %.3f ms | checksum %.6f | B measures",
            lab::workloadName(workload).data(),
            aosBaseline.elapsedMilliseconds,
            aosBaseline.checksum
        );
#elif LAB_CHECKPOINT >= 2
        SDL_strlcpy(title, "Project 32 | AoS integrate | Space pause N step R reset", sizeof(title));
#elif LAB_CHECKPOINT >= 1
        std::snprintf(
            title,
            sizeof(title),
            "Project 32 | AoS | %zu particles | %zu bytes/particle | %.1f MB",
            source.size(),
            sizeof(lab::ParticleAoS),
            double(source.size() * sizeof(lab::ParticleAoS)) / 1'000'000.0
        );
#else
        SDL_strlcpy(title, "Project 32 starter | memory cells and particle view", sizeof(title));
#endif
        SDL_SetWindowTitle(window, title);

        SDL_UpdateTexture(
            texture,
            nullptr,
            framebuffer.pixels.data(),
            framebuffer.width * int(sizeof(std::uint32_t))
        );
        SDL_RenderClear(renderer);
        SDL_RenderTexture(renderer, texture, nullptr, nullptr);
        SDL_RenderPresent(renderer);
    }

    // Cleanup: nhả tài nguyên SDL theo thứ tự ngược với setup.
    SDL_DestroyTexture(texture);
    SDL_DestroyRenderer(renderer);
    SDL_DestroyWindow(window);
    SDL_Quit();
    return EXIT_SUCCESS;
}
