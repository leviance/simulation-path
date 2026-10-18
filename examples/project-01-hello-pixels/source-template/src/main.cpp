#ifndef LAB_CHECKPOINT
#define LAB_CHECKPOINT 6
#endif

#include <cstdlib>
#include <iostream>

#if LAB_CHECKPOINT >= 1
#include <SDL3/SDL.h>
#if LAB_CHECKPOINT >= 2
#include "lab.hpp"
#endif
#if LAB_CHECKPOINT >= 3
#include "presentation.hpp"
#endif
#if LAB_CHECKPOINT >= 6
#include "smoke.hpp"
#include <string_view>
#endif

namespace {
constexpr int kInitialWidth = 960;
constexpr int kInitialHeight = 540;

#if LAB_CHECKPOINT <= 2
bool runWindowCheckpoint(SDL_Renderer* renderer) {
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
        }
        if (!running) {
            break;
        }

        if (!SDL_SetRenderDrawColor(renderer, 11, 16, 32, 255)) {
            return false;
        }
        if (!SDL_RenderClear(renderer)) {
            return false;
        }
        if (!SDL_RenderPresent(renderer)) {
            return false;
        }

        // Nhường CPU; đây chưa phải bộ giới hạn FPS của Project 02.
        SDL_Delay(10);
    }
    return true;
}
#endif

#if LAB_CHECKPOINT >= 3
bool runPixels(SDL_Window* window, SDL_Renderer* renderer) {
    int width = 0;
    int height = 0;
    if (!SDL_GetRenderOutputSize(renderer, &width, &height)) {
        return false;
    }

    lab::Framebuffer framebuffer;
    if (!framebuffer.resize(width, height)) {
        SDL_SetError("Cannot allocate initial framebuffer");
        return false;
    }
    SDL_Texture* texture = lab::createFramebufferTexture(renderer, width, height);
    if (!texture) {
        return false;
    }

#if LAB_CHECKPOINT >= 4
    int pattern = 2;
    int cell = 32;
    std::uint32_t seed = 17;
#endif
    bool dirty = true;
    bool running = true;
    bool failed = false;
    while (running) {
        SDL_Event event{};
        while (SDL_PollEvent(&event)) {
            if (event.type == SDL_EVENT_QUIT) {
                running = false;
            }
            if (event.type == SDL_EVENT_KEY_DOWN && !event.key.repeat) {
                if (event.key.key == SDLK_ESCAPE) {
                    running = false;
                }
#if LAB_CHECKPOINT >= 4
                if (event.key.key >= SDLK_1 && event.key.key <= SDLK_4) {
                    pattern = static_cast<int>(event.key.key - SDLK_1) + 1;
                    dirty = true;
                }
                if (event.key.key == SDLK_N) {
                    ++seed;
                    dirty = true;
                }
                if (event.key.key == SDLK_MINUS) {
                    cell = std::max(1, cell - 1);
                    dirty = true;
                }
                if (event.key.key == SDLK_EQUALS) {
                    cell = std::min(128, cell + 1);
                    dirty = true;
                }
#endif
            }
        }
        if (!running) {
            break;
        }

#if LAB_CHECKPOINT >= 5
        // Hỏi kích thước đầu ra thật sau khi đã lấy hết sự kiện resize.
        if ((SDL_GetWindowFlags(window) & SDL_WINDOW_MINIMIZED) != 0) {
            SDL_Delay(20);
            continue;
        }
        if (!SDL_GetRenderOutputSize(renderer, &width, &height)) {
            failed = true;
            break;
        }
        if (width <= 0 || height <= 0) {
            SDL_Delay(20);
            continue;
        }
        if (width != framebuffer.width || height != framebuffer.height) {
            if (!lab::replaceFramebuffer(renderer, framebuffer, texture, width, height)) {
                failed = true;
                break;
            }
            dirty = true;
        }
#else
        // Bài 03–04 chưa xử lý resize: texture cũ tạm co giãn theo cửa sổ.
        (void)window;
#endif

        if (dirty) {
#if LAB_CHECKPOINT == 3
            framebuffer.clear(lab::rgba(11, 16, 32));
            const int centerX = framebuffer.width / 2;
            const int centerY = framebuffer.height / 2;
            for (int offset = -20; offset <= 20; ++offset) {
                framebuffer.putPixel(centerX + offset, centerY, lab::rgba(83, 240, 174));
                framebuffer.putPixel(centerX, centerY + offset, lab::rgba(83, 240, 174));
            }
#else
            if (pattern == 1) {
                framebuffer.clear(lab::rgba(83, 240, 174));
                SDL_SetWindowTitle(window, "Hello Pixels | 1 Solid | 2 Gradient | 3 Checker | 4 Noise");
            } else if (pattern == 2) {
                framebuffer.gradient();
                SDL_SetWindowTitle(window, "Hello Pixels | Gradient | 1-4: scene | Esc: quit");
            } else if (pattern == 3) {
                framebuffer.checker(cell);
                SDL_SetWindowTitle(window, "Hello Pixels | Checker | -/=: cell size | 1-4: scene");
            } else {
                framebuffer.noise(seed);
                SDL_SetWindowTitle(window, "Hello Pixels | Noise | N: next seed | 1-4: scene");
            }
#endif
            if (!lab::uploadFramebuffer(texture, framebuffer)) {
                failed = true;
                break;
            }
            dirty = false;
        }

        // Renderer chỉ copy ảnh CPU, không tạo các hình bên trong ảnh.
        if (!lab::presentFramebuffer(renderer, texture)) {
            failed = true;
            break;
        }
        SDL_Delay(10);
    }

    SDL_DestroyTexture(texture);
    return !failed;
}
#endif
} // namespace

