#include "presentation.hpp"
#include <cstdlib>
#include <iostream>
#include <string_view>

void handleKey(lab::Scene& scene, SDL_Keycode key, bool repeat) {
    if (!repeat && (key == SDLK_R || (key >= SDLK_F1 && key <= SDLK_F7))) {
        int index = 0;
        if (key != SDLK_R) {
            index = static_cast<int>(key - SDLK_F1);
        }
        lab::applyPreset(scene, index);
    }
    if (!repeat && key >= SDLK_1 && key <= SDLK_6) {
        scene.selectedStage = static_cast<int>(key - SDLK_1);
    }
#if LAB_CHECKPOINT >= 1
    if (!repeat && key == SDLK_V) {
        scene.selectedVertex = (scene.selectedVertex + 1) % scene.vertices.size();
        scene.paused = true;
    }
    const lab::Vec3 local = scene.vertices[scene.selectedVertex];
    if (key == SDLK_LEFT) {
        lab::setParameter(scene, lab::Parameter::LocalX, local.x - 0.1);
    }
    if (key == SDLK_RIGHT) {
        lab::setParameter(scene, lab::Parameter::LocalX, local.x + 0.1);
    }
    if (key == SDLK_UP) {
        lab::setParameter(scene, lab::Parameter::LocalY, local.y + 0.1);
    }
    if (key == SDLK_DOWN) {
        lab::setParameter(scene, lab::Parameter::LocalY, local.y - 0.1);
    }
    if (key == SDLK_PAGEUP) {
        lab::setParameter(scene, lab::Parameter::LocalZ, local.z + 0.1);
    }
    if (key == SDLK_PAGEDOWN) {
        lab::setParameter(scene, lab::Parameter::LocalZ, local.z - 0.1);
    }
#endif
#if LAB_CHECKPOINT >= 3
    constexpr double angleStep = 5.0 * lab::kPi / 180.0;
    if (key == SDLK_A) {
        lab::setParameter(scene, lab::Parameter::ModelX, scene.model.position.x - 0.2);
    }
    if (key == SDLK_D) {
        lab::setParameter(scene, lab::Parameter::ModelX, scene.model.position.x + 0.2);
    }
    if (key == SDLK_W) {
        lab::setParameter(scene, lab::Parameter::ModelZ, scene.model.position.z + 0.2);
    }
    if (key == SDLK_S) {
        lab::setParameter(scene, lab::Parameter::ModelZ, scene.model.position.z - 0.2);
    }
    if (key == SDLK_Q) {
        lab::setParameter(scene, lab::Parameter::ModelYaw, scene.model.yaw - angleStep);
    }
    if (key == SDLK_E) {
        lab::setParameter(scene, lab::Parameter::ModelYaw, scene.model.yaw + angleStep);
    }
    if (key == SDLK_U) {
        lab::setParameter(scene, lab::Parameter::ScaleX, scene.model.scale.x - 0.1);
    }
    if (key == SDLK_O) {
        lab::setParameter(scene, lab::Parameter::ScaleX, scene.model.scale.x + 0.1);
    }
#endif
#if LAB_CHECKPOINT >= 4
    if (key == SDLK_J) {
        lab::setParameter(scene, lab::Parameter::CameraYaw, scene.camera.yaw - angleStep);
    }
    if (key == SDLK_L) {
        lab::setParameter(scene, lab::Parameter::CameraYaw, scene.camera.yaw + angleStep);
    }
    if (key == SDLK_I) {
        lab::setParameter(scene, lab::Parameter::CameraPitch, scene.camera.pitch + angleStep);
    }
    if (key == SDLK_K) {
        lab::setParameter(scene, lab::Parameter::CameraPitch, scene.camera.pitch - angleStep);
    }
    if (key == SDLK_Z) {
        lab::setParameter(scene, lab::Parameter::CameraZ, scene.camera.position.z - 0.2);
    }
    if (key == SDLK_X) {
        lab::setParameter(scene, lab::Parameter::CameraZ, scene.camera.position.z + 0.2);
    }
#endif
#if LAB_CHECKPOINT >= 5
    if (key == SDLK_LEFTBRACKET) {
        lab::setParameter(scene, lab::Parameter::Fov, scene.lens.verticalFovRadians - angleStep);
    }
    if (key == SDLK_RIGHTBRACKET) {
        lab::setParameter(scene, lab::Parameter::Fov, scene.lens.verticalFovRadians + angleStep);
    }
    if (key == SDLK_MINUS) {
        lab::setParameter(scene, lab::Parameter::Near, scene.lens.nearPlane - 0.1);
    }
    if (key == SDLK_EQUALS || key == SDLK_PLUS) {
        lab::setParameter(scene, lab::Parameter::Near, scene.lens.nearPlane + 0.1);
    }
    if (key == SDLK_9) {
        lab::setParameter(scene, lab::Parameter::Far, scene.lens.farPlane - 1.0);
    }
    if (key == SDLK_0) {
        lab::setParameter(scene, lab::Parameter::Far, scene.lens.farPlane + 1.0);
    }
#endif
#if LAB_CHECKPOINT >= 7
    if (!repeat && key == SDLK_SPACE) {
        scene.paused = !scene.paused;
    }
    if (!repeat && key == SDLK_N && scene.paused) {
        scene.model.yaw = lab::advanceModelYaw(scene.model.yaw, 35.0 * lab::kPi / 180.0, 1.0 / 30.0);
    }
    if (!repeat && key == SDLK_F) {
        scene.debug = !scene.debug;
        scene.paused = true;
    }
#endif
}

