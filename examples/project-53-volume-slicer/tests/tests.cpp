#include "analysis.hpp"
#include "camera.hpp"
#include "context-mesh.hpp"
#include "display.hpp"
#include "layout.hpp"
#include <cstdlib>
#include <iostream>
#include <limits>
#include <numeric>

using namespace slice53;
namespace {
int checks = 0;
int failures = 0;

// Checks remain active in Release: no assert/NDEBUG dependency.
// [snippet check-release]
void check(bool condition, const char* message) {
    ++checks;
    if (!condition) {
        ++failures;
        std::cerr << "FAIL: " << message << '\n';
    }
}
// [/snippet check-release]

void near(double actual, double expected, double tolerance, const char* message) {
    check(std::isfinite(actual) && std::abs(actual - expected) <= tolerance, message);
}

template<class Operation>
void rejects(Operation operation, const char* message) {
    bool rejected = false;
    try { operation(); }
    catch (const std::exception&) { rejected = true; }
    check(rejected, message);
}
}

int main() {
    Grid grid;
    grid.size = {3, 2, 4};
    grid.origin = {-1, -2, -3};
    grid.spacing = {2, 4, 6};
    Volume fixture(grid);
    for (int z = 0; z < 4; ++z) {
        for (int y = 0; y < 2; ++y) {
            for (int x = 0; x < 3; ++x) {
                fixture.set(x, y, z, x + 10 * y + 100 * z);
                check(fixture.index(x, y, z) == static_cast<std::size_t>(x + 3 * y + 6 * z), "x-fastest address");
                near(sampleNearest(fixture, grid.centre(x, y, z)).value(), x + 10 * y + 100 * z, 0, "nearest at centre");
                near(sampleLinear(fixture, grid.centre(x, y, z)).value(), x + 10 * y + 100 * z, 0, "linear at centre");
            }
        }
    }
    rejects([&] { fixture.at(3, 0, 0); }, "reject invalid x");
    rejects([&] { fixture.at(0, -1, 0); }, "reject invalid y");
    rejects([&] { fixture.set(0, 0, 0, std::numeric_limits<double>::quiet_NaN()); }, "reject nonfinite scalar");
    rejects([] { makeGrid(0); }, "reject zero grid");
    rejects([] { makeGrid(129); }, "reject excessive allocation");
    Grid invalid = grid;
    invalid.spacing.z = 0;
    rejects([&] { Volume bad(invalid); }, "reject zero spacing before allocation");

    // [snippet known-eight]
    const Vec3 middle{1, 0, 3};
    const auto stencil = linearStencil(fixture, middle).value();
    double weights = 0;
    for (const Contribution& contribution : stencil) {
        weights += contribution.weight;
        check(contribution.weight >= 0, "convex weights");
    }
    near(weights, 1, 1e-15, "eight weights sum to one");
    near(sampleLinear(fixture, middle).value(), 50.5, 1e-12, "known half-cell result");
    // [/snippet known-eight]

    near(sampleNearest(fixture, middle).value(), 101, 0, "nearest ties choose higher indices");

    // The eight physical corners clamp to the nearest stored voxel centre.
    // Derive expected values from the fixture formula, not from the sampler.
    const Vec3 upperCorner = grid.origin + grid.extent();
    for (int z = 0; z < 2; ++z) {
        for (int y = 0; y < 2; ++y) {
            for (int x = 0; x < 2; ++x) {
                Vec3 corner = grid.origin;
                if (x == 1) corner.x = upperCorner.x;
                if (y == 1) corner.y = upperCorner.y;
                if (z == 1) corner.z = upperCorner.z;
                const double expected = 2 * x + 10 * y + 300 * z;
                near(sampleNearest(fixture, corner).value(), expected, 0, "nearest at physical corner");
                near(sampleLinear(fixture, corner).value(), expected, 0, "linear at physical corner");
            }
        }
    }
    near(sampleLinear(fixture, {1, -2, -3}).value(), 0.5, 1e-12, "linear along lower physical edge");
    near(sampleLinear(fixture, {1, 2, -3}).value(), 5.5, 1e-12, "linear across lower physical face");

    for (int axis = 0; axis < 3; ++axis) {
        Vec3 point = grid.centre(0, 0, 0);
        point[axis] = grid.origin[axis];
        check(sampleLinear(fixture, point).has_value(), "lower physical face accepted");
        point[axis] = std::nextafter(grid.origin[axis], -std::numeric_limits<double>::infinity());
        check(!sampleLinear(fixture, point), "outside lower face is miss");
        const double upper = (grid.origin + grid.extent())[axis];
        point[axis] = upper;
        check(sampleNearest(fixture, point).has_value(), "upper physical face accepted");
        point[axis] = std::nextafter(upper, std::numeric_limits<double>::infinity());
        check(!sampleNearest(fixture, point), "outside upper face is miss");
    }
    check(!sampleLinear(fixture, {std::numeric_limits<double>::infinity(), 0, 0}), "nonfinite query is miss");
    Grid single;
    single.size = {1, 1, 1};
    Volume constant(single);
    constant.set(0, 0, 0, 0.375);
    near(sampleLinear(constant, single.origin).value(), 0.375, 0, "singleton lower edge");
    near(sampleLinear(constant, single.origin + single.extent()).value(), 0.375, 0, "singleton upper corner");
    const Audit report = audit(fixture);
    check(report.failures == 0 && report.checks == 13 && report.residual < 1e-10, "independent affine oracle");

    for (int view = 0; view < 3; ++view) {
        const Axes axes = axesFor(view);
        const Vec3 point = slicePoint(grid, view, 0.25, 0.75, {1, 2, 3});
        near(point[axes.fixed], Vec3{1, 2, 3}[axes.fixed], 0, "slice fixed coordinate");
        near(point[axes.horizontal], grid.origin[axes.horizontal] + 0.25 * grid.extent()[axes.horizontal], 0, "slice horizontal orientation");
        near(point[axes.vertical], grid.origin[axes.vertical] + 0.75 * grid.extent()[axes.vertical], 0, "slice vertical orientation");
    }
    near(windowValue(0.5, {0.5, 0.5}), 0.5, 1e-15, "window centre");
    near(windowValue(0, {0.5, 0.5}), 0, 0, "window clips below");
    near(windowValue(1, {0.5, 0.5}), 1, 0, "window clips above");
    rejects([] { windowValue(0.5, {0.5, 0}); }, "reject invalid window");
    for (int side : {64, 128}) {
        Volume volume = buildVolume(Preset::Sphere, side);
        const Statistics statistics = measure(volume);
        check(volume.values().size() == static_cast<std::size_t>(side) * side * side, "real volume allocation");
        near(volume.grid().extent().x, 160, 0, "world extent does not depend on side");
        check(std::accumulate(statistics.bins.begin(), statistics.bins.end(), std::size_t{0}) == volume.values().size(), "histogram counts full data");
        for (int z = 0; z < side; z += 3)
            for (int y = 0; y < side; y += 3)
                for (int x = 0; x < side; x += 3) {
                    near(volume.at(x, y, z), volume.at(side - 1 - x, y, z), 0, "sphere x symmetry");
                    near(volume.at(x, y, z), volume.at(x, side - 1 - y, z), 0, "sphere y symmetry");
                    near(volume.at(x, y, z), volume.at(x, y, side - 1 - z), 0, "sphere z symmetry");
                }
        SliceImage image;
        renderSlice(volume, image, 0, {}, true);
        const auto saved = volume.values();
        std::vector<std::uint32_t> rgba;
        colorImage(image, rgba, {0.4, 0.2}, true);
        check(saved == volume.values(), "display never mutates scalar storage");
        for (int y = 0; y < 256; ++y)
            for (int x = 0; x < 128; ++x)
                near(image.scalar[x + y * 256], image.scalar[255 - x + y * 256], 1e-6, "slice symmetry");
    }
    // A camera ray reconstructed from a projected point must pass through that same point.
    const Vec3 measuredPoint{5, 12, -7};
    for (double yaw : {-0.8, 0.4, 1.7}) {
        Camera camera;
        camera.yaw = yaw;
        const CameraFrame frame = cameraFrame(camera, 640, 480);
        const Projection pixel = project(frame, measuredPoint).value();
        const Vec3 recovered = frame.eye + cameraRay(frame, pixel.x, pixel.y) * pixel.depth;
        near(length(recovered - measuredPoint), 0, 1e-10, "camera projection/ray round trip in mm");
    }
    const Rect fitted = sliceRect(makeGrid(128), 0, {0, 0, 400, 300});
    near(fitted.width / fitted.height, 160.0 / 192.0, 1e-14, "physical aspect, not square pixels");
    const auto picked = pickSlice(makeGrid(128), 0, fitted, fitted.x + fitted.width * 0.25, fitted.y + fitted.height * 0.75, {0, 0, 11});
    check(picked.has_value(), "pick within image");
    near(picked->x, -40, 1e-12, "picked world x");
    near(picked->y, -48, 1e-12, "picked world y with inverted rows");
    near(picked->z, 11, 0, "pick preserves fixed coordinate");
    check(!pickSlice(makeGrid(128), 0, fitted, fitted.x - 1, fitted.y, {}), "letterbox is not pickable");

    const std::vector<Vertex> triangle{{{-1, 0, 0}, {0, 0, 1}}, {{1, 0, 0}, {0, 0, 1}}, {{0, 2, 0}, {0, 0, 1}}};
    const auto clipped = clipPolygon(triangle, 0, 0, true);
    check(clipped.size() >= 3, "clipping retains a valid half triangle");
    for (const Vertex& vertex : clipped) {
        check(vertex.point.x <= 1e-12 && finite(vertex.point), "clipping respects selected half-space");
        near(length(vertex.normal), 1, 1e-12, "interpolated normal remains unit");
    }
    Volume context = buildVolume(Preset::Gaussian, 16);
    const auto beforeMesh = context.values();
    const Mesh mesh = buildContextMesh(context);
    check(!mesh.empty() && mesh.size() < maxContextTriangles, "context mesh comes from a real volume");
    for (const Triangle& face : mesh) {
        for (const Vertex& vertex : face) {
            check(finite(vertex.point) && context.grid().contains(vertex.point), "context vertex in physical box");
            near(length(vertex.normal), 1, 1e-9, "context normal finite/unit");
        }
    }
    check(beforeMesh == context.values(), "mesh zero padding does not alter scalar storage");
    std::cout << "P53: " << checks << " checks, " << failures << " failures\n";
    if (failures != 0) return EXIT_FAILURE;
    return EXIT_SUCCESS;
}
