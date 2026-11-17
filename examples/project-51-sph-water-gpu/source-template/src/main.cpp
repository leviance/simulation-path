#include "app/benchmark.hpp"
#include "app/capture.hpp"
#include "app/input.hpp"
#include "app/options.hpp"
#include "app/report.hpp"
#include "app/verification.hpp"
#include "render/timer.hpp"
#include <iostream>

#ifndef COURSE_SHADER_DIRECTORY
#define COURSE_SHADER_DIRECTORY "shaders"
#endif
#ifndef COURSE_SHADER_FALLBACK_SUBDIRECTORY
#define COURSE_SHADER_FALLBACK_SUBDIRECTORY "shaders"
#endif

namespace water51 {
int run(SDL_Window* window, const Options& options, const std::filesystem::path& shaders) {
    Gl gl;
#if LAB_CHECKPOINT == 0
    (void)options;
    (void)shaders;
    bool running = true;
    while (running) {
        SDL_Event event;
        while (SDL_PollEvent(&event))
            if (event.type == SDL_EVENT_QUIT || (event.type == SDL_EVENT_KEY_DOWN && event.key.key == SDLK_ESCAPE))
                running = false;
        int width = 0, height = 0;
        SDL_GetWindowSizeInPixels(window, &width, &height);
        gl.Viewport(0, 0, width, height);
        gl.ClearColor(.035f, .06f, .09f, 1);
        gl.Clear(GL_COLOR_BUFFER_BIT);
        SDL_GL_SwapWindow(window);
        SDL_Delay(16);
    }
    return 0;
#else
#if LAB_CHECKPOINT >= 13
    if (options.verify) {
        verifyGpu(gl, shaders);
        return 0;
    }
#endif
    Engine engine(gl, shaders, makeModel(options.side, options.preset));
    WaterRenderer water(gl, shaders);
    Panel panel(gl, shaders);
    RenderTimer renderTimer(gl);
    Benchmark benchmark;
    bool measuredFrozenRender = false;
    Camera camera;
    Controls controls;
    controls.paused = !options.run;
    controls.requestedSide = options.side;
    controls.preset = options.preset;
    controls.benchmark = options.benchmark;
    if (options.benchmark)
        controls.paused = true;
#if LAB_CHECKPOINT < 8
    controls.view = View::Particles;
#endif
    Pointer pointer;
    bool running = true;
    bool captured = false;
    const auto started = std::chrono::steady_clock::now();
    std::uint64_t frames = 0;
    // [snippet event-loop]
    while (running) {
        const auto frameStart = std::chrono::steady_clock::now();
        int width = 0, height = 0;
        SDL_GetWindowSizeInPixels(window, &width, &height);
        width = std::max(width, 640);
        height = std::max(height, 480);
        const int sceneWidth = width - Panel::width;
        camera.update(height);
        SDL_Event event;
        while (SDL_PollEvent(&event)) {
            if (event.type == SDL_EVENT_QUIT)
                running = false;
            if (event.type == SDL_EVENT_KEY_DOWN && !event.key.repeat) {
                if (event.key.key == SDLK_ESCAPE) {
                    if (benchmark.active() || controls.benchmark) {
                        benchmark.cancel();
                        controls.benchmark = false;
                        controls.paused = true;
                    } else
                        running = false;
                } else if (!benchmark.active())
                    key(event.key.key, controls, camera, engine, (event.key.mod & SDL_KMOD_CTRL) != 0);
            }
            if (event.type == SDL_EVENT_WINDOW_FOCUS_LOST) {
                benchmark.cancel();
                controls.benchmark = false;
                pointer.active = false;
                SDL_CaptureMouse(false);
                controls.paused = true;
            }
            if (event.type == SDL_EVENT_MOUSE_WHEEL && !benchmark.active())
                camera.distance *= std::exp(-.10 * event.wheel.y);
            if (event.type == SDL_EVENT_MOUSE_BUTTON_DOWN && event.button.button == SDL_BUTTON_LEFT && !benchmark.active()) {
                int logicalWidth = 0, logicalHeight = 0;
                SDL_GetWindowSize(window, &logicalWidth, &logicalHeight);
                const float px = event.button.x * width / logicalWidth, py = event.button.y * height / logicalHeight;
                if (px >= sceneWidth && !benchmark.active())
                    panel.click(static_cast<int>(px) - sceneWidth, static_cast<int>(py * Panel::height / height), controls, engine.parameters, engine.model());
                else {
                    pointer = {true, controls.stir, px, py};
                    SDL_CaptureMouse(true);
                }
            }
            if (event.type == SDL_EVENT_MOUSE_BUTTON_UP) {
                pointer.active = false;
                SDL_CaptureMouse(false);
            }
            if (event.type == SDL_EVENT_MOUSE_MOTION && pointer.active && !benchmark.active()) {
                int logicalWidth = 0, logicalHeight = 0;
                SDL_GetWindowSize(window, &logicalWidth, &logicalHeight);
                pointerMotion(pointer, camera, engine, event.motion.x * width / logicalWidth, event.motion.y * height / logicalHeight, sceneWidth, height);
            }
        }
        // A reset requested during work is deferred; it never replaces a live buffer.
        try {
            engine.poll();
            if (controls.benchmark && !engine.pending()) {
                benchmark.start(engine);
                controls.benchmark = false;
                controls.paused = true;
            }
            benchmark.service(engine);
            if (options.tickLimit > 0 && engine.ticks >= static_cast<std::uint64_t>(options.tickLimit))
                controls.paused = true;
            if (options.timeLimit > 0 && engine.modelTime >= options.timeLimit)
                controls.paused = true;
            if (!options.benchmark && options.tickLimit == 0 && options.timeLimit == 0 && !options.capture.empty() && frames >= 3)
                controls.paused = true;
            if (!engine.pending() && (controls.reset || controls.apply)) {
                Model next = engine.model();
                if (controls.apply)
                    next = makeModel(controls.requestedSide, controls.preset);
                pointer.active = false;
                SDL_CaptureMouse(false);
                if (next.preset != Preset::Obstacle)
                    controls.stir = false;
                engine.reset(next);
                controls.reset = false;
                controls.apply = false;
                controls.error.clear();
            }
            if (engine.ready() && !engine.pending() && !controls.reset && !controls.apply && !benchmark.active()) {
                if (controls.step) {
                    engine.submit(1);
                    controls.step = false;
                } else if (!controls.paused)
                    engine.submit(4);
            }
        } catch (const std::exception& error) {
            if (options.seconds > 0)
                throw;
            controls.error = error.what();
            controls.paused = true;
            controls.step = false;
            controls.reset = false;
            controls.apply = false;
        }
        gl.BindFramebuffer(GL_FRAMEBUFFER, 0);
        gl.Viewport(0, 0, width, height);
        gl.ClearColor(.035f, .06f, .09f, 1);
        gl.Clear(GL_COLOR_BUFFER_BIT | GL_DEPTH_BUFFER_BIT);
        const bool renderResult = renderTimer.poll();
        if (renderResult && measuredFrozenRender)
            benchmark.rendered(renderTimer.milliseconds);
        const bool measureRender = !renderTimer.waiting();
        if (engine.ready()) {
            if (measureRender) {
                measuredFrozenRender = benchmark.phase == BenchmarkPhase::Render;
                renderTimer.begin();
            }
            water.draw(engine, camera, sceneWidth, height, controls.view);
            if (measureRender)
                renderTimer.end();
            frames++;
        }
        panel.draw(engine, controls, sceneWidth, height, renderTimer.milliseconds);
        bool finished = false;
        if (options.benchmark && benchmark.phase == BenchmarkPhase::Complete)
            finished = true;
        if (options.tickLimit > 0 && engine.ticks >= static_cast<std::uint64_t>(options.tickLimit))
            finished = true;
        if (options.timeLimit > 0 && engine.modelTime >= options.timeLimit)
            finished = true;
        if (!options.benchmark && options.tickLimit == 0 && options.timeLimit == 0 && !options.capture.empty() && frames >= 3)
            finished = true;
        if (finished && !engine.pending()) {
            if (!options.capture.empty()) {
                saveCapture(gl, width, height, options.capture);
                captured = true;
            }
            writeReport(engine, options.report);
            running = false;
        }
        SDL_GL_SwapWindow(window);
        if (options.seconds > 0 && std::chrono::duration<double>(std::chrono::steady_clock::now() - started).count() > options.seconds)
            throw std::runtime_error("Finite run deadline exceeded");
        // Cap the display loop, including while paused; physics still uses its own adaptive dt.
        const auto frameCost = std::chrono::duration_cast<std::chrono::milliseconds>(std::chrono::steady_clock::now() - frameStart).count();
        if (frameCost < 16)
            SDL_Delay(static_cast<Uint32>(16 - frameCost));
        else
            SDL_Delay(1);
    }
    // [/snippet event-loop]
    if (!options.capture.empty() && !captured)
        throw std::runtime_error("Capture target was not reached");
    return 0;
#endif
}
} // namespace water51

