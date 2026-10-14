#include "diagnostics.hpp"
#include "view.hpp"
#include <cstdlib>
#include <iomanip>
#include <iostream>
#include <sstream>

int main(int, char**) {
    // Khởi tạo SDL, window và renderer; starter chỉ có nền trống.
    if (!SDL_Init(SDL_INIT_VIDEO)) {
        std::cerr << SDL_GetError() << '\n';
        return EXIT_FAILURE;
    }

    SDL_Window* window = SDL_CreateWindow("Synthetic volume slicer", slices::viewWidth, slices::viewHeight, SDL_WINDOW_RESIZABLE | SDL_WINDOW_HIGH_PIXEL_DENSITY);
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
    bool failed = !SDL_SetRenderLogicalPresentation(renderer, slices::viewWidth, slices::viewHeight, SDL_LOGICAL_PRESENTATION_LETTERBOX);
    bool running = !failed;
    std::array<SDL_Texture*, 3> textures{};
    [[maybe_unused]] slices::Grid grid;
    [[maybe_unused]] slices::Point cursor = slices::initialPoint(grid);
    [[maybe_unused]] slices::Window windowing;
    [[maybe_unused]] bool linear = false;
    [[maybe_unused]] int activeView = 0;
    [[maybe_unused]] bool threeViews = false;
    [[maybe_unused]] bool dirty = true;
#if LAB_CHECKPOINT >= 1
    for (auto& texture : textures) {
        texture = SDL_CreateTexture(renderer, SDL_PIXELFORMAT_RGBA32, SDL_TEXTUREACCESS_STREAMING, slices::Image::side, slices::Image::side);
        if (texture == nullptr || !SDL_SetTextureScaleMode(texture, SDL_SCALEMODE_NEAREST)) {
            failed = true;
            running = false;
            break;
        }
    }
#endif
#if LAB_CHECKPOINT >= 2
    slices::Volume volume(grid);
    slices::fillPhantom(volume);
    bool ramp = false;
    std::cout << "PageUp/PageDown: next/previous slice | P phantom/orientation ramp | R reset\n";
#endif
#if LAB_CHECKPOINT >= 3
    std::cout << "1 XY (axial) | 2 XZ (coronal) | 3 YZ (sagittal)\n";
#endif
#if LAB_CHECKPOINT >= 4
    std::cout << "W/S level | A/D window width | I inspector\n";
#endif
#if LAB_CHECKPOINT >= 5
    std::cout << "L nearest/trilinear | PageUp/Down step 0.1 voxel\n";
#endif
#if LAB_CHECKPOINT >= 6
    threeViews = true;
    bool paused = true;
    bool dragging = false;
    std::uint64_t previousTime = SDL_GetTicksNS();
    std::cout << "Click/drag moves shared world point | arrows in plane | Space scan/pause\n";
#endif
#if LAB_CHECKPOINT >= 7
    std::cout << "V: bounded volume and interpolation audit\n";
#endif

    while (running && !failed) {
        SDL_Event event{};
        while (SDL_PollEvent(&event)) {
            if (event.type == SDL_EVENT_QUIT)
                running = false;
            if (event.type == SDL_EVENT_KEY_DOWN && event.key.key == SDLK_ESCAPE)
                running = false;
#if LAB_CHECKPOINT >= 2
            if (event.type == SDL_EVENT_KEY_DOWN) {
                const int axis = slices::axesFor(activeView).cut;
                double step = 1;
#if LAB_CHECKPOINT >= 5
                step = 0.1;
#endif
                if (event.key.key == SDLK_PAGEUP)
                    cursor[axis] += step * grid.spacing[axis];
                if (event.key.key == SDLK_PAGEDOWN)
                    cursor[axis] -= step * grid.spacing[axis];
                if (event.key.key == SDLK_R) {
                    cursor = slices::initialPoint(grid);
                    activeView = 0;
                    windowing = {};
                    linear = false;
                    ramp = false;
                    slices::fillPhantom(volume);
#if LAB_CHECKPOINT >= 6
                    dragging = false;
                    SDL_CaptureMouse(false);
#endif
                }
                if (event.key.key == SDLK_P && !event.key.repeat) {
                    ramp = !ramp;
                    if (ramp)
                        slices::fillOrientation(volume);
                    else
                        slices::fillPhantom(volume);
                }
#if LAB_CHECKPOINT >= 3
                if (event.key.key >= SDLK_1 && event.key.key <= SDLK_3)
                    activeView = static_cast<int>(event.key.key - SDLK_1);
#endif
#if LAB_CHECKPOINT >= 4
                if (event.key.key == SDLK_W)
                    windowing.level = std::min(1.0, windowing.level + 0.02);
                if (event.key.key == SDLK_S)
                    windowing.level = std::max(0.0, windowing.level - 0.02);
                if (event.key.key == SDLK_A)
                    windowing.width = std::max(0.05, windowing.width - 0.05);
                if (event.key.key == SDLK_D)
                    windowing.width = std::min(1.5, windowing.width + 0.05);
                if (event.key.key == SDLK_I && !event.key.repeat) {
                    std::cout << std::setprecision(8) << "world=" << cursor[0] << ',' << cursor[1] << ',' << cursor[2] << " nearest=" << slices::sampleNearest(volume, cursor).value_or(-1) << " ramp=" << ramp << '\n';
                    if (!ramp)
                        std::cout << "phantom analytic=" << slices::phantom(cursor) << '\n';
#if LAB_CHECKPOINT >= 5
                    std::cout << "trilinear=" << slices::sampleLinear(volume, cursor).value_or(-1) << '\n';
#endif
                }
#endif
#if LAB_CHECKPOINT >= 5
                if (event.key.key == SDLK_L && !event.key.repeat)
                    linear = !linear;
#endif
#if LAB_CHECKPOINT >= 6
                if (event.key.key != SDLK_SPACE)
                    paused = true;
                if (event.key.key == SDLK_SPACE && !event.key.repeat)
                    paused = !paused;
                const auto axes = slices::axesFor(activeView);
                if (event.key.key == SDLK_LEFT)
                    cursor[axes.horizontal] -= grid.spacing[axes.horizontal];
                if (event.key.key == SDLK_RIGHT)
                    cursor[axes.horizontal] += grid.spacing[axes.horizontal];
                if (event.key.key == SDLK_UP)
                    cursor[axes.vertical] += grid.spacing[axes.vertical];
                if (event.key.key == SDLK_DOWN)
                    cursor[axes.vertical] -= grid.spacing[axes.vertical];
#endif
#if LAB_CHECKPOINT >= 7
                if (event.key.key == SDLK_V && !event.key.repeat) {
                    const auto report = slices::auditVolume(volume);
                    std::cout << "Audit checks=" << report.checks << " failures=" << report.failures << " residual=" << report.residual << " min/max=" << report.minimum << '/' << report.maximum << '\n';
                }
#endif
                for (int a = 0; a < 3; ++a)
                    cursor[a] = std::clamp(cursor[a], slices::worldCoordinate(grid, a, 0), slices::worldCoordinate(grid, a, grid.count[a] - 1));
                dirty = true;
            }
#endif
#if LAB_CHECKPOINT >= 6
            if (event.type == SDL_EVENT_WINDOW_FOCUS_LOST || event.type == SDL_EVENT_WINDOW_MINIMIZED) {
                paused = true;
                dragging = false;
                SDL_CaptureMouse(false);
            }
            if (event.type == SDL_EVENT_MOUSE_BUTTON_UP && event.button.button == SDL_BUTTON_LEFT) {
                dragging = false;
                SDL_CaptureMouse(false);
            }
            if ((event.type == SDL_EVENT_MOUSE_BUTTON_DOWN && event.button.button == SDL_BUTTON_LEFT) || (event.type == SDL_EVENT_MOUSE_MOTION && dragging)) {
                const bool down = event.type == SDL_EVENT_MOUSE_BUTTON_DOWN;
                if (!SDL_ConvertEventToRenderCoordinates(renderer, &event)) {
                    failed = true;
                    break;
                }
                double x = 0;
                double y = 0;
                if (down) {
                    x = event.button.x;
                    y = event.button.y;
                } else {
                    x = event.motion.x;
                    y = event.motion.y;
                }
                for (int view = 0; view < 3; ++view) {
                    if (!down && view != activeView)
                        continue;
                    const auto rect = slices::fitSlice(grid, view, slices::panelRect(view, slices::viewWidth, slices::viewHeight, true));
                    const auto point = slices::pickSlice(grid, view, cursor, rect, x, y);
                    if (point) {
                        cursor = *point;
                        activeView = view;
                        paused = true;
                        dirty = true;
                        if (down) {
                            dragging = SDL_CaptureMouse(true);
                        }
                        break;
                    }
                }
            }
#endif
        }
        if (!running || failed)
            break;

#if LAB_CHECKPOINT >= 6
        const std::uint64_t now = SDL_GetTicksNS();
        const double dt = std::min(0.1, static_cast<double>(now - previousTime) / 1e9);
        previousTime = now;
        if (!paused) {
            const int axis = slices::axesFor(activeView).cut;
            const double last = slices::worldCoordinate(grid, axis, grid.count[axis] - 1);
            cursor[axis] += dt * grid.spacing[axis] * 4;
            if (cursor[axis] >= last) {
                cursor[axis] = last;
                paused = true;
            }
            dirty = true;
        }
#endif
#if LAB_CHECKPOINT >= 1
        if (dirty) {
            int views = 1;
#if LAB_CHECKPOINT >= 6
            views = 3;
#endif
            for (int i = 0; i < views; ++i) {
                int view = activeView;
                if (threeViews)
                    view = i;
#if LAB_CHECKPOINT <= 1
                const auto image = slices::makeImage(grid, view, cursor, windowing, linear);
#endif
#if LAB_CHECKPOINT >= 2
                const auto image = slices::makeImage(grid, view, cursor, windowing, linear, volume);
#endif
                if (!slices::upload(textures[view], image))
                    failed = true;
            }
            dirty = false;
            std::ostringstream title;
            title << std::fixed << std::setprecision(3) << "Synthetic scalar (not CT/HU) | view=" << activeView << " world=" << cursor[0] << ',' << cursor[1] << ',' << cursor[2] << " | L/W=" << windowing.level << '/' << windowing.width << " linear=" << linear;
            SDL_SetWindowTitle(window, title.str().c_str());
        }
#endif
        SDL_SetRenderDrawColor(renderer, 11, 16, 32, 255);
        if (!SDL_RenderClear(renderer))
            failed = true;
#if LAB_CHECKPOINT >= 1
        int views = 1;
        if (threeViews)
            views = 3;
        for (int i = 0; i < views; ++i) {
            int view = activeView;
            if (threeViews)
                view = i;
            if (!slices::drawSlice(renderer, textures[view], grid, view, cursor, threeViews, view == activeView))
                failed = true;
        }
#endif
        if (!SDL_RenderPresent(renderer))
            failed = true;
        SDL_Delay(16);
    }

    if (failed)
        std::cerr << SDL_GetError() << '\n';
    // Giải phóng texture trước renderer, rồi window và SDL.
    for (auto* texture : textures)
        SDL_DestroyTexture(texture);
    SDL_DestroyRenderer(renderer);
    SDL_DestroyWindow(window);
    SDL_Quit();
    if (failed)
        return EXIT_FAILURE;
    return EXIT_SUCCESS;
}
