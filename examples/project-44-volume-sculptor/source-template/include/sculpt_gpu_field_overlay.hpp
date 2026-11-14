#pragma once

#include "sculpt_gpu_field_controls.hpp"

namespace sculpt {

// Supplied labels and brush footprint, shared by the field and count/scan lessons.
inline void gpuFieldSliceOverlay(Overlay& overlay, const GpuFieldDocument& document, const ModelSettings& settings, const GpuFieldLessonControls& controls, std::optional<float> value, std::uint32_t probeRevision, int width, int height) {
    const Vec3 text{0.7F, 0.84F, 0.9F}, mint{0.55F, 0.95F, 0.82F};
    const float left = static_cast<float>(width - 348);
    const auto& slice = controls.slice();
    const auto& rectangle = controls.rectangle();
    const std::array<std::string, 3> axes{"X", "Y", "Z"};
    overlay.text(24, 20, "STORED GPU FIELD / SLICE " + axes[slice.axis] + " " + std::to_string(slice.layer), mint, 2, left - 48);
    overlay.text(24, 44, "BLUE INSIDE / ORANGE OUTSIDE / MINT ZERO", text, 1.6F, left - 48);
    if (document.hasCompleteField()) {
        const auto point = sliceWorldPoint(settings.grid, slice);
        const float px = rectangle.x + slice.u * rectangle.width;
        const float py = rectangle.y + slice.v * rectangle.height;
        const float radius = controls.brush().radius * rectangle.width / settings.grid.extent;
        // The spherical brush intersects its own center slice in this circle.
        for (int segment = 0; segment < 96; ++segment) {
            const float angle = segment * 6.28318530718F / 96;
            overlay.rect({px + std::cos(angle) * radius - 1, py + std::sin(angle) * radius - 1, 2, 2}, mint);
        }
        const float below = rectangle.y + rectangle.height + 16;
        overlay.text(24, below, "WORLD " + std::to_string(point.x).substr(0, 6) + " " + std::to_string(point.y).substr(0, 6) + " " + std::to_string(point.z).substr(0, 6), text, 1.6F, left - 48);
        std::string probe = "PROBE WAITING FOR STABLE FIELD";
        if (value)
            probe = "F(P) " + std::to_string(*value) + " / REV " + std::to_string(probeRevision);
        if (!document.stable())
            probe += " / HELD";
        overlay.text(24, below + 22, probe, text, 1.6F, left - 48);
    }
    if (!controls.notice().empty())
        overlay.text(24, static_cast<float>(height - 24), controls.notice(), {1, 0.65F, 0.4F}, 1.5F, width - 48.0F);
}

} // namespace sculpt
