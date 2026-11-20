#include "input.hpp"
#include "platform.hpp"
#include "validation.hpp"
#include <cstdlib>
#include <string_view>

namespace {
struct Options {
    bool hidden = false;
    bool verify = false;
    bool smoke = false;
    bool benchmark = false;
    bool showcase = false;
    int frames = 0;
    double seconds = 0;
    int side = 0;
    int preset = 0;
    int mode = -1;
    std::string capture;
};

int integer(const std::string& value) {
    std::size_t consumed = 0;
    const int result = std::stoi(value, &consumed);
    if (consumed != value.size())
        throw std::invalid_argument("Invalid integer argument");
    return result;
}

double real(const std::string& value) {
    std::size_t consumed = 0;
    const double result = std::stod(value, &consumed);
    if (consumed != value.size())
        throw std::invalid_argument("Invalid real argument");
    return result;
}

Options parse(int argc, char** argv) {
    Options options;
    for (int i = 1; i < argc; ++i) {
        const std::string_view argument = argv[i];
        if (argument == "--hidden")
            options.hidden = true;
        else if (argument == "--verify-gpu") {
            options.verify = true;
            options.hidden = true;
        } else if (argument == "--smoke-gpu") {
            options.smoke = true;
            options.hidden = true;
            options.frames = 3;
        } else if (argument == "--benchmark-gpu") {
            options.benchmark = true;
            options.hidden = true;
            options.seconds = 20;
        } else if (argument == "--showcase")
            options.showcase = true;
        else {
            if (i + 1 >= argc)
                throw std::invalid_argument("Missing command line value");
            const std::string value = argv[++i];
            if (argument == "--capture")
                options.capture = value;
            else if (argument == "--frames") {
                options.frames = integer(value);
                if (options.frames < 1 || options.frames > 600)
                    throw std::invalid_argument("Frame limit 1..600");
            } else if (argument == "--seconds") {
                options.seconds = real(value);
                if (!std::isfinite(options.seconds) || options.seconds <= 0 || options.seconds > 60)
                    throw std::invalid_argument("Seconds limit 0..60");
            } else if (argument == "--size") {
                options.side = integer(value);
                if (options.side != 64 && options.side != 128)
                    throw std::invalid_argument("Size must be 64 or 128");
            } else if (argument == "--preset") {
                options.preset = integer(value);
                if (options.preset < 0 || options.preset > 5)
                    throw std::invalid_argument("Preset must be 0..5");
            } else if (argument == "--mode") {
                if (value == "mip")
                    options.mode = 0;
                else if (value == "average")
                    options.mode = 1;
                else if (value == "alpha")
                    options.mode = 2;
                else
                    throw std::invalid_argument("Mode must be mip, average or alpha");
            } else
                throw std::invalid_argument("Unknown command line argument");
        }
    }
    if (!options.capture.empty() && options.frames == 0)
        options.frames = 3;
    return options;
}
} // namespace

