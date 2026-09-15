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
constexpr std::uint32_t kTankFill = 0x111a2cffU;
constexpr std::uint32_t kTankBorder = 0x7183a1ffU;
constexpr std::uint32_t kStarterBall = 0x42516cffU;
#if LAB_CHECKPOINT >= 4
constexpr std::uint32_t kContactColor = 0xffd166ffU;
#endif
#if LAB_CHECKPOINT >= 8
constexpr std::uint32_t kKickColor = 0xf5f7ffffU;
#endif

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

void fillCircle(std::vector<std::uint32_t>& pixels, int width, int height, int centerX, int centerY, int radius, std::uint32_t color) {
    for (int offsetY = -radius; offsetY <= radius; ++offsetY) {
        for (int offsetX = -radius; offsetX <= radius; ++offsetX) {
            if (offsetX * offsetX + offsetY * offsetY <= radius * radius) {
                putPixel(pixels, width, height, centerX + offsetX, centerY + offsetY, color);
            }
        }
    }
}

void drawCircleOutline(std::vector<std::uint32_t>& pixels, int width, int height, int centerX, int centerY, int radius, std::uint32_t color) {
    int x = radius;
    int y = 0;
    int decision = 1 - radius;
    while (x >= y) {
        const int offsets[8][2] = {{x, y}, {y, x}, {-y, x}, {-x, y}, {-x, -y}, {-y, -x}, {y, -x}, {x, -y}};
        for (const auto& offset : offsets) {
            putPixel(pixels, width, height, centerX + offset[0], centerY + offset[1], color);
        }
        ++y;
        if (decision < 0) {
            decision += 2 * y + 1;
        } else {
            --x;
            decision += 2 * (y - x) + 1;
        }
    }
}

