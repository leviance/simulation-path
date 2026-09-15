#ifndef LAB_CHECKPOINT
#define LAB_CHECKPOINT 6
#endif
#if LAB_CHECKPOINT >= 1
#include "lab.hpp"
#endif
#include <SDL3/SDL.h>
#include <algorithm>
#if LAB_CHECKPOINT >= 3
#include <array>
#endif
#if LAB_CHECKPOINT >= 6
#include <chrono>
#endif
#include <cstdint>
#if LAB_CHECKPOINT >= 1
#include <cstdio>
#endif
#include <cstdlib>
#include <iostream>
#if LAB_CHECKPOINT >= 6
#include <utility>
#endif
#include <vector>

namespace {
constexpr int kCanvasWidth = 960;
constexpr int kCanvasHeight = 540;

std::uint32_t rgba(std::uint8_t red, std::uint8_t green, std::uint8_t blue, std::uint8_t alpha = 255) {
    return (std::uint32_t(red) << 24) | (std::uint32_t(green) << 16) | (std::uint32_t(blue) << 8) | alpha;
}
#if LAB_CHECKPOINT >= 1
void putPixel(std::vector<std::uint32_t>& pixels, lab::Point point, std::uint32_t color) {
    if (point.x < 0 || point.y < 0 || point.x >= kCanvasWidth || point.y >= kCanvasHeight) {
        return;
    }
    const std::size_t index = std::size_t(point.y) * std::size_t(kCanvasWidth) + std::size_t(point.x);
    pixels[index] = color;
}
#endif
#if LAB_CHECKPOINT >= 3
void drawHandle(std::vector<std::uint32_t>& pixels, lab::Point center, std::uint32_t color) {
    constexpr int kHandleRadius = 6;
    for (int y = center.y - kHandleRadius; y <= center.y + kHandleRadius; ++y) {
        for (int x = center.x - kHandleRadius; x <= center.x + kHandleRadius; ++x) {
            putPixel(pixels, {x, y}, color);
        }
    }
}
#endif
#if LAB_CHECKPOINT >= 6
void drawInspector(
    std::vector<std::uint32_t>& pixels,
    const std::vector<lab::Point>& linePoints,
    std::size_t inspectedStep
) {
    constexpr int kInspectorCells = 9;
    constexpr int kInspectorCellSize = 16;
    constexpr int kInspectorOriginX = 24;
    constexpr int kInspectorOriginY = 360;
    constexpr int kInspectorHalf = kInspectorCells / 2;
    const lab::Point selectedPoint = linePoints[inspectedStep];

    for (int gridY = 0; gridY < kInspectorCells; ++gridY) {
        for (int gridX = 0; gridX < kInspectorCells; ++gridX) {
            const lab::Point inspectedPoint{
                selectedPoint.x + gridX - kInspectorHalf,
                selectedPoint.y + gridY - kInspectorHalf,
            };
            const bool belongsToLine = std::find(linePoints.begin(), linePoints.end(), inspectedPoint) != linePoints.end();
            const bool isSelected = inspectedPoint == selectedPoint;
            std::uint32_t cellColor = rgba(22, 31, 53);
            if (belongsToLine) {
                cellColor = rgba(83, 240, 174);
            }
            if (isSelected) {
                cellColor = rgba(239, 125, 66);
            }

            const int left = kInspectorOriginX + gridX * kInspectorCellSize;
            const int top = kInspectorOriginY + gridY * kInspectorCellSize;
            for (int y = top + 1; y < top + kInspectorCellSize; ++y) {
                for (int x = left + 1; x < left + kInspectorCellSize; ++x) {
                    putPixel(pixels, {x, y}, cellColor);
                }
            }
        }
    }
}
#endif
#if LAB_CHECKPOINT >= 3
constexpr std::array<lab::Point, 8> kOctantOffsets{{
    {9, 2},
    {2, 9},
    {-2, 9},
    {-9, 2},
    {-9, -2},
    {-2, -9},
    {2, -9},
    {9, -2},
}};
#endif
#if LAB_CHECKPOINT >= 6
void benchmarkLines() {
    constexpr int kLineCount = 20'000;
    constexpr int kRoundCount = 7;
    using Segment = std::pair<lab::Point, lab::Point>;
    std::vector<Segment> segments;
    segments.reserve(kLineCount);
    for (int index = 0; index < kLineCount; ++index) {
        segments.push_back({
            {(index * 37) % kCanvasWidth, (index * 53) % kCanvasHeight},
            {(index * 97 + 211) % kCanvasWidth, (index * 29 + 71) % kCanvasHeight},
        });
    }

    // Chạy thử cả hai thuật toán trước để lần đo đầu không chịu chi phí khởi động.
    std::size_t warmupChecksum = 0;
    for (int index = 0; index < 500; ++index) {
        const auto [start, end] = segments[std::size_t(index)];
        warmupChecksum += lab::dda(start, end).size();
        warmupChecksum += lab::bresenham(start, end).size();
    }
    const auto run = [&](bool useDda) {
        std::array<double, kRoundCount> milliseconds{};
        std::size_t checksum = 0;
        for (int round = 0; round < kRoundCount; ++round) {
            const auto begin = std::chrono::steady_clock::now();
            for (const auto& [start, end] : segments) {
                if (useDda) {
                    checksum += lab::dda(start, end).size();
                } else {
                    checksum += lab::bresenham(start, end).size();
                }
            }
            const auto elapsed = std::chrono::steady_clock::now() - begin;
            milliseconds[std::size_t(round)] = std::chrono::duration<double, std::milli>(elapsed).count();
        }
        std::sort(milliseconds.begin(), milliseconds.end());
        return std::pair{milliseconds[kRoundCount / 2], checksum};
    };
    const auto [ddaMedian, ddaChecksum] = run(true);
    const auto [bresenhamMedian, bresenhamChecksum] = run(false);
#ifdef NDEBUG
    constexpr const char* kBuildType = "Release";
#else
    constexpr const char* kBuildType = "Debug";
#endif
    SDL_Log("%s | %d lines x %d rounds | median: DDA %.3f ms, "
            "Bresenham %.3f ms | checksums %zu/%zu | warmup %zu",
            kBuildType, kLineCount, kRoundCount, ddaMedian, bresenhamMedian, ddaChecksum, bresenhamChecksum, warmupChecksum);
}
#endif
} // namespace

