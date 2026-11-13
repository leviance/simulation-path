#include "sculpt_cpu_mesh.hpp"
#include "sculpt_document.hpp"
#include <bit>
#include <iostream>
#include <map>
#include <string>

namespace {
using namespace sculpt;

void check(bool condition, const std::string& message) {
    if (!condition)
        throw std::runtime_error(message);
}

void near(double actual, double expected, double tolerance, const std::string& message) {
    if (!std::isfinite(actual) || std::abs(actual - expected) > tolerance)
        throw std::runtime_error(message + " actual=" + std::to_string(actual) + " expected=" + std::to_string(expected));
}

template <class Function>
void rejects(Function action, const std::string& message) {
    bool rejected = false;
    try {
        action();
    } catch (const std::exception&) {
        rejected = true;
    }
    check(rejected, message);
}

void gridFixtures() {
    const GridSpec spec{128};
    check(spec.sampleCount() == 2097152 && spec.cellCount() == 2048383, "128 samples are not 128 cells");
    check(spec.sampleIndex(1, 2, 3) == (3 * 128 + 2) * 128 + 1, "Row-major index differs from the declared layout");
    rejects([&] { spec.sampleIndex(128, 0, 0); }, "Out-of-range sample was accepted");
    rejects([] { GridSpec{1}.sampleCount(); }, "Grid with no cells was accepted");
    rejects([] { checkedProduct(std::numeric_limits<std::size_t>::max(), 2); }, "Byte multiplication overflow was accepted");
    const Vec3 coordinate{17.25F, 28.5F, 96.125F};
    near(length(spec.gridFromWorld(spec.worldFromGrid(coordinate)) - coordinate), 0, 0.00002, "World/grid round trip");

    ScalarGrid plane({16});
    const Vec3 normal = normalized({1, 2, -1});
    plane.fillPlane(normal, 0.13F);
    for (Vec3 point : std::array<Vec3, 4>{{{0.1F, -0.25F, 0.7F}, {-1.5F, -1.5F, -1.5F}, {1.5F, 1.5F, 1.5F}, {0, 0, 0}}}) {
        const double expected = static_cast<double>(point.x) * normal.x + static_cast<double>(point.y) * normal.y + static_cast<double>(point.z) * normal.z - 0.13;
        near(plane.sample(point), expected, 2e-6, "Trilinear plane must be affine-exact");
        near(length(plane.gradient(point) - normal), 0, 2e-5, "Boundary gradient must use one-sided spacing");
    }
    rejects([&] { plane.set(0, 0, 0, std::numeric_limits<float>::quiet_NaN()); }, "NaN field was accepted");
    rejects([&] { plane.sample({std::numeric_limits<float>::infinity(), 0, 0}); }, "Infinite probe was accepted");
    std::cout << "GRID PASS samples=2097152 cells=2048383 affineProbe=4\n";
}

void tetraFixtures() {
    const std::array<Vec3, 4> points{{{0, 0, 0}, {1, 0, 0}, {0, 1, 0}, {0, 0, 1}}};
    for (unsigned mask = 0; mask < 16; ++mask) {
        std::array<Corner, 4> tetra;
        for (int corner = 0; corner < 4; ++corner) {
            float value = 1;
            if (mask & (1U << corner))
                value = -1;
            tetra[corner] = {static_cast<std::uint64_t>(corner), points[corner], value};
        }
        CellTriangles result;
        polygonizeTetra(tetra, 0, 1, result);
        unsigned expected = 1;
        const int inside = std::popcount(mask);
        if (inside == 0 || inside == 4)
            expected = 0;
        else if (inside == 2)
            expected = 2;
        check(result.count == expected, "Tetra mask count differs from its analytic 0/1/2-triangle case");
        for (unsigned triangle = 0; triangle < result.count; ++triangle) {
            const auto& vertices = result.triangles[triangle].vertices;
            const Vec3 face = cross(vertices[1].point - vertices[0].point, vertices[2].point - vertices[0].point);
            // The affine scalar gradient follows directly from values at the unit tetra.
            const Vec3 affineGradient{tetra[1].value - tetra[0].value, tetra[2].value - tetra[0].value, tetra[3].value - tetra[0].value};
            check(dot(face, affineGradient) > 0, "Triangle winding points into the negative side");
            for (const auto& vertex : vertices) {
                const float value = tetra[0].value + dot(affineGradient, vertex.point);
                near(value, 0, 1e-6, "Interpolated vertex is not on the affine isosurface");
            }
        }
    }
    Corner a{42, {-1, 0, 0}, -0.2F}, b{7, {1, 0, 0}, 0.8F};
    const auto forward = edgePoint(a, b, 0), reverse = edgePoint(b, a, 0);
    check(forward.key == reverse.key && forward.point.x == reverse.point.x, "Opposite owners did not use identical canonical edge arithmetic");
    near(forward.point.x, -0.6, 2e-7, "Edge interpolation ratio is not the analytic value");
    b.value = 0;
    near(edgePoint(a, b, 0).point.x, 1, 0, "Tie must land exactly on its outside endpoint");
    rejects([&] { edgePoint(a, a, 0); }, "Repeated edge index was accepted");
    rejects([&] { edgePoint(b, b, std::numeric_limits<float>::quiet_NaN()); }, "Invalid isovalue was accepted");
    std::cout << "TETRA PASS masks=16 canonicalEdge=1 ties=1 outwardWinding=1\n";
}

using Segment = std::array<EdgeKey, 2>;
using Segments = std::map<Segment, int>;

Segments sharedFaceSegments(const CellTriangles& cell) {
    Segments result;
    for (std::uint32_t triangle = 0; triangle < cell.count; ++triangle) {
        const auto& vertices = cell.triangles[triangle].vertices;
        for (int edge = 0; edge < 3; ++edge) {
            const auto& a = vertices[edge];
            const auto& b = vertices[(edge + 1) % 3];
            if (std::abs(a.point.x) > 1e-6F || std::abs(b.point.x) > 1e-6F)
                continue;
            Segment segment{a.key, b.key};
            if (segment[1] < segment[0])
                std::swap(segment[0], segment[1]);
            ++result[segment];
        }
    }
    return result;
}

void sharedFaceFixtures() {
    for (unsigned mask = 0; mask < 16; ++mask) {
        ScalarGrid grid({3});
        grid.fillPlane({1, 0.2F, 0.3F}, 0.11F);
        for (int z = 0; z < 2; ++z)
            for (int y = 0; y < 2; ++y) {
                float value = 0.9F;
                if (mask & (1U << (z * 2 + y)))
                    value = -0.7F;
                grid.set(1, y, z, value);
            }
        const auto left = sharedFaceSegments(polygonizeCell(grid, 0, 0, 0, 0));
        const auto right = sharedFaceSegments(polygonizeCell(grid, 1, 0, 0, 0));
        check(left == right, "Neighbor cells chose different shared-face segments");
    }
    std::cout << "SHARED FACE PASS faceMasks=16 including alternating signs\n";
}

double sphereError(int samples) {
    ScalarGrid grid({samples});
    grid.fill(Shape::sphere);
    const auto mesh = extractCpu(grid, 0);
    check(!mesh.vertices.empty() && mesh.vertices.size() % 3 == 0, "Sphere mesh has no complete triangles");
    double squaredError = 0;
    for (const auto& vertex : mesh.vertices) {
        const Vec3 point = positionOf(vertex), normal = normalOf(vertex);
        const double radius = std::sqrt(static_cast<double>(point.x) * point.x + static_cast<double>(point.y) * point.y + static_cast<double>(point.z) * point.z);
        const double error = radius - 0.82;
        squaredError += error * error;
        near(length(normal), 1, 1e-5, "Vertex normal is not unit length");
        check(dot(normal, point) / radius > 0.97, "Sphere normal is not radially outward");
    }
    const double rms = std::sqrt(squaredError / mesh.vertices.size());
    std::cout << "SPHERE samples=" << samples << " triangles=" << mesh.vertices.size() / 3 << " rmsRadius=" << rms << '\n';
    return rms;
}

void meshFixtures() {
    ScalarGrid plane({12});
    const Vec3 normal = normalized({1, 2, -1});
    plane.fillPlane(normal, 0.13F);
    const auto mesh = extractCpu(plane, 0);
    check(!mesh.vertices.empty(), "Plane extraction is empty");
    for (const auto& vertex : mesh.vertices) {
        const Vec3 point = positionOf(vertex);
        near(dot(point, normal), 0.13, 2e-6, "Extracted plane differs from its analytic equation");
        check(dot(normalOf(vertex), normal) > 0.9999F, "Plane gradient normal has the wrong sign");
    }
    rejects([&] { extractCpu(plane, 0, 3); }, "Capacity overflow silently truncated the mesh");
    ScalarGrid heavy({128});
    rejects([&] { extractCpu(heavy, 0); }, "GPU-scale field was silently extracted on CPU");
    const double coarse = sphereError(12), middle = sphereError(24), fine = sphereError(48);
    check(middle < coarse * 0.5 && fine < middle * 0.5, "Sphere refinement did not reduce measured geometric error");

    ScalarGrid sphere({20});
    sphere.fill(Shape::sphere);
    std::map<Segment, int> edgeOwners;
    for (int z = 0; z < 19; ++z)
        for (int y = 0; y < 19; ++y)
            for (int x = 0; x < 19; ++x) {
                const auto cell = polygonizeCell(sphere, x, y, z, 0);
                for (std::uint32_t triangle = 0; triangle < cell.count; ++triangle) {
                    const auto& vertices = cell.triangles[triangle].vertices;
                    for (int edge = 0; edge < 3; ++edge) {
                        Segment key{vertices[edge].key, vertices[(edge + 1) % 3].key};
                        if (key[1] < key[0])
                            std::swap(key[0], key[1]);
                        ++edgeOwners[key];
                    }
                }
            }
    for (const auto& [edge, owners] : edgeOwners)
        check(owners == 2, "Closed sphere has an unmatched or nonmanifold mesh edge");
    std::cout << "MESH PASS analyticPlane=1 convergence=3 closedSphereEdges=" << edgeOwners.size() << " capacityRejected=1\n";
}

void brushAndStrokeFixtures() {
    ScalarGrid grid({33});
    grid.fill(Shape::sphere);
    const auto original = grid.values();
    Brush brush;
    const auto changed = applyBrush(grid, brush);
    check(!changed.empty, "Brush did not change the stored field");
    near(grid.at(16, 16, 16), -0.82 - 0.35, 2e-7, "Add must decrease scalar at the brush center");
    check(grid.at(0, 16, 16) == original[grid.spec().sampleIndex(0, 16, 16)], "Brush modified a protected boundary");
    const auto dirty = dirtyChunks({128}, SampleBox{{17, 5, 5}, {17, 5, 5}, false});
    check(dirty == std::vector<std::uint32_t>{0, 1}, "Gradient dependency halo missed the neighboring chunk");
    StrokeSampler coarse({-0.7F, 0, 0}, 0.28F), fine({-0.7F, 0, 0}, 0.28F);
    const auto coarseStamps = coarse.advance({0.7F, 0, 0});
    std::vector<Vec3> fineStamps;
    for (int step = 1; step <= 100; ++step) {
        const auto next = fine.advance({-0.7F + step * 0.014F, 0, 0});
        fineStamps.insert(fineStamps.end(), next.begin(), next.end());
    }
    check(std::abs(static_cast<int>(coarseStamps.size()) - static_cast<int>(fineStamps.size())) <= 1, "Input event density changed the number of spatial stamps");
    const auto paired = std::min(coarseStamps.size(), fineStamps.size());
    for (std::size_t index = 0; index < paired; ++index)
        near(length(coarseStamps[index] - fineStamps[index]), 0, 2e-6, "Stroke stamp moved with the sampling rate");
    for (std::size_t index = 1; index < coarseStamps.size(); ++index)
        check(length(coarseStamps[index] - coarseStamps[index - 1]) <= 0.070001F, "Stroke left a gap beyond radius/4");
    rejects([&] { coarse.advance({100, 0, 0}); }, "Unbounded stroke segment was accepted");
    std::cout << "BRUSH PASS storedSamples=1 halo=1 resampledStamps=" << coarseStamps.size() << '\n';
}

void historyFixtures() {
    CpuDocument document({24});
    const auto original = document.field().values();
    const auto initialGeneration = document.generation();
    Brush brush;
    document.beginStroke(3, brush);
    const auto first = document.field().values();
    check(!document.moveStroke(4, {0.2F, 0, 0}) && document.field().values() == first, "A second pointer edited another pointer's stroke");
    check(!document.endStroke(4) && document.strokeActive(), "A second pointer ended the owner stroke");
    document.moveStroke(3, {0.3F, 0, 0});
    document.endStroke(3);
    const auto edited = document.field().values();
    check(edited != original && document.undoCount() == 1, "Stroke did not commit one snapshot");
    check(document.undo() && document.field().values() == original, "Undo is not byte-exact field restoration");
    check(document.redo() && document.field().values() == edited, "Redo did not restore the committed field");
    document.beginStroke(5, brush);
    document.moveStroke(5, {0, 0.3F, 0});
    check(document.abortStroke(5) && document.field().values() == edited, "Blur/cancel rollback did not restore the before-stroke field");
    const auto afterAbort = document.generation();
    check(afterAbort > initialGeneration, "Restoring old data reused an obsolete generation");
    document.beginStroke(5, brush);
    document.reset({16}, Shape::separatedSpheres);
    check(!document.strokeActive() && !document.moveStroke(5, {0.1F, 0, 0}), "Old pointer continued writing after grid replacement");
    check(document.undoCount() == 0 && document.redoCount() == 0 && document.generation() > afterAbort, "Reset did not clear history and invalidate pending jobs");
    for (int stroke = 0; stroke < 7; ++stroke) {
        brush.center = {-0.3F + 0.1F * stroke, 0, 0};
        document.beginStroke(7, brush);
        document.endStroke(7);
    }
    check(document.undoCount() <= 4, "Stroke history exceeded its bounded snapshot count");
    std::cout << "HISTORY PASS ownership=1 undoRedo=1 rollback=1 reset=1 capacity=4\n";
}

} // namespace

int main() {
    try {
        gridFixtures();
        tetraFixtures();
        sharedFaceFixtures();
        meshFixtures();
        brushAndStrokeFixtures();
        historyFixtures();
        std::cout << "P44 CPU CORE PASS; GPU 128^3 and full app are not yet verified\n";
        return 0;
    } catch (const std::exception& error) {
        std::cerr << "P44 fixture failure: " << error.what() << '\n';
        return 1;
    }
}
