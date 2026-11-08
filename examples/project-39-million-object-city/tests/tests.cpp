#include "city_camera.hpp"
#include "city_mesh.hpp"
#include "city_scene.hpp"
#include "city_types.hpp"

#include <cstdlib>
#include <iostream>
#include <string_view>

namespace {

int failures = 0;

void check(bool condition, std::string_view label) {
    if (!condition) {
        ++failures;
        std::cerr << "FAIL: " << label << '\n';
    }
}

city::Object objectAt(city::Vec3 point, std::uint32_t id, std::uint32_t mesh) {
    city::Object object{};
    object.centerRadius = {point.x, point.y, point.z, 0.5F};
    object.halfX = object.halfY = object.halfZ = 0.25F;
    object.mesh = mesh;
    object.id = id;
    object.red = 0.4F;
    object.green = 0.6F;
    object.blue = 0.8F;
    return object;
}

city::Frustum boxFrustum() {
    return {{{1, 0, 0, 10}, {-1, 0, 0, 10}, {0, 1, 0, 10}, {0, -1, 0, 10}, {0, 0, 1, 10}, {0, 0, -1, 10}}};
}

void testPlanes() {
    // The expected classification is geometric, not produced by another classifier.
    const city::Frustum planes = boxFrustum();
    for (std::size_t plane = 0; plane < 6; ++plane) {
        city::Vec3 outside{};
        float coordinate = 11.0F;
        if (plane % 2 == 0) {
            coordinate = -coordinate;
        }
        if (plane / 2 == 0) {
            outside.x = coordinate;
        }
        if (plane / 2 == 1) {
            outside.y = coordinate;
        }
        if (plane / 2 == 2) {
            outside.z = coordinate;
        }
        check(city::sphereAccepted(planes, objectAt({}, 7, 0)), "center sphere is inside all six planes");
        check(city::rejectingPlane(planes, objectAt(outside, 7, 0)) == static_cast<int>(plane), "outside sphere is rejected by the expected plane");
        const city::Vec3 intersection = outside * (10.25F / 11.0F);
        check(city::sphereAccepted(planes, objectAt(intersection, 7, 0)), "sphere crossing a plane remains accepted");
        const city::Vec3 tangent = outside * (10.5F / 11.0F);
        check(city::sphereAccepted(planes, objectAt(tangent, 7, 0)), "exact tangency is conservative, not a pop-out");
    }
}

void testScanAndCompaction() {
    const std::array<city::Counts, 4> input{{{1, 0, 0, 1}, {0, 0, 0, 0}, {0, 1, 0, 1}, {1, 0, 0, 1}}};
    const std::vector<city::Counts> expected{{0, 0, 0, 0}, {1, 0, 0, 1}, {1, 0, 0, 1}, {1, 1, 0, 2}};
    check(city::cpuExclusiveScan(input) == expected, "four-channel exclusive scan golden values");
    check(city::cpuExclusiveScan({}).empty(), "empty scan has empty output");
    const std::array<city::Counts, 1> single{{{9, 7, 5, 3}}};
    check(city::cpuExclusiveScan(single) == std::vector<city::Counts>{{0, 0, 0, 0}}, "single exclusive prefix is zero");

    std::vector<city::Object> objects{
        objectAt({}, 101, 2), objectAt({20, 0, 0}, 5, 0), objectAt({1, 0, 0}, 999, 1), objectAt({2, 0, 0}, 42, 0), objectAt({3, 0, 0}, 2001, 1)};
    const auto visible = city::cpuVisibleIDs(objects, boxFrustum(), true);
    check(visible == std::vector<std::uint32_t>{3, 2, 4, 0}, "compaction is group-major and stable by record index, not sparse Object.id");
    check(city::cpuVisibleIDs(objects, boxFrustum(), false) == std::vector<std::uint32_t>{1, 3, 2, 4, 0}, "culling off retains all record indices");
    const city::GpuStats stats = city::cpuStatistics(objects, boxFrustum(), {}, true);
    check(stats.counts == city::Counts{1, 2, 1, 4}, "accepted counts by mesh and total");
    check(stats.integerStats == city::Counts{4, 42, 2001, 4}, "integer accepted sum/min/max with sparse IDs");
    check(stats.tested == 5U, "tested is resident N, not accepted count");
    check(city::distanceMatches(stats.minimumDistance, 0.0F) && city::distanceMatches(stats.maximumDistance, 3.0F), "center distance min/max use world units");
}

void testCommandsAndEmpty() {
    const auto commands = city::makeCommands({2, 0, 7, 9});
    check(commands[0].count == 36U && commands[0].firstIndex == 0U && commands[0].instanceCount == 2U, "first mesh command range");
    check(commands[1].count == 36U && commands[1].firstIndex == 36U && commands[1].instanceCount == 0U, "empty mesh group remains a valid zero-instance command");
    check(commands[2].count == 18U && commands[2].firstIndex == 72U && commands[2].instanceCount == 7U, "third mesh command range");
    for (const city::IndirectCommand command : commands) {
        check(command.baseVertex == 0 && command.baseInstance == 0U, "OpenGL 4.3 uses explicit group offsets instead of gl_BaseInstance");
    }
    const city::GpuStats empty = city::cpuStatistics({}, boxFrustum(), {}, true);
    check(empty.counts == city::Counts{} && empty.tested == 0U, "empty scene counts");
    check(std::isinf(empty.minimumDistance) && empty.minimumDistance > 0 && std::isinf(empty.maximumDistance) && empty.maximumDistance < 0, "empty distance identities are explicitly infinite");
    check(empty.integerStats == city::Counts{0, std::numeric_limits<std::uint32_t>::max(), 0, 0}, "empty integer reduction identities");
    for (const city::IndirectCommand command : city::makeCommands({})) {
        check(command.instanceCount == 0U, "zero visible cannot reuse a previous instance count");
    }
}

void testLimitsAndReferences() {
    // A 64-bit CPU accumulator detects values outside the uint32 GPU domain.
    const std::array<std::uint32_t, 5> values{3, 1, 9, 0, 7};
    const city::IntegerReduction result = city::cpuIntegerReduction(values);
    check(result.sum == 20 && result.minimum == 0 && result.maximum == 9, "independent integer sum/min/max fixture");
    const std::array<city::Counts, 2> overflow{{{std::numeric_limits<std::uint32_t>::max(), 0, 0, 0}, {1, 0, 0, 0}}};
    check(!city::scanInputFits(overflow), "prefix uint32 overflow is rejected before dispatch");
    check(city::scanInputFits({}), "empty scan fits integer domain");
    check(city::ceilDiv(1'000'003, city::kScanSpan) == 1954, "million-tail first scan level");
    check(city::ceilDiv(1954, city::kScanSpan) == 4 && city::ceilDiv(4, city::kScanSpan) == 1, "million-tail hierarchical scan has three levels");
    check(1954 * city::kScanSpan - 1'000'003 == 445, "million-tail zero padding covers exactly 445 lanes");
    check(!city::distanceMatches(std::numeric_limits<float>::quiet_NaN(), 1.0F), "NaN distance cannot pass tolerance");
    check(!city::distanceMatches(1.1F, 1.0F), "large distance error is rejected");
    check(!city::validObject(objectAt({}, 0, 3)), "invalid mesh ID rejected before buffer allocation");
    check(city::validObject(objectAt({}, 0, 2)), "well-formed fixture object is valid");
    check(sizeof(city::Object) == 48 && sizeof(city::GpuStats) == 48 && sizeof(city::IndirectCommand) == 20, "CPU/std430/indirect binary layouts");
}

void testCameraAndScene() {
    city::Camera camera{};
    const city::Frustum planes = camera.frustum(16.0F / 9.0F);
    for (const city::Vec4 plane : planes) {
        check(std::abs(city::length({plane.x, plane.y, plane.z}) - 1.0F) < 1.0e-5F, "extracted frustum planes are normalized");
    }
    check(city::sphereAccepted(planes, objectAt(camera.position + camera.forward() * 20.0F, 0, 0)), "camera forward point is in its frustum");
    check(!city::sphereAccepted(planes, objectAt(camera.position - camera.forward() * 20.0F, 0, 0)), "point behind camera is rejected");
    check(!city::sphereAccepted(planes, objectAt(camera.position + camera.forward() * (camera.farPlane * 2.0F), 0, 0)), "far plane rejects beyond draw distance");
    check(city::length(camera.ray(0, 0, 16.0F / 9.0F) - camera.forward()) < 1.0e-5F, "center picking ray matches camera forward");
    const auto object = city::makeObject(42, 39, 1'000'003);
    const auto again = city::makeObject(42, 39, 1'000'003);
    const auto otherSeed = city::makeObject(42, 40, 1'000'003);
    check(object.id == 42U && object.mesh < 3U && city::validObject(object), "generated million-scene record has stable ID and enclosing bounds");
    check(object.centerRadius.x == again.centerRadius.x && object.halfY == again.halfY && object.mesh == again.mesh, "same seed/count reproduces the record");
    check(object.halfY != otherSeed.halfY || object.mesh != otherSeed.mesh || object.red != otherSeed.red, "different seed changes scene content");
    const auto landmark = city::makeObject(4096, 39, 1'000'003);
    check(landmark.halfY == 95.0F && landmark.mesh == 1U, "landmark towers provide a recognizable scale cue");
    city::SceneBuilder builder{};
    builder.begin(100, 39);
    check(builder.advance() && builder.objects.size() == 100U && !builder.active, "small scene generation ends in a bounded chunk");
    builder.begin(20'000, 39);
    check(!builder.advance() && builder.objects.size() == 8192U, "large scene yields after one 8192-record chunk");
    builder.cancel();
    check(!builder.active && builder.objects.empty(), "scene generation can be cancelled between chunks");
    bool rejected = false;
    try {
        builder.begin(2'000'004, 39);
    } catch (const std::exception&) {
        rejected = true;
    }
    check(rejected, "oversized scene request fails before reserve/allocation");
}

} // namespace

void testMeshNormals() {
    // The model origin is inside every convex mesh. Outward faces have positive dot.
    const auto checkShape = [](std::span<const city::Vec3> corners, std::span<const unsigned> indices) {
        for (std::size_t index = 0; index < indices.size(); index += 3U) {
            const city::Vec3 a = corners[indices[index]];
            const city::Vec3 b = corners[indices[index + 1U]];
            const city::Vec3 c = corners[indices[index + 2U]];
            const city::Vec3 normal = city::cross(b - a, c - a);
            const city::Vec3 middle = (a + b + c) * (1.0F / 3.0F);
            check(city::dot(normal, middle) > 0.0F, "mesh winding produces outward-facing normals");
        }
    };
    checkShape(city::boxCorners(1.0F), city::kBoxIndices);
    checkShape(city::boxCorners(0.55F), city::kBoxIndices);
    checkShape(city::kPyramidCorners, city::kPyramidIndices);
    check(city::kBoxIndices.size() == 36U && city::kPyramidIndices.size() == 18U, "mesh index ranges agree with indirect commands");
}

int main() {
    testPlanes();
    testScanAndCompaction();
    testCommandsAndEmpty();
    testLimitsAndReferences();
    testCameraAndScene();
    testMeshNormals();
    if (failures != 0) {
        std::cerr << failures << " checks failed.\n";
        return EXIT_FAILURE;
    }
    std::cout << "All city CPU reference checks passed.\n";
    return EXIT_SUCCESS;
}
