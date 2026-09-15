#ifndef LAB_CHECKPOINT
#define LAB_CHECKPOINT 7
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

constexpr int kInitialWidth = 1100;
constexpr int kInitialHeight = 760;
constexpr std::uint32_t kBackground = 0x0b1020ffU;
constexpr std::uint32_t kGrid = 0x24324dffU;
constexpr std::uint32_t kPrimary = 0x61afefffU;
constexpr std::uint32_t kPerturbed = 0xe06c75ffU;
constexpr std::uint32_t kReference = 0x98c379ffU;
constexpr std::uint32_t kPivot = 0xf5f7ffffU;
constexpr std::uint32_t kPhysicalGraph = 0xc678ddffU;
constexpr std::uint32_t kNumericalGraph = 0xe5c07bffU;

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

#if LAB_CHECKPOINT == 0
void drawStarterPendulum(std::vector<std::uint32_t>& pixels, int width, int height, double theta1, double theta2, std::uint32_t color) {
    const double scale = std::min(double(width) * 0.16, double(height) * 0.22);
    const int pivotX = width / 2;
    const int pivotY = 90;
    const int firstX = pivotX + int(std::lround(scale * std::sin(theta1)));
    const int firstY = pivotY + int(std::lround(scale * std::cos(theta1)));
    const int secondX = firstX + int(std::lround(scale * std::sin(theta2)));
    const int secondY = firstY + int(std::lround(scale * std::cos(theta2)));
    drawLine(pixels, width, height, pivotX, pivotY, firstX, firstY, color);
    drawLine(pixels, width, height, firstX, firstY, secondX, secondY, color);
    fillCircle(pixels, width, height, firstX, firstY, 8, color);
    fillCircle(pixels, width, height, secondX, secondY, 11, color);
    fillCircle(pixels, width, height, pivotX, pivotY, 5, kPivot);
}
#endif

#if LAB_CHECKPOINT >= 1
struct WorldView {
    double scale{};
    double pivotX{};
    double pivotY{};
};

WorldView makeWorldView(int width, int height) {
    return {std::min(double(width) * 0.16, double(height) * 0.22), double(width) * 0.5, 88.0};
}

lab::Vec2 worldToScreen(lab::Vec2 point, const WorldView& view) {
    return {view.pivotX + point.x * view.scale, view.pivotY - point.y * view.scale};
}

void drawPendulum(std::vector<std::uint32_t>& pixels, int width, int height, const lab::DoublePendulumState& state, const lab::DoublePendulumParameters& parameters, const WorldView& view, std::uint32_t color) {
    const lab::DoublePendulumGeometry geometry = lab::pendulumGeometry(state, parameters);
    const lab::Vec2 pivot = worldToScreen(geometry.pivot, view);
    const lab::Vec2 bob1 = worldToScreen(geometry.bob1, view);
    const lab::Vec2 bob2 = worldToScreen(geometry.bob2, view);
    drawLine(pixels, width, height, int(std::lround(pivot.x)), int(std::lround(pivot.y)), int(std::lround(bob1.x)), int(std::lround(bob1.y)), color);
    drawLine(pixels, width, height, int(std::lround(bob1.x)), int(std::lround(bob1.y)), int(std::lround(bob2.x)), int(std::lround(bob2.y)), color);
    fillCircle(pixels, width, height, int(std::lround(bob1.x)), int(std::lround(bob1.y)), 8, color);
    fillCircle(pixels, width, height, int(std::lround(bob2.x)), int(std::lround(bob2.y)), 11, color);
    fillCircle(pixels, width, height, int(std::lround(pivot.x)), int(std::lround(pivot.y)), 5, kPivot);
}
#endif

#if LAB_CHECKPOINT >= 4
void drawTrail(std::vector<std::uint32_t>& pixels, int width, int height, const std::vector<lab::Vec2>& trail, const WorldView& view, std::uint32_t color) {
    if (trail.size() < 2) {
        return;
    }
    for (std::size_t index = 1; index < trail.size(); ++index) {
        const lab::Vec2 first = worldToScreen(trail[index - 1], view);
        const lab::Vec2 second = worldToScreen(trail[index], view);
        drawLine(pixels, width, height, int(std::lround(first.x)), int(std::lround(first.y)), int(std::lround(second.x)), int(std::lround(second.y)), color);
    }
}
#endif

#if LAB_CHECKPOINT >= 5
struct SeparationSample {
    double physical{};
    double numerical{};
};