#if LAB_CHECKPOINT >= 6
int main(int argc, char* argv[]) {
    bool smoke = false;
    if (argc == 2 && std::string_view(argv[1]) == "--smoke") {
        smoke = true;
    }
#else
int main() {
#endif
    // Khởi tạo SDL, rồi tạo window và renderer theo thứ tự phụ thuộc.
    if (!SDL_Init(SDL_INIT_VIDEO)) {
        std::cerr << "SDL_Init failed: " << SDL_GetError() << '\n';
        return EXIT_FAILURE;
    }

    SDL_WindowFlags flags = SDL_WINDOW_RESIZABLE | SDL_WINDOW_HIGH_PIXEL_DENSITY;
#if LAB_CHECKPOINT >= 6
    if (smoke) {
        flags |= SDL_WINDOW_HIDDEN;
    }
#endif
    SDL_Window* window = SDL_CreateWindow("Project 01 - Hello Pixels", kInitialWidth, kInitialHeight, flags);
    if (!window) {
        std::cerr << "SDL_CreateWindow failed: " << SDL_GetError() << '\n';
        SDL_Quit();
        return EXIT_FAILURE;
    }
    SDL_Renderer* renderer = SDL_CreateRenderer(window, nullptr);
    if (!renderer) {
        std::cerr << "SDL_CreateRenderer failed: " << SDL_GetError() << '\n';
        SDL_DestroyWindow(window);
        SDL_Quit();
        return EXIT_FAILURE;
    }

#if LAB_CHECKPOINT == 2
    lab::Framebuffer framebuffer;
    if (!framebuffer.resize(kInitialWidth, kInitialHeight)) {
        std::cerr << "Framebuffer allocation failed\n";
        SDL_DestroyRenderer(renderer);
        SDL_DestroyWindow(window);
        SDL_Quit();
        return EXIT_FAILURE;
    }
    std::cout << framebuffer.width << " x " << framebuffer.height << " = " << framebuffer.pixels.size() << " pixels\n";
#endif

    bool success = false;
#if LAB_CHECKPOINT <= 2
    success = runWindowCheckpoint(renderer);
#elif LAB_CHECKPOINT >= 6
    if (smoke) {
        success = lab::runSmoke(window, renderer);
    } else {
        success = runPixels(window, renderer);
    }
#else
    success = runPixels(window, renderer);
#endif
    if (!success) {
        std::cerr << "Application failed: " << SDL_GetError() << '\n';
    }

    // Giải phóng renderer trước window; texture đã được hàm chạy hủy.
    SDL_DestroyRenderer(renderer);
    SDL_DestroyWindow(window);
    SDL_Quit();
    if (!success) {
        return EXIT_FAILURE;
    }
    return EXIT_SUCCESS;
}
#else
int main() {
    std::cout << "Project 01 starter: build works. Open lesson 01 to create the SDL window.\n";
    return EXIT_SUCCESS;
}
#endif
