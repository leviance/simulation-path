#include "benchmark.hpp"
#include "input.hpp"
#include "timing.hpp"
#include <SDL3/SDL_main.h>
#include <iostream>

namespace {

double elapsedMs(std::uint64_t begin) {
    return static_cast<double>(SDL_GetTicksNS() - begin) / 1e6;
}

int run(const sand::Options& options) {
#if LAB_CHECKPOINT >= 9
    if (options.benchmark) {
        return sand::runBenchmark(options);
    }
#else
    if (options.benchmark) {
        throw std::invalid_argument("Benchmark is introduced in checkpoint 9");
    }
#endif
    sand::SdlResources sdl;
    sand::requireSdl(SDL_Init(SDL_INIT_VIDEO), "initialize SDL");
    sdl.initialized = true;
    if (SDL_GetVersion() != SDL_VERSIONNUM(3, 4, 8)) {
        throw std::runtime_error("This project requires SDL runtime 3.4.8 exactly");
    }
    SDL_WindowFlags flags = SDL_WINDOW_RESIZABLE | SDL_WINDOW_HIGH_PIXEL_DENSITY;
    if (options.hidden) {
        flags |= SDL_WINDOW_HIDDEN;
    }
    sdl.window = SDL_CreateWindow("Project 46 - Falling Sand Workshop", 1280, 880, flags);
    sand::requireSdl(sdl.window != nullptr, "create window");
    sdl.renderer = SDL_CreateRenderer(sdl.window, nullptr);
    sand::requireSdl(sdl.renderer != nullptr, "create renderer");
    const bool vsync = SDL_SetRenderVSync(sdl.renderer, 1);
    sand::Workshop state;
    state.preset = options.preset;
    state.seed = options.seed;
    state.order = options.order;
    state.showcase = options.clean;
#if LAB_CHECKPOINT >= 6
    state.paused = !options.run;
#endif
    sand::Grid grid;
#if LAB_CHECKPOINT >= 7
    grid = sand::makeWorkshopScene(state.preset, state.seed);
    state.radius = 6;
    state.cursorX = grid.width / 2;
    state.cursorY = grid.height / 5;
    sand::createGridTexture(sdl, grid);
#elif LAB_CHECKPOINT >= 1
    grid = sand::makeScene();
#endif
#if LAB_CHECKPOINT >= 8
    grid.order = state.order;
#endif
    sand::setPresentation(sdl.renderer, grid, state.showcase);
    std::cout << "SDL=" << SDL_GetRevision() << " renderer=" << SDL_GetRendererName(sdl.renderer)
        << " grid=" << grid.width << 'x' << grid.height << " seed=" << state.seed
        << " configured_vsync=" << vsync << '\n';
#if LAB_CHECKPOINT >= 2
    std::cout << "Mouse paint / right erase | 1 sand 2 wall 4 erase | [ ] brush | R reset | K clear\n";
#endif
#if LAB_CHECKPOINT >= 3
    std::cout << "N: pause and advance one tick\n";
#endif
#if LAB_CHECKPOINT >= 5
    std::cout << "3: toy water (not a fluid solver)\n";
#endif
#if LAB_CHECKPOINT >= 6
    std::cout << "Space: run/pause | =: speed 0.25 / 0.5 / 1 / 2 / 4\n";
#endif
#if LAB_CHECKPOINT >= 7
    std::cout << "F1: clean view | F2: flat/shaded colors\n";
#endif
#if LAB_CHECKPOINT >= 8
    std::cout << "P: preset | B: seed | O: scan order\n";
#endif
#if LAB_CHECKPOINT >= 9
    std::cout << "V: small fixtures | --benchmark: finite CPU measurement without a window\n";
#endif

    bool running = true;
    std::uint64_t previousTime = SDL_GetTicksNS();
    const std::uint64_t started = previousTime;
    std::uint64_t frames = 0;
    bool captureSaved = false;
    while (running) {
        const std::uint64_t frameStart = SDL_GetTicksNS();
        sand::pollInput(sdl.renderer, grid, state, running);
        if (!running) {
            break;
        }
        const std::uint64_t now = SDL_GetTicksNS();
        double elapsed = static_cast<double>(now - previousTime) / 1e9;
        previousTime = now;
        if (state.restartClock) {
            elapsed = 0;
            state.restartClock = false;
        }
        int steps = 0;
#if LAB_CHECKPOINT >= 3
        if (state.singleStep) {
            steps = 1;
            state.singleStep = false;
        }
#endif
#if LAB_CHECKPOINT >= 6
        if (!state.paused) {
            const auto plan = sand::planSteps(state.accumulator, elapsed, state.speed());
            state.accumulator = plan.remainder;
            state.dropped += plan.dropped;
            steps = plan.steps;
        }
#else
        static_cast<void>(elapsed);
#endif
#if LAB_CHECKPOINT >= 3
        double updateTotalMs = 0;
        for (int step = 0; step < steps; ++step) {
#if LAB_CHECKPOINT >= 8
            // Giữ chuột để rót: bổ sung vật liệu theo tick, không theo số frame render.
            if (state.drawing && state.previousValid) {
                sand::stamp(grid, state, state.cursorX, state.cursorY, false);
            }
#endif
            const std::uint64_t updateStart = SDL_GetTicksNS();
            state.stats = sand::stepGrid(grid);
            updateTotalMs += elapsedMs(updateStart);
            state.dirty = true;
        }
        if (steps > 0) {
            state.updateMs = updateTotalMs / steps;
        }
#else
        static_cast<void>(steps);
#endif

#if LAB_CHECKPOINT >= 7
        if (state.dirty) {
            const std::uint64_t uploadStart = SDL_GetTicksNS();
            sand::uploadGrid(sdl.texture, grid, state.plain);
            state.uploadMs = elapsedMs(uploadStart);
            state.dirty = false;
        }
#endif
        const std::uint64_t drawStart = SDL_GetTicksNS();
        sand::setColor(sdl.renderer, {11, 17, 28, 255});
        sand::requireSdl(SDL_RenderClear(sdl.renderer), "clear frame");
#if LAB_CHECKPOINT >= 7
        sand::drawTexture(sdl.renderer, sdl.texture, grid, state.showcase);
        if (!state.showcase) {
            sand::drawPanel(sdl.renderer, grid, state);
            sand::drawCursor(sdl.renderer, grid, state);
        }
#elif LAB_CHECKPOINT >= 1
        sand::drawGrid(sdl.renderer, grid);
#endif
        state.submitMs = elapsedMs(drawStart);
        const double wallSeconds = static_cast<double>(SDL_GetTicksNS() - started) / 1e9;
        const bool lastFrame = options.seconds > 0 && wallSeconds >= options.seconds;
        if (lastFrame && !options.capture.empty()) {
            // Capture đúng một lần trước present; không đưa readback vào số đo draw.
            SDL_Surface* capture = SDL_RenderReadPixels(sdl.renderer, nullptr);
            sand::requireSdl(capture != nullptr, "capture frame");
            const bool saved = SDL_SaveBMP(capture, options.capture.c_str());
            SDL_DestroySurface(capture);
            sand::requireSdl(saved, "save capture");
            captureSaved = true;
        }
        sand::requireSdl(SDL_RenderPresent(sdl.renderer), "present frame");
        ++frames;
        if (lastFrame) {
            running = false;
        }
        // Fallback hữu hạn: không làm CPU quay 100% nếu backend không có vsync.
        const double frameMs = elapsedMs(frameStart);
        if (!vsync && frameMs < 16.0) {
            SDL_Delay(static_cast<Uint32>(16.0 - frameMs));
        }
    }
    const auto counts = sand::countMaterials(grid);
    std::size_t drawnCells = 0;
#if LAB_CHECKPOINT >= 7
    drawnCells = grid.cells.size();
#elif LAB_CHECKPOINT >= 1
    drawnCells = counts[1] + counts[2] + counts[3];
#endif
    std::cout << "RUNTIME frames=" << frames << " allocated=" << grid.cells.size()
        << " drawn_cells=" << drawnCells << " sand=" << counts[2] << " water=" << counts[3]
        << " walls=" << counts[1] << " checksum=" << sand::checksum(grid)
        << " last_update_ms=" << state.updateMs << " last_upload_cpu_ms=" << state.uploadMs
        << " last_submit_cpu_ms=" << state.submitMs << " dropped_model_seconds=" << state.dropped;
#if LAB_CHECKPOINT >= 3
    std::cout << " ticks=" << grid.tick << " last_visited=" << state.stats.visited;
#endif
    std::cout << '\n';
    if (!options.capture.empty() && !captureSaved) {
        throw std::runtime_error("Capture canceled before the finite deadline; no image was saved");
    }
    return EXIT_SUCCESS;
}

} // namespace

int main(int argc, char** argv) {
    try {
        const sand::Options options = sand::parseOptions(argc, argv);
        if (options.help) {
            std::cout << "Falling Sand Workshop: --run --hidden --clean --seconds 0.05..60 --capture frame.bmp\n"
                << "--preset 0..4 --seed uint32 --order 0..3 --benchmark --steps 1..600 --repeats 1..15\n";
            return EXIT_SUCCESS;
        }
        return run(options);
    } catch (const std::exception& error) {
        std::cerr << "Falling Sand error: " << error.what() << '\n';
        return EXIT_FAILURE;
    }
}
