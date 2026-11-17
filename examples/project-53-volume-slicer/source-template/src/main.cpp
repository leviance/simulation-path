#include "app-check.hpp"
#include "input.hpp"
#include "view.hpp"
#include <cstdlib>
#include <iostream>
#include <string_view>

int main(int argc, char** argv) {
    // --frames bounds automated window smoke checks; normal launch stays interactive.
    int frameLimit = 0;
    std::string capturePath;
    bool selfTest = false;
    bool whole = false;
    bool dark = false;
    int preset = -1;
    for (int index = 1; index < argc; ++index) {
        const std::string_view argument(argv[index]);
        if (argument.starts_with("--frames=")) {
            try {
                std::size_t consumed = 0;
                const std::string value(argument.substr(9));
                frameLimit = std::stoi(value, &consumed);
                if (consumed != value.size() || frameLimit < 1 || frameLimit > 600) {
                    return EXIT_FAILURE;
                }
            } catch (const std::exception&) {
                return EXIT_FAILURE;
            }
        } else if (argument.starts_with("--capture=")) {
            capturePath = argument.substr(10);
            if (capturePath.empty()) {
                return EXIT_FAILURE;
            }
        } else if (argument == "--self-test") {
            selfTest = true;
        } else if (argument == "--whole") {
            whole = true;
        } else if (argument == "--dark") {
            dark = true;
        } else if (argument.starts_with("--preset=") && argument.size() == 10 && argument[9] >= '0' && argument[9] <= '4') {
            preset = argument[9] - '0';
        } else {
            std::cerr << "Use --frames=1..600, --capture=frame.bmp, --preset=0..4, --whole, --dark, --self-test\n";
            return EXIT_FAILURE;
        }
    }
    if (selfTest) {
        // This mode always finishes its fixed sequence, not an arbitrary frame limit.
        frameLimit = 0;
        if (whole || dark || preset >= 0) {
            std::cerr << "Run --self-test without presentation overrides\n";
            return EXIT_FAILURE;
        }
    }

    // [snippet initialize]
    if (!SDL_Init(SDL_INIT_VIDEO)) {
        std::cerr << SDL_GetError() << '\n';
        return EXIT_FAILURE;
    }
    SDL_Window* window = SDL_CreateWindow("Project 53 - Volume Slice Workbench", slices::viewWidth, slices::viewHeight, SDL_WINDOW_RESIZABLE | SDL_WINDOW_HIGH_PIXEL_DENSITY);
    if (window == nullptr) {
        std::cerr << SDL_GetError() << '\n';
        SDL_Quit();
        return EXIT_FAILURE;
    }
    SDL_Renderer* renderer = SDL_CreateRenderer(window, nullptr);
    if (renderer == nullptr) {
        std::cerr << SDL_GetError() << '\n';
        SDL_DestroyWindow(window);
        SDL_Quit();
        return EXIT_FAILURE;
    }
    // [/snippet initialize]
    bool failed = !SDL_SetRenderLogicalPresentation(renderer, slices::viewWidth, slices::viewHeight, SDL_LOGICAL_PRESENTATION_LETTERBOX);
    failed = !SDL_SetRenderDrawBlendMode(renderer, SDL_BLENDMODE_BLEND) || failed;
    std::array<SDL_Texture*, 3> textures{};
    SDL_Texture* sceneTexture = nullptr;
    slices::State state;
    state.cutaway = !whole;
    state.dark = dark;
#if LAB_CHECKPOINT >= 2
    if (preset >= 0) {
        state.ready = state.loadDataset(static_cast<slices::Preset>(preset), state.grid.count[0]);
    }
#else
    (void)preset;
#endif
#if LAB_CHECKPOINT >= 7
    slices::AppCheck appCheck;
#else
    if (selfTest) {
        std::cerr << "--self-test requires checkpoint 07 or final\n";
        failed = true;
    }
#endif
    failed = !state.ready || failed;
    [[maybe_unused]] slices::Drag drag;
#if LAB_CHECKPOINT >= 1
    std::array<slices::SliceCache, 3> cache;
    // [snippet textures]
    for (auto& texture : textures) {
        texture = SDL_CreateTexture(renderer, SDL_PIXELFORMAT_RGBA32, SDL_TEXTUREACCESS_STREAMING, slices::Image::side, slices::Image::side);
        if (texture == nullptr || !SDL_SetTextureScaleMode(texture, SDL_SCALEMODE_NEAREST)) {
            failed = true;
            break;
        }
    }
    // [/snippet textures]
#endif
#if LAB_CHECKPOINT >= 3
    slices::SceneCache sceneCache;
    // [snippet scene-texture]
    sceneTexture = SDL_CreateTexture(renderer, SDL_PIXELFORMAT_RGBA32, SDL_TEXTUREACCESS_STREAMING, slices::SceneFrame::width, slices::SceneFrame::height);
    if (sceneTexture == nullptr || !SDL_SetTextureScaleMode(sceneTexture, SDL_SCALEMODE_LINEAR)) {
        failed = true;
    }
    // [/snippet scene-texture]
#endif
    bool running = !failed;
    int frames = 0;
    [[maybe_unused]] std::uint64_t previousTime = SDL_GetTicksNS();
    while (running && !failed) {
#if LAB_CHECKPOINT >= 7
        if (selfTest) {
            appCheck.beforeFrame(renderer, state);
        }
#endif
        SDL_Event event{};
        while (SDL_PollEvent(&event)) {
            if (event.type == SDL_EVENT_QUIT || (event.type == SDL_EVENT_KEY_DOWN && event.key.key == SDLK_ESCAPE)) {
                running = false;
            }
            if (event.type == SDL_EVENT_KEY_DOWN && event.key.key == SDLK_R && !event.key.repeat) {
                drag = {};
                SDL_CaptureMouse(false);
                state.reset();
            }
#if LAB_CHECKPOINT >= 2
            if (event.type == SDL_EVENT_KEY_DOWN) {
                slices::keyboard(state, event.key.key, event.key.repeat, (event.key.mod & SDL_KMOD_CTRL) != 0);
            }
            // [snippet capture]
            if (event.type == SDL_EVENT_WINDOW_FOCUS_LOST || event.type == SDL_EVENT_WINDOW_MINIMIZED || (event.type == SDL_EVENT_MOUSE_BUTTON_UP && event.button.button == SDL_BUTTON_LEFT)) {
                drag = {};
                SDL_CaptureMouse(false);
                if (event.type != SDL_EVENT_MOUSE_BUTTON_UP) {
                    state.paused = true;
                }
            }
            if (event.type == SDL_EVENT_MOUSE_BUTTON_DOWN && event.button.button == SDL_BUTTON_LEFT) {
                drag = {};
                SDL_CaptureMouse(false);
                if (!SDL_ConvertEventToRenderCoordinates(renderer, &event)) {
                    failed = true;
                    break;
                }
                drag = slices::pointerDown(state, event.button.x, event.button.y);
                if (drag.kind != slices::DragKind::None && !SDL_CaptureMouse(true)) {
                    drag = {};
                }
            }
            if (event.type == SDL_EVENT_MOUSE_MOTION && drag.kind != slices::DragKind::None) {
                if (!SDL_ConvertEventToRenderCoordinates(renderer, &event)) {
                    failed = true;
                    break;
                }
                slices::movePointer(state, drag, event.motion.x, event.motion.y);
            }
            // [/snippet capture]
#endif
#if LAB_CHECKPOINT >= 3
            if (event.type == SDL_EVENT_MOUSE_WHEEL) {
                state.camera.distance *= std::exp(-std::clamp(static_cast<double>(event.wheel.y), -10.0, 10.0) * 0.1);
                slices::limitCamera(state.camera);
            }
#endif
        }
        if (!running || failed) {
            break;
        }
#if LAB_CHECKPOINT >= 6
        // [snippet scan]
        const std::uint64_t now = SDL_GetTicksNS();
        const double dt = std::min(0.1, static_cast<double>(now - previousTime) / 1e9);
        previousTime = now;
        if (!state.paused) {
            const int axis = slices::axesFor(state.activeView).cut;
            const double last = slices::worldCoordinate(state.grid, axis, state.grid.count[axis] - 1);
            state.cursor[axis] += dt * state.grid.spacing[axis] * 4;
            if (state.cursor[axis] >= last) {
                state.cursor[axis] = last;
                state.paused = true;
            }
        }
        // [/snippet scan]
#endif
#if LAB_CHECKPOINT >= 1
        int views = 1;
#if LAB_CHECKPOINT >= 3
        views = 3;
#endif
        for (int view = 0; view < views; ++view) {
            if (!cache[view].refresh(textures[view], state, view)) {
                failed = true;
            }
        }
#endif
#if LAB_CHECKPOINT >= 3
        // [snippet scene-refresh]
        if (!sceneCache.refresh(sceneTexture, state, cache)) {
            failed = true;
        }
        // [/snippet scene-refresh]
#endif
        if (!slices::drawDashboard(renderer, textures, sceneTexture, state)) {
            failed = true;
        }
        if (!capturePath.empty() && frames == 0 && !failed) {
            SDL_Surface* capture = SDL_RenderReadPixels(renderer, nullptr);
            if (capture == nullptr || !SDL_SaveBMP(capture, capturePath.c_str())) {
                failed = true;
            }
            SDL_DestroySurface(capture);
        }
        if (!SDL_RenderPresent(renderer)) {
            failed = true;
        }
        ++frames;
#if LAB_CHECKPOINT >= 7
        if (selfTest) {
            appCheck.afterFrame(state, drag);
            if (appCheck.complete()) {
                std::cout << "SDL event-loop self-test: " << appCheck.checks << " checks, " << appCheck.failures << " failures\n";
                failed = appCheck.failures != 0;
                running = false;
            }
        }
#endif
        if (frameLimit > 0 && frames >= frameLimit) {
            running = false;
        }
        SDL_Delay(16);
    }
#if LAB_CHECKPOINT >= 7
    if (selfTest && !appCheck.complete()) {
        failed = true;
    }
#endif
    if (failed) {
        std::cerr << SDL_GetError() << '\n';
    }
    // Textures belong to the renderer. Release them before destroying their owner.
    for (auto* texture : textures) {
        SDL_DestroyTexture(texture);
    }
    SDL_DestroyTexture(sceneTexture);
    SDL_DestroyRenderer(renderer);
    SDL_DestroyWindow(window);
    SDL_Quit();
    if (failed) {
        return EXIT_FAILURE;
    }
    std::cout << "Project 53 finished; grid=" << state.grid.count[0] << "^3 frames=" << frames << '\n';
    return EXIT_SUCCESS;
}
