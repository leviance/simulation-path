#ifndef LAB_CHECKPOINT
#define LAB_CHECKPOINT 7
#endif

#if LAB_CHECKPOINT >= 1
#include "lab.hpp"
#endif

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

void fillSquare(std::vector<std::uint32_t>& pixels, int width, int height, int centerX, int centerY, int halfSize, std::uint32_t color) {
    for (int y = centerY - halfSize; y <= centerY + halfSize; ++y) {
        for (int x = centerX - halfSize; x <= centerX + halfSize; ++x) {
            putPixel(pixels, width, height, x, y, color);
        }
    }
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
#if LAB_CHECKPOINT >= 6
    const double availableHeight = double(height - 190);
#else
    const double availableHeight = double(height - 50);
#endif
    const double size = std::max(80.0, std::min(double(width - 50), availableHeight));
    return {0.5 * (double(width) - size), 24.0, size};
}

#if LAB_CHECKPOINT == 0
void drawStarterCloud(std::vector<std::uint32_t>& pixels, int width, int height, const WorldView& view) {
    for (int index = 0; index < 2'000; ++index) {
        const int x = int(std::lround(view.left)) + (index * 73) % std::max(1, int(view.size));
        const int y = int(std::lround(view.top)) + (index * 151) % std::max(1, int(view.size));
        putPixel(pixels, width, height, x, y, kParticle);
    }
}
#endif

#if LAB_CHECKPOINT >= 1
lab::Vec2 worldToScreen(lab::Vec2 point, const WorldView& view) {
    return {view.left + point.x * view.size, view.top + (1.0 - point.y) * view.size};
}

void drawParticles(std::vector<std::uint32_t>& pixels, int width, int height, std::span<const lab::Particle> particles, const WorldView& view, std::uint32_t color) {
    for (const lab::Particle& particle : particles) {
        const lab::Vec2 screen = worldToScreen(particle.position, view);
        putPixel(pixels, width, height, int(std::lround(screen.x)), int(std::lround(screen.y)), color);
    }
}
#endif

#if LAB_CHECKPOINT >= 2
lab::Vec2 screenToWorld(double screenX, double screenY, const WorldView& view) {
    const double x = (screenX - view.left) / view.size;
    const double y = 1.0 - (screenY - view.top) / view.size;
    return {std::clamp(x, 0.0, 1.0), std::clamp(y, 0.0, 1.0)};
}

void drawQueryCircle(std::vector<std::uint32_t>& pixels, int width, int height, const lab::CircleQuery& query, const WorldView& view) {
    const lab::Vec2 center = worldToScreen(query.center, view);
    const int radius = int(std::lround(query.radius * view.size));
    drawCircleOutline(pixels, width, height, int(std::lround(center.x)), int(std::lround(center.y)), radius, kQuery);
}
#endif

#if LAB_CHECKPOINT >= 3
void drawHits(std::vector<std::uint32_t>& pixels, int width, int height, std::span<const lab::Particle> particles, std::span<const std::size_t> hitIndices, std::size_t nearestIndex, const WorldView& view) {
    for (const std::size_t index : hitIndices) {
        if (index >= particles.size()) {
            continue;
        }
        const lab::Vec2 screen = worldToScreen(particles[index].position, view);
        fillSquare(pixels, width, height, int(std::lround(screen.x)), int(std::lround(screen.y)), 1, kHit);
    }
    if (nearestIndex < particles.size()) {
        const lab::Vec2 nearest = worldToScreen(particles[nearestIndex].position, view);
        drawCircleOutline(pixels, width, height, int(std::lround(nearest.x)), int(std::lround(nearest.y)), 6, kNearest);
    }
}
#endif

