#pragma once
#include "statistics.hpp"
#include <SDL3/SDL.h>
#include <optional>
#include <string>

namespace photon {
constexpr int viewWidth = 1080;
constexpr int viewHeight = 720;
inline const SDL_FRect mediumRect{70, 150, 540, 360};

inline void require(bool success) {
    if (!success) {
        throw std::runtime_error(SDL_GetError());
    }
}

inline SDL_FPoint screen(Point point) {
    return {static_cast<float>(340 + 180 * point[0]), static_cast<float>(330 - 180 * point[1])};
}

inline const char* statusName(Status status) {
    if (status == Status::Absorbed) {
        return "absorbed";
    }
    if (status == Status::Escaped) {
        return "escaped";
    }
    if (status == Status::Censored) {
        return "censored: unknown outcome";
    }
    return "not classified";
}

#if LAB_CHECKPOINT >= 1
// Vẽ hình trước khi thêm ngẫu nhiên hoặc mô hình hấp thụ.
inline void drawMedium(SDL_Renderer* renderer) {
    require(SDL_SetRenderDrawColor(renderer, 25, 42, 66, 255));
    require(SDL_RenderFillRect(renderer, &mediumRect));
    require(SDL_SetRenderDrawColor(renderer, 125, 160, 200, 255));
    require(SDL_RenderRect(renderer, &mediumRect));
    require(SDL_RenderDebugText(renderer, 70, 120, "XY medium: [-1.5,1.5] x [-1,1]"));
}

inline void drawPhoton(SDL_Renderer* renderer, Point position) {
    const auto centre = screen(position);
    const SDL_FRect marker{centre.x - 4, centre.y - 4, 8, 8};
    require(SDL_RenderFillRect(renderer, &marker));
}

inline Trace preview(Settings settings, int id) {
#if LAB_CHECKPOINT >= 4
    return tracePhoton(settings, id);
#else
    [[maybe_unused]] Photon value;
#if LAB_CHECKPOINT >= 2
    value = sampleFirst(settings, id).photon;
#else
    (void)settings;
    (void)id;
#endif
    Trace trace;
    trace.vertices.push_back({value.position, Event::Emission});
#if LAB_CHECKPOINT >= 3
    const auto flight = firstFlight(settings, id);
    if (flight.escaped) {
        trace.vertices.push_back({flight.endpoint, Event::Escape});
        trace.status = Status::Escaped;
    } else {
        trace.vertices.push_back({flight.endpoint, Event::Candidate});
    }
#endif
    return trace;
#endif
}

inline void drawTrace(SDL_Renderer* renderer, const Trace& trace, int visible, bool ghost = false) {
    int last = std::min(visible, static_cast<int>(trace.vertices.size()) - 1);
    require(SDL_SetRenderDrawColor(renderer, 70, 90, 112, 255));
    if (!ghost) {
        require(SDL_SetRenderDrawColor(renderer, 250, 200, 90, 255));
    }
    for (int i = 1; i <= last; ++i) {
        const auto a = screen(trace.vertices[i - 1].position);
        const auto b = screen(trace.vertices[i].position);
        require(SDL_RenderLine(renderer, a.x, a.y, b.x, b.y));
    }
    if (ghost) {
        return;
    }
    const Event shown = trace.vertices[last].event;
    if (shown == Event::Absorption) {
        require(SDL_SetRenderDrawColor(renderer, 255, 100, 120, 255));
    }
    if (shown == Event::Escape) {
        require(SDL_SetRenderDrawColor(renderer, 90, 220, 190, 255));
    }
    if (last == static_cast<int>(trace.vertices.size()) - 1 && trace.status == Status::Censored) {
        require(SDL_SetRenderDrawColor(renderer, 195, 145, 250, 255));
    }
    drawPhoton(renderer, trace.vertices[last].position);
    if (trace.vertices.size() == 1) {
        const auto origin = screen(trace.vertices.front().position);
        require(SDL_RenderLine(renderer, origin.x, origin.y, origin.x + 28, origin.y));
    }
}
#endif

#if LAB_CHECKPOINT >= 2
inline void drawSample(SDL_Renderer* renderer, Settings settings, int id) {
    const auto sample = sampleFirst(settings, id);
    require(SDL_SetRenderDrawColor(renderer, 115, 145, 180, 255));
    require(SDL_RenderDebugText(renderer, 70, 555, "Sampled free path: display axis 0..6 (not a trajectory)"));
    require(SDL_RenderLine(renderer, 70, 590, 610, 590));
    const float x = static_cast<float>(70 + std::min(6.0, sample.distance) * 90);
    const SDL_FRect marker{x - 2, 580, 4, 20};
    require(SDL_SetRenderDrawColor(renderer, 245, 195, 80, 255));
    require(SDL_RenderFillRect(renderer, &marker));
}
#endif

#if LAB_CHECKPOINT >= 5
inline void drawTimeline(SDL_Renderer* renderer, int vertexCount, int visible) {
    require(SDL_SetRenderDrawColor(renderer, 120, 150, 180, 255));
    require(SDL_RenderDebugText(renderer, 70, 630, "Drag timeline / arrows: inspect recorded path"));
    require(SDL_RenderLine(renderer, 70, 665, 610, 665));
    const int last = std::max(1, vertexCount - 1);
    const float x = 70 + 540 * static_cast<float>(std::min(visible, vertexCount - 1)) / last;
    const SDL_FRect marker{x - 4, 655, 8, 20};
    require(SDL_RenderFillRect(renderer, &marker));
}

inline std::optional<int> pickVertex(float x, float y, int vertexCount) {
    if (x < 70 || x > 610 || y < 645 || y > 685) {
        return std::nullopt;
    }
    return static_cast<int>(std::lround((x - 70) / 540 * (vertexCount - 1)));
}
#endif

#if LAB_CHECKPOINT >= 6
inline void drawCounts(SDL_Renderer* renderer, const Counts& counts) {
    const std::array<int, 4> values{counts.absorbed, counts.escaped, counts.censored, counts.ballistic};
    const std::array<const char*, 4> labels{"Absorbed", "Escaped (any side)", "Censored (event limit)", "Ballistic (subset of escaped)"};
    const std::array<SDL_Color, 4> colors{{{255, 100, 120, 255}, {90, 220, 190, 255}, {195, 145, 250, 255}, {245, 195, 80, 255}}};
    for (int i = 0; i < 4; ++i) {
        require(SDL_SetRenderDrawColor(renderer, 210, 220, 240, 255));
        require(SDL_RenderDebugText(renderer, 700, 150 + 85 * static_cast<float>(i), labels[i]));
        double ratio = 0;
        if (counts.completed > 0) {
            ratio = static_cast<double>(values[i]) / counts.completed;
        }
        const auto color = colors[i];
        require(SDL_SetRenderDrawColor(renderer, color.r, color.g, color.b, color.a));
        const SDL_FRect bar{700, 175 + 85 * static_cast<float>(i), static_cast<float>(300 * ratio), 20};
        require(SDL_RenderFillRect(renderer, &bar));
        const std::string count = std::to_string(values[i]) + " / " + std::to_string(counts.completed);
        require(SDL_RenderDebugText(renderer, 700, 202 + 85 * static_cast<float>(i), count.c_str()));
    }
}
#endif
} // namespace photon
