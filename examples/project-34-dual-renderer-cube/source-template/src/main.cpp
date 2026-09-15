#include "gpu_renderer.hpp"
#include "pipeline.hpp"

#include <SDL3/SDL.h>

#include <algorithm>
#include <cmath>
#include <cstdio>
#include <cstdlib>
#include <iostream>
#include <numbers>
#include <string>

namespace {

constexpr int kInitialWidth = 960;
constexpr int kInitialHeight = 640;
constexpr float kFixedAngleStep = std::numbers::pi_v<float> / 18.0F;

bool requestOpenGl33Core() {
    return SDL_GL_SetAttribute(SDL_GL_CONTEXT_MAJOR_VERSION, 3) &&
        SDL_GL_SetAttribute(SDL_GL_CONTEXT_MINOR_VERSION, 3) &&
        SDL_GL_SetAttribute(SDL_GL_CONTEXT_PROFILE_MASK, SDL_GL_CONTEXT_PROFILE_CORE) &&
        SDL_GL_SetAttribute(SDL_GL_DOUBLEBUFFER, 1) &&
        SDL_GL_SetAttribute(SDL_GL_DEPTH_SIZE, 24);
}

bool readFramebufferSize(SDL_Window* window, int& width, int& height) {
    if (!SDL_GetWindowSizeInPixels(window, &width, &height)) {
        return false;
    }
    width = std::max(1, width);
    height = std::max(1, height);
    return true;
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
    // Setup: starter giữ nguyên OpenGL foundation của Project 33; cube được thêm theo checkpoint.
    if (!SDL_Init(SDL_INIT_VIDEO)) {
        std::cerr << "SDL_Init failed: " << SDL_GetError() << '\n';
        return EXIT_FAILURE;
    }
    if (!requestOpenGl33Core()) {
        std::cerr << "SDL_GL_SetAttribute failed: " << SDL_GetError() << '\n';
        SDL_Quit();
        return EXIT_FAILURE;
    }

    SDL_WindowFlags windowFlags = SDL_WINDOW_RESIZABLE;
    windowFlags |= SDL_WINDOW_OPENGL;
    windowFlags |= SDL_WINDOW_HIGH_PIXEL_DENSITY;
    SDL_Window* window = SDL_CreateWindow("Project 34 | Dual Renderer Cube", kInitialWidth, kInitialHeight, windowFlags);
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

#if LAB_CHECKPOINT >= 1
    lab::CubeScene scene{};
#if LAB_CHECKPOINT >= 4
    lab::RendererKind renderer = lab::RendererKind::cpu;
#if LAB_CHECKPOINT < 8
    renderer = lab::RendererKind::gpu;
#endif
#endif
    bool dragging = false;
    float previousMouseX = 0.0F;
    float previousMouseY = 0.0F;
#endif

#if LAB_CHECKPOINT >= 3
    lab::Framebuffer cpuFramebuffer{};
    lab::CpuTexturePresenter cpuPresenter{};
    std::string diagnostics{};
    if (!cpuPresenter.initialize(gl, diagnostics)) {
        std::cerr << diagnostics << '\n';
        cpuPresenter.destroy(gl);
        destroyWindowAndContext(window, context);
        return EXIT_FAILURE;
    }
    lab::CpuRenderStats cpuStats{};
#endif

#if LAB_CHECKPOINT >= 4
    lab::GpuCubeRenderer gpuRenderer{};
    if (!gpuRenderer.initialize(gl, diagnostics)) {
        std::cerr << diagnostics << '\n';
        gpuRenderer.destroy(gl);
#if LAB_CHECKPOINT >= 3
        cpuPresenter.destroy(gl);
#endif
        destroyWindowAndContext(window, context);
        return EXIT_FAILURE;
    }
#endif

#if LAB_CHECKPOINT >= 8
    bool paused = true;
    std::uint64_t previousTicks = SDL_GetTicksNS();
#endif
#if LAB_CHECKPOINT >= 9
    const lab::DualRendererValidationReport validation = lab::validateDualRendererCubeContract();
#endif

    bool running = true;
    while (running) {
        bool singleStep = false;
        SDL_Event event{};
        while (SDL_PollEvent(&event)) {
            if (event.type == SDL_EVENT_QUIT) {
                running = false;
            } else if (event.type == SDL_EVENT_KEY_DOWN && !event.key.repeat) {
                if (event.key.key == SDLK_ESCAPE) {
                    running = false;
#if LAB_CHECKPOINT >= 8
                } else if (event.key.key == SDLK_F1) {
                    renderer = lab::RendererKind::cpu;
                } else if (event.key.key == SDLK_F2) {
                    renderer = lab::RendererKind::gpu;
                } else if (event.key.key == SDLK_SPACE) {
                    paused = !paused;
                } else if (event.key.key == SDLK_N) {
                    singleStep = true;
                    paused = true;
#endif
#if LAB_CHECKPOINT >= 6
                } else if (event.key.key == SDLK_D) {
                    scene.depthEnabled = !scene.depthEnabled;
#endif
#if LAB_CHECKPOINT >= 7
                } else if (event.key.key == SDLK_C) {
                    scene.cullingEnabled = !scene.cullingEnabled;
#endif
#if LAB_CHECKPOINT >= 1
                } else if (event.key.key == SDLK_R) {
                    scene = {};
#if LAB_CHECKPOINT >= 8
                    renderer = lab::RendererKind::cpu;
                    paused = true;
#endif
#endif
                }
            }

#if LAB_CHECKPOINT >= 1
            if (event.type == SDL_EVENT_MOUSE_BUTTON_DOWN && event.button.button == SDL_BUTTON_LEFT) {
                dragging = true;
                previousMouseX = event.button.x;
                previousMouseY = event.button.y;
                SDL_CaptureMouse(true);
            } else if (event.type == SDL_EVENT_MOUSE_MOTION && dragging) {
                scene.angleY += (event.motion.x - previousMouseX) * 0.008F;
                scene.angleX += (event.motion.y - previousMouseY) * 0.008F;
                previousMouseX = event.motion.x;
                previousMouseY = event.motion.y;
#if LAB_CHECKPOINT >= 8
                paused = true;
#endif
            } else if (event.type == SDL_EVENT_MOUSE_BUTTON_UP && event.button.button == SDL_BUTTON_LEFT) {
                dragging = false;
                SDL_CaptureMouse(false);
            }
#endif
        }

#if LAB_CHECKPOINT >= 8
        const std::uint64_t currentTicks = SDL_GetTicksNS();
        const float deltaSeconds = std::min(0.05F, float(currentTicks - previousTicks) / 1'000'000'000.0F);
        previousTicks = currentTicks;
        if (!paused) {
            scene.angleY += deltaSeconds * 0.55F;
        }
        if (singleStep) {
            scene.angleY += kFixedAngleStep;
        }
#else
        static_cast<void>(singleStep);
#endif

        int framebufferWidth = 1;
        int framebufferHeight = 1;
        if (!readFramebufferSize(window, framebufferWidth, framebufferHeight)) {
            std::cerr << "SDL_GetWindowSizeInPixels failed: " << SDL_GetError() << '\n';
            running = false;
            continue;
        }
        gl.Viewport(0, 0, framebufferWidth, framebufferHeight);
        gl.ClearColor(13.0F / 255.0F, 21.0F / 255.0F, 38.0F / 255.0F, 1.0F);
        gl.Clear(GL_COLOR_BUFFER_BIT | GL_DEPTH_BUFFER_BIT);

#if LAB_CHECKPOINT >= 4
        if (renderer == lab::RendererKind::gpu) {
            const lab::Mat4 mvp = lab::makeMvp(scene, float(framebufferWidth) / float(framebufferHeight));
            gpuRenderer.draw(gl, mvp, scene.depthEnabled, scene.cullingEnabled);
        } else {
            if (cpuFramebuffer.width != framebufferWidth || cpuFramebuffer.height != framebufferHeight) {
                cpuFramebuffer.resize(framebufferWidth, framebufferHeight);
                cpuPresenter.resize(gl, framebufferWidth, framebufferHeight);
            }
            cpuStats = lab::rasterizeCpuCube(cpuFramebuffer, scene);
            cpuPresenter.upload(gl, cpuFramebuffer);
            cpuPresenter.draw(gl);
        }
#elif LAB_CHECKPOINT >= 3
        if (cpuFramebuffer.width != framebufferWidth || cpuFramebuffer.height != framebufferHeight) {
            cpuFramebuffer.resize(framebufferWidth, framebufferHeight);
            cpuPresenter.resize(gl, framebufferWidth, framebufferHeight);
        }
        cpuStats = lab::rasterizeCpuCube(cpuFramebuffer, scene);
        cpuPresenter.upload(gl, cpuFramebuffer);
        cpuPresenter.draw(gl);
#endif

        char title[620]{};
#if LAB_CHECKPOINT >= 6
        const char* depthLabel = "off";
        if (scene.depthEnabled) {
            depthLabel = "on";
        }
#endif
#if LAB_CHECKPOINT >= 7
        const char* cullingLabel = "off";
        if (scene.cullingEnabled) {
            cullingLabel = "on";
        }
#endif
#if LAB_CHECKPOINT >= 9
        const bool contractValid = validation.vertexLayout && validation.indexBounds && validation.finiteClipCoordinates && validation.depthOrderIndependent && validation.cullingRemovesTriangles && validation.deterministicCpuFrame && validation.rendererSwitchPreservesScene;
        const char* contractLabel = "INVALID";
        if (contractValid) {
            contractLabel = "valid";
        }
        std::snprintf(title, sizeof(title), "P34 | %s | depth %s | culling %s | angle %.1f/%.1f | contract %s | F1 F2 D C Space N R", lab::rendererLabel(renderer), depthLabel, cullingLabel, double(scene.angleX * 180.0F / std::numbers::pi_v<float>), double(scene.angleY * 180.0F / std::numbers::pi_v<float>), contractLabel);
#elif LAB_CHECKPOINT >= 8
        std::snprintf(title, sizeof(title), "P34 | %s | shared scene %.1f/%.1f deg | F1 F2 Space N R", lab::rendererLabel(renderer), double(scene.angleX * 180.0F / std::numbers::pi_v<float>), double(scene.angleY * 180.0F / std::numbers::pi_v<float>));
#elif LAB_CHECKPOINT >= 7
        std::snprintf(title, sizeof(title), "P34 | GPU cube | culling %s | C toggle | depth %s", cullingLabel, depthLabel);
#elif LAB_CHECKPOINT >= 6
        std::snprintf(title, sizeof(title), "P34 | GPU cube | depth %s | D toggle", depthLabel);
#elif LAB_CHECKPOINT >= 5
        const lab::Mat4 mvp = lab::makeMvp(scene, float(framebufferWidth) / float(framebufferHeight));
        const lab::VertexTrace trace = lab::traceVertex(lab::kCubeVertices[0], mvp, framebufferWidth, framebufferHeight);
        std::snprintf(title, sizeof(title), "P34 | local vertex 0 -> clip (%.2f %.2f %.2f %.2f) -> depth %.4f", double(trace.clip.x), double(trace.clip.y), double(trace.clip.z), double(trace.clip.w), double(trace.screen.z));
#elif LAB_CHECKPOINT >= 4
        SDL_strlcpy(title, "P34 | GPU indexed cube | VBO + EBO + glDrawElements", sizeof(title));
#elif LAB_CHECKPOINT >= 3
        std::snprintf(title, sizeof(title), "P34 | CPU cube | 12 triangles | pass %zu reject %zu", cpuStats.passedFragments, cpuStats.rejectedFragments);
#elif LAB_CHECKPOINT >= 2
        std::snprintf(title, sizeof(title), "P34 | indexed cube contract | %zu vertices | %zu indices", lab::kCubeVertices.size(), lab::kCubeIndices.size());
#elif LAB_CHECKPOINT >= 1
        std::snprintf(title, sizeof(title), "P34 | shared CubeScene | angle %.1f/%.1f | drag, R", double(scene.angleX * 180.0F / std::numbers::pi_v<float>), double(scene.angleY * 180.0F / std::numbers::pi_v<float>));
#else
        SDL_strlcpy(title, "Project 34 starter | SDL3 + OpenGL foundation from Project 33", sizeof(title));
#endif
        SDL_SetWindowTitle(window, title);
        if (!SDL_GL_SwapWindow(window)) {
            std::cerr << "SDL_GL_SwapWindow failed: " << SDL_GetError() << '\n';
            running = false;
        }
    }

    // Cleanup: nhả GPU resources khi context vẫn current; context và window bị destroy sau cùng.
#if LAB_CHECKPOINT >= 4
    gpuRenderer.destroy(gl);
#endif
#if LAB_CHECKPOINT >= 3
    cpuPresenter.destroy(gl);
#endif
    destroyWindowAndContext(window, context);
    return EXIT_SUCCESS;
}
