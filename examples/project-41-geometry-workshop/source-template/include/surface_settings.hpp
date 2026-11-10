#pragma once

#include <cmath>
#include <stdexcept>

// The generator selects the stage; direct builds of the template use the final one.
#ifndef LAB_CHECKPOINT
#define LAB_CHECKPOINT 9
#endif

namespace geometry {

// Each snapshot exposes only the surfaces introduced by that lesson.
enum class SurfaceKind { patch, torus, shell, mobius, knot };

inline bool supportsSurface(SurfaceKind kind) {
    if (kind == SurfaceKind::patch)
        return true;
#if LAB_CHECKPOINT >= 3
    if (kind == SurfaceKind::torus)
        return true;
#endif
#if LAB_CHECKPOINT >= 4
    if (kind == SurfaceKind::mobius)
        return true;
#endif
#if LAB_CHECKPOINT >= 5
    if (kind == SurfaceKind::shell)
        return true;
#endif
#if LAB_CHECKPOINT >= 6
    if (kind == SurfaceKind::knot)
        return true;
#endif
    return false;
}

inline SurfaceKind lessonPreset() {
#if LAB_CHECKPOINT < 3
    return SurfaceKind::patch;
#elif LAB_CHECKPOINT == 3
    return SurfaceKind::torus;
#elif LAB_CHECKPOINT == 4
    return SurfaceKind::mobius;
#elif LAB_CHECKPOINT == 5
    return SurfaceKind::shell;
#elif LAB_CHECKPOINT == 6
    return SurfaceKind::knot;
#else
    return SurfaceKind::shell;
#endif
}

inline const char* presetName(SurfaceKind kind) {
    if (kind == SurfaceKind::patch)
        return "CURVED PATCH";
    if (kind == SurfaceKind::shell)
        return "SPIRAL SHELL";
    if (kind == SurfaceKind::mobius)
        return "MOBIUS";
    if (kind == SurfaceKind::knot)
        return "TORUS KNOT";
    return "TORUS";
}

struct SurfaceSettings {
    SurfaceKind kind{SurfaceKind::torus};
    double radius{1.6};
    double thickness{0.42};
    int halfTwists{1};
    int uSegments{96};
    int vSegments{32};
    double shellTurns{2.6};
    double shellGrowth{1.8};
    int knotLobes{3};
    double sectionTurns{};
    double patchHeight{0.48};

    bool operator==(const SurfaceSettings&) const = default;
};

#if LAB_CHECKPOINT >= 9
inline constexpr int maxSegments = 256;
#elif LAB_CHECKPOINT >= 7
inline constexpr int maxSegments = 128;
#else
inline constexpr int maxSegments = 64;
#endif
inline constexpr int minSweepSegments = 64;

inline bool usesSweep(SurfaceKind kind) {
    return kind == SurfaceKind::shell || kind == SurfaceKind::knot;
}

inline double thicknessLimit(SurfaceKind kind, double radius) {
    if (kind == SurfaceKind::shell)
        return radius * 0.25;
    if (kind == SurfaceKind::knot)
        return radius * 0.18;
    return radius * 0.45;
}

inline SurfaceSettings presetSettings(SurfaceKind kind) {
    SurfaceSettings settings;
    settings.kind = kind;
    if (kind == SurfaceKind::patch) {
        settings.uSegments = 8;
        settings.vSegments = 6;
    }
#if LAB_CHECKPOINT >= 5
    if (kind == SurfaceKind::shell) {
        settings.radius = 1.8;
        settings.thickness = 0.29;
        settings.uSegments = 160;
        settings.vSegments = 40;
        settings.sectionTurns = 0.35;
    }
#endif
#if LAB_CHECKPOINT >= 4
    if (kind == SurfaceKind::mobius) {
        settings.radius = 1.65;
        settings.thickness = 0.51;
        settings.uSegments = 128;
    }
#endif
#if LAB_CHECKPOINT >= 6
    if (kind == SurfaceKind::knot) {
        settings.radius = 1.45;
        settings.thickness = 0.17;
        settings.uSegments = 192;
        settings.vSegments = 40;
    }
#endif
    if (settings.uSegments > maxSegments)
        settings.uSegments = maxSegments;
    return settings;
}

inline void validateSettings(const SurfaceSettings& settings) {
    const SurfaceKind kind = settings.kind;
    if (!supportsSurface(kind)) {
        throw std::invalid_argument("This surface is not available in this checkpoint");
    }
    if (kind == SurfaceKind::patch &&
        (!std::isfinite(settings.patchHeight) || settings.patchHeight < 0.0 || settings.patchHeight > 1.6)) {
        throw std::invalid_argument("Patch height must be in [0, 1.6]");
    }
    if (!std::isfinite(settings.radius) || settings.radius < 0.6 || settings.radius > 4.0) {
        throw std::invalid_argument("Radius must be in [0.6, 4.0]");
    }
    if (!std::isfinite(settings.thickness) || settings.thickness < 0.04 ||
        settings.thickness > thicknessLimit(kind, settings.radius)) {
        throw std::invalid_argument("Tube radius or half-width is outside the preset limits");
    }
#if LAB_CHECKPOINT >= 4
    if (kind == SurfaceKind::mobius && settings.halfTwists != 1 &&
        settings.halfTwists != 3 && settings.halfTwists != 5) {
        throw std::invalid_argument("Mobius requires 1, 3 or 5 half-turns to join the reversed edge");
    }
#endif
    int minU = 8;
    if (usesSweep(kind))
        minU = minSweepSegments;
    if (settings.uSegments < minU || settings.uSegments > maxSegments ||
        settings.vSegments < 4 || settings.vSegments > maxSegments) {
        throw std::invalid_argument("Subdivisions exceed the preset limits");
    }
#if LAB_CHECKPOINT >= 5
    if (usesSweep(kind) && (!std::isfinite(settings.sectionTurns) || std::abs(settings.sectionTurns) > 2.0)) {
        throw std::invalid_argument("Sweep section rotation must be in [-2, 2] turns");
    }
#endif
#if LAB_CHECKPOINT >= 6
    if (kind == SurfaceKind::shell) {
        if (!std::isfinite(settings.shellTurns) || settings.shellTurns < 1.25 || settings.shellTurns > 3.25 ||
            !std::isfinite(settings.shellGrowth) || settings.shellGrowth < 0.8 || settings.shellGrowth > 2.5) {
            throw std::invalid_argument("Shell turns must be in [1.25, 3.25] and growth in [0.8, 2.5]");
        }
    }
#endif
    if (kind == SurfaceKind::knot) {
        if (settings.knotLobes != 3 && settings.knotLobes != 5) {
            throw std::invalid_argument("Knot requires 3 or 5 lobes with two turns around the axis");
        }
        if (settings.sectionTurns != std::floor(settings.sectionTurns)) {
            throw std::invalid_argument("Closed knot sections require a whole number of turns");
        }
    }
}

} // namespace geometry
