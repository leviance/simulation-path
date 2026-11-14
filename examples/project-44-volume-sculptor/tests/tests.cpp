#include "sculpt_active_deadline.hpp"
#include "sculpt_camera.hpp"
#include "sculpt_cpu_mesh.hpp"
#include "sculpt_document.hpp"
#include "sculpt_field_file.hpp"
#include "sculpt_mesh_file.hpp"
#include "sculpt_mesh_topology.hpp"
#include "sculpt_slice.hpp"
#include <bit>
#include <cstring>
#include <iostream>
#include <map>
#include <sstream>
#include <string>

void testTetraPreview();
void testCpuTeachingStages();
void testGridGuides();
void testDirtyDependencies();
void testMeshSnapshotBytes();
void testEditorDigitKeys();
void testMeshReaderTriangles();
void testBenchmarkStatistics();

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
    rejects([&] {
        spec.sampleIndex(128, 0, 0);
    },
            "Out-of-range sample was accepted");
    rejects([] {
        GridSpec{1}.sampleCount();
    },
            "Grid with no cells was accepted");
    rejects([] {
        checkedProduct(std::numeric_limits<std::size_t>::max(), 2);
    },
            "Byte multiplication overflow was accepted");
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
    rejects([&] {
        plane.set(0, 0, 0, std::numeric_limits<float>::quiet_NaN());
    },
            "NaN field was accepted");
    rejects([&] {
        plane.sample({std::numeric_limits<float>::infinity(), 0, 0});
    },
            "Infinite probe was accepted");
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
    rejects([&] {
        edgePoint(a, a, 0);
    },
            "Repeated edge index was accepted");
    rejects([&] {
        edgePoint(b, b, std::numeric_limits<float>::quiet_NaN());
    },
            "Invalid isovalue was accepted");
    std::cout << "TETRA PASS masks=16 canonicalEdge=1 ties=1 outwardWinding=1\n";
}

using Segment = std::array<EdgeKey, 2>;
using Segments = std::map<Segment, int>;