int main() {
    // Setup: tạo window, renderer, texture và CPU pixel buffer theo thứ tự.
    if (!SDL_Init(SDL_INIT_VIDEO)) {
        std::cerr << "SDL_Init failed: " << SDL_GetError() << '\n';
        return EXIT_FAILURE;
    }
    SDL_Window* window = SDL_CreateWindow("Project 04 - Tiny 2D Rasterizer", kCanvasWidth, kCanvasHeight, 0);
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
    SDL_Texture* texture = SDL_CreateTexture(renderer, SDL_PIXELFORMAT_RGBA8888, SDL_TEXTUREACCESS_STREAMING, kCanvasWidth, kCanvasHeight);
    if (!texture) {
        std::cerr << "Texture creation failed: " << SDL_GetError() << '\n';
        SDL_DestroyRenderer(renderer);
        SDL_DestroyWindow(window);
        SDL_Quit();
        return EXIT_FAILURE;
    }
    std::vector<std::uint32_t> pixels(std::size_t(kCanvasWidth) * std::size_t(kCanvasHeight));

    // Hai đầu đoạn thẳng; các bài sau sẽ bổ sung trạng thái kéo và pixel đang quan sát.
    bool running = true;
    bool failed = false;
#if LAB_CHECKPOINT >= 1
#if LAB_CHECKPOINT >= 2
    bool useDda = false;
#endif
    lab::Point endpointA{220, 270};
    lab::Point endpointB{740, 150};
#if LAB_CHECKPOINT >= 3
    int draggedEndpoint = -1;
#endif
#if LAB_CHECKPOINT >= 6
    std::size_t inspectedStep = 0;
#endif
#if LAB_CHECKPOINT >= 3
    std::size_t octantPreset = 0;
#endif
#endif

    // Mỗi frame xử lý input trước, sau đó rasterize lại toàn bộ canvas.
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
#if LAB_CHECKPOINT >= 2
                if (!event.key.repeat && event.key.key == SDLK_D) {
                    useDda = true;
                }
                if (!event.key.repeat && event.key.key == SDLK_B) {
                    useDda = false;
                }
#endif
#if LAB_CHECKPOINT >= 6
                if (!event.key.repeat && event.key.key == SDLK_LEFT && inspectedStep > 0) {
                    --inspectedStep;
                }
                if (!event.key.repeat && event.key.key == SDLK_RIGHT) {
                    ++inspectedStep;
                }
                if (!event.key.repeat && event.key.key == SDLK_HOME) {
                    inspectedStep = 0;
                }
#endif
#if LAB_CHECKPOINT >= 3
                if (!event.key.repeat && event.key.key == SDLK_O) {
                    const lab::Point offset = kOctantOffsets[octantPreset];
                    endpointA = {kCanvasWidth / 2, kCanvasHeight / 2};
                    endpointB = {
                        endpointA.x + offset.x * 22,
                        endpointA.y + offset.y * 22,
                    };
                    octantPreset = (octantPreset + 1) % kOctantOffsets.size();
#if LAB_CHECKPOINT >= 6
                    inspectedStep = 0;
#endif
                }
#endif
#if LAB_CHECKPOINT >= 6
                if (!event.key.repeat && event.key.key == SDLK_T) {
                    benchmarkLines();
                }
#endif
            }
