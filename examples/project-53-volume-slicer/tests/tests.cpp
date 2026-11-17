#include "cutaway-render.hpp"
#include "diagnostics.hpp"
#include "layout.hpp"
#include "state.hpp"
#include "statistics.hpp"
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

// [snippet fixture]
void checkKnownFixture() {
    using namespace slices;
    Volume fixture({{3, 2, 4}, {1, 2, 3}});
    for (int z = 0; z < 4; ++z) {
        for (int y = 0; y < 2; ++y) {
            for (int x = 0; x < 3; ++x) {
                fixture.values[fixture.index(x, y, z)] = 100 * z + 10 * y + x;
                const Point point{worldCoordinate(fixture.grid, 0, x), worldCoordinate(fixture.grid, 1, y), worldCoordinate(fixture.grid, 2, z)};
                check(sampleNearest(fixture, point).value() == 100 * z + 10 * y + x, "known centre nearest");
                check(closeEnough(sampleLinear(fixture, point).value(), 100 * z + 10 * y + x), "known centre linear");
            }
        }
    }
    check(fixture.index(2, 1, 3) == 23, "known final address");
    check(fixture.voxel(2, 1, 3) == 312, "known final voxel");
    const Point centre{worldCoordinate(fixture.grid, 0, 0.5), worldCoordinate(fixture.grid, 1, 0.5), worldCoordinate(fixture.grid, 2, 0.5)};
    check(closeEnough(sampleLinear(fixture, centre).value(), 55.5), "eight known corners average to 55.5");
    check(sampleNearest(fixture, centre).value() == 111, "nearest tie chooses upper centre");
    const Point offCentre{worldCoordinate(fixture.grid, 0, 0.25), worldCoordinate(fixture.grid, 1, 0.5), worldCoordinate(fixture.grid, 2, 0.75)};
    check(closeEnough(sampleLinear(fixture, offCentre).value(), 80.25), "unequal weights use each fraction independently");
    const Point low{lower(fixture.grid, 0), lower(fixture.grid, 1), lower(fixture.grid, 2)};
    const Point high{-low[0], -low[1], -low[2]};
    check(sampleNearest(fixture, low).value() == 0, "low physical corner");
    check(sampleLinear(fixture, high).value() == 312, "high physical corner replication");
    for (int axis = 0; axis < 3; ++axis) {
        Point outside = low;
        outside[axis] -= 1e-6;
        check(!sampleNearest(fixture, outside) && !sampleLinear(fixture, outside), "outside low face must miss");
        outside = high;
        outside[axis] += 1e-6;
        check(!sampleNearest(fixture, outside) && !sampleLinear(fixture, outside), "outside high face must miss");
    }
}

// [/snippet fixture]

