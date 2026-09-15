#include "lab.hpp"

#include <SDL3/SDL.h>

#include <algorithm>
#include <cmath>
#include <cstddef>
#include <cstdint>
#include <cstdio>
#include <cstdlib>
#include <iostream>
#include <span>
#include <vector>

namespace {

constexpr int kInitialWidth = 960;
constexpr int kInitialHeight = 720;
constexpr std::uint32_t kBackground = 0x0b1020ffU;
constexpr std::uint32_t kParticle = 0x5c6f91ffU;
constexpr std::uint32_t kHit = 0xe5c07bffU;
constexpr std::uint32_t kTree = 0x3e5d82ffU;
constexpr std::uint32_t kSelection = 0x61afefffU;
constexpr std::uint32_t kGraph = 0x98c379ffU;

struct ScreenPoint {
    int x{};
    int y{};
};

struct WorldView {
    int left{};
    int top{};
    int size{};
};

WorldView makeWorldView(int width, int height) {
    const int size = std::max(160, std::min(width - 48, height - 88));
    return {(width - size) / 2, 24, size};
}

ScreenPoint worldToScreen(const lab::Vec2& point, const WorldView& view) {
    return {
        view.left + int(std::lround(point.x * double(view.size))),
        view.top + int(std::lround((1.0 - point.y) * double(view.size))),
    };
}

lab::Vec2 screenToWorld(float x, float y, const WorldView& view) {
    const double worldX = std::clamp((double(x) - double(view.left)) / double(view.size), 0.0, 1.0);
    const double worldY = std::clamp(1.0 - (double(y) - double(view.top)) / double(view.size), 0.0, 1.0);
    return {worldX, worldY};
}

void putPixel(std::vector<std::uint32_t>& pixels, int width, int height, int x, int y, std::uint32_t color) {
    if (x < 0 || y < 0 || x >= width || y >= height) {
        return;
    }
    pixels[std::size_t(y) * std::size_t(width) + std::size_t(x)] = color;
}

void drawLine(std::vector<std::uint32_t>& pixels, int width, int height, ScreenPoint a, ScreenPoint b, std::uint32_t color) {
    int x = a.x;
    int y = a.y;
    const int deltaX = std::abs(b.x - a.x);
    int stepX = -1;
    if (a.x < b.x) {
        stepX = 1;
    }
    const int deltaY = -std::abs(b.y - a.y);
    int stepY = -1;
    if (a.y < b.y) {
        stepY = 1;
    }
    int error = deltaX + deltaY;

    while (true) {
        putPixel(pixels, width, height, x, y, color);
        if (x == b.x && y == b.y) {
            break;
        }
        const int doubledError = error * 2;
        if (doubledError >= deltaY) {
            error += deltaY;
            x += stepX;
        }
        if (doubledError <= deltaX) {
            error += deltaX;
            y += stepY;
        }
    }
}

void drawBoxOutline(std::vector<std::uint32_t>& pixels, int width, int height, const lab::Bounds2D& bounds, const WorldView& view, std::uint32_t color) {
    const ScreenPoint minimum = worldToScreen(bounds.minimum, view);
    const ScreenPoint maximum = worldToScreen(bounds.maximum, view);
    const ScreenPoint topLeft{minimum.x, maximum.y};
    const ScreenPoint topRight{maximum.x, maximum.y};
    const ScreenPoint bottomLeft{minimum.x, minimum.y};
    const ScreenPoint bottomRight{maximum.x, minimum.y};
    drawLine(pixels, width, height, topLeft, topRight, color);
    drawLine(pixels, width, height, topRight, bottomRight, color);
    drawLine(pixels, width, height, bottomRight, bottomLeft, color);
    drawLine(pixels, width, height, bottomLeft, topLeft, color);
}

void fillSelection(std::vector<std::uint32_t>& pixels, int width, int height, const lab::SelectionBox& selection, const WorldView& view) {
    const ScreenPoint minimum = worldToScreen(selection.minimum, view);
    const ScreenPoint maximum = worldToScreen(selection.maximum, view);
    const int left = std::min(minimum.x, maximum.x);
    const int right = std::max(minimum.x, maximum.x);
    const int top = std::min(minimum.y, maximum.y);
    const int bottom = std::max(minimum.y, maximum.y);
    for (int y = top; y <= bottom; ++y) {
        for (int x = left; x <= right; ++x) {
            if ((x + y) % 3 == 0) {
                putPixel(pixels, width, height, x, y, 0x162842ffU);
            }
        }
    }
}

void drawParticles(std::vector<std::uint32_t>& pixels, int width, int height, std::span<const lab::Particle> particles, std::span<const std::uint8_t> hitMask, const WorldView& view) {
    const std::size_t drawCount = std::min<std::size_t>(particles.size(), 35'000U);
    for (std::size_t index = 0; index < drawCount; ++index) {
        const ScreenPoint screen = worldToScreen(particles[index].position, view);
        std::uint32_t color = kParticle;
        if (index < hitMask.size() && hitMask[index] != 0U) {
            color = kHit;
        }
        putPixel(pixels, width, height, screen.x, screen.y, color);
        if (color == kHit) {
            putPixel(pixels, width, height, screen.x + 1, screen.y, color);
            putPixel(pixels, width, height, screen.x, screen.y + 1, color);
        }
    }
}

#if LAB_CHECKPOINT >= 1
void drawRootQuadrants(std::vector<std::uint32_t>& pixels, int width, int height, const lab::Bounds2D& bounds, const WorldView& view) {
    drawBoxOutline(pixels, width, height, bounds, view, kTree);
    const double middleX = (bounds.minimum.x + bounds.maximum.x) * 0.5;
    const double middleY = (bounds.minimum.y + bounds.maximum.y) * 0.5;
    drawLine(pixels, width, height, worldToScreen({middleX, bounds.minimum.y}, view), worldToScreen({middleX, bounds.maximum.y}, view), kTree);
    drawLine(pixels, width, height, worldToScreen({bounds.minimum.x, middleY}, view), worldToScreen({bounds.maximum.x, middleY}, view), kTree);
}
#endif

#if LAB_CHECKPOINT >= 2
void drawQuadtree(std::vector<std::uint32_t>& pixels, int width, int height, const lab::Quadtree& tree, const WorldView& view) {
    const std::size_t drawStride = std::max<std::size_t>(1U, tree.leafCount / 12'000U);
    std::size_t leafIndex = 0;
    for (const lab::QuadtreeNode& node : tree.nodes) {
        if (node.isLeaf()) {
            if (leafIndex % drawStride == 0U) {
                drawBoxOutline(pixels, width, height, node.bounds, view, kTree);
            }
            ++leafIndex;
        }
    }
}
#endif

#if LAB_CHECKPOINT >= 7
void drawCapacityStudy(std::vector<std::uint32_t>& pixels, int width, int height, const std::vector<lab::CapacityStudyRow>& rows) {
    if (rows.empty()) {
        return;
    }
    const int left = 32;
    const int right = width - 32;
    const int bottom = height - 16;
    const int top = height - 70;
    std::size_t maximumCandidates = 1;
    std::size_t maximumNodes = 1;
    for (const lab::CapacityStudyRow& row : rows) {
        maximumCandidates = std::max(maximumCandidates, row.metrics.totalCandidates);
        maximumNodes = std::max(maximumNodes, row.nodeCount);
    }
    const int slotWidth = std::max(1, (right - left) / int(rows.size()));
    for (std::size_t index = 0; index < rows.size(); ++index) {
        const int centerX = left + slotWidth * int(index) + slotWidth / 2;
        const int barHeight = int(std::lround(double(rows[index].metrics.totalCandidates) / double(maximumCandidates) * double(bottom - top)));
        for (int x = centerX - 18; x <= centerX + 18; ++x) {
            drawLine(pixels, width, height, {x, bottom}, {x, bottom - barHeight}, kGraph);
        }
        const int nodeY = bottom - int(std::lround(double(rows[index].nodeCount) / double(maximumNodes) * double(bottom - top)));
        for (int offsetY = -2; offsetY <= 2; ++offsetY) {
            for (int offsetX = -2; offsetX <= 2; ++offsetX) {
                putPixel(pixels, width, height, centerX + offsetX, nodeY + offsetY, kTree);
            }
        }
    }
}

void printCapacityTable(const std::vector<lab::CapacityStudyRow>& rows) {
    std::cout << "\nProject 29 capacity study\n";
    std::cout << "capacity\tnodes\tleaves\tdepth\tmaxLeaf\tcandidates/query\trebuild us\tquery us\tchecksum\n";
    for (const lab::CapacityStudyRow& row : rows) {
        const double queryCount = double(std::max<std::size_t>(1U, row.metrics.queryCount));
        std::printf(
            "%zu\t%zu\t%zu\t%d\t%zu\t%.2f\t%.2f\t%.3f\t%08x\n",
            row.leafCapacity,
            row.nodeCount,
            row.leafCount,
            row.maximumObservedDepth,
            row.maximumLeafOccupancy,
            double(row.metrics.totalCandidates) / queryCount,
            row.rebuildMicroseconds,
            row.metrics.elapsedMicroseconds / queryCount,
            unsigned(row.metrics.checksum)
        );
    }
    std::cout << std::flush;
}
#endif

} // namespace

int main() {
    // Setup: bắt đầu từ particle cloud và brute-force selection có thể chạy ngay.
    if (!SDL_Init(SDL_INIT_VIDEO)) {
        std::cerr << "SDL_Init failed: " << SDL_GetError() << '\n';
        return EXIT_FAILURE;
    }

    SDL_Window* window = SDL_CreateWindow("Project 29 | Visible Quadtree", kInitialWidth, kInitialHeight, SDL_WINDOW_RESIZABLE);
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

    int width = kInitialWidth;
    int height = kInitialHeight;
    SDL_Texture* texture = SDL_CreateTexture(renderer, SDL_PIXELFORMAT_RGBA8888, SDL_TEXTUREACCESS_STREAMING, width, height);
    if (!texture) {
        std::cerr << "SDL_CreateTexture failed: " << SDL_GetError() << '\n';
        SDL_DestroyRenderer(renderer);
        SDL_DestroyWindow(window);
        SDL_Quit();
        return EXIT_FAILURE;
    }
    std::vector<std::uint32_t> pixels(std::size_t(width) * std::size_t(height), kBackground);

    const lab::Bounds2D bounds{{0.0, 0.0}, {1.0, 1.0}};
    constexpr std::uint32_t seed = 0x29c0ffeeU;
#if LAB_CHECKPOINT >= 8
    lab::QuadtreeDistribution distribution = lab::QuadtreeDistribution::clustered;
    bool clustered = true;
#else
    const bool clustered = true;
#endif
    std::vector<lab::Particle> particles = lab::makeParticleCloud(100'000, bounds, seed, clustered);
    lab::SelectionBox selection = lab::normalizeSelectionBox({0.42, 0.42}, {0.58, 0.56});
    lab::Vec2 dragStart = selection.minimum;
    bool dragging = false;
    lab::BruteSelectionResult bruteResult{};

#if LAB_CHECKPOINT >= 2
    lab::QuadtreeConfig treeConfig{bounds, 8, 12, 1.0 / 4096.0};
#if LAB_CHECKPOINT >= 3
    lab::Quadtree tree = lab::buildQuadtree(particles, treeConfig);
#else
    lab::Quadtree tree = lab::createRootQuadtree(particles, treeConfig);
#endif
#endif
#if LAB_CHECKPOINT >= 4
    lab::QuadtreeTopologyReport topology = lab::inspectQuadtreeTopology(tree, particles.size());
#endif
#if LAB_CHECKPOINT >= 5
    lab::QuadtreeQueryResult treeResult{};
#endif
#if LAB_CHECKPOINT >= 6
    bool resultMatchesOracle = true;
#endif
#if LAB_CHECKPOINT >= 7
    lab::BatchMetrics treeBenchmark{};
    lab::BatchMetrics bruteBenchmark{};
    std::vector<lab::CapacityStudyRow> studyRows{};
#endif
#if LAB_CHECKPOINT >= 8
    bool paused = true;
    double autoPhase = 0.0;
    std::uint64_t previousTicks = SDL_GetTicks();
#endif
    std::vector<std::uint8_t> hitMask(particles.size(), 0U);

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
                texture = SDL_CreateTexture(renderer, SDL_PIXELFORMAT_RGBA8888, SDL_TEXTUREACCESS_STREAMING, width, height);
                if (!texture) {
                    std::cerr << "SDL_CreateTexture failed after resize: " << SDL_GetError() << '\n';
                    running = false;
                }
                pixels.assign(std::size_t(width) * std::size_t(height), kBackground);
            } else if (event.type == SDL_EVENT_MOUSE_BUTTON_DOWN && event.button.button == SDL_BUTTON_LEFT) {
                const WorldView view = makeWorldView(width, height);
                dragStart = screenToWorld(event.button.x, event.button.y, view);
                selection = lab::normalizeSelectionBox(dragStart, dragStart);
                dragging = true;
                SDL_CaptureMouse(true);
            } else if (event.type == SDL_EVENT_MOUSE_MOTION && dragging) {
                const WorldView view = makeWorldView(width, height);
                selection = lab::normalizeSelectionBox(dragStart, screenToWorld(event.motion.x, event.motion.y, view));
            } else if (event.type == SDL_EVENT_MOUSE_BUTTON_UP && event.button.button == SDL_BUTTON_LEFT) {
                if (dragging) {
                    const WorldView view = makeWorldView(width, height);
                    selection = lab::normalizeSelectionBox(dragStart, screenToWorld(event.button.x, event.button.y, view));
                }
                dragging = false;
                SDL_CaptureMouse(false);
            } else if (event.type == SDL_EVENT_KEY_DOWN && !event.key.repeat) {
                if (event.key.key == SDLK_ESCAPE) {
                    running = false;
                } else if (event.key.key == SDLK_R) {
                    if (dragging) {
                        dragging = false;
                        SDL_CaptureMouse(false);
                    }
                    selection = lab::normalizeSelectionBox({0.42, 0.42}, {0.58, 0.56});
#if LAB_CHECKPOINT >= 7
                    treeBenchmark = {};
                    bruteBenchmark = {};
                    studyRows.clear();
#endif
#if LAB_CHECKPOINT >= 8
                    clustered = true;
                    distribution = lab::QuadtreeDistribution::clustered;
                    treeConfig.leafCapacity = 8U;
                    particles = lab::makeParticleCloud(100'000, bounds, seed, clustered);
                    tree = lab::buildQuadtree(particles, treeConfig);
                    topology = lab::inspectQuadtreeTopology(tree, particles.size());
                    paused = true;
                    autoPhase = 0.0;
#endif
                }
#if LAB_CHECKPOINT >= 7
                else if (event.key.key == SDLK_B) {
                    const std::vector<lab::SelectionBox> probes = lab::makeSelectionQueries(32, bounds, 0.12, 0.09, seed ^ 0x290029U);
                    lab::QuadtreeQueryResult treeWorkspace{};
                    lab::BruteSelectionResult bruteWorkspace{};
                    lab::benchmarkQuadtree(tree, particles, probes, 1, treeWorkspace);
                    lab::benchmarkBruteSelections(particles, probes, 1, bruteWorkspace);
                    treeBenchmark = lab::benchmarkQuadtree(tree, particles, probes, 4, treeWorkspace);
                    bruteBenchmark = lab::benchmarkBruteSelections(particles, probes, 4, bruteWorkspace);
                    std::printf(
                        "\nProject 29 benchmark: tree %.3f us/query, brute %.3f us/query, candidates %zu, scans %zu, checksum %08x/%08x\n",
                        treeBenchmark.elapsedMicroseconds / double(treeBenchmark.queryCount),
                        bruteBenchmark.elapsedMicroseconds / double(bruteBenchmark.queryCount),
                        treeBenchmark.totalCandidates,
                        bruteBenchmark.totalScanned,
                        unsigned(treeBenchmark.checksum),
                        unsigned(bruteBenchmark.checksum)
                    );
                } else if (event.key.key == SDLK_S) {
                    const std::vector<lab::SelectionBox> probes = lab::makeSelectionQueries(16, bounds, 0.12, 0.09, seed ^ 0x290029U);
                    const std::array<std::size_t, 4> capacities{4, 8, 16, 32};
                    studyRows = lab::makeCapacityStudy(particles, bounds, probes, capacities, 1);
                    printCapacityTable(studyRows);
                }
#endif
#if LAB_CHECKPOINT >= 8
                else if (event.key.key == SDLK_SPACE) {
                    paused = !paused;
                } else if (event.key.key == SDLK_D) {
                    clustered = !clustered;
                    distribution = lab::QuadtreeDistribution::uniform;
                    if (clustered) {
                        distribution = lab::QuadtreeDistribution::clustered;
                    }
                    particles = lab::makeParticleCloud(100'000, bounds, seed, clustered);
                    tree = lab::buildQuadtree(particles, treeConfig);
                    topology = lab::inspectQuadtreeTopology(tree, particles.size());
                    treeBenchmark = {};
                    bruteBenchmark = {};
                    studyRows.clear();
                } else if (event.key.key == SDLK_C) {
                    if (treeConfig.leafCapacity == 4U) {
                        treeConfig.leafCapacity = 8U;
                    } else if (treeConfig.leafCapacity == 8U) {
                        treeConfig.leafCapacity = 16U;
                    } else if (treeConfig.leafCapacity == 16U) {
                        treeConfig.leafCapacity = 32U;
                    } else {
                        treeConfig.leafCapacity = 4U;
                    }
                    tree = lab::buildQuadtree(particles, treeConfig);
                    topology = lab::inspectQuadtreeTopology(tree, particles.size());
                    treeBenchmark = {};
                    bruteBenchmark = {};
                    studyRows.clear();
                }
#endif
            }
        }

#if LAB_CHECKPOINT >= 8
        const std::uint64_t currentTicks = SDL_GetTicks();
        const double deltaSeconds = std::min(0.05, double(currentTicks - previousTicks) / 1000.0);
        previousTicks = currentTicks;
        if (!paused && !dragging) {
            autoPhase += deltaSeconds * 0.55;
            const lab::Vec2 center{0.5 + std::cos(autoPhase) * 0.3, 0.5 + std::sin(autoPhase * 1.37) * 0.27};
            selection = lab::normalizeSelectionBox({center.x - 0.07, center.y - 0.055}, {center.x + 0.07, center.y + 0.055});
        }
#endif

        lab::querySelectionBruteForce(particles, selection, bruteResult);
#if LAB_CHECKPOINT >= 5
        lab::queryQuadtree(tree, particles, selection, treeResult);
#endif
#if LAB_CHECKPOINT >= 6
        resultMatchesOracle = lab::quadtreeMatchesBruteForce(treeResult, bruteResult);
#endif

        hitMask.assign(particles.size(), 0U);
#if LAB_CHECKPOINT >= 5
        for (const std::size_t particleIndex : treeResult.hitIndices) {
            hitMask[particleIndex] = 1U;
        }
#else
        for (const std::size_t particleIndex : bruteResult.hitIndices) {
            hitMask[particleIndex] = 1U;
        }
#endif

        std::fill(pixels.begin(), pixels.end(), kBackground);
        const WorldView view = makeWorldView(width, height);
        fillSelection(pixels, width, height, selection, view);
#if LAB_CHECKPOINT >= 2
        drawQuadtree(pixels, width, height, tree, view);
#elif LAB_CHECKPOINT >= 1
        drawRootQuadrants(pixels, width, height, bounds, view);
#else
        drawBoxOutline(pixels, width, height, bounds, view, kTree);
#endif
        drawParticles(pixels, width, height, particles, hitMask, view);
        drawBoxOutline(pixels, width, height, {selection.minimum, selection.maximum}, view, kSelection);
#if LAB_CHECKPOINT >= 7
        drawCapacityStudy(pixels, width, height, studyRows);
#endif

#if LAB_CHECKPOINT >= 8
        const char* matchLabel = "NO";
        if (resultMatchesOracle) {
            matchLabel = "yes";
        }
        double treePerQuery = 0.0;
        if (treeBenchmark.queryCount > 0U) {
            treePerQuery = treeBenchmark.elapsedMicroseconds / double(treeBenchmark.queryCount);
        }
        double brutePerQuery = 0.0;
        if (bruteBenchmark.queryCount > 0U) {
            brutePerQuery = bruteBenchmark.elapsedMicroseconds / double(bruteBenchmark.queryCount);
        }
        const bool topologyValid = topology.everyParticleStoredOnce && topology.internalNodesEmpty && topology.childIndicesValid && topology.capacityHonored && topology.statisticsMatch;
        const char* topologyLabel = "INVALID";
        if (topologyValid) {
            topologyLabel = "valid";
        }
        char title[620]{};
        std::snprintf(title, sizeof(title), "Project 29 | %s | cap %zu | topology %s | nodes %zu leaves %zu depth %d build %.1f us | visited %zu candidates %zu hits %zu match %s | B %.2f/%.2f us | D distribution C capacity S study", lab::distributionLabel(distribution), treeConfig.leafCapacity, topologyLabel, tree.nodes.size(), tree.leafCount, tree.maximumObservedDepth, tree.rebuildMicroseconds, treeResult.visitedNodes, treeResult.candidatesChecked, treeResult.hitIndices.size(), matchLabel, treePerQuery, brutePerQuery);
        SDL_SetWindowTitle(window, title);
#elif LAB_CHECKPOINT >= 7
        char title[480]{};
        std::snprintf(title, sizeof(title), "Project 29 | nodes %zu | candidates %zu / brute %zu | B benchmark | S capacity study", tree.nodes.size(), treeResult.candidatesChecked, particles.size());
        SDL_SetWindowTitle(window, title);
#elif LAB_CHECKPOINT >= 6
        const char* matchLabel = "MISMATCH";
        if (resultMatchesOracle) {
            matchLabel = "match";
        }
        char title[360]{};
        std::snprintf(title, sizeof(title), "Project 29 | hits %zu | candidates %zu | oracle %s", treeResult.hitIndices.size(), treeResult.candidatesChecked, matchLabel);
        SDL_SetWindowTitle(window, title);
#elif LAB_CHECKPOINT >= 5
        char title[360]{};
        std::snprintf(title, sizeof(title), "Project 29 | visited %zu | pruned %zu | leaves %zu | candidates %zu | hits %zu", treeResult.visitedNodes, treeResult.prunedNodes, treeResult.visitedLeaves, treeResult.candidatesChecked, treeResult.hitIndices.size());
        SDL_SetWindowTitle(window, title);
#elif LAB_CHECKPOINT >= 4
        const bool topologyValid = topology.everyParticleStoredOnce && topology.internalNodesEmpty && topology.childIndicesValid && topology.capacityHonored && topology.statisticsMatch;
        char title[320]{};
        const char* topologyLabel = "INVALID";
        if (topologyValid) {
            topologyLabel = "valid";
        }
        std::snprintf(title, sizeof(title), "Project 29 | topology %s | nodes %zu | leaves %zu | depth %d", topologyLabel, tree.nodes.size(), tree.leafCount, tree.maximumObservedDepth);
        SDL_SetWindowTitle(window, title);
#elif LAB_CHECKPOINT >= 3
        char title[300]{};
        std::snprintf(title, sizeof(title), "Project 29 | nodes %zu | leaves %zu | depth %d | max leaf %zu", tree.nodes.size(), tree.leafCount, tree.maximumObservedDepth, tree.maximumLeafOccupancy);
        SDL_SetWindowTitle(window, title);
#elif LAB_CHECKPOINT >= 2
        char title[260]{};
        std::snprintf(title, sizeof(title), "Project 29 | root leaf | stored %zu particles | capacity %zu", tree.insertedCount, treeConfig.leafCapacity);
        SDL_SetWindowTitle(window, title);
#elif LAB_CHECKPOINT >= 1
        SDL_SetWindowTitle(window, "Project 29 | SW SE NW NE | split-line goes east/north");
#else
        char title[220]{};
        std::snprintf(title, sizeof(title), "Project 29 starter | brute scans %zu | selected %zu", bruteResult.scanned, bruteResult.hitIndices.size());
        SDL_SetWindowTitle(window, title);
#endif

        if (!texture) {
            break;
        }
        SDL_UpdateTexture(texture, nullptr, pixels.data(), width * int(sizeof(std::uint32_t)));
        SDL_RenderClear(renderer);
        SDL_RenderTexture(renderer, texture, nullptr, nullptr);
        SDL_RenderPresent(renderer);
    }

    if (dragging) {
        SDL_CaptureMouse(false);
    }

    // Cleanup: texture phụ thuộc renderer, nên giải phóng theo thứ tự ngược lúc tạo.
    SDL_DestroyTexture(texture);
    SDL_DestroyRenderer(renderer);
    SDL_DestroyWindow(window);
    SDL_Quit();
    return EXIT_SUCCESS;
}
