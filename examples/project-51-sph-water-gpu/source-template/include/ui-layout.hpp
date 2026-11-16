#pragma once
#include "model.hpp"
#include <string>

namespace water3 {
// Capability được chốt khi sinh snapshot; không giữ LAB_CHECKPOINT trong biểu thức runtime.
struct UiFeatures {
    bool state = false, density = false, force = false, grid = false;
    bool run = false, scale = false, reference = false;
};

inline constexpr UiFeatures uiFeatures() {
    UiFeatures value;
#if LAB_CHECKPOINT >= 2
    value.state = true;
#endif
#if LAB_CHECKPOINT >= 5
    value.density = true;
#endif
#if LAB_CHECKPOINT >= 6
    value.force = true;
#endif
#if LAB_CHECKPOINT >= 8
    value.grid = true;
#endif
#if LAB_CHECKPOINT >= 10
    value.run = true;
#endif
#if LAB_CHECKPOINT >= 11
    value.scale = true;
#endif
#if LAB_CHECKPOINT >= 12
    value.reference = true;
#endif
    return value;
}
enum class Command {
    None,
    Play,
    Step,
    Reset,
    View,
    Debug,
    Home,
    Small,
    Medium,
    Required,
    HalfMillion,
    Million,
    Confirm,
    Cancel,
    Sound,
    Viscosity,
    Grid,
    Benchmark,
    Validate
};

struct UiRect {
    float x = 0, y = 0, width = 0, height = 0;

    bool contains(float px, float py) const {
        return px >= x && py >= y && px < x + width && py < y + height;
    }
};

struct UiButton {
    UiRect rect;
    Command command = Command::None;
    std::string label;
    bool enabled = true;
    bool active = false;
};

struct PanelState {
    bool debug = false;
    bool playing = false;
    std::uint32_t armedSide = 0;
    float scroll = 0;
    std::string message = "PAUSED - SELECT A VIEW, THEN RUN";
};

struct Layout {
    UiRect scene;
    UiRect panel;
    float statsTop = 380;

    Layout(int width, int height) {
        scene = {18, 80, static_cast<float>(std::max(1, width - 346)), static_cast<float>(std::max(1, height - 126))};
        panel = {static_cast<float>(width - 310), 80, 292, static_cast<float>(height - 98)};
    }

    UiRect cell(float y, int column, int columns = 3) const {
        const float width = (panel.width - 24 - 6 * (columns - 1)) / columns;
        return {panel.x + 12 + column * (width + 6), y, width, 25};
    }
};
} // namespace water3