int main(int argc, char** argv) {
    try {
        using namespace volume54;
        const Options options = parse(argc, argv);
        // Setup: create the context before resources that require OpenGL.
        Platform platform;
        platform.open(options.hidden);
        platform.capabilities();
        Renderer renderer(platform.gl);
        renderer.open();
        Overlay ui(platform.gl);
        ui.open();
        State state;
        state.showcase = options.showcase;
        if (options.mode >= 0)
            state.settings.mode = static_cast<Mode>(options.mode);
#if LAB_CHECKPOINT < 6
        if (state.settings.mode == Mode::Alpha)
            throw std::invalid_argument("Alpha is introduced in checkpoint 6");
#endif
#if LAB_CHECKPOINT >= 4
        if (options.side != 0)
            state.side = options.side;
        state.load(renderer, static_cast<Preset>(options.preset), state.side);
#endif
        Benchmark benchmark(platform.gl);
        Comparison comparison(platform.gl);
        Drag drag;
#if LAB_CHECKPOINT >= 10
        if (options.verify) {
            verifyGpu(renderer);
            return EXIT_SUCCESS;
        }
#else
        if (options.verify)
            throw std::runtime_error("GPU correctness suite is introduced in checkpoint 10");
#endif
#if LAB_CHECKPOINT >= 9
        if (options.benchmark)
            benchmark.start(state);
#else
        if (options.benchmark)
            throw std::runtime_error("Benchmark is introduced in checkpoint 9");
#endif
        bool running = true;
        int frames = 0;
        const Uint64 started = SDL_GetTicks();
        Uint64 previous = SDL_GetTicksNS();
        int rayWidth = 0;
        int rayHeight = 0;
#if LAB_CHECKPOINT >= 1
        int failedWidth = 0;
        int failedHeight = 0;
#endif
        bool captured = false;
        // [snippet application-loop]
        while (running) {
            if (options.seconds > 0 && (SDL_GetTicks() - started) / 1000.0 >= options.seconds)
                break;
            int width = 0;
            int height = 0;
            int pixelWidth = 0;
            int pixelHeight = 0;
            if (!SDL_GetWindowSize(platform.window, &width, &height) || !SDL_GetWindowSizeInPixels(platform.window, &pixelWidth, &pixelHeight))
                throw std::runtime_error(SDL_GetError());
            SDL_Event event;
            while (SDL_PollEvent(&event)) {
                try {
                    if (!handleEvent(event, state, drag, benchmark, renderer, width, height))
                        running = false;
                } catch (const std::exception& error) {
                    state.status = error.what();
                    release(drag, state);
                    benchmark.cancel();
                }
            }
            if (!running)
                break;
            if (width < 1 || height < 1 || pixelWidth < 1 || pixelHeight < 1) {
                release(drag, state);
                SDL_Delay(16);
                continue;
            }
            const Uint64 now = SDL_GetTicksNS();
            const double dt = std::min(0.05, static_cast<double>(now - previous) / 1e9);
            previous = now;
            if (!state.paused) {
                state.camera.yaw += dt * 0.18;
                state.camera.limit();
                state.invalidate();
            }
            try {
                benchmark.tick();
            } catch (const std::exception& error) {
                benchmark.cancel();
                state.status = error.what();
            }
            if (options.benchmark && !benchmark.active)
                break;
            const int viewWidth = sceneWidth(width, state.showcase);
#if LAB_CHECKPOINT >= 1
            const int viewPixels = std::max(1, static_cast<int>(static_cast<double>(viewWidth) * pixelWidth / width));
#else
            (void)viewWidth;
#endif
            platform.gl.Viewport(0, 0, pixelWidth, pixelHeight);
            platform.gl.ClearColor(0.025F, 0.045F, 0.06F, 1);
            platform.gl.Clear(GL_COLOR_BUFFER_BIT);
#if LAB_CHECKPOINT >= 1
            // [snippet draw-frame]
            int targetWidth = viewPixels;
            int targetHeight = pixelHeight;
            if (options.smoke) {
                targetWidth = 24;
                targetHeight = 18;
            }
            if (targetWidth != failedWidth || targetHeight != failedHeight) {
                try {
                    renderer.resize(targetWidth, targetHeight);
                    failedWidth = 0;
                    failedHeight = 0;
                } catch (const std::exception& error) {
                    if (renderer.width == 0 || renderer.height == 0)
                        throw;
                    failedWidth = targetWidth;
                    failedHeight = targetHeight;
                    state.status = error.what();
                }
            }
            renderer.pollGpu();
            renderer.render(state.camera, state.settings, true);
            if (options.smoke && frames == 0) {
                const auto raw = renderer.read();
                for (float value : raw)
                    if (!std::isfinite(value))
                        throw std::runtime_error("Nonfinite shader smoke output");
            }
            renderer.display(state.camera, state.settings, viewPixels, pixelHeight);
            // [/snippet draw-frame]
            rayWidth = renderer.width;
            rayHeight = renderer.height;
#endif
#if LAB_CHECKPOINT >= 5
            state.refreshTrace(static_cast<double>(viewPixels) / pixelHeight);
            if (!options.smoke && !benchmark.active)
                comparison.draw(state, viewWidth, height, width, pixelWidth, pixelHeight);
#endif
            drawUi(ui, state, benchmark, renderer, width, height);
            ui.draw(width, height, pixelWidth, pixelHeight);
            if (!options.capture.empty() && frames == 2) {
                platform.capture(options.capture, pixelWidth, pixelHeight);
                captured = true;
            }
            if (platform.gl.GetError() != GL_NO_ERROR)
                throw std::runtime_error("OpenGL frame error");
            if (!SDL_GL_SwapWindow(platform.window))
                throw std::runtime_error(SDL_GetError());
            ++frames;
            if (options.frames > 0 && frames >= options.frames)
                break;
        }
        // [/snippet application-loop]
        // Cleanup: stop pending work; RAII releases GL resources before the context.
        benchmark.cancel();
        release(drag, state);
        if (!options.capture.empty() && !captured)
            throw std::runtime_error("Capture was not written before the frame/time limit");
#if LAB_CHECKPOINT >= 4
        std::cout << "VOLUME: side=" << state.side << " voxels=" << state.volume->values().size() << " bytes=" << state.volume->values().size() * sizeof(float) << '\n';
#endif
        std::cout << "RUN: stage=" << lessonStage << " frames=" << frames << " rayTarget=" << rayWidth << 'x' << rayHeight << " GPUms=" << renderer.gpuMilliseconds << " mode=" << modeName(state.settings.mode) << '\n';
        for (const auto& result : benchmark.results)
            std::cout << "BENCH: step=" << result.step << " maxError=" << result.maximumError << " GPUmedianMs=" << result.medianMs << " IQR=" << result.lowerMs << ',' << result.upperMs << '\n';
        if (options.benchmark && benchmark.results.size() != 4)
            throw std::runtime_error("Benchmark did not complete all four cases");
        return EXIT_SUCCESS;
    } catch (const std::exception& error) {
        std::cerr << "Project 54: " << error.what() << '\n';
        return EXIT_FAILURE;
    }
}
