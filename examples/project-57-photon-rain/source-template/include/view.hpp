#pragma once
#include "chamber-readout.hpp"
#include "chamber.hpp"
#include "statistics.hpp"
#include <optional>
#include <string>

namespace photon {
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
// The apparatus is visible before the learner adds the first random flight.
// [snippet set-up-tank]
inline void drawMedium(SDL_Renderer* r, Settings settings = {}) {
    panel(r, 0, 0, viewWidth, viewHeight, {10, 20, 29, 255});
    panel(r, 26, 26, 4, 52, teal);
    label(r, 43, 27, "SIMULATION PATH  /  OPTICS   57", teal);
    label(r, 41, 46, "Photon tank", paper, 2.6f);
    label(r, 703, 39, "MONTE CARLO    /    XY SECTION", muted);
    line(r, 27, 88, 1052, 88, divider);
    panel(r, 27, 102, 625, 438, {14, 29, 40, 255});
    label(r, 47, 110, "01  SOURCE", gold);
    label(r, 242, 110, "02  HOMOGENEOUS WATER", muted);
    label(r, 528, 110, "03  SCREEN", teal);
    paintChamber(r, settings);
    panel(r, 672, 102, 380, 438, {17, 32, 43, 255});
    label(r, 693, 120, "RIGHT-WALL SENSOR", teal);
#if LAB_CHECKPOINT < 6
    label(r, 693, 151, "Collecting a distribution starts in lesson 6.", muted);
    label(r, 693, 178, "For now: inspect the selected path.", paper);
#endif
    panel(r, 27, 548, 625, 67, {17, 32, 43, 255});
    panel(r, 27, 619, 625, 72, {17, 32, 43, 255});
    panel(r, 672, 548, 380, 143, {17, 32, 43, 255});
    label(r, 693, 563, "HOW TO READ THE TANK", muted);
    stroke(r, {696, 595}, {720, 595}, 2.5f, gold);
    label(r, 735, 590, "Selected photon / its recorded steps", paper);
    stroke(r, {696, 621}, {720, 621}, 1, {85, 133, 145, 255});
    label(r, 735, 616, "Faint paths: recent histories only", paper);
    label(r, 694, 646, "Glass depth is illustrative.", muted);
    label(r, 694, 665, "Transport takes place on the XY plane.", muted);
}
// [/snippet set-up-tank]

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
    if (trace.vertices.empty())
        return;
    const int last = std::clamp(visible, 0, static_cast<int>(trace.vertices.size()) - 1);
    for (int i = 1; i <= last; ++i) {
        const auto a = screen(trace.vertices[i - 1].position);
        const auto b = screen(trace.vertices[i].position);
        if (ghost)
            line(renderer, a.x, a.y, b.x, b.y, {74, 125, 133, 255});
        else {
            stroke(renderer, a, b, 4.5f, {144, 115, 65, 255});
            stroke(renderer, a, b, 1.8f, gold);
            if (trace.vertices[i].event == Event::Scatter)
                panel(renderer, b.x - 2, b.y - 2, 4, 4, {238, 246, 193, 255});
        }
    }
    if (ghost) {
        return;
    }
    // [snippet selected-photon]
    const auto point = screen(trace.vertices[last].position);
    const float x = point.x, y = point.y;
    const Event shown = trace.vertices[last].event;
    // [/snippet selected-photon]
    SDL_Color color = gold;
    if (shown == Event::Absorption) {
        color = coral;
        line(renderer, x - 5, y - 5, x + 5, y + 5, color);
        line(renderer, x - 5, y + 5, x + 5, y - 5, color);
    }
    if (shown == Event::Escape) {
        color = teal;
    }
    if (last == static_cast<int>(trace.vertices.size()) - 1 && trace.status == Status::Censored) {
        color = lilac;
    }
    line(renderer, x, y - 5, x + 5, y, color);
    line(renderer, x + 5, y, x, y + 5, color);
    line(renderer, x, y + 5, x - 5, y, color);
    line(renderer, x - 5, y, x, y - 5, color);
    panel(renderer, x - 1, y - 1, 3, 3, paper);
}
#endif

#if LAB_CHECKPOINT >= 2
inline void drawSample(SDL_Renderer* renderer, Settings settings, int id) {
    const auto sample = sampleFirst(settings, id);
    label(renderer, 70, 558, "DRAWN FREE PATH   /   0 ... 6 units (>=6 clips here)", muted);
    line(renderer, 70, 590, 610, 590, divider);
    const float x = static_cast<float>(70 + std::min(6.0, sample.distance) * 90);
    const SDL_FRect marker{x - 2, 580, 4, 20};
    require(SDL_SetRenderDrawColor(renderer, 245, 195, 80, 255));
    require(SDL_RenderFillRect(renderer, &marker));
}
#endif

#if LAB_CHECKPOINT >= 5
inline void drawTimeline(SDL_Renderer* renderer, int vertexCount, int visible) {
    label(renderer, 70, 631, "RECORDED EVENTS   /   drag or use arrow keys", muted);
    line(renderer, 70, 665, 610, 665, divider);
    const int last = std::max(1, vertexCount - 1);
    const float x = 70 + 540 * static_cast<float>(std::min(visible, vertexCount - 1)) / last;
    const SDL_FRect marker{x - 4, 655, 8, 20};
    ink(renderer, gold);
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
    instrumentReadout(renderer, counts);
    const std::array<int, 4> values{counts.absorbed, counts.escaped, counts.censored, counts.ballistic};
    const std::array<const char*, 4> labels{"Absorbed", "Escaped (any side)", "Censored", "Ballistic: part of escaped"};
    const std::array<SDL_Color, 4> colors{coral, teal, lilac, gold};
    for (int i = 0; i < 4; ++i) {
        const float y = 405.f + 30 * i;
        label(renderer, 693, y, labels[i], paper);
        double ratio = 0;
        if (counts.completed > 0) {
            ratio = static_cast<double>(values[i]) / counts.completed;
        }
        label(renderer, 935, y, std::to_string(values[i]) + "/" + std::to_string(counts.completed), colors[i]);
        panel(renderer, 693, y + 13, 332, 3, divider);
        if (values[i] > 0)
            panel(renderer, 693, y + 13, static_cast<float>(332 * ratio), 3, colors[i]);
    }
}
#endif
} // namespace photon
