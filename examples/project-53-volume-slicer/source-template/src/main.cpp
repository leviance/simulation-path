#include "input.hpp"
#include <SDL3/SDL_main.h>
#include <chrono>
#include <cstdlib>
#include <iostream>
#include <string>

using namespace slice53;
namespace {
// Finite command-line runs are for diagnostics; interactive use keeps the ordinary SDL loop.
struct Options {
    bool hidden = false;
    bool verify = false;
    int frames = 0;
    double seconds = 0;
    int side = 0;
    int preset = -1;
    std::string capture;
};

Options arguments(int argc, char** argv) {
    Options options;
    for (int i = 1; i < argc; ++i) {
        const std::string argument = argv[i];
        if (argument == "--hidden") { options.hidden = true; continue; }
        if (argument == "--verify") { options.verify = true; continue; }
        if (i + 1 >= argc) throw std::invalid_argument("Missing option value");
        const std::string value = argv[++i];
        if (argument == "--frames") options.frames = std::stoi(value);
        else if (argument == "--seconds") options.seconds = std::stod(value);
        else if (argument == "--size") options.side = std::stoi(value);
        else if (argument == "--preset") options.preset = std::stoi(value);
        else if (argument == "--capture") options.capture = value;
        else throw std::invalid_argument("Unknown option: " + argument);
    }
    // [snippet finite-options]
    if (options.frames < 0 || options.frames > 600 || !std::isfinite(options.seconds) || options.seconds < 0 || options.seconds > 60)
        throw std::invalid_argument("Finite run: frames in [0,600], seconds in [0,60]");
    if (options.side != 0 && options.side != 64 && options.side != 128) throw std::invalid_argument("Size must be 64 or 128");
    if (options.preset < -1 || options.preset > 4) throw std::invalid_argument("Preset must be 0..4");
    if (!options.capture.empty() && options.frames == 0) options.frames = 3;
    if (options.verify && options.frames == 0) options.frames = 3;
    // [/snippet finite-options]
    return options;
}
}

int main(int argc, char** argv) {
    try {
        const Options options = arguments(argc, argv);
        Platform platform;
        platform.open(options.hidden);
        State state;
#if LAB_CHECKPOINT >= 2
        if (options.side != 0 || options.preset >= 0) {
            int side = state.side;
            Preset preset = state.preset;
            if (options.side != 0) side = options.side;
            if (options.preset >= 0) preset = static_cast<Preset>(options.preset);
            if (!state.load(preset, side)) throw std::runtime_error(state.status);
        }
#endif
#if LAB_CHECKPOINT >= 9
        if (options.verify) {
            const Audit report = audit(*state.volume);
            std::cout << "VOLUME AUDIT: checks=" << report.checks << " failures=" << report.failures << " affineResidual=" << report.residual << '\n';
            if (report.failures != 0) return EXIT_FAILURE;
        }
#endif
        Drag drag;
        bool running = true;
        int frames = 0;
        const auto started = std::chrono::steady_clock::now();
#if LAB_CHECKPOINT >= 8
        auto previous = started;
#endif
        // [snippet event-loop]
        while (running) {
            SDL_Event event;
            while (SDL_PollEvent(&event)) {
                if (!handleEvent(state, drag, event, platform.renderer)) running = false;
            }
            const auto now = std::chrono::steady_clock::now();
#if LAB_CHECKPOINT >= 8
            state.advance(std::chrono::duration<double>(now - previous).count());
            previous = now;
#endif
            // [snippet refresh-and-upload]
            if (state.dirty) {
                state.refresh();
                for (int view = 0; view < 3; ++view)
                    if (state.colorDirty[view]) platform.upload(platform.slices[view], state.colors[view].data(), 256, 256);
#if LAB_CHECKPOINT >= 6
                if (state.scene) platform.upload(platform.scene, state.scene->pixels().data(), 820, 620);
#endif
            }
            // [/snippet refresh-and-upload]
            drawUi(platform, state);
            if (!options.capture.empty() && frames == 2) platform.capture(options.capture);
            SDL_RenderPresent(platform.renderer);
            ++frames;
            if (options.frames > 0 && frames >= options.frames) running = false;
            if (options.seconds > 0 && std::chrono::duration<double>(now - started).count() >= options.seconds) running = false;
            SDL_Delay(5);
        }
        // [/snippet event-loop]
        release(drag, state);
#if LAB_CHECKPOINT >= 2
        std::cout << "{\"side\":" << state.side << ",\"voxels\":" << state.volume->values().size() << ",\"bytes\":" << state.volume->values().size() * sizeof(float) << ",\"buildMs\":" << state.buildMs << ",\"sceneMs\":" << state.sceneMs << ",\"frames\":" << frames << "}\n";
#else
        std::cout << "Completed " << frames << " frame(s)\n";
#endif
        return EXIT_SUCCESS;
    } catch (const std::exception& error) {
        std::cerr << "Project 53: " << error.what() << '\n';
        return EXIT_FAILURE;
    }
}