#if LAB_CHECKPOINT >= 6
void drawScalingGraph(std::vector<std::uint32_t>& pixels, int width, int height, const std::vector<lab::ScalingRow>& rows) {
    const int left = 42;
    const int right = width - 26;
    const int top = height - 145;
    const int bottom = height - 24;
    drawLine(pixels, width, height, left, top, left, bottom, kPanel);
    drawLine(pixels, width, height, left, bottom, right, bottom, kPanel);
    if (rows.empty()) {
        return;
    }

    double maximumMicroseconds = 0.0;
    for (const lab::ScalingRow& row : rows) {
        double perQuery = 0.0;
        if (row.metrics.queryCount != 0) {
            perQuery = row.metrics.elapsedMicroseconds / double(row.metrics.queryCount);
        }
        maximumMicroseconds = std::max(maximumMicroseconds, perQuery);
    }
    maximumMicroseconds = std::max(maximumMicroseconds, 1.0);
    const int slotWidth = std::max(1, (right - left) / int(rows.size()));
    for (std::size_t index = 0; index < rows.size(); ++index) {
        const lab::ScalingRow& row = rows[index];
        double perQuery = 0.0;
        if (row.metrics.queryCount != 0) {
            perQuery = row.metrics.elapsedMicroseconds / double(row.metrics.queryCount);
        }
        const int barHeight = int(std::lround((perQuery / maximumMicroseconds) * double(bottom - top - 8)));
        const int centerX = left + slotWidth * int(index) + slotWidth / 2;
        for (int x = centerX - 14; x <= centerX + 14; ++x) {
            drawLine(pixels, width, height, x, bottom - 1, x, bottom - barHeight, kGraph);
        }
    }
}

void printScalingTable(const std::vector<lab::ScalingRow>& rows) {
    std::cout << "\nProject 27 scaling study\n";
    std::cout << "particles\tqueries\tscans\thits\tus/query\tchecksum\n";
    for (const lab::ScalingRow& row : rows) {
        const double microsecondsPerQuery = row.metrics.queryCount == 0U
            ? 0.0
            : row.metrics.elapsedMicroseconds / double(row.metrics.queryCount);
        std::printf(
            "%zu\t%zu\t%zu\t%zu\t%.3f\t%08x\n",
            row.particleCount,
            row.metrics.queryCount,
            row.metrics.totalScanned,
            row.metrics.totalHits,
            microsecondsPerQuery,
            unsigned(row.metrics.checksum)
        );
    }
    std::cout << std::flush;
}
#endif

} // namespace

