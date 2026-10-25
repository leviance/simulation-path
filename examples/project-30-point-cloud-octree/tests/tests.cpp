#include "io/files.hpp"
#include "survey/benchmark.hpp"
#include "view/render.hpp"
#include <cstdlib>
#include <iostream>
#include <sstream>
#include <string_view>

namespace {
std::size_t failures = 0;
std::size_t checks = 0;

void check(bool condition, std::string_view message) {
    ++checks;
    if (!condition) {
        ++failures;
        std::cerr << "FAIL: " << message << '\n';
    }
}

std::vector<std::uint32_t> ids(const std::vector<survey::Point>& points, const survey::Result& result) {
    std::vector<std::uint32_t> output;
    for (auto index : result.indices) {
        output.push_back(points.at(index).id);
    }
    std::sort(output.begin(), output.end());
    return output;
}

// Oracle độc lập dùng long double, không gọi accepts hoặc mayOverlap.
std::vector<std::uint32_t> oracle(const std::vector<survey::Point>& points, const survey::Region& region) {
    std::vector<std::uint32_t> output;
    for (const auto& point : points) {
        const auto p = point.position;
        const long double dx = std::abs(static_cast<long double>(p.x) - region.center.x);
        const long double dy = std::abs(static_cast<long double>(p.y) - region.center.y);
        const long double dz = std::abs(static_cast<long double>(p.z) - region.center.z);
        bool hit = dx <= region.half.x && dy <= region.half.y && dz <= region.half.z;
        if (region.shape == survey::Shape::Sphere) {
            hit = dx * dx + dy * dy + dz * dz <= static_cast<long double>(region.radius) * region.radius;
        }
        if (hit && p.y >= region.minimumHeight && p.y <= region.maximumHeight) {
            output.push_back(point.id);
        }
    }
    std::sort(output.begin(), output.end());
    return output;
}

void testCsv() {
    const std::vector<std::string> malformed{
        "x,y,z\n1,2,3\n", "id,x,y,z\n1,0,0,0\n1,1,1,1\n",
        "id,x,y,z\n2,nan,0,0\n", "id,x,y,z\n2,inf,0,0\n",
        "id,x,y,z\n-1,0,0,0\n", "id,x,y,z\n4294967296,0,0,0\n",
        "id,x,y,z\n1,10001,0,0\n", "id,x,y,z\n1,0,0\n",
        "id,x,y,z\n1,0,0,0,2\n", "id,x,y,z\n1,1oops,0,0\n",
        "id,x,y,z\n" + std::string(513, '1') + "\n"};
    for (const auto& text : malformed) {
        bool rejected = false;
        try {
            std::istringstream input(text);
            static_cast<void>(survey::readCsv(input));
        } catch (const std::exception&) {
            rejected = true;
        }
        check(rejected, "malformed CSV is rejected without partial data");
    }
    std::istringstream empty("id,x,y,z\n");
    check(survey::readCsv(empty).empty(), "header-only export is valid");
    std::istringstream longestCrLf("id,x,y,z\r\n1,0." + std::string(503, '0') + ",0,0\r\n");
    check(survey::readCsv(longestCrLf).size() == 1, "511-byte row also accepts CRLF");
    const auto fixture = std::filesystem::path(__FILE__).parent_path().parent_path() / "assets/room-fixture.csv";
    const auto points = survey::readCloudFile(fixture);
    check(points.size() == 14 && points.front().id == 41, "provided CSV retains non-contiguous IDs and coincident points");
    const auto root = survey::rootFor(points);
    for (const auto& point : points) {
        check(survey::contains(root, point.position), "negative coordinates fit root");
    }
}

void testQueries() {
    const std::vector<survey::Point> points{
        {40, {-1, 0, 0}}, {8, {1, 0, 0}}, {91, {0, 1, 0}}, {92, {0, 0, 1}}, {1001, {0, 0, 0}}, {7, {0, 0, 0}}, {99, {2, 2, 2}}};
    const survey::Octree tree(points, 4);
    check(tree.nodes.size() > 1, "fixture forces a real split");
    check(survey::topologyErrors(tree, points) == 0, "each point index appears in exactly one leaf");
    for (const auto& region : survey::validationRegions(tree.nodes[0].bounds)) {
        check(ids(points, tree.query(points, region)) == oracle(points, region), "box/sphere/filter IDs match independent oracle");
    }
    survey::Region sphere{};
    sphere.shape = survey::Shape::Sphere;
    sphere.center = {};
    sphere.radius = 1;
    check(ids(points, tree.query(points, sphere)) == std::vector<std::uint32_t>({7, 8, 40, 91, 92, 1001}), "sphere includes boundary and coincident IDs");
    sphere.minimumHeight = 0;
    sphere.maximumHeight = 0;
    const auto selected = tree.query(points, sphere);
    check(ids(points, selected) == std::vector<std::uint32_t>({7, 8, 40, 92, 1001}), "inclusive height filter");
    const auto summary = survey::statistics(points, selected.indices);
    check(summary.count == 5, "independent count fixture");
    check(summary.bounds.minimum.x == -1 && summary.bounds.maximum.x == 1 && summary.bounds.maximum.z == 1, "independent bounds fixture");
    check(summary.centroid.x == 0 && summary.centroid.y == 0 && std::abs(summary.centroid.z - 0.2) < 1e-15, "independent centroid fixture");
    const auto none = survey::statistics(points, {});
    check(none.count == 0 && survey::finite(none.centroid), "empty selection does not create NaN");
    const std::vector<survey::Point> duplicates(1000, {1, {0, 0, 0}});
    const survey::Octree coincident(duplicates, 4);
    check(coincident.nodes.size() <= 1 + 8 * coincident.maximumDepth, "coincident point split is bounded");
    check(survey::topologyErrors(coincident, duplicates) == 0, "coincident storage is not duplicated");
}

void testFrustumAndImages() {
    survey::Camera camera{};
    camera.freeFly = true;
    camera.eye = {};
    camera.yaw = 0;
    camera.pitch = 0;
    camera.nearPlane = 1;
    camera.farPlane = 10;
    camera.fov = 1.5707963267948966;
    const std::vector<survey::Point> points{
        {10, {0, 0, -1}}, {11, {-1, 0, -1}}, {12, {1, 0, -1}}, {13, {0, 1, -1}}, {14, {0, -1, -1}}, {15, {0, 0, -10}}, {20, {0, 0, -0.999}}, {21, {1.001, 0, -1}}, {22, {0, 0, -10.001}}, {23, {0, 0, 1}}};
    const survey::Octree tree(points, 4);
    check(ids(points, tree.query(points, survey::cameraFrustum(camera, 1))) == std::vector<std::uint32_t>({10, 11, 12, 13, 14, 15}), "independent near/far/four-side boundary fixture");
    const auto before = survey::cameraBasis(camera);
    survey::switchCameraMode(camera);
    const auto after = survey::cameraBasis(camera);
    check(survey::dot(before.eye - after.eye, before.eye - after.eye) < 1e-20, "switch mode preserves camera eye");
    survey::Scene large({{1, {-10000, 0, -10000}}, {2, {10000, 0, 10000}}});
    survey::refreshVisible(large, 640, 360);
    check(large.visible.indices.size() == 2, "camera far plane fits allowed large coordinate input");
    survey::Scene scene(survey::makeRoom(100000));
    scene.selectionEnabled = true;
    survey::refreshSelection(scene);
    survey::Framebuffer indexed(640, 360);
    survey::Framebuffer reference(640, 360);
    for (int pose = 0; pose < 3; ++pose) {
        if (pose == 1) {
            scene.camera.freeFly = true;
            scene.camera.eye = {0, 3, 0};
        }
        if (pose == 2) {
            scene.camera.yaw += 1.1;
            scene.camera.pitch = -0.3;
        }
        scene.culling = true;
        survey::refreshVisible(scene, 640, 360);
        const auto culled = scene.visible;
        survey::renderPoints(scene, indexed);
        check(scene.drawn == culled.indices.size(), "draw every visible point without sampling");
        scene.culling = false;
        survey::refreshVisible(scene, 640, 360);
        survey::renderPoints(scene, reference);
        check(survey::sameIndices(culled, scene.visible), "culling does not lose visible points");
        check(indexed.pixels == reference.pixels, "CPU images match pixel for pixel with culling toggled");
    }
}

void testLargeWorkflow() {
    std::ostringstream text;
    survey::writeCsv(text, survey::makeRoom(100000));
    std::istringstream input(text.str());
    survey::Scene scene(survey::readCsv(input));
    check(scene.points.size() == 100000, "open 100000-point room through CSV parser");
    check(survey::topologyErrors(scene.tree, scene.points) == 0, "100k topology");
    scene.selectionEnabled = true;
    scene.region.center = {0, 0, 0};
    scene.region.half = {12, 0.1, 9};
    scene.region.minimumHeight = 0;
    scene.region.maximumHeight = 0;
    survey::refreshSelection(scene);
    check(scene.summary.count == 20000, "floor recipe count is independently known as 20000");
    check(ids(scene.points, scene.selected) == oracle(scene.points, scene.region), "100k selected IDs match independent oracle");
    std::ostringstream output;
    survey::writeCsv(output, survey::selectedPoints(scene.points, scene.selected));
    std::istringstream restoredInput(output.str());
    const auto restored = survey::readCsv(restoredInput);
    const auto expected = survey::selectedPoints(scene.points, scene.selected);
    check(restored.size() == expected.size(), "export/read-back keeps count");
    for (std::size_t i = 0; i < restored.size(); ++i) {
        const auto delta = restored[i].position - expected[i].position;
        check(restored[i].id == expected[i].id && survey::dot(delta, delta) == 0, "CSV precision preserves IDs and coordinates exactly");
    }
    // File IO thật bên cạnh kiểm chuỗi: chỉ tạo/xóa file do test sở hữu.
    std::filesystem::create_directories(".runtime");
    const std::filesystem::path outputPath = ".runtime/p30-test-" + std::to_string(survey::Clock::now().time_since_epoch().count()) + ".csv";
    survey::writeNewCloudFile(outputPath, expected);
    const auto fromDisk = survey::readCloudFile(outputPath);
    check(fromDisk.size() == expected.size(), "export file can be opened independently");
    for (std::size_t i = 0; i < fromDisk.size(); ++i) {
        const auto delta = fromDisk[i].position - expected[i].position;
        check(fromDisk[i].id == expected[i].id && survey::dot(delta, delta) == 0, "disk export preserves IDs/coordinates");
    }
    bool refusedOverwrite = false;
    try {
        survey::writeNewCloudFile(outputPath, {});
    } catch (const std::exception&) {
        refusedOverwrite = true;
    }
    check(refusedOverwrite && survey::readCloudFile(outputPath).size() == expected.size(), "existing output is not overwritten");
    std::filesystem::remove(outputPath);
    auto validation = survey::startValidation(scene);
    for (std::size_t tick = 0; validation.active && tick < 10000; ++tick) {
        survey::tickValidation(validation, scene);
    }
    check(!validation.active && validation.errors == 0, "finite reference job completes");
    auto benchmark = survey::startBenchmark(scene);
    benchmark.paused = true;
    survey::tickBenchmark(benchmark, scene);
    check(benchmark.queryIndex == 0, "pause prevents progress");
    benchmark.paused = false;
    for (std::size_t tick = 0; benchmark.active && tick < 10000; ++tick) {
        survey::tickBenchmark(benchmark, scene);
    }
    check(!benchmark.active && benchmark.report.find("Brute") != std::string::npos, "benchmark finishes both methods");
    survey::Scene uniform(survey::makeRoom(100000, 30, true));
    check(uniform.points.size() == 100000 && survey::topologyErrors(uniform.tree, uniform.points) == 0, "uniform preset uses real 100k points");
    scene.tree.nodes[0].children[0] = 0;
    check(!survey::startValidation(scene).active, "corrupt topology stops before query can cycle");
    check(!survey::startBenchmark(scene).active, "corrupt topology also stops benchmark");
}
} // namespace

int main() {
    try {
        testCsv();
        testQueries();
        testFrustumAndImages();
        testLargeWorkflow();
    } catch (const std::exception& error) {
        ++failures;
        std::cerr << error.what() << '\n';
    }
    std::cout << "P30 Survey: " << checks << " checks, " << failures << " failures\n";
    if (failures != 0) {
        return EXIT_FAILURE;
    }
    return EXIT_SUCCESS;
}
