#pragma once
#include "framebuffer.hpp"
#include "raster.hpp"
#include "scene.hpp"

namespace lab {
struct FaceSample {
    Triangle3 world{};
    Vec3 normal{};
    LightingSample lighting{};
    bool frontFacing{};
};

struct FrameStats {
    std::array<FaceSample, 12> faces{};
    std::size_t submitted{};
    std::size_t culled{};
    std::size_t covered{};
    std::size_t passed{};
    std::size_t clippedTriangles{};
};

inline int viewportHeight(const Scene& scene, int height) {
    if (scene.debug) {
        return height * 3 / 4;
    }
    return height;
}

#if LAB_CHECKPOINT >= 6
inline bool isFrontFacing(const Triangle3& worldVertices, const Camera& camera) {
    const Vec3 normal = faceUnitNormal(worldVertices);
    const Vec3 toCamera = subtract(cameraPosition(camera), faceCentroid(worldVertices));
    return dot(normal, toCamera) > 0.0;
}
#endif

#if LAB_CHECKPOINT >= 1
inline FrameStats renderCube(Framebuffer& image, const Scene& scene, bool reverseOrder = false) {
    FrameStats stats;
    const CubeMesh worldMesh = transformMesh(makeCube(), scene.pitch, scene.yaw);
    DirectionalLight light;
#if LAB_CHECKPOINT >= 3
    light = orbitLight(scene.lightAzimuth, scene.lightElevation);
#endif
    const int viewHeight = viewportHeight(scene, image.height);
    for (std::size_t position = 0; position < worldMesh.faces.size(); ++position) {
        std::size_t index = position;
        if (reverseOrder) {
            index = worldMesh.faces.size() - 1 - position;
        }
        const Face& face = worldMesh.faces[index];
        FaceSample& sample = stats.faces[index];
        sample.world = faceVertices(worldMesh, face);
#if LAB_CHECKPOINT >= 2
        sample.normal = faceUnitNormal(sample.world);
#endif
        // Tính đúng một lần, kể cả mặt khuất, để inspector theo dõi cùng face ID.
        const Material material{baseColorFor(face.side, scene.palette), scene.ambient, scene.diffuseStrength};
        sample.lighting = sampleFace(sample.normal, light, material, scene.lighting);
        sample.frontFacing = true;
#if LAB_CHECKPOINT >= 6
        sample.frontFacing = isFrontFacing(sample.world, scene.camera);
        if (scene.culling && !sample.frontFacing) {
            ++stats.culled;
            continue;
        }
#endif
        ++stats.submitted;
        Triangle3 viewVertices;
        for (std::size_t i = 0; i < 3; ++i) {
            viewVertices[i] = worldToView(sample.world[i], scene.camera);
        }
        const auto polygon = clipNear(viewVertices, 0.5);
        // Mọi triangle sinh ra từ face đều dùng lại một shadedColor.
        for (std::size_t i = 1; i + 1 < polygon.size(); ++i) {
            const auto a = projectVertex(polygon[0], image.width, viewHeight);
            const auto b = projectVertex(polygon[i], image.width, viewHeight);
            const auto c = projectVertex(polygon[i + 1], image.width, viewHeight);
            if (!a || !b || !c) {
                continue;
            }
            ++stats.clippedTriangles;
            rasterizeTriangle({*a, *b, *c}, image.width, viewHeight, [&](int x, int y, double inverseZ) {
                ++stats.covered;
                const std::size_t pixel = std::size_t(y) * std::size_t(image.width) + std::size_t(x);
                if (inverseZ <= image.inverseDepth[pixel]) {
                    return;
                }
                image.inverseDepth[pixel] = inverseZ;
                image.owner[pixel] = int(index);
                image.pixels[pixel] = packColor(sample.lighting.shadedColor);
                ++stats.passed;
            });
        }
    }
    return stats;
}
#endif
} // namespace lab