int main() {
    // Setup: mọi checkpoint dùng cùng cửa sổ, streaming texture và CPU framebuffer.
    if (!SDL_Init(SDL_INIT_VIDEO)) {
        std::cerr << "SDL_Init failed: " << SDL_GetError() << '\n';
        return EXIT_FAILURE;
    }

    SDL_Window* window = SDL_CreateWindow("Project 27 | Brute-force Particle Query", kInitialWidth, kInitialHeight, SDL_WINDOW_RESIZABLE);
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

    bool running = true;
#if LAB_CHECKPOINT >= 1
    const lab::Bounds2D bounds{{0.0, 0.0}, {1.0, 1.0}};
    constexpr std::uint32_t seed = 0x00c0ffeeU;
    const std::vector<lab::Particle> particles = lab::makeParticleCloud(100'000, bounds, seed);
    std::size_t activeParticleCount = particles.size();
#endif
#if LAB_CHECKPOINT >= 2
    lab::CircleQuery query{{0.5, 0.5}, 0.08};
#endif
#if LAB_CHECKPOINT >= 4
    lab::QueryWorkspace workspace{};
    lab::reserveQueryWorkspace(workspace, particles.size());
#endif
#if LAB_CHECKPOINT >= 5
    lab::BatchMetrics lastBenchmark{};
#endif
#if LAB_CHECKPOINT >= 6
    std::vector<lab::ScalingRow> scalingRows{};
#endif
#if LAB_CHECKPOINT >= 7
    lab::ParticlePreset preset = lab::ParticlePreset::hundredThousand;
    bool paused = true;
    bool autoProbe = false;
    bool dragging = false;
    double autoPhase = 0.0;
    std::uint64_t previousTicks = SDL_GetTicksNS();
#endif

    // Event loop chỉ thay query hoặc lựa chọn workload; phép scan nằm ở một chỗ bên dưới.
    while (running) {
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
                }
#if LAB_CHECKPOINT >= 7
                if (event.key.key == SDLK_SPACE) {
                    paused = !paused;
                    autoProbe = true;
                } else if (event.key.key == SDLK_N) {
                    autoProbe = true;
                    autoPhase += 0.08;
                    query.center = {0.5 + 0.33 * std::cos(autoPhase), 0.5 + 0.28 * std::sin(1.7 * autoPhase)};
                    paused = true;
                } else if (event.key.key == SDLK_R) {
                    if (dragging) {
                        dragging = false;
                        SDL_CaptureMouse(false);
                    }
                    preset = lab::ParticlePreset::hundredThousand;
                    activeParticleCount = lab::particleCountForPreset(preset);
                    query = {{0.5, 0.5}, 0.08};
                    autoPhase = 0.0;
                    paused = true;
                    autoProbe = false;
                    lastBenchmark = {};
                    scalingRows.clear();
                } else if (event.key.key == SDLK_1) {
                    preset = lab::ParticlePreset::thousand;
                    activeParticleCount = lab::particleCountForPreset(preset);
                    lastBenchmark = {};
                } else if (event.key.key == SDLK_2) {
                    preset = lab::ParticlePreset::tenThousand;
                    activeParticleCount = lab::particleCountForPreset(preset);
                    lastBenchmark = {};
                } else if (event.key.key == SDLK_3) {
                    preset = lab::ParticlePreset::hundredThousand;
                    activeParticleCount = lab::particleCountForPreset(preset);
                    lastBenchmark = {};
                }
#endif
#if LAB_CHECKPOINT >= 2
                if (event.key.key == SDLK_UP) {
                    query.radius = std::min(0.35, query.radius + 0.01);
                } else if (event.key.key == SDLK_DOWN) {
                    query.radius = std::max(0.0, query.radius - 0.01);
                }
#if LAB_CHECKPOINT >= 5
                if (event.key.key == SDLK_UP || event.key.key == SDLK_DOWN) {
                    lastBenchmark = {};
                }
#endif
#if LAB_CHECKPOINT >= 6
                if (event.key.key == SDLK_UP || event.key.key == SDLK_DOWN) {
                    scalingRows.clear();
                }
#endif
#endif
#if LAB_CHECKPOINT >= 5
                if (event.key.key == SDLK_B) {
                    const std::span<const lab::Particle> active{particles.data(), activeParticleCount};
                    const std::vector<lab::CircleQuery> probes = lab::makeProbeQueries(32, bounds, query.radius, seed ^ 0x9e3779b9U);
                    lastBenchmark = lab::benchmarkBruteForce(active, probes, 2, workspace);
                    const double microsecondsPerQuery = lastBenchmark.elapsedMicroseconds / double(lastBenchmark.queryCount);
                    std::printf(
                        "\nProject 27 benchmark: N=%zu radius=%.3f queries=%zu scans=%zu hits=%zu us/query=%.3f checksum=%08x\n",
                        activeParticleCount,
                        query.radius,
                        lastBenchmark.queryCount,
                        lastBenchmark.totalScanned,
                        lastBenchmark.totalHits,
                        microsecondsPerQuery,
                        unsigned(lastBenchmark.checksum)
                    );
                }
#endif
#if LAB_CHECKPOINT >= 6
                if (event.key.key == SDLK_S) {
                    const std::array<std::size_t, 3> counts{1'000, 10'000, 100'000};
                    const std::vector<lab::CircleQuery> probes = lab::makeProbeQueries(32, bounds, query.radius, seed ^ 0x9e3779b9U);
                    scalingRows = lab::makeScalingStudy(particles, probes, counts, 1);
                    printScalingTable(scalingRows);
                }
#endif
            }
#if LAB_CHECKPOINT >= 7
            else if (event.type == SDL_EVENT_MOUSE_BUTTON_DOWN && event.button.button == SDL_BUTTON_LEFT) {
                dragging = true;
                SDL_CaptureMouse(true);
            } else if (event.type == SDL_EVENT_MOUSE_BUTTON_UP && event.button.button == SDL_BUTTON_LEFT) {
                dragging = false;
                SDL_CaptureMouse(false);
            }
#endif
#if LAB_CHECKPOINT >= 2
            else if (event.type == SDL_EVENT_MOUSE_MOTION) {
#if LAB_CHECKPOINT >= 7
                if (!dragging) {
                    continue;
                }
#endif
                const WorldView view = makeWorldView(width, height);
                query.center = screenToWorld(event.motion.x, event.motion.y, view);
#if LAB_CHECKPOINT >= 7
                autoProbe = false;
#endif
            }
#endif
        }

#if LAB_CHECKPOINT >= 7
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
#if LAB_CHECKPOINT == 0
        drawStarterCloud(pixels, width, height, view);
#else
        const std::span<const lab::Particle> active{particles.data(), activeParticleCount};
        drawParticles(pixels, width, height, active, view, kParticle);
#if LAB_CHECKPOINT >= 4
        lab::queryBruteForceSquared(active, query, workspace);
        drawHits(pixels, width, height, active, workspace.hitIndices, workspace.nearestIndex, view);
#elif LAB_CHECKPOINT >= 3
        const lab::BruteForceResult result = lab::queryBruteForce(active, query);
        drawHits(pixels, width, height, active, result.hitIndices, result.nearestIndex, view);
#endif
#if LAB_CHECKPOINT >= 2
        drawQueryCircle(pixels, width, height, query, view);
#endif
#if LAB_CHECKPOINT >= 6
        drawScalingGraph(pixels, width, height, scalingRows);
#endif
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

#if LAB_CHECKPOINT >= 5
        double microsecondsPerQuery = 0.0;
        if (lastBenchmark.queryCount != 0) {
            microsecondsPerQuery = lastBenchmark.elapsedMicroseconds / double(lastBenchmark.queryCount);
        }
        char title[520]{};
        std::snprintf(title, sizeof(title), "Project 27 | N %zu | scanned %zu | hits %zu | nearest %zu | B benchmark %.2f us/query | checksum %08x | S scaling | arrows radius %.3f", activeParticleCount, workspace.scanned, workspace.hitIndices.size(), workspace.nearestIndex, microsecondsPerQuery, unsigned(lastBenchmark.checksum), query.radius);
        SDL_SetWindowTitle(window, title);
#elif LAB_CHECKPOINT >= 4
        char title[320]{};
        std::snprintf(title, sizeof(title), "Project 27 | squared distance + reused buffer | N %zu | scanned %zu | hits %zu", activeParticleCount, workspace.scanned, workspace.hitIndices.size());
        SDL_SetWindowTitle(window, title);
#elif LAB_CHECKPOINT >= 3
        char title[280]{};
        std::snprintf(title, sizeof(title), "Project 27 | readable brute force | N %zu | scanned %zu | hits %zu", activeParticleCount, result.scanned, result.hitIndices.size());
        SDL_SetWindowTitle(window, title);
#elif LAB_CHECKPOINT >= 2
        char title[220]{};
        std::snprintf(title, sizeof(title), "Project 27 | query center %.3f %.3f | radius %.3f", query.center.x, query.center.y, query.radius);
        SDL_SetWindowTitle(window, title);
#elif LAB_CHECKPOINT >= 1
        char title[160]{};
        std::snprintf(title, sizeof(title), "Project 27 | deterministic cloud | N %zu", activeParticleCount);
        SDL_SetWindowTitle(window, title);
#endif
    }

    // Cleanup: nhả pointer capture trước rồi hủy tài nguyên SDL theo thứ tự ngược.
#if LAB_CHECKPOINT >= 7
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
