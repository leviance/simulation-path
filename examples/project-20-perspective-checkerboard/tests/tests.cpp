#include "lab.hpp"
#include <cstdlib>
#include <iostream>
#include <limits>
#include <string_view>

namespace {
int failures = 0;

// Không dùng assert: mọi điều kiện vẫn chạy trong Release.
void check(bool condition, std::string_view label) {
    if (!condition) {
        ++failures;
        std::cerr << "FAIL: " << label << '\n';
    }
}

bool close(double a, double b, double tolerance = 1e-9) {
    return std::abs(a - b) <= tolerance;
}

double length(lab::Vec3 a, lab::Vec3 b) {
    return std::hypot(std::hypot(a.x - b.x, a.y - b.y), a.z - b.z);
}

struct Image {
    std::vector<int> owners = std::vector<int>(240 * 180);
    std::vector<lab::Vec2> uv = std::vector<lab::Vec2>(240 * 180);
    std::vector<lab::Color> colors = std::vector<lab::Color>(240 * 180);
};

Image render(lab::Scene scene, bool corrected, bool alternative = false, bool reversed = false) {
    Image image;
    auto quad = lab::makeQuad(scene.yaw, scene.pitch, scene.distance);
    if (alternative) {
        quad.faces = {{{0, 3, 1}, {1, 3, 2}}};
    }
    if (reversed) {
        for (auto& face : quad.faces) {
            std::swap(face[1], face[2]);
        }
    }
    const auto texture = lab::makeCheckerTexture();
    lab::RenderStats stats;
    for (std::size_t face = 0; face < 2; ++face) {
        lab::renderTexturedTriangle(lab::quadTriangle(quad, face), {0, 0, 240, 180}, scene, corrected, texture, stats, [&](lab::RasterSample sample, lab::Vec2 uv, lab::Color color) {
            const std::size_t pixel = std::size_t(sample.y * 240 + sample.x);
            ++image.owners[pixel];
            image.uv[pixel] = uv;
            image.colors[pixel] = color;
        });
    }
    return image;
}

void verifyImages() {
    for (int preset = 1; preset <= 4; ++preset) {
        lab::Scene scene;
        lab::applyPreset(scene, preset);
        const auto image = render(scene, true);
        const auto affine = render(scene, false);
        const auto alternative = render(scene, true, true);
        const auto reversed = render(scene, true, false, true);
        std::size_t covered = 0;
        std::size_t errors = 0;
        double maximumAffineError = 0;
        for (int y = 0; y < 180; ++y) {
            for (int x = 0; x < 240; ++x) {
                const auto pixel = std::size_t(y * 240 + x);
                const auto rayUv = lab::referenceUvFromRay(scene, {x + 0.5, y + 0.5}, {0, 0, 240, 180});
                if (image.owners[pixel] > 1 || image.owners[pixel] != alternative.owners[pixel] || image.owners[pixel] != reversed.owners[pixel] || image.owners[pixel] != affine.owners[pixel]) {
                    ++errors;
                }
                if (bool(rayUv) != (image.owners[pixel] == 1)) {
                    ++errors;
                }
                if (!rayUv || image.owners[pixel] != 1) {
                    continue;
                }
                ++covered;
                if (lab::uvDistance(image.uv[pixel], *rayUv) > 1e-9 || lab::uvDistance(alternative.uv[pixel], *rayUv) > 1e-9 || lab::uvDistance(reversed.uv[pixel], *rayUv) > 1e-9) {
                    ++errors;
                }
                maximumAffineError = std::max(maximumAffineError, lab::uvDistance(affine.uv[pixel], *rayUv));
                // Màu dự đoán từ ô cờ tại ray hit, không gọi sampler của renderer.
                const double cellX = rayUv->x * 8;
                const double cellY = rayUv->y * 8;
                if (std::abs(cellX - std::round(cellX)) > 1e-8 && std::abs(cellY - std::round(cellY)) > 1e-8) {
                    lab::Color expected{236, 240, 248};
                    if ((int(std::floor(cellX)) + int(std::floor(cellY))) % 2 != 0) {
                        expected = {38, 48, 72};
                    }
                    if (lab::packColor(image.colors[pixel]) != lab::packColor(expected)) {
                        ++errors;
                    }
                }
            }
        }
        check(covered > 100, "preset renders a visible quad");
        check(errors == 0, "ray-plane oracle agrees with coverage, UV, RGB, both diagonals and reversed winding");
        if (preset == 1) {
            check(maximumAffineError < 1e-9, "affine and perspective agree at constant depth");
        }
        if (preset == 3) {
            check(maximumAffineError > 0.1, "steep pose exposes significant affine distortion");
        }
    }
}
} // namespace

