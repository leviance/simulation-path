#include "presentation.hpp"
#include <cstdlib>
#include <cstring>
#include <iostream>

int main(int argc, char** argv) {
    const bool smoke = argc > 1 && std::strcmp(argv[1], "--smoke") == 0;
    if (!SDL_Init(SDL_INIT_VIDEO)) {
        std::cerr << SDL_GetError() << '\n';
        return EXIT_FAILURE;
    }
    SDL_WindowFlags flags = SDL_WINDOW_RESIZABLE | SDL_WINDOW_HIGH_PIXEL_DENSITY;
    if (smoke) {
        flags |= SDL_WINDOW_HIDDEN;
    }
    SDL_Window* window = SDL_CreateWindow("Project 27 - brute-force lens", 1100, 820, flags);
    SDL_Renderer* renderer = nullptr;
    if (window) {
        renderer = SDL_CreateRenderer(window, nullptr);
    }
    SDL_Texture* texture = nullptr;
    if (renderer) {
        texture = SDL_CreateTexture(renderer, SDL_PIXELFORMAT_RGBA8888, SDL_TEXTUREACCESS_STREAMING, lab::Framebuffer::width, lab::Framebuffer::height);
    }
    const bool ready = texture && SDL_SetRenderLogicalPresentation(renderer, lab::Framebuffer::width, lab::Framebuffer::height, SDL_LOGICAL_PRESENTATION_LETTERBOX);
    if (!ready) {
        std::cerr << SDL_GetError() << '\n';
        SDL_DestroyTexture(texture);
        SDL_DestroyRenderer(renderer);
        SDL_DestroyWindow(window);
        SDL_Quit();
        return EXIT_FAILURE;
    }
    lab::Framebuffer image{};
    lab::Scene scene{};
    lab::resetScene(scene);
    bool running = true;
    bool failed = false;
    bool dirty = true;
#if LAB_CHECKPOINT >= 3
    bool queryDirty = true;
#endif
    bool dragging = false;
#if LAB_CHECKPOINT >= 2
    SDL_MouseID owner{};
#endif
    int frames = 0;
#if LAB_CHECKPOINT >= 7
    std::uint64_t previous = SDL_GetTicksNS();
#endif
    const auto release = [&]() {
        dragging = false;
        SDL_CaptureMouse(false);
    };
#if LAB_CHECKPOINT >= 2
    const auto moveQuery = [&](float x, float y) {
        scene.query.center = lab::screenToWorld({x, y}, lab::makeWorldView(scene.debug));
        scene.paused = true;
        dirty = true;
    };
#endif
    while (running) {
        SDL_Event event{};
        while (SDL_PollEvent(&event)) {
            if (event.type == SDL_EVENT_QUIT) {
                running = false;
            }
            if (event.type == SDL_EVENT_WINDOW_FOCUS_LOST || event.type == SDL_EVENT_WINDOW_PIXEL_SIZE_CHANGED) {
                release();
                lab::stopScene(scene);
            }
            if (event.type == SDL_EVENT_KEY_DOWN && !event.key.repeat) {
                const auto key = event.key.key;
                if (key == SDLK_ESCAPE) {
                    release();
                    lab::stopScene(scene);
                }
                if (key == SDLK_R) {
                    release();
                    lab::resetScene(scene);
                }
                if (key == SDLK_F) {
                    release();
                    lab::stopScene(scene);
                    scene.debug = !scene.debug;
                }
#if LAB_CHECKPOINT >= 1
                if (key >= SDLK_1 && key <= SDLK_3) {
                    constexpr std::size_t counts[]{1'000, 10'000, 100'000};
                    scene.count = counts[key - SDLK_1];
#if LAB_CHECKPOINT >= 3
                    scene.scanLimit = scene.count;
#endif
                    lab::invalidateMeasurement(scene);
                }
                if (key == SDLK_P) {
                    scene.seed ^= 0x12345678U;
                    scene.particles = lab::makeParticleCloud(100'000, lab::Scene::bounds, scene.seed);
                    lab::invalidateMeasurement(scene);
                }
#endif
#if LAB_CHECKPOINT >= 2
                if (key == SDLK_UP || key == SDLK_DOWN) {
                    const double change = key == SDLK_UP ? 0.01 : -0.01;
                    scene.query.radius = std::clamp(scene.query.radius + change, 0.0, 0.35);
                    lab::invalidateMeasurement(scene);
                }
                if (key == SDLK_A || key == SDLK_D || key == SDLK_W || key == SDLK_S) {
                    if (key == SDLK_A)
                        scene.query.center.x -= 0.02;
                    if (key == SDLK_D)
                        scene.query.center.x += 0.02;
                    if (key == SDLK_W)
                        scene.query.center.y += 0.02;
#if LAB_CHECKPOINT < 6
                    if (key == SDLK_S)
                        scene.query.center.y -= 0.02;
#else
                        // S dành cho scaling; phím J đi xuống khi đã tới bài 6.
#endif
                    scene.query.center.x = std::clamp(scene.query.center.x, 0.0, 1.0);
                    scene.query.center.y = std::clamp(scene.query.center.y, 0.0, 1.0);
                    scene.paused = true;
                }
#if LAB_CHECKPOINT >= 6
                if (key == SDLK_J) {
                    scene.query.center.y = std::max(0.0, scene.query.center.y - 0.02);
                    scene.paused = true;
                }
#endif
#endif
#if LAB_CHECKPOINT == 3
                if (key == SDLK_LEFT)
                    scene.scanLimit -= std::min(scene.scanLimit, scene.count / 10);
                if (key == SDLK_RIGHT)
                    scene.scanLimit = std::min(scene.count, scene.scanLimit + scene.count / 10);
#endif
#if LAB_CHECKPOINT >= 5
                if (key == SDLK_B) {
                    release();
                    lab::requestBenchmark(scene, false);
                }
#endif
#if LAB_CHECKPOINT >= 6
                if (key == SDLK_S) {
                    release();
                    lab::requestBenchmark(scene, true);
                }
#endif
#if LAB_CHECKPOINT >= 7
                if (key == SDLK_SPACE) {
                    scene.paused = !scene.paused;
                }
                if (key == SDLK_N) {
                    scene.paused = true;
                    scene.phase += 0.08;
                    scene.query.center = {0.5 + 0.33 * std::cos(scene.phase), 0.5 + 0.28 * std::sin(1.7 * scene.phase)};
                }
#endif
            }
#if LAB_CHECKPOINT >= 2
            // Chỉ đổi một lần từ window coordinates sang logical board.
            if (event.type == SDL_EVENT_MOUSE_MOTION || event.type == SDL_EVENT_MOUSE_BUTTON_DOWN || event.type == SDL_EVENT_MOUSE_BUTTON_UP) {
                if (!SDL_ConvertEventToRenderCoordinates(renderer, &event)) {
                    failed = true;
                    running = false;
                    break;
                }
            }
            if (event.type == SDL_EVENT_MOUSE_BUTTON_DOWN && event.button.button == SDL_BUTTON_LEFT && !dragging && lab::inViewport({event.button.x, event.button.y}, lab::makeWorldView(scene.debug))) {
                // Không đổi tâm nếu hệ điều hành từ chối capture.
                if (SDL_CaptureMouse(true)) {
                    dragging = true;
                    owner = event.button.which;
                    moveQuery(event.button.x, event.button.y);
                }
            }
            if (event.type == SDL_EVENT_MOUSE_MOTION) {
                if (dragging && event.motion.which == owner) {
                    if (!(event.motion.state & SDL_BUTTON_LMASK)) {
                        release();
                    } else {
                        moveQuery(event.motion.x, event.motion.y);
                    }
                } else if (!dragging && lab::inViewport({event.motion.x, event.motion.y}, lab::makeWorldView(scene.debug))) {
                    moveQuery(event.motion.x, event.motion.y);
                }
            }
            if (event.type == SDL_EVENT_MOUSE_BUTTON_UP && event.button.button == SDL_BUTTON_LEFT && dragging && event.button.which == owner) {
                moveQuery(event.button.x, event.button.y);
                release();
            }
#endif
            dirty = true;
#if LAB_CHECKPOINT >= 3
            queryDirty = true;
#endif
        }
        if (!running)
            break;
#if LAB_CHECKPOINT >= 7
        const std::uint64_t now = SDL_GetTicksNS();
        if (!scene.paused) {
            const double dt = std::min(0.05, static_cast<double>(now - previous) / 1e9);
            scene.phase += dt * 0.8;
            scene.query.center = {0.5 + 0.33 * std::cos(scene.phase), 0.5 + 0.28 * std::sin(1.7 * scene.phase)};
            dirty = true;
            queryDirty = true;
        }
        previous = now;
#endif
#if LAB_CHECKPOINT >= 5
        if (scene.job.active) {
            lab::advanceJob(scene);
            dirty = true;
        }
#endif
#if LAB_CHECKPOINT >= 3
        if (queryDirty) {
            lab::refreshQuery(scene);
            queryDirty = false;
        }
#endif
        if (dirty) {
            lab::drawScene(image, scene);
            if (!SDL_UpdateTexture(texture, nullptr, image.pixels.data(), lab::Framebuffer::width * static_cast<int>(sizeof(std::uint32_t))) ||
                !SDL_RenderClear(renderer) ||
                !SDL_RenderTexture(renderer, texture, nullptr, nullptr) ||
                !lab::drawLabels(renderer, scene) ||
                !SDL_RenderPresent(renderer)) {
                std::cerr << SDL_GetError() << '\n';
                failed = true;
                running = false;
            }
            dirty = false;
        }
        if (smoke && ++frames >= 240)
            running = false;
        if (smoke && frames == 2) {
#if LAB_CHECKPOINT >= 6
            lab::requestBenchmark(scene, true);
#elif LAB_CHECKPOINT >= 5
            lab::requestBenchmark(scene, false);
#endif
        }
        SDL_Delay(smoke ? 1 : 16);
    }
    release();
#if LAB_CHECKPOINT >= 5
    if (smoke && scene.job.active)
        failed = true;
#endif
    SDL_DestroyTexture(texture);
    SDL_DestroyRenderer(renderer);
    SDL_DestroyWindow(window);
    SDL_Quit();
    return failed ? EXIT_FAILURE : EXIT_SUCCESS;
}
