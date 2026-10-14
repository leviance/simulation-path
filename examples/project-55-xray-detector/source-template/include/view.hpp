#pragma once
#include "detector.hpp"
#include <SDL3/SDL.h>
#include <cstring>
#include <optional>

namespace xray {
constexpr int viewWidth = 1000;
constexpr int viewHeight = 700;
const SDL_FRect imageRect{20, 170, 480, 360};

#if LAB_CHECKPOINT >= 1
// Write complete rows according to SDL's actual byte pitch.
inline void upload(SDL_Texture* texture, const Image& image) {
    void* pixels = nullptr;
    int pitch = 0;
    if (!SDL_LockTexture(texture, nullptr, &pixels, &pitch)) {
        throw std::runtime_error(SDL_GetError());
    }
    if (pitch < imageWidth * 4) {
        SDL_UnlockTexture(texture);
        throw std::runtime_error("Texture pitch too small");
    }
    for (int y = 0; y < imageHeight; ++y) {
        auto* destination = static_cast<std::uint8_t*>(pixels) + y * pitch;
        const auto* source = image.rgba.data() + y * imageWidth * 4;
        std::memcpy(destination, source, imageWidth * 4);
    }
    SDL_UnlockTexture(texture);
}
#endif

#if LAB_CHECKPOINT >= 2
inline std::optional<std::array<int, 2>> pickPixel(double x, double y) {
    if (x < imageRect.x || x >= imageRect.x + imageRect.w || y < imageRect.y || y >= imageRect.y + imageRect.h) {
        return std::nullopt;
    }
    return std::array{static_cast<int>((x - imageRect.x) / imageRect.w * imageWidth), static_cast<int>((y - imageRect.y) / imageRect.h * imageHeight)};
}

inline SDL_FPoint diagram(Point p) {
    return {static_cast<float>(550 + (p[2] + 6) / 12 * 400), static_cast<float>(350 - p[0] * 65)};
}

inline void line(SDL_Renderer* renderer, Point a, Point b) {
    const auto p = diagram(a);
    const auto q = diagram(b);
    if (!SDL_RenderLine(renderer, p.x, p.y, q.x, q.y)) {
        throw std::runtime_error(SDL_GetError());
    }
}

inline void drawGeometry(SDL_Renderer* renderer, Settings settings, int x, int y) {
    const auto beam = detectorRay((x + 0.5) / imageWidth, (y + 0.5) / imageHeight);
    if (!SDL_SetRenderDrawColor(renderer, 100, 225, 180, 255)) {
        throw std::runtime_error(SDL_GetError());
    }
    line(renderer, {0, 0, -6}, at(beam, beam.maximum));
    line(renderer, {-3, 0, 6}, {3, 0, 6});
#if LAB_CHECKPOINT >= 3
    if (!SDL_SetRenderDrawColor(renderer, 229, 182, 92, 255)) {
        throw std::runtime_error(SDL_GetError());
    }
    for (const auto& m : makeScene(settings.preset)) {
        const std::array<Point, 4> corners{Point{m.minimum[0], 0, m.minimum[2]}, Point{m.maximum[0], 0, m.minimum[2]}, Point{m.maximum[0], 0, m.maximum[2]}, Point{m.minimum[0], 0, m.maximum[2]}};
        for (int i = 0; i < 4; ++i) {
            line(renderer, rotateY(corners[i], settings.angle), rotateY(corners[(i + 1) % 4], settings.angle));
        }
    }
#else
    (void)settings;
#endif
    const float px = imageRect.x + static_cast<float>((x + 0.5) / imageWidth) * imageRect.w;
    const float py = imageRect.y + static_cast<float>((y + 0.5) / imageHeight) * imageRect.h;
    if (!SDL_RenderLine(renderer, px - 5, py, px + 5, py) || !SDL_RenderLine(renderer, px, py - 5, px, py + 5)) {
        throw std::runtime_error(SDL_GetError());
    }
}
#endif
} // namespace xray
