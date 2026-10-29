#pragma once

#include <SDL3/SDL.h>

#include <algorithm>
#include <array>
#include <cctype>
#include <stdexcept>
#include <string_view>

namespace lab {

// Scaffold vẽ dashboard bằng CPU. Không dùng UI draw calls để giả lập compute.
// Bitmap 5x7 tự chứa giúp ZIP không phụ thuộc font/SDL_ttf hay file ngoài.
inline std::array<unsigned char, 7> glyph(char character) {
    switch (static_cast<char>(std::toupper(static_cast<unsigned char>(character)))) {
    case 'A':
        return {14, 17, 17, 31, 17, 17, 17};
    case 'B':
        return {30, 17, 17, 30, 17, 17, 30};
    case 'C':
        return {14, 17, 16, 16, 16, 17, 14};
    case 'D':
        return {30, 17, 17, 17, 17, 17, 30};
    case 'E':
        return {31, 16, 16, 30, 16, 16, 31};
    case 'F':
        return {31, 16, 16, 30, 16, 16, 16};
    case 'G':
        return {14, 17, 16, 23, 17, 17, 15};
    case 'H':
        return {17, 17, 17, 31, 17, 17, 17};
    case 'I':
        return {14, 4, 4, 4, 4, 4, 14};
    case 'J':
        return {7, 2, 2, 2, 2, 18, 12};
    case 'K':
        return {17, 18, 20, 24, 20, 18, 17};
    case 'L':
        return {16, 16, 16, 16, 16, 16, 31};
    case 'M':
        return {17, 27, 21, 21, 17, 17, 17};
    case 'N':
        return {17, 25, 25, 21, 19, 19, 17};
    case 'O':
        return {14, 17, 17, 17, 17, 17, 14};
    case 'P':
        return {30, 17, 17, 30, 16, 16, 16};
    case 'Q':
        return {14, 17, 17, 17, 21, 18, 13};
    case 'R':
        return {30, 17, 17, 30, 20, 18, 17};
    case 'S':
        return {15, 16, 16, 14, 1, 1, 30};
    case 'T':
        return {31, 4, 4, 4, 4, 4, 4};
    case 'U':
        return {17, 17, 17, 17, 17, 17, 14};
    case 'V':
        return {17, 17, 17, 17, 17, 10, 4};
    case 'W':
        return {17, 17, 17, 21, 21, 21, 10};
    case 'X':
        return {17, 17, 10, 4, 10, 17, 17};
    case 'Y':
        return {17, 17, 10, 4, 4, 4, 4};
    case 'Z':
        return {31, 1, 2, 4, 8, 16, 31};
    case '0':
        return {14, 17, 19, 21, 25, 17, 14};
    case '1':
        return {4, 12, 4, 4, 4, 4, 14};
    case '2':
        return {14, 17, 1, 2, 4, 8, 31};
    case '3':
        return {30, 1, 1, 14, 1, 1, 30};
    case '4':
        return {2, 6, 10, 18, 31, 2, 2};
    case '5':
        return {31, 16, 16, 30, 1, 1, 30};
    case '6':
        return {14, 16, 16, 30, 17, 17, 14};
    case '7':
        return {31, 1, 2, 4, 8, 8, 8};
    case '8':
        return {14, 17, 17, 14, 17, 17, 14};
    case '9':
        return {14, 17, 17, 15, 1, 1, 14};
    case '.':
        return {0, 0, 0, 0, 0, 12, 12};
    case ',':
        return {0, 0, 0, 0, 4, 4, 8};
    case ':':
        return {0, 12, 12, 0, 12, 12, 0};
    case '-':
        return {0, 0, 0, 31, 0, 0, 0};
    case '+':
        return {0, 4, 4, 31, 4, 4, 0};
    case '=':
        return {0, 0, 31, 0, 31, 0, 0};
    case '/':
        return {1, 2, 2, 4, 8, 8, 16};
    case '[':
        return {14, 8, 8, 8, 8, 8, 14};
    case ']':
        return {14, 2, 2, 2, 2, 2, 14};
    case '(':
        return {2, 4, 8, 8, 8, 4, 2};
    case ')':
        return {8, 4, 2, 2, 2, 4, 8};
    case '<':
        return {0, 2, 4, 8, 4, 2, 0};
    case '>':
        return {0, 8, 4, 2, 4, 8, 0};
    case '_':
        return {0, 0, 0, 0, 0, 0, 31};
    case '|':
        return {4, 4, 4, 4, 4, 4, 4};
    case '%':
        return {17, 2, 4, 8, 17, 0, 0};
    case ' ':
        return {};
    default:
        return {14, 17, 1, 2, 4, 0, 4};
    }
}

class DashboardSurface {
    public:
    static constexpr int width = 1160;
    static constexpr int height = 820;

    DashboardSurface() {
        surface_ = SDL_CreateSurface(width, height, SDL_PIXELFORMAT_RGBA32);
        if (!surface_) {
            throw std::runtime_error(SDL_GetError());
        }
    }

    ~DashboardSurface() {
        SDL_DestroySurface(surface_);
    }

    DashboardSurface(const DashboardSurface&) = delete;
    DashboardSurface& operator=(const DashboardSurface&) = delete;

    void rectangle(int x, int y, int w, int h, SDL_Color color) {
        const SDL_Rect rect{x, y, w, h};
        const Uint32 pixel = SDL_MapSurfaceRGBA(surface_, color.r, color.g, color.b, 255);
        if (!SDL_FillSurfaceRect(surface_, &rect, pixel)) {
            throw std::runtime_error(SDL_GetError());
        }
    }

    void text(int x, int y, std::string_view value, SDL_Color color, int scale = 2) {
        const int startX = x;
        for (char character : value) {
            if (character == '\n') {
                y += 9 * scale;
                x = startX;
                continue;
            }
            if (x + 5 * scale >= width - 16) {
                break;
            }
            const auto rows = glyph(character);
            for (int row = 0; row < 7; ++row) {
                for (int column = 0; column < 5; ++column) {
                    if ((rows[static_cast<std::size_t>(row)] & (1U << (4 - column))) != 0) {
                        rectangle(x + column * scale, y + row * scale, scale, scale, color);
                    }
                }
            }
            x += 6 * scale;
        }
    }

    SDL_Surface* surface() const {
        return surface_;
    }

    void present(SDL_Window* window) {
        SDL_Surface* target = SDL_GetWindowSurface(window);
        if (!target) {
            throw std::runtime_error(SDL_GetError());
        }
        const Uint32 black = SDL_MapSurfaceRGBA(target, 10, 14, 23, 255);
        SDL_FillSurfaceRect(target, nullptr, black);
        const float scale = std::min(float(target->w) / width, float(target->h) / height);
        const int w = static_cast<int>(width * scale);
        const int h = static_cast<int>(height * scale);
        const SDL_Rect destination{(target->w - w) / 2, (target->h - h) / 2, w, h};
        if (!SDL_BlitSurfaceScaled(surface_, nullptr, target, &destination, SDL_SCALEMODE_NEAREST) || !SDL_UpdateWindowSurface(window)) {
            throw std::runtime_error(SDL_GetError());
        }
    }

    private:
    SDL_Surface* surface_{};
};

} // namespace lab
