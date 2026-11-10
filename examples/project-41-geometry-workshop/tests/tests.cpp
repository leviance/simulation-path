#include "test_support.hpp"

#include <cstdlib>
#include <iostream>
#include <limits>
#include <stdexcept>

void runSweepTests();
void runMeshSessionTests();
void runObjTests();
void runWorkshopPanelTests();

namespace {

using geometry::BuildState;
using geometry::Mesh;
using geometry::MeshBuild;
using geometry::SurfaceKind;
using geometry::SurfaceSettings;
using geometry::Vec3;
using geometry_tests::buildMesh;
using geometry_tests::require;
using geometry_tests::requireNear;
using geometry_tests::unpack;

void testTorusLandmarks() {
    constexpr double quarterTurn = geometry::fullTurn / 4.0;
    constexpr double majorRadius = 2.0;
    constexpr double tubeRadius = 0.5;
    constexpr double tolerance = 1e-12;

    // These points and directions follow directly from the cross-section circle.
    const auto outer = geometry::sampleTorus(0.0, 0.0, majorRadius, tubeRadius);
    requireNear(outer.position, {2.5, 0.0, 0.0}, tolerance, "Outer torus radius");
    requireNear(geometry::surfaceNormal(outer), {1.0, 0.0, 0.0}, tolerance, "Outer torus normal");
    const auto inner = geometry::sampleTorus(0.0, 2.0 * quarterTurn, majorRadius, tubeRadius);
    requireNear(inner.position, {1.5, 0.0, 0.0}, tolerance, "Inner torus radius");
    requireNear(geometry::surfaceNormal(inner), {-1.0, 0.0, 0.0}, tolerance, "Inner torus normal");
    const auto upper = geometry::sampleTorus(quarterTurn, quarterTurn, majorRadius, tubeRadius);
    requireNear(upper.position, {0.0, 0.5, 2.0}, tolerance, "Upper torus bound");
    requireNear(geometry::surfaceNormal(upper), {0.0, 1.0, 0.0}, tolerance, "Upper torus normal");

    // Verify the analytic derivative against samples on either side of an interior point.
    constexpr double u = 0.73;
    constexpr double v = 1.18;
    constexpr double h = 1e-5;
    const auto sample = geometry::sampleTorus(u, v, majorRadius, tubeRadius);
    const Vec3 right = geometry::sampleTorus(u + h, v, majorRadius, tubeRadius).position;
    const Vec3 left = geometry::sampleTorus(u - h, v, majorRadius, tubeRadius).position;
    requireNear(sample.tangentU, (right - left) * (0.5 / h), 1e-8, "Torus tangent agrees with central difference");
}

void testMobiusSeam() {
    constexpr double radius = 1.8;
    for (const int halfTwists : {1, 3, 5}) {
        for (const double u : {0.0, 0.37, 2.1, 5.6}) {
            for (const double v : {-0.35, -0.12, 0.0, 0.23, 0.35}) {
                const auto afterTurn = geometry::sampleMobius(u + geometry::fullTurn, v, radius, halfTwists);
                const auto reversed = geometry::sampleMobius(u, -v, radius, halfTwists);
                requireNear(afterTurn.position, reversed.position, 1e-12, "Mobius position joins the reversed edge");
                requireNear(afterTurn.tangentU, reversed.tangentU, 1e-12, "Mobius tangent along u joins");
                requireNear(afterTurn.tangentV, reversed.tangentV * -1.0, 1e-12, "Mobius tangent along v reverses");
                requireNear(geometry::surfaceNormal(afterTurn), geometry::surfaceNormal(reversed) * -1.0, 1e-12, "Mobius does not have one continuous global normal");
            }
        }
    }

    SurfaceSettings settings;
    settings.kind = SurfaceKind::mobius;
    settings.radius = radius;
    settings.thickness = 0.35;
    settings.halfTwists = 3;
    const Mesh mesh = buildMesh(settings);
    const int columns = settings.vSegments + 1;
    for (int column = 0; column < columns; ++column) {
        const auto& first = mesh.vertices[settings.vSegments - column];
        const auto& last = mesh.vertices[settings.uSegments * columns + column];
        require(first.position == last.position, "Mobius seam positions must match exactly");
        requireNear(unpack(last.normal), unpack(first.normal) * -1.0, 1e-6, "Mobius seam normals must flip");
        require(first.uv[0] == 0.0F && last.uv[0] == 1.0F, "Both seam UVs must be preserved");
    }
}

void testHighResolutionMesh() {
    SurfaceSettings settings;
    settings.uSegments = 256;
    settings.vSegments = 256;
    const Mesh mesh = buildMesh(settings);
    constexpr std::size_t columns = 257;
    require(mesh.vertices.size() == 66049, "The 256x256 grid must contain 66049 vertex records");
    require(mesh.indices.size() == 393216, "Each grid cell must contain two triangles");
    require(mesh.payloadBytes() == 4479020, "Count only vertex and index payload bytes");

    for (std::size_t index = 0; index < columns; ++index) {
        const auto& firstU = mesh.vertices[index];
        const auto& lastU = mesh.vertices[256 * columns + index];
        const auto& firstV = mesh.vertices[index * columns];
        const auto& lastV = mesh.vertices[index * columns + 256];
        require(firstU.position == lastU.position && firstU.normal == lastU.normal, "Torus u seam must be smooth");
        require(firstV.position == lastV.position && firstV.normal == lastV.normal, "Torus v seam must be smooth");
    }
    for (const auto& vertex : mesh.vertices) {
        const Vec3 normal = unpack(vertex.normal);
        const Vec3 tangent = unpack(vertex.tangent);
        require(std::abs(geometry::length(normal) - 1.0) < 1e-6, "Normals must have unit length");
        require(std::abs(geometry::dot(normal, tangent)) < 1e-6, "Tangent and normal must be perpendicular");
        require(vertex.uv[0] >= 0.0F && vertex.uv[0] <= 1.0F, "u must be a normalized UV");
        require(vertex.uv[1] >= 0.0F && vertex.uv[1] <= 1.0F, "v must be a normalized UV");
    }
    for (std::size_t index = 0; index < mesh.indices.size(); index += 3) {
        const auto a = mesh.indices[index];
        const auto b = mesh.indices[index + 1];
        const auto c = mesh.indices[index + 2];
        require(a < mesh.vertices.size() && b < mesh.vertices.size() && c < mesh.vertices.size(), "Every triangle must index an existing vertex");
        const Vec3 position = unpack(mesh.vertices[a].position);
        const Vec3 edgeB = unpack(mesh.vertices[b].position) - position;
        const Vec3 edgeC = unpack(mesh.vertices[c].position) - position;
        const Vec3 face = geometry::cross(edgeB, edgeC);
        require(geometry::dot(face, unpack(mesh.vertices[a].normal)) > 1e-10, "Triangle winding must face outward");
    }
    std::cout << "Torus mesh: " << mesh.vertices.size() << " vertices, " << mesh.indices.size() / 3 << " triangles, " << mesh.payloadBytes() << " payload bytes\n";
}

void requireNotReady(MeshBuild& build) {
    try {
        build.takeMesh();
    } catch (const std::logic_error&) {
        return;
    }
    throw std::runtime_error("An incomplete, cancelled or consumed candidate cannot publish");
}

void requireRejected(const SurfaceSettings& settings) {
    try {
        MeshBuild build(settings);
    } catch (const std::invalid_argument&) {
        return;
    }
    throw std::runtime_error("Invalid settings must be rejected before allocation");
}

void testCandidateLifecycle() {
    const Mesh lastGood = buildMesh({});
    const auto* retainedVertices = lastGood.vertices.data();
    const auto retainedPosition = lastGood.vertices.front().position;

    SurfaceSettings changed;
    changed.radius = 2.0;
    MeshBuild candidate(changed);
    candidate.advance(std::numeric_limits<int>::max());
    require(candidate.completedRows() == geometry::maxRowsPerBatch, "A batch must have a hard row limit");
    requireNotReady(candidate);
    candidate.cancel();
    candidate.advance();
    require(candidate.state() == BuildState::cancelled, "Cancel must stop construction");
    requireNotReady(candidate);

    changed.uSegments = std::numeric_limits<int>::max();
    requireRejected(changed);
    changed.uSegments = 96;
    changed.thickness = std::numeric_limits<double>::quiet_NaN();
    requireRejected(changed);
    changed.thickness = 0.42;
    changed.kind = SurfaceKind::mobius;
    changed.halfTwists = 2;
    requireRejected(changed);
    require(lastGood.vertices.data() == retainedVertices && lastGood.vertices.front().position == retainedPosition, "Candidate work and refusal must not mutate the retained mesh");

    MeshBuild ready({});
    for (int batch = 0; batch < 13; ++batch)
        ready.advance();
    require(ready.state() == BuildState::ready, "All grid rows eventually finish");
    const Mesh result = ready.takeMesh();
    require(!result.vertices.empty() && ready.state() == BuildState::taken, "Publish once");
    requireNotReady(ready);
}

} // namespace

int main() {
    try {
        testTorusLandmarks();
        testMobiusSeam();
        testHighResolutionMesh();
        testCandidateLifecycle();
        runSweepTests();
        runMeshSessionTests();
        runObjTests();
        runWorkshopPanelTests();
        std::cout << "Geometry core checks PASS: four presets, seams, topology, live preview, last-good, OBJ and panel\n";
        return EXIT_SUCCESS;
    } catch (const std::exception& error) {
        std::cerr << "Geometry core checks FAIL: " << error.what() << '\n';
        return EXIT_FAILURE;
    }
}
