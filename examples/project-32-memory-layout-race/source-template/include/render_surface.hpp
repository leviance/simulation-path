#pragma once
#include "render_geometry.hpp"

namespace lab {
inline void prepareFountainSurface(Framebuffer& image, const Camera& camera, bool debug) {
    if (image.width < 1 || image.height < 1 || image.width > 2048 || image.height > 2048)
        throw std::invalid_argument("Framebuffer budget exceeded");
    const std::array<double, 9> key{camera.yaw, camera.pitch, camera.distance, camera.target.x, camera.target.y, camera.target.z, double(debug), double(image.width), double(image.height)};
    const std::size_t pixelCount = std::size_t(image.width) * image.height;
    if (image.surfaceReady && image.surfaceKey == key && image.surfacePixels.size() == pixelCount) {
        image.pixels = image.surfacePixels;
        return;
    }
    image.surfacePixels.resize(pixelCount);
    image.surfaceDepth.assign(pixelCount, std::numeric_limits<float>::infinity());
    const ViewBasis basis = viewBasis(camera);
    const double focal = image.height * fountainFocalScale;
    for (int y = 0; y < image.height; ++y) {
        const double vertical = (image.height * 0.5 - y - 0.5) / focal;
        const double background = double(y) / image.height;
        for (int x = 0; x < image.width; ++x) {
            const std::size_t index = std::size_t(y) * image.width + x;
            const double horizontal = (x + 0.5 - image.width * 0.5) / focal;
            const Vec3 ray{basis.forward.x + horizontal * basis.right.x + vertical * basis.up.x, basis.forward.y + horizontal * basis.right.y + vertical * basis.up.y, basis.forward.z + horizontal * basis.right.z + vertical * basis.up.z};
            double red = 7 + 7 * background;
            double green = 13 + 10 * background;
            double blue = 24 + 16 * background;
            if (basis.eye.y > fountainFloorY && ray.y < -1e-8) {
                const double depth = (fountainFloorY - basis.eye.y) / ray.y;
                if (depth > 0.1) {
                    const double worldX = basis.eye.x + ray.x * depth;
                    const double worldZ = basis.eye.z + ray.z * depth;
                    const double fog = 1 / (1 + depth * 0.035);
                    red += (17 - red) * fog;
                    green += (28 - green) * fog;
                    blue += (42 - blue) * fog;

                    // One-metre grid; five-metre lines are stronger. Fade before aliasing.
                    const double footprint = depth / focal;
                    const double width = std::max(0.008, footprint * 0.8);
                    const double distance = std::min(std::abs(worldX - std::round(worldX)), std::abs(worldZ - std::round(worldZ)));
                    const double majorDistance = std::min(std::abs(worldX - 5 * std::round(worldX / 5)), std::abs(worldZ - 5 * std::round(worldZ / 5)));
                    const double density = footprint * std::max(1.0, depth / (basis.eye.y - fountainFloorY));
                    const double fade = std::clamp((0.6 - density) / 0.4, 0.0, 1.0);
                    const double minor = std::max(0.0, 1 - distance / width) * fade;
                    const double major = std::max(0.0, 1 - majorDistance / width) * std::clamp((3 - density) / 2, 0.0, 1.0);
                    double gridBrightness = 0.8;
                    if (debug) {
                        gridBrightness = 1.2;
                    }
                    const double line = std::max(minor * 0.55, major) * fog * gridBrightness;
                    red += 32 * line;
                    green += 57 * line;
                    blue += 72 * line;
                    // A depth reference only: no particle collision or extra simulation step.
                    image.surfaceDepth[index] = float(depth);
                }
            }
            image.surfacePixels[index] = rgbColor(red, green, blue);
        }
    }
    image.surfaceKey = key;
    image.surfaceReady = true;
    image.pixels = image.surfacePixels;
}
} // namespace lab