void drawSeparationGraph(std::vector<std::uint32_t>& pixels, int width, int height, const std::vector<SeparationSample>& history) {
    const int top = height - 150;
    const int bottom = height - 24;
    const int left = 34;
    const int right = width - 24;
    drawLine(pixels, width, height, left, top, left, bottom, kGrid);
    drawLine(pixels, width, height, left, bottom, right, bottom, kGrid);
    if (history.size() < 2) {
        return;
    }
    const auto graphY = [top, bottom](double value) {
        const double logarithm = std::log10(std::max(value, 1e-12));
        const double normalized = std::clamp((logarithm + 12.0) / 13.0, 0.0, 1.0);
        return bottom - int(std::lround(normalized * double(bottom - top)));
    };
    for (std::size_t index = 1; index < history.size(); ++index) {
        const int previousX = left + int((index - 1) * std::size_t(right - left) / (history.size() - 1));
        const int currentX = left + int(index * std::size_t(right - left) / (history.size() - 1));
        drawLine(pixels, width, height, previousX, graphY(history[index - 1].physical), currentX, graphY(history[index].physical), kPhysicalGraph);
#if LAB_CHECKPOINT >= 6
        drawLine(pixels, width, height, previousX, graphY(history[index - 1].numerical), currentX, graphY(history[index].numerical), kNumericalGraph);
#endif
    }
}
#endif

#if LAB_CHECKPOINT >= 7
lab::Vec2 screenToWorld(double screenX, double screenY, const WorldView& view) {
    return {(screenX - view.pivotX) / view.scale, (view.pivotY - screenY) / view.scale};
}
#endif

} // namespace

int main() {
    // Setup: tạo một cửa sổ, renderer và CPU framebuffer dùng chung cho mọi checkpoint.
    if (!SDL_Init(SDL_INIT_VIDEO)) {
        std::cerr << "SDL_Init failed: " << SDL_GetError() << '\n';
        return EXIT_FAILURE;
    }

    SDL_Window* window = SDL_CreateWindow("Project 26 | Double Pendulum Chaos", kInitialWidth, kInitialHeight, SDL_WINDOW_RESIZABLE);
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
    std::uint64_t previousTicks = SDL_GetTicksNS();

#if LAB_CHECKPOINT >= 1
    lab::DoublePendulumParameters parameters{};
    lab::DoublePendulumState initialState{2.0, 0.0, 1.1, 0.0, 0.0};
#endif
#if LAB_CHECKPOINT >= 3
    bool paused = true;
    double fixedDeltaSeconds = 1.0 / 240.0;
    double accumulator = 0.0;
    double droppedTime = 0.0;
#endif
#if LAB_CHECKPOINT >= 4
    double perturbationRadians = 1e-4;
    std::vector<lab::Vec2> primaryTrail{};
    std::vector<lab::Vec2> perturbedTrail{};
#endif
#if LAB_CHECKPOINT >= 5
    std::vector<SeparationSample> separationHistory{};
#endif
#if LAB_CHECKPOINT >= 7
    lab::ChaosPreset preset = lab::ChaosPreset::chaotic;
    bool dragging = false;
#endif

#if LAB_CHECKPOINT >= 6
    lab::ChaosExperiment experiment = lab::makeChaosExperiment(initialState, perturbationRadians);
#elif LAB_CHECKPOINT >= 4
    lab::TwinPendulums twins = lab::makeTwinPendulums(initialState, perturbationRadians);
#elif LAB_CHECKPOINT >= 3
    lab::DoublePendulumState singleState = initialState;
#endif

#if LAB_CHECKPOINT >= 3
    const auto resetExperiment = [&]() {
#if LAB_CHECKPOINT >= 6
        experiment = lab::makeChaosExperiment(initialState, perturbationRadians);
#elif LAB_CHECKPOINT >= 4
        twins = lab::makeTwinPendulums(initialState, perturbationRadians);
#elif LAB_CHECKPOINT >= 3
        singleState = initialState;
#endif
        accumulator = 0.0;
        droppedTime = 0.0;
#if LAB_CHECKPOINT >= 4
        primaryTrail.clear();
        perturbedTrail.clear();
#endif
#if LAB_CHECKPOINT >= 5
        separationHistory.clear();
#endif
        paused = true;
    };
#endif

#if LAB_CHECKPOINT >= 3
    const auto runOneStep = [&]() {
#if LAB_CHECKPOINT >= 6
        lab::stepChaosExperiment(experiment, parameters, fixedDeltaSeconds);
        const lab::DoublePendulumState& primary = experiment.twins.primary;
        const lab::DoublePendulumState& perturbed = experiment.twins.perturbed;
#elif LAB_CHECKPOINT >= 4
        lab::stepTwinPendulums(twins, parameters, fixedDeltaSeconds);
        const lab::DoublePendulumState& primary = twins.primary;
        const lab::DoublePendulumState& perturbed = twins.perturbed;
#else
        singleState = lab::stepRk4(singleState, parameters, fixedDeltaSeconds);
#endif
#if LAB_CHECKPOINT >= 4
        const lab::DoublePendulumGeometry primaryGeometry = lab::pendulumGeometry(primary, parameters);
        const lab::DoublePendulumGeometry perturbedGeometry = lab::pendulumGeometry(perturbed, parameters);
        primaryTrail.push_back(primaryGeometry.bob2);
        perturbedTrail.push_back(perturbedGeometry.bob2);
        if (primaryTrail.size() > 500) {
            primaryTrail.erase(primaryTrail.begin());
            perturbedTrail.erase(perturbedTrail.begin());
        }
#endif
#if LAB_CHECKPOINT >= 5
#if LAB_CHECKPOINT >= 6
        const lab::ChaosMetrics metrics = lab::measureChaos(experiment, parameters);
        separationHistory.push_back({metrics.twins.phaseSeparation, metrics.numericalSeparation});
#else
        const lab::TwinMetrics metrics = lab::measureTwins(twins, parameters);
        separationHistory.push_back({metrics.phaseSeparation, 0.0});
#endif
        if (separationHistory.size() > 600) {
            separationHistory.erase(separationHistory.begin());
        }
#endif
    };
#endif

    // Event loop chỉ đổi input state; physics luôn tiến bằng fixedDeltaSeconds.
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
#if LAB_CHECKPOINT >= 3
                if (event.key.key == SDLK_SPACE) {
                    paused = !paused;
                } else if (event.key.key == SDLK_N) {
                    runOneStep();
                    paused = true;
                } else if (event.key.key == SDLK_R) {
                    resetExperiment();
                }
#endif
#if LAB_CHECKPOINT >= 4
                if (event.key.key == SDLK_UP) {
                    perturbationRadians = std::min(1e-1, perturbationRadians * 10.0);
                    resetExperiment();
                } else if (event.key.key == SDLK_DOWN) {
                    perturbationRadians = std::max(1e-8, perturbationRadians / 10.0);
                    resetExperiment();
                }
#endif
#if LAB_CHECKPOINT >= 6
                if (event.key.key == SDLK_LEFTBRACKET) {
                    fixedDeltaSeconds = std::max(1.0 / 960.0, fixedDeltaSeconds * 0.5);
                    resetExperiment();
                } else if (event.key.key == SDLK_RIGHTBRACKET) {
                    fixedDeltaSeconds = std::min(1.0 / 60.0, fixedDeltaSeconds * 2.0);
                    resetExperiment();
                }
#endif
#if LAB_CHECKPOINT >= 7
                if (event.key.key == SDLK_P) {
                    if (preset == lab::ChaosPreset::calm) {
                        preset = lab::ChaosPreset::chaotic;
                    } else if (preset == lab::ChaosPreset::chaotic) {
                        preset = lab::ChaosPreset::nearUpright;
                    } else {
                        preset = lab::ChaosPreset::calm;
                    }
                    initialState = lab::presetState(preset);
                    resetExperiment();
                } else if (event.key.key == SDLK_RETURN) {
                    const int steps = int(std::lround(30.0 / fixedDeltaSeconds));
                    for (int step = 0; step < steps; ++step) {
                        runOneStep();
                        if (!lab::measureChaos(experiment, parameters).finite) {
                            break;
                        }
                    }
                    paused = true;
                }
#endif
            }