Segments sharedFaceSegments(const CellTriangles& cell, int axis) {
    Segments result;
    for (std::uint32_t triangle = 0; triangle < cell.count; ++triangle) {
        const auto& vertices = cell.triangles[triangle].vertices;
        for (int edge = 0; edge < 3; ++edge) {
            const auto& a = vertices[edge];
            const auto& b = vertices[(edge + 1) % 3];
            const std::array<float, 3> pointA{a.point.x, a.point.y, a.point.z};
            const std::array<float, 3> pointB{b.point.x, b.point.y, b.point.z};
            if (std::abs(pointA[axis]) > 1e-6F || std::abs(pointB[axis]) > 1e-6F)
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
    for (int axis = 0; axis < 3; ++axis) {
        for (unsigned mask = 0; mask < 16; ++mask) {
            ScalarGrid grid({3});
            grid.fillPlane({1, 0.2F, 0.3F}, 0.11F);
            for (int v = 0; v < 2; ++v)
                for (int u = 0; u < 2; ++u) {
                    std::array<int, 3> coordinate{};
                    coordinate[axis] = 1;
                    coordinate[(axis + 1) % 3] = u;
                    coordinate[(axis + 2) % 3] = v;
                    float value = 0.9F;
                    if (mask & (1U << (v * 2 + u)))
                        value = -0.7F;
                    grid.set(coordinate[0], coordinate[1], coordinate[2], value);
                }
            std::array<int, 3> neighbor{};
            neighbor[axis] = 1;
            const auto first = sharedFaceSegments(polygonizeCell(grid, 0, 0, 0, 0), axis);
            const auto second = sharedFaceSegments(polygonizeCell(grid, neighbor[0], neighbor[1], neighbor[2], 0), axis);
            check(first == second, "Neighbor cells chose different shared-face segments");
        }
    }
    std::cout << "SHARED FACE PASS axes=3 faceMasks=48 including alternating signs\n";
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
    rejects([&] {
        extractCpu(plane, 0, 3);
    },
            "Capacity overflow silently truncated the mesh");
    ScalarGrid heavy({128});
    rejects([&] {
        extractCpu(heavy, 0);
    },
            "GPU-scale field was silently extracted on CPU");
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
    rejects([&] {
        coarse.advance({100, 0, 0});
    },
            "Unbounded stroke segment was accepted");
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

void fieldFileFixtures() {
    ModelSettings settings;
    settings.grid.samples = 32;
    settings.shape = Shape::torus;
    settings.isovalue = 0.075F;
    ScalarGrid grid(settings.grid);
    grid.fill(settings.shape);
    const auto& values = grid.values();
    std::ostringstream output(std::ios::out | std::ios::binary);
    FieldWriter writer(output, settings);
    for (std::size_t first = 0; first < values.size(); first += 509)
        writer.append(std::span(values).subspan(first, std::min<std::size_t>(509, values.size() - first)));
    writer.finish();
    const auto archive = output.str();
    check(archive.size() == fieldHeaderSize + values.size() * 4, "Field archive does not have the declared exact byte size");
    check(archive.substr(0, 7) == "SCLPT44" && static_cast<unsigned char>(archive[8]) == 1 && static_cast<unsigned char>(archive[12]) == 32, "Field header magic/version/resolution bytes are not the documented little-endian layout");
    std::istringstream input(archive, std::ios::in | std::ios::binary);
    FieldReader reader(input);
    check(reader.header().settings.shape == settings.shape && reader.header().settings.isovalue == settings.isovalue, "Field file lost its reset preset or isovalue");
    std::vector<float> restored;
    while (reader.readCount() < values.size()) {
        const auto part = reader.next(1003);
        restored.insert(restored.end(), part.begin(), part.end());
    }
    reader.finish();
    check(restored.size() == values.size() && std::memcmp(restored.data(), values.data(), values.size() * sizeof(float)) == 0, "Field archive round trip is not bit-exact");
    const std::array<float, 2> known{1.0F, -2.5F};
    const auto littleEndian = encodeFieldSamples(known);
    const std::array<unsigned char, 8> expectedBytes{0, 0, 128, 63, 0, 0, 32, 192};
    for (std::size_t byte = 0; byte < expectedBytes.size(); ++byte)
        check(std::to_integer<unsigned>(littleEndian[byte]) == expectedBytes[byte], "Field payload is not IEEE-754 binary32 in little-endian order");

    auto rejectArchive = [&](const std::string& bytes) {
        rejects([&] {
            std::istringstream source(bytes, std::ios::in | std::ios::binary);
            FieldReader invalid(source);
            while (invalid.readCount() < invalid.header().settings.grid.sampleCount())
                invalid.next();
            invalid.finish();
        },
                "Malformed field archive was accepted");
    };
    rejectArchive(archive.substr(0, 63));
    rejectArchive(archive.substr(0, archive.size() - 1));
    rejectArchive(archive + "x");
    for (const auto offset : {0U, 8U, 12U, 36U, 40U, 48U, 56U}) {
        auto changed = archive;
        changed[offset] ^= 0x40;
        rejectArchive(changed);
    }
    auto metadataChanged = archive;
    metadataChanged[32] ^= 1;
    rejectArchive(metadataChanged);
    auto payloadChanged = archive;
    payloadChanged.back() ^= 1;
    rejectArchive(payloadChanged);

    // A checksum is not a safety validator: a checksummed NaN must still be rejected.
    std::vector<std::byte> nanArchive(archive.size());
    std::memcpy(nanArchive.data(), archive.data(), archive.size());
    storeUnsigned(nanArchive, fieldHeaderSize, 0x7fc00000U, 4);
    FieldChecksum checksum(std::span(nanArchive).first(fieldHeaderSize));
    checksum.update(std::span(nanArchive).subspan(fieldHeaderSize));
    storeUnsigned(nanArchive, 48, checksum.value(), 8);
    rejectArchive(std::string(reinterpret_cast<const char*>(nanArchive.data()), nanArchive.size()));
    rejects([&] {
        writer.append(known);
    },
            "A finalized field writer accepted more samples");
    std::ostringstream partial;
    FieldWriter incomplete(partial, settings);
    rejects([&] {
        incomplete.finish();
    },
            "An incomplete file was marked complete");
    std::array<float, 1> infinity{std::numeric_limits<float>::infinity()};
    rejects([&] {
        incomplete.append(infinity);
    },
            "A nonfinite scalar was written to an archive");
    std::cout << "FIELD FILE PASS bytes=" << archive.size() << " roundTrip=bitExact metadataChecksum=1 malformed=13 checkedNaNRejected=1 boundedChunks=1\n";
}

void meshFileFixtures() {
    const std::array<SurfaceVertex, 3> triangle{{{{0.123456789F, 0, 0, 1}, {0, 0, 1, 0}}, {{1, 0, 0, 1}, {0, 0, 1, 0}}, {{0, 1, 0, 1}, {0, 0, 1, 0}}}};
    std::ostringstream output;
    MeshWriter writer(output);
    writer.append(triangle);
    check(output.str().find("f 1//1 2//2 3//3\n") != std::string::npos, "OBJ exporter wrote the wrong one-based triangle indices");
    std::istringstream input(output.str());
    MeshReader reader(input);
    while (!reader.complete())
        reader.readBatch(2);
    check(reader.summary().vertices == 3 && reader.summary().normals == 3 && reader.summary().triangles == 1, "Exported OBJ cannot be read as one complete position/normal triangle");
    check(reader.summary().hash == writer.summary().hash, "OBJ numeric digest differs from the writer digest");
    const std::string validPrefix = "v 0 0 0\nvn 0 0 1\nv 1 0 0\nvn 0 0 1\nv 0 1 0\nvn 0 0 1\n";
    const auto rejectsMesh = [&](const std::string& text) {
        rejects([&] {
            std::istringstream source(text);
            MeshReader invalid(source);
            while (!invalid.complete())
                invalid.readBatch();
        },
                "Malformed streamed OBJ was accepted");
    };
    rejectsMesh("");
    rejectsMesh("v nan 0 0\n");
    rejectsMesh("v 1e40 0 0\n");
    rejectsMesh("v 0 0 0\nvn 0 0 0\n");
    rejectsMesh(validPrefix + "f 0//1 2//2 3//3\n");
    rejectsMesh(validPrefix + "f 1//1 2//2 4//4\n");
    rejectsMesh(validPrefix + "f 1//1 2//2 2//2\n");
    rejectsMesh(validPrefix + "f 1//1 2//2 3//3 1//1\n");
    rejectsMesh(validPrefix + "f 1/1 2/2 3/3\n");
    rejectsMesh(std::string(256, 'x'));
    rejectsMesh(std::string(256, '\r'));
    rejectsMesh(validPrefix + "f 1//1 2//2 3//3\nvt 0 0\n");
    rejectsMesh(validPrefix + "f 1//1 2//2 3//3\nv 0 0 0\nvn 0 0 1\n");
    auto degenerate = triangle;
    degenerate[2] = degenerate[0];
    rejects([&] {
        writer.append(degenerate);
    },
            "Exporter accepted a zero-area triangle");
    rejects([&] {
        writer.append(std::span(triangle).first(2));
    },
            "Exporter accepted a partial triangle");
    std::cout << "MESH FILE PASS triangles=1 normals=3 numericDigestMatches=1 invalidCases=15 boundedLines=1\n";
}

} // namespace

void sliceFixtures() {
    const GridSpec grid{32};
    const auto normal = normalized({1, 2, -1});
    ScalarGrid plane(grid);
    plane.fillPlane(normal, 0.13F);
    const std::array<std::array<float, 2>, 5> coordinates{{{0, 0}, {0, 1}, {1, 0}, {1, 1}, {0.17F, 0.63F}}};
    for (int axis = 0; axis < 3; ++axis)
        for (int layer : {0, 16, 31})
            for (const auto uv : coordinates) {
                SliceState slice{true, axis, layer, uv[0], uv[1]};
                const float fixed = -1.5F + layer * grid.spacing();
                const float horizontal = -1.5F + 3 * uv[0], vertical = -1.5F + 3 * (1 - uv[1]);
                const std::array<Vec3, 3> expected{{{fixed, horizontal, vertical}, {vertical, fixed, horizontal}, {horizontal, vertical, fixed}}};
                const auto world = sliceWorldPoint(grid, slice);
                near(length(world - expected[axis]), 0, 0.000001, "Slice screen/world axis or vertical orientation is wrong");
                near(plane.sample(world), dot(expected[axis], normal) - 0.13, 0.000002, "Slice affine plane probe differs from its equation");
            }
    SliceState invalid{true, 3, 0, 0, 0};
    rejects([&] {
        sliceWorldPoint(grid, invalid);
    },
            "An invalid slice axis was accepted");
    invalid = {true, 0, 32, 0, 0};
    rejects([&] {
        sliceWorldPoint(grid, invalid);
    },
            "An absent slice layer was accepted");
    invalid = {true, 0, 0, std::numeric_limits<float>::quiet_NaN(), 0};
    rejects([&] {
        sliceWorldPoint(grid, invalid);
    },
            "A NaN slice coordinate was accepted");
    invalid = {true, 0, 0, 1.1F, 0};
    rejects([&] {
        sliceWorldPoint(grid, invalid);
    },
            "An out-of-range slice coordinate was accepted");
    std::cout << "SLICE COORDINATES PASS axes=3 layers=3 probeCoordinates=5 affineChecks=45 rejected=4\n";
}

void topologyOracleFixtures() {
    ScalarGrid grid({16});
    grid.fill(Shape::sphere);
    auto sphere = extractCpu(grid, 0).vertices;
    const auto closed = inspectMeshTopology(sphere);
    check(closed.closedOriented() && closed.components == 1 && closed.eulerCharacteristic() == 2, "Independent topology oracle did not recognize a closed sphere");
    auto reversed = sphere;
    std::swap(reversed[0], reversed[1]);
    check(inspectMeshTopology(reversed).inconsistentEdges == 3, "Topology oracle missed one reversed triangle");
    sphere.resize(sphere.size() - 3);
    check(inspectMeshTopology(sphere).boundaryEdges == 3, "Topology oracle missed a missing triangle");
    grid.fill(Shape::torus);
    const auto torus = inspectMeshTopology(extractCpu(grid, 0).vertices);
    check(torus.closedOriented() && torus.components == 1 && torus.eulerCharacteristic() == 0, "Topology oracle did not distinguish a tunnel from a sphere");
    grid.fill(Shape::separatedSpheres);
    const auto two = inspectMeshTopology(extractCpu(grid, 0).vertices);
    check(two.closedOriented() && two.components == 2 && two.eulerCharacteristic() == 4, "Topology oracle missed two disconnected components");
    rejects([&] {
        inspectMeshTopology(std::span<const SurfaceVertex>(sphere.data(), 2));
    },
            "Incomplete topology triangle was accepted");
    auto repeated = sphere;
    repeated[1] = repeated[0];
    rejects([&] {
        inspectMeshTopology(repeated);
    },
            "Topology triangle with repeated positions was accepted");
    std::cout << "TOPOLOGY ORACLE PASS sphereEuler=2 torusEuler=0 separateComponents=2 missingFace=1 reversedFace=1 invalidTriangles=2\n";
}

void brushParameterFixtures() {
    Brush brush;
    float depth = 0;
    adjustBrushParameter(brush, depth, BrushParameter::radius, true, false);
    near(brush.radius, 0.305, 0.000001, "Small brush radius step");
    for (const auto parameter : {BrushParameter::radius, BrushParameter::strength, BrushParameter::depth})
        for (int step = 0; step < 32; ++step)
            adjustBrushParameter(brush, depth, parameter, true, true);
    check(brush.radius == 0.6F && brush.strength == 0.8F && depth == 1, "Positive brush controls exceeded their bounds");
    for (const auto parameter : {BrushParameter::radius, BrushParameter::strength, BrushParameter::depth})
        for (int step = 0; step < 32; ++step)
            adjustBrushParameter(brush, depth, parameter, false, true);
    check(brush.radius == 0.03F && brush.strength == 0.01F && depth == -1, "Negative brush controls exceeded their bounds");
    rejects([&] {
        adjustBrushParameter(brush, depth, static_cast<BrushParameter>(3), true, false);
    },
            "Unknown brush control was accepted");
    depth = std::numeric_limits<float>::quiet_NaN();
    rejects([&] {
        adjustBrushParameter(brush, depth, BrushParameter::depth, true, false);
    },
            "NaN brush input was accepted");
    std::cout << "BRUSH PARAMETERS PASS smallStep=1 coarseSteps=192 bounds=6 invalid=2\n";
}

void jobAndCameraFixtures() {
    using Clock = ActiveDeadline::Clock;
    const Clock::time_point start{};
    ActiveDeadline budget(std::chrono::seconds(60), start);
    check(!budget.expired(start + std::chrono::seconds(3)), "A fresh work deadline expired early");
    budget.pause(true, start + std::chrono::seconds(3));
    check(!budget.expired(start + std::chrono::seconds(900)), "Human pause time consumed the active-work budget");
    budget.pause(false, start + std::chrono::seconds(900));
    check(!budget.expired(start + std::chrono::seconds(956)), "Paused budget resumed with the wrong active duration");
    check(budget.expired(start + std::chrono::seconds(957)), "Active work exceeded its exact deadline without expiring");
    rejects([&] {
        budget.expired(start);
    },
            "A backward clock was accepted");
    rejects([&] {
        ActiveDeadline invalid(Clock::duration::zero(), start);
    },
            "A zero deadline was accepted");
    Camera camera;
    camera.centerOn({6, 6, 6});
    const auto before = camera.target;
    camera.pan(1, 1);
    check(length(camera.target - before) < 0.1F, "Panning a translated document jumped the camera toward the world origin");
    camera.pan(1000000, 1000000);
    check(std::abs(camera.target.x - 6) <= 2.5F && std::abs(camera.target.y - 6) <= 2.5F && std::abs(camera.target.z - 6) <= 2.5F, "Camera pan exceeded its document-relative bound");
    ModelSettings settings;
    settings.grid.origin = {3, 3, 3};
    settings.validate();
    settings.grid.origin = {6, 6, 6};
    rejects([&] {
        settings.validate();
    },
            "An imported editing domain outside the brush working range was accepted");
    std::cout << "JOB AND CAMERA PASS simulatedPauseSeconds=897 noSleep=1 activeDeadline=60 translatedPan=1 importDomainGuard=1\n";
}

int main() {
    try {
        gridFixtures();
        tetraFixtures();
        sharedFaceFixtures();
        meshFixtures();
        brushAndStrokeFixtures();
        historyFixtures();
        fieldFileFixtures();
        meshFileFixtures();
        sliceFixtures();
        jobAndCameraFixtures();
        topologyOracleFixtures();
        brushParameterFixtures();
        testTetraPreview();
        testCpuTeachingStages();
        testGridGuides();
        testDirtyDependencies();
        testMeshSnapshotBytes();
        testEditorDigitKeys();
        testMeshReaderTriangles();
        testBenchmarkStatistics();
        std::cout << "P44 CPU CORE PASS; this CTest result does not verify GPU scale or native controls\n";
        return 0;
    } catch (const std::exception& error) {
        std::cerr << "P44 fixture failure: " << error.what() << '\n';
        return 1;
    }
}
