#include "test_support.hpp"

namespace {

using geometry::SurfaceKind;
using geometry::SurfaceSettings;
using geometry::SweepFrame;
using geometry::Vec3;
using geometry_tests::buildMesh;
using geometry_tests::require;
using geometry_tests::requireNear;
using geometry_tests::unpack;

void checkFrameContinuity(const std::vector<SweepFrame>& frames) {
    double previousLength = -1.0;
    for (std::size_t index = 0; index < frames.size(); ++index) {
        const SweepFrame& frame = frames[index];
        for (const Vec3 axis : {frame.normal, frame.tangent, frame.binormal}) {
            require(std::abs(geometry::length(axis) - 1.0) < 1e-12, "Sweep axes must have unit length");
        }
        require(std::abs(geometry::dot(frame.tangent, frame.normal)) < 1e-12, "Sweep frame must be perpendicular");
        requireNear(geometry::cross(frame.normal, frame.binormal), frame.tangent, 1e-12, "Sweep frame is right-handed");
        require(frame.lengthFromStart > previousLength, "Sweep arc length must advance");
        previousLength = frame.lengthFromStart;
        if (index > 0) {
            require(geometry::dot(frames[index - 1].normal, frame.normal) > 0.8, "Sweep frames must not flip between neighboring rings");
        }
    }
}

void checkGeneratedTriangles(const geometry::Mesh& mesh) {
    const std::size_t u = mesh.settings.uSegments;
    const std::size_t v = mesh.settings.vSegments;
    require(mesh.vertices.size() == (u + 1) * (v + 1), "Sweep must emit a real vertex for each sample");
    require(mesh.indices.size() == 6 * u * v, "Sweep must emit both triangles of each cell");
    for (std::size_t index = 0; index < mesh.indices.size(); index += 3) {
        const auto a = mesh.indices[index];
        const auto b = mesh.indices[index + 1];
        const auto c = mesh.indices[index + 2];
        require(a < mesh.vertices.size() && b < mesh.vertices.size() && c < mesh.vertices.size(), "Sweep indices in range");
        const Vec3 origin = unpack(mesh.vertices[a].position);
        const Vec3 area = geometry::cross(unpack(mesh.vertices[b].position) - origin, unpack(mesh.vertices[c].position) - origin);
        require(geometry::length(area) > 1e-8, "Sweep triangles must not collapse");
        require(geometry::dot(area, unpack(mesh.vertices[a].normal)) > 0, "Winding and sweep normals must agree");
    }
}

void testShell() {
    SurfaceSettings settings = geometry::presetSettings(SurfaceKind::shell);
    const auto frames = geometry::buildSweepFrames(settings);
    checkFrameContinuity(frames);
    const auto& start = frames.front();
    const auto& end = frames.back();
    require(std::abs(end.sectionRadius - settings.thickness) < 1e-12, "Shell lip uses the requested thickness");
    require(std::abs(start.sectionRadius * std::exp(settings.shellGrowth) - end.sectionRadius) < 1e-12, "Shell sections grow exponentially toward the lip");
    require(std::abs(std::hypot(end.center.x, end.center.z) - settings.radius) < 1e-12, "Lip radius matches the control");
    require(start.center.y > end.center.y, "Shell tip is higher than its lip");

    constexpr double t = 0.48;
    constexpr double h = 1e-5;
    const Vec3 tangent = geometry::sampleShellCurve(t, settings).derivative;
    const Vec3 first = geometry::sampleShellCurve(t - h, settings).position;
    const Vec3 last = geometry::sampleShellCurve(t + h, settings).position;
    requireNear(geometry::unit(tangent), geometry::unit(last - first), 1e-8, "Shell derivative agrees with finite difference");

    const auto shell = buildMesh(settings);
    checkGeneratedTriangles(shell);
    const int columns = settings.vSegments + 1;
    require(shell.vertices.front().position != shell.vertices[settings.uSegments * columns].position, "Shell ends must stay open instead of wrapping along u");
    for (int row = 0; row <= settings.uSegments; ++row) {
        require(shell.vertices[row * columns].position == shell.vertices[row * columns + columns - 1].position, "Each shell cross section closes in v");
    }
    settings.sectionTurns = 1.35;
    const auto twisted = buildMesh(settings);
    const int index = (settings.uSegments / 2) * columns;
    require(geometry::length(unpack(twisted.vertices[index].position) - unpack(shell.vertices[index].position)) > 0.02, "Changing section rotation must move vertices");
}

void testKnot() {
    SurfaceSettings settings = geometry::presetSettings(SurfaceKind::knot);
    for (const int lobes : {3, 5}) {
        for (const double rotation : {-2.0, 0.0, 2.0}) {
            settings.knotLobes = lobes;
            settings.sectionTurns = rotation;
            const auto frames = geometry::buildSweepFrames(settings);
            checkFrameContinuity(frames);
            requireNear(frames.front().center, frames.back().center, 0.0, "Knot centerline closes exactly");
            requireNear(frames.front().normal, frames.back().normal, 0.0, "Knot frame closes exactly");

            const auto knot = buildMesh(settings);
            checkGeneratedTriangles(knot);
            const int columns = settings.vSegments + 1;
            for (int column = 0; column < columns; ++column) {
                const auto& first = knot.vertices[column];
                const auto& last = knot.vertices[settings.uSegments * columns + column];
                require(first.position == last.position && first.normal == last.normal && first.tangent == last.tangent, "Knot seam duplicates continuous geometry and tangent data");
                require(first.uv[0] == 0.0F && last.uv[0] == 1.0F, "Knot seam keeps both UV chart edges");
            }
        }
    }
}

} // namespace

void runSweepTests() {
    testShell();
    testKnot();
}
