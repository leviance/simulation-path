#pragma once
#include "viewer-backends.hpp"
#include "viewer-benchmark.hpp"
#include "viewer-hud.hpp"
#include "viewer-timing.hpp"
#include "viewer-validation.hpp"
#include <iostream>

namespace lab {
#if LAB_CHECKPOINT >= 3
inline std::string viewerUtf8Path(const std::filesystem::path& path) {
    const auto bytes = path.u8string();
    return {bytes.begin(), bytes.end()};
}

inline bool captureViewer(GlApi& gl, int width, int height, const char* path) {
    const std::size_t pitch = std::size_t(width) * 4;
    std::vector<std::uint8_t> pixels(pitch * height);
    gl.ReadPixels(0, 0, width, height, GL_RGBA, GL_UNSIGNED_BYTE, pixels.data());
    for (int y = 0; y < height / 2; ++y) {
        auto top = pixels.begin() + std::size_t(y) * pitch;
        std::swap_ranges(top, top + pitch, pixels.begin() + std::size_t(height - 1 - y) * pitch);
    }
    SDL_Surface* surface = SDL_CreateSurfaceFrom(width, height, SDL_PIXELFORMAT_RGBA32, pixels.data(), int(pitch));
    if (!surface)
        return false;
    const bool saved = SDL_SaveBMP(surface, path);
    SDL_DestroySurface(surface);
    return saved && gl.GetError() == GL_NO_ERROR;
}

inline int runViewerApplication(int argc, char** argv) {
    bool finite = false;
#if LAB_CHECKPOINT >= 9
    bool verify = false, benchmark = false;
#endif
    const char* capturePath = nullptr;
    std::size_t initialMesh = 0;
    RendererKind initialBackend = RendererKind::cpu;
#if LAB_CHECKPOINT >= 4
    initialBackend = RendererKind::gpu;
#endif
    for (int index = 1; index < argc; ++index) {
        const std::string argument = argv[index];
        if (argument == "--smoke")
            finite = true;
#if LAB_CHECKPOINT >= 9
        else if (argument == "--verify") {
            verify = true;
            finite = true;
        } else if (argument == "--benchmark") {
            benchmark = true;
            finite = true;
        }
#endif
        else if (argument == "--cpu")
            initialBackend = RendererKind::cpu;
        else if (argument == "--capture" && index + 1 < argc) {
            capturePath = argv[++index];
            finite = true;
        } else if (argument == "--mesh" && index + 1 < argc) {
            const std::string value = argv[++index];
            if (value != "1" && value != "2" && value != "3")
                return EXIT_FAILURE;
            initialMesh = std::size_t(value[0] - '1');
        } else {
            std::cerr << "Usage: project_34_final [--mesh 1|2|3] [--cpu] [--smoke] [--capture image.bmp] [--verify | --benchmark]\n";
            return EXIT_FAILURE;
        }
    }
    if (!SDL_Init(SDL_INIT_VIDEO)) {
        std::cerr << SDL_GetError();
        return EXIT_FAILURE;
    }
    SDL_Window* window = nullptr;
    SDL_GLContext context = nullptr;
    GlApi gl{};
    bool glLoaded = false;
    std::array<ViewerMesh, 3> meshes{};
    ViewerBackends renderers{};
    int result = EXIT_SUCCESS;
    try {
        if (!SDL_GL_SetAttribute(SDL_GL_CONTEXT_MAJOR_VERSION, 3) || !SDL_GL_SetAttribute(SDL_GL_CONTEXT_MINOR_VERSION, 3) ||
            !SDL_GL_SetAttribute(SDL_GL_CONTEXT_PROFILE_MASK, SDL_GL_CONTEXT_PROFILE_CORE) || !SDL_GL_SetAttribute(SDL_GL_DOUBLEBUFFER, 1) || !SDL_GL_SetAttribute(SDL_GL_DEPTH_SIZE, 24))
            throw std::runtime_error(SDL_GetError());
        SDL_WindowFlags flags = SDL_WINDOW_OPENGL | SDL_WINDOW_RESIZABLE | SDL_WINDOW_HIGH_PIXEL_DENSITY;
        if (finite)
            flags |= SDL_WINDOW_HIDDEN;
        window = SDL_CreateWindow("Project 34 - One model viewer, CPU and GPU", 1120, 820, flags);
        if (!window)
            throw std::runtime_error(SDL_GetError());
        SDL_SetWindowMinimumSize(window, 640, 460);
        context = SDL_GL_CreateContext(window);
        if (!context || !SDL_GL_MakeCurrent(window, context))
            throw std::runtime_error(SDL_GetError());
        if (!gl.load())
            throw std::runtime_error("Missing OpenGL function: " + gl.missingFunction);
        glLoaded = true;
        const bool vsync = !finite && SDL_GL_SetSwapInterval(1);
        if (finite)
            SDL_GL_SetSwapInterval(0);
        std::cout << gl.GetString(GL_VERSION) << '\n'
                  << gl.GetString(GL_RENDERER) << '\n';
        std::string diagnostics;
        const char* basePath = SDL_GetBasePath();
        if (!basePath)
            throw std::runtime_error(SDL_GetError());
        const std::string base(basePath);
        const auto assets = std::filesystem::path(std::u8string(base.begin(), base.end())) / "assets";
        const std::array<const char*, 3> files{"low-poly-rocket.obj", "faceted-sphere.obj", "cube.obj"};
        for (std::size_t index = 0; index < meshes.size(); ++index) {
            auto loaded = loadViewerMesh(viewerUtf8Path(assets / files[index]), diagnostics);
            if (!loaded)
                throw std::runtime_error(diagnostics);
            meshes[index] = std::move(*loaded);
            std::cout << meshes[index].name << ": " << meshes[index].triangleCount() << " triangles\n";
        }
        if (!renderers.initialize(gl, meshes, diagnostics))
            throw std::runtime_error("Renderer initialization: " + diagnostics);
        ViewerScene scene{};
        scene.meshIndex = initialMesh;
        RendererKind backend = initialBackend;
#if LAB_CHECKPOINT >= 9
        if (verify && benchmark)
            throw std::invalid_argument("Choose --verify or --benchmark, not both");
        if (verify)
            verifyViewer(gl, window, meshes, renderers);
        if (benchmark)
            benchmarkViewer(gl, window, meshes, renderers, initialMesh);
#endif
        ViewerFrameStats previousStats{};
        bool running = true, dragging = false;
#if LAB_CHECKPOINT >= 9
        if (verify || benchmark)
            running = false;
#endif
        Uint8 dragButton = 0;
        float previousX = 0, previousY = 0;
        SDL_MouseID mouse = 0;
        ViewerScene beforeDrag{};
        const auto started = SDL_GetTicks();
        auto previousTime = ViewerClock::now();
        std::uint64_t frameNumber = 1;
        const auto release = [&]() {
            dragging = false;
            SDL_CaptureMouse(false);
        };
        while (running) {
            if (finite && SDL_GetTicks() - started > 10000)
                throw std::runtime_error("Finite viewer deadline");
            const auto frameStart = ViewerClock::now();
            ViewerFrameStats stats{};
            stats.frame = frameNumber;
            int width = 0, height = 0, logicalWidth = 0, logicalHeight = 0;
            if (!SDL_GetWindowSizeInPixels(window, &width, &height) || !SDL_GetWindowSize(window, &logicalWidth, &logicalHeight))
                throw std::runtime_error(SDL_GetError());
            if (width <= 0 || height <= 100 || logicalWidth <= 0 || logicalHeight <= 0) {
                SDL_Delay(10);
                continue;
            }
            if (std::size_t(width) * std::size_t(height) > 16'000'000)
                throw std::runtime_error("Viewer framebuffer exceeds 16 million pixel budget");
            const int modelHeight = height - 100;
            bool step = false;
            SDL_Event event{};
            while (SDL_PollEvent(&event)) {
                if (event.type == SDL_EVENT_QUIT)
                    running = false;
                else if (event.type == SDL_EVENT_WINDOW_FOCUS_LOST || event.type == SDL_EVENT_WINDOW_PIXEL_SIZE_CHANGED) {
                    scene.view.paused = true;
                    release();
                } else if (event.type == SDL_EVENT_MOUSE_BUTTON_DOWN && !dragging && (event.button.button == SDL_BUTTON_LEFT || event.button.button == SDL_BUTTON_RIGHT)) {
                    if (event.button.y * height / logicalHeight < modelHeight) {
                        beforeDrag = scene;
                        mouse = event.button.which;
                        dragButton = event.button.button;
                        previousX = event.button.x;
                        previousY = event.button.y;
                        dragging = SDL_CaptureMouse(true);
                        scene.view.paused = true;
                    }
                } else if (event.type == SDL_EVENT_MOUSE_MOTION && dragging && event.motion.which == mouse) {
                    const float dx = event.motion.x - previousX, dy = event.motion.y - previousY;
#if LAB_CHECKPOINT >= 5
                    if (dragButton == SDL_BUTTON_RIGHT)
                        panViewer(scene, dx * width / logicalWidth, dy * height / logicalHeight, modelHeight);
                    else
#endif
                        turnViewer(scene.view, dx * 0.006, dy * 0.006);
                    previousX = event.motion.x;
                    previousY = event.motion.y;
                } else if (event.type == SDL_EVENT_MOUSE_BUTTON_UP && dragging && event.button.which == mouse && event.button.button == dragButton)
                    release();
#if LAB_CHECKPOINT >= 5
                else if (event.type == SDL_EVENT_MOUSE_WHEEL)
                    zoomViewer(scene.view, event.wheel.y);
#endif
                else if (event.type == SDL_EVENT_KEY_DOWN && !event.key.repeat && !(event.key.mod & (SDL_KMOD_CTRL | SDL_KMOD_ALT | SDL_KMOD_GUI))) {
                    const auto key = event.key.key;
                    if (key == SDLK_F1)
                        backend = RendererKind::cpu;
#if LAB_CHECKPOINT >= 4
                    else if (key == SDLK_F2)
                        backend = RendererKind::gpu;
#endif
                    else if (key == SDLK_ESCAPE) {
                        if (dragging) {
                            scene = beforeDrag;
                            release();
                        } else
                            running = false;
                    } else if (dragging)
                        continue;
                    else if (key == SDLK_1 || key == SDLK_2 || key == SDLK_3) {
                        scene.meshIndex = std::size_t(key - SDLK_1);
                    }
#if LAB_CHECKPOINT >= 5
                    else if (key == SDLK_V) {
                        scene.view.cameraDrag = !scene.view.cameraDrag;
                    } else if (key == SDLK_HOME) {
                        scene.view.cameraYaw = scene.view.cameraPitch = 0;
                        scene.view.distance = 4.2;
                        scene.targetX = scene.targetY = scene.targetZ = 0;
                    }
#endif
#if LAB_CHECKPOINT >= 6
                    else if (key == SDLK_D) {
                        scene.depthEnabled = !scene.depthEnabled;
                    } else if (key == SDLK_C) {
                        scene.view.cullBackfaces = !scene.view.cullBackfaces;
                    } else if (key == SDLK_O) {
                        scene.view.reverseOrder = !scene.view.reverseOrder;
                    }
#endif
#if LAB_CHECKPOINT >= 7
                    else if (key == SDLK_L) {
                        scene.lit = !scene.lit;
                    } else if (key == SDLK_W) {
                        scene.view.wireframe = !scene.view.wireframe;
                    } else if (key == SDLK_H) {
                        scene.view.normals = !scene.view.normals;
                    } else if (key == SDLK_G) {
                        scene.view.grid = !scene.view.grid;
                    }
#endif
#if LAB_CHECKPOINT >= 8
                    else if (key == SDLK_SPACE) {
                        scene.view.paused = !scene.view.paused;
                    } else if (key == SDLK_N) {
                        step = true;
                        scene.view.paused = true;
                    }
#endif
                    else if (key == SDLK_LEFT) {
                        turnViewer(scene.view, -0.06, 0);
                    } else if (key == SDLK_RIGHT) {
                        turnViewer(scene.view, 0.06, 0);
                    } else if (key == SDLK_UP) {
                        turnViewer(scene.view, 0, -0.06);
                    } else if (key == SDLK_DOWN) {
                        turnViewer(scene.view, 0, 0.06);
                    } else if (key == SDLK_R) {
                        const auto mesh = scene.meshIndex;
                        scene = {};
                        scene.meshIndex = mesh;
                    }
                }
            }
            const auto now = ViewerClock::now();
            const double dt = std::min(0.05, std::chrono::duration<double>(now - previousTime).count());
            previousTime = now;
            if (!scene.view.paused)
                scene.view.angleY = std::remainder(scene.view.angleY + dt * 0.45, 2 * std::numbers::pi);
            if (step)
                scene.view.angleY = std::remainder(scene.view.angleY + std::numbers::pi / 18, 2 * std::numbers::pi);
            stats = renderers.render(gl, meshes, scene, backend, width, modelHeight, frameNumber, 100);
#if LAB_CHECKPOINT >= 9
            drawViewerHud(gl, scene, backend, meshes[scene.meshIndex].name, meshes[scene.meshIndex].triangleCount(), width, height, previousStats, renderers.timer, vsync);
#else
            const auto title = std::string(rendererLabel(backend)) + " | " + meshes[scene.meshIndex].name + " | " + std::to_string(meshes[scene.meshIndex].triangleCount()) + " triangles";
            SDL_SetWindowTitle(window, title.c_str());
#endif
            if (capturePath && frameNumber == 3 && !captureViewer(gl, width, height, capturePath))
                throw std::runtime_error("Cannot capture viewer framebuffer");
            if (gl.GetError() != GL_NO_ERROR)
                throw std::runtime_error("OpenGL error while rendering viewer");
            const auto stageStart = ViewerClock::now();
            if (!SDL_GL_SwapWindow(window))
                throw std::runtime_error(SDL_GetError());
            stats.presentMs = viewerMilliseconds(stageStart);
            stats.frameMs = viewerMilliseconds(frameStart);
            previousStats = stats;
            ++frameNumber;
            if (finite && frameNumber > 4)
                running = false;
            if (finite && SDL_GetTicks() - started > 10000)
                throw std::runtime_error("Finite viewer deadline");
            if (!finite && !vsync)
                SDL_Delay(1);
        }
        release();
    } catch (const std::exception& error) {
        std::cerr << "Project 34: " << error.what() << '\n';
        result = EXIT_FAILURE;
    }
    SDL_CaptureMouse(false);
    if (glLoaded) {
        renderers.destroy(gl);
    }
    if (context)
        SDL_GL_DestroyContext(context);
    if (window)
        SDL_DestroyWindow(window);
    SDL_Quit();
    return result;
}
#endif
} // namespace lab
