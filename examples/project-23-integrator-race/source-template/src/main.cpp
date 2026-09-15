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

constexpr int kInitialWidth = 1000;
constexpr int kInitialHeight = 700;
constexpr std::uint32_t kBackground = 0x0b1020ffU;
constexpr std::uint32_t kPanel = 0x111a2cffU;
constexpr std::uint32_t kGrid = 0x24324dffU;
constexpr std::uint32_t kRail = 0x66738cffU;
constexpr std::uint32_t kExact = 0xf5f7ffffU;
constexpr std::uint32_t kEuler = 0xff7b72ffU;
constexpr std::uint32_t kVerlet = 0x53f0aeffU;
constexpr std::uint32_t kRk4 = 0xc792eaffU;

void putPixel(std::vector<std::uint32_t>& pixels, int width, int height, int x, int y, std::uint32_t color) {
    if (x < 0 || y < 0 || x >= width || y >= height) {
        return;
    }
    const std::size_t index = std::size_t(y) * std::size_t(width) + std::size_t(x);
    pixels[index] = color;
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

void fillRectangle(std::vector<std::uint32_t>& pixels, int width, int height, int left, int top, int right, int bottom, std::uint32_t color) {
    for (int y = top; y <= bottom; ++y) {
        for (int x = left; x <= right; ++x) {
            putPixel(pixels, width, height, x, y, color);
        }
    }
}

void drawRectangle(std::vector<std::uint32_t>& pixels, int width, int height, int left, int top, int right, int bottom, std::uint32_t color) {
    drawLine(pixels, width, height, left, top, right, top, color);
    drawLine(pixels, width, height, right, top, right, bottom, color);
    drawLine(pixels, width, height, right, bottom, left, bottom, color);
    drawLine(pixels, width, height, left, bottom, left, top, color);
}

void drawSpring(std::vector<std::uint32_t>& pixels, int width, int height, int wallX, int massX, int centerY, std::uint32_t color) {
    const int startX = wallX + 10;
    const int endX = massX - 17;
    if (endX <= startX) {
        drawLine(pixels, width, height, startX, centerY, endX, centerY, color);
        return;
    }
    int previousX = startX;
    int previousY = centerY;
    constexpr int segmentCount = 12;
    for (int segment = 1; segment <= segmentCount; ++segment) {
        const double alpha = double(segment) / double(segmentCount);
        const int currentX = int(std::lround(double(startX) + double(endX - startX) * alpha));
        int currentY = centerY;
        if (segment < segmentCount) {
            if (segment % 2 == 0) {
                currentY -= 8;
            } else {
                currentY += 8;
            }
        }
        drawLine(pixels, width, height, previousX, previousY, currentX, currentY, color);
        previousX = currentX;
        previousY = currentY;
    }
}

int laneY(int laneIndex, int height) {
    const int graphHeight = std::max(150, height / 3);
    const int raceHeight = height - graphHeight;
    return 88 + laneIndex * std::max(95, (raceHeight - 105) / 3);
}

double pixelsPerMeterForWidth(int width) {
    return std::max(45.0, std::min(105.0, (double(width) - 260.0) / 7.0));
}

int positionToPixel(double position, int width) {
    return int(std::lround(double(width) * 0.56 + position * pixelsPerMeterForWidth(width)));
}

double pixelToPosition(double pixelX, int width) {
    return (pixelX - double(width) * 0.56) / pixelsPerMeterForWidth(width);
}

void drawLane(std::vector<std::uint32_t>& pixels, int width, int height, int laneIndex, double numericalPosition, double exactPosition, std::uint32_t color, bool hasNumericalState) {
    const int centerY = laneY(laneIndex, height);
    const int wallX = 36;
    const int equilibriumX = positionToPixel(0.0, width);
    drawLine(pixels, width, height, 24, centerY + 24, width - 24, centerY + 24, kRail);
    drawLine(pixels, width, height, equilibriumX, centerY - 32, equilibriumX, centerY + 30, kGrid);
    fillRectangle(pixels, width, height, wallX, centerY - 32, wallX + 9, centerY + 25, kRail);

    const int springMassX = positionToPixel(numericalPosition, width);
    drawSpring(pixels, width, height, wallX + 9, springMassX, centerY, color);
    if (hasNumericalState) {
        fillRectangle(pixels, width, height, springMassX - 16, centerY - 16, springMassX + 16, centerY + 16, color);
    } else {
        drawRectangle(pixels, width, height, springMassX - 16, centerY - 16, springMassX + 16, centerY + 16, color);
    }

    const int exactX = positionToPixel(exactPosition, width);
    drawRectangle(pixels, width, height, exactX - 20, centerY - 20, exactX + 20, centerY + 20, kExact);
}

void drawStarterScene(std::vector<std::uint32_t>& pixels, int width, int height) {
    std::fill(pixels.begin(), pixels.end(), kBackground);
    for (int lane = 0; lane < 3; ++lane) {
        drawLane(pixels, width, height, lane, 2.5, 2.5, kRail, false);
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

#if LAB_CHECKPOINT >= 6
struct HistorySample {
    double time{};
    double exactPosition{};
    double eulerPosition{};
    double verletPosition{};
    double rk4Position{};
    double eulerEnergyDrift{};
    double verletEnergyDrift{};
    double rk4EnergyDrift{};
};

void drawHistoryLine(std::vector<std::uint32_t>& pixels, int width, int height, const std::vector<HistorySample>& history, int graphTop, double verticalScale, std::uint32_t color, int valueIndex) {
    if (history.size() < 2) {
        return;
    }
    const double firstTime = history.front().time;
    const double lastTime = history.back().time;
    const double timeSpan = std::max(1.0, lastTime - firstTime);
    const int graphLeft = 42;
    const int graphRight = width - 24;
    const int graphCenterY = graphTop + (height - graphTop) / 2;

    for (std::size_t index = 1; index < history.size(); ++index) {
        const HistorySample& previous = history[index - 1];
        const HistorySample& current = history[index];
        double previousValue = previous.exactPosition;
        double currentValue = current.exactPosition;
        if (valueIndex == 1) {
            previousValue = previous.eulerPosition;
            currentValue = current.eulerPosition;
        }
        if (valueIndex == 2) {
            previousValue = previous.verletPosition;
            currentValue = current.verletPosition;
        }
        if (valueIndex == 3) {
            previousValue = previous.rk4Position;
            currentValue = current.rk4Position;
        }
        if (valueIndex == 4) {
            previousValue = previous.eulerEnergyDrift;
            currentValue = current.eulerEnergyDrift;
        }
        if (valueIndex == 5) {
            previousValue = previous.verletEnergyDrift;
            currentValue = current.verletEnergyDrift;
        }
        if (valueIndex == 6) {
            previousValue = previous.rk4EnergyDrift;
            currentValue = current.rk4EnergyDrift;
        }
        const int x0 = int(std::lround(double(graphLeft) + (previous.time - firstTime) / timeSpan * double(graphRight - graphLeft)));
        const int x1 = int(std::lround(double(graphLeft) + (current.time - firstTime) / timeSpan * double(graphRight - graphLeft)));
        const int y0 = int(std::lround(double(graphCenterY) - previousValue * verticalScale));
        const int y1 = int(std::lround(double(graphCenterY) - currentValue * verticalScale));
        drawLine(pixels, width, height, x0, y0, x1, y1, color);
    }
}

void drawGraph(std::vector<std::uint32_t>& pixels, int width, int height, const std::vector<HistorySample>& history, bool showEnergy, double amplitude) {
    const int graphTop = std::max(405, height * 2 / 3);
    fillRectangle(pixels, width, height, 20, graphTop, width - 20, height - 20, kPanel);
    const int centerY = graphTop + (height - graphTop) / 2;
    drawLine(pixels, width, height, 32, centerY, width - 24, centerY, kGrid);
    if (showEnergy) {
        drawHistoryLine(pixels, width, height, history, graphTop, 120.0, kEuler, 4);
        drawHistoryLine(pixels, width, height, history, graphTop, 120.0, kVerlet, 5);
        drawHistoryLine(pixels, width, height, history, graphTop, 120.0, kRk4, 6);
        return;
    }
    const double positionScale = 0.4 * double(height - graphTop) / std::max(0.5, std::abs(amplitude));
    drawHistoryLine(pixels, width, height, history, graphTop, positionScale, kExact, 0);
    drawHistoryLine(pixels, width, height, history, graphTop, positionScale, kEuler, 1);
    drawHistoryLine(pixels, width, height, history, graphTop, positionScale, kVerlet, 2);
    drawHistoryLine(pixels, width, height, history, graphTop, positionScale, kRk4, 3);
}
#endif

} // namespace

int main() {
    // Khởi tạo SDL và framebuffer dùng chung cho starter, checkpoint và final.
    if (!SDL_Init(SDL_INIT_VIDEO)) {
        std::cerr << "SDL_Init failed: " << SDL_GetError() << '\n';
        return EXIT_FAILURE;
    }

    int width = kInitialWidth;
    int height = kInitialHeight;
    SDL_Window* window = SDL_CreateWindow("Project 23 - Integrator Race", width, height, SDL_WINDOW_RESIZABLE);
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

#if LAB_CHECKPOINT >= 1
    lab::OscillatorParameters parameters{1.0, 4.0};
    lab::OscillatorState initial{2.5, 0.0, 0.0};
    bool paused = true;
    bool draggingMass = false;
    std::uint64_t previousTicks = SDL_GetTicksNS();
    double previewElapsed = 0.0;
#endif
#if LAB_CHECKPOINT < 5
#if LAB_CHECKPOINT >= 2
    lab::OscillatorState eulerState = initial;
#endif
#if LAB_CHECKPOINT >= 3
    lab::OscillatorState verletState = initial;
#endif
#if LAB_CHECKPOINT >= 4
    lab::OscillatorState rk4State = initial;
#endif
#endif
#if LAB_CHECKPOINT >= 5
    lab::IntegratorRace race = lab::makeIntegratorRace(initial);
    double fixedDeltaSeconds = 1.0 / 30.0;
    double accumulator = 0.0;
    double droppedTime = 0.0;
    int substepsLastFrame = 0;
#endif
#if LAB_CHECKPOINT >= 6
    std::vector<HistorySample> history{};
    double lastHistoryTime = -1.0;
    bool showEnergy = false;
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
#if LAB_CHECKPOINT >= 1
                if (!event.key.repeat && event.key.key == SDLK_SPACE) {
                    paused = !paused;
                    previousTicks = SDL_GetTicksNS();
                }
                if (!event.key.repeat && event.key.key == SDLK_R) {
                    parameters = {1.0, 4.0};
                    initial = {2.5, 0.0, 0.0};
                    paused = true;
                    previewElapsed = 0.0;
#if LAB_CHECKPOINT < 5
#if LAB_CHECKPOINT >= 2
                    eulerState = initial;
#endif
#if LAB_CHECKPOINT >= 3
                    verletState = initial;
#endif
#if LAB_CHECKPOINT >= 4
                    rk4State = initial;
#endif
#endif
#if LAB_CHECKPOINT >= 5
                    race = lab::makeIntegratorRace(initial);
                    fixedDeltaSeconds = 1.0 / 30.0;
                    accumulator = 0.0;
                    droppedTime = 0.0;
#endif
#if LAB_CHECKPOINT >= 6
                    history.clear();
                    lastHistoryTime = -1.0;
                    showEnergy = false;
#endif
                }
#endif
#if LAB_CHECKPOINT >= 5
                if (!event.key.repeat && event.key.key == SDLK_N) {
                    lab::stepIntegratorRace(race, parameters, fixedDeltaSeconds);
                    previewElapsed = race.euler.state.elapsed;
                    paused = true;
                }
#endif
#if LAB_CHECKPOINT >= 6
                if (!event.key.repeat && event.key.key == SDLK_G) {
                    showEnergy = !showEnergy;
                }
#endif
#if LAB_CHECKPOINT >= 7
                if (!event.key.repeat && event.key.key == SDLK_LEFTBRACKET) {
                    fixedDeltaSeconds = std::min(1.0 / 15.0, fixedDeltaSeconds * 2.0);
                    race = lab::makeIntegratorRace(initial);
                    previewElapsed = 0.0;
                    accumulator = 0.0;
                    droppedTime = 0.0;
                    history.clear();
                    lastHistoryTime = -1.0;
                    paused = true;
                }
                if (!event.key.repeat && event.key.key == SDLK_RIGHTBRACKET) {
                    fixedDeltaSeconds = std::max(1.0 / 240.0, fixedDeltaSeconds * 0.5);
                    race = lab::makeIntegratorRace(initial);
                    previewElapsed = 0.0;
                    accumulator = 0.0;
                    droppedTime = 0.0;
                    history.clear();
                    lastHistoryTime = -1.0;
                    paused = true;
                }
                if (!event.key.repeat && event.key.key == SDLK_UP) {
                    parameters.stiffness = std::min(16.0, parameters.stiffness + 1.0);
                    race = lab::makeIntegratorRace(initial);
                    previewElapsed = 0.0;
                    accumulator = 0.0;
                    history.clear();
                    lastHistoryTime = -1.0;
                    paused = true;
                }
                if (!event.key.repeat && event.key.key == SDLK_DOWN) {
                    parameters.stiffness = std::max(1.0, parameters.stiffness - 1.0);
                    race = lab::makeIntegratorRace(initial);
                    previewElapsed = 0.0;
                    accumulator = 0.0;
                    history.clear();
                    lastHistoryTime = -1.0;
                    paused = true;
                }
                if (!event.key.repeat && event.key.key == SDLK_RETURN) {
                    for (int step = 0; step < 600; ++step) {
                        lab::stepIntegratorRace(race, parameters, fixedDeltaSeconds);
                    }
                    previewElapsed = race.euler.state.elapsed;
                    paused = true;
                }
#endif
            }
#if LAB_CHECKPOINT >= 1
            if (event.type == SDL_EVENT_MOUSE_BUTTON_DOWN && event.button.button == SDL_BUTTON_LEFT) {
                draggingMass = true;
                if (!SDL_CaptureMouse(true)) {
                    std::cerr << "SDL_CaptureMouse failed: " << SDL_GetError() << '\n';
                }
            }
            if (event.type == SDL_EVENT_MOUSE_MOTION && draggingMass) {
                initial.position = std::clamp(pixelToPosition(event.motion.x, width), -3.2, 3.2);
                initial.velocity = 0.0;
                initial.elapsed = 0.0;
                previewElapsed = 0.0;
                paused = true;
#if LAB_CHECKPOINT < 5
#if LAB_CHECKPOINT >= 2
                eulerState = initial;
#endif
#if LAB_CHECKPOINT >= 3
                verletState = initial;
#endif
#if LAB_CHECKPOINT >= 4
                rk4State = initial;
#endif
#endif
#if LAB_CHECKPOINT >= 5
                race = lab::makeIntegratorRace(initial);
                accumulator = 0.0;
                droppedTime = 0.0;
#endif
#if LAB_CHECKPOINT >= 6
                history.clear();
                lastHistoryTime = -1.0;
#endif
            }
            if (event.type == SDL_EVENT_MOUSE_BUTTON_UP && event.button.button == SDL_BUTTON_LEFT) {
                draggingMass = false;
                SDL_CaptureMouse(false);
            }
            if (event.type == SDL_EVENT_WINDOW_FOCUS_LOST) {
                draggingMass = false;
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

#if LAB_CHECKPOINT >= 1
        const std::uint64_t now = SDL_GetTicksNS();
        double frameSeconds = double(now - previousTicks) / 1'000'000'000.0;
        previousTicks = now;
        frameSeconds = std::clamp(frameSeconds, 0.0, 0.25);
        if (!paused) {
#if LAB_CHECKPOINT < 5
            previewElapsed += frameSeconds;
#if LAB_CHECKPOINT >= 2
            eulerState = lab::explicitEulerStep(eulerState, parameters, frameSeconds).state;
#endif
#if LAB_CHECKPOINT >= 3
            verletState = lab::velocityVerletStep(verletState, parameters, frameSeconds).state;
#endif
#if LAB_CHECKPOINT >= 4
            rk4State = lab::rungeKutta4Step(rk4State, parameters, frameSeconds).state;
#endif
#else
            const lab::FixedStepPlan plan = lab::planFixedSteps(accumulator, frameSeconds, fixedDeltaSeconds, 16, 0.1);
            accumulator = plan.remainder;
            droppedTime += plan.droppedTime;
            substepsLastFrame = plan.steps;
            for (int step = 0; step < plan.steps; ++step) {
                lab::stepIntegratorRace(race, parameters, fixedDeltaSeconds);
            }
            previewElapsed = race.euler.state.elapsed;
#endif
        }
#endif

        std::fill(pixels.begin(), pixels.end(), kBackground);
#if LAB_CHECKPOINT >= 1
        const lab::OscillatorState exact = lab::analyticOscillatorState(initial, parameters, previewElapsed);
#if LAB_CHECKPOINT < 2
        drawLane(pixels, width, height, 0, exact.position, exact.position, kRail, false);
        drawLane(pixels, width, height, 1, exact.position, exact.position, kRail, false);
        drawLane(pixels, width, height, 2, exact.position, exact.position, kRail, false);
#elif LAB_CHECKPOINT < 5
        drawLane(pixels, width, height, 0, eulerState.position, exact.position, kEuler, true);
#if LAB_CHECKPOINT >= 3
        drawLane(pixels, width, height, 1, verletState.position, exact.position, kVerlet, true);
#else
        drawLane(pixels, width, height, 1, initial.position, exact.position, kRail, false);
#endif
#if LAB_CHECKPOINT >= 4
        drawLane(pixels, width, height, 2, rk4State.position, exact.position, kRk4, true);
#else
        drawLane(pixels, width, height, 2, initial.position, exact.position, kRail, false);
#endif
#else
        drawLane(pixels, width, height, 0, race.euler.state.position, exact.position, kEuler, true);
        drawLane(pixels, width, height, 1, race.verlet.state.position, exact.position, kVerlet, true);
        drawLane(pixels, width, height, 2, race.rk4.state.position, exact.position, kRk4, true);
#endif
#if LAB_CHECKPOINT >= 6
        if (lastHistoryTime < 0.0 || previewElapsed - lastHistoryTime >= 0.04) {
            const lab::IntegratorMetrics eulerMetrics = lab::integratorMetrics(race.euler.state, initial, parameters);
            const lab::IntegratorMetrics verletMetrics = lab::integratorMetrics(race.verlet.state, initial, parameters);
            const lab::IntegratorMetrics rk4Metrics = lab::integratorMetrics(race.rk4.state, initial, parameters);
            history.push_back({previewElapsed, exact.position, race.euler.state.position, race.verlet.state.position, race.rk4.state.position, eulerMetrics.relativeEnergyDrift, verletMetrics.relativeEnergyDrift, rk4Metrics.relativeEnergyDrift});
            if (history.size() > 600) {
                history.erase(history.begin());
            }
            lastHistoryTime = previewElapsed;
        }
        drawGraph(pixels, width, height, history, showEnergy, initial.position);
#endif
#else
        drawStarterScene(pixels, width, height);
#endif

        char title[640]{};
#if LAB_CHECKPOINT >= 7
        const lab::IntegratorMetrics eulerMetrics = lab::integratorMetrics(race.euler.state, initial, parameters);
        const lab::IntegratorMetrics verletMetrics = lab::integratorMetrics(race.verlet.state, initial, parameters);
        const lab::IntegratorMetrics rk4Metrics = lab::integratorMetrics(race.rk4.state, initial, parameters);
        std::snprintf(title, sizeof(title), "Project 23 | Space pause | N step | Enter +600 steps | [ ] dt | arrows stiffness | G graph | t %.3f | dt %.5f | phase-space E %.4f V %.4f R %.4f | drift E %+.3f V %+.3f R %+.3f | eval %zu/%zu/%zu | dropped %.3f", previewElapsed, fixedDeltaSeconds, eulerMetrics.phaseSpaceError, verletMetrics.phaseSpaceError, rk4Metrics.phaseSpaceError, eulerMetrics.relativeEnergyDrift, verletMetrics.relativeEnergyDrift, rk4Metrics.relativeEnergyDrift, race.euler.forceEvaluations, race.verlet.forceEvaluations, race.rk4.forceEvaluations, droppedTime);
#elif LAB_CHECKPOINT >= 6
        const lab::IntegratorMetrics eulerMetrics = lab::integratorMetrics(race.euler.state, initial, parameters);
        const lab::IntegratorMetrics verletMetrics = lab::integratorMetrics(race.verlet.state, initial, parameters);
        const lab::IntegratorMetrics rk4Metrics = lab::integratorMetrics(race.rk4.state, initial, parameters);
        std::snprintf(title, sizeof(title), "Project 23 | G position/energy | phase-space E %.4f V %.4f R %.4f | drift E %+.3f V %+.3f R %+.3f", eulerMetrics.phaseSpaceError, verletMetrics.phaseSpaceError, rk4Metrics.phaseSpaceError, eulerMetrics.relativeEnergyDrift, verletMetrics.relativeEnergyDrift, rk4Metrics.relativeEnergyDrift);
#elif LAB_CHECKPOINT >= 5
        std::snprintf(title, sizeof(title), "Project 23 | lockstep %zu | t %.3f s | dt %.5f s | substeps %d | eval %zu/%zu/%zu", race.stepCount, previewElapsed, fixedDeltaSeconds, substepsLastFrame, race.euler.forceEvaluations, race.verlet.forceEvaluations, race.rk4.forceEvaluations);
#elif LAB_CHECKPOINT >= 4
        std::snprintf(title, sizeof(title), "Project 23 | Euler %.3f | Verlet %.3f | RK4 %.3f | exact %.3f", eulerState.position, verletState.position, rk4State.position, exact.position);
#elif LAB_CHECKPOINT >= 3
        std::snprintf(title, sizeof(title), "Project 23 | Euler %.3f | Verlet %.3f | exact %.3f", eulerState.position, verletState.position, exact.position);
#elif LAB_CHECKPOINT >= 2
        std::snprintf(title, sizeof(title), "Project 23 | Euler %.3f | exact %.3f | Space run", eulerState.position, exact.position);
#elif LAB_CHECKPOINT >= 1
        std::snprintf(title, sizeof(title), "Project 23 | drag initial mass | x0 %.2f m | omega %.3f rad/s | energy %.3f J", initial.position, lab::angularFrequency(parameters), lab::oscillatorEnergy(initial, parameters));
#else
        std::snprintf(title, sizeof(title), "Project 23 starter | Three SDL lanes are ready");
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

    // Giải phóng theo thứ tự ngược với lúc tạo tài nguyên SDL.
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