void checkPhantomsAndScale() {
    using namespace slices;
    for (int side : {64, 128}) {
        Volume volume(makeGrid(side));
        check(volume.values.size() == static_cast<std::size_t>(side) * side * side, "real cubic allocation");
        check(closeEnough(-2 * lower(volume.grid, 0), 3.2), "resolution keeps physical extent");
        fillVolume(volume, Preset::Sphere);
        // Reflect every voxel across x, y, z: this also checks every centre slice.
        bool symmetric = true;
        for (int z = 0; z < side; ++z) {
            for (int y = 0; y < side; ++y) {
                for (int x = 0; x < side; ++x) {
                    const double value = volume.voxel(x, y, z);
                    symmetric = symmetric && value == volume.voxel(side - 1 - x, y, z) && value == volume.voxel(x, side - 1 - y, z) && value == volume.voxel(x, y, side - 1 - z);
                }
            }
        }
        check(symmetric, "sphere sample symmetry on all axes");
        if (side == 64) {
            bool sliceSymmetry = true;
            for (int view = 0; view < 3; ++view) {
                const auto image = sampleImage(volume.grid, view, {0, 0, 0}, true, volume);
                for (int y = 0; y < Image::side; ++y) {
                    for (int x = 0; x < Image::side; ++x) {
                        const auto at = static_cast<std::size_t>(x + y * Image::side);
                        const auto mirroredX = static_cast<std::size_t>(Image::side - 1 - x + y * Image::side);
                        const auto mirroredY = static_cast<std::size_t>(x + (Image::side - 1 - y) * Image::side);
                        sliceSymmetry = sliceSymmetry && closeEnough(image[at], image[mirroredX]) && closeEnough(image[at], image[mirroredY]);
                    }
                }
            }
            check(sliceSymmetry, "rendered scalar slices preserve sphere reflection");
        }
        const auto stats = histogram(volume);
        check(stats.samples == volume.values.size() && stats.minimum == 0 && stats.maximum == 1, "sphere range and histogram");
        std::size_t total = 0;
        for (auto count : stats.bins) {
            total += count;
        }
        check(total == volume.values.size(), "histogram counts every voxel once");
    }
    check(fieldValue({0, 0, 0}, Preset::Sphere) == 1 && fieldValue({1.1, 0, 0}, Preset::Sphere) == 0, "sphere known radii");
    check(closeEnough(fieldValue({0.85, 0, 0}, Preset::Gaussian), std::exp(-1.0)), "Gaussian radius is exp(-1), not sigma");
    check(fieldValue({0, 0, -1}, Preset::Layers) == 0.15 && fieldValue({0, 0, 0}, Preset::Layers) == 0.5 && fieldValue({0, 0, 1}, Preset::Layers) == 0.85, "layers known values");
}
} // namespace

