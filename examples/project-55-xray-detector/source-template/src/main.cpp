#include "audit.hpp"
#include "view.hpp"
#include <cstdlib>
#include <iomanip>
#include <iostream>
#include <sstream>
#include <string_view>

int main(int argc, char** argv) {
    bool smoke = false;
    for (int i = 1; i < argc; ++i) {
        if (std::string_view(argv[i]) == "--smoke") {
            smoke = true;
        }
    }
    // Khởi tạo SDL và renderer; starter chỉ có event loop và nền tối.
    if (!SDL_Init(SDL_INIT_VIDEO)) {
        std::cerr << SDL_GetError() << '\n';
        return EXIT_FAILURE;
    }
    SDL_WindowFlags flags = SDL_WINDOW_RESIZABLE | SDL_WINDOW_HIGH_PIXEL_DENSITY;
    if (smoke) {
        flags |= SDL_WINDOW_HIDDEN;
    }
    SDL_Window* window = SDL_CreateWindow("Toy X-ray detector", xray::viewWidth, xray::viewHeight, flags);
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
    SDL_Texture* texture = nullptr;
    bool failed = false;
    try {
        if (!SDL_SetRenderLogicalPresentation(renderer, xray::viewWidth, xray::viewHeight, SDL_LOGICAL_PRESENTATION_LETTERBOX)) {
            throw std::runtime_error(SDL_GetError());
        }
        SDL_SetRenderVSync(renderer, 1);
        [[maybe_unused]] xray::Settings settings;
        [[maybe_unused]] bool imageDirty = true;
        [[maybe_unused]] bool inspectorDirty = true;
        [[maybe_unused]] int pixelX = 40;
        [[maybe_unused]] int pixelY = 30;
#if LAB_CHECKPOINT >= 1
        texture = SDL_CreateTexture(renderer, SDL_PIXELFORMAT_RGBA32, SDL_TEXTUREACCESS_STREAMING, xray::imageWidth, xray::imageHeight);
        if (texture == nullptr || !SDL_SetTextureScaleMode(texture, SDL_SCALEMODE_NEAREST)) {
            throw std::runtime_error(SDL_GetError());
        }
#endif
#if LAB_CHECKPOINT >= 2
        bool dragging = false;
        bool paused = true;
        std::uint64_t previous = SDL_GetTicksNS();
        std::cout << "Click/drag detector; arrows choose pixel; A/D object angle; Space rotate/pause; R reset; Esc quit\nXZ diagram is a projection, not a y=0 slice.\n";
#endif
#if LAB_CHECKPOINT >= 4
        std::cout << "P single/layered/overlap-additive | W/S attenuation strength\n";
#endif
#if LAB_CHECKPOINT >= 5
        std::cout << "N exact/midpoint | Q step0.05/0.1/0.2/0.4\n";
#endif
#if LAB_CHECKPOINT >= 6
        std::cout << "L ratio/log image | I invert | +/- exposure (no noise; normalized image unchanged)\n";
#endif
#if LAB_CHECKPOINT >= 7
        std::cout << "B mono/two-energy | J/K low-energy weight\n";
#endif
#if LAB_CHECKPOINT >= 8
        std::cout << "V bounded analytic audit\n";
#endif
        bool running = true;
        while (running) {
            SDL_Event event{};
            while (SDL_PollEvent(&event)) {
                if (event.type == SDL_EVENT_QUIT) {
                    running = false;
                }
                if (event.type == SDL_EVENT_KEY_DOWN && event.key.key == SDLK_ESCAPE) {
                    running = false;
                }
#if LAB_CHECKPOINT >= 2
                if (event.type == SDL_EVENT_WINDOW_FOCUS_LOST || event.type == SDL_EVENT_WINDOW_MINIMIZED) {
                    paused = true;
                    dragging = false;
                    SDL_CaptureMouse(false);
                }
                if (event.type == SDL_EVENT_MOUSE_BUTTON_DOWN && event.button.button == SDL_BUTTON_LEFT) {
                    if (!SDL_ConvertEventToRenderCoordinates(renderer, &event)) {
                        throw std::runtime_error(SDL_GetError());
                    }
                    const auto picked = xray::pickPixel(event.button.x, event.button.y);
                    if (picked) {
                        pixelX = (*picked)[0];
                        pixelY = (*picked)[1];
                        inspectorDirty = true;
                        paused = true;
                        dragging = SDL_CaptureMouse(true);
                    }
                }
                if (event.type == SDL_EVENT_MOUSE_MOTION && dragging) {
                    if (!SDL_ConvertEventToRenderCoordinates(renderer, &event)) {
                        throw std::runtime_error(SDL_GetError());
                    }
                    const auto picked = xray::pickPixel(event.motion.x, event.motion.y);
                    if (picked) {
                        pixelX = (*picked)[0];
                        pixelY = (*picked)[1];
                        inspectorDirty = true;
                    }
                }
                if (event.type == SDL_EVENT_MOUSE_BUTTON_UP && event.button.button == SDL_BUTTON_LEFT) {
                    dragging = false;
                    SDL_CaptureMouse(false);
                }
                if (event.type == SDL_EVENT_KEY_DOWN && !event.key.repeat) {
                    const auto before = settings;
                    const int oldPixelX = pixelX;
                    const int oldPixelY = pixelY;
                    if (event.key.key != SDLK_SPACE) {
                        paused = true;
                    }
                    if (event.key.key == SDLK_LEFT) {
                        pixelX = std::max(0, pixelX - 1);
                    }
                    if (event.key.key == SDLK_RIGHT) {
                        pixelX = std::min(xray::imageWidth - 1, pixelX + 1);
                    }
                    if (event.key.key == SDLK_UP) {
                        pixelY = std::max(0, pixelY - 1);
                    }
                    if (event.key.key == SDLK_DOWN) {
                        pixelY = std::min(xray::imageHeight - 1, pixelY + 1);
                    }
#if LAB_CHECKPOINT >= 3
                    if (event.key.key == SDLK_A) {
                        settings.angle = xray::wrapAngle(settings.angle - 0.05);
                    }
                    if (event.key.key == SDLK_D) {
                        settings.angle = xray::wrapAngle(settings.angle + 0.05);
                    }
                    if (event.key.key == SDLK_SPACE) {
                        paused = !paused;
                    }
#endif
                    if (event.key.key == SDLK_R) {
                        settings = {};
                        pixelX = 40;
                        pixelY = 30;
                        paused = true;
                        dragging = false;
                        SDL_CaptureMouse(false);
                    }
#if LAB_CHECKPOINT >= 4
                    if (event.key.key == SDLK_P) {
                        settings.preset = (settings.preset + 1) % 3;
                    }
                    if (event.key.key == SDLK_W) {
                        settings.strength = std::min(3.0, settings.strength + 0.1);
                    }
                    if (event.key.key == SDLK_S) {
                        settings.strength = std::max(0.0, settings.strength - 0.1);
                    }
#endif
#if LAB_CHECKPOINT >= 5
                    if (event.key.key == SDLK_N) {
                        settings.numeric = !settings.numeric;
                    }
                    if (event.key.key == SDLK_Q) {
                        settings.stepLength *= 2;
                        if (settings.stepLength > 0.4) {
                            settings.stepLength = 0.05;
                        }
                    }
#endif
#if LAB_CHECKPOINT >= 6
                    if (event.key.key == SDLK_L) {
                        settings.logView = !settings.logView;
                    }
                    if (event.key.key == SDLK_I) {
                        settings.invert = !settings.invert;
                    }
                    if (event.key.key == SDLK_EQUALS || event.key.key == SDLK_PLUS) {
                        settings.exposure = std::min(50000.0, settings.exposure + 1000);
                    }
                    if (event.key.key == SDLK_MINUS) {
                        settings.exposure = std::max(1000.0, settings.exposure - 1000);
                    }
#endif
#if LAB_CHECKPOINT >= 7
                    if (event.key.key == SDLK_B) {
                        settings.spectral = !settings.spectral;
                    }
                    if (event.key.key == SDLK_J) {
                        settings.lowWeight = std::max(0.0, settings.lowWeight - 0.05);
                    }
                    if (event.key.key == SDLK_K) {
                        settings.lowWeight = std::min(1.0, settings.lowWeight + 0.05);
                    }
#endif
#if LAB_CHECKPOINT >= 8
                    if (event.key.key == SDLK_V) {
                        std::cout << "Audit PASS; max boundary optical-depth error=" << xray::audit() << '\n';
                    }
#endif
                    imageDirty = imageDirty || xray::imageChanged(before, settings);
                    inspectorDirty = inspectorDirty || before != settings || oldPixelX != pixelX || oldPixelY != pixelY;
                }
#endif
            }
            if (!running) {
                break;
            }
#if LAB_CHECKPOINT >= 2
            const auto now = SDL_GetTicksNS();
            const double dt = std::min(0.1, static_cast<double>(now - previous) / 1e9);
            previous = now;
#if LAB_CHECKPOINT >= 3
            if (!paused) {
                settings.angle = xray::wrapAngle(settings.angle + 0.25 * dt);
                imageDirty = true;
                inspectorDirty = true;
            }
#else
            (void)dt;
            (void)paused;
#endif
#endif
#if LAB_CHECKPOINT >= 1
            // Rebuild the whole image only when image parameters change.
            if (imageDirty) {
                xray::upload(texture, xray::makeImage(settings));
                imageDirty = false;
            }
#if LAB_CHECKPOINT >= 4
            // Choosing a pixel measures one ray; it does not rerender 4,800 rays.
            if (inspectorDirty) {
                const auto measurement = xray::measure(xray::detectorRay((pixelX + 0.5) / xray::imageWidth, (pixelY + 0.5) / xray::imageHeight), xray::makeScene(settings.preset), settings);
                std::ostringstream title;
                title << std::fixed << std::setprecision(5) << "Toy X-ray | pixel " << pixelX << ',' << pixelY << " | tauLow=" << measurement.depth.low << " T=" << measurement.ratio << " I=" << measurement.intensity;
#if LAB_CHECKPOINT >= 6
                title << " p=" << measurement.logProjection;
#endif
#if LAB_CHECKPOINT >= 7
                title << " tauHigh=" << measurement.depth.high;
#endif
                title << " | XZ projection";
                if (!SDL_SetWindowTitle(window, title.str().c_str())) {
                    throw std::runtime_error(SDL_GetError());
                }
                inspectorDirty = false;
            }
#endif
#endif
            if (!SDL_SetRenderDrawColor(renderer, 11, 16, 32, 255) || !SDL_RenderClear(renderer)) {
                throw std::runtime_error(SDL_GetError());
            }
#if LAB_CHECKPOINT >= 1
            if (!SDL_RenderTexture(renderer, texture, nullptr, &xray::imageRect)) {
                throw std::runtime_error(SDL_GetError());
            }
#endif
#if LAB_CHECKPOINT >= 2
            xray::drawGeometry(renderer, settings, pixelX, pixelY);
#endif
            if (!SDL_RenderPresent(renderer)) {
                throw std::runtime_error(SDL_GetError());
            }
            if (smoke) {
                running = false;
                std::cout << "SDL smoke PASS\n";
            }
            SDL_Delay(16);
        }
    } catch (const std::exception& error) {
        failed = true;
        std::cerr << error.what() << '\n';
    }

    // Giải phóng texture trước renderer/window; mọi nhánh lỗi đều tới cleanup.
    if (texture != nullptr) {
        SDL_DestroyTexture(texture);
    }
    SDL_DestroyRenderer(renderer);
    SDL_DestroyWindow(window);
    SDL_Quit();
    if (failed) {
        return EXIT_FAILURE;
    }
    return EXIT_SUCCESS;
}
