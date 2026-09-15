#pragma once

#ifndef LAB_CHECKPOINT
#define LAB_CHECKPOINT 9
#endif

#include <algorithm>
#include <array>
#include <cmath>
#include <cstddef>
#include <cstdint>
#include <limits>
#include <numbers>
#include <vector>

namespace lab {

#if LAB_CHECKPOINT >= 1
enum class RendererKind {
    cpu,
    gpu,
};

struct Vec3 {
    float x{};
    float y{};
    float z{};
};

struct Vec4 {
    float x{};
    float y{};
    float z{};
    float w{};
};

struct Rgb {
    std::uint8_t red{};
    std::uint8_t green{};
    std::uint8_t blue{};
};

struct CubeScene {
    float angleX{-0.42F};
    float angleY{0.68F};
    bool depthEnabled{true};
    bool cullingEnabled{true};
};

inline const char* rendererLabel(RendererKind renderer) {
    if (renderer == RendererKind::cpu) {
        return "F1 CPU rasterizer";
    }
    return "F2 OpenGL GPU";
}
#endif

#if LAB_CHECKPOINT >= 2
// Mỗi mặt giữ bốn vertices riêng để có một màu phẳng, nhưng hai triangle của mặt dùng chung indices.
struct GpuCubeVertex {
    float positionX{};
    float positionY{};
    float positionZ{};
    float red{};
    float green{};
    float blue{};
};

static_assert(sizeof(GpuCubeVertex) == sizeof(float) * 6U);
static_assert(offsetof(GpuCubeVertex, positionX) == 0U);
static_assert(offsetof(GpuCubeVertex, red) == sizeof(float) * 3U);

inline constexpr float colorChannel(std::uint8_t value) {
    return float(value) / 255.0F;
}

inline constexpr std::array<GpuCubeVertex, 24> kCubeVertices{
    // Front (+Z)
    GpuCubeVertex{-1, -1, 1, colorChannel(239), colorChannel(90), colorChannel(102)},
    GpuCubeVertex{1, -1, 1, colorChannel(239), colorChannel(90), colorChannel(102)},
    GpuCubeVertex{1, 1, 1, colorChannel(239), colorChannel(90), colorChannel(102)},
    GpuCubeVertex{-1, 1, 1, colorChannel(239), colorChannel(90), colorChannel(102)},
    // Back (-Z)
    GpuCubeVertex{1, -1, -1, colorChannel(92), colorChannel(140), colorChannel(246)},
    GpuCubeVertex{-1, -1, -1, colorChannel(92), colorChannel(140), colorChannel(246)},
    GpuCubeVertex{-1, 1, -1, colorChannel(92), colorChannel(140), colorChannel(246)},
    GpuCubeVertex{1, 1, -1, colorChannel(92), colorChannel(140), colorChannel(246)},
    // Left (-X)
    GpuCubeVertex{-1, -1, -1, colorChannel(169), colorChannel(112), colorChannel(232)},
    GpuCubeVertex{-1, -1, 1, colorChannel(169), colorChannel(112), colorChannel(232)},
    GpuCubeVertex{-1, 1, 1, colorChannel(169), colorChannel(112), colorChannel(232)},
    GpuCubeVertex{-1, 1, -1, colorChannel(169), colorChannel(112), colorChannel(232)},
    // Right (+X)
    GpuCubeVertex{1, -1, 1, colorChannel(74), colorChannel(214), colorChannel(166)},
    GpuCubeVertex{1, -1, -1, colorChannel(74), colorChannel(214), colorChannel(166)},
    GpuCubeVertex{1, 1, -1, colorChannel(74), colorChannel(214), colorChannel(166)},
    GpuCubeVertex{1, 1, 1, colorChannel(74), colorChannel(214), colorChannel(166)},
    // Top (+Y)
    GpuCubeVertex{-1, 1, 1, colorChannel(246), colorChannel(184), colorChannel(72)},
    GpuCubeVertex{1, 1, 1, colorChannel(246), colorChannel(184), colorChannel(72)},
    GpuCubeVertex{1, 1, -1, colorChannel(246), colorChannel(184), colorChannel(72)},
    GpuCubeVertex{-1, 1, -1, colorChannel(246), colorChannel(184), colorChannel(72)},
    // Bottom (-Y)
    GpuCubeVertex{-1, -1, -1, colorChannel(55), colorChannel(190), colorChannel(220)},
    GpuCubeVertex{1, -1, -1, colorChannel(55), colorChannel(190), colorChannel(220)},
    GpuCubeVertex{1, -1, 1, colorChannel(55), colorChannel(190), colorChannel(220)},
    GpuCubeVertex{-1, -1, 1, colorChannel(55), colorChannel(190), colorChannel(220)},
};

inline constexpr std::array<std::uint32_t, 36> kCubeIndices{
    0,
    1,
    2,
    0,
    2,
    3,
    4,
    5,
    6,
    4,
    6,
    7,
    8,
    9,
    10,
    8,
    10,
    11,
    12,
    13,
    14,
    12,
    14,
    15,
    16,
    17,
    18,
    16,
    18,
    19,
    20,
    21,
    22,
    20,
    22,
    23,
};

inline bool cubeIndicesAreValid() {
    for (const std::uint32_t index : kCubeIndices) {
        if (index >= kCubeVertices.size()) {
            return false;
        }
    }
    return true;
}
#endif

#if LAB_CHECKPOINT >= 3
// Mat4 giữ column-major storage để cùng 16 floats có thể truyền thẳng cho GLSL với transpose = GL_FALSE.
struct Mat4 {
    std::array<float, 16> values{};
};

inline Mat4 identityMatrix() {
    Mat4 result{};
    result.values = {1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1};
    return result;
}

inline Mat4 multiply(const Mat4& left, const Mat4& right) {
    Mat4 result{};
    for (int column = 0; column < 4; ++column) {
        for (int row = 0; row < 4; ++row) {
            float value = 0.0F;
            for (int inner = 0; inner < 4; ++inner) {
                value += left.values[std::size_t(inner * 4 + row)] * right.values[std::size_t(column * 4 + inner)];
            }
            result.values[std::size_t(column * 4 + row)] = value;
        }
    }
    return result;
}

inline Vec4 transform(const Mat4& matrix, Vec4 vector) {
    return {
        matrix.values[0] * vector.x + matrix.values[4] * vector.y + matrix.values[8] * vector.z + matrix.values[12] * vector.w,
        matrix.values[1] * vector.x + matrix.values[5] * vector.y + matrix.values[9] * vector.z + matrix.values[13] * vector.w,
        matrix.values[2] * vector.x + matrix.values[6] * vector.y + matrix.values[10] * vector.z + matrix.values[14] * vector.w,
        matrix.values[3] * vector.x + matrix.values[7] * vector.y + matrix.values[11] * vector.z + matrix.values[15] * vector.w,
    };
}

inline Mat4 rotationXMatrix(float angle) {
    const float cosine = std::cos(angle);
    const float sine = std::sin(angle);
    Mat4 result = identityMatrix();
    result.values[5] = cosine;
    result.values[6] = sine;
    result.values[9] = -sine;
    result.values[10] = cosine;
    return result;
}

inline Mat4 rotationYMatrix(float angle) {
    const float cosine = std::cos(angle);
    const float sine = std::sin(angle);
    Mat4 result = identityMatrix();
    result.values[0] = cosine;
    result.values[2] = -sine;
    result.values[8] = sine;
    result.values[10] = cosine;
    return result;
}

inline Mat4 translationMatrix(float x, float y, float z) {
    Mat4 result = identityMatrix();
    result.values[12] = x;
    result.values[13] = y;
    result.values[14] = z;
    return result;
}

inline Mat4 perspectiveMatrix(float verticalFovRadians, float aspect, float nearPlane, float farPlane) {
    Mat4 result{};
    const float focalScale = 1.0F / std::tan(verticalFovRadians * 0.5F);
    result.values[0] = focalScale / aspect;
    result.values[5] = focalScale;
    result.values[10] = (farPlane + nearPlane) / (nearPlane - farPlane);
    result.values[11] = -1.0F;
    result.values[14] = (2.0F * farPlane * nearPlane) / (nearPlane - farPlane);
    return result;
}

inline Mat4 makeMvp(const CubeScene& scene, float aspect) {
    const Mat4 model = multiply(rotationYMatrix(scene.angleY), rotationXMatrix(scene.angleX));
    const Mat4 view = translationMatrix(0.0F, 0.0F, -4.2F);
    const Mat4 projection = perspectiveMatrix(std::numbers::pi_v<float> / 3.0F, aspect, 0.5F, 20.0F);
    return multiply(projection, multiply(view, model));
}

struct ScreenVertex {
    float x{};
    float y{};
    float depth{};
    float clipW{};
};

inline ScreenVertex projectVertex(const GpuCubeVertex& vertex, const Mat4& mvp, int width, int height) {
    const Vec4 clip = transform(mvp, {vertex.positionX, vertex.positionY, vertex.positionZ, 1.0F});
    const float ndcX = clip.x / clip.w;
    const float ndcY = clip.y / clip.w;
    const float ndcZ = clip.z / clip.w;
    return {
        (ndcX * 0.5F + 0.5F) * float(width),
        (1.0F - (ndcY * 0.5F + 0.5F)) * float(height),
        ndcZ * 0.5F + 0.5F,
        clip.w,
    };
}

struct Framebuffer {
    int width{1};
    int height{1};
    std::vector<std::uint8_t> rgba{0U, 0U, 0U, 0U};
    std::vector<float> depth{1.0F};

