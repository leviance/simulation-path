#ifndef LAB_CHECKPOINT
#define LAB_CHECKPOINT 12
#endif
#include "capture.hpp"
#include "controls.hpp"
#include "run-options.hpp"
#include "run-report.hpp"
#include <SDL3/SDL_main.h>
#include <cstdlib>
#include <iostream>

int main(int argc, char** argv) {
    using namespace water3;
    RunOptions options;
    try {
        options = runOptions(argc, argv);
    } catch (const std::exception& error) {
        std::cerr << error.what() << '\n';
        return EXIT_FAILURE;
    }

    // SDL sở hữu window/context. Không tạo SDL_Renderer trong GL window.
    if (!SDL_Init(SDL_INIT_VIDEO)) {
        std::cerr << SDL_GetError() << '\n';
        return EXIT_FAILURE;
    }
    SDL_GL_SetAttribute(SDL_GL_CONTEXT_MAJOR_VERSION, 4);
    SDL_GL_SetAttribute(SDL_GL_CONTEXT_MINOR_VERSION, 3);
    SDL_GL_SetAttribute(SDL_GL_CONTEXT_PROFILE_MASK, SDL_GL_CONTEXT_PROFILE_CORE);
    SDL_WindowFlags flags = SDL_WINDOW_OPENGL | SDL_WINDOW_RESIZABLE | SDL_WINDOW_HIGH_PIXEL_DENSITY;
    if (options.verify || options.hidden)
        flags |= SDL_WINDOW_HIDDEN;
    SDL_Window* window = SDL_CreateWindow("Project 51 - SPH3D Water Tank", 1280, 820, flags);
    SDL_GLContext context = nullptr;
    if (window)
        context = SDL_GL_CreateContext(window);
    if (!context) {
        std::cerr << "OpenGL 4.3 required: " << SDL_GetError() << '\n';
        if (window)
            SDL_DestroyWindow(window);
        SDL_Quit();
        return EXIT_FAILURE;
    }
    SDL_SetWindowMinimumSize(window, 900, 640);
    lab::GlApi gl;
    if (!gl.load()) {
        std::cerr << gl.missingFunction << '\n';
        SDL_GL_DestroyContext(context);
        SDL_DestroyWindow(window);
        SDL_Quit();
        return EXIT_FAILURE;
    }
    SDL_GL_SetSwapInterval(0);
    std::cout << "OpenGL: " << reinterpret_cast<const char*>(gl.GetString(GL_VERSION)) << "\nGPU: " << reinterpret_cast<const char*>(gl.GetString(GL_RENDERER)) << '\n';

    Engine engine;
    View view;
    Overlay overlay;
    Panel panel;
    Controls controls;
    Plan plan = makePlan(4);
#if LAB_CHECKPOINT >= 2
    plan = makePlan();
#endif
#if LAB_CHECKPOINT >= 11
    // Bản chuẩn mở ở mốc >=100k nhưng vẫn paused; mốc lớn hơn cần xác nhận.
    if (!options.verify)
        plan = makePlan(48);
#endif
    if (options.tail)
        plan = makePlan(8, 257);
    if (options.side)
        plan = makePlan(options.side);
#if LAB_CHECKPOINT >= 12
    if (options.fixture == VerifyCase::scan)
        plan = makePlan(16, 257);
    if (options.verify)
        std::cout << "ORACLE cells=" << plan.cells << " scan_layers=" << plan.levels.size() << " first_scan_groups=" << plan.levels.front().groups << '\n';
    OracleRun oracle;
    oracle.start(options.fixture);
#endif
    controls.ui.playing = options.ticks > 0;
    if (controls.ui.playing)
        controls.ui.message = "RUNNING - MODEL TIME IS NOT WALL TIME";
    controls.ui.debug = options.debug;
    bool running = true, dragging = false, minimized = false, failed = false, benchPrinted = false;
    const auto started = std::chrono::steady_clock::now();

    try {
#if LAB_CHECKPOINT >= 2
        engine.initialize(gl, COURSE_SHADER_DIRECTORY);
        engine.reset(gl, plan);
#endif
#if LAB_CHECKPOINT >= 3
        view.load(gl, COURSE_SHADER_DIRECTORY);
#endif
        overlay.load(gl, COURSE_SHADER_DIRECTORY);
        while (running) {
            const bool expired = options.seconds > 0 && std::chrono::duration<double>(std::chrono::steady_clock::now() - started).count() >= options.seconds;
            if (expired && options.ticks > engine.steps)
                throw std::runtime_error("Finite run did not reach its requested tick count");
            if (expired && options.benchmark && controls.benchmark.phase != BenchmarkPhase::Done)
                throw std::runtime_error("Finite benchmark incomplete");
#if LAB_CHECKPOINT >= 2
            // Cập nhật fence trước khi dựng hit boxes để UI không dùng trạng thái busy cũ.
            const bool completed = engine.poll(gl);
            const auto benchmarkBefore = controls.benchmark.phase;
            controls.benchmark.completedStep(engine, view, completed);
            if (controls.benchmark.phase != benchmarkBefore && controls.benchmark.phase == BenchmarkPhase::Cancelled)
                controls.ui.message = controls.benchmark.message;
            if (options.benchmark && controls.benchmark.phase == BenchmarkPhase::Cancelled)
                throw std::runtime_error(controls.benchmark.message);
#endif
            int logicalWidth = 1, logicalHeight = 1, pixelWidth = 1, pixelHeight = 1;
            SDL_GetWindowSize(window, &logicalWidth, &logicalHeight);
            SDL_GetWindowSizeInPixels(window, &pixelWidth, &pixelHeight);
            const Layout layout(logicalWidth, logicalHeight);
            panel.prepare(layout, controls.ui, plan, engine, controls.benchmark, controls.referenceActive());
            SDL_Event event{};
            while (SDL_PollEvent(&event)) {
                if (event.type == SDL_EVENT_QUIT)
                    running = false;
                if (event.type == SDL_EVENT_KEY_DOWN && !event.key.repeat) {
                    if (event.key.key == SDLK_ESCAPE)
                        running = false;
                    controls.command(keyboardCommand(event.key.key), gl, engine, view, plan);
                    if (event.key.key == SDLK_PAGEDOWN)
                        controls.ui.scroll += 120;
                    if (event.key.key == SDLK_PAGEUP)
                        controls.ui.scroll -= 120;
                    if (!controls.benchmark.active()) {
                        if (event.key.key == SDLK_LEFT)
                            view.camera.yaw -= 0.1F;
                        if (event.key.key == SDLK_RIGHT)
                            view.camera.yaw += 0.1F;
                        if (event.key.key == SDLK_UP)
                            view.camera.pitch = std::clamp(view.camera.pitch + 0.1F, -1.2F, 1.2F);
                        if (event.key.key == SDLK_DOWN)
                            view.camera.pitch = std::clamp(view.camera.pitch - 0.1F, -1.2F, 1.2F);
                    }
                }
                if (event.type == SDL_EVENT_MOUSE_BUTTON_DOWN && event.button.button == SDL_BUTTON_LEFT) {
                    controls.command(panel.hit(event.button.x, event.button.y), gl, engine, view, plan);
                    if (layout.scene.contains(event.button.x, event.button.y) && !controls.benchmark.active()) {
                        dragging = true;
                        SDL_CaptureMouse(true);
                    }
                }
                if (event.type == SDL_EVENT_MOUSE_MOTION && dragging && !controls.benchmark.active()) {
                    view.camera.yaw += event.motion.xrel * 0.005F;
                    view.camera.pitch = std::clamp(view.camera.pitch - event.motion.yrel * 0.005F, -1.2F, 1.2F);
                }
                if (event.type == SDL_EVENT_MOUSE_WHEEL) {
                    float x = 0, y = 0;
                    SDL_GetMouseState(&x, &y);
                    if (layout.panel.contains(x, y))
                        controls.ui.scroll -= event.wheel.y * 30;
                    else if (!controls.benchmark.active())
                        view.camera.zoom = std::clamp(view.camera.zoom * std::exp(event.wheel.y * 0.1F), 0.4F, 3.0F);
                }
                if (event.type == SDL_EVENT_MOUSE_BUTTON_UP || event.type == SDL_EVENT_WINDOW_FOCUS_LOST || event.type == SDL_EVENT_WINDOW_MINIMIZED) {
                    dragging = false;
                    SDL_CaptureMouse(false);
                }
                if (event.type == SDL_EVENT_WINDOW_FOCUS_LOST || event.type == SDL_EVENT_WINDOW_MINIMIZED)
                    controls.pause();
                if (event.type == SDL_EVENT_WINDOW_MINIMIZED)
                    minimized = true;
                if (event.type == SDL_EVENT_WINDOW_RESTORED)
                    minimized = false;
            }
            if (!running)
                break;
#if LAB_CHECKPOINT >= 2
            controls.serviceRequests(gl, engine, plan);
#endif
            controls.serviceReference(gl);
#if LAB_CHECKPOINT >= 12
            if (options.verify && oracle.service(gl, engine))
                running = false;
            if (options.benchmark && controls.benchmark.phase == BenchmarkPhase::Idle && engine.ready && !engine.queue.pending())
                controls.command(Command::Benchmark, gl, engine, view, plan);
#endif
            // [snippet pending-gate]
            if (engine.queue.pending() || controls.referencePending()) {
                if (expired)
                    throw std::runtime_error("Finite run expired with GPU work pending");
                SDL_Delay(1);
                continue;
            }
            // [/snippet pending-gate]
            if (minimized) {
                SDL_Delay(16);
                continue;
            }

            // Scene dùng pixel framebuffer, UI và input dùng logical coordinates.
            gl.Viewport(0, 0, pixelWidth, pixelHeight);
            gl.ClearColor(0.025F, 0.04F, 0.065F, 1);
            gl.Clear(GL_COLOR_BUFFER_BIT | GL_DEPTH_BUFFER_BIT);
            const float scaleX = static_cast<float>(pixelWidth) / std::max(1, logicalWidth);
            const float scaleY = static_cast<float>(pixelHeight) / std::max(1, logicalHeight);
            const int width = std::max(1, static_cast<int>(layout.scene.width * scaleX));
            const int height = std::max(1, static_cast<int>(layout.scene.height * scaleY));
            const int sceneX = static_cast<int>(layout.scene.x * scaleX);
            const int sceneY = static_cast<int>((logicalHeight - layout.scene.y - layout.scene.height) * scaleY);
            gl.Viewport(sceneX, sceneY, width, height);
            // [snippet render-call]
#if LAB_CHECKPOINT >= 3
            view.draw(gl, engine.storage, engine.current, width, height);
#elif LAB_CHECKPOINT >= 1
            view.drawn = 64;
            drawPreview(gl, view.camera, width, height, sceneX, sceneY);
#endif
            // [/snippet render-call]
            controls.benchmark.completedRender(view);
            if (controls.benchmark.phase == BenchmarkPhase::Done && !benchPrinted) {
                controls.benchmark.print(engine);
                benchPrinted = true;
                controls.ui.message = controls.benchmark.message;
            }
            if (controls.benchmark.active())
                benchPrinted = false;
            const bool target = options.ticks > 0 && engine.steps >= options.ticks;
            if (target) {
                controls.ui.playing = false;
                controls.ui.message = "FINITE RUN COMPLETE";
            }
            panel.prepare(layout, controls.ui, plan, engine, controls.benchmark, controls.referenceActive());
            panel.draw(overlay, layout, controls.ui, plan, engine, view, controls.benchmark, controls.referenceActive(), logicalWidth, logicalHeight);
            gl.Viewport(0, 0, pixelWidth, pixelHeight);
            overlay.draw(gl);
            const bool benchmarkDone = options.benchmark && controls.benchmark.phase == BenchmarkPhase::Done;
            if (target || benchmarkDone || (expired && options.ticks == 0)) {
                if (!options.capture.empty())
                    captureFrame(gl, pixelWidth, pixelHeight, options.capture);
                reportRun(plan, engine, view);
                controls.pause();
                running = false;
            }
            SDL_GL_SwapWindow(window);
#if LAB_CHECKPOINT >= 10
            // [snippet submit-loop]
            if (running && controls.wantsStep() && !options.verify && !engine.queue.pending())
                engine.submit(gl);
                // [/snippet submit-loop]
#endif
            SDL_Delay(16);
        }
    } catch (const std::exception& error) {
        std::cerr << error.what() << '\n';
        failed = true;
    }

    // GL object luôn được hủy khi context còn sống.
    SDL_CaptureMouse(false);
    controls.destroy(gl);
    overlay.destroy(gl);
    view.destroy(gl);
    engine.destroy(gl);
    SDL_GL_DestroyContext(context);
    SDL_DestroyWindow(window);
    SDL_Quit();
    if (failed)
        return EXIT_FAILURE;
    return EXIT_SUCCESS;
}
