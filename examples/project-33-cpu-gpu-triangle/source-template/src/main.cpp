#include "editor.hpp"
#include "gpu_renderer.hpp"
#include "overlay.hpp"
#include "pipeline.hpp"
#include "verification.hpp"

#include <SDL3/SDL.h>

#include <algorithm>
#include <cmath>
#include <cstdio>
#include <cstdlib>
#include <iostream>
#include <numbers>
#include <string>

namespace {

constexpr int kInitialWidth = 1120;
constexpr int kInitialHeight = 720;
constexpr float kFixedAngleStep = std::numbers::pi_v<float> / 18.0F;

bool readFramebufferSize(SDL_Window* window, int& width, int& height) {
    if (!SDL_GetWindowSizeInPixels(window, &width, &height)) {
        return false;
    }
    width = std::max(1, width);
    height = std::max(1, height);
    return true;
}

#if LAB_CHECKPOINT >= 1
bool requestOpenGl33Core() {
    return SDL_GL_SetAttribute(SDL_GL_CONTEXT_MAJOR_VERSION, 3) &&
        SDL_GL_SetAttribute(SDL_GL_CONTEXT_MINOR_VERSION, 3) &&
        SDL_GL_SetAttribute(SDL_GL_CONTEXT_PROFILE_MASK, SDL_GL_CONTEXT_PROFILE_CORE) &&
        SDL_GL_SetAttribute(SDL_GL_DOUBLEBUFFER, 1);
}

void destroyWindowAndContext(SDL_Window* window, SDL_GLContext context) {
    if (context) {
        SDL_GL_DestroyContext(context);
    }
    SDL_DestroyWindow(window);
    SDL_Quit();
}
#endif

} // namespace

