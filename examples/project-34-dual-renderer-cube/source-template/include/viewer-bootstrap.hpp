#pragma once

#include "gl_api.hpp"
#include "viewer-mesh.hpp"
#include "viewer-scene.hpp"
#include <iostream>

namespace lab {
// Starter/Bài 01–02 chưa có rasterizer. Vẫn chạy và thoát được để kiểm từng bước.
#if LAB_CHECKPOINT < 3
inline int runViewerBootstrap(bool finite) {
    if (!SDL_Init(SDL_INIT_VIDEO)) {
        std::cerr << SDL_GetError();
        return EXIT_FAILURE;
    }
    SDL_GL_SetAttribute(SDL_GL_CONTEXT_MAJOR_VERSION, 3);
    SDL_GL_SetAttribute(SDL_GL_CONTEXT_MINOR_VERSION, 3);
    SDL_GL_SetAttribute(SDL_GL_CONTEXT_PROFILE_MASK, SDL_GL_CONTEXT_PROFILE_CORE);
    SDL_GL_SetAttribute(SDL_GL_DEPTH_SIZE, 24);
    SDL_WindowFlags flags = SDL_WINDOW_OPENGL | SDL_WINDOW_RESIZABLE | SDL_WINDOW_HIGH_PIXEL_DENSITY;
    if (finite) {
        flags |= SDL_WINDOW_HIDDEN;
    }
    SDL_Window* window = SDL_CreateWindow("P34 - Viewer foundation", 960, 640, flags);
    SDL_GLContext context = nullptr;
    if (window) {
        context = SDL_GL_CreateContext(window);
    }
    GlApi gl{};
    int result = EXIT_SUCCESS;
    if (!context || !SDL_GL_MakeCurrent(window, context) || !gl.load()) {
        std::cerr << "OpenGL foundation failed: " << SDL_GetError() << ' ' << gl.missingFunction;
        result = EXIT_FAILURE;
    } else {
#if LAB_CHECKPOINT >= 1
        ViewerScene scene{};
        RendererKind backend = RendererKind::cpu;
#endif
#if LAB_CHECKPOINT >= 2
        std::string diagnostics;
        const auto model = loadViewerMesh(std::string(SDL_GetBasePath()) + "assets/faceted-sphere.obj", diagnostics);
        if (!model) {
            std::cerr << diagnostics;
            result = EXIT_FAILURE;
        } else {
            std::cout << model->name << ": " << model->vertices.size() << " vertices, " << model->triangleCount() << " triangles\n";
        }
#endif
        bool running = result == EXIT_SUCCESS;
        unsigned frames = 0;
        while (running) {
            SDL_Event event{};
            while (SDL_PollEvent(&event)) {
                if (event.type == SDL_EVENT_QUIT || (event.type == SDL_EVENT_KEY_DOWN && event.key.key == SDLK_ESCAPE)) {
                    running = false;
                }
#if LAB_CHECKPOINT >= 1
                if (event.type == SDL_EVENT_KEY_DOWN && !event.key.repeat) {
                    if (event.key.key == SDLK_F1)
                        backend = RendererKind::cpu;
                    if (event.key.key == SDLK_F2)
                        backend = RendererKind::gpu;
                    if (event.key.key == SDLK_RIGHT)
                        turnViewer(scene.view, 0.1, 0);
                    if (event.key.key == SDLK_R)
                        scene = {};
                    const auto title = std::string(rendererLabel(backend)) + " | angle Y " + std::to_string(scene.view.angleY) + " | geometry added in lesson 03";
                    SDL_SetWindowTitle(window, title.c_str());
                }
#endif
            }
            int width = 0, height = 0;
            SDL_GetWindowSizeInPixels(window, &width, &height);
            gl.Viewport(0, 0, width, height);
            gl.ClearColor(0.05F, 0.08F, 0.15F, 1);
            gl.Clear(GL_COLOR_BUFFER_BIT | GL_DEPTH_BUFFER_BIT);
            if (!SDL_GL_SwapWindow(window)) {
                result = EXIT_FAILURE;
                break;
            }
            if (finite && ++frames == 3)
                running = false;
            SDL_Delay(10);
        }
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
