#pragma once
#include "oracle-run.hpp"
#include "panel.hpp"

namespace water3 {
inline Command keyboardCommand(SDL_Keycode key) {
    if (key == SDLK_F1)
        return Command::Debug;
    if (key == SDLK_HOME)
        return Command::Home;
    if (key == SDLK_C)
        return Command::Cancel;
#if LAB_CHECKPOINT >= 2
    if (key == SDLK_R)
        return Command::Reset;
#endif
#if LAB_CHECKPOINT >= 5
    if (key == SDLK_N)
        return Command::Step;
    if (key == SDLK_L)
        return Command::View;
#endif
#if LAB_CHECKPOINT >= 6
    if (key == SDLK_F)
        return Command::Sound;
    if (key == SDLK_Q)
        return Command::Viscosity;
#endif
#if LAB_CHECKPOINT >= 8
    if (key == SDLK_G)
        return Command::Grid;
#endif
#if LAB_CHECKPOINT >= 10
    if (key == SDLK_SPACE)
        return Command::Play;
    if (key == SDLK_B)
        return Command::Benchmark;
#endif
#if LAB_CHECKPOINT >= 11
    if (key == SDLK_1)
        return Command::Small;
    if (key == SDLK_2)
        return Command::Medium;
    if (key == SDLK_3)
        return Command::Required;
    if (key == SDLK_4)
        return Command::HalfMillion;
    if (key == SDLK_5)
        return Command::Million;
    if (key == SDLK_RETURN)
        return Command::Confirm;
#endif
#if LAB_CHECKPOINT >= 12
    if (key == SDLK_V)
        return Command::Validate;
#endif
    return Command::None;
}

class Controls {
    public:
    PanelState ui;
    Benchmark benchmark;
    bool resetRequested = false;
#if LAB_CHECKPOINT >= 12
    ReferenceJob reference;
#endif
    bool referenceActive() const {
#if LAB_CHECKPOINT >= 12
        return reference.active;
#else
        return false;
#endif
    }

    bool referencePending() const {
#if LAB_CHECKPOINT >= 12
        return reference.pending();
#else
        return false;
#endif
    }

    void pause() {
        ui.playing = false;
        ui.message = "PAUSED - CURRENT BATCH MAY COMPLETE";
        benchmark.cancel();
        resetRequested = false;
        ui.armedSide = 0;
#if LAB_CHECKPOINT >= 12
        reference.cancel();
#endif
    }

    void serviceReference(lab::GlApi& gl) {
#if LAB_CHECKPOINT >= 12
        if (reference.active) {
            reference.service(gl);
            ui.message = reference.message;
        }
#else
        (void)gl;
#endif
    }

    bool wantsStep() const {
        return !referenceActive() && (ui.playing || benchmark.wantsStep());
    }

    void serviceRequests(lab::GlApi& gl, Engine& engine, const Plan& plan) {
        if (resetRequested && !engine.queue.pending()) {
            resetRequested = false;
            engine.reset(gl, plan);
            ui.message = "RESET - SAME N AND PARAMETERS";
        }
    }

