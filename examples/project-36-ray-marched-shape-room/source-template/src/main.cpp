#include "gl_api.hpp"
#include "raymarch_math.hpp"
#include "raymarch_renderer.hpp"

#include <SDL3/SDL.h>

#include <algorithm>
#include <cstdint>
#include <cstdio>
#include <cstdlib>
#include <filesystem>
#include <iostream>
#include <string>
#include <system_error>

namespace {

constexpr int kInitialWidth = 960;
constexpr int kInitialHeight = 640;

bool requestOpenGl33Core() {
    return SDL_GL_SetAttribute(SDL_GL_CONTEXT_MAJOR_VERSION, 3) &&
        SDL_GL_SetAttribute(SDL_GL_CONTEXT_MINOR_VERSION, 3) &&
        SDL_GL_SetAttribute(SDL_GL_CONTEXT_PROFILE_MASK, SDL_GL_CONTEXT_PROFILE_CORE) &&
        SDL_GL_SetAttribute(SDL_GL_DOUBLEBUFFER, 1);
}

bool containsShaderPair(const std::filesystem::path& directory) {
    for (const char* filename : {"raymarch.vert", "raymarch.frag"}) {
        std::error_code error{};
        if (!std::filesystem::is_regular_file(directory / filename, error) || error) {
            return false;
        }
    }
    return true;
}

std::filesystem::path executableShaderDirectory() {
    const char* basePath = SDL_GetBasePath();
    if (basePath) {
        return std::filesystem::path(basePath) / "shaders";
    }
    return std::filesystem::path("shaders");
}

std::filesystem::path shaderDirectory() {
#ifdef COURSE_SHADER_DIRECTORY
    const std::filesystem::path sourceDirectory(COURSE_SHADER_DIRECTORY);
    if (containsShaderPair(sourceDirectory)) {
        return sourceDirectory;
    }
#endif
    return executableShaderDirectory();
}

void destroyWindowAndContext(SDL_Window* window, SDL_GLContext context) {
    if (context) {
        SDL_GL_DestroyContext(context);
    }
    SDL_DestroyWindow(window);
    SDL_Quit();
}

} // namespace

