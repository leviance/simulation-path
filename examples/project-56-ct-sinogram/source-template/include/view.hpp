#pragma once
#include "scan.hpp"
#include <SDL3/SDL.h>
#include <cstdint>
#include <optional>
#include <string>

namespace ct {
constexpr int viewWidth = 1224;
constexpr int viewHeight = 714;
inline const SDL_FRect sinogramRect{443, 166, 338, 338};

inline void require(bool success) {
    if (!success) {
        throw std::runtime_error(SDL_GetError());
    }
}

inline SDL_FPoint screen(Point point) {
    return {static_cast<float>(210 + 12 * point[0]), static_cast<float>(568 - 12 * point[1])};
}

#if LAB_CHECKPOINT >= 1
// Fill horizontal spans so beginners can see the phantom before ray mathematics.
// [snippet scanner-disk]
inline void drawDisk(SDL_Renderer* renderer, const Disk& disk) {
    const auto centre = screen(disk.centre);
    const float radius = static_cast<float>(12 * disk.radius);
    for (int y = -static_cast<int>(radius); y <= static_cast<int>(radius); ++y) {
        const float halfWidth = std::sqrt(std::max(0.0f, radius * radius - y * static_cast<float>(y)));
        const SDL_FRect span{centre.x - halfWidth, centre.y + y, 2 * halfWidth, 1};
        require(SDL_RenderFillRect(renderer, &span));
    }
}
// [/snippet scanner-disk]

inline void drawScene(SDL_Renderer* renderer, const Scene& scene) {
    for (const auto& disk : scene) {
        const auto gray = static_cast<Uint8>(70 + 80 * disk.mu);
        require(SDL_SetRenderDrawColor(renderer, gray, gray, 210, 255));
        drawDisk(renderer, disk);
    }
}
#endif

#if LAB_CHECKPOINT >= 2
inline void line(SDL_Renderer* renderer, Point a, Point b) {
    const auto p = screen(a);
    const auto q = screen(b);
    require(SDL_RenderLine(renderer, p.x, p.y, q.x, q.y));
}

inline void drawScanner(SDL_Renderer* renderer, double angle, int column) {
    require(SDL_SetRenderDrawColor(renderer, 80, 105, 140, 255));
    const auto first = detectorRay(angle, 0);
    const auto last = detectorRay(angle, 1);
    line(renderer, first.origin, at(first, first.maximum));
    line(renderer, last.origin, at(last, last.maximum));
    require(SDL_SetRenderDrawColor(renderer, 90, 220, 210, 255));
    line(renderer, at(first, first.maximum), at(last, last.maximum));
    require(SDL_SetRenderDrawColor(renderer, 255, 195, 80, 255));
    const auto selected = detectorRay(angle, (column + 0.5) / detectorCount);
    line(renderer, selected.origin, at(selected, selected.maximum));
    drawDisk(renderer, {selected.origin, 0.08, 0});
}
#endif

#if LAB_CHECKPOINT >= 4
inline void drawProjection(SDL_Renderer* renderer, const Projection& row) {
    for (int column = 0; column < detectorCount; ++column) {
        const auto gray = static_cast<Uint8>(std::lround(255 * row[column].ratio));
        require(SDL_SetRenderDrawColor(renderer, gray, gray, gray, 255));
        const SDL_FRect cell{443 + column * (338.0f / detectorCount), 560, 338.0f / detectorCount, 19};
        require(SDL_RenderFillRect(renderer, &cell));
    }
}
#endif

#if LAB_CHECKPOINT >= 5
inline void upload(SDL_Texture* texture, const Scan& scan, double displayRange, bool invert) {
    void* pixels = nullptr;
    int pitch = 0;
    require(SDL_LockTexture(texture, nullptr, &pixels, &pitch));
    if (pitch < detectorCount * 4) {
        SDL_UnlockTexture(texture);
        throw std::runtime_error("Texture pitch too small");
    }
    for (int row = 0; row < scan.settings.views; ++row) {
        auto* destination = static_cast<std::uint8_t*>(pixels) + row * pitch;
        for (int column = 0; column < detectorCount; ++column) {
            const double value = scan.values[column + detectorCount * row];
            const int offset = 4 * column;
            destination[offset] = 28;
            destination[offset + 1] = 42;
            destination[offset + 2] = 65;
            if (std::isfinite(value)) {
                double brightness = std::clamp(value / displayRange, 0.0, 1.0);
                if (invert) {
                    brightness = 1 - brightness;
                }
                const auto gray = static_cast<std::uint8_t>(std::lround(255 * brightness));
                destination[offset] = gray;
                destination[offset + 1] = gray;
                destination[offset + 2] = gray;
            }
            destination[offset + 3] = 255;
        }
    }
    SDL_UnlockTexture(texture);
}

inline std::optional<std::array<int, 2>> pickCell(float x, float y, int views) {
    if (x < sinogramRect.x || y < sinogramRect.y || x >= sinogramRect.x + sinogramRect.w || y >= sinogramRect.y + sinogramRect.h) {
        return std::nullopt;
    }
    const int column = static_cast<int>((x - sinogramRect.x) / sinogramRect.w * detectorCount);
    const int row = static_cast<int>((y - sinogramRect.y) / sinogramRect.h * views);
    return std::array<int, 2>{column, row};
}
#endif

#if LAB_CHECKPOINT >= 8
// Chỉ thay tài nguyên cũ sau khi tạo và cấu hình texture mới thành công.
// [snippet resize-scan]
inline void resizeSinogramTexture(SDL_Renderer* renderer, SDL_Texture*& texture, int& textureViews, int views) {
    if (!supportedViews(views)) {
        throw std::invalid_argument("Unsupported view count");
    }
    if (textureViews == views) {
        return;
    }

    SDL_Texture* replacement = SDL_CreateTexture(renderer, SDL_PIXELFORMAT_RGBA32, SDL_TEXTUREACCESS_STREAMING, detectorCount, views);
    if (replacement == nullptr) {
        throw std::runtime_error(SDL_GetError());
    }
    if (!SDL_SetTextureScaleMode(replacement, SDL_SCALEMODE_NEAREST)) {
        const std::string error = SDL_GetError();
        SDL_DestroyTexture(replacement);
        throw std::runtime_error(error);
    }

    SDL_DestroyTexture(texture);
    texture = replacement;
    textureViews = views;
}
// [/snippet resize-scan]
#endif

#if LAB_CHECKPOINT >= 7
inline void drawTrace(SDL_Renderer* renderer, int views, Point point) {
    require(SDL_SetRenderDrawColor(renderer, 255, 110, 140, 255));
    for (int row = 0; row < views; ++row) {
        const double s = pointOffset(viewAngle(row, views), point);
        const SDL_FRect marker{static_cast<float>(sinogramRect.x + (s / detectorWidth + 0.5) * sinogramRect.w), static_cast<float>(sinogramRect.y + (row + 0.5) / views * sinogramRect.h), 2, 2};
        require(SDL_RenderFillRect(renderer, &marker));
    }
}
#endif
} // namespace ct