int main() {
    const auto texture = lab::makeCheckerTexture();
    check(texture.texels.size() == 4096, "64 by 64 texels in row-major storage");
    check(lab::nearestTexelIndex(texture, {1, 1}, lab::AddressMode::clamp) == std::array<int, 2>{63, 63}, "clamp maps one to last texel");
    check(lab::nearestTexelIndex(texture, {1, 1}, lab::AddressMode::repeat) == std::array<int, 2>{0, 0}, "repeat maps one to zero");
    check(lab::nearestTexelIndex(texture, {-0.1, 1.1}, lab::AddressMode::repeat) == std::array<int, 2>{57, 6}, "negative UV repeats with positive fractional part");
    check(lab::makeCheckerTexture(-1, 8).texels.empty(), "invalid dimensions rejected");
    const double nan = std::numeric_limits<double>::quiet_NaN();
    check(lab::packColor(lab::sampleNearest(texture, {nan, 0}, lab::AddressMode::clamp)) == lab::packColor({255, 0, 255}), "nonfinite UV rejected before integer conversion");
    check(lab::packColor(lab::sampleNearest({}, {0, 0}, lab::AddressMode::clamp)) == lab::packColor({255, 0, 255}), "malformed texture rejected");

    for (int preset = 1; preset <= 4; ++preset) {
        lab::Scene scene;
        lab::applyPreset(scene, preset);
        const auto quad = lab::makeQuad(scene.yaw, scene.pitch, scene.distance);
        check(close(length(quad.vertices[0].position, quad.vertices[1].position), 3.2), "tilt preserves horizontal edge length");
        check(close(length(quad.vertices[1].position, quad.vertices[2].position), 2), "tilt preserves vertical edge length");
    }

    const lab::TexturedVertex a{{-1, 0, 0.5}, {0, 1}};
    const lab::TexturedVertex b{{1, 1, 3}, {1, 0}};
    const auto hit = lab::intersectNearPlane(a, b, 1);
    const auto reverseHit = lab::intersectNearPlane(b, a, 1);
    check(close(hit.position.x, -0.6) && hit.position.z == 1 && close(hit.uv.x, 0.2) && close(hit.uv.y, 0.8), "intersection uses same t for XYZ and UV");
    check(hit.position.x == reverseHit.position.x && hit.uv.x == reverseHit.uv.x, "shared edge intersection is direction independent");
    const auto clipped = lab::clipTriangleToNearPlane({a, b, {{0, 1, 2}, {0.5, 0}}}, 1);
    check(clipped.size() == 4, "one outside vertex creates clipped quad");
    for (const auto& vertex : clipped) {
        check(vertex.position.z >= 1 && lab::isFinite(vertex.uv), "clipped attributes finite and inside exact half-space");
    }
    const lab::Viewport viewport{0, 0, 240, 180};
    check(!lab::projectVertex({{0, 0, 0.9999999999}, {}}, viewport), "projection rejects even slightly behind near plane");
    check(!lab::projectVertex({{nan, 0, 2}, {}}, viewport), "projection rejects nonfinite position");
    lab::ScreenTriangle invalid{};
    check(!lab::interpolatePerspectiveUv(invalid, {1, 0, 0}), "zero denominator rejected");

    lab::Scene scene;
    check(scene.paused && !scene.debug && scene.compare, "final opens in clean paused comparison");
    const auto initial = scene;
    check(lab::advanceScene(scene, 0.5, true), "single step advances while paused");
    check(close(scene.phase, 1.0 / 60), "single step is deterministic");
    scene = initial;
    check(!lab::advanceScene(scene, 1), "paused scene remains unchanged");
    lab::DragState drag;
    lab::beginDrag(scene, drag, {10, 10});
    lab::updateDrag(scene, drag, {110, 30});
    check(drag.moved && close(scene.yaw, initial.yaw + 0.8), "drag rotates rigid model");

    verifyImages();
    lab::Framebuffer image;
    const auto stats = lab::renderScene(image, initial);
    check(stats.covered > 100 && image.pixels.size() == 960 * 640, "complete CPU scene renders");
    if (failures != 0) {
        std::cerr << failures << " checks failed.\n";
        return EXIT_FAILURE;
    }
    std::cout << "Project 20 validation passed.\n";
    return EXIT_SUCCESS;
}
