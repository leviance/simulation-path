#pragma once
#include "backprojection.hpp"
#include "view.hpp"
#include <iomanip>
#include <sstream>

namespace ct {
#if LAB_CHECKPOINT >= 1
inline const SDL_FRect referenceRect{43, 166, 338, 338};
inline const SDL_FRect reconstructionRect{843, 166, 338, 338};

inline void pigment(SDL_Renderer* renderer, Uint8 r, Uint8 g, Uint8 b) {
    require(SDL_SetRenderDrawColor(renderer, r, g, b, 255));
}

inline void caption(SDL_Renderer* renderer, float x, float y, const std::string& text) {
    require(SDL_RenderDebugText(renderer, x, y, text.c_str()));
}

inline void stationFrame(SDL_Renderer* renderer) {
    pigment(renderer, 20, 36, 42);
    for (float x : {23.0f, 423.0f, 823.0f}) {
        const SDL_FRect panel{x, 109, 378, 525};
        require(SDL_RenderFillRect(renderer, &panel));
    }
    pigment(renderer, 237, 207, 144);
    caption(renderer, 44, 28, "FIELD STATION    /    XY TOMOGRAPHY                                        SPECIMEN SERIES    /    056");
    pigment(renderer, 226, 239, 230);
    require(SDL_SetRenderScale(renderer, 2, 2));
    caption(renderer, 22, 25, "Timber archive  /  inside the end grain");
    require(SDL_SetRenderScale(renderer, 1, 1));
    caption(renderer, 43, 133, "01   REFERENCE       /       material density");
    caption(renderer, 443, 133, "02   RAW SCAN          /       angle x column");
    caption(renderer, 843, 133, "03   RECONSTRUCTION     /       unfiltered");
    pigment(renderer, 169, 196, 188);
    caption(renderer, 43, 610, "fan source  /  selected ray  /  detector");
    caption(renderer, 443, 538, "TRANSMISSION     I/I0     current view");
#if LAB_CHECKPOINT >= 10
    caption(renderer, 843, 538, "Every measured row adds a fan of rays.");
    caption(renderer, 843, 558, "Soft edges are data, not texture filtering.");
    caption(renderer, 43, 660, "SPACE scan / pause    N one view    Q 30/60/120/180    P specimen    H hide reference    R new scan");
#endif
}

// Cùng một điểm trong hai ô ảnh phải ứng với cùng tọa độ trên mặt cắt.
constexpr int sampleSide = 224;
inline SDL_Texture* fieldTexture(SDL_Renderer* renderer, int side) {
    auto* texture = SDL_CreateTexture(renderer, SDL_PIXELFORMAT_RGBA32, SDL_TEXTUREACCESS_STREAMING, side, side);
    if (!texture) throw std::runtime_error(SDL_GetError());
    if (!SDL_SetTextureScaleMode(texture, SDL_SCALEMODE_LINEAR)) {
        SDL_DestroyTexture(texture);
        throw std::runtime_error(SDL_GetError());
    }
    return texture;
}

inline void paintSpecimen(SDL_Texture* texture, const Scene& scene, double strength) {
    std::vector<Uint8> pixels(sampleSide * sampleSide * 4);
    for (int y = 0; y < sampleSide; ++y) {
        for (int x = 0; x < sampleSide; ++x) {
            const Point p{3.10 * (x + 0.5) / sampleSide - 1.55, 1.55 - 3.10 * (y + 0.5) / sampleSide};
            const double mu = strength * densityAt(scene, p);
            const double value = std::clamp(std::sqrt(mu / 1.65), 0.0, 1.0);
            const size_t i = 4 * (x + sampleSide * y);
            pixels[i] = static_cast<Uint8>(13 + 233 * value);
            pixels[i + 1] = static_cast<Uint8>(25 + 163 * value);
            pixels[i + 2] = static_cast<Uint8>(29 + 78 * value);
            pixels[i + 3] = 255;
        }
    }
    require(SDL_UpdateTexture(texture, nullptr, pixels.data(), sampleSide * 4));
}
#endif

#if LAB_CHECKPOINT >= 10
inline void paintEstimate(SDL_Texture* texture, const Reconstruction& image) {
    // Thang màu cố định: khi thêm góc, ảnh không tự co giãn theo cực đại khung hình.
    std::vector<Uint8> pixels(sliceSide * sliceSide * 4);
    for (int i = 0; i < sliceSide * sliceSide; ++i) {
        const double value = std::clamp(averageAt(image, i) / 1.4, 0.0, 1.0);
        pixels[i * 4] = static_cast<Uint8>(12 + 230 * value * value);
        pixels[i * 4 + 1] = static_cast<Uint8>(23 + 200 * value);
        pixels[i * 4 + 2] = static_cast<Uint8>(34 + 155 * value);
        pixels[i * 4 + 3] = 255;
    }
    require(SDL_UpdateTexture(texture, nullptr, pixels.data(), sliceSide * 4));
}
#endif
} // namespace ct
