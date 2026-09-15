#include "lab.hpp"

#include <cmath>
#include <cstdlib>
#include <iostream>
#include <string_view>

namespace {
int failures = 0;

// Runner này vẫn hoạt động trong Release, khác với assert khi NDEBUG được bật.
void check(bool condition, std::string_view label) {
    if (condition) {
        return;
    }
    ++failures;
    std::cerr << "FAIL: " << label << '\n';
}

bool nearlyEqual(double left, double right, double tolerance = 1e-9) {
    return std::abs(left - right) <= tolerance;
}
} // namespace

int main() {
    const lab::TetrahedronMesh localMesh = lab::makeTetrahedron();

    // Indexed mesh phải có winding nhất quán trước khi lighting được phép chạy.
    for (const lab::Face& face : localMesh.faces) {
        const auto vertices = lab::faceVertices(localMesh, face);
        const lab::Vec3 normal = lab::faceUnitNormal(vertices);
        const lab::Vec3 edgeAB = lab::subtract(vertices[1], vertices[0]);
        const lab::Vec3 edgeAC = lab::subtract(vertices[2], vertices[0]);
        check(lab::hasOutwardWinding(vertices), "every tetrahedron face has outward winding");
        check(nearlyEqual(lab::length(normal), 1.0), "face normal has unit length");
        check(nearlyEqual(lab::dot(normal, edgeAB), 0.0), "normal is perpendicular to edge AB");
        check(nearlyEqual(lab::dot(normal, edgeAC), 0.0), "normal is perpendicular to edge AC");
    }

    const lab::DirectionalLight frontLight = lab::makeDirectionalLight({0.0, 0.0, -4.0});
    check(
        nearlyEqual(lab::length(frontLight.surfaceToLight), 1.0),
        "directional light stores a unit surface-to-light vector"
    );
    check(
        nearlyEqual(lab::lambertDiffuse({0.0, 0.0, -1.0}, frontLight.surfaceToLight), 1.0),
        "aligned normal receives full diffuse light"
    );
    check(
        nearlyEqual(lab::lambertDiffuse({1.0, 0.0, 0.0}, frontLight.surfaceToLight), 0.0),
        "perpendicular normal receives no diffuse light"
    );
    check(
        nearlyEqual(lab::lambertDiffuse({0.0, 0.0, 1.0}, frontLight.surfaceToLight), 0.0),
        "back-facing normal clamps negative diffuse to zero"
    );

    const lab::Material material{{200.0, 100.0, 50.0}, 0.2, 0.8};
    const lab::LightingSample lit = lab::shadeMaterial(
        {0.0, 0.0, -1.0},
        frontLight,
        material
    );
    const lab::LightingSample unlit = lab::shadeMaterial(
        {0.0, 0.0, 1.0},
        frontLight,
        material
    );
    check(nearlyEqual(lit.intensity, 1.0), "ambient and diffuse reach full intensity");
    check(nearlyEqual(lit.shadedColor.red, 200.0), "full light preserves material red");
    check(nearlyEqual(unlit.intensity, 0.2), "back-facing surface keeps ambient light");
    check(nearlyEqual(unlit.shadedColor.green, 20.0), "ambient scales material color");

    const lab::TetrahedronMesh cameraMesh = lab::transformMesh(
        localMesh,
        0.35,
        -0.55,
        {0.0, 0.0, 5.0}
    );
    check(
        nearlyEqual(
            lab::length(lab::subtract(localMesh.vertices[0], localMesh.vertices[1])),
            lab::length(lab::subtract(cameraMesh.vertices[0], cameraMesh.vertices[1]))
        ),
        "rotation and translation preserve edge length"
    );

    int visibleFaces = 0;
    for (const lab::Face& face : cameraMesh.faces) {
        if (lab::isFrontFacing(lab::faceVertices(cameraMesh, face))) {
            ++visibleFaces;
        }
    }
    check(visibleFaces > 0, "camera sees at least one tetrahedron face");
    check(visibleFaces < 4, "back-face culling rejects at least one face");

    // Chạy hai lượt pipeline với cùng geometry nhưng hai hướng đèn khác nhau.
    // Lighting chỉ được đổi màu; face culling và coverage phải giữ nguyên.
    struct PipelineSummary {
        unsigned int visibleFaceMask{};
        std::size_t coveredCount{};
        double colorChecksum{};
    };

    const auto runPipeline = [&](const lab::DirectionalLight& light) {
        constexpr double verticalFov = 1.0471975511965976;
        constexpr double nearPlane = 1.0;
        const lab::Viewport viewport{320, 240};
        PipelineSummary summary{};

        for (std::size_t faceIndex = 0; faceIndex < cameraMesh.faces.size(); ++faceIndex) {
            const lab::Face& face = cameraMesh.faces[faceIndex];
            const auto vertices = lab::faceVertices(cameraMesh, face);
            if (!lab::isFrontFacing(vertices)) {
                continue;
            }
            summary.visibleFaceMask |= 1U << unsigned(faceIndex);

            const lab::Material faceMaterial{face.baseColor, 0.2, 0.8};
            const lab::LightingSample lighting = lab::shadeMaterial(
                lab::faceUnitNormal(vertices),
                light,
                faceMaterial
            );
            summary.colorChecksum += lighting.shadedColor.red +
                3.0 * lighting.shadedColor.green + 7.0 * lighting.shadedColor.blue;

            const lab::Triangle3 triangle{vertices};
            const lab::ClippedPolygon polygon = lab::clipTriangleToNearPlane(
                triangle,
                nearPlane
            );
            const lab::TriangleBatch batch = lab::triangulateFan(polygon);
            for (std::size_t index = 0; index < batch.count; ++index) {
                const auto projected = lab::projectTriangle(
                    batch.triangles[index],
                    verticalFov,
                    viewport,
                    nearPlane
                );
                if (!projected) {
                    continue;
                }
                const lab::RasterStats stats = lab::rasterizeTriangle(
                    *projected,
                    viewport.width,
                    viewport.height,
                    [](int, int) {
                    }
                );
                summary.coveredCount += stats.coveredCount;
            }
        }
        return summary;
    };

    const PipelineSummary frontPass = runPipeline(lab::makeDirectionalLight({0.0, 0.0, -1.0}));
    const PipelineSummary sidePass = runPipeline(lab::makeDirectionalLight({1.0, 0.0, 0.0}));
    check(
        frontPass.visibleFaceMask == sidePass.visibleFaceMask,
        "changing light direction does not change back-face culling"
    );
    check(
        frontPass.coveredCount == sidePass.coveredCount && frontPass.coveredCount > 0,
        "changing light direction does not change raster coverage"
    );
    check(
        !nearlyEqual(frontPass.colorChecksum, sidePass.colorChecksum),
        "changing light direction changes the shaded face colors"
    );

    const lab::Triangle3 crossingNear{{{
        {-0.8, -0.5, 0.5},
        {0.9, -0.5, 2.0},
        {0.0, 0.8, 2.5},
    }}};
    const lab::ClippedPolygon clipped = lab::clipTriangleToNearPlane(crossingNear, 1.0);
    check(clipped.count == 4, "one outside vertex clips to a four-vertex polygon");
    for (std::size_t index = 0; index < clipped.count; ++index) {
        check(lab::isFinite(clipped.vertices[index]), "clipped vertex remains finite");
        check(clipped.vertices[index].z >= 1.0 - 1e-9, "clipped vertex stays beyond near plane");
    }

    const lab::TriangleBatch batch = lab::triangulateFan(clipped);
    check(batch.count == 2, "clipped quad becomes two triangles");
    const lab::Viewport viewport{640, 480};
    std::size_t callbackCount = 0;
    const auto screenTriangle = lab::projectTriangle(batch.triangles[0], 1.0471975511965976, viewport, 1.0);
    check(screenTriangle.has_value(), "clipped triangle projects safely");
    if (screenTriangle) {
        const lab::RasterStats stats = lab::rasterizeTriangle(
            *screenTriangle,
            viewport.width,
            viewport.height,
            [&](int, int) {
                ++callbackCount;
            }
        );
        check(stats.coveredCount > 0, "projected face covers pixels");
        check(stats.coveredCount == callbackCount, "covered count equals shade callback count");
    }

    if (failures != 0) {
        std::cerr << failures << " checks failed.\n";
        return EXIT_FAILURE;
    }
    std::cout << "Project 19 validation passed.\n";
    return EXIT_SUCCESS;
}