int main() {
    // Setup SDL và OpenGL context trước khi nạp bất kỳ GPU function hay resource nào.
    if (!SDL_Init(SDL_INIT_VIDEO)) {
        std::cerr << "SDL_Init failed: " << SDL_GetError() << '\n';
        return EXIT_FAILURE;
    }
    if (!requestOpenGl33Core()) {
        std::cerr << "SDL_GL_SetAttribute failed: " << SDL_GetError() << '\n';
        SDL_Quit();
        return EXIT_FAILURE;
    }

    SDL_WindowFlags flags = SDL_WINDOW_OPENGL;
    flags |= SDL_WINDOW_RESIZABLE;
    flags |= SDL_WINDOW_HIGH_PIXEL_DENSITY;
    SDL_Window* window = SDL_CreateWindow(
        "Project 36 | Ray-marched Shape Room",
        kInitialWidth,
        kInitialHeight,
        flags
    );
    if (!window) {
        std::cerr << "SDL_CreateWindow failed: " << SDL_GetError() << '\n';
        SDL_Quit();
        return EXIT_FAILURE;
    }

    SDL_GLContext context = SDL_GL_CreateContext(window);
    if (!context || !SDL_GL_MakeCurrent(window, context)) {
        std::cerr << "OpenGL context creation failed: " << SDL_GetError() << '\n';
        destroyWindowAndContext(window, context);
        return EXIT_FAILURE;
    }

    lab::GlApi gl{};
    if (!gl.load()) {
        std::cerr << "SDL_GL_GetProcAddress failed for " << gl.missingFunction << '\n';
        destroyWindowAndContext(window, context);
        return EXIT_FAILURE;
    }
    if (!SDL_GL_SetSwapInterval(1)) {
        std::cerr << "VSync unavailable: " << SDL_GetError() << '\n';
    }

    const std::filesystem::path shaders = shaderDirectory();
    lab::ShaderSources sources{};
    std::string diagnostics{};
    if (!lab::readRayMarchShaders(shaders, sources, diagnostics)) {
        std::cerr << diagnostics << '\n';
        destroyWindowAndContext(window, context);
        return EXIT_FAILURE;
    }

    lab::RayMarchRenderer renderer{};
    if (!renderer.initialize(gl, sources, diagnostics)) {
        std::cerr << diagnostics << '\n';
        renderer.destroy(gl);
        destroyWindowAndContext(window, context);
        return EXIT_FAILURE;
    }

    std::cout << "Ray-march shaders: " << shaders.string() << '\n';
    lab::RayMarchFrame frame{};
    bool paused = false;
    bool dragging = false;
    float previousMouseX = 0.0F;
    float previousMouseY = 0.0F;
    std::uint64_t previousTicks = SDL_GetTicksNS();
#if LAB_CHECKPOINT >= 9
    const lab::RayMarchValidationReport validation = lab::validateRayMarchRoom();
#endif

    bool running = true;
    while (running) {
        bool singleStep = false;
        bool reloadRequested = false;
        SDL_Event event{};
        while (SDL_PollEvent(&event)) {
            if (event.type == SDL_EVENT_QUIT) {
                running = false;
            } else if (event.type == SDL_EVENT_KEY_DOWN && !event.key.repeat) {
                if (event.key.key == SDLK_ESCAPE) {
                    running = false;
                } else if (event.key.key == SDLK_F5) {
                    reloadRequested = true;
                } else if (event.key.key == SDLK_SPACE) {
                    paused = !paused;
                } else if (event.key.key == SDLK_N) {
                    singleStep = true;
                    paused = true;
                } else if (event.key.key == SDLK_R) {
                    frame = {};
                    paused = false;
                    dragging = false;
                    SDL_CaptureMouse(false);
#if LAB_CHECKPOINT >= 4
                } else if (event.key.key == SDLK_LEFTBRACKET) {
                    frame.maximumSteps = std::max(16, frame.maximumSteps - 16);
                } else if (event.key.key == SDLK_RIGHTBRACKET) {
                    frame.maximumSteps = std::min(160, frame.maximumSteps + 16);
                } else if (event.key.key == SDLK_MINUS) {
                    frame.hitEpsilon = std::max(0.0005F, frame.hitEpsilon - 0.0005F);
                } else if (event.key.key == SDLK_EQUALS) {
                    frame.hitEpsilon = std::min(0.01F, frame.hitEpsilon + 0.0005F);
#endif
#if LAB_CHECKPOINT >= 9
                } else if (event.key.key == SDLK_D) {
                    frame.debugView = (frame.debugView + 1) % 4;
#endif
                }
            }

            if (
                event.type == SDL_EVENT_MOUSE_BUTTON_DOWN &&
                event.button.button == SDL_BUTTON_LEFT
            ) {
                dragging = true;
                previousMouseX = event.button.x;
                previousMouseY = event.button.y;
                SDL_CaptureMouse(true);
            } else if (event.type == SDL_EVENT_MOUSE_MOTION && dragging) {
                frame.camera.yaw += double(event.motion.x - previousMouseX) * 0.006;
                frame.camera.pitch += double(event.motion.y - previousMouseY) * 0.006;
                frame.camera.yaw = std::clamp(frame.camera.yaw, -0.72, 0.72);
                frame.camera.pitch = std::clamp(frame.camera.pitch, -0.2, 0.45);
                previousMouseX = event.motion.x;
                previousMouseY = event.motion.y;
            } else if (
                event.type == SDL_EVENT_MOUSE_BUTTON_UP &&
                event.button.button == SDL_BUTTON_LEFT
            ) {
                dragging = false;
                SDL_CaptureMouse(false);
            } else if (event.type == SDL_EVENT_WINDOW_FOCUS_LOST) {
                dragging = false;
                SDL_CaptureMouse(false);
            } else if (event.type == SDL_EVENT_MOUSE_WHEEL) {
                frame.camera.distance = std::clamp(
                    frame.camera.distance - double(event.wheel.y) * 0.2,
                    3.4,
                    5.4
                );
            }
        }

        if (reloadRequested) {
            lab::ShaderSources candidateSources{};
            if (
                lab::readRayMarchShaders(shaders, candidateSources, diagnostics) &&
                renderer.reload(gl, candidateSources, diagnostics)
            ) {
                std::cout << diagnostics << '\n';
            } else {
                std::cerr << diagnostics << "\nLast-good ray-march program remains active.\n";
            }
        }

        const std::uint64_t currentTicks = SDL_GetTicksNS();
        const float deltaSeconds = std::min(
            0.05F,
            float(currentTicks - previousTicks) / 1'000'000'000.0F
        );
        previousTicks = currentTicks;
        if (!paused) {
            frame.elapsedSeconds += deltaSeconds;
        }
        if (singleStep) {
            frame.elapsedSeconds += 0.1F;
        }

        int framebufferWidth = 1;
        int framebufferHeight = 1;
        if (!SDL_GetWindowSizeInPixels(window, &framebufferWidth, &framebufferHeight)) {
            std::cerr << "SDL_GetWindowSizeInPixels failed: " << SDL_GetError() << '\n';
            running = false;
            continue;
        }
        framebufferWidth = std::max(1, framebufferWidth);
        framebufferHeight = std::max(1, framebufferHeight);

        gl.Viewport(0, 0, framebufferWidth, framebufferHeight);
        gl.ClearColor(0.025F, 0.04F, 0.08F, 1.0F);
        gl.Clear(GL_COLOR_BUFFER_BIT);
        renderer.draw(gl, frame, framebufferWidth, framebufferHeight);

        char title[640]{};
#if LAB_CHECKPOINT >= 9
        const char* validationText = "NO";
        if (validation.allPassed()) {
            validationText = "yes";
        }
        std::snprintf(
            title,
            sizeof(title),
            "P36 | room valid %s | steps %d | epsilon %.4f | debug %d | generation %llu",
            validationText,
            frame.maximumSteps,
            double(frame.hitEpsilon),
            frame.debugView,
            static_cast<unsigned long long>(renderer.generation)
        );
#elif LAB_CHECKPOINT >= 8
        std::snprintf(title, sizeof(title), "P36 | soft shadow + orbit camera | time %.2f", double(frame.elapsedSeconds));
#elif LAB_CHECKPOINT >= 7
        SDL_strlcpy(title, "P36 | room planes + material IDs", sizeof(title));
#elif LAB_CHECKPOINT >= 6
        SDL_strlcpy(title, "P36 | sphere + box + torus SDF", sizeof(title));
#elif LAB_CHECKPOINT >= 5
        SDL_strlcpy(title, "P36 | numerical normal + Lambert", sizeof(title));
#elif LAB_CHECKPOINT >= 4
        std::snprintf(title, sizeof(title), "P36 | sphere tracing | max steps %d | epsilon %.4f", frame.maximumSteps, double(frame.hitEpsilon));
#elif LAB_CHECKPOINT >= 3
        SDL_strlcpy(title, "P36 | signed distance to one sphere", sizeof(title));
#elif LAB_CHECKPOINT >= 2
        SDL_strlcpy(title, "P36 | one camera ray per fragment", sizeof(title));
#elif LAB_CHECKPOINT >= 1
        SDL_strlcpy(title, "P36 | fullscreen triangle + fragment coordinates", sizeof(title));
#else
        SDL_strlcpy(title, "Project 36 starter | fullscreen fragment baseline", sizeof(title));
#endif
        SDL_SetWindowTitle(window, title);
        if (!SDL_GL_SwapWindow(window)) {
            std::cerr << "SDL_GL_SwapWindow failed: " << SDL_GetError() << '\n';
            running = false;
        }
    }

    // Cleanup GPU resources trong lúc OpenGL context vẫn còn current.
    SDL_CaptureMouse(false);
    renderer.destroy(gl);
    destroyWindowAndContext(window, context);
    return EXIT_SUCCESS;
}