int main(int argc, char** argv) {
    SDL_Window* window = nullptr;
    SDL_GLContext context = nullptr;
    try {
        water51::Options options(argc, argv);
        // [snippet context]
        // Setup: create the SDL window and OpenGL context before any GL resources.
        if (!SDL_Init(SDL_INIT_VIDEO))
            throw std::runtime_error(SDL_GetError());
        SDL_GL_SetAttribute(SDL_GL_CONTEXT_MAJOR_VERSION, 4);
        SDL_GL_SetAttribute(SDL_GL_CONTEXT_MINOR_VERSION, 3);
        SDL_GL_SetAttribute(SDL_GL_CONTEXT_PROFILE_MASK, SDL_GL_CONTEXT_PROFILE_CORE);
        SDL_GL_SetAttribute(SDL_GL_DOUBLEBUFFER, 1);
        SDL_GL_SetAttribute(SDL_GL_DEPTH_SIZE, 24);
        SDL_WindowFlags flags = SDL_WINDOW_OPENGL | SDL_WINDOW_RESIZABLE | SDL_WINDOW_HIGH_PIXEL_DENSITY;
        if (options.hidden)
            flags |= SDL_WINDOW_HIDDEN;
        window = SDL_CreateWindow("Project 51 - SPH Water 3D", 1280, 800, flags);
        if (!window)
            throw std::runtime_error(SDL_GetError());
        SDL_SetWindowMinimumSize(window, 800, 600);
        context = SDL_GL_CreateContext(window);
        if (!context)
            throw std::runtime_error(SDL_GetError());
        SDL_GL_SetSwapInterval(0);
        // Cleanup: run() destroys GL objects before their context and SDL window are destroyed.
        auto shaderRoot = std::filesystem::path(COURSE_SHADER_DIRECTORY);
        if (!std::filesystem::exists(shaderRoot)) {
            const char* base = SDL_GetBasePath();
            if (base == nullptr)
                throw std::runtime_error(SDL_GetError());
            shaderRoot = std::filesystem::path(base) / COURSE_SHADER_FALLBACK_SUBDIRECTORY;
        }
        const int result = water51::run(window, options, shaderRoot);
        SDL_GL_DestroyContext(context);
        SDL_DestroyWindow(window);
        SDL_Quit();
        // [/snippet context]
        return result;
    } catch (const std::exception& error) {
        std::cerr << "Project 51: " << error.what() << '\n';
        if (context)
            SDL_GL_DestroyContext(context);
        if (window)
            SDL_DestroyWindow(window);
        SDL_Quit();
        return 1;
    }
}
