#ifndef LAB_CHECKPOINT
#define LAB_CHECKPOINT 7
#endif

#include "framebuffer.hpp"
#if LAB_CHECKPOINT >= 1
#include "lennard_jones.hpp"
#endif
#if LAB_CHECKPOINT >= 3
#include "lennard_jones_ui.hpp"
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
#include <vector>

namespace {

constexpr int kInitialWidth = 1180;
constexpr int kInitialHeight = 720;
constexpr std::uint32_t kBackground = 0x0b1020ffU;
constexpr std::uint32_t kGrid = 0x26344fffU;
constexpr std::uint32_t kText = 0xd7deecffU;
constexpr std::uint32_t kAtomA = 0x61afefffU;
constexpr std::uint32_t kAtomB = 0xe06c75ffU;
constexpr std::uint32_t kPotential = 0xc678ddffU;
constexpr std::uint32_t kKinetic = 0xe5c07bffU;
constexpr std::uint32_t kTotal = 0x98c379ffU;
constexpr std::uint32_t kForce = 0x56b6c2ffU;
constexpr std::uint32_t kWarning = 0xe5c07bffU;

bool resizeSurface(SDL_Renderer* renderer, SDL_Texture*& texture, std::vector<std::uint32_t>& pixels, int& width, int& height, int newWidth, int newHeight) {
    if (newWidth <= 0 || newHeight <= 0) {
        return true;
    }
    SDL_Texture* replacement = SDL_CreateTexture(renderer, SDL_PIXELFORMAT_RGBA8888, SDL_TEXTUREACCESS_STREAMING, newWidth, newHeight);
    if (!replacement) {
        return false;
    }
    SDL_DestroyTexture(texture);
    texture = replacement;
    width = newWidth;
    height = newHeight;
    pixels.assign(std::size_t(width) * std::size_t(height), kBackground);
    return true;
}

void drawStarterScene(std::vector<std::uint32_t>& pixels, int width, int height) {
    framebuffer::clear(pixels, kBackground);
    const int centerY = height / 2;
    const int centerX = width / 2;
    framebuffer::drawLine(pixels, width, height, centerX - 120, centerY, centerX + 120, centerY, kGrid);
    framebuffer::fillCircle(pixels, width, height, centerX - 120, centerY, 22, kAtomA);
    framebuffer::fillCircle(pixels, width, height, centerX + 120, centerY, 22, kAtomB);
}

#if LAB_CHECKPOINT >= 1
struct WorldView {
    double scale{};
    double centerX{};
    double centerY{};
    int panelRight{};
};

WorldView makeWorldView(int width, int height) {
    const int panelRight = std::max(360, int(std::lround(double(width) * 0.57)));
    const double scale = std::max(
        1.0,
        std::min((double(panelRight) - 90.0) / 5.2, (double(height) - 100.0) / 3.4)
    );
    return {scale, 0.5 * double(panelRight), 0.5 * double(height), panelRight};
}

lj::Vec2 worldToScreen(lj::Vec2 point, const WorldView& view) {
    return {view.centerX + point.x * view.scale, view.centerY - point.y * view.scale};
}

lj::Vec2 screenToWorld(lj::Vec2 point, const WorldView& view) {
    return {(point.x - view.centerX) / view.scale, (view.centerY - point.y) / view.scale};
}

void drawWorldGrid(std::vector<std::uint32_t>& pixels, int width, int height, const WorldView& view) {
    for (int coordinate = -2; coordinate <= 2; ++coordinate) {
        const lj::Vec2 verticalStart = worldToScreen({double(coordinate), -1.5}, view);
        const lj::Vec2 verticalEnd = worldToScreen({double(coordinate), 1.5}, view);
        framebuffer::drawLine(pixels, width, height, int(std::lround(verticalStart.x)), int(std::lround(verticalStart.y)), int(std::lround(verticalEnd.x)), int(std::lround(verticalEnd.y)), kGrid);
        const lj::Vec2 horizontalStart = worldToScreen({-2.5, double(coordinate)}, view);
        const lj::Vec2 horizontalEnd = worldToScreen({2.5, double(coordinate)}, view);
        framebuffer::drawLine(pixels, width, height, int(std::lround(horizontalStart.x)), int(std::lround(horizontalStart.y)), int(std::lround(horizontalEnd.x)), int(std::lround(horizontalEnd.y)), kGrid);
    }
}

void drawAtom(std::vector<std::uint32_t>& pixels, int width, int height, lj::Vec2 position, const WorldView& view, std::uint32_t color) {
    const lj::Vec2 center = worldToScreen(position, view);
    framebuffer::fillCircle(pixels, width, height, int(std::lround(center.x)), int(std::lround(center.y)), 18, color);
}

void drawPairScene(
    std::vector<std::uint32_t>& pixels,
    int width,
    int height,
    const lj::PairState& state,
    const WorldView& view
#if LAB_CHECKPOINT >= 3
    ,
    const lj::LennardJonesParameters& parameters
#endif
) {
    drawWorldGrid(pixels, width, height, view);
    const lj::Vec2 screenA = worldToScreen(state.atomA.position, view);
    const lj::Vec2 screenB = worldToScreen(state.atomB.position, view);
    framebuffer::drawLine(pixels, width, height, int(std::lround(screenA.x)), int(std::lround(screenA.y)), int(std::lround(screenB.x)), int(std::lround(screenB.y)), kText);
    drawAtom(pixels, width, height, state.atomA.position, view, kAtomA);
    drawAtom(pixels, width, height, state.atomB.position, view, kAtomB);

#if LAB_CHECKPOINT >= 3
    const lj::PairInteraction interaction = lj::evaluatePair(state, parameters);
    if (interaction.valid) {
        const double visibleLength = std::clamp(
            12.0 * std::log1p(std::abs(interaction.potentialSlope)),
            0.0,
            92.0
        );
        const lj::Vec2 unitA = lj::scale(interaction.forceOnA, 1.0 / std::max(lj::length(interaction.forceOnA), lj::kDistanceEpsilon));
        const lj::Vec2 unitB = lj::scale(unitA, -1.0);
        framebuffer::drawArrow(pixels, width, height, int(std::lround(screenA.x)), int(std::lround(screenA.y)), int(std::lround(screenA.x + visibleLength * unitA.x)), int(std::lround(screenA.y - visibleLength * unitA.y)), kForce);
        framebuffer::drawArrow(pixels, width, height, int(std::lround(screenB.x)), int(std::lround(screenB.y)), int(std::lround(screenB.x + visibleLength * unitB.x)), int(std::lround(screenB.y - visibleLength * unitB.y)), kForce);
    }
#endif
}
#endif

#if LAB_CHECKPOINT >= 2
struct GraphRect {
    int left{};
    int top{};
    int right{};
    int bottom{};
};

GraphRect potentialGraphRect(int width, int height) {
    return {
        int(std::lround(double(width) * 0.61)),
            48,
            width - 34,
#if LAB_CHECKPOINT >= 3
            int(std::lround(double(height) * 0.29)),
#else
            int(std::lround(double(height) * 0.48)),
#endif
    };
}

int graphX(double ratio, double minimumRatio, double maximumRatio, const GraphRect& graph) {
    const double t = (ratio - minimumRatio) / (maximumRatio - minimumRatio);
    return graph.left + int(std::lround(t * double(graph.right - graph.left)));
}

int graphY(double value, double minimumValue, double maximumValue, const GraphRect& graph) {
    const double t = (value - minimumValue) / (maximumValue - minimumValue);
    return graph.bottom - int(std::lround(t * double(graph.bottom - graph.top)));
}

void drawPotentialGraph(
    std::vector<std::uint32_t>& pixels,
    int width,
    int height,
    const lj::PairState& state,
    const lj::LennardJonesParameters& parameters
) {
    const GraphRect graph = potentialGraphRect(width, height);
    framebuffer::drawRectangle(
        pixels,
        width,
        height,
        graph.left,
        graph.top,
        graph.right,
        graph.bottom,
        kGrid
    );
    constexpr double minimumRatio = 0.78;
    constexpr double maximumRatio = 2.60;
    const double minimumValue = -1.25 * parameters.epsilon;
    const double maximumValue = 2.50 * parameters.epsilon;
    const int zeroY = graphY(0.0, minimumValue, maximumValue, graph);
    framebuffer::drawLine(
        pixels,
        width,
        height,
        graph.left,
        zeroY,
        graph.right,
        zeroY,
        kGrid
    );

    const double r0Ratio = std::pow(2.0, 1.0 / 6.0);
    const int sigmaX = graphX(1.0, minimumRatio, maximumRatio, graph);
    const int equilibriumX = graphX(r0Ratio, minimumRatio, maximumRatio, graph);
    framebuffer::drawLine(
        pixels,
        width,
        height,
        sigmaX,
        graph.top,
        sigmaX,
        graph.bottom,
        kWarning
    );
    framebuffer::drawLine(
        pixels,
        width,
        height,
        equilibriumX,
        graph.top,
        equilibriumX,
        graph.bottom,
        kTotal
    );

    bool hasPrevious = false;
    int previousX = 0;
    int previousY = 0;
    for (int pixelX = graph.left; pixelX <= graph.right; ++pixelX) {
        const double t = double(pixelX - graph.left) / double(graph.right - graph.left);
        const double ratio = minimumRatio + t * (maximumRatio - minimumRatio);
        const lj::PotentialSample sample = lj::samplePotential(ratio * parameters.sigma, parameters);
        if (!sample.valid) {
            hasPrevious = false;
            continue;
        }
        const double clipped = std::clamp(sample.potential, minimumValue, maximumValue);
        const int pixelY = graphY(clipped, minimumValue, maximumValue, graph);
        if (hasPrevious) {
            framebuffer::drawLine(
                pixels,
                width,
                height,
                previousX,
                previousY,
                pixelX,
                pixelY,
                kPotential
            );
        }
        hasPrevious = true;
        previousX = pixelX;
        previousY = pixelY;
    }

    const double currentRatio = lj::pairDistance(state) / parameters.sigma;
    const lj::PotentialSample current = lj::samplePotential(lj::pairDistance(state), parameters);
    if (current.valid && currentRatio >= minimumRatio && currentRatio <= maximumRatio) {
        const int markerX = graphX(currentRatio, minimumRatio, maximumRatio, graph);
        const int markerY = graphY(
            std::clamp(current.potential, minimumValue, maximumValue),
            minimumValue,
            maximumValue,
            graph
        );
        framebuffer::fillCircle(pixels, width, height, markerX, markerY, 5, kText);
    }
}

#endif

#if LAB_CHECKPOINT >= 6
struct HistorySample {
    double potential{};
    double kinetic{};
    double total{};
};

void appendHistory(
    std::vector<HistorySample>& history,
    const lj::SystemMetrics& metrics,
    std::size_t maximumSamples
) {
    if (!metrics.valid) {
        return;
    }
    history.push_back({metrics.potential, metrics.kinetic, metrics.totalEnergy});
    if (history.size() > maximumSamples) {
        history.erase(history.begin(), history.begin() + std::ptrdiff_t(history.size() - maximumSamples));
    }
}

void drawEnergySeries(
    std::vector<std::uint32_t>& pixels,
    int width,
    int height,
    const GraphRect& graph,
    const std::vector<HistorySample>& history,
    double HistorySample::*member,
    double minimumValue,
    double maximumValue,
    std::uint32_t color
) {
    if (history.size() < 2) {
        return;
    }
    for (std::size_t index = 1; index < history.size(); ++index) {
        const double firstT = double(index - 1) / double(history.size() - 1);
        const double secondT = double(index) / double(history.size() - 1);
        const int x0 = graph.left + int(std::lround(firstT * double(graph.right - graph.left)));
        const int x1 = graph.left + int(std::lround(secondT * double(graph.right - graph.left)));
        const int y0 = graphY(history[index - 1].*member, minimumValue, maximumValue, graph);
        const int y1 = graphY(history[index].*member, minimumValue, maximumValue, graph);
        framebuffer::drawLine(pixels, width, height, x0, y0, x1, y1, color);
    }
}

void drawEnergyGraph(
    std::vector<std::uint32_t>& pixels,
    int width,
    int height,
    const std::vector<HistorySample>& history,
    double epsilon
) {
    const GraphRect graph{
        int(std::lround(double(width) * 0.61)),
        int(std::lround(double(height) * 0.56)),
        width - 34,
        height - 44,
    };
    framebuffer::drawRectangle(
        pixels,
        width,
        height,
        graph.left,
        graph.top,
        graph.right,
        graph.bottom,
        kGrid
    );
    const double minimumValue = -1.20 * epsilon;
    const double maximumValue = 1.20 * epsilon;
    drawEnergySeries(
        pixels,
        width,
        height,
        graph,
        history,
        &HistorySample::potential,
        minimumValue,
        maximumValue,
        kPotential
    );
    drawEnergySeries(
        pixels,
        width,
        height,
        graph,
        history,
        &HistorySample::kinetic,
        minimumValue,
        maximumValue,
        kKinetic
    );
    drawEnergySeries(
        pixels,
        width,
        height,
        graph,
        history,
        &HistorySample::total,
        minimumValue,
        maximumValue,
        kTotal
    );
}
#endif

} // namespace

