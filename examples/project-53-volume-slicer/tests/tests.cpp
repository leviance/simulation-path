#include "diagnostics.hpp"
#include "layout.hpp"
#include <cstdlib>
#include <iostream>
#include <string_view>

namespace {
int failures = 0;

// The checks remain active with NDEBUG; Release must exercise the same invariants.
void check(bool condition, std::string_view label) {
    if (!condition) {
        std::cerr << "FAIL: " << label << '\n';
        ++failures;
    }
}

bool closeEnough(double a, double b, double tolerance = 1e-12) {
    return std::isfinite(a) && std::abs(a - b) <= tolerance;
}
} // namespace

int main() {
    using namespace slices;
    Volume volume({{4, 3, 5}, {0.2, 0.3, 0.4}});
    check(volume.values.size() == 60, "noncubic allocation");
    check(volume.index(3, 2, 4) == 59, "x-fast row-major final index");
    check(volume.index(0, 1, 0) == 4 && volume.index(0, 0, 1) == 12, "row and layer stride");
    bool boundsRejected = false;
    try {
        (void)volume.voxel(-1, 0, 0);
    } catch (const std::out_of_range&) {
        boundsRejected = true;
    }
    check(boundsRejected, "bounds rejected");
    bool dimensionsRejected = false;
    try {
        Volume invalid({{129, 2, 2}, {1, 1, 1}});
    } catch (const std::invalid_argument&) {
        dimensionsRejected = true;
    }
    check(dimensionsRejected, "allocation budget enforced");

    for (int axis = 0; axis < 3; ++axis) {
        for (double index : {0.0, 0.5, 1.0, 2.0}) {
            check(closeEnough(gridCoordinate(volume.grid, axis, worldCoordinate(volume.grid, axis, index)), index), "world/grid round trip");
        }
    }
    // An affine field has a closed-form interpolation oracle independent of the sampler.
    for (int z = 0; z < 5; ++z) {
        for (int y = 0; y < 3; ++y) {
            for (int x = 0; x < 4; ++x) {
                const Point p{worldCoordinate(volume.grid, 0, x), worldCoordinate(volume.grid, 1, y), worldCoordinate(volume.grid, 2, z)};
                volume.values[volume.index(x, y, z)] = affine(p);
                check(closeEnough(sampleNearest(volume, p).value(), affine(p)), "nearest at centre");
                check(closeEnough(sampleLinear(volume, p).value(), affine(p)), "trilinear at centre");
            }
        }
    }
    const Point p{worldCoordinate(volume.grid, 0, 1.3), worldCoordinate(volume.grid, 1, 0.7), worldCoordinate(volume.grid, 2, 2.4)};
    check(closeEnough(sampleLinear(volume, p).value(), affine(p)), "trilinear exact affine interior");
    const Point edge{lower(volume.grid, 0), lower(volume.grid, 1), lower(volume.grid, 2)};
    check(closeEnough(sampleLinear(volume, edge).value(), volume.voxel(0, 0, 0)), "edge replication");
    check(!sampleLinear(volume, {edge[0] - 0.001, 0, 0}), "outside not clamped into valid sample");
    check(!sampleNearest(volume, {edge[0] - 0.001, 0, 0}), "nearest outside miss");
    Volume singleton({{1, 1, 1}, {0.1, 0.2, 0.3}});
    singleton.values[0] = 0.7;
    check(closeEnough(sampleLinear(singleton, {0, 0, 0}).value(), 0.7), "one voxel interpolation");
    fillOrientation(singleton);
    check(singleton.values[0] == 0, "one voxel orientation ramp");

    const Point cursor = initialPoint(volume.grid);
    for (int view = 0; view < 3; ++view) {
        const auto axes = axesFor(view);
        const auto point = slicePoint(volume.grid, view, cursor, 0.25, 0.75);
        check(closeEnough(point[axes.cut], cursor[axes.cut]), "plane preserves cut coordinate");
        check(closeEnough(point[axes.horizontal], lower(volume.grid, axes.horizontal) / 2), "horizontal direction");
        check(closeEnough(point[axes.vertical], lower(volume.grid, axes.vertical) / 2), "vertical inversion");
        const auto rect = fitSlice(volume.grid, view, {20, 30, 300, 220});
        const double aspect = volume.grid.count[axes.horizontal] * volume.grid.spacing[axes.horizontal] / (volume.grid.count[axes.vertical] * volume.grid.spacing[axes.vertical]);
        check(closeEnough(rect.width / rect.height, aspect), "physical aspect not voxel count aspect");
        const auto selected = pickSlice(volume.grid, view, cursor, rect, rect.x + 0.25 * rect.width, rect.y + 0.75 * rect.height);
        check(selected.has_value(), "pick within fitted image");
        if (selected) {
            for (int axis = 0; axis < 3; ++axis)
                check(closeEnough((*selected)[axis], point[axis]), "pixel/world pick agrees with slice");
        }
        check(!pickSlice(volume.grid, view, cursor, rect, rect.x - 1, rect.y), "letterbox not selectable");
    }

    check(windowValue(0.1, {0.5, 0.4}) == 0, "window black clamp");
    check(closeEnough(windowValue(0.5, {0.5, 0.4}), 0.5), "window midpoint");
    check(windowValue(0.9, {0.5, 0.4}) == 1, "window white clamp");
    bool widthRejected = false;
    try {
        (void)windowValue(0.5, {0.5, 0});
    } catch (const std::invalid_argument&) {
        widthRejected = true;
    }
    check(widthRejected, "zero window rejected");
    const auto oldValues = volume.values;
    const auto image = makeImage(volume.grid, 0, cursor, {0.4, 0.3}, true, volume);
    check(volume.values == oldValues, "display preserves source scalars");
    for (std::size_t i = 0; i < image.rgba.size(); i += 4)
        check(image.rgba[i] == image.rgba[i + 1] && image.rgba[i] == image.rgba[i + 2] && image.rgba[i + 3] == 255, "RGBA byte layout");

    fillPhantom(volume);
    const auto report = auditVolume(volume);
    check(report.failures == 0 && report.residual <= 1e-12, "bounded independent audit");
    volume.values[0] = -0.1;
    check(auditVolume(volume).failures > 0, "audit detects invalid scalar");
    if (failures != 0) {
        return EXIT_FAILURE;
    }
    std::cout << "Volume slicer tests passed\n";
    return EXIT_SUCCESS;
}
