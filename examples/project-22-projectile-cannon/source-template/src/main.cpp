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
constexpr int kInitialHeight = 680;
constexpr std::uint32_t kBackground = 0x0b1020ffU;
constexpr std::uint32_t kGrid = 0x1d2940ffU;
constexpr std::uint32_t kGround = 0x6f8f72ffU;
constexpr std::uint32_t kCannon = 0xd5deefffU;
constexpr std::uint32_t kAim = 0x70d6ffffU;
constexpr std::uint32_t kHorizontal = 0xffb454ffU;
constexpr std::uint32_t kVertical = 0xc792eaffU;
constexpr std::uint32_t kAnalytic = 0xffd166ffU;
constexpr std::uint32_t kNumerical = 0x53f0aeffU;
constexpr std::uint32_t kExactGhost = 0xff7b86ffU;

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

#if LAB_CHECKPOINT < 1
void drawStarterScene(std::vector<std::uint32_t>& pixels, int width, int height) {
    std::fill(pixels.begin(), pixels.end(), kBackground);
    const int groundY = height - 58;
    drawLine(pixels, width, height, 0, groundY, width - 1, groundY, kGround);
    fillRectangle(pixels, width, height, 48, groundY - 24, 104, groundY, 0x344564ffU);
    fillCircle(pixels, width, height, 76, groundY - 24, 20, kCannon);
    drawLine(pixels, width, height, 76, groundY - 24, 132, groundY - 62, kCannon);
}
#endif

bool resizeSurface(SDL_Renderer* renderer, SDL_Texture*& texture, std::vector<std::uint32_t>& pixels, int& width, int& height, int newWidth, int newHeight) {
    if (newWidth <= 0 || newHeight <= 0) {
        return true;
    }
    SDL_Texture* newTexture = SDL_CreateTexture(renderer, SDL_PIXELFORMAT_RGBA8888, SDL_TEXTUREACCESS_STREAMING, newWidth, newHeight);
    if (!newTexture) {
        return false;
    }

    // Texture, color buffer and viewport dimensions change as one transaction.
    SDL_DestroyTexture(texture);
    texture = newTexture;
    width = newWidth;
    height = newHeight;
    pixels.assign(std::size_t(width) * std::size_t(height), kBackground);
    return true;
}

#if LAB_CHECKPOINT >= 1
constexpr lab::Vec2 kMuzzleWorld{0.0, 1.2};
constexpr double kMinimumSpeed = 4.0;
constexpr double kMaximumSpeed = 32.0;
constexpr double kMinimumAngle = 5.0 * lab::kPi / 180.0;
constexpr double kMaximumAngle = 85.0 * lab::kPi / 180.0;
constexpr double kAimPixelsPerSpeed = 5.0;

lab::WorldView makeWorldView(int width, int height) {
    double pixelsPerMeter = std::min((double(width) - 110.0) / 110.0, (double(height) - 100.0) / 48.0);
    pixelsPerMeter = std::max(2.0, pixelsPerMeter);
    return {{66.0, double(height) - 58.0}, pixelsPerMeter};
}

void drawArrow(std::vector<std::uint32_t>& pixels, int width, int height, lab::Vec2 start, lab::Vec2 end, std::uint32_t color) {
    const int startX = int(std::lround(start.x));
    const int startY = int(std::lround(start.y));
    const int endX = int(std::lround(end.x));
    const int endY = int(std::lround(end.y));
    drawLine(pixels, width, height, startX, startY, endX, endY, color);

    const lab::Vec2 delta = lab::subtract(end, start);
    const double magnitude = lab::length(delta);
    if (magnitude <= lab::kPhysicsEpsilon) {
        return;
    }
    const lab::Vec2 backward = lab::scale(delta, -1.0 / magnitude);
    const lab::Vec2 perpendicular{-backward.y, backward.x};
    const lab::Vec2 arrowBase = lab::add(end, lab::scale(backward, 13.0));
    const lab::Vec2 firstWing = lab::add(arrowBase, lab::scale(perpendicular, 6.0));
    const lab::Vec2 secondWing = lab::subtract(arrowBase, lab::scale(perpendicular, 6.0));
    drawLine(pixels, width, height, endX, endY, int(std::lround(firstWing.x)), int(std::lround(firstWing.y)), color);
    drawLine(pixels, width, height, endX, endY, int(std::lround(secondWing.x)), int(std::lround(secondWing.y)), color);
}