int main(int argc, char** argv) {
    const char* capturePath = argc == 3 && std::string(argv[1]) == "--capture" ? argv[2] : nullptr;
    const bool verify = (argc == 2 && std::string(argv[1]) == "--verify") || capturePath != nullptr;
    bool verificationFailed = false;
    int verificationFrame = 0;
    // Setup: giữ SDL lifecycle quen thuộc, rồi thêm OpenGL theo từng checkpoint.
    if (!SDL_Init(SDL_INIT_VIDEO)) {
        std::cerr << "SDL_Init failed: " << SDL_GetError() << '\n';
        return EXIT_FAILURE;
    }

#if LAB_CHECKPOINT >= 1
    if (!requestOpenGl33Core()) {
        std::cerr << "SDL_GL_SetAttribute failed: " << SDL_GetError() << '\n';
        SDL_Quit();
        return EXIT_FAILURE;
    }
#endif

    SDL_WindowFlags windowFlags = SDL_WINDOW_RESIZABLE;
#if LAB_CHECKPOINT >= 1
    windowFlags |= SDL_WINDOW_OPENGL;
    windowFlags |= SDL_WINDOW_HIGH_PIXEL_DENSITY;
#endif
    if (verify)
        windowFlags |= SDL_WINDOW_HIDDEN;
    SDL_Window* window = SDL_CreateWindow(
        "Project 33 | CPU/GPU Triangle",
        kInitialWidth,
        kInitialHeight,
        windowFlags
    );
    if (!window) {
        std::cerr << "SDL_CreateWindow failed: " << SDL_GetError() << '\n';
        SDL_Quit();
        return EXIT_FAILURE;
    }

#if LAB_CHECKPOINT >= 1
    SDL_GLContext context = SDL_GL_CreateContext(window);
    if (!context) {
        std::cerr << "SDL_GL_CreateContext failed: " << SDL_GetError() << '\n';
        SDL_DestroyWindow(window);
        SDL_Quit();
        return EXIT_FAILURE;
    }
    if (!SDL_GL_MakeCurrent(window, context)) {
        std::cerr << "SDL_GL_MakeCurrent failed: " << SDL_GetError() << '\n';
        destroyWindowAndContext(window, context);
        return EXIT_FAILURE;
    }

    lab::GlApi gl{};
    if (!gl.load()) {
        std::cerr << "SDL_GL_GetProcAddress failed for " << gl.missingFunction << '\n';
        destroyWindowAndContext(window, context);
        return EXIT_FAILURE;
    }
    if (!SDL_GL_SetSwapInterval(verify ? 0 : 1)) {
        std::cerr << "VSync unavailable: " << SDL_GetError() << '\n';
    }
    const GLubyte* version = gl.GetString(GL_VERSION);
    const GLubyte* renderer = gl.GetString(GL_RENDERER);
    const char* versionText = "unknown";
    if (version) {
        versionText = reinterpret_cast<const char*>(version);
    }
    const char* rendererText = "unknown";
    if (renderer) {
        rendererText = reinterpret_cast<const char*>(renderer);
    }
    std::cout << "OpenGL " << versionText << '\n';
    std::cout << "Renderer " << rendererText << '\n';
#endif

#if LAB_CHECKPOINT >= 2
    lab::GpuTriangleRenderer gpuTriangle{};
    std::string diagnostics{};
    if (!gpuTriangle.initializeProgram(gl, diagnostics)) {
        std::cerr << diagnostics << '\n';
        gpuTriangle.destroy(gl);
        destroyWindowAndContext(window, context);
        return EXIT_FAILURE;
    }
    std::cout << "Triangle shader program linked successfully.\n";
#endif

#if LAB_CHECKPOINT >= 3
    if (!gpuTriangle.initializeMesh(gl)) {
        std::cerr << "VBO/VAO initialization failed with OpenGL error " << gl.GetError() << '\n';
        gpuTriangle.destroy(gl);
        destroyWindowAndContext(window, context);
        return EXIT_FAILURE;
    }
#endif

#if LAB_CHECKPOINT >= 4
    lab::CpuTexturePresenter cpuPresenter{};
    if (!cpuPresenter.initialize(gl, diagnostics)) {
        std::cerr << diagnostics << '\n';
        cpuPresenter.destroy(gl);
        gpuTriangle.destroy(gl);
        destroyWindowAndContext(window, context);
        return EXIT_FAILURE;
    }
    lab::Framebuffer cpuFramebuffer{};
#endif

#if LAB_CHECKPOINT >= 9
    const lab::PipelineValidationReport validation = lab::validateCpuGpuTriangleContract();
    std::array<lab::GpuVertex, 3> triangle = lab::kSourceTriangle;
    int selectedVertex = 0;
    int colorPreset = 0;
    bool dragging = false;
    int dragPanel = 0;
    bool verticesDirty = false;
    lab::GpuVertex beforeDrag{};
    std::string probeStatus = "P READS GPU PIXEL - NOT YET MEASURED";
#endif

    bool running = true;
#if LAB_CHECKPOINT >= 9
    if (verify && !lab::verifyShaderDiagnostics(gl)) {
        std::cerr << "Shader failure diagnostics fixture failed.\n";
        verificationFailed = true;
        running = false;
    }
#endif
    bool paused = true;
#if LAB_CHECKPOINT >= 7
    bool smoothColor = false;
#elif LAB_CHECKPOINT >= 3
    constexpr bool smoothColor = false;
#endif
#if LAB_CHECKPOINT >= 3
    lab::Transform2D transform{};
    transform.scale = 0.82F;
#endif
#if LAB_CHECKPOINT >= 8
    bool probeRequested = false;
    lab::GpuProbeReadback lastProbe{};
#endif
    std::uint64_t previousTicks = SDL_GetTicksNS();
    const Uint64 verificationStarted = SDL_GetTicks();

    while (running) {
#if LAB_CHECKPOINT >= 9
        if (verify) {
            // Independent fixtures exercise color, transforms, winding, edits and resize.
            smoothColor = verificationFrame != 0;
            if (verificationFrame == 2) {
                transform.angleRadians = 0.35F;
                transform.translation = {0.08F, -0.05F};
            }
            if (verificationFrame == 3) {
                std::swap(triangle[1], triangle[2]);
                verticesDirty = true;
            }
            if (verificationFrame == 4) {
                triangle[0].positionX += 0.12F;
                triangle[0].red = 0.15F;
                verticesDirty = true;
            }
            if (verificationFrame == 5)
                SDL_SetWindowSize(window, 803, 517);
        }
#endif
        bool singleStep = false;
        SDL_Event event{};
        while (SDL_PollEvent(&event)) {
            if (event.type == SDL_EVENT_QUIT) {
                running = false;
#if LAB_CHECKPOINT >= 9
            } else if (event.type == SDL_EVENT_WINDOW_FOCUS_LOST || event.type == SDL_EVENT_WINDOW_PIXEL_SIZE_CHANGED) {
                paused = true;
                dragging = false;
                SDL_CaptureMouse(false);
            } else if (event.type == SDL_EVENT_MOUSE_BUTTON_DOWN || event.type == SDL_EVENT_MOUSE_MOTION || event.type == SDL_EVENT_MOUSE_BUTTON_UP) {
                int logicalWidth = 0, logicalHeight = 0, pixelWidth = 0, pixelHeight = 0;
                if (!SDL_GetWindowSize(window, &logicalWidth, &logicalHeight) || !SDL_GetWindowSizeInPixels(window, &pixelWidth, &pixelHeight))
                    continue;
                lab::Vec2 mousePoint{};
                if (event.type == SDL_EVENT_MOUSE_MOTION)
                    mousePoint = {event.motion.x, event.motion.y};
                else
                    mousePoint = {event.button.x, event.button.y};
                const lab::PanelPoint point = lab::pointerToPanel(mousePoint, logicalWidth, logicalHeight, pixelWidth, pixelHeight);
                if (event.type == SDL_EVENT_MOUSE_BUTTON_DOWN && event.button.button == SDL_BUTTON_LEFT && point.valid) {
                    const int panelWidth = point.panel == 0 ? pixelWidth / 2 : pixelWidth - pixelWidth / 2;
                    const int picked = lab::pickVertex(triangle, transform, point.ndc, panelWidth, pixelHeight);
                    if (picked >= 0) {
                        selectedVertex = picked;
                        dragPanel = point.panel;
                        beforeDrag = triangle[picked];
                        dragging = SDL_CaptureMouse(true);
                        paused = true;
                    }
                } else if (dragging && point.valid && point.panel == dragPanel && event.type == SDL_EVENT_MOUSE_MOTION) {
                    const lab::Vec2 local = lab::inverseTransformPosition(point.ndc, transform);
                    triangle[selectedVertex].positionX = std::clamp(local.x, -2.0F, 2.0F);
                    triangle[selectedVertex].positionY = std::clamp(local.y, -2.0F, 2.0F);
                    verticesDirty = true;
                    probeStatus = "INPUT CHANGED - PRESS P TO MEASURE AGAIN";
                } else if (event.type == SDL_EVENT_MOUSE_BUTTON_UP && event.button.button == SDL_BUTTON_LEFT) {
                    dragging = false;
                    SDL_CaptureMouse(false);
                }
#endif
            } else if (event.type == SDL_EVENT_KEY_DOWN && !event.key.repeat) {
#if LAB_CHECKPOINT >= 9
                if (dragging && event.key.key != SDLK_ESCAPE)
                    continue;
                if (event.key.key != SDLK_P)
                    probeStatus = "STATE CHANGED - PRESS P TO MEASURE AGAIN";
#endif
                if (event.key.key == SDLK_ESCAPE) {
#if LAB_CHECKPOINT >= 9
                    if (dragging) {
                        triangle[selectedVertex] = beforeDrag;
                        verticesDirty = true;
                        dragging = false;
                        SDL_CaptureMouse(false);
                        continue;
                    }
#endif
                    running = false;
                } else if (event.key.key == SDLK_SPACE) {
                    paused = !paused;
                } else if (event.key.key == SDLK_N) {
                    singleStep = true;
                } else if (event.key.key == SDLK_R) {
#if LAB_CHECKPOINT >= 9
                    triangle = lab::kSourceTriangle;
                    verticesDirty = true;
                    dragging = false;
                    SDL_CaptureMouse(false);
                    probeStatus = "RESET - PRESS P TO MEASURE";
#endif
#if LAB_CHECKPOINT >= 3
                    transform = {};
                    transform.scale = 0.82F;
#endif
                    paused = true;
#if LAB_CHECKPOINT >= 5
                } else if (event.key.key == SDLK_LEFT) {
                    transform.translation.x -= 0.05F;
                } else if (event.key.key == SDLK_RIGHT) {
                    transform.translation.x += 0.05F;
                } else if (event.key.key == SDLK_UP) {
                    transform.translation.y += 0.05F;
                } else if (event.key.key == SDLK_DOWN) {
                    transform.translation.y -= 0.05F;
                } else if (event.key.key == SDLK_Q) {
                    transform.scale = std::max(0.25F, transform.scale - 0.05F);
                } else if (event.key.key == SDLK_E) {
                    transform.scale = std::min(1.0F, transform.scale + 0.05F);
#endif
#if LAB_CHECKPOINT >= 7
                } else if (event.key.key == SDLK_C) {
                    smoothColor = !smoothColor;
#endif
#if LAB_CHECKPOINT >= 8
                } else if (event.key.key == SDLK_P) {
                    probeRequested = true;
#endif
#if LAB_CHECKPOINT >= 9
                } else if (event.key.key == SDLK_1 || event.key.key == SDLK_2 || event.key.key == SDLK_3) {
                    selectedVertex = int(event.key.key - SDLK_1);
                } else if (event.key.key == SDLK_I || event.key.key == SDLK_J || event.key.key == SDLK_K || event.key.key == SDLK_L) {
                    auto& vertex = triangle[selectedVertex];
                    if (event.key.key == SDLK_I)
                        vertex.positionY += 0.025F;
                    if (event.key.key == SDLK_K)
                        vertex.positionY -= 0.025F;
                    if (event.key.key == SDLK_J)
                        vertex.positionX -= 0.025F;
                    if (event.key.key == SDLK_L)
                        vertex.positionX += 0.025F;
                    vertex.positionX = std::clamp(vertex.positionX, -2.0F, 2.0F);
                    vertex.positionY = std::clamp(vertex.positionY, -2.0F, 2.0F);
                    paused = true;
                    verticesDirty = true;
                    probeStatus = "INPUT CHANGED - PRESS P TO MEASURE AGAIN";
                } else if (event.key.key == SDLK_V) {
                    constexpr std::array<lab::Color, 4> colors{{{1, 0.25F, 0.2F}, {0.2F, 1, 0.4F}, {0.2F, 0.5F, 1}, {1, 0.85F, 0.2F}}};
                    colorPreset = (colorPreset + 1) % int(colors.size());
                    auto& vertex = triangle[selectedVertex];
                    vertex.red = colors[colorPreset].red;
                    vertex.green = colors[colorPreset].green;
                    vertex.blue = colors[colorPreset].blue;
                    smoothColor = true;
                    verticesDirty = true;
                    probeStatus = "COLOR CHANGED - PRESS P TO MEASURE AGAIN";
#endif
                }
            }
        }

        const std::uint64_t currentTicks = SDL_GetTicksNS();
        const float deltaSeconds = std::min(0.05F, float(currentTicks - previousTicks) / 1'000'000'000.0F);
        previousTicks = currentTicks;
#if LAB_CHECKPOINT >= 5
        if (!paused) {
            transform.angleRadians += deltaSeconds * 0.5F;
#if LAB_CHECKPOINT >= 9
            probeStatus = "ANIMATING - PAUSE THEN P TO MEASURE";
#endif
        }
        if (singleStep) {
            transform.angleRadians += kFixedAngleStep;
        }
#else
        static_cast<void>(deltaSeconds);
        static_cast<void>(singleStep);
#endif

        int framebufferWidth = 1;
        int framebufferHeight = 1;
        if (!readFramebufferSize(window, framebufferWidth, framebufferHeight)) {
            std::cerr << "SDL_GetWindowSizeInPixels failed: " << SDL_GetError() << '\n';
            running = false;
            continue;
        }
#if LAB_CHECKPOINT >= 1
        const int leftWidth = framebufferWidth / 2;
        const int rightWidth = framebufferWidth - leftWidth;
#endif

#if LAB_CHECKPOINT >= 1
        // Hai clear colors xác nhận context, scissor và pixel-sized framebuffer trước shader.
        gl.Enable(GL_SCISSOR_TEST);
        gl.Scissor(0, 0, leftWidth, framebufferHeight);
        gl.ClearColor(0.055F, 0.085F, 0.15F, 1.0F);
        gl.Clear(GL_COLOR_BUFFER_BIT);
        gl.Scissor(leftWidth, 0, rightWidth, framebufferHeight);
#if LAB_CHECKPOINT >= 4
        // Both backends share the background used by outside color probes.
        gl.ClearColor(11.0F / 255.0F, 16.0F / 255.0F, 32.0F / 255.0F, 1.0F);
#else
        gl.ClearColor(0.04F, 0.065F, 0.12F, 1.0F);
#endif
        gl.Clear(GL_COLOR_BUFFER_BIT);
        gl.Disable(GL_SCISSOR_TEST);
#endif

#if LAB_CHECKPOINT >= 4
        if (cpuFramebuffer.width != leftWidth || cpuFramebuffer.height != framebufferHeight) {
            cpuFramebuffer.resize(leftWidth, framebufferHeight);
            cpuPresenter.resize(gl, leftWidth, framebufferHeight);
        }
#if LAB_CHECKPOINT >= 9
        if (verticesDirty) {
            gpuTriangle.uploadVertices(gl, triangle);
            verticesDirty = false;
        }
        rasterizeCpuTriangle(cpuFramebuffer, triangle, transform, smoothColor);
#else
        rasterizeCpuTriangle(cpuFramebuffer, lab::kSourceTriangle, transform, smoothColor);
#endif
        cpuPresenter.upload(gl, cpuFramebuffer);
        gl.Viewport(0, 0, leftWidth, framebufferHeight);
        cpuPresenter.draw(gl);
#endif

#if LAB_CHECKPOINT >= 3
        gl.Viewport(leftWidth, 0, rightWidth, framebufferHeight);
        gpuTriangle.draw(gl, transform, smoothColor);
#endif

#if LAB_CHECKPOINT >= 8
        if (probeRequested) {
#if LAB_CHECKPOINT >= 9
            const lab::Vec2 centroid = lab::triangleCentroid(triangle, transform);
#else
            const lab::Vec2 centroid = lab::triangleCentroid(lab::kSourceTriangle, transform);
#endif
            const lab::Viewport gpuViewport{leftWidth, 0, rightWidth, framebufferHeight};
#if LAB_CHECKPOINT >= 9
            lastProbe = lab::readGpuProbe(gl, gpuViewport, transform, centroid, smoothColor, triangle);
            if (!lastProbe.valid)
                probeStatus = "PROBE OUTSIDE VIEWPORT - MOVE TRIANGLE BACK";
            else {
                char report[100]{};
                std::snprintf(report, sizeof(report), "PIXEL %d %d / RGB ERROR %.5f / LIMIT %.5f", lastProbe.pixelX, lastProbe.pixelY, double(lastProbe.maximumDifference), 2.0 / 255.0);
                probeStatus = report;
            }
#else
            lastProbe = lab::readGpuProbe(gl, gpuViewport, transform, centroid, smoothColor);
#endif
            if (!lastProbe.valid) {
                std::cout << "Probe unavailable: centroid is outside the viewport. Reset or move the triangle back.\n";
            }
            std::printf(
                "GPU probe (%d,%d) expected %.4f %.4f %.4f actual %.4f %.4f %.4f maxDiff %.6f\n",
                lastProbe.pixelX,
                lastProbe.pixelY,
                double(lastProbe.expected.red),
                double(lastProbe.expected.green),
                double(lastProbe.expected.blue),
                double(lastProbe.actual.red),
                double(lastProbe.actual.green),
                double(lastProbe.actual.blue),
                double(lastProbe.maximumDifference)
            );
            probeRequested = false;
        }
#endif

#if LAB_CHECKPOINT >= 9
        if (verify) {
            const lab::Viewport viewport{leftWidth, 0, rightWidth, framebufferHeight};
            if (!lab::verifyGpuImage(gl, viewport, triangle, transform, smoothColor)) {
                std::cerr << "GPU fixture failed at frame " << verificationFrame << '\n';
                verificationFailed = true;
                running = false;
            }
        }
#endif
        char title[520]{};
#if LAB_CHECKPOINT >= 7
        const char* colorModeLabel = "solid";
        if (smoothColor) {
            colorModeLabel = "smooth";
        }
#endif
#if LAB_CHECKPOINT >= 9
        // Read the unadorned GPU image above; labels must not contaminate probes.
        lab::drawPipelineOverlay(gl, triangle, transform, selectedVertex, framebufferWidth, framebufferHeight, smoothColor, probeStatus);
        if (capturePath && verificationFrame == 0 && !lab::captureFramebuffer(gl, framebufferWidth, framebufferHeight, capturePath)) {
            std::cerr << "Framebuffer capture failed: " << SDL_GetError() << '\n';
            verificationFailed = true;
            running = false;
        }
        const bool cpuContractValid = validation.vertexLayout && validation.transformOrder && validation.cpuRoundTrip &&
            validation.gpuRoundTrip && validation.centroidWeights && validation.deterministicRaster && validation.rgba8Tolerance;
        const char* contractLabel = "INVALID";
        if (cpuContractValid) {
            contractLabel = "valid";
        }
        std::snprintf(
            title,
            sizeof(title),
            "Project 33 | CPU/GPU Triangle | %dx%d px | angle %.1f deg | %s | probe diff %.5f | CPU contract %s | P probe",
            framebufferWidth,
            framebufferHeight,
            double(transform.angleRadians * 180.0F / std::numbers::pi_v<float>),
            colorModeLabel,
            double(lastProbe.maximumDifference),
            contractLabel
        );
#elif LAB_CHECKPOINT >= 8
        std::snprintf(title, sizeof(title), "Project 33 | glReadPixels probe max difference %.6f | P reads centroid", double(lastProbe.maximumDifference));
#elif LAB_CHECKPOINT >= 7
        std::snprintf(title, sizeof(title), "Project 33 | fragment color %s | C toggles", colorModeLabel);
#elif LAB_CHECKPOINT >= 6
        std::snprintf(title, sizeof(title), "Project 33 | framebuffer %dx%d px | CPU top-left | GPU bottom-left", framebufferWidth, framebufferHeight);
#elif LAB_CHECKPOINT >= 5
        std::snprintf(title, sizeof(title), "Project 33 | same rotate-scale-translate | angle %.1f deg", double(transform.angleRadians * 180.0F / std::numbers::pi_v<float>));
#elif LAB_CHECKPOINT >= 4
        SDL_strlcpy(title, "Project 33 | CPU texture left | GPU triangle right", sizeof(title));
#elif LAB_CHECKPOINT >= 3
        SDL_strlcpy(title, "Project 33 | first GPU triangle | VBO + VAO + glDrawArrays", sizeof(title));
#elif LAB_CHECKPOINT >= 2
        SDL_strlcpy(title, "Project 33 | shader program linked | no draw call yet", sizeof(title));
#elif LAB_CHECKPOINT >= 1
        std::snprintf(title, sizeof(title), "Project 33 | OpenGL 3.3 Core | %dx%d framebuffer pixels", framebufferWidth, framebufferHeight);
#else
        SDL_strlcpy(title, "Project 33 starter | SDL window and event loop", sizeof(title));
#endif
        SDL_SetWindowTitle(window, title);

#if LAB_CHECKPOINT >= 1
        if (!SDL_GL_SwapWindow(window)) {
            std::cerr << "SDL_GL_SwapWindow failed: " << SDL_GetError() << '\n';
            running = false;
        }
#else
        SDL_Delay(16U);
#endif
        if (verify) {
            ++verificationFrame;
            if (verificationFrame >= 6)
                running = false;
            if (SDL_GetTicks() - verificationStarted > 15000) {
                verificationFailed = true;
                running = false;
            }
        }
    }

    // Cleanup: GPU objects cần context còn sống, vì vậy chúng được nhả trước context và window.
#if LAB_CHECKPOINT >= 4
    cpuPresenter.destroy(gl);
#endif
#if LAB_CHECKPOINT >= 2
    gpuTriangle.destroy(gl);
#endif
#if LAB_CHECKPOINT >= 1
    destroyWindowAndContext(window, context);
#else
    SDL_DestroyWindow(window);
    SDL_Quit();
#endif
    return verificationFailed ? EXIT_FAILURE : EXIT_SUCCESS;
}