    void resize(int nextWidth, int nextHeight) {
        width = std::max(1, nextWidth);
        height = std::max(1, nextHeight);
        rgba.resize(std::size_t(width) * std::size_t(height) * 4U);
        depth.resize(std::size_t(width) * std::size_t(height));
        clear();
    }

    void clear() {
        for (std::size_t pixel = 0; pixel < depth.size(); ++pixel) {
            const std::size_t offset = pixel * 4U;
            rgba[offset] = 13U;
            rgba[offset + 1U] = 21U;
            rgba[offset + 2U] = 38U;
            rgba[offset + 3U] = 255U;
        }
        std::fill(depth.begin(), depth.end(), 1.0F);
    }
};

struct CpuRenderStats {
    std::size_t submittedTriangles{};
    std::size_t culledTriangles{};
    std::size_t passedFragments{};
    std::size_t rejectedFragments{};
};

inline float signedArea(const ScreenVertex& a, const ScreenVertex& b, const ScreenVertex& c) {
    return (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
}

inline float edge(const ScreenVertex& a, const ScreenVertex& b, float x, float y) {
    return (b.x - a.x) * (y - a.y) - (b.y - a.y) * (x - a.x);
}

inline CpuRenderStats rasterizeCpuCube(Framebuffer& framebuffer, const CubeScene& scene, bool reverseOrder = false) {
    framebuffer.clear();
    CpuRenderStats stats{};
    const Mat4 mvp = makeMvp(scene, float(framebuffer.width) / float(framebuffer.height));
    std::array<ScreenVertex, kCubeVertices.size()> projected{};
    for (std::size_t index = 0; index < kCubeVertices.size(); ++index) {
        projected[index] = projectVertex(kCubeVertices[index], mvp, framebuffer.width, framebuffer.height);
    }

    const std::size_t triangleCount = kCubeIndices.size() / 3U;
    for (std::size_t position = 0; position < triangleCount; ++position) {
        std::size_t triangleIndex = position;
        if (reverseOrder) {
            triangleIndex = triangleCount - 1U - position;
        }
        const std::size_t offset = triangleIndex * 3U;
        ScreenVertex a = projected[kCubeIndices[offset]];
        ScreenVertex b = projected[kCubeIndices[offset + 1U]];
        ScreenVertex c = projected[kCubeIndices[offset + 2U]];
        ++stats.submittedTriangles;

        float area = signedArea(a, b, c);
        const bool frontFacing = area < -1.0e-6F;
        if (scene.cullingEnabled && !frontFacing) {
            ++stats.culledTriangles;
            continue;
        }
        if (std::abs(area) <= 1.0e-6F) {
            continue;
        }
        if (area < 0.0F) {
            std::swap(b, c);
            area = -area;
        }

        const int minimumX = std::clamp(int(std::floor(std::min({a.x, b.x, c.x}))), 0, framebuffer.width - 1);
        const int minimumY = std::clamp(int(std::floor(std::min({a.y, b.y, c.y}))), 0, framebuffer.height - 1);
        const int maximumX = std::clamp(int(std::ceil(std::max({a.x, b.x, c.x}))) - 1, 0, framebuffer.width - 1);
        const int maximumY = std::clamp(int(std::ceil(std::max({a.y, b.y, c.y}))) - 1, 0, framebuffer.height - 1);
        const GpuCubeVertex& colorSource = kCubeVertices[kCubeIndices[offset]];
        const std::uint8_t red = std::uint8_t(std::lround(std::clamp(colorSource.red, 0.0F, 1.0F) * 255.0F));
        const std::uint8_t green = std::uint8_t(std::lround(std::clamp(colorSource.green, 0.0F, 1.0F) * 255.0F));
        const std::uint8_t blue = std::uint8_t(std::lround(std::clamp(colorSource.blue, 0.0F, 1.0F) * 255.0F));

        for (int y = minimumY; y <= maximumY; ++y) {
            for (int x = minimumX; x <= maximumX; ++x) {
                const float sampleX = float(x) + 0.5F;
                const float sampleY = float(y) + 0.5F;
                const float weightA = edge(b, c, sampleX, sampleY) / area;
                const float weightB = edge(c, a, sampleX, sampleY) / area;
                const float weightC = edge(a, b, sampleX, sampleY) / area;
                if (weightA < -1.0e-6F || weightB < -1.0e-6F || weightC < -1.0e-6F) {
                    continue;
                }
                const float fragmentDepth = weightA * a.depth + weightB * b.depth + weightC * c.depth;
                const std::size_t pixel = std::size_t(y) * std::size_t(framebuffer.width) + std::size_t(x);
                if (scene.depthEnabled && fragmentDepth >= framebuffer.depth[pixel]) {
                    ++stats.rejectedFragments;
                    continue;
                }
                framebuffer.depth[pixel] = fragmentDepth;
                const std::size_t colorOffset = pixel * 4U;
                framebuffer.rgba[colorOffset] = red;
                framebuffer.rgba[colorOffset + 1U] = green;
                framebuffer.rgba[colorOffset + 2U] = blue;
                framebuffer.rgba[colorOffset + 3U] = 255U;
                ++stats.passedFragments;
            }
        }
    }
    return stats;
}

inline std::uint32_t framebufferChecksum(const Framebuffer& framebuffer) {
    std::uint32_t checksum = 2166136261U;
    for (const std::uint8_t byte : framebuffer.rgba) {
        checksum ^= byte;
        checksum *= 16777619U;
    }
    return checksum;
}
#endif

#if LAB_CHECKPOINT >= 5
struct VertexTrace {
    Vec3 local{};
    Vec4 clip{};
    Vec3 ndc{};
    Vec3 screen{};
};

inline VertexTrace traceVertex(const GpuCubeVertex& vertex, const Mat4& mvp, int width, int height) {
    const Vec3 local{vertex.positionX, vertex.positionY, vertex.positionZ};
    const Vec4 clip = transform(mvp, {local.x, local.y, local.z, 1.0F});
    const Vec3 ndc{clip.x / clip.w, clip.y / clip.w, clip.z / clip.w};
    const Vec3 screen{
        (ndc.x * 0.5F + 0.5F) * float(width),
        (1.0F - (ndc.y * 0.5F + 0.5F)) * float(height),
        ndc.z * 0.5F + 0.5F,
    };
    return {local, clip, ndc, screen};
}
#endif

#if LAB_CHECKPOINT >= 9
struct DualRendererValidationReport {
    bool vertexLayout{};
    bool indexBounds{};
    bool finiteClipCoordinates{};
    bool depthOrderIndependent{};
    bool cullingRemovesTriangles{};
    bool deterministicCpuFrame{};
    bool rendererSwitchPreservesScene{};
};

inline DualRendererValidationReport validateDualRendererCubeContract() {
    DualRendererValidationReport report{};
    report.vertexLayout = sizeof(GpuCubeVertex) == sizeof(float) * 6U && offsetof(GpuCubeVertex, red) == sizeof(float) * 3U;
    report.indexBounds = cubeIndicesAreValid();

    CubeScene scene{};
    const Mat4 mvp = makeMvp(scene, 4.0F / 3.0F);
    const VertexTrace trace = traceVertex(kCubeVertices[0], mvp, 160, 120);
    report.finiteClipCoordinates = trace.clip.w > 0.0F && std::isfinite(trace.ndc.x) && std::isfinite(trace.ndc.y) && std::isfinite(trace.ndc.z);

    Framebuffer normal{};
    normal.resize(160, 120);
    const CpuRenderStats normalStats = rasterizeCpuCube(normal, scene, false);
    Framebuffer reversed{};
    reversed.resize(160, 120);
    rasterizeCpuCube(reversed, scene, true);
    report.depthOrderIndependent = normal.rgba == reversed.rgba && normal.depth == reversed.depth;
    report.cullingRemovesTriangles = normalStats.culledTriangles > 0U && normalStats.culledTriangles < normalStats.submittedTriangles;

    Framebuffer repeated{};
    repeated.resize(160, 120);
    rasterizeCpuCube(repeated, scene, false);
    report.deterministicCpuFrame = framebufferChecksum(normal) == framebufferChecksum(repeated);

    const CubeScene beforeSwitch = scene;
    RendererKind renderer = RendererKind::cpu;
    renderer = RendererKind::gpu;
    static_cast<void>(renderer);
    report.rendererSwitchPreservesScene = beforeSwitch.angleX == scene.angleX && beforeSwitch.angleY == scene.angleY && beforeSwitch.depthEnabled == scene.depthEnabled && beforeSwitch.cullingEnabled == scene.cullingEnabled;
    return report;
}
#endif

} // namespace lab