    // Early checkpoints deliberately omit the commands that use these parameters.
    void command(Command command, [[maybe_unused]] lab::GlApi& gl, [[maybe_unused]] Engine& engine, View& view, [[maybe_unused]] Plan& plan) {
        if (command == Command::None)
            return;
        if (command == Command::Cancel) {
            pause();
            ui.message = "PAUSED - CURRENT BATCH MAY COMPLETE";
            return;
        }
        if (benchmark.active() && command != Command::Debug)
            return;
        if (referenceActive() && command != Command::Debug && command != Command::View && command != Command::Home)
            return;
        try {
            switch (command) {
            case Command::Debug:
                ui.debug = !ui.debug;
                ui.scroll = 0;
                break;
            case Command::Home:
                view.camera = Camera{};
                break;
#if LAB_CHECKPOINT >= 2
            case Command::Reset:
                ui.playing = false;
                resetRequested = true;
                ui.message = "RESET REQUESTED - WAIT CURRENT BATCH";
                break;
#endif
#if LAB_CHECKPOINT >= 5
            case Command::Step:
                ui.playing = false;
                ui.message = "PAUSED - WAIT FOR CURRENT BATCH";
                if (!engine.queue.pending() && engine.ready) {
                    engine.submit(gl);
                    ui.message = "ONE STEP SUBMITTED";
                }
                break;
            case Command::View:
#if LAB_CHECKPOINT >= 6
                view.mode = (view.mode + 1) % 5;
#else
                view.mode = (view.mode + 1) % 2;
#endif
                break;
#endif
#if LAB_CHECKPOINT >= 6
            case Command::Sound:
                if (!engine.queue.pending()) {
                    ui.playing = false;
                    if (engine.settings.soundSpeed == 8)
                        engine.settings.soundSpeed = 12;
                    else if (engine.settings.soundSpeed == 12)
                        engine.settings.soundSpeed = 20;
                    else
                        engine.settings.soundSpeed = 8;
                }
                break;
            case Command::Viscosity:
                if (!engine.queue.pending()) {
                    ui.playing = false;
                    engine.settings.alpha += 0.15;
                    if (engine.settings.alpha > 0.3)
                        engine.settings.alpha = 0;
                }
                break;
#endif
#if LAB_CHECKPOINT >= 8
            case Command::Grid:
                if (!engine.queue.pending() && plan.count <= 512) {
                    ui.playing = false;
                    engine.grid = !engine.grid;
                }
                break;
#endif
#if LAB_CHECKPOINT >= 10
            case Command::Play:
                ui.playing = !ui.playing;
                ui.armedSide = 0;
                ui.message = "PAUSED - CURRENT BATCH MAY COMPLETE";
                if (ui.playing)
                    ui.message = "RUNNING - MODEL TIME IS NOT WALL TIME";
                break;
            case Command::Benchmark:
                if (!engine.queue.pending()) {
                    ui.playing = false;
                    ui.armedSide = 0;
                    ui.debug = true;
                    benchmark.start(gl, engine, view);
                    ui.message = benchmark.message;
                }
                break;
#endif
#if LAB_CHECKPOINT >= 11
            case Command::Small:
                arm(8);
                break;
            case Command::Medium:
                arm(32);
                break;
            case Command::Required:
                arm(48);
                break;
            case Command::HalfMillion:
                arm(80);
                break;
            case Command::Million:
                arm(100);
                break;
            case Command::Confirm:
                // [snippet confirm-workload]
                if (ui.armedSide && !engine.queue.pending()) {
                    const auto requested = makePlan(ui.armedSide);
                    ui.armedSide = 0;
                    engine.reset(gl, requested);
                    plan = requested;
                    engine.grid = true;
                    ui.message = "NEW N - PAUSED - SAME PARAMETERS";
                }
                // [/snippet confirm-workload]
                break;
#endif
#if LAB_CHECKPOINT >= 12
            case Command::Validate:
                if (!engine.queue.pending()) {
                    ui.playing = false;
                    reference.start(gl, COURSE_SHADER_DIRECTORY);
                    ui.message = reference.message;
                }
                break;
#endif
            default:
                break;
            }
        } catch (const GpuBatchError&) {
            // Do not turn a driver failure into a recoverable button error.
            throw;
        } catch (const std::exception& error) {
            ui.playing = false;
            ui.message = std::string("ERROR: ") + error.what();
        }
    }

    void destroy(lab::GlApi& gl) {
#if LAB_CHECKPOINT >= 12
        reference.destroy(gl);
#else
        (void)gl;
#endif
    }

    private:
    void arm(std::uint32_t side) {
        ui.playing = false;
        ui.armedSide = side;
    }
};
} // namespace water3
