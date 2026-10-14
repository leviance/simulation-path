#include "validation.hpp"
#include "view.hpp"
#include <cstdlib>
#include <iomanip>
#include <iostream>
#include <sstream>

int main(int, char**) {
    // Khởi tạo SDL, window và renderer. Starter chỉ có nền trống.
    if (!SDL_Init(SDL_INIT_VIDEO)) {
        std::cerr << SDL_GetError() << '\n';
        return EXIT_FAILURE;
    }

    SDL_Window* window = SDL_CreateWindow("Ray intersection lab", picking::viewWidth, picking::viewHeight, SDL_WINDOW_RESIZABLE | SDL_WINDOW_HIGH_PIXEL_DENSITY);
    if (window == nullptr) {
        std::cerr << SDL_GetError() << '\n';
        SDL_Quit();
        return EXIT_FAILURE;
    }

    SDL_Renderer* renderer = SDL_CreateRenderer(window, nullptr);
    if (renderer == nullptr) {
        std::cerr << SDL_GetError() << '\n';
        SDL_DestroyWindow(window);
        SDL_Quit();
        return EXIT_FAILURE;
    }

    if (!SDL_SetRenderLogicalPresentation(renderer, picking::viewWidth, picking::viewHeight, SDL_LOGICAL_PRESENTATION_LETTERBOX)) {
        std::cerr << SDL_GetError() << '\n';
        SDL_DestroyRenderer(renderer);
        SDL_DestroyWindow(window);
        SDL_Quit();
        return EXIT_FAILURE;
    }

    bool running = true;
    bool failed = false;
    [[maybe_unused]] picking::Scene scene;
    [[maybe_unused]] picking::Camera camera;
#if LAB_CHECKPOINT >= 2
    double u = 0.5;
    double v = 0.5;
    double tMax = 30;
    std::cout << "Mouse / arrows: aim | R reset | Esc quit\n";
#endif
#if LAB_CHECKPOINT >= 7
    bool paused = true;
    int preset = 0;
    std::cout << "1 room | 2 inside sphere | 3 inside box | 4 miss | Space scan/pause | +/- range | I inspector\n";
#endif
#if LAB_CHECKPOINT >= 8
    std::cout << "V: validate current hits against surface equations\n";
#endif

    while (running && !failed) {
        // Read input in logical renderer coordinates, not window or framebuffer pixels.
        SDL_Event event{};
        while (SDL_PollEvent(&event)) {
            if (event.type == SDL_EVENT_QUIT)
                running = false;
            if (event.type == SDL_EVENT_KEY_DOWN && event.key.key == SDLK_ESCAPE)
                running = false;
#if LAB_CHECKPOINT >= 2
            if (event.type == SDL_EVENT_MOUSE_MOTION) {
                if (!SDL_ConvertEventToRenderCoordinates(renderer, &event)) {
                    failed = true;
                    break;
                }
                if (event.motion.x >= 0 && event.motion.x <= picking::viewWidth && event.motion.y >= 0 && event.motion.y <= picking::viewHeight) {
                    u = event.motion.x / picking::viewWidth;
                    v = event.motion.y / picking::viewHeight;
#if LAB_CHECKPOINT >= 7
                    paused = true;
#endif
                }
            }
            if (event.type == SDL_EVENT_KEY_DOWN) {
#if LAB_CHECKPOINT >= 7
                if (event.key.key == SDLK_LEFT || event.key.key == SDLK_RIGHT || event.key.key == SDLK_UP || event.key.key == SDLK_DOWN)
                    paused = true;
#endif
                if (event.key.key == SDLK_LEFT)
                    u = std::max(0.0, u - 0.02);
                if (event.key.key == SDLK_RIGHT)
                    u = std::min(1.0, u + 0.02);
                if (event.key.key == SDLK_UP)
                    v = std::max(0.0, v - 0.02);
                if (event.key.key == SDLK_DOWN)
                    v = std::min(1.0, v + 0.02);
                if (event.key.key == SDLK_R) {
                    u = 0.5;
                    v = 0.5;
                    tMax = 30;
                    camera = {};
#if LAB_CHECKPOINT >= 7
                    paused = true;
                    preset = 0;
#endif
                }
            }
#endif
#if LAB_CHECKPOINT >= 7
            if (event.type == SDL_EVENT_WINDOW_FOCUS_LOST || event.type == SDL_EVENT_WINDOW_MINIMIZED)
                paused = true;
            if (event.type == SDL_EVENT_KEY_DOWN && !event.key.repeat) {
                if (event.key.key == SDLK_SPACE)
                    paused = !paused;
                if (event.key.key == SDLK_EQUALS || event.key.key == SDLK_PLUS)
                    tMax = std::min(30.0, tMax + 1);
                if (event.key.key == SDLK_MINUS)
                    tMax = std::max(0.1, tMax - 1);
                if (event.key.key >= SDLK_1 && event.key.key <= SDLK_4) {
                    preset = static_cast<int>(event.key.key - SDLK_1);
                    camera = picking::presetCamera(preset, scene);
                    u = 0.5;
                    v = 0.5;
                    paused = true;
                }
                if (event.key.key == SDLK_I) {
                    const auto ray = picking::cameraRay(camera, u, v, static_cast<double>(picking::viewWidth) / picking::viewHeight, tMax);
                    const auto hits = picking::candidates(ray, scene);
                    const auto interval = picking::boxInterval(ray, scene.box);
                    if (interval) {
                        std::cout << "box interval: entry=" << interval->entry << " exit=" << interval->exit << " (before range clipping)\n";
                    }
                    for (const auto& hit : hits) {
                        if (hit) {
                            std::cout << std::setprecision(8) << "id=" << hit->objectId << " t=" << hit->t << " point=" << hit->point.x << ',' << hit->point.y << ',' << hit->point.z << " normal=" << hit->normal.x << ',' << hit->normal.y << ',' << hit->normal.z << " front=" << hit->frontFace << " bary=" << 1 - hit->u - hit->v << ',' << hit->u << ',' << hit->v << '\n';
                        }
                    }
                }
            }
#endif
#if LAB_CHECKPOINT >= 8
            if (event.type == SDL_EVENT_KEY_DOWN && !event.key.repeat && event.key.key == SDLK_V) {
                paused = true;
                const auto value = picking::cameraRay(camera, u, v, static_cast<double>(picking::viewWidth) / picking::viewHeight, tMax);
                const auto report = picking::validateHits(value, scene, picking::candidates(value, scene));
                std::cout << "Hit validation: checks=" << report.checks << " failures=" << report.failures << " (does not prove missed hits)\n";
            }
#endif
        }
        if (failed || !running)
            break;

#if LAB_CHECKPOINT >= 7
        // Optional scan is bounded and never enabled automatically.
        if (!paused)
            u = 0.5 + 0.35 * std::sin(static_cast<double>(SDL_GetTicks()) * 0.0008);
#endif
        SDL_SetRenderDrawColor(renderer, 11, 16, 32, 255);
        if (!SDL_RenderClear(renderer)) {
            failed = true;
            break;
        }
#if LAB_CHECKPOINT >= 1
        picking::drawScene(renderer, scene, camera);
#endif
#if LAB_CHECKPOINT >= 2
        const auto ray = picking::cameraRay(camera, u, v, static_cast<double>(picking::viewWidth) / picking::viewHeight, tMax);
        picking::drawRay(renderer, ray, u, v);
        std::ostringstream title;
        title << std::fixed << std::setprecision(3) << "Ray | direction=" << ray.direction.x << ',' << ray.direction.y << ',' << ray.direction.z << " | range=" << tMax;
#endif
#if LAB_CHECKPOINT >= 3
        const auto hits = picking::candidates(ray, scene);
        for (const auto& hit : hits) {
            if (hit) {
                picking::drawHit(renderer, *hit, camera, false);
                title << " | id" << hit->objectId << " t=" << hit->t;
            }
        }
#endif
#if LAB_CHECKPOINT >= 7
        const auto best = picking::nearestHit(hits);
        if (best) {
            picking::drawHit(renderer, *best, camera, true);
            title << " | nearest=" << best->objectId << " front=" << best->frontFace;
        } else {
            title << " | MISS";
        }
#endif
#if LAB_CHECKPOINT >= 2
        SDL_SetWindowTitle(window, title.str().c_str());
#endif
        if (!SDL_RenderPresent(renderer))
            failed = true;
        SDL_Delay(16);
    }

    if (failed)
        std::cerr << SDL_GetError() << '\n';

    // Giải phóng renderer trước window; không có GPU compute hay thread phụ.
    SDL_DestroyRenderer(renderer);
    SDL_DestroyWindow(window);
    SDL_Quit();
    if (failed)
        return EXIT_FAILURE;
    return EXIT_SUCCESS;
}
