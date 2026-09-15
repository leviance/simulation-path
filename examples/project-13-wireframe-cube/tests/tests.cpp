#include "lab.hpp"

#include <algorithm>
#include <cmath>
#include <cstdlib>
#include <iostream>
#include <string_view>

namespace {
int failures = 0;

bool nearlyEqual(double left, double right, double epsilon = 1e-9) {
    return std::abs(left - right) <= epsilon;
}

bool nearlyEqual(lab::Vec3 left, lab::Vec3 right, double epsilon = 1e-9) {
    return nearlyEqual(left.x, right.x, epsilon) && nearlyEqual(left.y, right.y, epsilon) &&
        nearlyEqual(left.z, right.z, epsilon);
}

void check(bool condition, std::string_view label) {
    if (condition) {
        return;
    }
    std::cerr << "FAILED: " << label << '\n';
    ++failures;
}
} // namespace

int main() {
    constexpr double halfExtent = 1.25;
    const lab::CubeVertices localVertices = lab::makeCubeVertices(halfExtent);

    // Quy ước index phải tạo đủ tám tổ hợp dấu quanh local origin.
    check(localVertices.size() == 8, "cube has eight vertices");
    check(nearlyEqual(localVertices[0], {-1.25, -1.25, -1.25}), "vertex 0 convention");
    check(nearlyEqual(localVertices[3], {-1.25, 1.25, -1.25}), "vertex 3 convention");
    check(nearlyEqual(localVertices[4], {-1.25, -1.25, 1.25}), "vertex 4 convention");
    check(nearlyEqual(localVertices[6], {1.25, 1.25, 1.25}), "vertex 6 convention");

    // Topology cube có 12 edge duy nhất và mỗi vertex có degree bằng ba.
    check(lab::kCubeEdges.size() == 12, "cube has twelve edges");
    check(lab::hasValidCubeTopology(), "cube topology is valid and unique");
    const std::array<int, lab::kCubeVertexCount> degrees = lab::cubeVertexDegrees();
    check(
        std::all_of(degrees.begin(), degrees.end(), [](int degree) {
            return degree == 3;
        }),
        "every cube vertex has degree three"
    );

    // Mỗi cạnh của cube local có độ dài đúng 2h.
    const std::array<double, lab::kCubeEdges.size()> edgeLengths = lab::cubeEdgeLengths(localVertices);
    check(
        std::all_of(edgeLengths.begin(), edgeLengths.end(), [](double length) {
            return nearlyEqual(length, 2.5);
        }),
        "all local edges have length two times half extent"
    );

    const lab::EulerAngles angles{0.35, -0.70, 0.25};
    const lab::CubeVertices rotatedXyz = lab::rotateCube(
        localVertices,
        angles,
        lab::RotationOrder::Xyz
    );
    const lab::CubeVertices rotatedZyx = lab::rotateCube(
        localVertices,
        angles,
        lab::RotationOrder::Zyx
    );
    check(
        lab::maximumCubeEdgeLengthError(localVertices, rotatedXyz) < 1e-9,
        "XYZ keeps all edge lengths"
    );
    check(
        lab::maximumCubeEdgeLengthError(localVertices, rotatedZyx) < 1e-9,
        "ZYX keeps all edge lengths"
    );
    check(
        lab::cubeRotationRoundTripError(localVertices, angles, lab::RotationOrder::Xyz) < 1e-9,
        "XYZ rotation round trip"
    );
    check(
        lab::cubeRotationRoundTripError(localVertices, angles, lab::RotationOrder::Zyx) < 1e-9,
        "ZYX rotation round trip"
    );
    check(
        lab::magnitude(lab::subtract(rotatedXyz[0], rotatedZyx[0])) > 1e-4,
        "rotation order changes vertex position"
    );

    // Projection cache phải chứa đúng tám kết quả và edge visibility dùng lại cache đó.
    const lab::CubeVertices worldVertices = lab::translateCube(rotatedXyz, {0.0, 0.0, 6.0});
    const lab::Camera3D camera{};
    const lab::PerspectiveLens lens{};
    const lab::ProjectedCube projected = lab::projectCube(
        worldVertices,
        camera,
        lens,
        0.5,
        960,
        640
    );
    check(projected.projectionCount == 8, "exactly eight projection calls are cached");
    check(lab::countVisibleVertices(projected) == 8, "default cube has eight visible vertices");
    check(lab::countVisibleEdges(projected) == 12, "default cube has twelve visible edges");

    const lab::VisibleEdgeList visibleEdges = lab::visibleEdgesBackToFront(projected);
    check(visibleEdges.count == 12, "depth list contains all visible edges");
    for (std::size_t index = 1; index < visibleEdges.count; ++index) {
        check(
            visibleEdges.items[index - 1].averageDepth >= visibleEdges.items[index].averageDepth,
            "visible edges are sorted from far to near"
        );
    }
    for (std::size_t index = 0; index < visibleEdges.count; ++index) {
        check(
            visibleEdges.items[index].depthFactor >= 0.0 &&
                visibleEdges.items[index].depthFactor <= 1.0,
            "depth factor stays normalized"
        );
    }

    lab::CubeVertices partlyHidden = lab::makeCubeVertices(halfExtent, {0.0, 0.0, 6.0});
    partlyHidden[0] = {0.0, 0.0, -1.0};
    const lab::ProjectedCube hiddenProjection = lab::projectCube(
        partlyHidden,
        camera,
        lens,
        0.5,
        960,
        640
    );
    check(hiddenProjection.vertices[0].status == lab::ProjectionStatus::BehindCamera, "behind status is preserved");
    check(lab::countVisibleEdges(hiddenProjection) == 9, "three incident edges hide with one vertex");

    // Input math và delta time vẫn test được mà không cần SDL event.
    const lab::EulerAngles dragged = lab::applyMouseDrag({}, 20.0, -10.0, 0.01);
    check(nearlyEqual(dragged.yaw, 0.2), "mouse X changes yaw");
    check(nearlyEqual(dragged.pitch, 0.1), "mouse Y changes pitch with screen convention");
    const lab::EulerAngles clamped = lab::applyMouseDrag({}, 0.0, -10000.0, 0.01);
    check(nearlyEqual(clamped.pitch, 89.0 * lab::kPi / 180.0), "mouse pitch clamp");

    const lab::EulerAngles velocity{1.0, 2.0, 3.0};
    const lab::EulerAngles noBackwardTime = lab::advanceEulerAngles({}, velocity, -1.0);
    const lab::EulerAngles clampedFrame = lab::advanceEulerAngles({}, velocity, 1.0);
    check(nearlyEqual(noBackwardTime.pitch, 0.0), "negative delta time is clamped");
    check(nearlyEqual(clampedFrame.pitch, 0.1), "long frame is clamped to 0.1 seconds");
    check(nearlyEqual(clampedFrame.yaw, 0.2), "clamped frame updates yaw");

    if (failures != 0) {
        std::cerr << failures << " Project 13 validation check(s) failed\n";
        return EXIT_FAILURE;
    }
    std::cout << "All Project 13 validation checks passed\n";
    return EXIT_SUCCESS;
}
