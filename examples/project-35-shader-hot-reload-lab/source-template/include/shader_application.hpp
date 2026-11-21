#pragma once
#include "room_drawing.hpp"
#include "shader_input.hpp"
#include "shader_overlay.hpp"
#include "shader_validation.hpp"
#include <cstdlib>
#include <iostream>

namespace lab {
// Đọc back buffer trước SwapWindow. Dòng 0 của OpenGL ở đáy, dòng 0 của PNG ở trên.
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
    const bool saved = SDL_SavePNG(surface, path);
    SDL_DestroySurface(surface);
    return saved && gl.GetError() == GL_NO_ERROR;
}

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

#if LAB_CHECKPOINT >= 6
// [snippet reload-material]
inline bool reloadMaterial(GlApi& gl, RoomProgram& material, const std::filesystem::path& directory) {
    ShaderSources candidate{};
    std::string error;
    if (readShaderFiles(directory, candidate, error)) {
        return material.replace(gl, candidate);
    }

    ++material.reload.attempts;
    material.reload.lastReloadSucceeded = false;
    material.reload.diagnostics = error;
    return false;
}
// [/snippet reload-material]
#endif

inline int runShutterApplication(int argc, char** argv) {
    std::string folder, capture, preset, view, camera;
    bool smoke = false, verify = false, hud = false;
    int direction = -1;
    for (int i = 1; i < argc; ++i) {
        const std::string_view arg(argv[i]);
        if (arg == "--smoke") smoke = true;
        else if (arg == "--verify") verify = true;
        else if (arg == "--hud") hud = true;
        else if (arg == "--capture" && i + 1 < argc) capture = argv[++i];
        else if (arg == "--shader-dir" && i + 1 < argc) folder = argv[++i];
        else if (arg == "--preset" && i + 1 < argc) {
            preset = argv[++i];
            if (preset != "open" && preset != "ajar" && preset != "closed" && preset != "moved") return EXIT_FAILURE;
        } else if (arg == "--camera" && i + 1 < argc) {
            camera = argv[++i];
            if (camera != "left" && camera != "right") return EXIT_FAILURE;
        } else if (arg == "--view" && i + 1 < argc) {
            view = argv[++i];
            if (view != "beauty" && view != "depth" && view != "visibility" && view != "lambert" && view != "unshadowed") return EXIT_FAILURE;
        } else {
            std::cerr << "Options: --smoke --verify --capture path.png --preset open|ajar|closed|moved --view beauty|depth|visibility|lambert|unshadowed --camera left|right --hud --shader-dir path\n";
            return EXIT_FAILURE;
        }
    }
    const bool finite = smoke || verify || !capture.empty();
    if (!SDL_Init(SDL_INIT_VIDEO)) { std::cerr << SDL_GetError(); return EXIT_FAILURE; }
    SDL_Window* window = nullptr;
    SDL_GLContext context = nullptr;
    GlApi gl{};
    bool loaded = false;
    RoomDrawing drawing{};
    PointerDrag drag{};
#if LAB_CHECKPOINT >= 6
    ShaderOverlay overlay{};
#endif
    int result = EXIT_SUCCESS;
    try {
        if (!SDL_GL_SetAttribute(SDL_GL_CONTEXT_MAJOR_VERSION, 3) || !SDL_GL_SetAttribute(SDL_GL_CONTEXT_MINOR_VERSION, 3) ||
            !SDL_GL_SetAttribute(SDL_GL_CONTEXT_PROFILE_MASK, SDL_GL_CONTEXT_PROFILE_CORE) || !SDL_GL_SetAttribute(SDL_GL_DEPTH_SIZE, 24) ||
            !SDL_GL_SetAttribute(SDL_GL_DOUBLEBUFFER, 1)) throw std::runtime_error(SDL_GetError());
        SDL_WindowFlags flags = SDL_WINDOW_OPENGL | SDL_WINDOW_RESIZABLE | SDL_WINDOW_HIGH_PIXEL_DENSITY;
        if (finite) flags |= SDL_WINDOW_HIDDEN;
        std::string title = "Project 35 - Nang qua cua chop | Right drag: orbit";
#if LAB_CHECKPOINT >= 2
        title += " | Drag: slats | A/D: box | Q/E: Sun";
#endif
#if LAB_CHECKPOINT >= 3
        title += " | V: depth";
#endif
#if LAB_CHECKPOINT >= 6
        title += " | Tab: keys";
#endif
        window = SDL_CreateWindow(title.c_str(), 1120, 720, flags);
        if (!window) throw std::runtime_error(SDL_GetError());
        SDL_SetWindowMinimumSize(window, 480, 320);
        context = SDL_GL_CreateContext(window);
        if (!context || !SDL_GL_MakeCurrent(window, context)) throw std::runtime_error(SDL_GetError());
        if (!gl.load()) throw std::runtime_error("Missing OpenGL function: " + gl.missingFunction);
        loaded = true;
        const bool vsync = !finite && SDL_GL_SetSwapInterval(1);
        if (finite) SDL_GL_SetSwapInterval(0);
        const auto directory = findShaderDirectory(folder);
        std::cout << gl.GetString(GL_RENDERER) << "\nShaders: " << shaderPathText(directory) << '\n';
        std::string error;
        if (!drawing.initialize(gl, directory, error)) throw std::runtime_error(error);
        ShutterState state{};
        if (camera == "left") state.yaw = -33;
        if (camera == "right") state.yaw = 36;
#if LAB_CHECKPOINT >= 2
        if (preset == "open") state.angle = 42;
        if (preset == "closed") state.angle = -38;
        if (preset == "moved") state.boxX = -1.4F;
#endif
#if LAB_CHECKPOINT >= 3
        if (view == "depth") state.mode = 1;
#endif
#if LAB_CHECKPOINT >= 4
        if (view == "unshadowed") state.shadows = false;
#endif
#if LAB_CHECKPOINT >= 7
        if (view == "visibility") state.mode = 2;
        if (view == "lambert") state.mode = 3;
#endif
#if LAB_CHECKPOINT >= 6
        state.inspect = hud;
        if (!overlay.initialize(gl, error)) throw std::runtime_error(error);
        ShaderWatchState watch{};
        updateShaderWatch(watch, readShaderFileStamps(directory), SDL_GetTicks());
        Uint64 nextPoll = 0;
        int logOffset = 0;
#endif
        bool running = true;
        int frames = 0;
        const Uint64 start = SDL_GetTicks();
        Uint64 previous = start;
        while (running) {
            const Uint64 now = SDL_GetTicks();
            if (finite && now - start > 10000) throw std::runtime_error("No drawable frame within 10 seconds");
            int width{}, height{}, logicalWidth{}, logicalHeight{};
            if (!SDL_GetWindowSizeInPixels(window, &width, &height) || !SDL_GetWindowSize(window, &logicalWidth, &logicalHeight))
                throw std::runtime_error(SDL_GetError());
            SDL_Event event{};
            bool requestReload = false;
            while (SDL_PollEvent(&event)) {
                const auto command = handleRoomEvent(state, drag, event, logicalWidth, logicalHeight, direction);
                if (command.close) running = false;
                if (command.reload) requestReload = true;
#if LAB_CHECKPOINT >= 6
                if (event.type == SDL_EVENT_KEY_DOWN && event.key.key == SDLK_PAGEDOWN) ++logOffset;
                if (event.type == SDL_EVENT_KEY_DOWN && event.key.key == SDLK_PAGEUP) logOffset = std::max(0, logOffset - 1);
#endif
            }
            if (!running) break;
            if (width < 1 || height < 1) { previous = now; SDL_Delay(16); continue; }
#if LAB_CHECKPOINT >= 2
            if (!state.paused) advanceBlades(state, 14.0F * std::min(0.1F, float(now - previous) / 1000.0F), direction);
#endif
            previous = now;
#if LAB_CHECKPOINT >= 6
            if (now >= nextPoll || requestReload) {
                const auto stamps = readShaderFileStamps(directory);
                const bool changed = updateShaderWatch(watch, stamps, now);
                if (changed || requestReload) {
                    watch.pending = false;
                    logOffset = 0;
                    if (!reloadMaterial(gl, drawing.material, directory)) std::cerr << drawing.material.reload.diagnostics << '\n';
                }
                nextPoll = now + 100;
            }
#endif
#if LAB_CHECKPOINT >= 7
            if (verify && frames == 0 && !verifyShutter(gl, drawing, directory, width, height))
                throw std::runtime_error("GPU verification failed");
#endif
            drawing.draw(gl, state, width, height);
#if LAB_CHECKPOINT >= 6
            overlay.draw(gl, width, height, state, drawing.material.reload, logOffset, now);
#endif
            ++frames;
            if (!capture.empty() && !captureShaderImage(gl, width, height, capture.c_str()))
                throw std::runtime_error("PNG: " + std::string(SDL_GetError()));
            if (!SDL_GL_SwapWindow(window)) throw std::runtime_error(SDL_GetError());
            if ((smoke && frames >= 3) || (!smoke && finite)) break;
            if (!vsync && !finite) SDL_Delay(12);
        }
        if (smoke) std::cout << "SDL smoke PASS frames=" << frames << '\n';
    } catch (const std::exception& failure) {
        std::cerr << failure.what() << '\n';
        result = EXIT_FAILURE;
    }
    releasePointer(drag);
    if (loaded) {
#if LAB_CHECKPOINT >= 6
        overlay.destroy(gl);
#endif
        drawing.destroy(gl);
    }
    if (context) SDL_GL_DestroyContext(context);
    if (window) SDL_DestroyWindow(window);
    SDL_Quit();
    return result;
}
} // namespace lab
