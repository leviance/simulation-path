#pragma once
#include "overlay.hpp"
#include "state.hpp"

namespace volume54 {
struct ComparisonPanel {
    Rect image;
    Mode mode;
    const char* title;
    const char* question;
};

inline std::array<ComparisonPanel, 3> comparisonPanels(int width, int height) {
    const float gap = 12;
    const float panelWidth = (width - 48.0F - 2 * gap) / 3;
    const float y = static_cast<float>(height - 170);
    return {{{{24, y, panelWidth, 122}, Mode::Mip, "MIP / DENSEST", "WHERE IS THE DENSEST PART?"},
        {{24 + panelWidth + gap, y, panelWidth, 122}, Mode::Average, "AVERAGE / WHOLE PATH", "HOW DENSE IS THE PATH?"},
        {{24 + 2 * (panelWidth + gap), y, panelWidth, 122}, Mode::Alpha, "ALPHA / LAYERS", "WHAT DO FRONT LAYERS HIDE?"}}};
}

// Three real GPU integrations of the same volume/camera. One reusable target, no readback.
class Comparison {
    GlApi& gl_;
#if LAB_CHECKPOINT >= 5
    std::unique_ptr<Renderer> renderer_;
    const Volume* loaded_ = nullptr;
#endif

    public:
    explicit Comparison(GlApi& gl)
        : gl_(gl) {}

    void draw(const State& state, int viewWidth, int height, int windowWidth, int pixelWidth, int pixelHeight) {
#if LAB_CHECKPOINT >= 5
        if (state.showcase || state.inspect)
            return;
        if (!renderer_) {
            renderer_ = std::make_unique<Renderer>(gl_);
            renderer_->open();
        }
        if (loaded_ != state.volume.get()) {
            renderer_->upload(*state.volume);
            loaded_ = state.volume.get();
        }
        const double scaleX = static_cast<double>(pixelWidth) / windowWidth;
        const double scaleY = static_cast<double>(pixelHeight) / height;
        for (const ComparisonPanel& panel : comparisonPanels(viewWidth, height)) {
#if LAB_CHECKPOINT < 6
            if (panel.mode == Mode::Alpha)
                continue;
#endif
            const int w = std::max(1, static_cast<int>(panel.image.width * scaleX));
            const int h = std::max(1, static_cast<int>(panel.image.height * scaleY));
            const int x = static_cast<int>(panel.image.x * scaleX);
            const int y = static_cast<int>((height - panel.image.y - panel.image.height) * scaleY);
            Settings settings = state.settings;
            settings.mode = panel.mode;
            renderer_->resize(w, h);
            renderer_->render(state.camera, settings);
            renderer_->display(state.camera, settings, w, h, x, y);
        }
#else
        (void)state;
        (void)viewWidth;
        (void)height;
        (void)windowWidth;
        (void)pixelWidth;
        (void)pixelHeight;
#endif
    }
};

inline void drawComparisonFrames(Overlay& ui, int width, int height, bool measuring) {
#if LAB_CHECKPOINT >= 5
    ui.text(24, static_cast<float>(height - 204), "SAME DATA + CAMERA / THREE DIFFERENT QUESTIONS", teal, 1.4F);
    for (const ComparisonPanel& panel : comparisonPanels(width, height)) {
        ui.text(panel.image.x, panel.image.y - 18, panel.title, ink, 1.4F);
        ui.line(panel.image.x, panel.image.y + panel.image.height, panel.image.x + panel.image.width, panel.image.y + panel.image.height, muted);
        ui.text(panel.image.x, panel.image.y + panel.image.height + 10, panel.question, muted, 1.1F);
        if (measuring)
            ui.text(panel.image.x + 12, panel.image.y + 40, "PAUSED DURING BENCHMARK", muted, 1.1F);
    }
#else
    (void)ui;
    (void)width;
    (void)height;
    (void)measuring;
#endif
}
} // namespace volume54
