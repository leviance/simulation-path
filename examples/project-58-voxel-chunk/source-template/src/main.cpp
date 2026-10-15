#include "audit.hpp"
#include "inspector.hpp"
#include <SDL3/SDL.h>
#include <SDL3/SDL_main.h>
#include <cstdlib>
#include <cstring>
#include <iostream>
#include <string>
#include <string_view>

namespace {
void require(bool success) {
    if (!success) {
        throw std::runtime_error(SDL_GetError());
    }
}

// Texture streaming có pitch riêng; không giả định các hàng nằm liền nhau.
void upload(SDL_Texture* texture, const voxel::Frame& frame) {
    void* pixels = nullptr;
    int pitch = 0;
    require(SDL_LockTexture(texture, nullptr, &pixels, &pitch));
    for (int y = 0; y < voxel::imageHeight; ++y) {
        auto* row = static_cast<std::uint8_t*>(pixels) + y * pitch;
        const auto* source = frame.pixels.data() + y * voxel::imageWidth;
        std::memcpy(row, source, voxel::imageWidth * sizeof(voxel::Color));
    }
    SDL_UnlockTexture(texture);
}
} // namespace

int main(int argc, char** argv) {
    bool smoke = false;
    for (int i = 1; i < argc; ++i) {
        if (std::string_view(argv[i]) == "--smoke") {
            smoke = true;
        }
    }
    // Khởi tạo SDL, kiểm tra từng tài nguyên trước khi đi vào event loop.
    if (!SDL_Init(SDL_INIT_VIDEO)) {
        std::cerr << SDL_GetError() << '\n';
        return EXIT_FAILURE;
    }
    SDL_WindowFlags flags = SDL_WINDOW_RESIZABLE | SDL_WINDOW_HIGH_PIXEL_DENSITY;
    if (smoke) {
        flags |= SDL_WINDOW_HIDDEN;
    }
    SDL_Window* window = SDL_CreateWindow("Voxel chunk 16x16x16", 960, 600, flags);
    SDL_Renderer* renderer = nullptr;
    if (window != nullptr) {
        renderer = SDL_CreateRenderer(window, nullptr);
    }
    SDL_Texture* texture = nullptr;
    if (renderer != nullptr) {
        texture = SDL_CreateTexture(renderer, SDL_PIXELFORMAT_RGBA32, SDL_TEXTUREACCESS_STREAMING, voxel::imageWidth, voxel::imageHeight);
    }
    if (texture == nullptr) {
        std::cerr << SDL_GetError() << '\n';
        SDL_DestroyRenderer(renderer);
        SDL_DestroyWindow(window);
        SDL_Quit();
        return EXIT_FAILURE;
    }

    bool failed = false;
    try {
        require(SDL_SetRenderLogicalPresentation(renderer, 960, 600, SDL_LOGICAL_PRESENTATION_LETTERBOX));
        require(SDL_SetTextureScaleMode(texture, SDL_SCALEMODE_NEAREST));
        SDL_SetRenderVSync(renderer, 1);
        voxel::Frame frame;
        voxel::Camera camera;
        voxel::Mesh mesh;
        bool dirty = true;
        bool running = true;
        [[maybe_unused]] bool paused = true;
        [[maybe_unused]] bool dragging = false;
        [[maybe_unused]] bool inspecting = false;
        bool useDepth = true;
        [[maybe_unused]] int slice = 15;
        [[maybe_unused]] int preset = 0;
#if LAB_CHECKPOINT >= 3
        preset = 1;
#endif
#if LAB_CHECKPOINT >= 4
        preset = 2;
#endif
#if LAB_CHECKPOINT < 3
        camera.center = 7.5;
        camera.scale = 60;
        slice = 7;
#endif
#if LAB_CHECKPOINT >= 2
        voxel::Chunk chunk = voxel::makeChunk(preset);
#endif
#if LAB_CHECKPOINT >= 6
        std::array<int, 3> selected{7, 15, 7};
#endif
        std::cout << "Esc: quit\n";
#if LAB_CHECKPOINT >= 4
        std::cout << "P: preset single/full/steps/empty | R: reset\n";
#endif
#if LAB_CHECKPOINT >= 5
        std::cout << "Drag or arrows: orbit | +/-: zoom | Space: rotate/pause | D: depth experiment\n";
#endif
#if LAB_CHECKPOINT >= 6
        std::cout << "PageUp/PageDown: slice | click/drag grid: inspect (not edit)\n";
#endif
#if LAB_CHECKPOINT >= 7
        std::cout << "V: bounded pure validation\n";
#endif
        Uint64 previous = SDL_GetTicks();
        while (running) {
            SDL_Event event{};
            while (SDL_PollEvent(&event)) {
                if (event.type == SDL_EVENT_QUIT || (event.type == SDL_EVENT_KEY_DOWN && event.key.key == SDLK_ESCAPE)) {
                    running = false;
                }
                if (event.type == SDL_EVENT_WINDOW_FOCUS_LOST || event.type == SDL_EVENT_WINDOW_MINIMIZED) {
                    paused = true;
                    dragging = false;
                    SDL_CaptureMouse(false);
                }
#if LAB_CHECKPOINT >= 4
                if (event.type == SDL_EVENT_KEY_DOWN && !event.key.repeat) {
                    const SDL_Keycode key = event.key.key;
                    if (key == SDLK_P) {
                        preset = (preset + 1) % 4;
                        chunk = voxel::makeChunk(preset);
                        paused = true;
                        dragging = false;
                        SDL_CaptureMouse(false);
                        dirty = true;
                    }
                    if (key == SDLK_R) {
                        preset = 2;
                        chunk = voxel::makeChunk(preset);
                        camera = {};
                        slice = 15;
#if LAB_CHECKPOINT >= 6
                        selected = {7, 15, 7};
#endif
                        useDepth = true;
                        paused = true;
                        dragging = false;
                        SDL_CaptureMouse(false);
                        dirty = true;
                    }
#if LAB_CHECKPOINT >= 5
                    if (key == SDLK_SPACE) {
                        paused = !paused;
                    }
                    if (key == SDLK_LEFT) {
                        voxel::orbit(camera, -8, 0);
                    }
                    if (key == SDLK_RIGHT) {
                        voxel::orbit(camera, 8, 0);
                    }
                    if (key == SDLK_UP) {
                        voxel::orbit(camera, 0, -8);
                    }
                    if (key == SDLK_DOWN) {
                        voxel::orbit(camera, 0, 8);
                    }
                    if (key == SDLK_EQUALS || key == SDLK_PLUS) {
                        voxel::zoom(camera, 1);
                    }
                    if (key == SDLK_MINUS) {
                        voxel::zoom(camera, -1);
                    }
                    if (key == SDLK_D) {
                        useDepth = !useDepth;
                    }
                    dirty = true;
#endif
#if LAB_CHECKPOINT >= 6
                    if (key == SDLK_PAGEUP) {
                        slice = std::min(15, slice + 1);
                    }
                    if (key == SDLK_PAGEDOWN) {
                        slice = std::max(0, slice - 1);
                    }
                    selected[1] = slice;
#endif
#if LAB_CHECKPOINT >= 7
                    if (key == SDLK_V) {
                        voxel::audit();
                        std::cout << "Voxel audit PASS\n";
                    }
#endif
                }
#endif
#if LAB_CHECKPOINT >= 5
                if (event.type == SDL_EVENT_MOUSE_BUTTON_UP && event.button.button == SDL_BUTTON_LEFT) {
                    dragging = false;
                    SDL_CaptureMouse(false);
                }
                const bool down = event.type == SDL_EVENT_MOUSE_BUTTON_DOWN && event.button.button == SDL_BUTTON_LEFT;
                const bool move = event.type == SDL_EVENT_MOUSE_MOTION && dragging;
                if (down || move) {
                    require(SDL_ConvertEventToRenderCoordinates(renderer, &event));
                    float x = 0;
                    float y = 0;
                    if (down) {
                        x = event.button.x;
                        y = event.button.y;
                        inspecting = false;
#if LAB_CHECKPOINT >= 6
                        inspecting = voxel::pickCell(x, y, slice).has_value();
#endif
                        if (inspecting || (x >= 0 && x < 640 && y >= 0 && y < 480)) {
                            dragging = true;
                            paused = true;
                            SDL_CaptureMouse(true);
                        }
                    } else {
                        x = event.motion.x;
                        y = event.motion.y;
                    }
#if LAB_CHECKPOINT >= 6
                    const auto cell = voxel::pickCell(x, y, slice);
                    if (inspecting && cell.has_value()) {
                        selected = *cell;
                    } else {
#endif
                        if (move && !inspecting && x >= 0 && x < 640 && y >= 0 && y < 480) {
                            voxel::orbit(camera, event.motion.xrel * 0.5, event.motion.yrel * 0.5);
                        }
#if LAB_CHECKPOINT >= 6
                    }
#endif
                    dirty = true;
                }
#endif
            }
            const Uint64 now = SDL_GetTicks();
            [[maybe_unused]] const double dt = std::min(0.05, static_cast<double>(now - previous) / 1000.0);
            previous = now;
#if LAB_CHECKPOINT >= 5
            if (!paused && !smoke) {
                voxel::orbit(camera, dt * 20, 0);
                dirty = true;
            }
#endif
            if (dirty) {
                mesh.clear();
#if LAB_CHECKPOINT >= 1
#if LAB_CHECKPOINT < 3
#if LAB_CHECKPOINT >= 2
                voxel::appendCube(mesh, {7, 7, 7}, static_cast<int>(voxel::get(chunk, 7, 7, 7)));
#else
                voxel::appendCube(mesh, {7, 7, 7}, 3);
#endif
#else
                mesh = voxel::buildMesh(chunk, slice);
#endif
#endif
                voxel::render(frame, mesh, camera, useDepth);
                upload(texture, frame);
                dirty = false;
            }
            require(SDL_SetRenderDrawColor(renderer, 11, 16, 32, 255));
            require(SDL_RenderClear(renderer));
            const SDL_FRect image{0, 0, 640, 480};
            require(SDL_RenderTexture(renderer, texture, nullptr, &image));
#if LAB_CHECKPOINT >= 2
            for (int z = 0; z < voxel::side; ++z) {
                for (int x = 0; x < voxel::side; ++x) {
                    const voxel::Block block = voxel::get(chunk, x, slice, z);
                    voxel::Color color{25, 32, 48, 255};
                    if (block != voxel::Block::Air) {
                        color = voxel::faceColor(static_cast<int>(block), 2);
                    }
                    require(SDL_SetRenderDrawColor(renderer, color.r, color.g, color.b, 255));
                    const SDL_FRect cell{static_cast<float>(voxel::panelX + x * voxel::cellSize), static_cast<float>(voxel::panelY + z * voxel::cellSize), 15, 15};
                    require(SDL_RenderFillRect(renderer, &cell));
                }
            }
            const std::string summary = "solid=" + std::to_string(voxel::solidCount(chunk)) + " triangles=" + std::to_string(mesh.size()) + " slice=" + std::to_string(slice);
            require(SDL_SetRenderDrawColor(renderer, 230, 235, 245, 255));
            require(SDL_RenderDebugText(renderer, 16, 500, summary.c_str()));
#endif
#if LAB_CHECKPOINT >= 6
            const SDL_FRect marker{static_cast<float>(voxel::panelX + selected[0] * voxel::cellSize), static_cast<float>(voxel::panelY + selected[2] * voxel::cellSize), 16, 16};
            require(SDL_SetRenderDrawColor(renderer, 255, 220, 80, 255));
            require(SDL_RenderRect(renderer, &marker));
            const std::string detail = "x=" + std::to_string(selected[0]) + " y=" + std::to_string(slice) + " z=" + std::to_string(selected[2]) + " index=" + std::to_string(voxel::index(selected[0], slice, selected[2])) + " block=" + std::to_string(static_cast<int>(voxel::get(chunk, selected[0], slice, selected[2])));
            require(SDL_RenderDebugText(renderer, 16, 520, detail.c_str()));
#endif
            require(SDL_RenderPresent(renderer));
            if (smoke) {
                running = false;
            }
            SDL_Delay(8);
        }
    } catch (const std::exception& error) {
        failed = true;
        std::cerr << error.what() << '\n';
    }
    // Giải phóng texture trước renderer, rồi đóng window và SDL.
    SDL_CaptureMouse(false);
    SDL_DestroyTexture(texture);
    SDL_DestroyRenderer(renderer);
    SDL_DestroyWindow(window);
    SDL_Quit();
    if (failed) {
        return EXIT_FAILURE;
    }
    return EXIT_SUCCESS;
}
