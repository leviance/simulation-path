#include "controls.hpp"
#include "presentation.hpp"
#include <cstdlib>
#include <filesystem>
#include <iostream>
#include <string_view>

int main(int argc, char** argv) {
    bool smoke = false;
    std::string requestedPath{};
    for (int index = 1; index < argc; ++index) {
        if (std::string_view(argv[index]) == "--smoke") {
            smoke = true;
        } else {
            requestedPath = argv[index];
        }
    }
    // Khởi tạo SDL từng bước; lỗi ở đâu thì dọn những tài nguyên đã tạo trước đó.
    if (!SDL_Init(SDL_INIT_VIDEO)) {
        std::cerr << SDL_GetError() << '\n';
        return EXIT_FAILURE;
    }
    SDL_WindowFlags flags = SDL_WINDOW_RESIZABLE | SDL_WINDOW_HIGH_PIXEL_DENSITY;
    if (smoke) {
        flags |= SDL_WINDOW_HIDDEN;
    }
    SDL_Window* window = SDL_CreateWindow("Project 21 - CPU OBJ Viewer", 800, 600, flags);
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
    // Framebuffer logic cố định; SDL letterbox khi resize, không kéo méo hình.
    if (!SDL_SetWindowMinimumSize(window, 640, 480) || !SDL_SetRenderLogicalPresentation(renderer, 800, 600, SDL_LOGICAL_PRESENTATION_LETTERBOX)) {
        std::cerr << SDL_GetError() << '\n';
        SDL_DestroyRenderer(renderer);
        SDL_DestroyWindow(window);
        SDL_Quit();
        return EXIT_FAILURE;
    }
    SDL_Texture* texture = SDL_CreateTexture(renderer, SDL_PIXELFORMAT_RGBA8888, SDL_TEXTUREACCESS_STREAMING, 800, 500);
    if (!texture || !SDL_SetTextureScaleMode(texture, SDL_SCALEMODE_NEAREST)) {
        std::cerr << SDL_GetError() << '\n';
        SDL_DestroyTexture(texture);
        SDL_DestroyRenderer(renderer);
        SDL_DestroyWindow(window);
        SDL_Quit();
        return EXIT_FAILURE;
    }

    lab::ViewerState state{};
    lab::Framebuffer frame{};
    bool running = true;
    bool failed = false;
    bool dirty = true;
    bool dragging = false;
    SDL_MouseID owner{};
    float previousX = 0.0F;
    float previousY = 0.0F;
    lab::ViewerModel model{};
#if LAB_CHECKPOINT >= 1
    const auto loadBuiltin = [&](const char* name) {
        std::string path = std::string(SDL_GetBasePath()) + "assets/" + name;
        std::error_code error{};
        if (!std::filesystem::exists(std::filesystem::path(std::u8string(path.begin(), path.end())), error)) {
            path = std::string("assets/") + name;
        }
        return lab::openModel(model, path);
    };
    const auto reportLoad = [&](bool loaded) {
        if (!loaded) {
            std::cerr << model.message << '\n';
        } else {
            SDL_SetWindowTitle(window, ("P21 | " + model.path).c_str());
        }
        return loaded;
    };
    bool loaded = false;
    if (!requestedPath.empty()) {
        loaded = lab::openModel(model, requestedPath);
    } else {
#if LAB_CHECKPOINT >= 8
        loaded = loadBuiltin("cube.obj");
#else
        loaded = loadBuiltin("low-poly-rocket.obj");
#endif
    }
    if (!reportLoad(loaded)) {
        failed = true;
        running = false;
    }
#else
    (void)requestedPath;
#endif
    const auto cancelDrag = [&]() {
        dragging = false;
        SDL_CaptureMouse(false);
    };
    const auto movePointer = [&](float x, float y) {
        lab::turnViewer(state, double(x - previousX) * 0.008, double(y - previousY) * 0.008);
        previousX = x;
        previousY = y;
        dirty = true;
    };
    int frames = 0;
    std::uint64_t previous = SDL_GetTicks();

    while (running) {
        SDL_Event event{};
        while (SDL_PollEvent(&event)) {
            if (event.type == SDL_EVENT_QUIT || (event.type == SDL_EVENT_KEY_DOWN && event.key.key == SDLK_ESCAPE)) {
                running = false;
            }
            if (event.type == SDL_EVENT_KEY_DOWN && (event.key.mod & (SDL_KMOD_CTRL | SDL_KMOD_ALT | SDL_KMOD_GUI)) == 0) {
                cancelDrag();
                lab::handleKey(state, event.key.key, event.key.repeat);
#if LAB_CHECKPOINT >= 8
                if (!event.key.repeat) {
                    if (event.key.key == SDLK_1) {
                        reportLoad(loadBuiltin("cube.obj"));
                    }
                    if (event.key.key == SDLK_2) {
                        reportLoad(loadBuiltin("faceted-sphere.obj"));
                    }
                    if (event.key.key == SDLK_3) {
                        reportLoad(loadBuiltin("low-poly-rocket.obj"));
                    }
                }
#endif
                dirty = true;
            }
#if LAB_CHECKPOINT >= 8
            if (event.type == SDL_EVENT_DROP_FILE && event.drop.data) {
                cancelDrag();
                reportLoad(lab::openModel(model, event.drop.data));
                state.paused = true;
                dirty = true;
            }
#endif
            if (event.type == SDL_EVENT_WINDOW_FOCUS_LOST || event.type == SDL_EVENT_WINDOW_HIDDEN || event.type == SDL_EVENT_WINDOW_MINIMIZED || event.type == SDL_EVENT_WINDOW_RESIZED || event.type == SDL_EVENT_WINDOW_PIXEL_SIZE_CHANGED) {
                cancelDrag();
                state.paused = true;
                dirty = true;
            }
            if (event.type == SDL_EVENT_WINDOW_EXPOSED || event.type == SDL_EVENT_WINDOW_SHOWN || event.type == SDL_EVENT_WINDOW_RESTORED) {
                dirty = true;
            }
            const bool mouse = event.type == SDL_EVENT_MOUSE_BUTTON_DOWN || event.type == SDL_EVENT_MOUSE_MOTION || event.type == SDL_EVENT_MOUSE_BUTTON_UP;
            if (mouse && !SDL_ConvertEventToRenderCoordinates(renderer, &event)) {
                failed = true;
                running = false;
                break;
            }
            if (event.type == SDL_EVENT_MOUSE_BUTTON_DOWN && event.button.button == SDL_BUTTON_LEFT && !dragging && event.button.x >= 0 && event.button.x < 800 && event.button.y >= 0 && event.button.y < 500) {
                owner = event.button.which;
                previousX = event.button.x;
                previousY = event.button.y;
                dragging = SDL_CaptureMouse(true);
                state.paused = true;
            }
            if (event.type == SDL_EVENT_MOUSE_MOTION && dragging && event.motion.which == owner) {
                if ((event.motion.state & SDL_BUTTON_LMASK) == 0) {
                    cancelDrag();
                } else {
                    movePointer(event.motion.x, event.motion.y);
                }
            }
            if (event.type == SDL_EVENT_MOUSE_BUTTON_UP && event.button.button == SDL_BUTTON_LEFT && dragging && event.button.which == owner) {
                // Mouse-up có thể mang sample cuối chưa xuất hiện trong mouse-motion.
                movePointer(event.button.x, event.button.y);
                cancelDrag();
            }
            if (event.type == SDL_EVENT_MOUSE_WHEEL) {
                cancelDrag();
                state.distance = std::clamp(state.distance - event.wheel.y * 0.2, 1.1, 9.0);
                state.paused = true;
                dirty = true;
            }
        }
        if (!running) {
            break;
        }

        const auto now = SDL_GetTicks();
        const double dt = double(now - previous) / 1000.0;
        previous = now;
        if ((SDL_GetWindowFlags(window) & SDL_WINDOW_INPUT_FOCUS) != 0 && (SDL_GetModState() & (SDL_KMOD_CTRL | SDL_KMOD_ALT | SDL_KMOD_GUI)) == 0) {
            dirty = lab::heldInput(state, SDL_GetKeyboardState(nullptr), dt) || dirty;
        }
        dirty = lab::advanceViewer(state, dt) || dirty;
        // Smoke có số frame hữu hạn; guardian bên ngoài còn đặt hard timeout.
        if (smoke) {
            dirty = true;
            ++frames;
#if LAB_CHECKPOINT >= 8
            if (frames == 2 && !reportLoad(loadBuiltin("faceted-sphere.obj"))) {
                failed = true;
            }
            if (frames == 4 && !reportLoad(loadBuiltin("cube.obj"))) {
                failed = true;
            }
            if (frames == 5) {
                state.cameraDrag = true;
                lab::turnViewer(state, 0.5, 0.3);
                state.normals = true;
            }
            if (frames == 6) {
                state.wireframe = true;
            }
#endif
            if (frames == 3 && !SDL_SetWindowSize(window, 900, 650)) {
                failed = true;
            }
            if (frames >= 8) {
                running = false;
            }
        }
        if (dirty) {
            const std::uint64_t start = SDL_GetPerformanceCounter();
            const auto stats = lab::renderViewer(frame, state, model);
            const double renderMs = double(SDL_GetPerformanceCounter() - start) * 1000.0 / double(SDL_GetPerformanceFrequency());
            if (!SDL_UpdateTexture(texture, nullptr, frame.pixels.data(), frame.width * int(sizeof(std::uint32_t))) || !lab::presentFramebuffer(renderer, texture, state, stats, renderMs, model)) {
                std::cerr << SDL_GetError() << '\n';
                failed = true;
                break;
            }
            dirty = false;
        }
        SDL_Delay(16);
    }

    // Giải phóng capture cả khi file/render lỗi hoặc người dùng đóng cửa sổ.
    cancelDrag();
    SDL_DestroyTexture(texture);
    SDL_DestroyRenderer(renderer);
    SDL_DestroyWindow(window);
    SDL_Quit();
    if (failed) {
        return EXIT_FAILURE;
    }
    return EXIT_SUCCESS;
}