#if LAB_CHECKPOINT >= 3
            if (event.type == SDL_EVENT_MOUSE_BUTTON_DOWN && event.button.button == SDL_BUTTON_LEFT) {
                const lab::Point mouse{
                    int(event.button.x),
                    int(event.button.y),
                };
                const auto squaredDistance = [](lab::Point left, lab::Point right) {
                    const int dx = right.x - left.x;
                    const int dy = right.y - left.y;
                    return dx * dx + dy * dy;
                };
                const int distanceToA = squaredDistance(mouse, endpointA);
                const int distanceToB = squaredDistance(mouse, endpointB);
                if (distanceToA <= distanceToB) {
                    draggedEndpoint = 0;
                    endpointA = mouse;
                } else {
                    draggedEndpoint = 1;
                    endpointB = mouse;
                }
#if LAB_CHECKPOINT >= 6
                inspectedStep = 0;
#endif
                if (!SDL_CaptureMouse(true)) {
                    std::cerr << "Mouse capture failed: " << SDL_GetError() << '\n';
                }
            }
            if (event.type == SDL_EVENT_MOUSE_MOTION && draggedEndpoint >= 0) {
                const lab::Point mouse{int(event.motion.x), int(event.motion.y)};
                if (draggedEndpoint == 0) {
                    endpointA = mouse;
                } else {
                    endpointB = mouse;
                }
#if LAB_CHECKPOINT >= 6
                inspectedStep = 0;
#endif
            }
            if ((event.type == SDL_EVENT_MOUSE_BUTTON_UP && event.button.button == SDL_BUTTON_LEFT) || event.type == SDL_EVENT_WINDOW_FOCUS_LOST) {
                draggedEndpoint = -1;
                SDL_CaptureMouse(false);
            }
#endif
        }
        if (!running) {
            break;
        }
        std::fill(pixels.begin(), pixels.end(), rgba(11, 16, 32));
#if LAB_CHECKPOINT >= 1
#if LAB_CHECKPOINT == 1
        const auto linePoints = lab::dda(endpointA, endpointB);
#else
        std::vector<lab::Point> linePoints;
        if (useDda) {
            linePoints = lab::dda(endpointA, endpointB);
        } else {
            linePoints = lab::bresenham(endpointA, endpointB);
        }
#endif
#if LAB_CHECKPOINT >= 6
        inspectedStep = std::min(inspectedStep, linePoints.size() - 1);
#endif
        for (lab::Point point : linePoints) {
            putPixel(pixels, point, rgba(83, 240, 174));
        }
#endif
#if LAB_CHECKPOINT >= 4
        for (lab::Point point : lab::filledRectangle({70, 70}, {210, 145})) {
            putPixel(pixels, point, rgba(31, 43, 68));
        }
        for (lab::Point point : lab::rectangle({70, 70}, {210, 145})) {
            putPixel(pixels, point, rgba(239, 125, 66));
        }
#endif
#if LAB_CHECKPOINT >= 5
        const lab::Point canvasCenter{
            kCanvasWidth / 2,
            kCanvasHeight / 2,
        };
        for (lab::Point point : lab::circle(canvasCenter, 110)) {
            putPixel(pixels, point, rgba(49, 87, 228));
        }
