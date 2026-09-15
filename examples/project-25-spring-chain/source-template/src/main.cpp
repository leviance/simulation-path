#ifndef LAB_CHECKPOINT
#define LAB_CHECKPOINT 8
#endif

#if LAB_CHECKPOINT >= 1
#include "lab.hpp"
#endif

#include <SDL3/SDL.h>
#include <algorithm>
#include <cmath>
#include <cstdint>
#include <cstdio>
#include <cstdlib>
#include <iostream>
#include <vector>

namespace {

constexpr int kInitialWidth = 1080;
constexpr int kInitialHeight = 720;
constexpr std::uint32_t kBackground = 0x0b1020ffU;
constexpr std::uint32_t kGrid = 0x23304affU;
constexpr std::uint32_t kSpring = 0x7183a1ffU;
constexpr std::uint32_t kStretched = 0xe5c07bffU;
constexpr std::uint32_t kCompressed = 0x56b6c2ffU;
constexpr std::uint32_t kParticle = 0x98c379ffU;
constexpr std::uint32_t kAnchor = 0xc678ddffU;
constexpr std::uint32_t kForce = 0xe06c75ffU;
constexpr std::uint32_t kSelection = 0xf5f7ffffU;

void putPixel(std::vector<std::uint32_t>& pixels, int width, int height, int x, int y, std::uint32_t color) {
    if (x < 0 || y < 0 || x >= width || y >= height) {
        return;
    }
    pixels[std::size_t(y) * std::size_t(width) + std::size_t(x)] = color;
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

void fillCircle(std::vector<std::uint32_t>& pixels, int width, int height, int centerX, int centerY, int radius, std::uint32_t color) {
    for (int offsetY = -radius; offsetY <= radius; ++offsetY) {
        for (int offsetX = -radius; offsetX <= radius; ++offsetX) {
            if (offsetX * offsetX + offsetY * offsetY <= radius * radius) {
                putPixel(pixels, width, height, centerX + offsetX, centerY + offsetY, color);
            }
        }
    }
}

void fillRectangle(std::vector<std::uint32_t>& pixels, int width, int height, int left, int top, int right, int bottom, std::uint32_t color) {
    for (int y = top; y <= bottom; ++y) {
        for (int x = left; x <= right; ++x) {
            putPixel(pixels, width, height, x, y, color);
        }
    }
}

bool resizeSurface(SDL_Renderer* renderer, SDL_Texture*& texture, std::vector<std::uint32_t>& pixels, int& width, int& height, int newWidth, int newHeight) {
    if (newWidth <= 0 || newHeight <= 0) {
        return true;
    }
    SDL_Texture* newTexture = SDL_CreateTexture(renderer, SDL_PIXELFORMAT_RGBA8888, SDL_TEXTUREACCESS_STREAMING, newWidth, newHeight);
    if (!newTexture) {
        return false;
    }
    SDL_DestroyTexture(texture);
    texture = newTexture;
    width = newWidth;
    height = newHeight;
    pixels.assign(std::size_t(width) * std::size_t(height), kBackground);
    return true;
}

void drawStarterScene(std::vector<std::uint32_t>& pixels, int width, int height) {
    std::fill(pixels.begin(), pixels.end(), kBackground);
    const int centerX = width / 2;
    const int top = 80;
    const int spacing = std::max(22, (height - 160) / 17);
    fillRectangle(pixels, width, height, centerX - 24, top - 10, centerX + 24, top + 10, kAnchor);
    for (int index = 0; index < 18; ++index) {
        const int y = top + index * spacing;
        if (index > 0) {
            drawLine(pixels, width, height, centerX, y - spacing, centerX, y, kSpring);
        }
        fillCircle(pixels, width, height, centerX, y, 7, kParticle);
    }
}

#if LAB_CHECKPOINT >= 1
struct WorldView {
    double scale{};
    double centerX{};
    double centerY{};
};

WorldView makeWorldView(int width, int height) {
    const double scale = std::min((double(width) - 100.0) / 9.0, (double(height) - 80.0) / 9.0);
    return {std::max(1.0, scale), 0.5 * double(width), 0.5 * double(height)};
}

lab::Vec2 worldToScreen(lab::Vec2 point, const WorldView& view) {
    return {view.centerX + point.x * view.scale, view.centerY - point.y * view.scale};
}

lab::Vec2 screenToWorld(lab::Vec2 point, const WorldView& view) {
    return {(point.x - view.centerX) / view.scale, (view.centerY - point.y) / view.scale};
}

lab::SpringChain makeDefaultChain(double stiffness, double damping) {
    return lab::makeVerticalChain(18, {0.0, 3.6}, 0.42, 0.25, 0.10, stiffness, damping);
}

void drawGrid(std::vector<std::uint32_t>& pixels, int width, int height, const WorldView& view) {
    for (int coordinate = -4; coordinate <= 4; ++coordinate) {
        const lab::Vec2 verticalStart = worldToScreen({double(coordinate), -4.0}, view);
        const lab::Vec2 verticalEnd = worldToScreen({double(coordinate), 4.0}, view);
        drawLine(pixels, width, height, int(std::lround(verticalStart.x)), int(std::lround(verticalStart.y)), int(std::lround(verticalEnd.x)), int(std::lround(verticalEnd.y)), kGrid);
        const lab::Vec2 horizontalStart = worldToScreen({-4.0, double(coordinate)}, view);
        const lab::Vec2 horizontalEnd = worldToScreen({4.0, double(coordinate)}, view);
        drawLine(pixels, width, height, int(std::lround(horizontalStart.x)), int(std::lround(horizontalStart.y)), int(std::lround(horizontalEnd.x)), int(std::lround(horizontalEnd.y)), kGrid);
    }
}

std::uint32_t springColor(const lab::SpringChain& chain, const lab::Spring& spring) {
#if LAB_CHECKPOINT >= 2
    const lab::SpringSample sample = lab::sampleElasticSpring(chain, spring);
    if (sample.valid && sample.stretch > 0.015) {
        return kStretched;
    }
    if (sample.valid && sample.stretch < -0.015) {
        return kCompressed;
    }
#else
    static_cast<void>(chain);
    static_cast<void>(spring);
#endif
    return kSpring;
}

void drawChain(std::vector<std::uint32_t>& pixels, int width, int height, const lab::SpringChain& chain, const WorldView& view) {
    for (const lab::Spring& spring : chain.springs) {
        const lab::Vec2 first = worldToScreen(chain.particles[spring.first].position, view);
        const lab::Vec2 second = worldToScreen(chain.particles[spring.second].position, view);
        drawLine(pixels, width, height, int(std::lround(first.x)), int(std::lround(first.y)), int(std::lround(second.x)), int(std::lround(second.y)), springColor(chain, spring));
    }
    for (std::size_t index = 0; index < chain.particles.size(); ++index) {
        const lab::Particle& particle = chain.particles[index];
        const lab::Vec2 center = worldToScreen(particle.position, view);
        const int radius = std::max(4, int(std::lround(particle.radius * view.scale)));
        std::uint32_t color = kParticle;
        if (particle.inverseMass <= lab::kSpringEpsilon) {
            color = kAnchor;
            fillRectangle(pixels, width, height, int(std::lround(center.x)) - radius, int(std::lround(center.y)) - radius, int(std::lround(center.x)) + radius, int(std::lround(center.y)) + radius, color);
        } else {
            fillCircle(pixels, width, height, int(std::lround(center.x)), int(std::lround(center.y)), radius, color);
        }
    }
}
#endif

#if LAB_CHECKPOINT >= 2
void drawSpringPreview(std::vector<std::uint32_t>& pixels, int width, int height, const lab::SpringChain& chain, const WorldView& view) {
    if (chain.springs.empty()) {
        return;
    }
    const lab::Spring& spring = chain.springs[chain.springs.size() / 2];
    const lab::SpringSample sample = lab::sampleElasticSpring(chain, spring);
    if (!sample.valid) {
        return;
    }
    const lab::Vec2 startWorld = chain.particles[spring.first].position;
    const lab::Vec2 endWorld = lab::add(startWorld, lab::scale(sample.forceOnFirst, 0.012));
    const lab::Vec2 start = worldToScreen(startWorld, view);
    const lab::Vec2 end = worldToScreen(endWorld, view);
    drawLine(pixels, width, height, int(std::lround(start.x)), int(std::lround(start.y)), int(std::lround(end.x)), int(std::lround(end.y)), kForce);
}
#endif

#if LAB_CHECKPOINT == 3
void drawForceVectors(std::vector<std::uint32_t>& pixels, int width, int height, const lab::SpringChain& chain, const WorldView& view) {
    for (const lab::Particle& particle : chain.particles) {
        if (particle.inverseMass <= lab::kSpringEpsilon) {
            continue;
        }
        const lab::Vec2 endWorld = lab::add(particle.position, lab::scale(particle.force, 0.025));
        const lab::Vec2 start = worldToScreen(particle.position, view);
        const lab::Vec2 end = worldToScreen(endWorld, view);
        drawLine(pixels, width, height, int(std::lround(start.x)), int(std::lround(start.y)), int(std::lround(end.x)), int(std::lround(end.y)), kForce);
    }
}
#endif

#if LAB_CHECKPOINT >= 6
void drawDragSelection(std::vector<std::uint32_t>& pixels, int width, int height, const lab::SpringChain& chain, const lab::DragConstraint& drag, const WorldView& view) {
    if (!drag.active || drag.particleIndex >= chain.particles.size()) {
        return;
    }
    const lab::Vec2 center = worldToScreen(chain.particles[drag.particleIndex].position, view);
    const int radius = std::max(7, int(std::lround(chain.particles[drag.particleIndex].radius * view.scale)) + 4);
    drawLine(pixels, width, height, int(std::lround(center.x)) - radius, int(std::lround(center.y)), int(std::lround(center.x)) + radius, int(std::lround(center.y)), kSelection);
    drawLine(pixels, width, height, int(std::lround(center.x)), int(std::lround(center.y)) - radius, int(std::lround(center.x)), int(std::lround(center.y)) + radius, kSelection);
}
#endif

} // namespace

int main() {
    // Khởi tạo SDL và framebuffer trước khi tạo state mass–spring.
    if (!SDL_Init(SDL_INIT_VIDEO)) {
        std::cerr << "SDL_Init failed: " << SDL_GetError() << '\n';
        return EXIT_FAILURE;
    }
    int width = kInitialWidth;
    int height = kInitialHeight;
    SDL_Window* window = SDL_CreateWindow("Project 25 - Spring Chain", width, height, SDL_WINDOW_RESIZABLE);
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
    bool failed = false;

#if LAB_CHECKPOINT >= 7
    double stiffness = 120.0;
    double damping = 1.6;
#endif
#if LAB_CHECKPOINT >= 1
#if LAB_CHECKPOINT >= 7
    lab::SpringChain chain = makeDefaultChain(stiffness, damping);
#else
    lab::SpringChain chain = makeDefaultChain(120.0, 1.6);
#endif
#if LAB_CHECKPOINT >= 2
#if LAB_CHECKPOINT < 4
    chain.particles[9].position.x += 0.9;
#endif
#endif
#endif
#if LAB_CHECKPOINT >= 3
    const lab::Vec2 gravity{0.0, -9.81};
    bool gravityEnabled = true;
#endif
#if LAB_CHECKPOINT >= 4
    bool paused = true;
    bool singleStepRequested = false;
    double fixedDeltaSeconds = 1.0 / 240.0;
    double accumulator = 0.0;
    double droppedTime = 0.0;
    int substepsLastFrame = 0;
    std::uint64_t previousTicks = SDL_GetTicksNS();
#endif
#if LAB_CHECKPOINT >= 6
    lab::DragConstraint drag{};
    std::uint64_t previousDragTicks = SDL_GetTicksNS();
#endif
#if LAB_CHECKPOINT >= 8
    const lab::ChainMetrics initialMetrics = lab::measureChain(chain, gravity, gravityEnabled);
#endif

    while (running) {
        SDL_Event event{};
        while (SDL_PollEvent(&event)) {
            if (event.type == SDL_EVENT_QUIT) {
                running = false;
            }
            if (event.type == SDL_EVENT_KEY_DOWN) {
                if (event.key.key == SDLK_ESCAPE) {
                    running = false;
                }
#if LAB_CHECKPOINT >= 4
                if (!event.key.repeat && event.key.key == SDLK_SPACE) {
                    paused = !paused;
                    previousTicks = SDL_GetTicksNS();
                }
                if (!event.key.repeat && event.key.key == SDLK_N) {
                    singleStepRequested = true;
                    paused = true;
                }
                if (!event.key.repeat && event.key.key == SDLK_R) {
#if LAB_CHECKPOINT >= 7
                    chain = makeDefaultChain(stiffness, damping);
#else
                    chain = makeDefaultChain(120.0, 1.6);
#endif
                    accumulator = 0.0;
                    droppedTime = 0.0;
                    paused = true;
                }
#endif
#if LAB_CHECKPOINT >= 7
                if (!event.key.repeat && event.key.key == SDLK_LEFTBRACKET) {
                    fixedDeltaSeconds = std::min(1.0 / 30.0, fixedDeltaSeconds * 2.0);
                    chain = makeDefaultChain(stiffness, damping);
                    accumulator = 0.0;
                    paused = true;
                }
                if (!event.key.repeat && event.key.key == SDLK_RIGHTBRACKET) {
                    fixedDeltaSeconds = std::max(1.0 / 480.0, fixedDeltaSeconds * 0.5);
                    chain = makeDefaultChain(stiffness, damping);
                    accumulator = 0.0;
                    paused = true;
                }
                if (!event.key.repeat && event.key.key == SDLK_MINUS) {
                    stiffness = std::max(20.0, stiffness - 20.0);
                    chain = makeDefaultChain(stiffness, damping);
                    paused = true;
                }
                if (!event.key.repeat && event.key.key == SDLK_EQUALS) {
                    stiffness = std::min(600.0, stiffness + 20.0);
                    chain = makeDefaultChain(stiffness, damping);
                    paused = true;
                }
                if (!event.key.repeat && event.key.key == SDLK_D) {
                    if (damping < 0.1) {
                        damping = 0.8;
                    } else if (damping < 1.0) {
                        damping = 1.6;
                    } else {
                        damping = 0.0;
                    }
                    chain = makeDefaultChain(stiffness, damping);
                    paused = true;
                }
                if (!event.key.repeat && event.key.key == SDLK_G) {
                    gravityEnabled = !gravityEnabled;
                }
#endif
            }
#if LAB_CHECKPOINT >= 6
            if (event.type == SDL_EVENT_MOUSE_BUTTON_DOWN && event.button.button == SDL_BUTTON_LEFT) {
                const WorldView view = makeWorldView(width, height);
                const lab::Vec2 point = screenToWorld({event.button.x, event.button.y}, view);
                if (lab::beginDrag(chain, drag, point, 0.3)) {
                    previousDragTicks = SDL_GetTicksNS();
                    if (!SDL_CaptureMouse(true)) {
                        std::cerr << "SDL_CaptureMouse failed: " << SDL_GetError() << '\n';
                    }
                }
            }
            if (event.type == SDL_EVENT_MOUSE_MOTION && drag.active) {
                const WorldView view = makeWorldView(width, height);
                lab::Vec2 target = screenToWorld({event.motion.x, event.motion.y}, view);
                target.x = std::clamp(target.x, -4.0, 4.0);
                target.y = std::clamp(target.y, -4.0, 4.0);
                const std::uint64_t now = SDL_GetTicksNS();
                const double sampleSeconds = std::max(1e-4, double(now - previousDragTicks) / 1'000'000'000.0);
                previousDragTicks = now;
                lab::moveDrag(chain, drag, target, sampleSeconds, 6.0);
            }
            if (event.type == SDL_EVENT_MOUSE_BUTTON_UP && event.button.button == SDL_BUTTON_LEFT) {
                lab::endDrag(chain, drag);
                SDL_CaptureMouse(false);
            }
            if (event.type == SDL_EVENT_WINDOW_FOCUS_LOST) {
                lab::endDrag(chain, drag);
                SDL_CaptureMouse(false);
            }
#endif
            if (event.type == SDL_EVENT_WINDOW_PIXEL_SIZE_CHANGED) {
                if (!resizeSurface(renderer, texture, pixels, width, height, event.window.data1, event.window.data2)) {
                    std::cerr << "SDL_CreateTexture after resize failed: " << SDL_GetError() << '\n';
                    failed = true;
                    running = false;
                }
            }
        }

#if LAB_CHECKPOINT >= 4
        const std::uint64_t now = SDL_GetTicksNS();
        double frameSeconds = double(now - previousTicks) / 1'000'000'000.0;
        previousTicks = now;
        frameSeconds = std::clamp(frameSeconds, 0.0, 0.25);
        lab::FixedStepPlan plan{};
        if (!paused) {
            plan = lab::planFixedSteps(accumulator, frameSeconds, fixedDeltaSeconds, 24, 0.1);
            accumulator = plan.remainder;
            droppedTime += plan.droppedTime;
        }
        int stepsToRun = plan.steps;
        if (singleStepRequested) {
            stepsToRun = 1;
            singleStepRequested = false;
        }
        substepsLastFrame = stepsToRun;
        for (int step = 0; step < stepsToRun; ++step) {
#if LAB_CHECKPOINT >= 6
            lab::stepDampedChainWithDrag(chain, fixedDeltaSeconds, gravity, gravityEnabled, drag);
#elif LAB_CHECKPOINT >= 5
            lab::stepDampedChain(chain, fixedDeltaSeconds, gravity, gravityEnabled);
#else
            lab::stepElasticChain(chain, fixedDeltaSeconds, gravity, gravityEnabled);
#endif
        }
#endif

#if LAB_CHECKPOINT >= 1
#if LAB_CHECKPOINT == 3
        lab::accumulateElasticForces(chain, gravity, gravityEnabled);
#endif
        std::fill(pixels.begin(), pixels.end(), kBackground);
        const WorldView view = makeWorldView(width, height);
        drawGrid(pixels, width, height, view);
        drawChain(pixels, width, height, chain, view);
#if LAB_CHECKPOINT >= 2
        drawSpringPreview(pixels, width, height, chain, view);
#endif
#if LAB_CHECKPOINT == 3
        drawForceVectors(pixels, width, height, chain, view);
#endif
#if LAB_CHECKPOINT >= 6
        drawDragSelection(pixels, width, height, chain, drag, view);
#endif
#else
        drawStarterScene(pixels, width, height);
#endif

        char title[640]{};
#if LAB_CHECKPOINT >= 8
        const lab::ChainMetrics metrics = lab::measureChain(chain, gravity, gravityEnabled);
        const double energy = lab::totalMechanicalEnergy(metrics);
        const double initialEnergy = lab::totalMechanicalEnergy(initialMetrics);
        double energyChange = 0.0;
        if (std::abs(initialEnergy) > lab::kSpringEpsilon) {
            energyChange = (energy - initialEnergy) / std::abs(initialEnergy);
        }
        const double stability = lab::springStabilityIndex(stiffness, 0.25, fixedDeltaSeconds);
        const char* finiteLabel = "NO";
        if (metrics.finite) {
            finiteLabel = "yes";
        }
        std::snprintf(title, sizeof(title), "Project 25 | drag a mass | Space pause | N step | R reset | [ ] dt | - = stiffness | D damping | G gravity | dt %.5f | k %.0f | c %.1f | q %.3f | stretch %.4f | speed %.3f | energy d%+.2f%% | anchor %.2g | finite %s", fixedDeltaSeconds, stiffness, damping, stability, metrics.maximumStretch, metrics.maximumSpeed, 100.0 * energyChange, metrics.anchorError, finiteLabel);
#elif LAB_CHECKPOINT >= 7
        const lab::ChainMetrics metrics = lab::measureChain(chain, gravity, gravityEnabled);
        const double stability = lab::springStabilityIndex(stiffness, 0.25, fixedDeltaSeconds);
        const char* finiteLabel = "NO";
        if (metrics.finite) {
            finiteLabel = "yes";
        }
        std::snprintf(title, sizeof(title), "Project 25 | stability experiment | dt %.5f | stiffness %.0f | damping %.1f | q %.3f | max stretch %.4f | max speed %.3f | finite %s", fixedDeltaSeconds, stiffness, damping, stability, metrics.maximumStretch, metrics.maximumSpeed, finiteLabel);
#elif LAB_CHECKPOINT >= 6
        std::snprintf(title, sizeof(title), "Project 25 | drag and release a mass | particles %zu | dt %.5f | substeps %d", chain.particles.size(), fixedDeltaSeconds, substepsLastFrame);
#elif LAB_CHECKPOINT >= 5
        std::snprintf(title, sizeof(title), "Project 25 | axial damping | particles %zu | dt %.5f | substeps %d", chain.particles.size(), fixedDeltaSeconds, substepsLastFrame);
#elif LAB_CHECKPOINT >= 4
        std::snprintf(title, sizeof(title), "Project 25 | semi-implicit Euler | particles %zu | dt %.5f | substeps %d | dropped %.3f", chain.particles.size(), fixedDeltaSeconds, substepsLastFrame, droppedTime);
#elif LAB_CHECKPOINT >= 3
        std::snprintf(title, sizeof(title), "Project 25 | force accumulation | gravity %.2f | red arrows show net force", gravity.y);
#elif LAB_CHECKPOINT >= 2
        const lab::SpringSample sample = lab::sampleElasticSpring(chain, chain.springs[chain.springs.size() / 2]);
        std::snprintf(title, sizeof(title), "Project 25 | Hooke force | distance %.3f | rest %.3f | stretch %+.3f | force %.3f", sample.distance, chain.springs[chain.springs.size() / 2].restLength, sample.stretch, lab::length(sample.forceOnFirst));
#elif LAB_CHECKPOINT >= 1
        std::snprintf(title, sizeof(title), "Project 25 | static topology | %zu particles | %zu springs | top particle fixed", chain.particles.size(), chain.springs.size());
#else
        std::snprintf(title, sizeof(title), "Project 25 starter | SDL window and visible chain skeleton are ready");
#endif
        SDL_SetWindowTitle(window, title);

        if (!SDL_UpdateTexture(texture, nullptr, pixels.data(), width * int(sizeof(std::uint32_t)))) {
            std::cerr << "SDL_UpdateTexture failed: " << SDL_GetError() << '\n';
            failed = true;
            break;
        }
        SDL_SetRenderDrawColor(renderer, 0, 0, 0, 255);
        SDL_RenderClear(renderer);
        SDL_RenderTexture(renderer, texture, nullptr, nullptr);
        SDL_RenderPresent(renderer);
    }

    // Giải phóng tài nguyên SDL theo thứ tự ngược với lúc khởi tạo.
    SDL_CaptureMouse(false);
    SDL_DestroyTexture(texture);
    SDL_DestroyRenderer(renderer);
    SDL_DestroyWindow(window);
    SDL_Quit();
    if (failed) {
        return EXIT_FAILURE;
    }
    return EXIT_SUCCESS;
}