int main() {
    using namespace slices;
    checkKnownFixture();
    checkPhantomsAndScale();
    State finalState;
    check(finalState.ready && finalState.grid.count[0] == 128 && finalState.volume.values.size() == 2097152, "final really opens 128 cubed");
    check(finalState.linear && finalState.color && finalState.cutaway && finalState.paused, "final defaults match lesson and controls");
    const double firstScalar = finalState.volume.values.front();
    check(!finalState.loadDataset(Preset::Sphere, 32), "unsupported resolution rejected");
    check(finalState.grid.count[0] == 128 && finalState.volume.values.front() == firstScalar && finalState.preset == Preset::Phantom && !finalState.error.empty(), "failed rebuild preserves previous dataset and exposes error");
    // The context surface is presentation only; extraction must preserve stored scalars.
    for (Preset preset : {Preset::Phantom, Preset::Sphere, Preset::Gaussian, Preset::Layers, Preset::Ramp}) {
        Volume sample(makeGrid(64));
        fillVolume(sample, preset);
        const auto original = sample.values;
        const auto mesh = extractSurface(sample);
        check(!mesh.empty() && mesh.size() < maxSurfaceTriangles, "bounded context surface for every preset");
        bool verticesValid = true;
        for (const auto& triangle : mesh) {
            for (const auto& vertex : triangle) {
                for (int axis = 0; axis < 3; ++axis) {
                    verticesValid = verticesValid && std::isfinite(vertex.point[axis]) && vertex.point[axis] >= lower(sample.grid, axis) - 1e-10 && vertex.point[axis] <= -lower(sample.grid, axis) + 1e-10;
                }
                verticesValid = verticesValid && closeEnough(std::hypot(vertex.normal[0], vertex.normal[1], vertex.normal[2]), 1, 1e-10);
            }
        }
        check(verticesValid, "finite bounded vertices and unit normals");
        check(sample.values == original, "mesh extraction does not modify volume");
    }
    const auto camera = cameraBasis({});
    check(closeEnough(dot(camera.forward, camera.up), 0) && closeEnough(dot(camera.right, camera.up), 0), "orthogonal camera basis");
    check(closeEnough(dot(camera.forward, camera.forward), 1), "normalized camera forward");
    const SurfaceTriangle triangle{{{{-1, -1, 1}, {0, 0, 1}}, {{1, -1, 1}, {0, 0, 1}}, {{-1, 1, 1}, {0, 0, 1}}}};
    double remainingArea = 0;
    for (const auto& piece : keepOutsideCorner(triangle, {})) {
        const auto edge1 = subtract(piece[1].point, piece[0].point);
        const auto edge2 = subtract(piece[2].point, piece[0].point);
        remainingArea += std::abs(cross(edge1, edge2)[2]) / 2;
    }
    check(closeEnough(remainingArea, 1.5), "corner removal preserves independently known area");
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
        for (double bad : {0.0, -1.0, std::numeric_limits<double>::quiet_NaN(), std::numeric_limits<double>::infinity()}) {
            Grid shape{{2, 2, 2}, {1, 1, 1}};
            shape.spacing[axis] = bad;
            bool rejected = false;
            try {
                Volume invalid(shape);
            } catch (const std::invalid_argument&) {
                rejected = true;
            }
            check(rejected, "nonpositive or nonfinite spacing rejected before allocation");
        }
    }
    const Point nonfinite{std::numeric_limits<double>::quiet_NaN(), 0, 0};
    check(!sampleNearest(volume, nonfinite) && !sampleLinear(volume, nonfinite), "nonfinite point must miss");

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
    for (int bits = 0; bits < 8; ++bits) {
        Point corner{};
        for (int axis = 0; axis < 3; ++axis) {
            corner[axis] = lower(volume.grid, axis);
            if ((bits & (1 << axis)) != 0) {
                corner[axis] = -corner[axis];
            }
        }
        const Rect area{20, 40, 300, 120};
        const auto projected = locatorPoint(volume.grid, corner, area);
        check(contains(area, projected[0], projected[1]), "all locator corners fit viewport");
    }
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
    const auto scalars = sampleImage(volume.grid, 0, cursor, true, volume);
    const auto image = colorImage(scalars, {0.4, 0.3}, false);
    check(volume.values == oldValues, "display preserves source scalars");
    for (std::size_t i = 0; i < image.rgba.size(); i += 4)
        check(image.rgba[i] == image.rgba[i + 1] && image.rgba[i] == image.rgba[i + 2] && image.rgba[i + 3] == 255, "RGBA byte layout");

    fillPhantom(volume);
    const auto report = auditVolume(volume);
    check(report.failures == 0 && report.residual <= 1e-12, "bounded independent audit");
    volume.values[0] = -0.1;
    check(auditVolume(volume).failures > 0, "audit detects invalid scalar");
    volume.values.clear();
    check(auditVolume(volume).failures > 0, "empty storage cannot pass an affine-only oracle");
    volume.values.resize(59, 0);
    check(auditVolume(volume).failures > 0, "truncated storage rejected");
    volume.values.resize(61, 0);
    check(auditVolume(volume).failures > 0, "oversized storage rejected");
    volume.values.resize(60, 0);
    volume.grid.spacing[1] = std::numeric_limits<double>::quiet_NaN();
    check(auditVolume(volume).failures > 0, "invalid mutated grid rejected");

    // Reject malformed input before writing any byte outside the RGBA destination.
    for (int count : {0, Image::side * Image::side - 1, Image::side * Image::side + 1}) {
        bool rejected = false;
        try {
            (void)colorImage(ScalarImage(static_cast<std::size_t>(count)), {0.5, 1}, false);
        } catch (const std::invalid_argument&) {
            rejected = true;
        }
        check(rejected, "scalar image dimensions checked before write");
    }
    for (double value : {std::numeric_limits<double>::quiet_NaN(), std::numeric_limits<double>::infinity(), -std::numeric_limits<double>::infinity()}) {
        bool rejected = false;
        try {
            (void)colorValue(value, true);
        } catch (const std::invalid_argument&) {
            rejected = true;
        }
        check(rejected, "nonfinite brightness rejected before integer conversion");
    }
    if (failures != 0) {
        return EXIT_FAILURE;
    }
    std::cout << "Volume slicer tests passed\n";
    return EXIT_SUCCESS;
}
