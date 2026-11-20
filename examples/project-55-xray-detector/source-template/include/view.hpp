#pragma once
#include "detector.hpp"
#include "radio-plate.hpp"
#include <SDL3/SDL.h>
#include <cstring>
#include <optional>
#include <string>

namespace xray {
constexpr int viewWidth = 1000;
constexpr int viewHeight = 700;
const SDL_FRect imageRect{20, 170, 480, 360};

#if LAB_CHECKPOINT >= 1
inline void benchHeading(SDL_Renderer* renderer, const std::string& reading, bool logarithmic) {
    const auto label = [&](float x, float y, const std::string& text) {
        if (!SDL_RenderDebugText(renderer, x, y, text.c_str())) throw std::runtime_error(SDL_GetError());
    };
    SDL_SetRenderDrawColor(renderer, 58, 199, 182, 255);
    label(22, 26, "FIELD INSTRUMENTS   /   TRANSMISSION LAB                                STATION 055");
    SDL_SetRenderDrawColor(renderer, 230, 239, 233, 255);
    SDL_SetRenderScale(renderer, 2, 2);
    label(11, 27, "Radio inspection bench");
    SDL_SetRenderScale(renderer, 1, 1);
    SDL_SetRenderDrawColor(renderer, 141, 177, 183, 255);
    label(20, 144, "01   DETECTOR     /     80 x 60 cells");
    label(20, 570, reading);
    if (logarithmic) label(20, 552, "DISPLAY: -log(T) / range    |    raw T is unchanged");
    else label(20, 552, "DISPLAY: transmission  T = I/I0");
    label(20, 620, "A/D rotate   P specimen   W/S attenuation");
    label(20, 641, "Click detector to inspect a single beam");
}

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

inline void drawFixtureDiagram(SDL_Renderer* renderer, [[maybe_unused]] Settings settings, Beam beam) {
    if (!SDL_SetRenderDrawColor(renderer, 100, 225, 180, 255)) throw std::runtime_error(SDL_GetError());
    line(renderer, beam.origin, at(beam, beam.maximum));
    line(renderer, {-3, 0, 6}, {3, 0, 6});
#if LAB_CHECKPOINT >= 3
    if (!SDL_SetRenderDrawColor(renderer, 229, 182, 92, 255)) throw std::runtime_error(SDL_GetError());
    for (const auto& material : makeScene(settings.preset)) {
        const std::array<Point, 4> corners{Point{material.minimum[0], 0, material.minimum[2]}, Point{material.maximum[0], 0, material.minimum[2]}, Point{material.maximum[0], 0, material.maximum[2]}, Point{material.minimum[0], 0, material.maximum[2]}};
        for (int i = 0; i < 4; ++i)
            line(renderer, rotateY(corners[i], settings.angle), rotateY(corners[(i + 1) % 4], settings.angle));
    }
#endif
}

inline void drawGeometry(SDL_Renderer* renderer, Settings settings, int x, int y) {
    const auto beam = detectorRay((x + 0.5) / imageWidth, (y + 0.5) / imageHeight);
    bool fullDiagram = true;
#if LAB_CHECKPOINT >= 4
    if (settings.preset == 3) {
        fullDiagram = false;
        const auto radio = makeScene(settings.preset);
        drawRadioPlate(renderer, radio, settings.angle, beam, {522, 118, 457, 366});
        // Plan view: compress the long source--detector baseline without flattening the 3D plate.
        const auto plot = [](Point p) {
            return SDL_FPoint{static_cast<float>(545 + (p[2] + 6) * 34), static_cast<float>(591 - p[0] * 15)};
        };
        const auto segment = [&](Point a, Point b) {
            const auto p = plot(a);
            const auto q = plot(b);
            if (!SDL_RenderLine(renderer, p.x, p.y, q.x, q.y)) throw std::runtime_error(SDL_GetError());
        };
        radioPen(renderer, 158, 188, 199);
        plateLabel(renderer, 535, 505, "SELECTED RAY / TOP VIEW XZ (NOT A SLICE)");
        radioPen(renderer, 58, 87, 107);
        segment(beam.origin, {-3, 0, 6});
        segment(beam.origin, {3, 0, 6});
        radioPen(renderer, 131, 164, 185);
        segment({-3, 0, 6}, {3, 0, 6});
        radioPen(renderer, 103, 223, 201);
        segment(beam.origin, at(beam, beam.maximum));
        radioPen(renderer, 255, 198, 122);
        const Beam local = objectBeam(beam, settings.angle);
        for (const auto& part : radio) {
            const auto hit = boxInterval(local, part.minimum, part.maximum);
            if (hit) segment(at(beam, hit->entry), at(beam, hit->exit));
        }
        radioPen(renderer, 153, 173, 187);
        plateLabel(renderer, 535, 612, "SOURCE");
        plateLabel(renderer, 892, 640, "DETECTOR");
    }
#endif
    if (fullDiagram) drawFixtureDiagram(renderer, settings, beam);
    if (!SDL_SetRenderDrawColor(renderer, 97, 235, 205, 255)) throw std::runtime_error(SDL_GetError());
    const float px = imageRect.x + static_cast<float>((x + 0.5) / imageWidth) * imageRect.w;
    const float py = imageRect.y + static_cast<float>((y + 0.5) / imageHeight) * imageRect.h;
    if (!SDL_RenderLine(renderer, px - 5, py, px + 5, py) || !SDL_RenderLine(renderer, px, py - 5, px, py + 5)) {
        throw std::runtime_error(SDL_GetError());
    }
}
#endif
} // namespace xray
