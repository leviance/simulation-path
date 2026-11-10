#pragma once

#include "surface_settings.hpp"

#if LAB_CHECKPOINT >= 5
#include "parametric_surfaces.hpp"

#include <algorithm>
#include <vector>

namespace geometry {

struct CurveSample {
    Vec3 position;
    Vec3 derivative;
    double sectionRadius{};
};

// s runs from the narrow tip to the open lip. The tube widens with the centerline radius.
inline CurveSample sampleShellCurve(double s, const SurfaceSettings& settings) {
    const double angleRate = fullTurn * settings.shellTurns;
    const double angle = angleRate * s;
    const double radialScale = std::exp(settings.shellGrowth * (s - 1.0));
    const double radius = settings.radius * radialScale;
    const double radiusRate = settings.shellGrowth * radius;
    const double height = 0.72 * settings.radius;
    const double cosine = std::cos(angle);
    const double sine = std::sin(angle);

    return {
        {radius * cosine, height * (1.0 - s), radius * sine},
        {radiusRate * cosine - radius * angleRate * sine, -height, radiusRate * sine + radius * angleRate * cosine},
        settings.thickness * radialScale,
    };
}

#if LAB_CHECKPOINT >= 6
// (2, q) is one closed centerline when q is odd, not two overlaid loops.
inline CurveSample sampleKnotCurve(double s, const SurfaceSettings& settings) {
    const double t = fullTurn * s;
    const double majorAngle = 2.0 * t;
    const double minorAngle = settings.knotLobes * t;
    const double minorRadius = 0.37 * settings.radius;
    const double radial = settings.radius + minorRadius * std::cos(minorAngle);
    const double radialRate = -settings.knotLobes * minorRadius * std::sin(minorAngle);
    const double cosine = std::cos(majorAngle);
    const double sine = std::sin(majorAngle);
    const Vec3 derivativeT = {
        radialRate * cosine - 2.0 * radial * sine,
        settings.knotLobes * minorRadius * std::cos(minorAngle),
        radialRate * sine + 2.0 * radial * cosine,
    };

    return {
        {radial * cosine, minorRadius * std::sin(minorAngle), radial * sine},
        derivativeT * fullTurn,
        settings.thickness,
    };
}
#endif

struct SweepFrame {
    Vec3 center;
    Vec3 tangent;
    Vec3 normal;
    Vec3 binormal;
    double sectionRadius{};
    double lengthFromStart{};
};

inline Vec3 rotateAboutAxis(Vec3 vector, Vec3 axis, double angle) {
    const double cosine = std::cos(angle);
    const double sine = std::sin(angle);
    return vector * cosine + cross(axis, vector) * sine + axis * (dot(axis, vector) * (1.0 - cosine));
}

inline Vec3 projectOntoSection(Vec3 direction, Vec3 tangent) {
    return unit(direction - tangent * dot(direction, tangent));
}

inline Vec3 transportNormal(Vec3 previousNormal, Vec3 previousTangent, Vec3 tangent) {
    const Vec3 axis = cross(previousTangent, tangent);
    const double sine = length(axis);
    const double cosine = std::clamp(dot(previousTangent, tangent), -1.0, 1.0);
    if (cosine < -0.9999) {
        throw std::domain_error("Successive sweep tangents are opposed; increase u subdivisions");
    }
    if (sine <= 1e-10)
        return projectOntoSection(previousNormal, tangent);

    // Rotate by only the angle needed to align the two tangents. Do not rebuild a frame from world up.
    const Vec3 normal = rotateAboutAxis(previousNormal, axis * (1.0 / sine), std::atan2(sine, cosine));
    return projectOntoSection(normal, tangent);
}

#if LAB_CHECKPOINT >= 6
inline double signedSectionAngle(Vec3 from, Vec3 to, Vec3 tangent) {
    return std::atan2(dot(tangent, cross(from, to)), dot(from, to));
}
#endif

inline std::vector<SweepFrame> buildSweepFrames(const SurfaceSettings& settings) {
    validateSettings(settings);
    if (!usesSweep(settings.kind))
        throw std::invalid_argument("Expected a sweep preset");
#if LAB_CHECKPOINT >= 6
    const bool closed = settings.kind == SurfaceKind::knot;
#endif
    std::vector<SweepFrame> frames;
    frames.reserve(static_cast<std::size_t>(settings.uSegments) + 1);

    for (int row = 0; row <= settings.uSegments; ++row) {
        const double s = static_cast<double>(row) / settings.uSegments;
        CurveSample curve;
#if LAB_CHECKPOINT >= 6
        if (closed) {
            curve = sampleKnotCurve(s, settings);
            if (row == settings.uSegments)
                curve = sampleKnotCurve(0.0, settings);
        } else
#endif
        {
            curve = sampleShellCurve(s, settings);
        }
        const Vec3 tangent = unit(curve.derivative);
        Vec3 normal;
        double distance = 0.0;
        if (frames.empty()) {
            Vec3 reference{0, 1, 0};
            if (std::abs(tangent.y) > 0.9)
                reference = {1, 0, 0};
            normal = projectOntoSection(reference, tangent);
        } else {
            const SweepFrame& previous = frames.back();
            normal = transportNormal(previous.normal, previous.tangent, tangent);
            distance = previous.lengthFromStart + length(curve.position - previous.center);
        }
        frames.push_back({curve.position, tangent, normal, cross(tangent, normal), curve.sectionRadius, distance});
    }

    const double totalLength = frames.back().lengthFromStart;
    if (!std::isfinite(totalLength) || totalLength <= 1e-12) {
        throw std::domain_error("Sweep centerline has no usable length");
    }
    double correction = 0.0;
#if LAB_CHECKPOINT >= 6
    if (closed) {
        correction = signedSectionAngle(frames.back().normal, frames.front().normal, frames.front().tangent);
    }
#endif
    for (SweepFrame& frame : frames) {
        // Spread the residual seam rotation along the arc, rather than twisting just the last ring.
        const double angle = (correction + fullTurn * settings.sectionTurns) * frame.lengthFromStart / totalLength;
        frame.normal = projectOntoSection(rotateAboutAxis(frame.normal, frame.tangent, angle), frame.tangent);
        frame.binormal = cross(frame.tangent, frame.normal);
    }
#if LAB_CHECKPOINT >= 6
    if (closed) {
        frames.back() = frames.front();
        frames.back().lengthFromStart = totalLength;
    }
#endif
    return frames;
}

inline Vec3 sectionPoint(const SweepFrame& frame, double cosine, double sine, double aspect) {
    const Vec3 offset = frame.normal * cosine + frame.binormal * (aspect * sine);
    return frame.center + offset * frame.sectionRadius;
}

inline SurfaceSample sampleSweep(const std::vector<SweepFrame>& frames, int row, double angleV, bool closed) {
    const int last = static_cast<int>(frames.size()) - 1;
    const double cosine = std::cos(angleV);
    const double sine = std::sin(angleV);
    double aspect = 0.72;
#if LAB_CHECKPOINT >= 6
    if (closed)
        aspect = 0.82;
#else
    (void)closed;
#endif

    // Closed seam rows share the same tangent estimate. Open ends use one-sided differences.
    int previous = std::max(0, row - 1);
    int next = std::min(last, row + 1);
    int intervals = next - previous;
#if LAB_CHECKPOINT >= 6
    if (closed && (row == 0 || row == last)) {
        previous = last - 1;
        next = 1;
        intervals = 2;
    }
#endif
    const SweepFrame& frame = frames[row];
    const Vec3 left = sectionPoint(frames[previous], cosine, sine, aspect);
    const Vec3 right = sectionPoint(frames[next], cosine, sine, aspect);
    const Vec3 tangentV = (frame.normal * -sine + frame.binormal * (aspect * cosine)) * frame.sectionRadius;
    return {
        sectionPoint(frame, cosine, sine, aspect),
        (right - left) * (static_cast<double>(last) / intervals),
        tangentV,
    };
}

} // namespace geometry
#endif
