#include "presentation.hpp"
#include <cstdlib>
#include <cstring>
#include <iostream>

namespace {
struct PointerState {
    bool dragging{};
    SDL_MouseID owner{};
};

void releasePointer(PointerState& pointer) {
    if (pointer.dragging) {
        if (!SDL_CaptureMouse(false)) {
            SDL_Log("Release capture: %s", SDL_GetError());
        }
    }
    pointer.dragging = false;
    pointer.owner = 0;
}

void applyKey(lab::Scene& scene, SDL_Keycode key) {
    if (key == SDLK_R) {
        lab::resetScene(scene);
    }
    if (key == SDLK_F) {
        scene.debug = !scene.debug;
    }
#if LAB_CHECKPOINT >= 0
    if (key == SDLK_SPACE) {
#if LAB_CHECKPOINT >= 8
        if (scene.job.active) {
            lab::stopScene(scene);
            return;
        }
#endif
        scene.paused = !scene.paused;
        scene.accumulator = 0;
    }
    if (key == SDLK_N) {
        lab::stopScene(scene);
        lab::stepScene(scene);
    }
    if (key == SDLK_LEFT) {
        scene.selected = (scene.selected + scene.boids.size() - 1) % scene.boids.size();
    }
    if (key == SDLK_RIGHT) {
        scene.selected = (scene.selected + 1) % scene.boids.size();
    }
#endif
#if LAB_CHECKPOINT >= 2
    if (key >= SDLK_1 && key <= SDLK_3) {
        constexpr std::size_t counts[]{256, 512, 1024};
        scene.count = counts[key - SDLK_1];
        lab::resetScene(scene);
    }
    if (key == SDLK_P) {
        ++scene.seed;
        lab::resetScene(scene);
    }
#endif
#if LAB_CHECKPOINT >= 3
    if (key == SDLK_T) {
        scene.params.radius = std::min(240.0, scene.params.radius + 4.0);
    }
    if (key == SDLK_G) {
        scene.params.radius = std::max(0.0, scene.params.radius - 4.0);
    }
#endif
#if LAB_CHECKPOINT >= 4
    if (key == SDLK_Q) {
        scene.params.separationWeight = std::min(5.0, scene.params.separationWeight + 0.1);
    }
    if (key == SDLK_A) {
        scene.params.separationWeight = std::max(0.0, scene.params.separationWeight - 0.1);
    }
#endif
#if LAB_CHECKPOINT >= 5
    if (key == SDLK_W) {
        scene.params.alignmentWeight = std::min(5.0, scene.params.alignmentWeight + 0.1);
    }
    if (key == SDLK_S) {
        scene.params.alignmentWeight = std::max(0.0, scene.params.alignmentWeight - 0.1);
    }
#endif
#if LAB_CHECKPOINT >= 6
    if (key == SDLK_E) {
        scene.params.cohesionWeight = std::min(5.0, scene.params.cohesionWeight + 0.1);
    }
    if (key == SDLK_D) {
        scene.params.cohesionWeight = std::max(0.0, scene.params.cohesionWeight - 0.1);
    }
#endif
#if LAB_CHECKPOINT >= 7
    if (key == SDLK_Y) {
        scene.params.maxSpeed = std::min(240.0, scene.params.maxSpeed + 5.0);
    }
    if (key == SDLK_H) {
        scene.params.maxSpeed = std::max(10.0, scene.params.maxSpeed - 5.0);
    }
    if (key == SDLK_U) {
        scene.params.maxAcceleration = std::min(240.0, scene.params.maxAcceleration + 5.0);
    }
    if (key == SDLK_J) {
        scene.params.maxAcceleration = std::max(10.0, scene.params.maxAcceleration - 5.0);
    }
#endif
#if LAB_CHECKPOINT >= 8
    // Thao tác xem/chọn không làm mất bảng đo; chỉ đổi mô hình mới bỏ kết quả cũ.
    const bool weightsChanged = key == SDLK_Q || key == SDLK_A || key == SDLK_W || key == SDLK_S || key == SDLK_E || key == SDLK_D;
    const bool limitsChanged = key == SDLK_T || key == SDLK_G || key == SDLK_Y || key == SDLK_H || key == SDLK_U || key == SDLK_J;
    if (weightsChanged || limitsChanged) {
        scene.job = {};
    }
    if (key == SDLK_B) {
        lab::stopScene(scene);
        scene.job = lab::createBenchmark(scene.seed, scene.params);
    }
#endif
}

void destroyResources(SDL_Texture* texture, SDL_Renderer* renderer, SDL_Window* window) {
    SDL_DestroyTexture(texture);
    SDL_DestroyRenderer(renderer);
    SDL_DestroyWindow(window);
    SDL_Quit();
}
} // namespace