#endif
#if LAB_CHECKPOINT >= 3
        drawHandle(pixels, endpointA, rgba(239, 125, 66));
        drawHandle(pixels, endpointB, rgba(49, 87, 228));
#endif
#if LAB_CHECKPOINT >= 6
        const lab::Point selectedPoint = linePoints[inspectedStep];
        drawInspector(pixels, linePoints, inspectedStep);
        char title[220]{};
#if LAB_CHECKPOINT >= 2
        if (!useDda) {
            const auto trace = lab::traceBresenham(endpointA, endpointB);
            const auto& step = trace[inspectedStep];
            const char* movementX = "";
            const char* movementY = "";
            if (step.movesX) {
                movementX = "X";
            }
            if (step.movesY) {
                movementY = "Y";
            }
#if LAB_CHECKPOINT >= 3
            std::snprintf(title, sizeof(title), "Bresenham | step %zu/%zu | p=(%d,%d) | error=%d e2=%d | move %s%s | Left/Right: inspect | O: octant", inspectedStep, linePoints.size() - 1, step.point.x, step.point.y, step.error, step.doubledError, movementX, movementY);
#else
            std::snprintf(title, sizeof(title), "Bresenham | step %zu/%zu | p=(%d,%d) | error=%d e2=%d | move %s%s | Left/Right: inspect", inspectedStep, linePoints.size() - 1, step.point.x, step.point.y, step.error, step.doubledError, movementX, movementY);
#endif
        } else
#endif
        {
            double t = 0.0;
            if (linePoints.size() > 1) {
                t = double(inspectedStep) / double(linePoints.size() - 1);
            }
#if LAB_CHECKPOINT >= 3
            std::snprintf(title, sizeof(title), "DDA | step %zu/%zu | p=(%d,%d) | t=%.3f | Left/Right: inspect | O: octant", inspectedStep, linePoints.size() - 1, selectedPoint.x, selectedPoint.y, t);
#else
            std::snprintf(title, sizeof(title), "DDA | step %zu/%zu | p=(%d,%d) | t=%.3f | Left/Right: inspect", inspectedStep, linePoints.size() - 1, selectedPoint.x, selectedPoint.y, t);
#endif
        }
        SDL_SetWindowTitle(window, title);
#elif LAB_CHECKPOINT >= 3
        if (useDda) {
            SDL_SetWindowTitle(window, "DDA | kéo A/B bằng chuột | O: thử tám octant | D/B: đổi thuật toán");
        } else {
            SDL_SetWindowTitle(window, "Bresenham | kéo A/B bằng chuột | O: thử tám octant | D/B: đổi thuật toán");
        }
#elif LAB_CHECKPOINT >= 2
        if (useDda) {
            SDL_SetWindowTitle(window, "DDA | D/B: đổi thuật toán");
        } else {
            SDL_SetWindowTitle(window, "Bresenham | D/B: đổi thuật toán");
        }
#elif LAB_CHECKPOINT >= 1
        SDL_SetWindowTitle(window, "DDA | đoạn cố định A(220,270) - B(740,150)");
#endif
        if (!SDL_UpdateTexture(texture, nullptr, pixels.data(), kCanvasWidth * int(sizeof(std::uint32_t)))) {
            std::cerr << "SDL_UpdateTexture failed: " << SDL_GetError() << '\n';
            failed = true;
            break;
        }
        if (!SDL_RenderClear(renderer)) {
            std::cerr << "SDL_RenderClear failed: " << SDL_GetError() << '\n';
            failed = true;
            break;
        }
        if (!SDL_RenderTexture(renderer, texture, nullptr, nullptr)) {
            std::cerr << "SDL_RenderTexture failed: " << SDL_GetError() << '\n';
            failed = true;
            break;
        }
        if (!SDL_RenderPresent(renderer)) {
            std::cerr << "SDL_RenderPresent failed: " << SDL_GetError() << '\n';
            failed = true;
            break;
        }
        SDL_Delay(1);
    }

    // Cleanup theo thứ tự ngược với setup.
    SDL_DestroyTexture(texture);
    SDL_DestroyRenderer(renderer);
    SDL_DestroyWindow(window);
    SDL_Quit();
    if (failed) {
        return EXIT_FAILURE;
    }
    return EXIT_SUCCESS;
}
