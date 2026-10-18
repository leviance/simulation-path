#pragma once

#ifndef LAB_CHECKPOINT
#define LAB_CHECKPOINT 6
#endif

#if LAB_CHECKPOINT >= 1
#include "brush.hpp"
#if LAB_CHECKPOINT >= 3
#include <algorithm>
#endif
#if LAB_CHECKPOINT >= 5
#include <array>
#endif

namespace lab {

// Chỉ trạng thái của nét hiện tại; những nét cũ đã trở thành pixel trong framebuffer.
struct PaintState {
    bool drawing = false;
    Point previous{};
    std::uint32_t color = rgba(83, 240, 174);
#if LAB_CHECKPOINT >= 2
    int radius = 12;
#endif
#if LAB_CHECKPOINT >= 3
    int sampleEvery = 1;
    int received = 0;
    int accepted = 0;
    int stamps = 0;
    double maximumGap = 0.0;
#endif
};

inline void cancelStroke(PaintState& state) {
    state.drawing = false;
}

inline void applyStamp(Framebuffer& framebuffer, PaintState& state, Point point) {
#if LAB_CHECKPOINT >= 2
    stampCircle(framebuffer, point, state.radius, state.color);
#else
    stampPoint(framebuffer, point, state.color);
#endif
#if LAB_CHECKPOINT >= 3
    ++state.stamps;
#endif
}

inline bool beginStroke(Framebuffer& framebuffer, PaintState& state, Point point) {
    if (state.drawing || !insideCanvas(point)) {
        return false;
    }
    state.drawing = true;
    state.previous = point;
#if LAB_CHECKPOINT >= 3
    state.received = 0;
    state.accepted = 1;
    state.stamps = 0;
    state.maximumGap = 0.0;
#endif
    applyStamp(framebuffer, state, point);
    return true;
}

#if LAB_CHECKPOINT >= 3
inline bool moveStroke(Framebuffer& framebuffer, PaintState& state, Point current, bool forceEndpoint = false) {
#else
inline bool moveStroke(Framebuffer& framebuffer, PaintState& state, Point current) {
#endif
    if (!state.drawing) {
        return false;
    }
    if (!insideCanvas(current)) {
        cancelStroke(state);
        return false;
    }
#if LAB_CHECKPOINT >= 3
    if (!forceEndpoint) {
        ++state.received;
        const int interval = std::max(1, state.sampleEvery);
        if (state.received % interval != 0) {
            return false;
        }
    }
#endif
    if (current == state.previous) {
        return false;
    }
#if LAB_CHECKPOINT >= 3
    state.maximumGap = std::max(state.maximumGap, distance(state.previous, current));
    ++state.accepted;
#endif
#if LAB_CHECKPOINT >= 4
    const double spacing = static_cast<double>(state.radius) * 0.8;
    for (Point point : sampleStroke(state.previous, current, spacing)) {
        applyStamp(framebuffer, state, point);
    }
#else
    // Bài 1–3 cố ý chỉ đặt dấu ở mẫu mới, chưa nối khoảng giữa hai mẫu.
    applyStamp(framebuffer, state, current);
#endif
    state.previous = current;
    return true;
}

inline bool endStroke(Framebuffer& framebuffer, PaintState& state, Point endpoint) {
#if LAB_CHECKPOINT >= 3
    const bool changed = moveStroke(framebuffer, state, endpoint, true);
#else
    const bool changed = moveStroke(framebuffer, state, endpoint);
#endif
    cancelStroke(state);
    return changed;
}

#if LAB_CHECKPOINT >= 3
// Cùng các điểm cho phép so checkpoint 3 và 4, không phụ thuộc tay người.
inline void drawDemo(Framebuffer& framebuffer, PaintState& state) {
    cancelStroke(state);
    framebuffer.clear(kBackground);
    beginStroke(framebuffer, state, {80.0, 270.0});
    for (int x = 280; x <= 880; x += 200) {
        moveStroke(framebuffer, state, {static_cast<double>(x), 270.0});
    }
    endStroke(framebuffer, state, {880.0, 270.0});
}
#endif

#if LAB_CHECKPOINT >= 5
constexpr std::array<std::uint32_t, 4> kPalette{
    0x53F0AEFFu, 0x3157E4FFu, 0xFFB454FFu, 0xE6EDFAFFu,
};

inline void chooseColor(PaintState& state, int index) {
    cancelStroke(state);
    if (index >= 0 && index < static_cast<int>(kPalette.size())) {
        state.color = kPalette[static_cast<std::size_t>(index)];
    }
}

inline void changeRadius(PaintState& state, int delta) {
    cancelStroke(state);
    state.radius = std::clamp(state.radius + delta, 2, 64);
}

inline void clearPainting(Framebuffer& framebuffer, PaintState& state) {
    cancelStroke(state);
    framebuffer.clear(kBackground);
    state.received = 0;
    state.accepted = 0;
    state.stamps = 0;
    state.maximumGap = 0.0;
}
#endif

} // namespace lab
#endif