int main() {
    // Mọi nhánh lỗi khởi tạo đều trả EXIT_FAILURE và dọn các resource đã tạo.
    // Khởi tạo SDL trước, rồi tạo window, renderer và texture; kiểm tra lỗi sau mỗi bước.
    if (!SDL_Init(SDL_INIT_VIDEO)) {
        std::cerr << "SDL_Init failed: " << SDL_GetError() << '\n';
        return EXIT_FAILURE;
    }

    int width = kInitialWidth;
    int height = kInitialHeight;
    SDL_Window* window = SDL_CreateWindow(
        "Project 41 - Lennard-Jones Pair Lab",
        width,
        height,
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

    std::vector<std::uint32_t> pixels(std::size_t(width) * std::size_t(height), kBackground);
    bool running = true;
    bool failed = false;

#if LAB_CHECKPOINT >= 1
    // State vật lý dùng world units; kích thước cửa sổ chỉ ảnh hưởng cách vẽ.
    lj::PairState state = lj::makeSymmetricPair(1.50);
#endif
#if LAB_CHECKPOINT >= 2
    lj::LennardJonesParameters parameters{};
#endif
#if LAB_CHECKPOINT >= 5
    bool paused = true;
    bool singleStepRequested = false;
    double fixedDeltaSeconds = 1.0 / 1000.0;
    double accumulator = 0.0;
    double droppedTime = 0.0;
    int substepsLastFrame = 0;
    std::uint64_t previousTicks = SDL_GetTicksNS();
#endif
#if LAB_CHECKPOINT >= 6
    constexpr std::size_t kMaximumHistorySamples = 600;
    std::vector<HistorySample> history{};
    double nextHistoryTime = 0.0;
    lj::SystemMetrics initialMetrics = lj::measureSystem(state, parameters);
    appendHistory(history, initialMetrics, kMaximumHistorySamples);
#endif
#if LAB_CHECKPOINT >= 7
    bool draggingAtom = false;
    lj::PairState experimentStart = state;
    lj::ValidationReport validationReport{};
    lj_ui::ValidationState validationState = lj_ui::ValidationState::notRun;
    std::size_t deltaPreset = 2;
    constexpr std::array<double, 4> kDeltaPresets{
        1.0 / 250.0,
        1.0 / 500.0,
        1.0 / 1000.0,
        1.0 / 2000.0,
    };
#endif

#if LAB_CHECKPOINT >= 5
    // Mọi thay đổi điều kiện ban đầu đều đi qua cùng một bước chuẩn bị lại.
    const auto prepareExperiment = [&]() {
        accumulator = 0.0;
        droppedTime = 0.0;
        substepsLastFrame = 0;
        paused = true;
        previousTicks = SDL_GetTicksNS();
#if LAB_CHECKPOINT >= 6
        history.clear();
        nextHistoryTime = 0.0;
        initialMetrics = lj::measureSystem(state, parameters);
        appendHistory(history, initialMetrics, kMaximumHistorySamples);
#endif
#if LAB_CHECKPOINT >= 7
        validationReport = {};
        validationState = lj_ui::ValidationState::notRun;
#endif
    };

    const auto resetExperiment = [&](double separation) {
        state = lj::makeSymmetricPair(separation, state.atomA.mass);
#if LAB_CHECKPOINT >= 7
        experimentStart = state;
#endif
        prepareExperiment();
    };
#if LAB_CHECKPOINT >= 7
    const auto restartExperiment = [&]() {
        state = experimentStart;
        prepareExperiment();
    };
#endif
#endif

    while (running) {
        // Xử lý hết input đang chờ trước khi chạy các bước vật lý của frame mới.
        SDL_Event event{};
        while (SDL_PollEvent(&event)) {
            if (event.type == SDL_EVENT_QUIT) {
                running = false;
            }
            if (event.type == SDL_EVENT_WINDOW_PIXEL_SIZE_CHANGED) {
                if (!resizeSurface(
                        renderer,
                        texture,
                        pixels,
                        width,
                        height,
                        event.window.data1,
                        event.window.data2
                    )) {
                    std::cerr << "Resize failed: " << SDL_GetError() << '\n';
                    failed = true;
                    running = false;
                }
            }
            if (event.type == SDL_EVENT_KEY_DOWN && !event.key.repeat) {
                if (event.key.key == SDLK_ESCAPE) {
                    running = false;
                }
#if LAB_CHECKPOINT >= 5
                if (event.key.key == SDLK_SPACE) {
                    paused = !paused;
                    accumulator = 0.0;
                    previousTicks = SDL_GetTicksNS();
                }
                if (event.key.key == SDLK_N && paused) {
                    singleStepRequested = true;
                }
#endif
#if LAB_CHECKPOINT >= 7
                if (event.key.key == SDLK_R) {
                    parameters = {};
                    state.atomA.mass = 1.0;
                    state.atomB.mass = 1.0;
                    deltaPreset = 2;
                    fixedDeltaSeconds = kDeltaPresets[deltaPreset];
                    resetExperiment(1.50 * parameters.sigma);
                }
                if (event.key.key == SDLK_1) {
                    resetExperiment(0.95 * parameters.sigma);
                }
                if (event.key.key == SDLK_2) {
                    resetExperiment(lj::equilibriumDistance(parameters));
                }
                if (event.key.key == SDLK_3) {
                    resetExperiment(1.50 * parameters.sigma);
                }
                if (event.key.key == SDLK_LEFTBRACKET && deltaPreset > 0) {
                    --deltaPreset;
                    fixedDeltaSeconds = kDeltaPresets[deltaPreset];
                    restartExperiment();
                }
                if (event.key.key == SDLK_RIGHTBRACKET && deltaPreset + 1 < kDeltaPresets.size()) {
                    ++deltaPreset;
                    fixedDeltaSeconds = kDeltaPresets[deltaPreset];
                    restartExperiment();
                }
                if (event.key.key == SDLK_E) {
                    if (parameters.epsilon < 0.75) {
                        parameters.epsilon = 1.0;
                    } else if (parameters.epsilon < 1.5) {
                        parameters.epsilon = 2.0;
                    } else {
                        parameters.epsilon = 0.5;
                    }
                    resetExperiment(1.50 * parameters.sigma);
                }
                if (event.key.key == SDLK_S) {
                    if (parameters.sigma < 0.9) {
                        parameters.sigma = 1.0;
                    } else if (parameters.sigma < 1.1) {
                        parameters.sigma = 1.2;
                    } else {
                        parameters.sigma = 0.8;
                    }
                    resetExperiment(1.50 * parameters.sigma);
                }
                if (event.key.key == SDLK_M) {
                    double mass = 0.5;
                    if (state.atomA.mass < 0.75) {
                        mass = 1.0;
                    } else if (state.atomA.mass < 1.5) {
                        mass = 2.0;
                    }
                    state.atomA.mass = mass;
                    state.atomB.mass = mass;
                    resetExperiment(lj::pairDistance(state));
                }
                if (event.key.key == SDLK_V) {
                    validationReport = lj::validateModel(parameters, state.atomA.mass);
                    if (validationReport.passed()) {
                        validationState = lj_ui::ValidationState::passed;
                    } else {
                        validationState = lj_ui::ValidationState::failed;
                    }
                    lj_ui::printValidationReport(validationReport);
                    const lj::ExperimentReport experiment = lj::assessExperiment(
                        experimentStart, parameters, fixedDeltaSeconds
                    );
                    std::cout << "Selected initial condition: dt=" << fixedDeltaSeconds
                                << ", steps=" << experiment.completedSteps
                                << ", max |dE/E0|=" << 100.0 * experiment.maximumEnergyDrift << "%\n";
                    if (!experiment.valid || experiment.maximumEnergyDrift >= 0.002) {
                        std::cout << "Selected experiment needs a smaller dt or safer initial separation.\n";
                    }
                }
#endif
            }

#if LAB_CHECKPOINT >= 7
            if (event.type == SDL_EVENT_MOUSE_BUTTON_DOWN && event.button.button == SDL_BUTTON_LEFT) {
                const WorldView view = makeWorldView(width, height);
                const lj::Vec2 atomScreen = worldToScreen(state.atomB.position, view);
                const double hitDistance = std::hypot(
                    double(event.button.x) - atomScreen.x,
                    double(event.button.y) - atomScreen.y
                );
                if (hitDistance <= 28.0) {
                    draggingAtom = true;
                    paused = true;
                    SDL_CaptureMouse(true);
                }
            }
            if (event.type == SDL_EVENT_MOUSE_MOTION && draggingAtom) {
                const WorldView view = makeWorldView(width, height);
                const lj::Vec2 pointer = screenToWorld({event.motion.x, event.motion.y}, view);
                const double pointerLength = lj::length(pointer);
                // Con trỏ tại gốc không có hướng: dùng hướng hợp lệ của cặp trước đó.
                const lj::Vec2 previousDelta = lj::subtract(state.atomB.position, state.atomA.position);
                lj::Vec2 direction = lj::scale(previousDelta, 1.0 / lj::length(previousDelta));
                if (pointerLength > lj::kDistanceEpsilon) {
                    direction = lj::scale(pointer, 1.0 / pointerLength);
                }
                const double separation = std::clamp(
                    2.0 * pointerLength,
                    0.82 * parameters.sigma,
                    2.80 * parameters.sigma
                );
                state.atomA.position = lj::scale(direction, -0.5 * separation);
                state.atomB.position = lj::scale(direction, 0.5 * separation);
                state.atomA.velocity = {};
                state.atomB.velocity = {};
                state.elapsed = 0.0;
                experimentStart = state;
                prepareExperiment();
            }
            if (
                (event.type == SDL_EVENT_MOUSE_BUTTON_UP && event.button.button == SDL_BUTTON_LEFT) ||
                event.type == SDL_EVENT_WINDOW_FOCUS_LOST
            ) {
                draggingAtom = false;
                SDL_CaptureMouse(false);
            }
#endif
        }

#if LAB_CHECKPOINT >= 5
        // Render time chỉ nạp accumulator; solver luôn nhận fixedDeltaSeconds.
        const std::uint64_t now = SDL_GetTicksNS();
        const double frameSeconds = double(now - previousTicks) / 1'000'000'000.0;
        previousTicks = now;
        substepsLastFrame = 0;
        if (singleStepRequested) {
            if (!lj::velocityVerletStep(state, parameters, fixedDeltaSeconds)) {
                failed = true;
                running = false;
            } else {
                substepsLastFrame = 1;
            }
            singleStepRequested = false;
        } else if (!paused) {
            const lj::FixedStepPlan plan = lj::planFixedSteps(
                accumulator,
                frameSeconds,
                fixedDeltaSeconds,
                32,
                0.05
            );
            accumulator = plan.remainder;
            droppedTime += plan.droppedTime;
            for (int step = 0; step < plan.steps; ++step) {
                if (!lj::velocityVerletStep(state, parameters, fixedDeltaSeconds)) {
                    std::cerr << "Velocity Verlet rejected a non-finite pair state.\n";
                    failed = true;
                    running = false;
                    break;
                }
                ++substepsLastFrame;
            }
        } else {
            accumulator = 0.0;
        }
#endif

#if LAB_CHECKPOINT >= 6
        const lj::SystemMetrics metrics = lj::measureSystem(state, parameters);
        if (metrics.valid && state.elapsed + lj::kDistanceEpsilon >= nextHistoryTime) {
            appendHistory(history, metrics, kMaximumHistorySamples);
            nextHistoryTime = state.elapsed + 0.02;
        }
#endif

        // Vẽ hoàn toàn từ state vừa được cập nhật, sau đó present đúng một lần.
        framebuffer::clear(pixels, kBackground);
#if LAB_CHECKPOINT >= 1
        const WorldView view = makeWorldView(width, height);
        drawPairScene(
            pixels,
            width,
            height,
            state,
            view
#if LAB_CHECKPOINT >= 3
            ,
            parameters
#endif
        );
#else
        drawStarterScene(pixels, width, height);
#endif
#if LAB_CHECKPOINT >= 2
        drawPotentialGraph(pixels, width, height, state, parameters);
#endif
#if LAB_CHECKPOINT >= 3
        lj_ui::drawPotentialSlopeGraph(pixels, width, height, state, parameters);
#endif
#if LAB_CHECKPOINT >= 6
        drawEnergyGraph(pixels, width, height, history, parameters.epsilon);
#endif

        char title[512]{};
#if LAB_CHECKPOINT >= 7
        const lj::PairInteraction interaction = lj::evaluatePair(state, parameters);
        double drift = 0.0;
        if (metrics.valid && initialMetrics.valid) {
            drift = lj::relativeEnergyDrift(metrics.totalEnergy, initialMetrics.totalEnergy);
        }
        double distanceRatio = 0.0;
        double potential = 0.0;
        double potentialSlope = 0.0;
        double totalEnergy = 0.0;
        double momentumLength = 0.0;
        double centerDrift = 0.0;
        if (interaction.valid) {
            distanceRatio = interaction.distance / parameters.sigma;
            potential = interaction.potential;
            potentialSlope = interaction.potentialSlope;
        }
        if (metrics.valid) {
            totalEnergy = metrics.totalEnergy;
            momentumLength = lj::length(metrics.momentum);
            centerDrift = lj::length(lj::subtract(metrics.center, initialMetrics.center));
        }
        const char* runStatus = "RUNNING";
        if (paused) {
            runStatus = "PAUSED";
        }
        const char* validationStatus = lj_ui::validationStatusText(
            validationState,
            validationReport
        );
        std::snprintf(
            title,
            sizeof(title),
            "Project 41 | Space pause | N step | 1-3 distance | [ ] dt | E/S/M parameters | V validate | r/sigma %.4f | U %+.5f | dU/dr %+.5f | E %+.5f | drift %+.4f%% | |p| %.3e | |COM-COM0| %.3e | dt %.6f | %s | %s",
            distanceRatio,
            potential,
            potentialSlope,
            totalEnergy,
            100.0 * drift,
            momentumLength,
            centerDrift,
            fixedDeltaSeconds,
            runStatus,
            validationStatus
        );
#elif LAB_CHECKPOINT >= 6
        double drift = 0.0;
        if (metrics.valid && initialMetrics.valid) {
            drift = lj::relativeEnergyDrift(metrics.totalEnergy, initialMetrics.totalEnergy);
        }
        std::snprintf(
            title,
            sizeof(title),
            "Project 41 checkpoint 6 | r %.4f | potential %+.5f | kinetic %.5f | total %+.5f | drift %+.4f%% | history %zu",
            metrics.distance,
            metrics.potential,
            metrics.kinetic,
            metrics.totalEnergy,
            100.0 * drift,
            history.size()
        );
#elif LAB_CHECKPOINT >= 5
        std::snprintf(
            title,
            sizeof(title),
            "Project 41 checkpoint 5 | Space pause | N step | t %.3f | dt %.6f | substeps %d | dropped %.4f",
            state.elapsed,
            fixedDeltaSeconds,
            substepsLastFrame,
            droppedTime
        );
#elif LAB_CHECKPOINT >= 4
        const lj::PairInteraction interaction = lj::evaluatePair(state, parameters);
        const lj::Vec2 forceSum = lj::add(interaction.forceOnA, interaction.forceOnB);
        const lj::Vec2 momentum = lj::linearMomentum(state);
        const lj::Vec2 center = lj::centerOfMass(state);
        std::snprintf(
            title,
            sizeof(title),
            "Project 41 checkpoint 4 | |FA+FB| %.3e | |p| %.3e | COM (%.3f, %.3f)",
            lj::length(forceSum),
            lj::length(momentum),
            center.x,
            center.y
        );
#elif LAB_CHECKPOINT >= 3
        const lj::PairInteraction interaction = lj::evaluatePair(state, parameters);
        std::snprintf(
            title,
            sizeof(title),
            "Project 41 checkpoint 3 | r/sigma %.4f | U %+.5f | dU/dr %+.5f",
            interaction.distance / parameters.sigma,
            interaction.potential,
            interaction.potentialSlope
        );
#elif LAB_CHECKPOINT >= 2
        const lj::PotentialSample sample = lj::samplePotential(lj::pairDistance(state), parameters);
        std::snprintf(
            title,
            sizeof(title),
            "Project 41 checkpoint 2 | r/sigma %.4f | U %+.5f | sigma %.2f | r0 %.5f",
            sample.distance / parameters.sigma,
            sample.potential,
            parameters.sigma,
            lj::equilibriumDistance(parameters)
        );
#elif LAB_CHECKPOINT >= 1
        const lj::Vec2 delta = lj::pairDelta(state);
        const lj::Vec2 center = lj::centerOfMass(state);
        std::snprintf(
            title,
            sizeof(title),
            "Project 41 checkpoint 1 | delta (%.3f, %.3f) | r %.3f | COM (%.3f, %.3f)",
            delta.x,
            delta.y,
            lj::pairDistance(state),
            center.x,
            center.y
        );
#else
        std::snprintf(
            title,
            sizeof(title),
            "Project 41 starter | SDL3 framebuffer ready | physics not implemented"
        );
#endif
        SDL_SetWindowTitle(window, title);

        if (!SDL_UpdateTexture(texture, nullptr, pixels.data(), width * int(sizeof(std::uint32_t)))) {
            std::cerr << "SDL_UpdateTexture failed: " << SDL_GetError() << '\n';
            failed = true;
            running = false;
        }
        if (!SDL_RenderClear(renderer) || !SDL_RenderTexture(renderer, texture, nullptr, nullptr)) {
            std::cerr << "SDL render failed: " << SDL_GetError() << '\n';
            failed = true;
            running = false;
        }
        SDL_RenderPresent(renderer);
    }

    // Texture phụ thuộc renderer, còn renderer phụ thuộc window; hủy theo thứ tự ngược.
    SDL_DestroyTexture(texture);
    SDL_DestroyRenderer(renderer);
    SDL_DestroyWindow(window);
    SDL_Quit();
    if (failed) {
        return EXIT_FAILURE;
    }
    return EXIT_SUCCESS;
}
