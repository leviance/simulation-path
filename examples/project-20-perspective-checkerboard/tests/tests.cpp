#include "lab.hpp"

#include <cmath>
#include <cstdlib>
#include <iostream>
#include <string_view>
#include <vector>

namespace {
int failures = 0;

// Runner này vẫn kiểm tra điều kiện trong Release, không phụ thuộc assert/NDEBUG.
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

bool sameColor(lab::Color left, lab::Color right) {
    return nearlyEqual(left.red, right.red) && nearlyEqual(left.green, right.green) &&
        nearlyEqual(left.blue, right.blue);
}
} // namespace

int main() {
    const lab::TexturedQuad quad = lab::makeTiltedQuad();
    check(quad.vertices.size() == 4, "quad has four shared vertices");
    check(quad.faces.size() == 2, "quad has two indexed triangles");
    check(nearlyEqual(quad.vertices[0].uv.x, 0.0), "near-left corner starts at u zero");
    check(nearlyEqual(quad.vertices[2].uv.y, 0.0), "top-right corner starts at v zero");

    // Texture sampling phải có behavior rõ ràng ở biên và ngoài miền UV.
    const lab::Texture2D texture = lab::makeCheckerTexture(8, 8, 4);
    check(texture.texels.size() == 64, "checker texture owns width times height texels");
    check(
        lab::nearestTexelIndex(texture, {1.0, 1.0}, lab::AddressMode::clamp) ==
            std::array<int, 2>{7, 7},
        "clamp maps uv one to the last texel"
    );
    check(
        lab::nearestTexelIndex(texture, {1.0, 1.0}, lab::AddressMode::repeat) ==
            std::array<int, 2>{0, 0},
        "repeat wraps uv one to texel zero"
    );
    check(
        lab::nearestTexelIndex(texture, {-0.1, 1.1}, lab::AddressMode::repeat) ==
            std::array<int, 2>{7, 0},
        "repeat handles negative uv with a positive wrapped coordinate"
    );
    check(
        !sameColor(
            lab::sampleNearest(texture, {0.1, 0.1}, lab::AddressMode::clamp),
            lab::sampleNearest(texture, {0.3, 0.1}, lab::AddressMode::clamp)
        ),
        "neighbor checker cells use different colors"
    );

    constexpr double verticalFov = 1.0471975511965976;
    constexpr double nearPlane = 1.0;
    const lab::Viewport viewport{0, 0, 640, 480};
    const auto tiltedScreen = lab::projectTriangle(
        lab::quadTriangle(quad, 0),
        verticalFov,
        viewport,
        nearPlane
    );
    check(tiltedScreen.has_value(), "tilted textured triangle projects");
    if (tiltedScreen) {
        const lab::Barycentric weights{0.2, 0.3, 0.5};
        const lab::Vec2 affine = lab::interpolateAffineUv(*tiltedScreen, weights);
        const lab::Vec2 reference = lab::referenceUvFromCameraDepths(*tiltedScreen, weights);
        const auto corrected = lab::interpolatePerspectiveUv(*tiltedScreen, weights);
        check(corrected.has_value(), "positive reciprocal depth produces corrected uv");
        if (corrected) {
            check(
                lab::uvDistance(*corrected, reference) <= 1e-12,
                "reciprocal interpolation matches camera-depth reference"
            );
            check(
                lab::uvDistance(affine, *corrected) > 0.05,
                "tilted triangle exposes measurable affine error"
            );
        }
        check(
            lab::reciprocalDepthDenominator(*tiltedScreen, weights) > 0.0,
            "valid projected triangle keeps a positive reciprocal denominator"
        );
    }

    const lab::TexturedQuad flatQuad = lab::makeTiltedQuad(4.0, 4.0);
    const auto flatScreen = lab::projectTriangle(
        lab::quadTriangle(flatQuad, 0),
        verticalFov,
        viewport,
        nearPlane
    );
    check(flatScreen.has_value(), "constant-depth triangle projects");
    if (flatScreen) {
        const lab::Barycentric weights{0.2, 0.3, 0.5};
        const auto corrected = lab::interpolatePerspectiveUv(*flatScreen, weights);
        check(corrected.has_value(), "constant depth has a valid denominator");
        if (corrected) {
            check(
                lab::uvDistance(lab::interpolateAffineUv(*flatScreen, weights), *corrected) <= 1e-12,
                "affine and perspective uv agree at constant depth"
            );
        }
    }

    const lab::TexturedTriangle crossing{{{
        {{-1.0, -0.8, 0.5}, {0.0, 1.0}},
        {{1.0, -0.8, 3.0}, {1.0, 1.0}},
        {{0.0, 0.9, 2.0}, {0.5, 0.0}},
    }}};
    const lab::ClippedPolygon polygon = lab::clipTriangleToNearPlane(crossing, nearPlane);
    check(polygon.count == 4, "one outside textured vertex clips to a quad");
    for (std::size_t index = 0; index < polygon.count; ++index) {
        check(lab::isFinite(polygon.vertices[index].position), "clipped position remains finite");
        check(lab::isFinite(polygon.vertices[index].uv), "clipped uv remains finite");
        check(
            polygon.vertices[index].position.z >= nearPlane - 1e-9,
            "clipped vertex stays beyond near plane"
        );
    }
    const lab::TexturedVertex intersection = lab::intersectNearPlane(
        crossing.vertices[0],
        crossing.vertices[1],
        nearPlane
    );
    const double t = (nearPlane - 0.5) / (3.0 - 0.5);
    check(nearlyEqual(intersection.position.z, nearPlane), "intersection lies on near plane");
    check(nearlyEqual(intersection.uv.x, t), "intersection uv uses the same t as position");

    std::size_t callbackCount = 0;
    const lab::TextureRenderStats renderStats = lab::renderTexturedTriangle(
        lab::quadTriangle(quad, 0),
        texture,
        viewport,
        verticalFov,
        nearPlane,
        lab::InterpolationMode::perspectiveCorrect,
        lab::AddressMode::clamp,
        viewport.width,
        viewport.height,
        [&](const lab::TexturedPixel& sample) {
            check(std::isfinite(sample.color.red), "sampled texture color remains finite");
            check(lab::isFinite(sample.selectedUv), "selected uv remains finite");
            check(sample.denominator > 0.0, "render callback keeps a positive denominator");
            ++callbackCount;
        }
    );
    check(renderStats.triangleCount == 1, "safe face stays one triangle after clipping");
    check(renderStats.coveredCount > 0, "textured triangle covers pixels");
    check(renderStats.coveredCount == callbackCount, "coverage equals texture write count");
    check(renderStats.maximumUvError > 0.0, "tilted face reports non-zero affine error");

    // Rasterize cả quad, không chỉ một face. Mỗi pixel chỉ có một owner và hai
    // cách chia đường chéo phải tạo cùng một vùng phủ.
    const std::array<lab::TexturedTriangle, 2> originalFaces{
        lab::quadTriangle(quad, 0),
        lab::quadTriangle(quad, 1),
    };
    const std::array<lab::TexturedTriangle, 2> alternativeFaces{
        lab::TexturedTriangle{{{quad.vertices[0], quad.vertices[3], quad.vertices[1]}}},
        lab::TexturedTriangle{{{quad.vertices[1], quad.vertices[3], quad.vertices[2]}}},
    };
    const auto renderCoverage = [&](const std::array<lab::TexturedTriangle, 2>& faces) {
        std::vector<int> owners(std::size_t(viewport.width * viewport.height), 0);
        for (const lab::TexturedTriangle& face : faces) {
            lab::renderTexturedTriangle(
                face,
                texture,
                viewport,
                verticalFov,
                nearPlane,
                lab::InterpolationMode::perspectiveCorrect,
                lab::AddressMode::clamp,
                viewport.width,
                viewport.height,
                [&](const lab::TexturedPixel& sample) {
                    const std::size_t index = std::size_t(sample.y * viewport.width + sample.x);
                    ++owners[index];
                }
            );
        }
        return owners;
    };

    const std::vector<int> originalCoverage = renderCoverage(originalFaces);
    const std::vector<int> alternativeCoverage = renderCoverage(alternativeFaces);
    bool hasCoveredPixel = false;
    bool hasOverlap = false;
    bool sameCoverage = true;
    for (std::size_t index = 0; index < originalCoverage.size(); ++index) {
        hasCoveredPixel = hasCoveredPixel || originalCoverage[index] > 0;
        hasOverlap = hasOverlap || originalCoverage[index] > 1 || alternativeCoverage[index] > 1;
        if ((originalCoverage[index] > 0) != (alternativeCoverage[index] > 0)) {
            sameCoverage = false;
        }
    }
    check(hasCoveredPixel, "two quad faces cover at least one pixel");
    check(!hasOverlap, "top-left rule gives every covered quad pixel one owner");
    check(sameCoverage, "changing the shared diagonal leaves no crack in quad coverage");

    // Hai face gốc phải khôi phục cùng UV và texel ở mọi điểm trên diagonal 0–2.
    const auto firstScreen = lab::projectTriangle(originalFaces[0], verticalFov, viewport, nearPlane);
    const auto secondScreen = lab::projectTriangle(originalFaces[1], verticalFov, viewport, nearPlane);
    check(firstScreen.has_value() && secondScreen.has_value(), "both shared-edge faces project");
    if (firstScreen && secondScreen) {
        for (const double tAlongEdge : {0.25, 0.5, 0.75}) {
            const auto firstUv = lab::interpolatePerspectiveUv(
                *firstScreen,
                {1.0 - tAlongEdge, tAlongEdge, 0.0}
            );
            const auto secondUv = lab::interpolatePerspectiveUv(
                *secondScreen,
                {1.0 - tAlongEdge, 0.0, tAlongEdge}
            );
            check(firstUv.has_value() && secondUv.has_value(), "shared-edge uv is recoverable");
            if (!firstUv || !secondUv) {
                continue;
            }
            check(
                lab::uvDistance(*firstUv, *secondUv) <= 1e-12,
                "both faces agree on uv along their shared edge"
            );
            check(
                lab::nearestTexelIndex(texture, *firstUv, lab::AddressMode::clamp) ==
                    lab::nearestTexelIndex(texture, *secondUv, lab::AddressMode::clamp),
                "both faces choose the same texel along their shared edge"
            );
        }
    }

    if (failures != 0) {
        std::cerr << failures << " checks failed.\n";
        return EXIT_FAILURE;
    }
    std::cout << "Project 20 validation passed.\n";
    return EXIT_SUCCESS;
}
