#pragma once
#include "colony.hpp"
#include <SDL3/SDL.h>
#include <array>
#include <cstdio>

namespace bench {
inline constexpr float mapX = 24, mapY = 88, mapW = 608, mapH = 380;

inline SDL_FPoint screen(lab::Vec2 p) {
    return {mapX + float(p.x) * mapW / 960, mapY + float(p.y) * mapH / 600};
}

inline lab::Vec2 world(float x, float y) {
    return {(x - mapX) * 960 / mapW, (y - mapY) * 600 / mapH};
}

inline void ink(SDL_Renderer* r, SDL_Color c) {
    SDL_SetRenderDrawColor(r, c.r, c.g, c.b, c.a);
}

inline void box(SDL_Renderer* r, SDL_FRect b, SDL_Color color) {
    ink(r, color);
    SDL_RenderFillRect(r, &b);
}

inline void text(SDL_Renderer* r, float x, float y, const char* message, SDL_Color c) {
    ink(r, c);
    SDL_RenderDebugText(r, x, y, message);
}

inline void circle(SDL_Renderer* r, SDL_FPoint p, float radius) {
    std::array<SDL_FPoint, 97> points{};
    for (int i = 0; i <= 96; ++i) {
        const double a = 6.283185307 * i / 96;
        points[i] = {p.x + radius * float(std::cos(a)), p.y + radius * float(std::sin(a))};
    }
    SDL_RenderLines(r, points.data(), int(points.size()));
}

inline SDL_FColor color(float red, float green, float blue) {
    return {red / 255, green / 255, blue / 255, 1};
}

// Hai mảng màu tạo thành cánh; hướng mỏ lấy từ vận tốc thật của cá thể.
inline void birdMesh(std::vector<SDL_Vertex>& vertices, SDL_FPoint p, lab::Vec2 velocity,
                     float size, SDL_FColor nearWing, SDL_FColor farWing) {
    const double speed = lab::length(velocity);
    float dx = 1, dy = 0;
    if (speed > 1e-9) {
        dx = float(velocity.x / speed);
        dy = float(velocity.y / speed);
    }
    const auto vertex = [&](float along, float across, SDL_FColor shade) {
        return SDL_Vertex{{p.x + size * (along * dx - across * dy),
                           p.y + size * (along * dy + across * dx)}, shade, {}};
    };
    for (int side : {-1, 1}) {
        SDL_FColor shade = nearWing;
        if (side == 1) shade = farWing;
        vertices.push_back(vertex(1.25f, 0, shade));
        vertices.push_back(vertex(-0.95f, side * 0.92f, shade));
        vertices.push_back(vertex(-0.24f, 0, shade));
    }
}

inline void drawColony(SDL_Renderer* r, const Colony& colony, bool overlay, std::uint64_t ticks) {
    const SDL_Rect clip{int(mapX), int(mapY), int(mapW), int(mapH)};
    SDL_SetRenderClipRect(r, &clip);
    // Nền tọa độ nhạt giúp thấy chuyển động; nó không tác động lên đàn.
    for (int row = 0; row < int(mapH); ++row) {
        const float t = row / mapH;
        ink(r, {Uint8(217 - 40*t), Uint8(237 - 13*t), Uint8(230 + 2*t), 255});
        SDL_RenderLine(r, mapX, mapY + row, mapX + mapW, mapY + row);
    }
    ink(r, {150, 188, 181, 255});
    for (int y = 6; y < int(mapH); y += 24)
        for (int x = 8; x < int(mapW); x += 24)
            SDL_RenderPoint(r, mapX + x, mapY + y);

    const auto& chosen = colony.birds[colony.selected];
    const auto eye = screen(chosen.position);
    std::vector<bool> neighbor(colony.birds.size(), false);
    std::size_t count = 0;
    if (overlay) {
        const auto found = colony.observe();
        count = found.neighbors.size();
        // Lặp đường tròn qua biên như chính miền tuần hoàn của query.
        ink(r, {78, 146, 140, 255});
        for (int oy : {-1, 0, 1})
            for (int ox : {-1, 0, 1})
                circle(r, {eye.x + ox*mapW, eye.y + oy*mapH}, float(colony.params.radius) * mapW / 960);
        ink(r, {104, 160, 151, 255});
        for (const auto i : found.neighbors) {
            neighbor[i] = true;
            const auto offset = lab::displacement(chosen.position, colony.birds[i].position, colony.params);
            const auto end = screen(lab::add(chosen.position, offset));
            for (int oy : {-1, 0, 1})
                for (int ox : {-1, 0, 1})
                    SDL_RenderLine(r, eye.x + ox*mapW, eye.y + oy*mapH, end.x + ox*mapW, end.y + oy*mapH);
        }
    }
    std::vector<SDL_Vertex> mesh;
    mesh.reserve(colony.birds.size() * 6);
    for (std::size_t i = 0; i < colony.birds.size(); ++i) {
        const auto& bird = colony.birds[i];
        auto left = color(74, 116, 122), right = color(32, 67, 78);
        float size = 3.8f;
        if (neighbor[i]) {
            left = color(13, 158, 132); right = color(0, 99, 93); size = 4.9f;
        }
        if (i == colony.selected && overlay) {
            left = color(255, 178, 74); right = color(174, 80, 26); size = 6.3f;
        }
        birdMesh(mesh, screen(bird.position), bird.velocity, size, left, right);
    }
    SDL_RenderGeometry(r, nullptr, mesh.data(), int(mesh.size()), nullptr, 0);
    SDL_SetRenderClipRect(r, nullptr);
    char label[120]{};
    if (overlay)
        std::snprintf(label, sizeof(label), "BIRD %03u   /   %zu NEIGHBORS   /   TICK %llu", chosen.id, count,
                      static_cast<unsigned long long>(ticks));
    else
        std::snprintf(label, sizeof(label), "%zu BIRDS   /   OBSERVATION OFF", colony.birds.size());
    text(r, mapX, mapY + mapH + 15, label, {173, 205, 201, 255});
}
} // namespace bench