#if LAB_CHECKPOINT >= 7
            else if (event.type == SDL_EVENT_MOUSE_BUTTON_DOWN && event.button.button == SDL_BUTTON_LEFT) {
                dragging = true;
                SDL_CaptureMouse(true);
            } else if (event.type == SDL_EVENT_MOUSE_MOTION && dragging) {
                const WorldView view = makeWorldView(width, height);
                const lab::Vec2 pointer = screenToWorld(event.motion.x, event.motion.y, view);
                const lab::DoublePendulumGeometry geometry = lab::pendulumGeometry(initialState, parameters);
                const lab::Vec2 delta = lab::subtract(pointer, geometry.bob1);
                if (lab::length(delta) > 0.1) {
                    initialState.theta2 = std::atan2(delta.x, -delta.y);
                    resetExperiment();
                }
            } else if (event.type == SDL_EVENT_MOUSE_BUTTON_UP && event.button.button == SDL_BUTTON_LEFT) {
                dragging = false;
                SDL_CaptureMouse(false);
            }
#endif
        }

        const std::uint64_t currentTicks = SDL_GetTicksNS();
        const double frameSeconds = double(currentTicks - previousTicks) / 1'000'000'000.0;
        previousTicks = currentTicks;
#if LAB_CHECKPOINT >= 3
        if (!paused) {
            const lab::FixedStepPlan plan = lab::planFixedSteps(accumulator, frameSeconds, fixedDeltaSeconds, 24, 0.1);
            accumulator = plan.remainder;
            droppedTime += plan.droppedTime;
            for (int step = 0; step < plan.steps; ++step) {
                runOneStep();
            }
        }