int main(int argc, char** argv) {
    if (argc > 2) {
        std::cerr << "Pass at most one option: --smoke or --benchmark (final only)\n";
        return EXIT_FAILURE;
    }
    const bool smoke = argc > 1 && std::strcmp(argv[1], "--smoke") == 0;
#if LAB_CHECKPOINT >= 8
    if (argc > 1 && std::strcmp(argv[1], "--benchmark") == 0) {
        auto job = lab::createBenchmark(1U, {});
        for (int tick = 0; tick < 27; ++tick) {
            lab::tickBenchmark(job);
        }
        for (const auto& row : job.rows) {
            std::cout << "N=" << row.count << " samples=" << row.samples << " comparisons=" << row.comparisons << " median_ms=" << row.medianMs << " min_ms=" << row.minMs << " max_ms=" << row.maxMs << " checksum=" << row.checksum << '\n';
        }
        return EXIT_SUCCESS;
    }
#endif
    if (argc > 1 && !smoke) {
        std::cerr << "Unknown option for this checkpoint\n";
        return EXIT_FAILURE;
    }
    if (!SDL_Init(SDL_INIT_VIDEO)) {
        std::cerr << SDL_GetError() << '\n';
        return EXIT_FAILURE;
    }
    SDL_WindowFlags flags = SDL_WINDOW_RESIZABLE | SDL_WINDOW_HIGH_PIXEL_DENSITY;
    if (smoke) {
        flags |= SDL_WINDOW_HIDDEN;
    }
    SDL_Window* window = SDL_CreateWindow("Project 27 - Boids 2D", lab::Framebuffer::width, lab::Framebuffer::height, flags);
    if (!window) {
        std::cerr << SDL_GetError() << '\n';
        SDL_Quit();
        return EXIT_FAILURE;
    }
    SDL_Renderer* renderer = SDL_CreateRenderer(window, nullptr);
    if (!renderer) {
        std::cerr << SDL_GetError() << '\n';
        destroyResources(nullptr, nullptr, window);
        return EXIT_FAILURE;
    }
    SDL_Texture* texture = SDL_CreateTexture(renderer, SDL_PIXELFORMAT_RGBA8888, SDL_TEXTUREACCESS_STREAMING, lab::Framebuffer::width, lab::Framebuffer::height);
    if (!texture) {
        std::cerr << SDL_GetError() << '\n';
        destroyResources(nullptr, renderer, window);
        return EXIT_FAILURE;
    }
    if (!smoke && !SDL_SetRenderVSync(renderer, 1)) {
        SDL_Log("VSync unavailable: %s", SDL_GetError());
    }
    if (!SDL_SetRenderLogicalPresentation(renderer, lab::Framebuffer::width, lab::Framebuffer::height, SDL_LOGICAL_PRESENTATION_LETTERBOX)) {
        std::cerr << SDL_GetError() << '\n';
        destroyResources(texture, renderer, window);
        return EXIT_FAILURE;
    }
    bool failed = false;
    PointerState pointer{};
    try {
        lab::Framebuffer image{};
        lab::Scene scene{};
        lab::resetScene(scene);
        bool running = true;
        bool dirty = true;
        std::uint64_t previous = SDL_GetTicksNS();
        int frames = 0;
        while (running) {
            SDL_Event event{};
            while (SDL_PollEvent(&event)) {
                dirty = true;
                if (event.type == SDL_EVENT_QUIT) {
                    running = false;
                }
                if (event.type == SDL_EVENT_WINDOW_FOCUS_LOST || event.type == SDL_EVENT_WINDOW_PIXEL_SIZE_CHANGED) {
                    releasePointer(pointer);
                    lab::stopScene(scene);
                }
                if (event.type == SDL_EVENT_KEY_DOWN && !event.key.repeat) {
                    releasePointer(pointer);
                    if (event.key.key == SDLK_ESCAPE) {
#if LAB_CHECKPOINT >= 8
                        if (scene.job.active) {
                            lab::stopScene(scene);
                        } else {
                            running = false;
                        }
#else
                        running = false;
#endif
                    } else {
                        applyKey(scene, event.key.key);
                    }
                }
#if LAB_CHECKPOINT >= 0
                // SDL đổi tọa độ window/DPI sang logical board đúng một lần.
                if (event.type == SDL_EVENT_MOUSE_MOTION || event.type == SDL_EVENT_MOUSE_BUTTON_DOWN || event.type == SDL_EVENT_MOUSE_BUTTON_UP) {
                    if (!SDL_ConvertEventToRenderCoordinates(renderer, &event)) {
                        throw std::runtime_error(SDL_GetError());
                    }
                }
                if (event.type == SDL_EVENT_MOUSE_BUTTON_DOWN && event.button.button == SDL_BUTTON_LEFT && !pointer.dragging) {
                    const lab::Vec2 point{event.button.x, event.button.y};
                    if (lab::inViewport(point, scene.params)) {
                        scene.selected = lab::nearestBoid(scene, lab::screenToWorld(point));
                        if (SDL_CaptureMouse(true)) {
                            pointer.dragging = true;
                            pointer.owner = event.button.which;
                        }
                    }
                }
                if (event.type == SDL_EVENT_MOUSE_MOTION && pointer.dragging && event.motion.which == pointer.owner) {
                    if (!(event.motion.state & SDL_BUTTON_LMASK)) {
                        releasePointer(pointer);
                    } else if (scene.paused && lab::inViewport({event.motion.x, event.motion.y}, scene.params)) {
                        scene.boids[scene.selected].position = lab::screenToWorld({event.motion.x, event.motion.y});
                    }
                }
                if (event.type == SDL_EVENT_MOUSE_BUTTON_UP && event.button.button == SDL_BUTTON_LEFT && pointer.dragging && event.button.which == pointer.owner) {
                    if (scene.paused && lab::inViewport({event.button.x, event.button.y}, scene.params)) {
                        scene.boids[scene.selected].position = lab::screenToWorld({event.button.x, event.button.y});
                    }
                    releasePointer(pointer);
                }
#endif
            }
            if (!running) {
                break;
            }
            if (!scene.paused) {
                dirty = true;
            }
#if LAB_CHECKPOINT >= 8
            if (scene.job.active) {
                dirty = true;
            }
#endif
#if LAB_CHECKPOINT >= 0
            const std::uint64_t now = SDL_GetTicksNS();
            const double elapsed = static_cast<double>(now - previous) / 1e9;
            previous = now;
            if (smoke) {
                lab::stepScene(scene);
            } else {
                lab::advanceScene(scene, elapsed);
            }
#endif
            if (dirty || smoke) {
                lab::drawScene(image, scene);
                if (!lab::presentFrame(renderer, texture, image, scene)) {
                    throw std::runtime_error(SDL_GetError());
                }
                dirty = false;
                ++frames;
            }
            if (smoke && frames >= 6) {
                running = false;
            }
            if (scene.paused) {
                SDL_Delay(8);
            } else {
                SDL_Delay(1);
            }
        }
    } catch (const std::exception& error) {
        std::cerr << error.what() << '\n';
        failed = true;
    }
    releasePointer(pointer);
    destroyResources(texture, renderer, window);
    if (failed) {
        return EXIT_FAILURE;
    }
    return EXIT_SUCCESS;
}
