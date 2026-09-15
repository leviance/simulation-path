#include "lab.hpp"
#include "render.hpp"

#include <SDL3/SDL.h>

#include <algorithm>
#include <array>
#include <cstddef>
#include <cstdint>
#include <cstdlib>
#include <iostream>
#include <vector>

int main() {
    // Setup: tạo cửa sổ, framebuffer và point cloud trước khi thêm Octree.
    if (!SDL_Init(SDL_INIT_VIDEO)) {
        std::cerr << "SDL_Init failed: " << SDL_GetError() << '\n';
        return EXIT_FAILURE;
    }

    SDL_Window* window = SDL_CreateWindow(
        "Project 30 | Point Cloud Octree",
        project30::kInitialWidth,
        project30::kInitialHeight,
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

    int width = project30::kInitialWidth;
    int height = project30::kInitialHeight;
    SDL_Texture* texture = SDL_CreateTexture(
        renderer,
        SDL_PIXELFORMAT_RGBA8888,
        SDL_TEXTUREACCESS_STREAMING,
        width,
        height
    );
    if (!texture) {
        std::cerr << "SDL_CreateTexture failed: " << SDL_GetError() << '\n';
        SDL_DestroyRenderer(renderer);
        SDL_DestroyWindow(window);
        SDL_Quit();
        return EXIT_FAILURE;
    }
    std::vector<std::uint32_t> pixels(
        std::size_t(width) * std::size_t(height),
        project30::kBackground
    );

    const lab::Bounds3D worldBounds{{0.0, 0.0, 0.0}, {1.0, 1.0, 1.0}};
    constexpr std::uint32_t seed = 0x30c0ffeeU;
    bool clustered = true;
    std::vector<lab::PointSample> points =
        lab::makePointCloud(100'000, worldBounds, seed, clustered);
    lab::OrbitCamera camera{};
    lab::Vec3 queryCenter{0.5, 0.5, 0.5};
    lab::Vec3 queryHalfSize{0.08, 0.07, 0.06};
    lab::Bounds3D queryVolume = project30::volumeAround(queryCenter, queryHalfSize);
    lab::BruteVolumeResult bruteResult{};

#if LAB_CHECKPOINT >= 2
    lab::OctreeConfig treeConfig{worldBounds, 16, 10, 1.0 / 1024.0};
#if LAB_CHECKPOINT >= 3
    lab::Octree tree = lab::buildOctree(points, treeConfig);
#else
    lab::Octree tree = lab::createRootOctree(points, treeConfig);
#endif
#endif
#if LAB_CHECKPOINT >= 4
    lab::OctreeTopologyReport topology = lab::inspectOctreeTopology(tree, points.size());
#endif
#if LAB_CHECKPOINT >= 5
    lab::OctreeQueryResult octreeResult{};
#endif
#if LAB_CHECKPOINT >= 6
    const std::vector<lab::Bounds3D> validationProbes = lab::makeVolumeQueries(
        24,
        worldBounds,
        {0.14, 0.12, 0.10},
        seed ^ 0x300030U
    );
    bool probeSetMatchesOracle = true;
    for (const lab::Bounds3D& probe : validationProbes) {
        lab::OctreeQueryResult probeOctreeResult{};
        lab::BruteVolumeResult probeBruteResult{};
        lab::queryOctree(tree, points, probe, probeOctreeResult);
        lab::queryVolumeBruteForce(points, probe, probeBruteResult);
        probeSetMatchesOracle = probeSetMatchesOracle &&
            lab::octreeMatchesBruteForce(probeOctreeResult, probeBruteResult);
    }
    bool resultMatchesOracle = probeSetMatchesOracle;
#endif
#if LAB_CHECKPOINT >= 7
    lab::BatchMetrics octreeBenchmark{};
    lab::BatchMetrics bruteBenchmark{};
#endif
#if LAB_CHECKPOINT >= 8
    std::vector<lab::CapacityStudyRow> studyRows{};
#endif
#if LAB_CHECKPOINT >= 9
    lab::PointDistribution distribution = lab::PointDistribution::clustered;
    bool paused = true;
    double autoPhase = 0.0;
    std::uint64_t previousTicks = SDL_GetTicks();
#endif

    std::vector<std::uint8_t> hitMask(points.size(), 0U);
    bool rotatingCamera = false;
    bool running = true;
    while (running) {
        SDL_Event event{};
        while (SDL_PollEvent(&event)) {
            if (event.type == SDL_EVENT_QUIT) {
                running = false;
            } else if (event.type == SDL_EVENT_WINDOW_PIXEL_SIZE_CHANGED) {
                width = std::max(1, event.window.data1);
                height = std::max(1, event.window.data2);
                SDL_DestroyTexture(texture);
                texture = SDL_CreateTexture(
                    renderer,
                    SDL_PIXELFORMAT_RGBA8888,
                    SDL_TEXTUREACCESS_STREAMING,
                    width,
                    height
                );
                if (!texture) {
                    std::cerr
                        << "SDL_CreateTexture failed after resize: "
                        << SDL_GetError() << '\n';
                    running = false;
                }
                pixels.assign(
                    std::size_t(width) * std::size_t(height),
                    project30::kBackground
                );
            } else if (event.type == SDL_EVENT_MOUSE_BUTTON_DOWN && event.button.button == SDL_BUTTON_LEFT) {
                rotatingCamera = true;
                SDL_CaptureMouse(true);
            } else if (event.type == SDL_EVENT_MOUSE_MOTION && rotatingCamera) {
                camera.yaw += double(event.motion.xrel) * 0.008;
                camera.pitch += double(event.motion.yrel) * 0.008;
                camera.pitch = std::clamp(camera.pitch, -1.35, 1.35);
            } else if (event.type == SDL_EVENT_MOUSE_BUTTON_UP && event.button.button == SDL_BUTTON_LEFT) {
                rotatingCamera = false;
                SDL_CaptureMouse(false);
            } else if (event.type == SDL_EVENT_MOUSE_WHEEL) {
                camera.distance -= double(event.wheel.y) * 0.12;
                camera.distance = std::clamp(camera.distance, 1.2, 5.0);
            } else if (event.type == SDL_EVENT_KEY_DOWN && !event.key.repeat) {
                if (event.key.key == SDLK_ESCAPE) {
                    running = false;
                } else if (event.key.key == SDLK_A) {
                    queryCenter.x -= 0.025;
                } else if (event.key.key == SDLK_D) {
                    queryCenter.x += 0.025;
                } else if (event.key.key == SDLK_W) {
                    queryCenter.y += 0.025;
                } else if (event.key.key == SDLK_S) {
                    queryCenter.y -= 0.025;
                } else if (event.key.key == SDLK_Q) {
                    queryCenter.z -= 0.025;
                } else if (event.key.key == SDLK_E) {
                    queryCenter.z += 0.025;
                } else if (event.key.key == SDLK_LEFTBRACKET) {
                    queryHalfSize.x = std::max(0.025, queryHalfSize.x - 0.01);
                    queryHalfSize.y = std::max(0.025, queryHalfSize.y - 0.01);
                    queryHalfSize.z = std::max(0.025, queryHalfSize.z - 0.01);
                } else if (event.key.key == SDLK_RIGHTBRACKET) {
                    queryHalfSize.x = std::min(0.25, queryHalfSize.x + 0.01);
                    queryHalfSize.y = std::min(0.25, queryHalfSize.y + 0.01);
                    queryHalfSize.z = std::min(0.25, queryHalfSize.z + 0.01);
                } else if (event.key.key == SDLK_R) {
                    if (rotatingCamera) {
                        rotatingCamera = false;
                        SDL_CaptureMouse(false);
                    }
                    camera = {};
                    queryCenter = {0.5, 0.5, 0.5};
                    queryHalfSize = {0.08, 0.07, 0.06};
#if LAB_CHECKPOINT >= 7
                    octreeBenchmark = {};
                    bruteBenchmark = {};
#endif
#if LAB_CHECKPOINT >= 8
                    studyRows.clear();
#endif
#if LAB_CHECKPOINT >= 9
                    clustered = true;
                    distribution = lab::PointDistribution::clustered;
                    treeConfig.leafCapacity = 16U;
                    points = lab::makePointCloud(100'000, worldBounds, seed, clustered);
                    tree = lab::buildOctree(points, treeConfig);
                    topology = lab::inspectOctreeTopology(tree, points.size());
                    paused = true;
                    autoPhase = 0.0;
#endif
                }
#if LAB_CHECKPOINT >= 7
                else if (event.key.key == SDLK_B) {
                    const std::vector<lab::Bounds3D> probes = lab::makeVolumeQueries(
                        24,
                        worldBounds,
                        {0.14, 0.12, 0.10},
                        seed ^ 0x300030U
                    );
                    lab::OctreeQueryResult octreeWorkspace{};
                    lab::BruteVolumeResult bruteWorkspace{};
                    lab::benchmarkOctree(tree, points, probes, 1, octreeWorkspace);
                    lab::benchmarkBruteVolumes(points, probes, 1, bruteWorkspace);
                    octreeBenchmark =
                        lab::benchmarkOctree(tree, points, probes, 3, octreeWorkspace);
                    bruteBenchmark =
                        lab::benchmarkBruteVolumes(points, probes, 3, bruteWorkspace);
                    std::printf(
                        "\nProject 30 benchmark: octree %.3f us/query, brute %.3f us/query, candidates %zu, scans %zu, checksum %08x/%08x\n",
                        octreeBenchmark.elapsedMicroseconds / double(octreeBenchmark.queryCount),
                        bruteBenchmark.elapsedMicroseconds / double(bruteBenchmark.queryCount),
                        octreeBenchmark.totalCandidates,
                        bruteBenchmark.totalScanned,
                        unsigned(octreeBenchmark.checksum),
                        unsigned(bruteBenchmark.checksum)
                    );
                }
#endif
#if LAB_CHECKPOINT >= 8
                else if (event.key.key == SDLK_T) {
                    const std::vector<lab::Bounds3D> probes = lab::makeVolumeQueries(
                        12,
                        worldBounds,
                        {0.14, 0.12, 0.10},
                        seed ^ 0x300030U
                    );
                    const std::array<std::size_t, 4> capacities{8, 16, 32, 64};
                    studyRows =
                        lab::makeCapacityStudy(points, worldBounds, probes, capacities, 1);
                    project30::printCapacityTable(studyRows);
                }
#endif
#if LAB_CHECKPOINT >= 9
                else if (event.key.key == SDLK_SPACE) {
                    paused = !paused;
                } else if (event.key.key == SDLK_G) {
                    clustered = !clustered;
                    distribution = lab::PointDistribution::uniform;
                    if (clustered) {
                        distribution = lab::PointDistribution::clustered;
                    }
                    points = lab::makePointCloud(100'000, worldBounds, seed, clustered);
                    tree = lab::buildOctree(points, treeConfig);
                    topology = lab::inspectOctreeTopology(tree, points.size());
                    octreeBenchmark = {};
                    bruteBenchmark = {};
                    studyRows.clear();
                } else if (event.key.key == SDLK_C) {
                    if (treeConfig.leafCapacity == 8U) {
                        treeConfig.leafCapacity = 16U;
                    } else if (treeConfig.leafCapacity == 16U) {
                        treeConfig.leafCapacity = 32U;
                    } else if (treeConfig.leafCapacity == 32U) {
                        treeConfig.leafCapacity = 64U;
                    } else {
                        treeConfig.leafCapacity = 8U;
                    }
                    tree = lab::buildOctree(points, treeConfig);
                    topology = lab::inspectOctreeTopology(tree, points.size());
                    octreeBenchmark = {};
                    bruteBenchmark = {};
                    studyRows.clear();
                }
#endif
            }
        }

#if LAB_CHECKPOINT >= 9
        const std::uint64_t currentTicks = SDL_GetTicks();
        const double deltaSeconds =
            std::min(0.05, double(currentTicks - previousTicks) / 1000.0);
        previousTicks = currentTicks;
        if (!paused) {
            autoPhase += deltaSeconds * 0.48;
            queryCenter = {
                0.5 + std::cos(autoPhase) * 0.28,
                0.5 + std::sin(autoPhase * 1.31) * 0.25,
                0.5 + std::sin(autoPhase * 0.83) * 0.27,
            };
        }
#endif

        project30::clampQueryCenter(queryCenter, queryHalfSize);
        queryVolume = project30::volumeAround(queryCenter, queryHalfSize);
        lab::queryVolumeBruteForce(points, queryVolume, bruteResult);
#if LAB_CHECKPOINT >= 5
        lab::queryOctree(tree, points, queryVolume, octreeResult);
#endif
#if LAB_CHECKPOINT >= 6
        resultMatchesOracle = probeSetMatchesOracle &&
            lab::octreeMatchesBruteForce(octreeResult, bruteResult);
#endif

        hitMask.assign(points.size(), 0U);
#if LAB_CHECKPOINT >= 5
        for (const std::size_t pointIndex : octreeResult.hitIndices) {
            hitMask[pointIndex] = 1U;
        }
#else
        for (const std::size_t pointIndex : bruteResult.hitIndices) {
            hitMask[pointIndex] = 1U;
        }
#endif

        std::fill(pixels.begin(), pixels.end(), project30::kBackground);
#if LAB_CHECKPOINT >= 2
        project30::drawOctree(pixels, width, height, tree, camera);
#elif LAB_CHECKPOINT >= 1
        project30::drawRootOctants(pixels, width, height, worldBounds, camera);
#else
        project30::drawBoxWireframe(
            pixels,
            width,
            height,
            worldBounds,
            camera,
            project30::kTree
        );
#endif
        project30::drawPointCloud(pixels, width, height, points, hitMask, camera);
        project30::drawBoxWireframe(
            pixels,
            width,
            height,
            queryVolume,
            camera,
            project30::kQuery
        );
#if LAB_CHECKPOINT >= 8
        project30::drawCapacityStudy(pixels, width, height, studyRows);
#endif

#if LAB_CHECKPOINT >= 9
        const bool topologyValid = topology.everyPointStoredOnce &&
            topology.internalNodesEmpty &&
            topology.childIndicesValid &&
            topology.childBoundsValid &&
            topology.capacityHonored && topology.statisticsMatch;
        const char* topologyLabel = "INVALID";
        if (topologyValid) {
            topologyLabel = "valid";
        }
        const char* matchLabel = "NO";
        if (resultMatchesOracle) {
            matchLabel = "yes";
        }
        double octreePerQuery = 0.0;
        if (octreeBenchmark.queryCount > 0U) {
            octreePerQuery =
                octreeBenchmark.elapsedMicroseconds / double(octreeBenchmark.queryCount);
        }
        double brutePerQuery = 0.0;
        if (bruteBenchmark.queryCount > 0U) {
            brutePerQuery =
                bruteBenchmark.elapsedMicroseconds / double(bruteBenchmark.queryCount);
        }
        char title[720]{};
        std::snprintf(
            title,
            sizeof(title),
            "Project 30 | %s cap %zu | topology %s | nodes %zu leaves %zu depth %d build %.1f us | visited %zu candidates %zu hits %zu match %s | B %.2f/%.2f us | G distribution C capacity T study",
            lab::distributionLabel(distribution),
            treeConfig.leafCapacity,
            topologyLabel,
            tree.nodes.size(),
            tree.leafCount,
            tree.maximumObservedDepth,
            tree.rebuildMicroseconds,
            octreeResult.visitedNodes,
            octreeResult.candidatesChecked,
            octreeResult.hitIndices.size(),
            matchLabel,
            octreePerQuery,
            brutePerQuery
        );
        SDL_SetWindowTitle(window, title);
#elif LAB_CHECKPOINT >= 8
        char title[480]{};
        std::snprintf(
            title,
            sizeof(title),
            "Project 30 | nodes %zu | candidates %zu | study rows %zu | B benchmark T capacity study",
            tree.nodes.size(),
            octreeResult.candidatesChecked,
            studyRows.size()
        );
        SDL_SetWindowTitle(window, title);
#elif LAB_CHECKPOINT >= 7
        char title[420]{};
        std::snprintf(
            title,
            sizeof(title),
            "Project 30 | nodes %zu | candidates %zu / brute %zu | B benchmark",
            tree.nodes.size(),
            octreeResult.candidatesChecked,
            points.size()
        );
        SDL_SetWindowTitle(window, title);
#elif LAB_CHECKPOINT >= 6
        const char* matchLabel = "MISMATCH";
        if (resultMatchesOracle) {
            matchLabel = "match";
        }
        char title[360]{};
        std::snprintf(
            title,
            sizeof(title),
            "Project 30 | hits %zu | candidates %zu | oracle %s",
            octreeResult.hitIndices.size(),
            octreeResult.candidatesChecked,
            matchLabel
        );
        SDL_SetWindowTitle(window, title);
#elif LAB_CHECKPOINT >= 5
        char title[420]{};
        std::snprintf(
            title,
            sizeof(title),
            "Project 30 | visited %zu | pruned %zu | leaves %zu | candidates %zu | hits %zu",
            octreeResult.visitedNodes,
            octreeResult.prunedNodes,
            octreeResult.visitedLeaves,
            octreeResult.candidatesChecked,
            octreeResult.hitIndices.size()
        );
        SDL_SetWindowTitle(window, title);
#elif LAB_CHECKPOINT >= 4
        const bool topologyValid = topology.everyPointStoredOnce &&
            topology.internalNodesEmpty &&
            topology.childIndicesValid &&
            topology.childBoundsValid &&
            topology.capacityHonored && topology.statisticsMatch;
        const char* topologyLabel = "INVALID";
        if (topologyValid) {
            topologyLabel = "valid";
        }
        char title[360]{};
        std::snprintf(
            title,
            sizeof(title),
            "Project 30 | topology %s | nodes %zu | leaves %zu | depth %d",
            topologyLabel,
            tree.nodes.size(),
            tree.leafCount,
            tree.maximumObservedDepth
        );
        SDL_SetWindowTitle(window, title);
#elif LAB_CHECKPOINT >= 3
        char title[340]{};
        std::snprintf(
            title,
            sizeof(title),
            "Project 30 | nodes %zu | leaves %zu | depth %d | max leaf %zu",
            tree.nodes.size(),
            tree.leafCount,
            tree.maximumObservedDepth,
            tree.maximumLeafOccupancy
        );
        SDL_SetWindowTitle(window, title);
#elif LAB_CHECKPOINT >= 2
        char title[300]{};
        std::snprintf(
            title,
            sizeof(title),
            "Project 30 | root leaf | stored %zu points | capacity %zu",
            tree.insertedCount,
            treeConfig.leafCapacity
        );
        SDL_SetWindowTitle(window, title);
#elif LAB_CHECKPOINT >= 1
        SDL_SetWindowTitle(
            window,
            "Project 30 | octant bits: +X=1 +Y=2 +Z=4 | equality goes positive"
        );
#else
        char title[280]{};
        std::snprintf(
            title,
            sizeof(title),
            "Project 30 starter | brute scans %zu | selected %zu | drag to orbit",
            bruteResult.scanned,
            bruteResult.hitIndices.size()
        );
        SDL_SetWindowTitle(window, title);
#endif

        if (!texture) {
            break;
        }
        SDL_UpdateTexture(
            texture,
            nullptr,
            pixels.data(),
            width * int(sizeof(std::uint32_t))
        );
        SDL_RenderClear(renderer);
        SDL_RenderTexture(renderer, texture, nullptr, nullptr);
        SDL_RenderPresent(renderer);
    }

    if (rotatingCamera) {
        SDL_CaptureMouse(false);
    }

    // Cleanup: texture phụ thuộc renderer, giải phóng theo thứ tự ngược lúc tạo.
    SDL_DestroyTexture(texture);
    SDL_DestroyRenderer(renderer);
    SDL_DestroyWindow(window);
    SDL_Quit();
    return EXIT_SUCCESS;
}
