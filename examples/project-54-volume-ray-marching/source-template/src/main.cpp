#include "validation.hpp"
#include <cstdlib>
#include <iostream>
#include <string_view>

int main(int argc, char** argv) {
    bool verify = false;
    bool smoke = false;
    for (int i = 1; i < argc; ++i) {
        if (std::string_view(argv[i]) == "--verify-gpu") {
            verify = true;
        }
        if (std::string_view(argv[i]) == "--smoke-gpu") {
            smoke = true;
        }
    }
    // Khởi tạo SDL và OpenGL trước khi load bất kỳ entry point nào.
    if (!SDL_Init(SDL_INIT_VIDEO)) {
        std::cerr << SDL_GetError() << '\n';
        return EXIT_FAILURE;
    }
    if (!SDL_GL_SetAttribute(SDL_GL_CONTEXT_MAJOR_VERSION, 3) || !SDL_GL_SetAttribute(SDL_GL_CONTEXT_MINOR_VERSION, 3) || !SDL_GL_SetAttribute(SDL_GL_CONTEXT_PROFILE_MASK, SDL_GL_CONTEXT_PROFILE_CORE) || !SDL_GL_SetAttribute(SDL_GL_DOUBLEBUFFER, 1)) {
        std::cerr << SDL_GetError() << '\n';
        SDL_Quit();
        return EXIT_FAILURE;
    }

    SDL_WindowFlags flags = SDL_WINDOW_OPENGL | SDL_WINDOW_RESIZABLE | SDL_WINDOW_HIGH_PIXEL_DENSITY;
    if (verify || smoke) {
        flags |= SDL_WINDOW_HIDDEN;
    }
    SDL_Window* window = SDL_CreateWindow("Volume ray marching", 960, 720, flags);
    if (!window) {
        std::cerr << SDL_GetError() << '\n';
        SDL_Quit();
        return EXIT_FAILURE;
    }
    SDL_GLContext context = SDL_GL_CreateContext(window);
    if (!context) {
        std::cerr << SDL_GetError() << '\n';
        SDL_DestroyWindow(window);
        SDL_Quit();
        return EXIT_FAILURE;
    }

    fog::GlApi gl;
    fog::Renderer renderer;
    bool loaded = false;
    bool failed = false;
    try {
        gl.load();
        loaded = true;
        std::cout << "GL: " << gl.GetString(GL_VERSION) << " | " << gl.GetString(GL_RENDERER) << '\n';
        SDL_GL_SetSwapInterval(1);
        [[maybe_unused]] fog::Camera camera;
        [[maybe_unused]] fog::Settings settings;
#if LAB_CHECKPOINT >= 1
        renderer.initialize(gl, verify || smoke);
#endif
#if LAB_CHECKPOINT >= 4
        fog::Volume volume;
        int preset = 0;
        fog::fillVolume(volume, preset);
        renderer.upload(gl, volume);
#endif
#if LAB_CHECKPOINT >= 9
        if (verify) {
            fog::verifyGpu(gl, renderer);
        }
#else
        if (verify) {
            throw std::runtime_error("GPU oracle is introduced at checkpoint 9");
        }
#endif
#if LAB_CHECKPOINT >= 1
        if (smoke) {
            renderer.render(gl, camera, settings);
            gl.BindFramebuffer(GL_FRAMEBUFFER, renderer.framebuffer);
            float value[4]{};
            gl.ReadPixels(7, 5, 1, 1, GL_RGBA, GL_FLOAT, value);
            for (float component : value)
                if (!std::isfinite(component)) {
                    throw std::runtime_error("Nonfinite shader smoke output");
                }
            if (gl.GetError() != GL_NO_ERROR) {
                throw std::runtime_error("Shader smoke GL error");
            }
            gl.BindFramebuffer(GL_FRAMEBUFFER, 0);
            std::cout << "Shader smoke PASS\n";
        }
#endif
        bool running = !verify && !smoke;
#if LAB_CHECKPOINT >= 2
        bool dragging = false;
        bool paused = true;
        std::uint64_t previous = SDL_GetTicksNS();
        std::cout << "Drag/arrows orbit | wheel zoom | Space rotate/pause | I camera inside | R reset | Esc quit\n";
#endif
#if LAB_CHECKPOINT >= 4
        std::cout << "P phantom/ramp/constant volume\n";
#endif
#if LAB_CHECKPOINT >= 5
        std::cout << "+/- sigma\n";
#endif
#if LAB_CHECKPOINT >= 6
        std::cout << "Q step 0.02/0.04/0.08/0.16\n";
#endif
#if LAB_CHECKPOINT >= 7
        std::cout << "C transfer warm/cool\n";
#endif
#if LAB_CHECKPOINT >= 8
        std::cout << "E early termination threshold 0.001\n";
#endif
        while (running) {
            SDL_Event event{};
            while (SDL_PollEvent(&event)) {
                if (event.type == SDL_EVENT_QUIT) {
                    running = false;
                }
                if (event.type == SDL_EVENT_KEY_DOWN && event.key.key == SDLK_ESCAPE) {
                    running = false;
                }
#if LAB_CHECKPOINT >= 2
                if (event.type == SDL_EVENT_WINDOW_FOCUS_LOST || event.type == SDL_EVENT_WINDOW_MINIMIZED) {
                    paused = true;
                    dragging = false;
                    SDL_CaptureMouse(false);
                }
                if (event.type == SDL_EVENT_MOUSE_BUTTON_DOWN && event.button.button == SDL_BUTTON_LEFT) {
                    paused = true;
                    dragging = SDL_CaptureMouse(true);
                }
                if (event.type == SDL_EVENT_MOUSE_BUTTON_UP && event.button.button == SDL_BUTTON_LEFT) {
                    dragging = false;
                    SDL_CaptureMouse(false);
                }
                if (event.type == SDL_EVENT_MOUSE_MOTION && dragging) {
                    camera.yaw += event.motion.xrel * 0.005;
                    camera.pitch = std::clamp(camera.pitch - event.motion.yrel * 0.005, -1.2, 1.2);
                }
                if (event.type == SDL_EVENT_MOUSE_WHEEL) {
                    paused = true;
                    camera.distance = std::clamp(camera.distance - event.wheel.y * 0.3, 4.0, 12.0);
                }
                if (event.type == SDL_EVENT_KEY_DOWN && !event.key.repeat) {
                    if (event.key.key != SDLK_SPACE) {
                        paused = true;
                    }
                    if (event.key.key == SDLK_SPACE) {
                        paused = !paused;
                    }
                    if (event.key.key == SDLK_LEFT) {
                        camera.yaw -= 0.1;
                    }
                    if (event.key.key == SDLK_RIGHT) {
                        camera.yaw += 0.1;
                    }
                    if (event.key.key == SDLK_UP) {
                        camera.pitch = std::min(1.2, camera.pitch + 0.1);
                    }
                    if (event.key.key == SDLK_DOWN) {
                        camera.pitch = std::max(-1.2, camera.pitch - 0.1);
                    }
                    if (event.key.key == SDLK_I) {
                        camera.inside = !camera.inside;
                    }
                    if (event.key.key == SDLK_R) {
                        camera = {};
                        settings = {};
                        dragging = false;
                        SDL_CaptureMouse(false);
#if LAB_CHECKPOINT >= 4
                        preset = 0;
                        fog::fillVolume(volume, preset);
                        renderer.upload(gl, volume);
#endif
                    }
#if LAB_CHECKPOINT >= 4
                    if (event.key.key == SDLK_P) {
                        preset = (preset + 1) % 3;
                        fog::fillVolume(volume, preset);
                        renderer.upload(gl, volume);
                    }
#endif
#if LAB_CHECKPOINT >= 5
                    if (event.key.key == SDLK_EQUALS || event.key.key == SDLK_PLUS) {
                        settings.sigma = std::min(8.0, settings.sigma + 0.25);
                    }
                    if (event.key.key == SDLK_MINUS) {
                        settings.sigma = std::max(0.0, settings.sigma - 0.25);
                    }
#endif
#if LAB_CHECKPOINT >= 6
                    if (event.key.key == SDLK_Q) {
                        settings.stepLength *= 2;
                        if (settings.stepLength > 0.16) {
                            settings.stepLength = 0.02;
                        }
                    }
#endif
#if LAB_CHECKPOINT >= 7
                    if (event.key.key == SDLK_C) {
                        settings.warm = !settings.warm;
                    }
#endif
#if LAB_CHECKPOINT >= 8
                    if (event.key.key == SDLK_E) {
                        settings.early = !settings.early;
                    }
#endif
                }
#endif
            }
            if (!running) {
                break;
            }
#if LAB_CHECKPOINT >= 2
            const auto now = SDL_GetTicksNS();
            const double dt = std::min(0.1, static_cast<double>(now - previous) / 1e9);
            previous = now;
            if (!paused) {
                camera.yaw += dt * 0.3;
            }
#endif
            int width = 0;
            int height = 0;
            if (!SDL_GetWindowSizeInPixels(window, &width, &height)) {
                throw std::runtime_error(SDL_GetError());
            }
            if (width <= 0 || height <= 0) {
                SDL_Delay(16);
                continue;
            }
#if LAB_CHECKPOINT >= 1
            renderer.render(gl, camera, settings);
            renderer.display(gl, width, height);
#else
            gl.ClearColor(0.01F, 0.015F, 0.025F, 1);
            gl.Clear(GL_COLOR_BUFFER_BIT);
#endif
            if (gl.GetError() != GL_NO_ERROR) {
                throw std::runtime_error("Render GL error");
            }
            if (!SDL_GL_SwapWindow(window)) {
                throw std::runtime_error(SDL_GetError());
            }
            SDL_Delay(16);
        }
    } catch (const std::exception& error) {
        failed = true;
        std::cerr << error.what() << '\n';
    }

    // Giải phóng GL resource khi context còn sống, rồi context/window và SDL.
    if (loaded) {
        renderer.dispose(gl);
    }
    SDL_GL_DestroyContext(context);
    SDL_DestroyWindow(window);
    SDL_Quit();
    if (failed) {
        return EXIT_FAILURE;
    }
    return EXIT_SUCCESS;
}