void drawStarterScene(std::vector<std::uint32_t>& pixels, int width, int height) {
    std::fill(pixels.begin(), pixels.end(), kBackground);
    const int left = 50;
    const int top = 50;
    const int right = width - 50;
    const int bottom = height - 50;
    fillRectangle(pixels, width, height, left, top, right, bottom, kTankFill);
    drawRectangle(pixels, width, height, left, top, right, bottom, kTankBorder);
    for (int row = 0; row < 6; ++row) {
        for (int column = 0; column < 12; ++column) {
            const int centerX = left + 38 + column * std::max(24, (right - left - 76) / 11);
            const int centerY = top + 38 + row * std::max(24, (bottom - top - 76) / 5);
            fillCircle(pixels, width, height, centerX, centerY, 10, kStarterBall);
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

#if LAB_CHECKPOINT >= 1
struct WorldView {
    double scale{};
    double offsetX{};
    double offsetY{};
};

WorldView makeWorldView(int width, int height, const lab::TankBounds& bounds) {
    const double usableWidth = std::max(1.0, double(width) - 80.0);
    const double usableHeight = std::max(1.0, double(height) - 80.0);
    const double worldWidth = bounds.maximumX - bounds.minimumX;
    const double worldHeight = bounds.maximumY - bounds.minimumY;
    const double scale = std::min(usableWidth / worldWidth, usableHeight / worldHeight);
    const double drawnWidth = worldWidth * scale;
    const double drawnHeight = worldHeight * scale;
    return {scale, 0.5 * (double(width) - drawnWidth) - bounds.minimumX * scale, 0.5 * (double(height) - drawnHeight) + bounds.maximumY * scale};
}

lab::Vec2 worldToScreen(lab::Vec2 worldPoint, const WorldView& view) {
    return {view.offsetX + worldPoint.x * view.scale, view.offsetY - worldPoint.y * view.scale};
}

lab::Vec2 screenToWorld(lab::Vec2 screenPoint, const WorldView& view) {
    return {(screenPoint.x - view.offsetX) / view.scale, (view.offsetY - screenPoint.y) / view.scale};
}

void drawTank(std::vector<std::uint32_t>& pixels, int width, int height, const lab::TankBounds& bounds, const WorldView& view) {
    const lab::Vec2 topLeft = worldToScreen({bounds.minimumX, bounds.maximumY}, view);
    const lab::Vec2 bottomRight = worldToScreen({bounds.maximumX, bounds.minimumY}, view);
    fillRectangle(pixels, width, height, int(std::lround(topLeft.x)), int(std::lround(topLeft.y)), int(std::lround(bottomRight.x)), int(std::lround(bottomRight.y)), kTankFill);
    drawRectangle(pixels, width, height, int(std::lround(topLeft.x)), int(std::lround(topLeft.y)), int(std::lround(bottomRight.x)), int(std::lround(bottomRight.y)), kTankBorder);
}

void drawBalls(std::vector<std::uint32_t>& pixels, int width, int height, const std::vector<lab::Ball>& balls, const WorldView& view) {
    for (const lab::Ball& ball : balls) {
        const lab::Vec2 center = worldToScreen(ball.position, view);
        const int radius = std::max(2, int(std::lround(ball.radius * view.scale)));
        fillCircle(pixels, width, height, int(std::lround(center.x)), int(std::lround(center.y)), radius, ball.color);
    }
}
#endif

#if LAB_CHECKPOINT >= 4
struct ContactPreview {
    bool found{};
    lab::Vec2 point{};
    lab::Vec2 normal{};
    double penetration{};
};

ContactPreview findDeepestContact(const std::vector<lab::Ball>& balls) {
    ContactPreview preview{};
    for (std::size_t firstIndex = 0; firstIndex < balls.size(); ++firstIndex) {
        for (std::size_t secondIndex = firstIndex + 1; secondIndex < balls.size(); ++secondIndex) {
            const lab::CircleContact contact = lab::findCircleContact(balls[firstIndex], balls[secondIndex]);
            if (!contact.colliding || contact.penetration <= preview.penetration) {
                continue;
            }
            preview.found = true;
            preview.penetration = contact.penetration;
            preview.normal = contact.normal;
            preview.point = lab::add(balls[firstIndex].position, lab::scale(contact.normal, balls[firstIndex].radius));
        }
    }
    return preview;
}

void drawContactPreview(std::vector<std::uint32_t>& pixels, int width, int height, const ContactPreview& preview, const WorldView& view) {
    if (!preview.found) {
        return;
    }
    const lab::Vec2 start = worldToScreen(preview.point, view);
    const lab::Vec2 endWorld = lab::add(preview.point, lab::scale(preview.normal, 0.75));
    const lab::Vec2 end = worldToScreen(endWorld, view);
    drawLine(pixels, width, height, int(std::lround(start.x)), int(std::lround(start.y)), int(std::lround(end.x)), int(std::lround(end.y)), kContactColor);
    drawCircleOutline(pixels, width, height, int(std::lround(start.x)), int(std::lround(start.y)), 5, kContactColor);
}
#endif

} // namespace

int main() {
    // Khởi tạo SDL và framebuffer trước khi tạo state vật lý của bể bóng.
    if (!SDL_Init(SDL_INIT_VIDEO)) {
        std::cerr << "SDL_Init failed: " << SDL_GetError() << '\n';
        return EXIT_FAILURE;
    }
    int width = kInitialWidth;
    int height = kInitialHeight;
    SDL_Window* window = SDL_CreateWindow("Project 24 - Collision Tank", width, height, SDL_WINDOW_RESIZABLE);
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
    const lab::TankBounds bounds{0.0, 0.0, 16.0, 10.0};
    constexpr std::uint32_t sceneSeed = 0x00c0ffeeU;
    std::vector<lab::Ball> balls = lab::makeBallLattice(16, 9, bounds, 0.24, 2.2, sceneSeed);
#endif
#if LAB_CHECKPOINT >= 2
    bool paused = true;
    bool singleStepRequested = false;
    double fixedDeltaSeconds = 1.0 / 120.0;
    double accumulator = 0.0;
    double droppedTime = 0.0;
    int substepsLastFrame = 0;
    std::uint64_t previousTicks = SDL_GetTicksNS();
#endif
#if LAB_CHECKPOINT < 7
#if LAB_CHECKPOINT >= 3
    double restitution = 0.96;
    std::size_t wallHitsLastStep = 0;
#endif
#if LAB_CHECKPOINT >= 4
    std::size_t contactsLastStep = 0;
    double maximumPenetrationLastStep = 0.0;
#endif
#if LAB_CHECKPOINT >= 5
    std::size_t impulsesLastStep = 0;
#endif
#else
    double restitution = 0.96;
#endif
#if LAB_CHECKPOINT >= 7
    int solverIterations = 3;
    lab::CollisionStepStats stepStats{};
#endif
#if LAB_CHECKPOINT >= 8
    bool draggingKick = false;
    std::size_t selectedBall = balls.size();
    lab::Vec2 kickStart{};
    lab::Vec2 kickCurrent{};
    const lab::WorldMetrics initialMetrics = lab::measureWorld(balls);
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
#if LAB_CHECKPOINT >= 2
                if (!event.key.repeat && event.key.key == SDLK_SPACE) {
                    paused = !paused;
                    previousTicks = SDL_GetTicksNS();
                }
                if (!event.key.repeat && event.key.key == SDLK_N) {
                    singleStepRequested = true;
                    paused = true;
                }
                if (!event.key.repeat && event.key.key == SDLK_R) {
                    balls = lab::makeBallLattice(16, 9, bounds, 0.24, 2.2, sceneSeed);
                    accumulator = 0.0;
                    droppedTime = 0.0;
                    paused = true;
                }
#endif
#if LAB_CHECKPOINT >= 7
                if (!event.key.repeat && event.key.key == SDLK_I) {
                    ++solverIterations;
                    if (solverIterations > 5) {
                        solverIterations = 1;
                    }
                }
#endif
#if LAB_CHECKPOINT >= 8
                if (!event.key.repeat && event.key.key == SDLK_LEFTBRACKET) {
                    fixedDeltaSeconds = std::min(1.0 / 30.0, fixedDeltaSeconds * 2.0);
                    balls = lab::makeBallLattice(16, 9, bounds, 0.24, 2.2, sceneSeed);
                    accumulator = 0.0;
                    paused = true;
                }
                if (!event.key.repeat && event.key.key == SDLK_RIGHTBRACKET) {
                    fixedDeltaSeconds = std::max(1.0 / 240.0, fixedDeltaSeconds * 0.5);
                    balls = lab::makeBallLattice(16, 9, bounds, 0.24, 2.2, sceneSeed);
                    accumulator = 0.0;
                    paused = true;
                }
                if (!event.key.repeat && event.key.key == SDLK_MINUS) {
                    restitution = std::max(0.0, restitution - 0.05);
                }
                if (!event.key.repeat && event.key.key == SDLK_EQUALS) {
                    restitution = std::min(1.0, restitution + 0.05);
                }
#endif
            }
#if LAB_CHECKPOINT >= 8
            if (event.type == SDL_EVENT_MOUSE_BUTTON_DOWN && event.button.button == SDL_BUTTON_LEFT) {
                const WorldView view = makeWorldView(width, height, bounds);
                kickStart = screenToWorld({event.button.x, event.button.y}, view);
                kickCurrent = kickStart;
                selectedBall = lab::nearestBallIndex(balls, kickStart);
                draggingKick = selectedBall < balls.size();
                if (draggingKick && !SDL_CaptureMouse(true)) {
                    std::cerr << "SDL_CaptureMouse failed: " << SDL_GetError() << '\n';
                }
            }
            if (event.type == SDL_EVENT_MOUSE_MOTION && draggingKick) {
                const WorldView view = makeWorldView(width, height, bounds);
                kickCurrent = screenToWorld({event.motion.x, event.motion.y}, view);
            }
            if (event.type == SDL_EVENT_MOUSE_BUTTON_UP && event.button.button == SDL_BUTTON_LEFT) {
                if (draggingKick) {
                    const lab::Vec2 velocityChange = lab::scale(lab::subtract(kickCurrent, kickStart), 1.5);
                    lab::applyVelocityKick(balls, selectedBall, velocityChange);
                }
                draggingKick = false;
                selectedBall = balls.size();
                SDL_CaptureMouse(false);
            }
            if (event.type == SDL_EVENT_WINDOW_FOCUS_LOST) {
                draggingKick = false;
                selectedBall = balls.size();
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

#if LAB_CHECKPOINT >= 2
        const std::uint64_t now = SDL_GetTicksNS();
        double frameSeconds = double(now - previousTicks) / 1'000'000'000.0;
        previousTicks = now;
        frameSeconds = std::clamp(frameSeconds, 0.0, 0.25);
        lab::FixedStepPlan plan{};
        if (!paused) {
            plan = lab::planFixedSteps(accumulator, frameSeconds, fixedDeltaSeconds, 16, 0.1);
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
#if LAB_CHECKPOINT < 7
            for (lab::Ball& ball : balls) {
                lab::integrateBall(ball, fixedDeltaSeconds);
            }
#if LAB_CHECKPOINT >= 3
            wallHitsLastStep = 0;
            for (lab::Ball& ball : balls) {
                const lab::WallCollisionResult wall = lab::resolveWallCollision(ball, bounds, restitution);
                wallHitsLastStep += std::size_t(wall.hitCount);
            }
#endif
#if LAB_CHECKPOINT >= 4
            contactsLastStep = 0;
            maximumPenetrationLastStep = 0.0;
#if LAB_CHECKPOINT >= 5
            impulsesLastStep = 0;
#endif
            for (std::size_t firstIndex = 0; firstIndex < balls.size(); ++firstIndex) {
                for (std::size_t secondIndex = firstIndex + 1; secondIndex < balls.size(); ++secondIndex) {
                    const lab::CircleContact contact = lab::findCircleContact(balls[firstIndex], balls[secondIndex]);
                    if (!contact.colliding) {
                        continue;
                    }
                    ++contactsLastStep;
                    maximumPenetrationLastStep = std::max(maximumPenetrationLastStep, contact.penetration);
#if LAB_CHECKPOINT >= 5
                    const double impulse = lab::applyCollisionImpulse(balls[firstIndex], balls[secondIndex], contact, restitution);
                    if (impulse > 0.0) {
                        ++impulsesLastStep;
                    }
#endif
#if LAB_CHECKPOINT >= 6
                    lab::correctBallPenetration(balls[firstIndex], balls[secondIndex], contact, 0.8, 0.001);
#endif
                }
            }
#endif
#else
            const lab::CollisionStepSettings settings{fixedDeltaSeconds, restitution, solverIterations, 0.8, 0.001};
            stepStats = lab::stepCollisionWorld(balls, bounds, settings);
#endif
        }
#endif

#if LAB_CHECKPOINT >= 1
        std::fill(pixels.begin(), pixels.end(), kBackground);
        const WorldView view = makeWorldView(width, height, bounds);
        drawTank(pixels, width, height, bounds, view);
        drawBalls(pixels, width, height, balls, view);
#if LAB_CHECKPOINT >= 4
        const ContactPreview contactPreview = findDeepestContact(balls);
        drawContactPreview(pixels, width, height, contactPreview, view);
#endif
#if LAB_CHECKPOINT >= 8
        if (draggingKick && selectedBall < balls.size()) {
            const lab::Vec2 start = worldToScreen(balls[selectedBall].position, view);
            const lab::Vec2 end = worldToScreen(kickCurrent, view);
            drawLine(pixels, width, height, int(std::lround(start.x)), int(std::lround(start.y)), int(std::lround(end.x)), int(std::lround(end.y)), kKickColor);
            drawCircleOutline(pixels, width, height, int(std::lround(start.x)), int(std::lround(start.y)), int(std::lround(balls[selectedBall].radius * view.scale)) + 3, kKickColor);
        }
#endif
#else
        drawStarterScene(pixels, width, height);
#endif

        char title[640]{};
#if LAB_CHECKPOINT >= 8
        const lab::WorldMetrics metrics = lab::measureWorld(balls);
        double energyDrift = 0.0;
        if (initialMetrics.kineticEnergy > lab::kCollisionEpsilon) {
            energyDrift = (metrics.kineticEnergy - initialMetrics.kineticEnergy) / initialMetrics.kineticEnergy;
        }
        const char* finiteLabel = "NO";
        if (metrics.finite) {
            finiteLabel = "yes";
        }
        std::snprintf(title, sizeof(title), "Project 24 | %zu balls | Space pause | N step | drag kick | [ ] dt | - = restitution | I iterations | dt %.5f | e %.2f | iter %d | pairs %zu | contacts %zu | impulses %zu | overlap %zu | max pen %.5f | energy %+.3f%% | momentum (%.2f, %.2f) | finite %s", balls.size(), fixedDeltaSeconds, restitution, solverIterations, stepStats.pairChecks, stepStats.contacts, stepStats.impulses, metrics.overlapCount, metrics.maximumPenetration, 100.0 * energyDrift, metrics.totalMomentum.x, metrics.totalMomentum.y, finiteLabel);
#elif LAB_CHECKPOINT >= 7
        std::snprintf(title, sizeof(title), "Project 24 | brute-force solver | balls %zu | iterations %d | pair checks %zu | contacts %zu | impulses %zu | wall hits %zu | max penetration %.5f", balls.size(), solverIterations, stepStats.pairChecks, stepStats.contacts, stepStats.impulses, stepStats.wallHits, stepStats.maximumPenetration);
#elif LAB_CHECKPOINT >= 6
        std::snprintf(title, sizeof(title), "Project 24 | positional correction | contacts %zu | impulses %zu | max penetration %.5f", contactsLastStep, impulsesLastStep, maximumPenetrationLastStep);
#elif LAB_CHECKPOINT >= 5
        std::snprintf(title, sizeof(title), "Project 24 | normal impulse | contacts %zu | impulses %zu | max penetration %.5f", contactsLastStep, impulsesLastStep, maximumPenetrationLastStep);
#elif LAB_CHECKPOINT >= 4
        std::snprintf(title, sizeof(title), "Project 24 | detection only | contacts %zu | max penetration %.5f", contactsLastStep, maximumPenetrationLastStep);
#elif LAB_CHECKPOINT >= 3
        std::snprintf(title, sizeof(title), "Project 24 | wall collision | hits %zu | restitution %.2f | dt %.5f", wallHitsLastStep, restitution, fixedDeltaSeconds);
#elif LAB_CHECKPOINT >= 2
        std::snprintf(title, sizeof(title), "Project 24 | fixed-step motion | balls %zu | dt %.5f | substeps %d | dropped %.3f", balls.size(), fixedDeltaSeconds, substepsLastFrame, droppedTime);
#elif LAB_CHECKPOINT >= 1
        std::snprintf(title, sizeof(title), "Project 24 | deterministic lattice | %zu balls | seed 0x00c0ffee", balls.size());
#else
        std::snprintf(title, sizeof(title), "Project 24 starter | SDL tank and placeholder balls are ready");
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