void drawWorld(std::vector<std::uint32_t>& pixels, int width, int height, const lab::WorldView& view) {
    std::fill(pixels.begin(), pixels.end(), kBackground);
    for (int meters = 0; meters <= 110; meters += 10) {
        const lab::Vec2 bottom = lab::worldToScreen({double(meters), 0.0}, view);
        const lab::Vec2 top = lab::worldToScreen({double(meters), 48.0}, view);
        drawLine(pixels, width, height, int(std::lround(bottom.x)), int(std::lround(bottom.y)), int(std::lround(top.x)), int(std::lround(top.y)), kGrid);
    }
    for (int meters = 0; meters <= 40; meters += 10) {
        const lab::Vec2 left = lab::worldToScreen({0.0, double(meters)}, view);
        const lab::Vec2 right = lab::worldToScreen({110.0, double(meters)}, view);
        drawLine(pixels, width, height, int(std::lround(left.x)), int(std::lround(left.y)), int(std::lround(right.x)), int(std::lround(right.y)), kGrid);
    }

    const lab::Vec2 groundStart = lab::worldToScreen({0.0, 0.0}, view);
    const lab::Vec2 groundEnd = lab::worldToScreen({110.0, 0.0}, view);
    drawLine(pixels, width, height, int(std::lround(groundStart.x)), int(std::lround(groundStart.y)), int(std::lround(groundEnd.x)), int(std::lround(groundEnd.y)), kGround);
}

void drawCannon(std::vector<std::uint32_t>& pixels, int width, int height, const lab::WorldView& view, double angleRadians) {
    const lab::Vec2 pivot = lab::worldToScreen({0.0, 0.65}, view);
    const lab::Vec2 muzzle = lab::worldToScreen(kMuzzleWorld, view);
    fillRectangle(pixels, width, height, int(std::lround(pivot.x)) - 22, int(std::lround(pivot.y)) - 11, int(std::lround(pivot.x)) + 22, int(std::lround(pivot.y)) + 11, 0x344564ffU);
    fillCircle(pixels, width, height, int(std::lround(pivot.x)), int(std::lround(pivot.y)), 13, kCannon);
    const lab::Vec2 barrelDirection{std::cos(angleRadians), -std::sin(angleRadians)};
    const lab::Vec2 barrelEnd = lab::add(pivot, lab::scale(barrelDirection, lab::length(lab::subtract(muzzle, pivot)) + 10.0));
    drawLine(pixels, width, height, int(std::lround(pivot.x)), int(std::lround(pivot.y)), int(std::lround(barrelEnd.x)), int(std::lround(barrelEnd.y)), kCannon);
}
#endif

