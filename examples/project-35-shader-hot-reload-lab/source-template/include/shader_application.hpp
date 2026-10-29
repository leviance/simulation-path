#pragma once
#include "shader_files.hpp"
#include "shader_input.hpp"
#include "shader_overlay.hpp"
#include "shader_validation.hpp"
#include <chrono>
#include <cstdlib>
#include <iostream>

namespace lab {
inline bool captureShaderImage(GlApi& gl, int width, int height, const char* path) {
    std::vector<std::uint8_t> rgba(std::size_t(width) * height * 4);
    gl.ReadPixels(0, 0, width, height, GL_RGBA, GL_UNSIGNED_BYTE, rgba.data());
    const auto pitch = std::size_t(width) * 4;
    for (int y = 0; y < height / 2; ++y) {
        auto row = rgba.begin() + std::size_t(y) * pitch;
        std::swap_ranges(row, row + pitch, rgba.begin() + std::size_t(height - 1 - y) * pitch);
    }
    SDL_Surface* surface = SDL_CreateSurfaceFrom(width, height, SDL_PIXELFORMAT_RGBA32, rgba.data(), int(pitch));
    if (!surface)
        return false;
    const bool saved = SDL_SaveBMP(surface, path);
    SDL_DestroySurface(surface);
    return saved && gl.GetError() == GL_NO_ERROR;
}

#if LAB_CHECKPOINT >= 1
inline std::filesystem::path findShaderDirectory(const std::string& explicitPath) {
    if (!explicitPath.empty())
        return std::filesystem::path(std::u8string(explicitPath.begin(), explicitPath.end()));
#ifdef COURSE_SHADER_DIRECTORY
    const std::filesystem::path source(COURSE_SHADER_DIRECTORY);
    if (std::filesystem::exists(source))
        return source;
#endif
    const char* base = SDL_GetBasePath();
    if (!base)
        throw std::runtime_error(SDL_GetError());
    const std::string utf8(base);
    auto directory = std::filesystem::path(std::u8string(utf8.begin(), utf8.end()));
#ifdef COURSE_SHADER_FALLBACK_SUBDIRECTORY
    return directory / COURSE_SHADER_FALLBACK_SUBDIRECTORY;
#else
    return directory / "shaders";
#endif
}

inline bool reloadFromDisk(GlApi& gl, ShaderLabRenderer& renderer, const std::filesystem::path& directory, std::size_t effect) {
    ShaderSources sources{};
    std::string diagnostics;
    bool succeeded = readShaderFiles(directory, effect, sources, diagnostics);
    if (succeeded)
        succeeded = renderer.reload(gl, sources, effect, diagnostics);
    else
        recordReloadAttempt(renderer.reloadState, 0, effect, false, diagnostics);
    if (succeeded)
        std::cout << diagnostics << '\n';
    else
        std::cerr << diagnostics << "\nLast-good program remains active.\n";
    return succeeded;
}
#endif

inline int runShaderApplication(int argc, char** argv) {
    bool finite = false, showcase = false, errorCapture = false;
    const char* capture = nullptr;
    std::string explicitDirectory;
    std::size_t effect = 0;
#if LAB_CHECKPOINT >= 10
    bool verify = false;
#endif
    for (int index = 1; index < argc; ++index) {
        const std::string argument = argv[index];
        if (argument == "--smoke")
            finite = true;
        else if (argument == "--showcase")
            showcase = true;
        else if (argument == "--error-demo")
            errorCapture = true;
        else if (argument == "--capture" && index + 1 < argc) {
            capture = argv[++index];
            finite = true;
        } else if (argument == "--shader-dir" && index + 1 < argc)
            explicitDirectory = argv[++index];
        else if (argument == "--effect" && index + 1 < argc) {
            const std::string selected = argv[++index];
            if (selected.size() != 1 || selected[0] < '1' || selected[0] >= '1' + visibleShaderEffects())
                return EXIT_FAILURE;
            effect = std::size_t(selected[0] - '1');
        }
#if LAB_CHECKPOINT >= 10
        else if (argument == "--verify") {
            verify = true;
            finite = true;
        }
#endif
        else {
            std::cerr << "Usage: project_35_final [--effect 1..4] [--shader-dir path] [--showcase] [--smoke] [--capture image.bmp] [--error-demo] [--verify]\n";
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
    ShaderLabRenderer renderer{};
#if LAB_CHECKPOINT >= 10
    ShaderOverlay overlay{};
#endif
    int exitCode = EXIT_SUCCESS;
    try {
        if (!SDL_GL_SetAttribute(SDL_GL_CONTEXT_MAJOR_VERSION, 3) || !SDL_GL_SetAttribute(SDL_GL_CONTEXT_MINOR_VERSION, 3) ||
            !SDL_GL_SetAttribute(SDL_GL_CONTEXT_PROFILE_MASK, SDL_GL_CONTEXT_PROFILE_CORE) || !SDL_GL_SetAttribute(SDL_GL_DOUBLEBUFFER, 1)) {
            throw std::runtime_error(SDL_GetError());
        }
        SDL_WindowFlags flags = SDL_WINDOW_OPENGL | SDL_WINDOW_RESIZABLE | SDL_WINDOW_HIGH_PIXEL_DENSITY;
        if (finite)
            flags |= SDL_WINDOW_HIDDEN;
        window = SDL_CreateWindow("Project 35 - Live Shader Gallery", 1120, 760, flags);
        if (!window)
            throw std::runtime_error(SDL_GetError());
        SDL_SetWindowMinimumSize(window, 640, 400);
        context = SDL_GL_CreateContext(window);
        if (!context || !SDL_GL_MakeCurrent(window, context))
            throw std::runtime_error(SDL_GetError());
        if (!gl.load())
            throw std::runtime_error("Missing OpenGL function " + gl.missingFunction);
        glLoaded = true;
        const bool vsync = !finite && SDL_GL_SetSwapInterval(1);
        if (finite)
            SDL_GL_SetSwapInterval(0);
        std::cout << gl.GetString(GL_VERSION) << '\n'
                  << gl.GetString(GL_RENDERER) << '\n';
        std::string diagnostics;
        if (!renderer.initialize(gl, diagnostics))
            throw std::runtime_error(diagnostics);
        ShaderScene scene{};
        scene.requestedEffect = effect;
        scene.showDebug = !showcase;
        if (capture) {
            scene.timeSeconds = 1.25;
            scene.paused = true;
        }
#if LAB_CHECKPOINT >= 1
        const auto shaderDirectory = findShaderDirectory(explicitDirectory);
        std::cout << "SHADER DIRECTORY: " << shaderPathText(shaderDirectory) << '\n';
#if LAB_CHECKPOINT >= 5
        const auto initialStamps = readShaderFileStamps(shaderDirectory, effect);
#endif
        reloadFromDisk(gl, renderer, shaderDirectory, effect);
#endif
#if LAB_CHECKPOINT >= 10
        if (!overlay.initialize(gl, diagnostics))
            throw std::runtime_error(diagnostics);
        if (errorCapture) {
            auto bad = embeddedShaderSources();
            bad.fragmentLabel = "error-demo.frag";
            bad.fragment += "\nTHIS_IS_AN_INTENTIONAL_COMPILE_ERROR\n";
            renderer.reload(gl, bad, effect, diagnostics);
            std::cerr << diagnostics << '\n';
        }
        if (verify)
            verifyShaderGallery(gl, window, renderer, overlay, shaderDirectory);
#else
        static_cast<void>(errorCapture);
#endif
#if LAB_CHECKPOINT >= 5
        ShaderWatchState watcher{};
        updateShaderWatch(watcher, initialStamps, SDL_GetTicks());
        std::uint64_t nextScan = 0;
#endif
        bool running = true, dragging = false;
#if LAB_CHECKPOINT >= 10
        if (verify)
            running = false;
#endif
#if LAB_CHECKPOINT >= 6
        SDL_MouseID capturedMouse = 0;
#endif
        double mouseBeforeX = 0.5, mouseBeforeY = 0.5;
        int logOffset = 0;
        std::uint64_t frames = 0;
        const auto started = SDL_GetTicks();
        auto previous = std::chrono::steady_clock::now();
        double previousFrameMs = 0;
        const auto releaseMouse = [&]() {
            dragging = false;
            SDL_CaptureMouse(false);
        };
        while (running) {
            if (finite && SDL_GetTicks() - started > 10000)
                throw std::runtime_error("Finite shader viewer deadline");
            const auto frameStart = std::chrono::steady_clock::now();
            bool reloadRequested = false;
            SDL_Event event{};
            int eventCount = 0;
            while (eventCount++ < 256 && SDL_PollEvent(&event)) {
                if (event.type == SDL_EVENT_QUIT)
                    running = false;
                else if (event.type == SDL_EVENT_WINDOW_FOCUS_LOST) {
                    scene.paused = true;
                    releaseMouse();
                } else if (event.type == SDL_EVENT_WINDOW_PIXEL_SIZE_CHANGED)
                    releaseMouse();
                else if (event.type == SDL_EVENT_KEY_DOWN && !(event.key.mod & (SDL_KMOD_CTRL | SDL_KMOD_ALT | SDL_KMOD_GUI))) {
                    if (event.key.repeat && event.key.key != SDLK_LEFT && event.key.key != SDLK_RIGHT && event.key.key != SDLK_UP && event.key.key != SDLK_DOWN)
                        continue;
                    const auto action = handleShaderKey(scene, event.key.key, dragging, logOffset);
                    if (action.close)
                        running = false;
                    if (action.cancelDrag) {
                        scene.mouseX = mouseBeforeX;
                        scene.mouseY = mouseBeforeY;
                        releaseMouse();
                    }
                    reloadRequested = reloadRequested || action.reload;
#if LAB_CHECKPOINT >= 5
                    if (action.resetWatch)
                        watcher = {};
#endif
                }
#if LAB_CHECKPOINT >= 6
                else if (event.type == SDL_EVENT_MOUSE_BUTTON_DOWN && event.button.button == SDL_BUTTON_LEFT && !dragging) {
                    int logicalWidth = 0, logicalHeight = 0;
                    if (!SDL_GetWindowSize(window, &logicalWidth, &logicalHeight))
                        throw std::runtime_error(SDL_GetError());
                    mouseBeforeX = scene.mouseX;
                    mouseBeforeY = scene.mouseY;
                    capturedMouse = event.button.which;
                    setShaderMouse(scene, event.button.x, event.button.y, logicalWidth, logicalHeight);
                    dragging = SDL_CaptureMouse(true);
                } else if (event.type == SDL_EVENT_MOUSE_MOTION && dragging && event.motion.which == capturedMouse) {
                    int logicalWidth = 0, logicalHeight = 0;
                    if (!SDL_GetWindowSize(window, &logicalWidth, &logicalHeight))
                        throw std::runtime_error(SDL_GetError());
                    setShaderMouse(scene, event.motion.x, event.motion.y, logicalWidth, logicalHeight);
                } else if (event.type == SDL_EVENT_MOUSE_BUTTON_UP && dragging && event.button.which == capturedMouse && event.button.button == SDL_BUTTON_LEFT)
                    releaseMouse();
                else if (event.type == SDL_EVENT_MOUSE_WHEEL)
                    zoomShader(scene, event.wheel.y);
#endif
            }
            if (!running)
                break;
            const auto now = std::chrono::steady_clock::now();
            const auto delta = std::chrono::duration<double>(now - previous).count();
            previous = now;
#if LAB_CHECKPOINT >= 6
            advanceShaderTime(scene, delta);
#else
            static_cast<void>(delta);
#endif
#if LAB_CHECKPOINT >= 5
            const auto ticks = SDL_GetTicks();
            if (scene.autoReload && ticks >= nextScan) {
                nextScan = ticks + 50;
                reloadRequested = updateShaderWatch(watcher, readShaderFileStamps(shaderDirectory, scene.requestedEffect), ticks) || reloadRequested;
            }
#endif
#if LAB_CHECKPOINT >= 4
            if (reloadRequested) {
#if LAB_CHECKPOINT >= 5
                const auto beforeRead = readShaderFileStamps(shaderDirectory, scene.requestedEffect);
#endif
                reloadFromDisk(gl, renderer, shaderDirectory, scene.requestedEffect);
                logOffset = 0;
#if LAB_CHECKPOINT >= 5
                // Consume this attempt, not a newer save that may happen while
                // the driver compiles. That newer stamp must still be noticed.
                watcher = {};
                updateShaderWatch(watcher, beforeRead, SDL_GetTicks());
#endif
            }
#else
            static_cast<void>(reloadRequested);
#endif
            int width = 0, height = 0;
            if (!SDL_GetWindowSizeInPixels(window, &width, &height))
                throw std::runtime_error(SDL_GetError());
            if (width <= 0 || height <= 0) {
                SDL_Delay(10);
                continue;
            }
            if (std::size_t(width) * height > 16'000'000)
                throw std::runtime_error("Shader framebuffer exceeds pixel budget");
            gl.Disable(GL_SCISSOR_TEST);
            gl.ClearColor(0, 0, 0, 1);
            gl.Clear(GL_COLOR_BUFFER_BIT);
            auto uniform = makeUniformSnapshot(scene, width, height);
            renderer.draw(gl, uniform);
#if LAB_CHECKPOINT >= 10
            overlay.draw(gl, width, height, scene, renderer.reloadState, previousFrameMs, logOffset, SDL_GetTicks());
#endif
            if (capture && frames == 2 && !captureShaderImage(gl, width, height, capture))
                throw std::runtime_error("Cannot save shader capture");
            if (gl.GetError() != GL_NO_ERROR)
                throw std::runtime_error("OpenGL error while drawing shader gallery");
            const auto active = renderer.reloadState.activeEffect < kEffects.size() ? kEffects[renderer.reloadState.activeEffect].name : "Embedded recovery";
            const auto title = std::string("P35 | ") + std::string(active) + " | generation " + std::to_string(renderer.reloadState.generation) + (renderer.reloadState.lastReloadSucceeded ? " | OK" : " | ERROR: last-good kept") + " | F5 reload, 1-4 gallery";
            SDL_SetWindowTitle(window, title.c_str());
            if (!SDL_GL_SwapWindow(window))
                throw std::runtime_error(SDL_GetError());
            ++frames;
            previousFrameMs = std::chrono::duration<double, std::milli>(std::chrono::steady_clock::now() - frameStart).count();
            if (finite && frames == 4)
                running = false;
            if (!finite && !vsync)
                SDL_Delay(1);
        }
        releaseMouse();
    } catch (const std::exception& error) {
        std::cerr << "Project 35: " << error.what() << '\n';
        exitCode = EXIT_FAILURE;
    }
    SDL_CaptureMouse(false);
    if (glLoaded) {
#if LAB_CHECKPOINT >= 10
        overlay.destroy(gl);
#endif
        renderer.destroy(gl);
    }
    if (context)
        SDL_GL_DestroyContext(context);
    if (window)
        SDL_DestroyWindow(window);
    SDL_Quit();
    return exitCode;
}
} // namespace lab
