#pragma once
#include "room_controls.hpp"
#include "room_overlay.hpp"
#include "room_verify.hpp"
#include <cstdio>
#include <filesystem>

namespace lab {

struct Application {
    SDL_Window* window{};
    SDL_GLContext context{};
    GlApi api{};
    bool loaded{};
    RayMarchRenderer renderer{};
    RoomOverlay overlay{};
    RayMarchFrame frame{};
    RoomControls controls{};
    ShaderSources sources{};
    std::filesystem::path shaderPath{};
    std::filesystem::path capturePath{};
    std::string diagnostics{};
    std::string reloadError{};
    bool verification{};
    int finiteFrames{};

    bool arguments(int argc, char** argv) {
        for (int index = 1; index < argc; ++index) {
            const std::string_view argument(argv[index]);
            if (argument == "--smoke") {
                finiteFrames = 3;
            } else if (argument == "--verify") {
                verification = true;
            } else if (argument == "--debug") {
                frame.showDebug = true;
            } else if (argument == "--showcase") {
                frame.showDebug = false;
            } else if (argument == "--capture" && index + 1 < argc) {
                capturePath = argv[++index];
                finiteFrames = 3;
            } else if (argument == "--shader-dir" && index + 1 < argc) {
                shaderPath = argv[++index];
            } else {
                std::cerr << "Unknown or incomplete argument: " << argument << '\n';
                return false;
            }
        }
        return true;
    }

    std::filesystem::path findShaderPath() const {
        if (!shaderPath.empty())
            return shaderPath;
#ifdef COURSE_SHADER_DIRECTORY
        const std::filesystem::path source(COURSE_SHADER_DIRECTORY);
        if (std::filesystem::is_regular_file(source / "raymarch.frag"))
            return source;
#endif
        std::filesystem::path base(".");
        const char* path = SDL_GetBasePath();
        if (path)
            base = path;
#ifdef COURSE_SHADER_FALLBACK_SUBDIRECTORY
        return base / COURSE_SHADER_FALLBACK_SUBDIRECTORY;
#else
        return base / "shaders";
#endif
    }

    bool initialize() {
        if (!SDL_Init(SDL_INIT_VIDEO)) {
            diagnostics = SDL_GetError();
            return false;
        }
        if (!SDL_GL_SetAttribute(SDL_GL_CONTEXT_MAJOR_VERSION, 3) || !SDL_GL_SetAttribute(SDL_GL_CONTEXT_MINOR_VERSION, 3) || !SDL_GL_SetAttribute(SDL_GL_CONTEXT_PROFILE_MASK, SDL_GL_CONTEXT_PROFILE_CORE) || !SDL_GL_SetAttribute(SDL_GL_DOUBLEBUFFER, 1)) {
            diagnostics = SDL_GetError();
            return false;
        }
        SDL_WindowFlags flags = SDL_WINDOW_OPENGL | SDL_WINDOW_RESIZABLE | SDL_WINDOW_HIGH_PIXEL_DENSITY;
        if (verification || finiteFrames > 0)
            flags |= SDL_WINDOW_HIDDEN;
        window = SDL_CreateWindow("P36 | Ray-marched room", 1280, 800, flags);
        if (!window) {
            diagnostics = SDL_GetError();
            return false;
        }
        context = SDL_GL_CreateContext(window);
        if (!context || !SDL_GL_MakeCurrent(window, context)) {
            diagnostics = SDL_GetError();
            return false;
        }
        loaded = api.load();
        if (!loaded) {
            diagnostics = "Missing OpenGL entry point: " + api.missingFunction;
            return false;
        }
        GLint major = 0;
        GLint minor = 0;
        GLint profile = 0;
        api.GetIntegerv(GL_MAJOR_VERSION, &major);
        api.GetIntegerv(GL_MINOR_VERSION, &minor);
        api.GetIntegerv(GL_CONTEXT_PROFILE_MASK, &profile);
        if (major < 3 || (major == 3 && minor < 3) || (profile & GL_CONTEXT_CORE_PROFILE_BIT) == 0) {
            diagnostics = "OpenGL 3.3 Core is required; no CPU or reduced-feature substitute.";
            return false;
        }
        api.Disable(GL_DEPTH_TEST);
        api.Disable(GL_CULL_FACE);
        api.Disable(GL_BLEND);
        api.Disable(GL_DITHER);
        api.Disable(GL_MULTISAMPLE);
        api.Disable(GL_FRAMEBUFFER_SRGB);
        SDL_GL_SetSwapInterval(1);
        SDL_SetWindowMinimumSize(window, 640, 400);
        SDL_SetWindowMaximumSize(window, 1920, 1200);
        shaderPath = findShaderPath();
        if (!readRayMarchShaders(shaderPath, sources, diagnostics) || !renderer.initialize(api, sources, diagnostics)) {
            return false;
        }
        std::cout << "Shader directory: " << shaderPath.string() << '\n';
        if (!verification && !overlay.initialize(api, diagnostics)) {
            return false;
        }
        return true;
    }