#if LAB_CHECKPOINT >= 3
void drawPolyline(std::vector<std::uint32_t>& pixels, int width, int height, const std::vector<lab::Vec2>& worldPoints, const lab::WorldView& view, std::uint32_t color) {
    for (std::size_t index = 1; index < worldPoints.size(); ++index) {
        const lab::Vec2 start = lab::worldToScreen(worldPoints[index - 1], view);
        const lab::Vec2 end = lab::worldToScreen(worldPoints[index], view);
        drawLine(pixels, width, height, int(std::lround(start.x)), int(std::lround(start.y)), int(std::lround(end.x)), int(std::lround(end.y)), color);
    }
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
    SDL_Window* window = SDL_CreateWindow("Project 22 - Projectile Cannon", width, height, SDL_WINDOW_RESIZABLE);
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
    double aimSpeed = 28.0;
    double aimAngle = 50.0 * lab::kPi / 180.0;
    bool draggingAim = false;
#endif
#if LAB_CHECKPOINT >= 4
    lab::BallisticLaunch firedLaunch{kMuzzleWorld, lab::velocityFromPolar(aimSpeed, aimAngle), {0.0, lab::kGravity}};
    lab::ProjectileState projectile{};
    std::vector<lab::Vec2> numericalTrail{};
    bool paused = true;
    double fixedDeltaSeconds = 1.0 / 30.0;
    std::uint64_t previousTicks = SDL_GetTicksNS();
#endif
#if LAB_CHECKPOINT >= 5
    double accumulator = 0.0;
    int substepsLastFrame = 0;
    double droppedTime = 0.0;
#endif
#if LAB_CHECKPOINT >= 6
    lab::ImpactStepResult lastImpact{};
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
                if (!event.key.repeat && event.key.key == SDLK_RETURN) {
                    firedLaunch = {kMuzzleWorld, lab::velocityFromPolar(aimSpeed, aimAngle), {0.0, lab::kGravity}};
                    projectile = lab::launchProjectile(firedLaunch);
                    numericalTrail = {projectile.position};
                    paused = false;
#if LAB_CHECKPOINT >= 5
                    accumulator = 0.0;
                    droppedTime = 0.0;
#endif
#if LAB_CHECKPOINT >= 6
                    lastImpact = {};
#endif
                }
                if (!event.key.repeat && event.key.key == SDLK_SPACE) {
                    paused = !paused;
                    previousTicks = SDL_GetTicksNS();
                }
                if (!event.key.repeat && event.key.key == SDLK_N && projectile.active) {
#if LAB_CHECKPOINT >= 6
                    lastImpact = lab::explicitEulerStepToGround(projectile, firedLaunch.acceleration, fixedDeltaSeconds, 0.0);
#else
                    lab::explicitEulerStep(projectile, firedLaunch.acceleration, fixedDeltaSeconds);
#endif
                    numericalTrail.push_back(projectile.position);
                    paused = true;
                }
                if (!event.key.repeat && event.key.key == SDLK_R) {
                    aimSpeed = 28.0;
                    aimAngle = 50.0 * lab::kPi / 180.0;
                    projectile = {};
                    numericalTrail.clear();
                    paused = true;
                    fixedDeltaSeconds = 1.0 / 30.0;
#if LAB_CHECKPOINT >= 5
                    accumulator = 0.0;
                    droppedTime = 0.0;
#endif
#if LAB_CHECKPOINT >= 6
                    lastImpact = {};
#endif
                }
#endif
#if LAB_CHECKPOINT >= 7
                if (event.key.key == SDLK_LEFT) {
                    aimSpeed = lab::clampValue(aimSpeed - 1.0, kMinimumSpeed, kMaximumSpeed);
                }
                if (event.key.key == SDLK_RIGHT) {
                    aimSpeed = lab::clampValue(aimSpeed + 1.0, kMinimumSpeed, kMaximumSpeed);
                }
                if (event.key.key == SDLK_DOWN) {
                    aimAngle = lab::clampValue(aimAngle - 1.0 * lab::kPi / 180.0, kMinimumAngle, kMaximumAngle);
                }
                if (event.key.key == SDLK_UP) {
                    aimAngle = lab::clampValue(aimAngle + 1.0 * lab::kPi / 180.0, kMinimumAngle, kMaximumAngle);
                }
                if (!event.key.repeat && event.key.key == SDLK_LEFTBRACKET) {
                    fixedDeltaSeconds = std::min(1.0 / 15.0, fixedDeltaSeconds * 2.0);
                    projectile = {};
                    numericalTrail.clear();
                    paused = true;
                    accumulator = 0.0;
                    droppedTime = 0.0;
                    lastImpact = {};
                }
                if (!event.key.repeat && event.key.key == SDLK_RIGHTBRACKET) {
                    fixedDeltaSeconds = std::max(1.0 / 240.0, fixedDeltaSeconds * 0.5);
                    projectile = {};
                    numericalTrail.clear();
                    paused = true;
                    accumulator = 0.0;
                    droppedTime = 0.0;
                    lastImpact = {};
                }
#endif
            }
