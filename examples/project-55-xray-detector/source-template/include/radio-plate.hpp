#pragma once
#include "materials.hpp"
#include <SDL3/SDL.h>

namespace xray {
#if LAB_CHECKPOINT >= 4
// An oblique reference view of the very same boxes used by Beer--Lambert integration.
// This plate is in false colour; the front and back covers are drawn as outlines.
struct RadioFace {
    std::array<SDL_FPoint, 4> corners;
    float depth;
    SDL_FColor paint;
    bool outline;
    bool crossed;
};

inline SDL_FColor partColor(Part part) {
    switch (part) {
        case Part::Case:    return {0.27F, 0.41F, 0.50F, 1};
        case Part::Cover:   return {0.47F, 0.68F, 0.76F, 1};
        case Part::Aerial:  return {0.37F, 0.48F, 0.54F, 1};
        case Part::Board:   return {0.17F, 0.72F, 0.56F, 1};
        case Part::Chip:    return {0.29F, 0.37F, 0.52F, 1};
        case Part::Cell:    return {0.96F, 0.64F, 0.31F, 1};
        case Part::Contact: return {0.99F, 0.83F, 0.51F, 1};
        case Part::Grille:  return {0.68F, 0.81F, 0.86F, 1};
        case Part::Display: return {0.22F, 0.64F, 0.75F, 1};
        default:            return {0.78F, 0.53F, 0.38F, 1};
    }
}

inline Point referenceView(Point local, double angle) {
    const Point turned = rotateY(local, angle - 0.33);
    constexpr double pitch = 0.21;
    return {turned[0], turned[1] * std::cos(pitch) + turned[2] * std::sin(pitch),
            turned[2] * std::cos(pitch) - turned[1] * std::sin(pitch)};
}

inline void radioPen(SDL_Renderer* renderer, Uint8 r, Uint8 g, Uint8 b) {
    if (!SDL_SetRenderDrawColor(renderer, r, g, b, 255))
        throw std::runtime_error(SDL_GetError());
}

inline void plateLabel(SDL_Renderer* renderer, float x, float y, const char* label) {
    if (!SDL_RenderDebugText(renderer, x, y, label))
        throw std::runtime_error(SDL_GetError());
}

inline void drawRadioPlate(SDL_Renderer* renderer, const Scene& scene, double angle, Beam beam, SDL_FRect panel) {
    radioPen(renderer, 20, 35, 48);
    if (!SDL_RenderFillRect(renderer, &panel)) throw std::runtime_error(SDL_GetError());
    radioPen(renderer, 163, 199, 210);
    plateLabel(renderer, panel.x + 12, panel.y + 12, "REFERENCE / HANDHELD RADIO");
    const float scale = std::min(panel.w * 0.54F, (panel.h - 58) / 2.14F);
    const float cx = panel.x + panel.w * 0.5F;
    const float cy = panel.y + panel.h * 0.50F + 9;
    const Beam localBeam = objectBeam(beam, angle);
    std::vector<RadioFace> faces;
    faces.reserve(scene.size() * 3);
    for (const auto& part : scene) {
        const bool crossed = boxInterval(localBeam, part.minimum, part.maximum).has_value();
        for (int axis = 0; axis < 3; ++axis) {
            for (int sign : {-1, 1}) {
                Point localNormal{};
                localNormal[axis] = sign;
                const Point normal = referenceView(localNormal, angle);
                if (normal[2] >= -0.00001) continue;

                RadioFace face{{}, 0, partColor(part.part), part.part == Part::Cover, crossed};
                const float shade = static_cast<float>(std::clamp(0.74 - 0.17 * normal[2] + 0.20 * normal[1] - 0.11 * normal[0], 0.48, 1.0));
                face.paint.r *= shade;
                face.paint.g *= shade;
                face.paint.b *= shade;
                for (int i = 0; i < 4; ++i) {
                    Point corner = part.minimum;
                    if (sign > 0) corner[axis] = part.maximum[axis];
                    const int a = (axis + 1) % 3;
                    const int b = (axis + 2) % 3;
                    if (i == 1 || i == 2) corner[a] = part.maximum[a];
                    if (i == 2 || i == 3) corner[b] = part.maximum[b];
                    const Point p = referenceView(corner, angle);
                    face.corners[i] = {cx + scale * static_cast<float>(p[0]), cy - scale * static_cast<float>(p[1])};
                    face.depth += static_cast<float>(p[2]) * 0.25F;
                }
                faces.push_back(face);
            }
        }
    }
    std::stable_sort(faces.begin(), faces.end(), [](const RadioFace& a, const RadioFace& b) { return a.depth > b.depth; });
    for (const auto& face : faces) {
        if (!face.outline) {
            std::array<SDL_Vertex, 4> vertices{};
            for (int i = 0; i < 4; ++i) {
                vertices[i].position = face.corners[i];
                vertices[i].color = face.paint;
            }
            constexpr int triangles[]{0, 1, 2, 0, 2, 3};
            if (!SDL_RenderGeometry(renderer, nullptr, vertices.data(), 4, triangles, 6)) throw std::runtime_error(SDL_GetError());
        }
        if (face.crossed) radioPen(renderer, 255, 214, 141);
        else if (face.outline) radioPen(renderer, 112, 153, 167);
        else radioPen(renderer, 41, 58, 67);
        for (int i = 0; i < 4; ++i) {
            const auto a = face.corners[i];
            const auto b = face.corners[(i + 1) % 4];
            if (!SDL_RenderLine(renderer, a.x, a.y, b.x, b.y)) throw std::runtime_error(SDL_GetError());
        }
    }
    radioPen(renderer, 180, 202, 209);
    plateLabel(renderer, panel.x + 12, panel.y + panel.h - 16, "WIRE: COVERS   AMBER: BATTERIES   GREEN: PCB");
}
#endif
} // namespace xray