int main(int argc, char** argv) {
    const bool smoke = argc > 1 && std::string_view(argv[1]) == "--smoke";
    // Khởi tạo SDL, window, renderer và texture; lỗi ở bước nào thì nhả tài nguyên đã tạo trước đó.
    if (!SDL_Init(SDL_INIT_VIDEO)) {
        std::cerr << SDL_GetError() << '\n';
        return EXIT_FAILURE;
    }
    SDL_WindowFlags flags = SDL_WINDOW_RESIZABLE | SDL_WINDOW_HIGH_PIXEL_DENSITY;
    if (smoke) {
        flags |= SDL_WINDOW_HIDDEN;
    }
    SDL_Window* window = SDL_CreateWindow("Project 15 - 3D Pipeline Inspector", 1100, 800, flags);
    if (!window) {
        std::cerr << SDL_GetError() << '\n';
        SDL_Quit();
        return EXIT_FAILURE;
    }
    SDL_Renderer* renderer = SDL_CreateRenderer(window, nullptr);
    if (!renderer) {
        std::cerr << SDL_GetError() << '\n';
        SDL_DestroyWindow(window);
        SDL_Quit();
        return EXIT_FAILURE;
    }
    if (!SDL_SetWindowMinimumSize(window, 770, 560) || !SDL_SetRenderLogicalPresentation(renderer, 1100, 800, SDL_LOGICAL_PRESENTATION_LETTERBOX)) {
        std::cerr << SDL_GetError() << '\n';
        SDL_DestroyRenderer(renderer);
        SDL_DestroyWindow(window);
        SDL_Quit();
        return EXIT_FAILURE;
    }
    SDL_Texture* texture = lab::createFramebufferTexture(renderer);
    if (!texture) {
        std::cerr << SDL_GetError() << '\n';
        SDL_DestroyRenderer(renderer);
        SDL_DestroyWindow(window);
        SDL_Quit();
        return EXIT_FAILURE;
    }

    // State và framebuffer chỉ được tạo một lần; resize không nhân bộ nhớ theo kích thước window.
    lab::Scene scene;
    lab::Framebuffer image;
    bool running = true;
    bool failed = false;
    bool dirty = true;
    int frames = 0;
    std::uint64_t previousTicks = SDL_GetTicks();
    while (running) {
        SDL_Event event{};
        while (SDL_PollEvent(&event)) {
            if (event.type == SDL_EVENT_QUIT || (event.type == SDL_EVENT_KEY_DOWN && event.key.key == SDLK_ESCAPE)) {
                running = false;
            }
            if (event.type == SDL_EVENT_WINDOW_FOCUS_LOST || event.type == SDL_EVENT_WINDOW_HIDDEN ||
                event.type == SDL_EVENT_WINDOW_MINIMIZED || event.type == SDL_EVENT_WINDOW_RESIZED || event.type == SDL_EVENT_WINDOW_PIXEL_SIZE_CHANGED) {
                scene.paused = true;
                dirty = true;
            }
            if (event.type == SDL_EVENT_WINDOW_EXPOSED || event.type == SDL_EVENT_WINDOW_SHOWN) {
                dirty = true;
            }
            if (event.type == SDL_EVENT_KEY_DOWN) {
                handleKey(scene, event.key.key, event.key.repeat);
                dirty = true;
            }
#if LAB_CHECKPOINT >= 1
            if (event.type == SDL_EVENT_MOUSE_BUTTON_DOWN && event.button.button == SDL_BUTTON_LEFT) {
                if (!SDL_ConvertEventToRenderCoordinates(renderer, &event)) {
                    failed = true;
                    running = false;
                    break;
                }
                const auto vertex = lab::pickVertex({event.button.x, event.button.y}, scene);
                if (vertex) {
                    scene.selectedVertex = *vertex;
                    scene.paused = true;
                    dirty = true;
                }
            }
#endif
        }
        if (!running) {
            break;
        }
        const auto now = SDL_GetTicks();
        const double deltaTime = static_cast<double>(now - previousTicks) / 1000.0;
        previousTicks = now;
        const double oldYaw = scene.model.yaw;
        lab::advanceScene(scene, deltaTime);
        if (scene.model.yaw != oldYaw) {
            dirty = true;
        }

        // Smoke ẩn đi qua chính key handler và đường upload/present; không giả nhận đã kiểm mouse thật.
        if (smoke) {
            dirty = true;
            ++frames;
            if (frames == 1) {
                handleKey(scene, SDLK_F2, false);
            }
#if LAB_CHECKPOINT >= 5
            if (frames == 2) {
                handleKey(scene, SDLK_EQUALS, false);
                handleKey(scene, SDLK_9, false);
                if (std::abs(scene.lens.nearPlane - 1.1) > 1e-9 || std::abs(scene.lens.farPlane - 8.0) > 1e-9) {
                    failed = true;
                }
            }
#endif
            if (frames == 3 && !SDL_SetWindowSize(window, 880, 640)) {
                failed = true;
            }
#if LAB_CHECKPOINT >= 7
            if (frames == 4) {
                handleKey(scene, SDLK_SPACE, false);
            }
            if (frames == 7) {
                handleKey(scene, SDLK_F, false);
            }
#endif
            if (frames >= 12) {
                running = false;
            }
        }
        if (dirty) {
            lab::drawScene(image, scene);
            const lab::Inspection inspection = lab::inspectScene(scene);
            if (!SDL_UpdateTexture(texture, nullptr, image.pixels.data(), lab::Framebuffer::width * static_cast<int>(sizeof(std::uint32_t))) ||
                !lab::presentFramebuffer(renderer, texture, scene, inspection)) {
                std::cerr << SDL_GetError() << '\n';
                failed = true;
                break;
            }
            dirty = false;
        }
        SDL_Delay(16);
    }

    // Giải phóng texture trước renderer và window, kể cả khi upload/present thất bại.
    SDL_DestroyTexture(texture);
    SDL_DestroyRenderer(renderer);
    SDL_DestroyWindow(window);
    SDL_Quit();
    if (failed) {
        return EXIT_FAILURE;
    }
    return EXIT_SUCCESS;
}
