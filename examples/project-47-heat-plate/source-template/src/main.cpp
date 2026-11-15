#ifndef LAB_CHECKPOINT
#define LAB_CHECKPOINT 9
#endif

#include "benchmark.hpp"
#include "input.hpp"
#include "options.hpp"
#include "timing.hpp"
#include <SDL3/SDL_main.h>
#include <chrono>
#include <cstdlib>
#include <iostream>

namespace {

using Clock = std::chrono::steady_clock;

double millisecondsSince(Clock::time_point start) {
    return std::chrono::duration<double, std::milli>(Clock::now() - start).count();
}

void captureFrame(SDL_Renderer* renderer, const std::string& path) {
    SDL_Surface* surface = SDL_RenderReadPixels(renderer, nullptr);
    heat::requireSdl(surface != nullptr, "capture frame");
    const bool saved = SDL_SaveBMP(surface, path.c_str());
    SDL_DestroySurface(surface);
    heat::requireSdl(saved, "save BMP capture");
}

} // namespace

int main(int argc, char** argv) {
    try {
        const heat::Options options = heat::parseOptions(argc, argv);
        if (options.help) {
            std::cout << "P47 heat plate: --hidden --seconds [0.05,60] --capture output.bmp\n";
            std::cout << "This checkpoint: " << heat::taughtStage() << "; see README for introduced controls/flags.\n";
#if LAB_CHECKPOINT >= 9
            std::cout << "--verify | --benchmark [--steps 120 --repeats 7 --size 192]\n";
#endif
            return EXIT_SUCCESS;
        }
#if LAB_CHECKPOINT >= 9
        if (options.verify) {
            if (heat::validatePlate(std::cout)) {
                return EXIT_SUCCESS;
            }
            return EXIT_FAILURE;
        }
        if (options.benchmark) {
            heat::benchmarkPlate(options);
            return EXIT_SUCCESS;
        }
#endif
        // Khởi tạo SDL: owner giữ texture/renderer/window tới cuối scope.
        heat::SdlResources sdl;
        heat::requireSdl(SDL_Init(SDL_INIT_VIDEO), "SDL_Init");
        sdl.initialized = true;
        heat::requireSdl(SDL_GetVersion() == SDL_VERSIONNUM(3, 4, 8), "Expected SDL runtime 3.4.8");
        SDL_WindowFlags flags = SDL_WINDOW_RESIZABLE | SDL_WINDOW_HIGH_PIXEL_DENSITY;
        if (options.hidden) {
            flags |= SDL_WINDOW_HIDDEN;
        }
        sdl.window = SDL_CreateWindow("P47 / Heat Plate / F1 clean view / Esc close", 1280, 920, flags);
        heat::requireSdl(sdl.window != nullptr, "create window");
        sdl.renderer = SDL_CreateRenderer(sdl.window, nullptr);
        heat::requireSdl(sdl.renderer != nullptr, "create renderer");
        if (!SDL_SetRenderVSync(sdl.renderer, 1)) {
            std::cerr << "VSync unavailable: using a short event-loop delay\n";
        }

        // [snippet create-scene]
        heat::Workshop state;
        state.settings = options.settings;
        state.size = options.size;
        state.preset = options.preset;
        state.showcase = options.clean;
        state.paused = !options.run;
        if (options.run) {
            state.message = "RUNNING: bounded work per frame";
        }
        heat::Field field = heat::makeField(options.preset, options.size);
        state.cursorX = field.width / 2;
        state.cursorY = field.height / 2;
        heat::selectProbe(field, state, state.cursorX, state.cursorY);
#if LAB_CHECKPOINT >= 5
        heat::applyBoundary(field, state.settings);
#endif
        heat::recordProbe(field, state);
        heat::setPresentation(sdl.renderer, field, state.showcase);
        // [/snippet create-scene]
#if LAB_CHECKPOINT >= 7
        heat::createTexture(sdl);
#endif
        std::cout << "Checkpoint " << heat::taughtStage() << ": see README for all available controls.\n";
#if LAB_CHECKPOINT >= 2
        std::cout << "Mouse hot/cold | 1/2 temperature | arrows/Enter | [ ] radius | R reset | C clear\n";
#endif
#if LAB_CHECKPOINT >= 3
        std::cout << "N one model step (not one rendered frame)\n";
#endif
#if LAB_CHECKPOINT >= 5
        std::cout << "H temperature/heater | E unpin without erasing theta | B boundary\n";
#endif
#if LAB_CHECKPOINT >= 6
        std::cout << "Space pause/run | D/dt sliders | A/Shift+A D | T/Shift+T dt | U bounded unsafe experiment | P preset | = speed\n";
#endif
#if LAB_CHECKPOINT >= 7
        std::cout << "F1 clean view | F2 pin markers | G 128/192/256 (fixed domain, does not repair dt)\n";
#endif
#if LAB_CHECKPOINT >= 8
        std::cout << "L / Shift+click probe | P complete preset gallery\n";
#endif
#if LAB_CHECKPOINT >= 9
        std::cout << "V finite CPU reference fixtures | --verify / --benchmark do not open SDL\n";
#endif
        bool running = true;
        const auto openedAt = Clock::now();
        std::uint64_t previousTime = SDL_GetTicksNS();
        while (running) {
            heat::pollInput(sdl.renderer, field, state, running);
            const std::uint64_t now = SDL_GetTicksNS();
            double elapsed = static_cast<double>(now - previousTime) / 1e9;
            previousTime = now;
            if (state.restartClock) {
                elapsed = 0;
                state.restartClock = false;
            }
            int steps = 0;
            if (state.singleStep) {
                steps = 1;
                state.singleStep = false;
            }
#if LAB_CHECKPOINT >= 6
            else if (!state.paused) {
                const heat::StepPlan plan = heat::planSteps(state.accumulator, elapsed, state.settings.dt, state.speed);
                state.accumulator = plan.remainder;
                state.dropped += plan.dropped;
                steps = plan.steps;
            }
#endif
#if LAB_CHECKPOINT >= 3
            // [snippet update-batch]
            double batchMs = 0;
            int advanced = 0;
            for (int step = 0; step < steps; ++step) {
#if LAB_CHECKPOINT >= 8
                if (state.historyCount == 0) {
                    heat::recordProbe(field, state);
                }
#endif
                const auto start = Clock::now();
                state.lastStep = heat::diffuse(field, state.settings);
                batchMs += millisecondsSince(start);
                if (!state.lastStep.advanced) {
                    state.pause();
                    state.message = heat::stepMessage(state.lastStep.status);
                    std::cout << state.message << '\n';
                    break;
                }
                ++advanced;
                state.dirty = true;
                heat::recordProbe(field, state);
            }
            if (advanced > 0) {
                state.updateMs = batchMs / advanced;
            }
            // [/snippet update-batch]
#endif
            if (state.dirty) {
                state.stats = heat::measure(field, state.settings);
#if LAB_CHECKPOINT >= 7
                const auto start = Clock::now();
                heat::uploadGrid(sdl.texture, field, state.settings.experiment, state.showPins);
                state.uploadMs = millisecondsSince(start);
#endif
                state.dirty = false;
            }
            // [snippet render-frame]
            heat::setColor(sdl.renderer, {9, 16, 29, 255});
            heat::requireSdl(SDL_RenderClear(sdl.renderer), "clear renderer");
            const auto drawStart = Clock::now();
#if LAB_CHECKPOINT >= 7
            heat::drawTexture(sdl.renderer, sdl.texture, field, state.showcase);
#elif LAB_CHECKPOINT >= 1
            heat::drawGrid(sdl.renderer, field);
#endif
            state.submitMs = millisecondsSince(drawStart);
            if (!state.showcase) {
                heat::drawPanel(sdl.renderer, field, state);
            }
            // [/snippet render-frame]
            const double wallSeconds = std::chrono::duration<double>(Clock::now() - openedAt).count();
            const bool lastFrame = options.seconds > 0 && wallSeconds >= options.seconds;
            if (lastFrame && !options.capture.empty()) {
                captureFrame(sdl.renderer, options.capture);
            }
            heat::requireSdl(SDL_RenderPresent(sdl.renderer), "present frame");
            if (lastFrame) {
                running = false;
            }
            SDL_Delay(2);
            static_cast<void>(steps);
            static_cast<void>(elapsed);
        }
        std::cout << "VIEW allocated_current=" << field.current.size() << " actual_drawn=";
#if LAB_CHECKPOINT >= 1
        std::cout << field.current.size();
#else
        std::cout << 0;
#endif
#if LAB_CHECKPOINT >= 3
        std::cout << " next=" << field.next.size() << " tick=" << field.tick << " model_time=" << field.time << " visited_last_step=" << state.lastStep.visited;
#endif
#if LAB_CHECKPOINT >= 7
        std::cout << " texture_capacity=65536";
#endif
        std::cout << " min=" << state.stats.minimum << " max=" << state.stats.maximum << " integral=" << state.stats.integral << " dropped_model_s=" << state.dropped << '\n';
        // Giải phóng tự động qua SdlResources, kể cả khi một lời gọi SDL ném lỗi.
        return EXIT_SUCCESS;
    } catch (const std::exception& error) {
        std::cerr << "P47: " << error.what() << '\n';
        return EXIT_FAILURE;
    }
}
