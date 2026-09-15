#ifndef LAB_CHECKPOINT
#define LAB_CHECKPOINT 8
#endif

#include "lab.hpp"

#include <SDL3/SDL.h>
#include <algorithm>
#include <array>
#include <cmath>
#include <cstddef>
#include <cstdint>
#include <cstdio>
#include <cstdlib>
#include <iostream>
#include <span>
#include <vector>

namespace {

constexpr int kInitialWidth = 1120;
constexpr int kInitialHeight = 760;
constexpr std::uint32_t kBackground = 0x0b1020ffU;
constexpr std::uint32_t kPanel = 0x11182affU;
constexpr std::uint32_t kParticle = 0x61738dffU;
constexpr std::uint32_t kGridLine = 0x263653ffU;
constexpr std::uint32_t kCandidateCell = 0x172f4dffU;
constexpr std::uint32_t kHit = 0xe5c07bffU;
constexpr std::uint32_t kNearest = 0xe06c75ffU;
constexpr std::uint32_t kQuery = 0x61afefffU;
constexpr std::uint32_t kGraph = 0x98c379ffU;

void putPixel(std::vector<std::uint32_t>& pixels, int width, int height, int x, int y, std::uint32_t color) {
    if (x < 0 || y < 0 || x >= width || y >= height) {
        return;
    }
    pixels[std::size_t(y) * std::size_t(width) + std::size_t(x)] = color;
}

void fillRectangle(std::vector<std::uint32_t>& pixels, int width, int height, int x0, int y0, int x1, int y1, std::uint32_t color) {
    const int minimumX = std::max(0, std::min(x0, x1));
    const int maximumX = std::min(width - 1, std::max(x0, x1));
    const int minimumY = std::max(0, std::min(y0, y1));
    const int maximumY = std::min(height - 1, std::max(y0, y1));
    for (int y = minimumY; y <= maximumY; ++y) {
        for (int x = minimumX; x <= maximumX; ++x) {
            putPixel(pixels, width, height, x, y, color);
        }
    }
}

void fillSquare(std::vector<std::uint32_t>& pixels, int width, int height, int centerX, int centerY, int halfSize, std::uint32_t color) {
    fillRectangle(pixels, width, height, centerX - halfSize, centerY - halfSize, centerX + halfSize, centerY + halfSize, color);
}

void drawLine(std::vector<std::uint32_t>& pixels, int width, int height, int x0, int y0, int x1, int y1, std::uint32_t color) {
    const int deltaX = std::abs(x1 - x0);
    int stepX = -1;
    if (x0 < x1) {
        stepX = 1;
    }
    const int deltaY = -std::abs(y1 - y0);
    int stepY = -1;
    if (y0 < y1) {
        stepY = 1;
    }
    int error = deltaX + deltaY;
    while (true) {
        putPixel(pixels, width, height, x0, y0, color);
        if (x0 == x1 && y0 == y1) {
            break;
        }
        const int doubledError = 2 * error;
        if (doubledError >= deltaY) {
            error += deltaY;
            x0 += stepX;
        }
        if (doubledError <= deltaX) {
            error += deltaX;
            y0 += stepY;
        }
    }
}

void drawCircleOutline(std::vector<std::uint32_t>& pixels, int width, int height, int centerX, int centerY, int radius, std::uint32_t color) {
    if (radius < 1) {
        putPixel(pixels, width, height, centerX, centerY, color);
        return;
    }
    int x = radius;
    int y = 0;
    int decision = 1 - radius;
    while (x >= y) {
        const std::array<std::array<int, 2>, 8> offsets{{{{x, y}}, {{y, x}}, {{-y, x}}, {{-x, y}}, {{-x, -y}}, {{-y, -x}}, {{y, -x}}, {{x, -y}}}};
        for (const auto& offset : offsets) {
            putPixel(pixels, width, height, centerX + offset[0], centerY + offset[1], color);
        }
        ++y;
        if (decision <= 0) {
            decision += 2 * y + 1;
        } else {
            --x;
            decision += 2 * (y - x) + 1;
        }
    }
}

bool resizeSurface(SDL_Renderer* renderer, SDL_Texture*& texture, std::vector<std::uint32_t>& pixels, int& width, int& height, int newWidth, int newHeight) {
    if (newWidth <= 0 || newHeight <= 0) {
        return true;
    }
    SDL_Texture* nextTexture = SDL_CreateTexture(renderer, SDL_PIXELFORMAT_RGBA8888, SDL_TEXTUREACCESS_STREAMING, newWidth, newHeight);
    if (!nextTexture) {
        return false;
    }
    SDL_DestroyTexture(texture);
    texture = nextTexture;
    width = newWidth;
    height = newHeight;
    pixels.assign(std::size_t(width) * std::size_t(height), kBackground);
    return true;
}

struct WorldView {
    double left{};
    double top{};
    double size{};
};

WorldView makeWorldView(int width, int height) {
#if LAB_CHECKPOINT >= 7
    const double availableHeight = double(height - 190);
#else
    const double availableHeight = double(height - 50);
#endif
    const double size = std::max(80.0, std::min(double(width - 50), availableHeight));
    return {0.5 * (double(width) - size), 24.0, size};
}

lab::Vec2 worldToScreen(lab::Vec2 point, const WorldView& view) {
    return {view.left + point.x * view.size, view.top + (1.0 - point.y) * view.size};
}

lab::Vec2 screenToWorld(double screenX, double screenY, const WorldView& view) {
    const double x = (screenX - view.left) / view.size;
    const double y = 1.0 - (screenY - view.top) / view.size;
    return {std::clamp(x, 0.0, 1.0), std::clamp(y, 0.0, 1.0)};
}

void drawParticles(std::vector<std::uint32_t>& pixels, int width, int height, std::span<const lab::Particle> particles, const WorldView& view, std::uint32_t color) {
    for (const lab::Particle& particle : particles) {
        const lab::Vec2 screen = worldToScreen(particle.position, view);
        putPixel(pixels, width, height, int(std::lround(screen.x)), int(std::lround(screen.y)), color);
    }
}

void drawQueryCircle(std::vector<std::uint32_t>& pixels, int width, int height, const lab::CircleQuery& query, const WorldView& view) {
    const lab::Vec2 center = worldToScreen(query.center, view);
    const int radius = int(std::lround(query.radius * view.size));
    drawCircleOutline(pixels, width, height, int(std::lround(center.x)), int(std::lround(center.y)), radius, kQuery);
}

void drawHits(std::vector<std::uint32_t>& pixels, int width, int height, std::span<const lab::Particle> particles, std::span<const std::size_t> hitIndices, std::size_t nearestIndex, const WorldView& view) {
    for (const std::size_t particleIndex : hitIndices) {
        if (particleIndex >= particles.size()) {
            continue;
        }
        const lab::Vec2 screen = worldToScreen(particles[particleIndex].position, view);
        fillSquare(pixels, width, height, int(std::lround(screen.x)), int(std::lround(screen.y)), 1, kHit);
    }
    if (nearestIndex < particles.size()) {
        const lab::Vec2 nearest = worldToScreen(particles[nearestIndex].position, view);
        drawCircleOutline(pixels, width, height, int(std::lround(nearest.x)), int(std::lround(nearest.y)), 6, kNearest);
    }
}

#if LAB_CHECKPOINT >= 1
void drawSpatialGrid(std::vector<std::uint32_t>& pixels, int width, int height, const lab::SpatialGridConfig& config, lab::GridDimensions dimensions, const WorldView& view) {
    for (int column = 0; column <= dimensions.columns; ++column) {
        const double worldX = std::min(config.bounds.maximum.x, config.bounds.minimum.x + double(column) * config.cellSize);
        const lab::Vec2 top = worldToScreen({worldX, config.bounds.maximum.y}, view);
        const lab::Vec2 bottom = worldToScreen({worldX, config.bounds.minimum.y}, view);
        drawLine(pixels, width, height, int(std::lround(top.x)), int(std::lround(top.y)), int(std::lround(bottom.x)), int(std::lround(bottom.y)), kGridLine);
    }
    for (int row = 0; row <= dimensions.rows; ++row) {
        const double worldY = std::min(config.bounds.maximum.y, config.bounds.minimum.y + double(row) * config.cellSize);
        const lab::Vec2 left = worldToScreen({config.bounds.minimum.x, worldY}, view);
        const lab::Vec2 right = worldToScreen({config.bounds.maximum.x, worldY}, view);
        drawLine(pixels, width, height, int(std::lround(left.x)), int(std::lround(left.y)), int(std::lround(right.x)), int(std::lround(right.y)), kGridLine);
    }
}
#endif

#if LAB_CHECKPOINT >= 3
void drawCandidateCells(std::vector<std::uint32_t>& pixels, int width, int height, const lab::SpatialGrid& grid, const lab::GridCellRange& range, const WorldView& view) {
    for (int row = range.minimumRow; row <= range.maximumRow; ++row) {
        for (int column = range.minimumColumn; column <= range.maximumColumn; ++column) {
            const double minimumX = grid.config.bounds.minimum.x + double(column) * grid.config.cellSize;
            const double maximumX = std::min(grid.config.bounds.maximum.x, minimumX + grid.config.cellSize);
            const double minimumY = grid.config.bounds.minimum.y + double(row) * grid.config.cellSize;
            const double maximumY = std::min(grid.config.bounds.maximum.y, minimumY + grid.config.cellSize);
            const lab::Vec2 topLeft = worldToScreen({minimumX, maximumY}, view);
            const lab::Vec2 bottomRight = worldToScreen({maximumX, minimumY}, view);
            fillRectangle(pixels, width, height, int(std::lround(topLeft.x)) + 1, int(std::lround(topLeft.y)) + 1, int(std::lround(bottomRight.x)) - 1, int(std::lround(bottomRight.y)) - 1, kCandidateCell);
        }
    }
}
#endif

#if LAB_CHECKPOINT >= 7
void drawCellSizeGraph(std::vector<std::uint32_t>& pixels, int width, int height, const std::vector<lab::CellSizeStudyRow>& rows) {
    const int left = 42;
    const int right = width - 26;
    const int top = height - 145;
    const int bottom = height - 24;
    drawLine(pixels, width, height, left, top, left, bottom, kPanel);
    drawLine(pixels, width, height, left, bottom, right, bottom, kPanel);
    if (rows.empty()) {
        return;
    }

    std::size_t maximumCandidates = 1;
    for (const lab::CellSizeStudyRow& row : rows) {
        maximumCandidates = std::max(maximumCandidates, row.metrics.totalCandidates);
    }
    const int slotWidth = std::max(1, (right - left) / int(rows.size()));
    for (std::size_t index = 0; index < rows.size(); ++index) {
        const lab::CellSizeStudyRow& row = rows[index];
        const int barHeight = int(std::lround(double(row.metrics.totalCandidates) / double(maximumCandidates) * double(bottom - top - 8)));
        const int centerX = left + slotWidth * int(index) + slotWidth / 2;
        for (int x = centerX - 14; x <= centerX + 14; ++x) {
            drawLine(pixels, width, height, x, bottom - 1, x, bottom - barHeight, kGraph);
        }
    }
}

void printCellSizeTable(const std::vector<lab::CellSizeStudyRow>& rows) {
    std::cout << "\nProject 28 cell-size study\n";
    std::cout << "cellSize\tgrid\tnonEmpty\tmaxBucket\tvisited/query\tcandidates/query\trebuild us\tquery us\tchecksum\n";
    for (const lab::CellSizeStudyRow& row : rows) {
        const double queryCount = double(std::max<std::size_t>(1U, row.metrics.queryCount));
        std::printf(
            "%.3f\t%dx%d\t%zu\t%zu\t%.2f\t%.2f\t%.2f\t%.3f\t%08x\n",
            row.cellSize,
            row.columns,
            row.rows,
            row.nonEmptyCells,
            row.maximumBucketSize,
            double(row.metrics.totalVisitedCells) / queryCount,
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
    // Setup: starter giữ nguyên baseline Project 27 để ta thay đúng candidate search.
    if (!SDL_Init(SDL_INIT_VIDEO)) {
        std::cerr << "SDL_Init failed: " << SDL_GetError() << '\n';
        return EXIT_FAILURE;
    }

    SDL_Window* window = SDL_CreateWindow("Project 28 | Spatial Grid", kInitialWidth, kInitialHeight, SDL_WINDOW_RESIZABLE);
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
    constexpr std::uint32_t seed = 0x00c0ffeeU;
    const std::vector<lab::Particle> particles = lab::makeParticleCloud(100'000, bounds, seed);
    const std::span<const lab::Particle> active{particles};
    lab::CircleQuery query{{0.5, 0.5}, 0.08};
    lab::BruteForceNeighborResult bruteForceResult{};
#if LAB_CHECKPOINT >= 1
    lab::SpatialGridConfig gridConfig{bounds, 0.05};
    lab::GridDimensions gridDimensions = lab::spatialGridDimensions(gridConfig);
#endif
#if LAB_CHECKPOINT >= 2
    lab::SpatialGrid grid = lab::buildSpatialGrid(active, gridConfig);
#endif
#if LAB_CHECKPOINT >= 4
    lab::GridQueryWorkspace gridResult{};
    gridResult.hitIndices.reserve(particles.size());
#endif
#if LAB_CHECKPOINT >= 5
    bool resultMatchesOracle = false;
#endif
#if LAB_CHECKPOINT >= 6
    lab::BatchMetrics gridBenchmark{};
    lab::BatchMetrics bruteForceBenchmark{};
#endif
#if LAB_CHECKPOINT >= 7
    std::vector<lab::CellSizeStudyRow> cellSizeRows{};
#endif
#if LAB_CHECKPOINT >= 8
    lab::GridPreset preset = lab::GridPreset::balanced;
    bool paused = true;
    bool autoProbe = false;
    bool dragging = false;
    double autoPhase = 0.0;
    std::uint64_t previousTicks = SDL_GetTicksNS();
#endif

    bool running = true;
    while (running) {
        // Event loop chỉ đổi input hoặc yêu cầu thí nghiệm; grid query vẫn là hàm thuần bên dưới.
        SDL_Event event{};
        while (SDL_PollEvent(&event)) {
            if (event.type == SDL_EVENT_QUIT) {
                running = false;
            } else if (event.type == SDL_EVENT_WINDOW_PIXEL_SIZE_CHANGED) {
                if (!resizeSurface(renderer, texture, pixels, width, height, event.window.data1, event.window.data2)) {
                    std::cerr << "Resize failed: " << SDL_GetError() << '\n';
                    running = false;
                }
            } else if (event.type == SDL_EVENT_KEY_DOWN && !event.key.repeat) {
                if (event.key.key == SDLK_ESCAPE) {
                    running = false;
                } else if (event.key.key == SDLK_UP) {
                    query.radius = std::min(0.3, query.radius + 0.01);
                } else if (event.key.key == SDLK_DOWN) {
                    query.radius = std::max(0.0, query.radius - 0.01);
                }
#if LAB_CHECKPOINT >= 6
                else if (event.key.key == SDLK_B) {
                    const std::vector<lab::CircleQuery> probes = lab::makeProbeQueries(24, bounds, query.radius, seed ^ 0x9e3779b9U);
                    gridBenchmark = lab::benchmarkSpatialGrid(grid, active, probes, 2, gridResult);
                    bruteForceBenchmark = lab::benchmarkBruteForceNeighbors(active, probes, 2, bruteForceResult);
                    std::printf(
                        "\nProject 28 benchmark: grid %.3f us/query, brute %.3f us/query, candidates %zu, scans %zu, checksum %08x/%08x\n",
                        gridBenchmark.elapsedMicroseconds / double(gridBenchmark.queryCount),
                        bruteForceBenchmark.elapsedMicroseconds / double(bruteForceBenchmark.queryCount),
                        gridBenchmark.totalCandidates,
                        bruteForceBenchmark.totalScanned,
                        unsigned(gridBenchmark.checksum),
                        unsigned(bruteForceBenchmark.checksum)
                    );
                }
#endif
#if LAB_CHECKPOINT >= 7
                else if (event.key.key == SDLK_S) {
                    const std::vector<lab::CircleQuery> probes = lab::makeProbeQueries(8, bounds, query.radius, seed ^ 0x280028U);
                    const std::array<double, 4> cellSizes{0.025, 0.05, 0.1, 0.2};
                    cellSizeRows = lab::makeCellSizeStudy(active, bounds, probes, cellSizes, 1);
                    printCellSizeTable(cellSizeRows);
                }
#endif
#if LAB_CHECKPOINT >= 8
                else if (event.key.key == SDLK_SPACE) {
                    paused = !paused;
                    autoProbe = true;
                } else if (event.key.key == SDLK_N) {
                    autoPhase += 0.08;
                    query.center = {0.5 + 0.33 * std::cos(autoPhase), 0.5 + 0.28 * std::sin(1.7 * autoPhase)};
                    autoProbe = true;
                    paused = true;
                } else if (event.key.key == SDLK_R) {
                    if (dragging) {
                        dragging = false;
                        SDL_CaptureMouse(false);
                    }
                    preset = lab::GridPreset::balanced;
                    gridConfig.cellSize = lab::cellSizeForPreset(preset);
                    gridDimensions = lab::spatialGridDimensions(gridConfig);
                    grid = lab::buildSpatialGrid(active, gridConfig);
                    query = {{0.5, 0.5}, 0.08};
                    gridBenchmark = {};
                    bruteForceBenchmark = {};
                    cellSizeRows.clear();
                    autoPhase = 0.0;
                    autoProbe = false;
                    paused = true;
                } else if (event.key.key == SDLK_1 || event.key.key == SDLK_2 || event.key.key == SDLK_3) {
                    if (event.key.key == SDLK_1) {
                        preset = lab::GridPreset::coarse;
                    } else if (event.key.key == SDLK_3) {
                        preset = lab::GridPreset::fine;
                    } else {
                        preset = lab::GridPreset::balanced;
                    }
                    gridConfig.cellSize = lab::cellSizeForPreset(preset);
                    gridDimensions = lab::spatialGridDimensions(gridConfig);
                    grid = lab::buildSpatialGrid(active, gridConfig);
                    gridBenchmark = {};
                    bruteForceBenchmark = {};
                    cellSizeRows.clear();
                }
#endif
            }
#if LAB_CHECKPOINT >= 8
            else if (event.type == SDL_EVENT_MOUSE_BUTTON_DOWN && event.button.button == SDL_BUTTON_LEFT) {
                dragging = true;
                SDL_CaptureMouse(true);
            } else if (event.type == SDL_EVENT_MOUSE_BUTTON_UP && event.button.button == SDL_BUTTON_LEFT) {
                dragging = false;
                SDL_CaptureMouse(false);
            }
#endif
            else if (event.type == SDL_EVENT_MOUSE_MOTION) {
#if LAB_CHECKPOINT >= 8
                if (!dragging) {
                    continue;
                }
#endif
                const WorldView view = makeWorldView(width, height);
                query.center = screenToWorld(event.motion.x, event.motion.y, view);
#if LAB_CHECKPOINT >= 8
                autoProbe = false;
#endif
            }
        }

#if LAB_CHECKPOINT >= 8
        const std::uint64_t currentTicks = SDL_GetTicksNS();
        const double frameSeconds = std::min(0.05, double(currentTicks - previousTicks) / 1'000'000'000.0);
        previousTicks = currentTicks;
        if (!paused && autoProbe) {
            autoPhase += frameSeconds * 0.8;
            query.center = {0.5 + 0.33 * std::cos(autoPhase), 0.5 + 0.28 * std::sin(1.7 * autoPhase)};
        }
#endif

        std::fill(pixels.begin(), pixels.end(), kBackground);
        const WorldView view = makeWorldView(width, height);
#if LAB_CHECKPOINT >= 3
        lab::GridCellRange cellRange{};
        if (lab::spatialGridQueryCellRange(grid, query, cellRange)) {
            drawCandidateCells(pixels, width, height, grid, cellRange, view);
        }
#endif
#if LAB_CHECKPOINT >= 1
        drawSpatialGrid(pixels, width, height, gridConfig, gridDimensions, view);
#endif
        drawParticles(pixels, width, height, active, view, kParticle);

#if LAB_CHECKPOINT >= 4
        lab::querySpatialGrid(grid, active, query, gridResult);
        drawHits(pixels, width, height, active, gridResult.hitIndices, gridResult.nearestIndex, view);
#if LAB_CHECKPOINT >= 5
        lab::queryNeighborsBruteForce(active, query, bruteForceResult);
        resultMatchesOracle = lab::spatialGridMatchesBruteForce(gridResult, bruteForceResult);
#endif
#else
        lab::queryNeighborsBruteForce(active, query, bruteForceResult);
        drawHits(pixels, width, height, active, bruteForceResult.hitIndices, bruteForceResult.nearestIndex, view);
#endif
        drawQueryCircle(pixels, width, height, query, view);
#if LAB_CHECKPOINT >= 7
        drawCellSizeGraph(pixels, width, height, cellSizeRows);
#endif

        if (!SDL_UpdateTexture(texture, nullptr, pixels.data(), width * int(sizeof(std::uint32_t)))) {
            std::cerr << "SDL_UpdateTexture failed: " << SDL_GetError() << '\n';
            running = false;
        }
        if (!SDL_RenderClear(renderer)) {
            std::cerr << "SDL_RenderClear failed: " << SDL_GetError() << '\n';
            running = false;
        }
        if (!SDL_RenderTexture(renderer, texture, nullptr, nullptr)) {
            std::cerr << "SDL_RenderTexture failed: " << SDL_GetError() << '\n';
            running = false;
        }
        SDL_RenderPresent(renderer);

#if LAB_CHECKPOINT >= 6
        double gridMicrosecondsPerQuery = 0.0;
        if (gridBenchmark.queryCount != 0) {
            gridMicrosecondsPerQuery = gridBenchmark.elapsedMicroseconds / double(gridBenchmark.queryCount);
        }
        double bruteMicrosecondsPerQuery = 0.0;
        if (bruteForceBenchmark.queryCount != 0) {
            bruteMicrosecondsPerQuery = bruteForceBenchmark.elapsedMicroseconds / double(bruteForceBenchmark.queryCount);
        }
        const char* matchLabel = "no";
        if (resultMatchesOracle) {
            matchLabel = "yes";
        }
        char title[560]{};
        std::snprintf(title, sizeof(title), "Project 28 | %dx%d cells | build %.2f us | visited %zu | candidates %zu / brute %zu | hits %zu | match %s | B grid %.2f us brute %.2f us | S study", grid.columns, grid.rows, grid.rebuildMicroseconds, gridResult.visitedCells, gridResult.candidatesChecked, particles.size(), gridResult.hitIndices.size(), matchLabel, gridMicrosecondsPerQuery, bruteMicrosecondsPerQuery);
        SDL_SetWindowTitle(window, title);
#elif LAB_CHECKPOINT >= 5
        const char* matchLabel = "MISMATCH";
        if (resultMatchesOracle) {
            matchLabel = "match";
        }
        char title[360]{};
        std::snprintf(title, sizeof(title), "Project 28 | candidates %zu / brute %zu | hits %zu | oracle %s", gridResult.candidatesChecked, particles.size(), gridResult.hitIndices.size(), matchLabel);
        SDL_SetWindowTitle(window, title);
#elif LAB_CHECKPOINT >= 4
        char title[320]{};
        std::snprintf(title, sizeof(title), "Project 28 | visited cells %zu | candidates %zu | hits %zu", gridResult.visitedCells, gridResult.candidatesChecked, gridResult.hitIndices.size());
        SDL_SetWindowTitle(window, title);
#elif LAB_CHECKPOINT >= 2
        char title[280]{};
        std::snprintf(title, sizeof(title), "Project 28 | grid %dx%d | build %.2f us | inserted %zu | non-empty %zu | max bucket %zu", grid.columns, grid.rows, grid.rebuildMicroseconds, grid.insertedCount, grid.nonEmptyCells, grid.maximumBucketSize);
        SDL_SetWindowTitle(window, title);
#elif LAB_CHECKPOINT >= 1
        char title[220]{};
        std::snprintf(title, sizeof(title), "Project 28 | cellSize %.3f | grid %dx%d", gridConfig.cellSize, gridDimensions.columns, gridDimensions.rows);
        SDL_SetWindowTitle(window, title);
#else
        char title[220]{};
        std::snprintf(title, sizeof(title), "Project 28 starter | brute-force scans %zu | hits %zu", bruteForceResult.scanned, bruteForceResult.hitIndices.size());
        SDL_SetWindowTitle(window, title);
#endif
    }

    // Cleanup: luôn trả pointer capture trước khi hủy SDL objects.
#if LAB_CHECKPOINT >= 8
    if (dragging) {
        SDL_CaptureMouse(false);
    }
#endif
    SDL_DestroyTexture(texture);
    SDL_DestroyRenderer(renderer);
    SDL_DestroyWindow(window);
    SDL_Quit();
    return EXIT_SUCCESS;
}