#if LAB_CHECKPOINT >= 1
            if (event.type == SDL_EVENT_MOUSE_BUTTON_DOWN && event.button.button == SDL_BUTTON_LEFT) {
                draggingAim = true;
                if (!SDL_CaptureMouse(true)) {
                    std::cerr << "SDL_CaptureMouse failed: " << SDL_GetError() << '\n';
                }
            }
            if (event.type == SDL_EVENT_MOUSE_MOTION && draggingAim) {
                const lab::WorldView view = makeWorldView(width, height);
                const lab::Vec2 muzzleScreen = lab::worldToScreen(kMuzzleWorld, view);
                const lab::AimSelection selection = lab::aimFromScreenDrag(muzzleScreen, {event.motion.x, event.motion.y}, kAimPixelsPerSpeed, kMinimumSpeed, kMaximumSpeed, kMinimumAngle, kMaximumAngle);
                if (selection.valid) {
                    aimSpeed = selection.speed;
                    aimAngle = selection.angleRadians;
                }
            }
            if (event.type == SDL_EVENT_MOUSE_BUTTON_UP && event.button.button == SDL_BUTTON_LEFT) {
                draggingAim = false;
                SDL_CaptureMouse(false);
            }
            if (event.type == SDL_EVENT_WINDOW_FOCUS_LOST) {
                draggingAim = false;
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
        if (!paused && projectile.active) {
#if LAB_CHECKPOINT == 4
            lab::explicitEulerStep(projectile, firedLaunch.acceleration, frameSeconds);
            numericalTrail.push_back(projectile.position);
#elif LAB_CHECKPOINT >= 5
            const lab::FixedStepPlan plan = lab::planFixedSteps(accumulator, frameSeconds, fixedDeltaSeconds, 16, 0.1);
            accumulator = plan.remainder;
            substepsLastFrame = plan.steps;
            droppedTime += plan.droppedTime;
            for (int step = 0; step < plan.steps && projectile.active; ++step) {
#if LAB_CHECKPOINT >= 6
                lastImpact = lab::explicitEulerStepToGround(projectile, firedLaunch.acceleration, fixedDeltaSeconds, 0.0);
#else
                lab::explicitEulerStep(projectile, firedLaunch.acceleration, fixedDeltaSeconds);
#endif
                numericalTrail.push_back(projectile.position);
            }
#endif
        }
#endif

#if LAB_CHECKPOINT >= 1
        const lab::WorldView view = makeWorldView(width, height);
        const lab::Vec2 aimVelocity{aimSpeed * std::cos(aimAngle), aimSpeed * std::sin(aimAngle)};
        const lab::Vec2 muzzleScreen = lab::worldToScreen(kMuzzleWorld, view);
        drawWorld(pixels, width, height, view);
        drawCannon(pixels, width, height, view, aimAngle);
        const lab::Vec2 aimScreenDelta{aimVelocity.x * kAimPixelsPerSpeed, -aimVelocity.y * kAimPixelsPerSpeed};
        drawArrow(pixels, width, height, muzzleScreen, lab::add(muzzleScreen, aimScreenDelta), kAim);
#if LAB_CHECKPOINT >= 2
        const lab::Vec2 horizontalEnd = lab::add(muzzleScreen, {aimVelocity.x * kAimPixelsPerSpeed, 0.0});
        drawArrow(pixels, width, height, muzzleScreen, horizontalEnd, kHorizontal);
        drawArrow(pixels, width, height, horizontalEnd, lab::add(muzzleScreen, aimScreenDelta), kVertical);
#endif
#if LAB_CHECKPOINT >= 3
        const lab::BallisticLaunch previewLaunch{kMuzzleWorld, lab::velocityFromPolar(aimSpeed, aimAngle), {0.0, lab::kGravity}};
        double previewDuration = 2.0 * std::max(0.0, aimVelocity.y) / -lab::kGravity + 0.2;
#if LAB_CHECKPOINT >= 6
        const std::optional<double> previewImpactTime = lab::solveGroundImpactTime(previewLaunch, 0.0);
        if (previewImpactTime) {
            previewDuration = *previewImpactTime;
        }
#endif
        const std::vector<lab::Vec2> analyticSamples = lab::sampleAnalyticTrajectory(previewLaunch, previewDuration, 96);
        drawPolyline(pixels, width, height, analyticSamples, view, kAnalytic);
        const std::optional<double> apexTime = lab::timeToApex(previewLaunch);
        if (apexTime) {
            const lab::Vec2 apexScreen = lab::worldToScreen(lab::analyticPosition(previewLaunch, *apexTime), view);
            fillCircle(pixels, width, height, int(std::lround(apexScreen.x)), int(std::lround(apexScreen.y)), 4, kAnalytic);
        }
#endif
#if LAB_CHECKPOINT >= 4
        drawPolyline(pixels, width, height, numericalTrail, view, kNumerical);
        if (!numericalTrail.empty()) {
            const lab::Vec2 projectileScreen = lab::worldToScreen(projectile.position, view);
            fillCircle(pixels, width, height, int(std::lround(projectileScreen.x)), int(std::lround(projectileScreen.y)), 6, kNumerical);
        }
#endif
#if LAB_CHECKPOINT >= 6
        if (lastImpact.impacted) {
            const lab::Vec2 uncorrectedScreen = lab::worldToScreen(lastImpact.uncorrectedPosition, view);
            fillCircle(pixels, width, height, int(std::lround(uncorrectedScreen.x)), int(std::lround(uncorrectedScreen.y)), 3, kExactGhost);
        }
#endif
#if LAB_CHECKPOINT >= 7
        if (!numericalTrail.empty()) {
            const lab::TrajectoryComparison comparison = lab::compareProjectile(firedLaunch, projectile);
            const lab::Vec2 exactScreen = lab::worldToScreen(comparison.analytic, view);
            const lab::Vec2 numericalScreen = lab::worldToScreen(comparison.numerical, view);
            drawLine(pixels, width, height, int(std::lround(exactScreen.x)), int(std::lround(exactScreen.y)), int(std::lround(numericalScreen.x)), int(std::lround(numericalScreen.y)), kExactGhost);
            fillCircle(pixels, width, height, int(std::lround(exactScreen.x)), int(std::lround(exactScreen.y)), 4, kExactGhost);
        }
#endif
#else
        drawStarterScene(pixels, width, height);
#endif

        char title[320]{};
#if LAB_CHECKPOINT >= 7
        double error = 0.0;
        if (!numericalTrail.empty()) {
            error = lab::compareProjectile(firedLaunch, projectile).error;
        }
        std::snprintf(title, sizeof(title), "Project 22 | Enter fire | Space pause | N step | arrows aim | [ ] dt | speed %.1f m/s | angle %.1f deg | dt %.5f s | t %.3f s | error %.4f m | steps %d | dropped %.3f s", aimSpeed, aimAngle * 180.0 / lab::kPi, fixedDeltaSeconds, projectile.elapsed, error, substepsLastFrame, droppedTime);
#elif LAB_CHECKPOINT >= 5
        std::snprintf(title, sizeof(title), "Project 22 | Enter fire | Space pause | N step | t %.3f s | dt %.5f s | steps %d | dropped %.3f s", projectile.elapsed, fixedDeltaSeconds, substepsLastFrame, droppedTime);
#elif LAB_CHECKPOINT >= 4
        std::snprintf(title, sizeof(title), "Project 22 | Enter fire | Space pause | N step | t %.3f s | position (%.2f, %.2f)", projectile.elapsed, projectile.position.x, projectile.position.y);
#elif LAB_CHECKPOINT >= 2
        std::snprintf(title, sizeof(title), "Project 22 | speed %.1f m/s | angle %.1f deg | vx %.2f | vy %.2f", aimSpeed, aimAngle * 180.0 / lab::kPi, aimVelocity.x, aimVelocity.y);
#elif LAB_CHECKPOINT >= 1
        std::snprintf(title, sizeof(title), "Project 22 | Drag to aim | speed %.1f m/s | angle %.1f deg", aimSpeed, aimAngle * 180.0 / lab::kPi);
#else
        std::snprintf(title, sizeof(title), "Project 22 starter | Cannon scene and SDL framebuffer are ready");
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