    bool capture(int width, int height) {
        if (width < 1 || height < 1 || width > 4096 || height > 4096)
            return false;
        const std::size_t stride = static_cast<std::size_t>(width) * 4;
        std::vector<unsigned char> pixels(stride * static_cast<std::size_t>(height));
        api.ReadPixels(0, 0, width, height, GL_RGBA, GL_UNSIGNED_BYTE, pixels.data());
        for (int y = 0; y < height / 2; ++y) {
            const auto top = pixels.begin() + static_cast<std::size_t>(y) * stride;
            const auto bottom = pixels.begin() + static_cast<std::size_t>(height - y - 1) * stride;
            std::swap_ranges(top, top + stride, bottom);
        }
        SDL_Surface* image = SDL_CreateSurfaceFrom(width, height, SDL_PIXELFORMAT_RGBA32, pixels.data(), static_cast<int>(stride));
        if (!image)
            return false;
        const bool saved = SDL_SaveBMP(image, capturePath.string().c_str());
        SDL_DestroySurface(image);
        return saved;
    }

    int run() {
        if (verification) {
            if (verifyRoom(api, renderer, sources))
                return EXIT_SUCCESS;
            return EXIT_FAILURE;
        }
        auto previous = SDL_GetTicksNS();
        const auto start = SDL_GetTicks();
        int frames = 0;
        bool running = true;
        while (running) {
            // Deadline phải được kiểm cả khi minimized hoặc framebuffer rỗng.
            if (finiteFrames > 0 && SDL_GetTicks() - start > 5000) {
                std::cerr << "Finite capture/smoke did not finish within five seconds\n";
                return EXIT_FAILURE;
            }
            const auto now = SDL_GetTicksNS();
            const double seconds = static_cast<double>(now - previous) / 1e9;
            previous = now;
            SDL_Event event{};
            while (SDL_PollEvent(&event)) {
                if (!controls.event(window, event, frame))
                    running = false;
            }
            if (!running)
                break;
            controls.advance(window, frame, seconds);
            if (controls.reloadRequested) {
                controls.reloadRequested = false;
                ShaderSources candidate{};
                if (readRayMarchShaders(shaderPath, candidate, diagnostics) && renderer.reload(api, candidate, diagnostics)) {
                    sources = std::move(candidate);
                    reloadError.clear();
                } else {
                    reloadError = diagnostics;
                    std::cerr << reloadError << '\n';
                }
            }
            int width = 0;
            int height = 0;
            if (!SDL_GetWindowSizeInPixels(window, &width, &height)) {
                std::cerr << "SDL_GetWindowSizeInPixels: " << SDL_GetError() << '\n';
                return EXIT_FAILURE;
            }
            if (width < 1 || height < 1 || (SDL_GetWindowFlags(window) & SDL_WINDOW_MINIMIZED) != 0) {
                SDL_Delay(10);
                continue;
            }
            renderer.draw(api, frame, width, height);
            int logicalWidth = 1;
            int logicalHeight = 1;
            SDL_GetWindowSize(window, &logicalWidth, &logicalHeight);
            const float dpi = static_cast<float>(width) / static_cast<float>(std::max(1, logicalWidth));
            if (!overlay.draw(api, width, height, dpi, frame, renderer.generation, reloadError, seconds * 1000.0)) {
                std::cerr << "Overlay failed: " << SDL_GetError() << '\n';
                return EXIT_FAILURE;
            }
            char title[240]{};
            std::snprintf(title, sizeof(title), "P36 | checkpoint %d | Tab controls | view %d | steps %d | eps %.5f | gen %llu", checkpointNumber, frame.debugView, frame.settings.maximumSteps, frame.settings.hitEpsilon, static_cast<unsigned long long>(renderer.generation));
            SDL_SetWindowTitle(window, title);
            ++frames;
            if (!capturePath.empty() && frames == finiteFrames && !capture(width, height))
                return EXIT_FAILURE;
            if (!SDL_GL_SwapWindow(window)) {
                std::cerr << "SDL_GL_SwapWindow: " << SDL_GetError() << '\n';
                return EXIT_FAILURE;
            }
            const GLenum error = api.GetError();
            if (error != GL_NO_ERROR) {
                std::cerr << "OpenGL frame error: " << error << '\n';
                return EXIT_FAILURE;
            }
            if (finiteFrames > 0 && frames >= finiteFrames) {
                break;
            }
        }
        return EXIT_SUCCESS;
    }

    ~Application() {
        // Cleanup: GL phải được nhả trong khi context vẫn còn current.
        if (window)
            controls.release(window);
        if (loaded) {
            overlay.destroy(api);
            renderer.destroy(api);
        }
        if (context)
            SDL_GL_DestroyContext(context);
        if (window)
            SDL_DestroyWindow(window);
        SDL_Quit();
    }
};

inline int runApplication(int argc, char** argv) {
    Application application{};
    if (!application.arguments(argc, argv) || !application.initialize()) {
        std::cerr << application.diagnostics << '\n';
        return EXIT_FAILURE;
    }
    return application.run();
}

} // namespace lab
