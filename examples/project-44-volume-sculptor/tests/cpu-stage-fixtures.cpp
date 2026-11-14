#include "sculpt_cpu_mesh.hpp"
#include "sculpt_cpu_pick.hpp"
#include "sculpt_document.hpp"
#include "sculpt_mesh_topology.hpp"
#include <iostream>

namespace {
using namespace sculpt;

// Teaching-stage checks isolate CPU normal/picking behavior from GPU scale tests.
// Exceptions keep failures observable even when Release defines NDEBUG.
void requireStage(bool condition, const char* message) {
    if (!condition)
        throw std::runtime_error(message);
}

template <class Function>
void stageRejects(Function action, const char* message) {
    bool rejected = false;
    try {
        action();
    } catch (const std::exception&) {
        rejected = true;
    }
    requireStage(rejected, message);
}

double radialNormalError(const std::vector<SurfaceVertex>& vertices) {
    double squared = 0;
    for (const auto& vertex : vertices) {
        const auto point = positionOf(vertex);
        const auto normal = normalOf(vertex);
        requireStage(finite(normal) && std::abs(length(normal) - 1) < 0.000003F, "CPU normal is not finite/unit");
        const double radius = std::sqrt(static_cast<double>(point.x) * point.x + static_cast<double>(point.y) * point.y + static_cast<double>(point.z) * point.z);
        const double dx = normal.x - point.x / radius;
        const double dy = normal.y - point.y / radius;
        const double dz = normal.z - point.z / radius;
        squared += dx * dx + dy * dy + dz * dz;
    }
    return std::sqrt(squared / static_cast<double>(vertices.size()));
}

void tinyTriangleFixtures() {
    // An interior sample belongs to 24 Freudenthal tetra. Moving its value
    // close to iso shrinks their faces; it does not make those faces zero-area.
    for (const float insideValue : {-0.00001F, -0.0000001F}) {
        ScalarGrid grid({3, {-1, -1, -1}, 2});
        for (int z = 0; z < 3; ++z)
            for (int y = 0; y < 3; ++y)
                for (int x = 0; x < 3; ++x)
                    grid.set(x, y, z, 1);
        grid.set(1, 1, 1, insideValue);

        const auto mesh = extractCpu(grid, 0, 1024, CpuNormalMode::face);
        std::cout << "CPU TINY TRIANGLE CHECK inside=" << insideValue << " vertices=" << mesh.vertices.size() << " expected=72 discarded=" << mesh.degenerateTriangles << '\n';
        requireStage(mesh.vertices.size() == 72 && mesh.degenerateTriangles == 0, "A resolved near-isovalue surface was erased by the area cutoff");
        const auto topology = inspectMeshTopology(mesh.vertices);
        requireStage(topology.closedOriented() && topology.components == 1 && topology.eulerCharacteristic() == 2, "Near-isovalue triangles do not form a closed surface");
        for (const auto& vertex : mesh.vertices)
            requireStage(finite(normalOf(vertex)) && std::abs(length(normalOf(vertex)) - 1) < 0.000003F, "A tiny face needs a finite unit normal without magnitude underflow");
    }
    std::cout << "CPU TINY TRIANGLE PASS cases=2 expectedFaces=24 closedOriented=1 noEpsilonWelding=1 unitNormals=1\n";
}

void normalModeFixtures() {
    ScalarGrid sphere({24});
    sphere.fill(Shape::sphere);
    const auto face = extractCpu(sphere, 0, 300000, CpuNormalMode::face);
    const auto gradient = extractCpu(sphere, 0, 300000, CpuNormalMode::gradient);
    requireStage(face.vertices.size() == gradient.vertices.size() && face.activeCells == gradient.activeCells, "Normal selection changed topology/count");
    for (std::size_t index = 0; index < face.vertices.size(); ++index)
        requireStage(face.vertices[index].position == gradient.vertices[index].position, "Smoothing moved a vertex to hide a crack");
    const auto faceRms = radialNormalError(face.vertices);
    const auto gradientRms = radialNormalError(gradient.vertices);
    requireStage(gradientRms < 0.03 && gradientRms < faceRms, "Gradient normals did not approach the independent radial reference");
    for (std::size_t first = 0; first < face.vertices.size(); first += 3)
        requireStage(face.vertices[first].normal == face.vertices[first + 1].normal && face.vertices[first].normal == face.vertices[first + 2].normal, "Face mode did not give one normal to each triangle");
    stageRejects([&] {
        extractCpu(sphere, 0, 300000, static_cast<CpuNormalMode>(2));
    },
                "Unknown normal mode was accepted");

    ScalarGrid critical({5});
    for (int z = 0; z < 5; ++z)
        for (int y = 0; y < 5; ++y)
            for (int x = 0; x < 5; ++x) {
                float value = 1;
                if ((x + y + z) % 2 == 0)
                    value = -1;
                critical.set(x, y, z, value);
            }
    const auto fallback = extractCpu(critical, 0, 300000, CpuNormalMode::gradient);
    requireStage(fallback.normalFallbacks > 0, "Critical-gradient fixture did not exercise the documented fallback");
    for (const auto& vertex : fallback.vertices)
        requireStage(finite(normalOf(vertex)) && std::abs(length(normalOf(vertex)) - 1) < 0.000003F, "Zero-gradient fallback produced invalid normals");
    std::cout << "CPU NORMAL MODES PASS samePositions=1 faceRms=" << faceRms << " gradientRms=" << gradientRms << " zeroGradientFallbacks=" << fallback.normalFallbacks << '\n';
}

void fieldPickFixtures() {
    ScalarGrid plane({16});
    const Vec3 normal = normalized({1, 2, -1});
    plane.fillPlane(normal, 0.2F);
    const auto hit = pickCpuField(plane, {0, 0, 3}, {0, 0, -1}, 0);
    const double expectedZ = 0.2 / static_cast<double>(normal.z);
    requireStage(hit.hit && !hit.exhausted && std::abs(hit.point.z - expectedZ) < 0.00002 && hit.steps <= 2048, "Plane picking differs from the independent ray/plane equation");
    auto scaled = plane.values();
    for (auto& value : scaled)
        value *= 3;
    plane.replaceValues(scaled);
    const auto nonDistance = pickCpuField(plane, {0, 0, 3}, {0, 0, -2}, 0);
    requireStage(nonDistance.hit && std::abs(nonDistance.point.z - expectedZ) < 0.00002, "Picking wrongly treated the edited scalar as an SDF or left the ray unnormalized");
    requireStage(!pickCpuField(plane, {4, 4, 3}, {0, 0, -1}, 0).hit, "A parallel ray outside the grid reported a hit");
    stageRejects([&] {
        pickCpuField(plane, {}, {}, 0);
    },
                "Zero ray direction was accepted");

    ScalarGrid sphere({32});
    sphere.fill(Shape::sphere);
    const auto before = pickCpuField(sphere, {0, 0, 3}, {0, 0, -1}, 0);
    const auto inside = pickCpuField(sphere, {}, {0, 0, 1}, 0);
    const float interpolationBound = 2 * sphere.spec().spacing() * sphere.spec().spacing() / 0.82F;
    requireStage(before.hit && inside.hit && std::abs(before.point.z - 0.82F) < interpolationBound && std::abs(inside.point.z - before.point.z) < 0.00002F, "Inside/exit picking is inconsistent with the sphere and declared grid error");
    applyBrush(sphere, {{0, 0, 0.7F}, 0.4F, 0.5F, BrushMode::add});
    const auto after = pickCpuField(sphere, {0, 0, 3}, {0, 0, -1}, 0);
    requireStage(after.hit && after.point.z > before.point.z + 0.08F, "Picking sampled the original preset instead of the stored edited field");
    const auto point = brushPlanePoint({0, 0, 3}, normalized({0.2F, 0.1F, -1}), {0, 0, 0.5F}, {0, 0, -1});
    requireStage(point && length(*point - Vec3{0.5F, 0.25F, 0.5F}) < 0.000002F, "Brush ray/plane position differs from the independent component ratios");
    requireStage(!brushPlanePoint({0, 0, 3}, {1, 0, 0}, {}, {0, 0, 1}) && !brushPlanePoint({0, 0, 3}, {0, 0, 1}, {}, {0, 0, 1}), "Parallel/behind brush plane was accepted");
    std::cout << "CPU STORED FIELD PICK PASS planeWorldTolerance=2e-5 nonSdfScale=3 insideExit=1 editedField=1 planeDrag=1 boundedSteps=2048\n";
}

void singleStampFixtures() {
    CpuDocument document({24});
    const Brush brush{{0.7F, 0, 0}, 0.3F, 0.3F, BrushMode::add};
    const auto version = document.generation();
    requireStage(document.applyStamp(brush) && document.generation() == version + 1 && document.undoCount() == 0, "A single stamp did not update its field without premature stroke history");
    document.beginStroke(12, brush);
    const auto owned = document.field().values();
    stageRejects([&] {
        document.applyStamp(brush);
    },
                "Single stamp stole an active stroke");
    requireStage(document.field().values() == owned && document.strokeActive(), "Rejected stamp changed the owned field");
    document.endStroke(12);
    requireStage(document.undo() && document.redoCount() == 1, "Single-stamp fixture could not prepare a redo entry");
    const auto beforeNoop = document.generation();
    requireStage(!document.applyStamp({{8, 8, 8}, 0.03F, 0.3F, BrushMode::add}) && document.generation() == beforeNoop && document.redoCount() == 1, "No-op stamp invalidated redo or field generation");
    requireStage(document.applyStamp(brush) && document.undoCount() == 0 && document.redoCount() == 0, "Committed single stamp retained incompatible stroke history");
    std::cout << "CPU SINGLE STAMP PASS fieldVersion=1 noHistory=1 ownerRefusal=1 noopKeepsRedo=1 changedClearsHistory=1\n";
}
} // namespace

void testCpuTeachingStages() {
    tinyTriangleFixtures();
    normalModeFixtures();
    fieldPickFixtures();
    singleStampFixtures();
}
