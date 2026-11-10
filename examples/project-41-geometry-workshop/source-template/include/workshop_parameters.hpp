#pragma once

#include "surface_settings.hpp"

#include <algorithm>
#include <array>

namespace geometry {

// A control specifies the allowed range and step before the UI changes a setting.
enum class ParameterId { patchHeight, radius, thickness, resolution, shellTurns, growth, twist, knotLobes };

struct ParameterControl {
    ParameterId id{};
    const char* label{};
    double value{};
    double minimum{};
    double maximum{};
    double step{};
    int decimals{};

    double fraction() const {
        return (value - minimum) / (maximum - minimum);
    }
};

inline constexpr int maxShapeParameters = 6;

struct ParameterList {
    std::array<ParameterControl, maxShapeParameters> items{};
    int count{};

    void add(ParameterControl parameter) {
        items[count] = parameter;
        ++count;
    }
};

inline ParameterList shapeParameters(const SurfaceSettings& settings) {
    ParameterList controls;
    const SurfaceKind kind = settings.kind;
    if (kind == SurfaceKind::patch) {
#if LAB_CHECKPOINT >= 1
        controls.add({ParameterId::patchHeight, "PATCH HEIGHT", settings.patchHeight, 0.0, 1.6, 0.02, 2});
#endif
#if LAB_CHECKPOINT >= 2
        controls.add({ParameterId::resolution, "U / V SEGMENTS", static_cast<double>(settings.uSegments), 8, maxSegments, 1, 0});
#endif
        return controls;
    }
    const char* thicknessLabel = "TUBE RADIUS";
    if (kind == SurfaceKind::mobius)
        thicknessLabel = "HALF WIDTH";
    double minimumSegments = 8;
    if (usesSweep(kind))
        minimumSegments = minSweepSegments;
    controls.add({ParameterId::radius, "RADIUS", settings.radius, 0.6, 4.0, 0.02, 2});
    controls.add({ParameterId::thickness, thicknessLabel, settings.thickness, 0.04, thicknessLimit(kind, settings.radius), 0.005, 3});
    controls.add({ParameterId::resolution, "U / V SEGMENTS", static_cast<double>(settings.uSegments), minimumSegments, maxSegments, 1, 0});
    if (kind == SurfaceKind::shell) {
        controls.add({ParameterId::shellTurns, "SPIRAL TURNS", settings.shellTurns, 1.25, 3.25, 0.05, 2});
        controls.add({ParameterId::growth, "GROWTH", settings.shellGrowth, 0.8, 2.5, 0.05, 2});
        controls.add({ParameterId::twist, "SECTION TWIST", settings.sectionTurns, -2.0, 2.0, 0.125, 2});
    } else if (kind == SurfaceKind::mobius) {
        controls.add({ParameterId::twist, "HALF TWISTS", static_cast<double>(settings.halfTwists), 1, 5, 2, 0});
    } else if (kind == SurfaceKind::knot) {
        controls.add({ParameterId::knotLobes, "KNOT LOBES", static_cast<double>(settings.knotLobes), 3, 5, 2, 0});
        controls.add({ParameterId::twist, "SECTION TWIST", settings.sectionTurns, -2.0, 2.0, 1, 0});
    }
    return controls;
}

inline bool applyParameter(SurfaceSettings& settings, ParameterId id, double fraction) {
    if (!std::isfinite(fraction))
        return false;
    const ParameterList controls = shapeParameters(settings);
    for (int index = 0; index < controls.count; ++index) {
        const ParameterControl& control = controls.items[index];
        if (control.id != id)
            continue;
        const double position = std::clamp(fraction, 0.0, 1.0);
        const double steps = (control.maximum - control.minimum) * position / control.step;
        const double value = std::clamp(control.minimum + std::round(steps) * control.step, control.minimum, control.maximum);
        switch (id) {
        case ParameterId::patchHeight:
            settings.patchHeight = value;
            break;
        case ParameterId::radius:
            settings.radius = value;
            settings.thickness = std::min(settings.thickness, thicknessLimit(settings.kind, value));
            break;
        case ParameterId::thickness:
            settings.thickness = value;
            break;
        case ParameterId::resolution:
            settings.uSegments = static_cast<int>(value);
            settings.vSegments = settings.uSegments;
            break;
        case ParameterId::shellTurns:
            settings.shellTurns = value;
            break;
        case ParameterId::growth:
            settings.shellGrowth = value;
            break;
        case ParameterId::twist:
            if (settings.kind == SurfaceKind::mobius)
                settings.halfTwists = static_cast<int>(value);
            else
                settings.sectionTurns = value;
            break;
        case ParameterId::knotLobes:
            settings.knotLobes = static_cast<int>(value);
            break;
        }
        return true;
    }
    return false;
}

} // namespace geometry