#else
        (void)frameSeconds;
#endif

        // Render đọc state đã hoàn tất, tuyệt đối không sửa trajectory trong lúc vẽ.
        std::fill(pixels.begin(), pixels.end(), kBackground);
#if LAB_CHECKPOINT == 0
        drawStarterPendulum(pixels, width, height, 2.0, 1.1, kPrimary);
        drawStarterPendulum(pixels, width, height, 2.0, 1.1001, kPerturbed);
#else
        const WorldView view = makeWorldView(width, height);
        drawLine(pixels, width, height, 24, int(std::lround(view.pivotY)), width - 24, int(std::lround(view.pivotY)), kGrid);
#if LAB_CHECKPOINT >= 6
        const lab::DoublePendulumState& primary = experiment.twins.primary;
        const lab::DoublePendulumState& perturbed = experiment.twins.perturbed;
#elif LAB_CHECKPOINT >= 4
        const lab::DoublePendulumState& primary = twins.primary;
        const lab::DoublePendulumState& perturbed = twins.perturbed;
#elif LAB_CHECKPOINT >= 3
        const lab::DoublePendulumState& primary = singleState;
#else
        const lab::DoublePendulumState& primary = initialState;
#endif
#if LAB_CHECKPOINT >= 4
        drawTrail(pixels, width, height, primaryTrail, view, kPrimary);
        drawTrail(pixels, width, height, perturbedTrail, view, kPerturbed);
#if LAB_CHECKPOINT >= 6
        drawPendulum(pixels, width, height, experiment.halfStepReference, parameters, view, kReference);
#endif
        drawPendulum(pixels, width, height, perturbed, parameters, view, kPerturbed);
#endif
        drawPendulum(pixels, width, height, primary, parameters, view, kPrimary);
#if LAB_CHECKPOINT >= 5
        drawSeparationGraph(pixels, width, height, separationHistory);
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

#if LAB_CHECKPOINT >= 6
        const lab::ChaosMetrics metrics = lab::measureChaos(experiment, parameters);
        char title[640]{};
        std::snprintf(title, sizeof(title), "Project 26 | Space pause | N step | R reset | P preset | Enter +30s | [ ] dt | arrows epsilon | t %.3f | dt %.6f | phase %.6e | numerical %.6e | bob %.5f m | lambda %.4f 1/s | drift %+.5f%% | dropped %.3f", experiment.twins.primary.elapsed, fixedDeltaSeconds, metrics.twins.phaseSeparation, metrics.numericalSeparation, metrics.twins.secondBobDistance, metrics.twins.finiteTimeExponent, 100.0 * metrics.twins.relativeEnergyDrift, droppedTime);
        SDL_SetWindowTitle(window, title);
#elif LAB_CHECKPOINT >= 5
        const lab::TwinMetrics metrics = lab::measureTwins(twins, parameters);
        char title[420]{};
        std::snprintf(title, sizeof(title), "Project 26 | t %.3f | phase %.6e | bob %.5f m | lambda %.4f 1/s | drift %+.5f%%", twins.primary.elapsed, metrics.phaseSeparation, metrics.secondBobDistance, metrics.finiteTimeExponent, 100.0 * metrics.relativeEnergyDrift);
        SDL_SetWindowTitle(window, title);
#elif LAB_CHECKPOINT >= 4
        char title[260]{};
        std::snprintf(title, sizeof(title), "Project 26 | Twin lockstep | t %.3f | steps %zu | epsilon %.1e rad", twins.primary.elapsed, twins.stepCount, perturbationRadians);
        SDL_SetWindowTitle(window, title);
#elif LAB_CHECKPOINT >= 3
        const double energy = lab::pendulumEnergy(singleState, parameters);
        char title[240]{};
        std::snprintf(title, sizeof(title), "Project 26 | RK4 fixed step | t %.3f | dt %.6f | energy %.6f J", singleState.elapsed, fixedDeltaSeconds, energy);
        SDL_SetWindowTitle(window, title);
#elif LAB_CHECKPOINT >= 2
        const lab::DoublePendulumDerivative derivative = lab::pendulumDerivative(initialState, parameters);
        char title[220]{};
        std::snprintf(title, sizeof(title), "Project 26 | alpha1 %.5f rad/s^2 | alpha2 %.5f rad/s^2", derivative.omega1Rate, derivative.omega2Rate);
        SDL_SetWindowTitle(window, title);
#endif
    }

    // Cleanup: thả tài nguyên SDL theo thứ tự ngược với lúc khởi tạo.
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
