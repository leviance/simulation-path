#include "gl_api.hpp"
#include "pipeline.hpp"
#include "shader_renderer.hpp"

#include <SDL3/SDL.h>

#include <algorithm>
#include <cstdio>
#include <cstdlib>
#include <filesystem>
#include <iostream>
#include <string>
#include <system_error>

namespace {

constexpr int kInitialWidth = 960;
constexpr int kInitialHeight = 640;
constexpr std::uint64_t kShaderDebounceMilliseconds = 140;

bool requestOpenGl33Core() {
    if (!SDL_GL_SetAttribute(SDL_GL_CONTEXT_MAJOR_VERSION, 3)) {
        return false;
    }
    if (!SDL_GL_SetAttribute(SDL_GL_CONTEXT_MINOR_VERSION, 3)) {
        return false;
    }
    if (!SDL_GL_SetAttribute(SDL_GL_CONTEXT_PROFILE_MASK, SDL_GL_CONTEXT_PROFILE_CORE)) {
        return false;
    }
    if (!SDL_GL_SetAttribute(SDL_GL_DOUBLEBUFFER, 1)) {
        return false;
    }
    return SDL_GL_SetAttribute(SDL_GL_DEPTH_SIZE, 24);
}

bool readWindowSizes(SDL_Window* window, int& windowWidth, int& windowHeight, int& framebufferWidth, int& framebufferHeight) {
    if (!SDL_GetWindowSize(window, &windowWidth, &windowHeight)) {
        return false;
    }
    if (!SDL_GetWindowSizeInPixels(window, &framebufferWidth, &framebufferHeight)) {
        return false;
    }
    windowWidth = std::max(1, windowWidth);
    windowHeight = std::max(1, windowHeight);
    framebufferWidth = std::max(1, framebufferWidth);
    framebufferHeight = std::max(1, framebufferHeight);
    return true;
}

bool containsShaderPair(const std::filesystem::path& directory) {
    for (const char* filename : {"lab.vert", "lab.frag"}) {
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

#if LAB_CHECKPOINT >= 4
bool reloadFromDisk(lab::GlApi& gl, lab::ShaderLabRenderer& renderer, const std::filesystem::path& directory, std::string& diagnostics) {
    lab::ShaderSources candidate{};
    if (!lab::readShaderFiles(directory, candidate, diagnostics)) {
        lab::recordReloadAttempt(renderer.reloadState, 0, false);
        return false;
    }
    return renderer.reload(gl, candidate, diagnostics);
}
#endif

} // namespace

int main() {
    // Setup: giữ cube/OpenGL foundation đã hoàn thành ở Project 34.
    if (!SDL_Init(SDL_INIT_VIDEO)) {
        std::cerr << "SDL_Init failed: " << SDL_GetError() << '\n';
        return EXIT_FAILURE;
    }
    if (!requestOpenGl33Core()) {
        std::cerr << "SDL_GL_SetAttribute failed: " << SDL_GetError() << '\n';
        SDL_Quit();
        return EXIT_FAILURE;
    }

    SDL_WindowFlags windowFlags = SDL_WINDOW_OPENGL;
    windowFlags |= SDL_WINDOW_RESIZABLE;
    windowFlags |= SDL_WINDOW_HIGH_PIXEL_DENSITY;
    SDL_Window* window = SDL_CreateWindow("Project 35 | Shader Hot Reload Lab", kInitialWidth, kInitialHeight, windowFlags);
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
    gl.ClearDepth(1.0);

    const std::filesystem::path shaderPath = shaderDirectory();
    lab::ShaderLabRenderer renderer{};
    std::string diagnostics{};
#if LAB_CHECKPOINT >= 1
    lab::ShaderSources initialSources{};
    if (!lab::readShaderFiles(shaderPath, initialSources, diagnostics)) {
        std::cerr << diagnostics << '\n';
        renderer.destroy(gl);
        destroyWindowAndContext(window, context);
        return EXIT_FAILURE;
    }
    if (!renderer.initialize(gl, initialSources, diagnostics)) {
#else
    if (!renderer.initializeEmbedded(gl, diagnostics)) {
#endif
        std::cerr << diagnostics << '\n';
        renderer.destroy(gl);
        destroyWindowAndContext(window, context);
        return EXIT_FAILURE;
    }

    std::cout << "Watching shader directory: " << shaderPath.string() << '\n';

    lab::ShaderScene scene{};
    bool paused = false;
    bool dragging = false;
    float previousMouseX = 0.0F;
    float previousMouseY = 0.0F;
    float mouseWindowX = float(kInitialWidth) * 0.5F;
    float mouseWindowY = float(kInitialHeight) * 0.5F;
    std::uint64_t previousTicks = SDL_GetTicksNS();
#if LAB_CHECKPOINT >= 5
    lab::ShaderWatchState watcher{};
    lab::updateShaderWatch(watcher, lab::readShaderFileStamps(shaderPath), SDL_GetTicks(), kShaderDebounceMilliseconds);
#endif
#if LAB_CHECKPOINT >= 8
    const lab::ShaderLabValidationReport validation = lab::validateShaderLabContract();
#endif

    bool running = true;
    while (running) {
        bool singleStep = false;
#if LAB_CHECKPOINT >= 4
        bool reloadRequested = false;
#endif
        SDL_Event event{};
        while (SDL_PollEvent(&event)) {
            if (event.type == SDL_EVENT_QUIT) {
                running = false;
            } else if (event.type == SDL_EVENT_WINDOW_FOCUS_LOST) {
                dragging = false;
                SDL_CaptureMouse(false);
            } else if (event.type == SDL_EVENT_KEY_DOWN && !event.key.repeat) {
                if (event.key.key == SDLK_ESCAPE) {
                    running = false;
#if LAB_CHECKPOINT >= 4
                } else if (event.key.key == SDLK_F5) {
                    reloadRequested = true;
#endif
                } else if (event.key.key == SDLK_SPACE) {
                    paused = !paused;
                } else if (event.key.key == SDLK_N) {
                    singleStep = true;
                    paused = true;
                } else if (event.key.key == SDLK_R) {
                    scene = {};
                    paused = false;
                }
            }

            if (event.type == SDL_EVENT_MOUSE_BUTTON_DOWN && event.button.button == SDL_BUTTON_LEFT) {
                dragging = true;
                previousMouseX = event.button.x;
                previousMouseY = event.button.y;
                mouseWindowX = event.button.x;
                mouseWindowY = event.button.y;
                SDL_CaptureMouse(true);
            } else if (event.type == SDL_EVENT_MOUSE_MOTION) {
                mouseWindowX = event.motion.x;
                mouseWindowY = event.motion.y;
                if (dragging) {
                    scene.angleY += (event.motion.x - previousMouseX) * 0.008F;
                    scene.angleX += (event.motion.y - previousMouseY) * 0.008F;
                    previousMouseX = event.motion.x;
                    previousMouseY = event.motion.y;
                    paused = true;
                }
            } else if (event.type == SDL_EVENT_MOUSE_BUTTON_UP && event.button.button == SDL_BUTTON_LEFT) {
                dragging = false;
                SDL_CaptureMouse(false);
            }
        }

        const std::uint64_t currentTicks = SDL_GetTicksNS();
        const float deltaSeconds = std::min(0.05F, float(currentTicks - previousTicks) / 1'000'000'000.0F);
        previousTicks = currentTicks;
        if (!paused) {
            scene.elapsedSeconds += deltaSeconds;
            scene.angleY += deltaSeconds * 0.38F;
        }
        if (singleStep) {
            scene.elapsedSeconds += 0.1F;
            scene.angleY += 0.04F;
        }

#if LAB_CHECKPOINT >= 5
        const lab::ShaderFileStamps stamps = lab::readShaderFileStamps(shaderPath);
        if (lab::updateShaderWatch(watcher, stamps, SDL_GetTicks(), kShaderDebounceMilliseconds)) {
            reloadRequested = true;
        }
#endif
#if LAB_CHECKPOINT >= 4
        if (reloadRequested) {
            const bool reloadSucceeded = reloadFromDisk(gl, renderer, shaderPath, diagnostics);
            if (reloadSucceeded) {
                std::cout << diagnostics << '\n';
            } else {
                std::cerr << diagnostics << "\nLast-good program remains active.\n";
            }
        }
#endif

        int windowWidth = 1;
        int windowHeight = 1;
        int framebufferWidth = 1;
        int framebufferHeight = 1;
        if (!readWindowSizes(window, windowWidth, windowHeight, framebufferWidth, framebufferHeight)) {
            std::cerr << "Cannot read window/framebuffer size: " << SDL_GetError() << '\n';
            running = false;
            continue;
        }
        scene.mouseX = mouseWindowX * float(framebufferWidth) / float(windowWidth);
        scene.mouseY = float(framebufferHeight) - mouseWindowY * float(framebufferHeight) / float(windowHeight);

        gl.Viewport(0, 0, framebufferWidth, framebufferHeight);
        gl.ClearColor(13.0F / 255.0F, 21.0F / 255.0F, 38.0F / 255.0F, 1.0F);
        gl.Clear(GL_COLOR_BUFFER_BIT | GL_DEPTH_BUFFER_BIT);
        const lab::Mat4 mvp = lab::makeMvp(scene, float(framebufferWidth) / float(framebufferHeight));
        renderer.draw(gl, mvp, scene, framebufferWidth, framebufferHeight);

        char title[640]{};
#if LAB_CHECKPOINT >= 8
        const char* validationLabel = "INVALID";
        if (validation.allPassed()) {
            validationLabel = "valid";
        }
        const char* reloadLabel = "last reload failed; last-good active";
        if (renderer.reloadState.lastReloadSucceeded) {
            reloadLabel = "last reload OK";
        }
        std::snprintf(title, sizeof(title), "P35 | shader generation %llu | attempts %llu | %s | contract %s | F5 reload Space N R", static_cast<unsigned long long>(renderer.reloadState.generation), static_cast<unsigned long long>(renderer.reloadState.attempts), reloadLabel, validationLabel);
#elif LAB_CHECKPOINT >= 6
        std::snprintf(title, sizeof(title), "P35 | live uniforms | time %.2f | mouse %.0f,%.0f | F5 reload", double(scene.elapsedSeconds), double(scene.mouseX), double(scene.mouseY));
#elif LAB_CHECKPOINT >= 5
    std::snprintf(title, sizeof(title), "P35 | auto watch + %llums debounce | generation %llu | F5 manual", static_cast<unsigned long long>(kShaderDebounceMilliseconds), static_cast<unsigned long long>(renderer.reloadState.generation));
#elif LAB_CHECKPOINT >= 4
    std::snprintf(title, sizeof(title), "P35 | transactional reload | generation %llu | F5", static_cast<unsigned long long>(renderer.reloadState.generation));
#elif LAB_CHECKPOINT >= 3
    SDL_strlcpy(title, "P35 | candidate program linked and interface checked", sizeof(title));
#elif LAB_CHECKPOINT >= 2
    SDL_strlcpy(title, "P35 | compile diagnostics include stage and driver info log", sizeof(title));
#elif LAB_CHECKPOINT >= 1
    SDL_strlcpy(title, "P35 | GLSL loaded from shaders/lab.vert and lab.frag", sizeof(title));
#else
    SDL_strlcpy(title, "Project 35 starter | embedded shaders from Project 34", sizeof(title));
#endif
        SDL_SetWindowTitle(window, title);
        if (!SDL_GL_SwapWindow(window)) {
            std::cerr << "SDL_GL_SwapWindow failed: " << SDL_GetError() << '\n';
            running = false;
        }
    }

    // Cleanup: xóa program và mesh khi OpenGL context vẫn còn current.
    renderer.destroy(gl);
    destroyWindowAndContext(window, context);
    return EXIT_SUCCESS;
}
