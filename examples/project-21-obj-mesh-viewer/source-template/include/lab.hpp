#pragma once

#include <algorithm>
#include <array>
#include <charconv>
#include <cmath>
#include <cstddef>
#include <cstdint>
#include <fstream>
#include <istream>
#include <limits>
#include <optional>
#include <sstream>
#include <string>
#include <string_view>
#include <system_error>
#include <utility>
#include <vector>

#ifndef LAB_CHECKPOINT
#define LAB_CHECKPOINT 8
#endif

namespace lab {
#if LAB_CHECKPOINT >= 1
// Parser giữ geometry, topology và diagnostic tách khỏi SDL để CTest dùng trực tiếp.
struct Vec3 {
    double x{};
    double y{};
    double z{};
};

inline Vec3 operator+(Vec3 left, Vec3 right) {
    return {left.x + right.x, left.y + right.y, left.z + right.z};
}

inline Vec3 operator-(Vec3 left, Vec3 right) {
    return {left.x - right.x, left.y - right.y, left.z - right.z};
}

inline Vec3 operator*(Vec3 value, double scalar) {
    return {value.x * scalar, value.y * scalar, value.z * scalar};
}

inline double dot(Vec3 left, Vec3 right) {
    return left.x * right.x + left.y * right.y + left.z * right.z;
}

inline Vec3 cross(Vec3 left, Vec3 right) {
    return {
        left.y * right.z - left.z * right.y,
        left.z * right.x - left.x * right.z,
        left.x * right.y - left.y * right.x,
    };
}

inline double length(Vec3 value) {
    return std::sqrt(dot(value, value));
}

inline std::optional<Vec3> normalized(Vec3 value, double epsilon = 1e-9) {
    const double magnitude = length(value);
    if (!std::isfinite(magnitude) || magnitude <= epsilon) {
        return std::nullopt;
    }
    return value * (1.0 / magnitude);
}

struct ObjTriangle {
    std::array<std::size_t, 3> indices{};
    std::size_t sourceFace{};
    std::size_t sourceLine{};
};

struct ObjMesh {
    std::vector<Vec3> positions{};
    std::vector<ObjTriangle> triangles{};
};

struct ObjDiagnostic {
    std::size_t line{};
    std::string message{};
};

struct ObjLoadResult {
    ObjMesh mesh{};
    std::vector<ObjDiagnostic> diagnostics{};
    std::size_t sourceFaceCount{};
    std::size_t ignoredRecordCount{};
    bool opened{true};

    [[nodiscard]] bool hasErrors() const {
        return !diagnostics.empty();
    }

    [[nodiscard]] bool hasRenderableMesh() const {
        return opened && !mesh.positions.empty() && !mesh.triangles.empty();
    }
};

inline void addDiagnostic(ObjLoadResult& result, std::size_t line, std::string message) {
    result.diagnostics.push_back({line, std::move(message)});
}

#if LAB_CHECKPOINT >= 2
// Mọi quy ước index của OBJ được giải quyết ngay tại biên đọc file.
inline std::optional<std::size_t> resolveObjPositionIndex(
    std::string_view token,
    std::size_t positionCount
) {
#if LAB_CHECKPOINT >= 3
    const std::size_t slash = token.find('/');
    if (slash != std::string_view::npos) {
        token = token.substr(0, slash);
    }
#endif
    if (token.empty()) {
        return std::nullopt;
    }

    int rawIndex = 0;
    const char* begin = token.data();
    const char* end = token.data() + token.size();
    const auto parsed = std::from_chars(begin, end, rawIndex);
    if (parsed.ec != std::errc{} || parsed.ptr != end || rawIndex == 0) {
        return std::nullopt;
    }

#if LAB_CHECKPOINT >= 3
    long long resolved = 0;
    if (rawIndex > 0) {
        resolved = static_cast<long long>(rawIndex) - 1;
    } else {
        resolved = static_cast<long long>(positionCount) + rawIndex;
    }
#else
    if (rawIndex < 1) {
        return std::nullopt;
    }
    const long long resolved = static_cast<long long>(rawIndex) - 1;
#endif
    if (resolved < 0 || resolved >= static_cast<long long>(positionCount)) {
        return std::nullopt;
    }
    return static_cast<std::size_t>(resolved);
}
#endif

#if LAB_CHECKPOINT >= 4
inline void appendTriangleFan(
    ObjMesh& mesh,
    const std::vector<std::size_t>& corners,
    std::size_t sourceFace,
    std::size_t sourceLine
) {
    for (std::size_t index = 1; index + 1 < corners.size(); ++index) {
        mesh.triangles.push_back({
            {corners[0], corners[index], corners[index + 1]},
            sourceFace,
            sourceLine,
        });
    }
}
#endif

inline ObjLoadResult parseObj(std::istream& input) {
    ObjLoadResult result{};
    std::string line{};
    std::size_t lineNumber = 0;

    while (std::getline(input, line)) {
        ++lineNumber;
        std::istringstream record(line);
        std::string keyword{};
        if (!(record >> keyword) || keyword.starts_with('#')) {
            continue;
        }

        if (keyword == "v") {
            Vec3 position{};
            if (!(record >> position.x >> position.y >> position.z) ||
                !std::isfinite(position.x) ||
                !std::isfinite(position.y) ||
                !std::isfinite(position.z)) {
                addDiagnostic(result, lineNumber, "record v cần ba tọa độ hữu hạn");
                continue;
            }
            result.mesh.positions.push_back(position);
            continue;
        }

#if LAB_CHECKPOINT >= 2
        if (keyword == "f") {
            ++result.sourceFaceCount;
            std::vector<std::size_t> corners{};
            std::string token{};
            bool faceValid = true;
            while (record >> token) {
                if (token.starts_with('#')) {
                    break;
                }
                const std::optional<std::size_t> resolved = resolveObjPositionIndex(
                    token,
                    result.mesh.positions.size()
                );
                if (!resolved) {
                    addDiagnostic(result, lineNumber, "face chứa position index không hợp lệ: " + token);
                    faceValid = false;
                    break;
                }
                corners.push_back(*resolved);
            }
            if (!faceValid) {
                continue;
            }
            if (corners.size() < 3) {
                addDiagnostic(result, lineNumber, "record f cần ít nhất ba corner");
                continue;
            }
#if LAB_CHECKPOINT >= 4
            appendTriangleFan(result.mesh, corners, result.sourceFaceCount, lineNumber);
#else
            if (corners.size() != 3) {
                addDiagnostic(result, lineNumber, "checkpoint này mới nhận face có đúng ba corner");
                continue;
            }
            result.mesh.triangles.push_back({
                {corners[0], corners[1], corners[2]},
                result.sourceFaceCount,
                lineNumber,
            });
#endif
            continue;
        }
#endif

        if (keyword == "vt" || keyword == "vn" || keyword == "o" || keyword == "g" ||
            keyword == "s" || keyword == "usemtl" || keyword == "mtllib") {
            ++result.ignoredRecordCount;
            continue;
        }
        ++result.ignoredRecordCount;
    }

    if (result.mesh.positions.empty()) {
        addDiagnostic(result, 0, "OBJ không chứa position hợp lệ");
    }
    return result;
}

inline ObjLoadResult loadObjFile(const std::string& path) {
    std::ifstream input(path);
    if (!input) {
        ObjLoadResult result{};
        result.opened = false;
        addDiagnostic(result, 0, "không mở được file: " + path);
        return result;
    }
    return parseObj(input);
}

inline Vec3 rotateModelPoint(Vec3 point, double angleX, double angleY) {
    const double cosineY = std::cos(angleY);
    const double sineY = std::sin(angleY);
    const Vec3 afterY{
        point.x * cosineY + point.z * sineY,
        point.y,
        -point.x * sineY + point.z * cosineY,
    };
    const double cosineX = std::cos(angleX);
    const double sineX = std::sin(angleX);
    return {
        afterY.x,
        afterY.y * cosineX - afterY.z * sineX,
        afterY.y * sineX + afterY.z * cosineX,
    };
}

inline Vec3 toCameraPoint(Vec3 point, double angleX, double angleY, double distance) {
    Vec3 cameraPoint = rotateModelPoint(point, angleX, angleY);
    cameraPoint.z += distance;
    return cameraPoint;
}

struct ScreenVertex {
    double x{};
    double y{};
    double ndcDepth{};
};

inline std::optional<ScreenVertex> projectVertex(
    Vec3 point,
    int width,
    int height,
    double nearPlane = 0.7,
    double farPlane = 20.0
) {
    if (width <= 0 || height <= 0 || point.z < nearPlane || point.z > farPlane) {
        return std::nullopt;
    }
    const double focalScale = 1.0 / std::tan(3.14159265358979323846 / 6.0);
    const double aspectRatio = double(width) / double(height);
    const double ndcX = point.x * focalScale / (aspectRatio * point.z);
    const double ndcY = point.y * focalScale / point.z;
    const double depthRange = farPlane - nearPlane;
    const double ndcDepth = farPlane / depthRange - nearPlane * farPlane / (depthRange * point.z);
    return ScreenVertex{
        (ndcX * 0.5 + 0.5) * double(width),
        (0.5 - ndcY * 0.5) * double(height),
        ndcDepth,
    };
}
#endif

#if LAB_CHECKPOINT >= 5
// Normalize bằng một uniform scale để vừa khung mà không làm méo model.
struct Bounds3 {
    Vec3 minimum{};
    Vec3 maximum{};
};

inline std::optional<Bounds3> meshBounds(const ObjMesh& mesh) {
    if (mesh.positions.empty()) {
        return std::nullopt;
    }
    Bounds3 bounds{mesh.positions.front(), mesh.positions.front()};
    for (const Vec3 position : mesh.positions) {
        bounds.minimum.x = std::min(bounds.minimum.x, position.x);
        bounds.minimum.y = std::min(bounds.minimum.y, position.y);
        bounds.minimum.z = std::min(bounds.minimum.z, position.z);
        bounds.maximum.x = std::max(bounds.maximum.x, position.x);
        bounds.maximum.y = std::max(bounds.maximum.y, position.y);
        bounds.maximum.z = std::max(bounds.maximum.z, position.z);
    }
    return bounds;
}

inline Vec3 boundsCenter(const Bounds3& bounds) {
    return (bounds.minimum + bounds.maximum) * 0.5;
}

inline double boundsMaxExtent(const Bounds3& bounds) {
    const Vec3 extent = bounds.maximum - bounds.minimum;
    return std::max({extent.x, extent.y, extent.z});
}

inline bool normalizeMesh(ObjMesh& mesh, double targetExtent = 2.0) {
    const std::optional<Bounds3> bounds = meshBounds(mesh);
    if (!bounds) {
        return false;
    }
    const double maxExtent = boundsMaxExtent(*bounds);
    if (!std::isfinite(maxExtent) || maxExtent <= 1e-9 || targetExtent <= 0.0) {
        return false;
    }
    const Vec3 center = boundsCenter(*bounds);
    const double scale = targetExtent / maxExtent;
    for (Vec3& position : mesh.positions) {
        position = (position - center) * scale;
    }
    return true;
}
#endif

#if LAB_CHECKPOINT >= 6
// Lighting dùng face normal tính từ geometry đã transform, không tin dữ liệu ngầm từ asset.
struct Color {
    std::uint8_t red{};
    std::uint8_t green{};
    std::uint8_t blue{};
    std::uint8_t alpha{255};
};

inline std::optional<Vec3> faceNormal(Vec3 a, Vec3 b, Vec3 c) {
    return normalized(cross(b - a, c - a));
}

inline bool isFrontFacing(Vec3 normal, Vec3 a, Vec3 b, Vec3 c) {
    const Vec3 centroid = (a + b + c) * (1.0 / 3.0);
    return dot(normal, centroid) < 0.0;
}

inline double lambertIntensity(Vec3 normal, Vec3 directionToLight, double ambient = 0.18) {
    const std::optional<Vec3> light = normalized(directionToLight);
    if (!light) {
        return std::clamp(ambient, 0.0, 1.0);
    }
    const double diffuse = std::max(0.0, dot(normal, *light));
    return std::clamp(ambient + (1.0 - ambient) * diffuse, 0.0, 1.0);
}

inline Color shadeColor(Color base, double intensity) {
    const double safe = std::clamp(intensity, 0.0, 1.0);
    return {
        std::uint8_t(std::lround(double(base.red) * safe)),
        std::uint8_t(std::lround(double(base.green) * safe)),
        std::uint8_t(std::lround(double(base.blue) * safe)),
        base.alpha,
    };
}

inline std::uint32_t packColor(Color color) {
    return (std::uint32_t(color.red) << 24U) | (std::uint32_t(color.green) << 16U) |
        (std::uint32_t(color.blue) << 8U) | std::uint32_t(color.alpha);
}

struct Barycentric {
    double a{};
    double b{};
    double c{};
};

struct ScreenTriangle {
    ScreenVertex a{};
    ScreenVertex b{};
    ScreenVertex c{};
    Color color{};
    std::size_t sourceFace{};
};

inline double orient2D(const ScreenVertex& a, const ScreenVertex& b, double x, double y) {
    return (b.x - a.x) * (y - a.y) - (b.y - a.y) * (x - a.x);
}

inline bool isTopLeftEdge(const ScreenVertex& a, const ScreenVertex& b) {
    const double deltaX = b.x - a.x;
    const double deltaY = b.y - a.y;
    return deltaY < -1e-9 || (std::abs(deltaY) <= 1e-9 && deltaX > 1e-9);
}

inline bool acceptsEdge(double value, bool topLeft) {
    if (value > 1e-9) {
        return true;
    }
    if (value < -1e-9) {
        return false;
    }
    return topLeft;
}

inline ScreenTriangle normalizeScreenWinding(ScreenTriangle triangle) {
    if (orient2D(triangle.a, triangle.b, triangle.c.x, triangle.c.y) < 0.0) {
        std::swap(triangle.b, triangle.c);
    }
    return triangle;
}

template <typename ShadeFragment>
inline std::size_t rasterizeTriangle(
    ScreenTriangle source,
    int width,
    int height,
    ShadeFragment shadeFragment
) {
    const ScreenTriangle triangle = normalizeScreenWinding(source);
    const double area = orient2D(triangle.a, triangle.b, triangle.c.x, triangle.c.y);
    if (area <= 1e-9 || width <= 0 || height <= 0) {
        return 0;
    }
    const int minX = std::clamp(
        int(std::floor(std::min({triangle.a.x, triangle.b.x, triangle.c.x}))),
        0,
        width - 1
    );
    const int minY = std::clamp(
        int(std::floor(std::min({triangle.a.y, triangle.b.y, triangle.c.y}))),
        0,
        height - 1
    );
    const int maxX = std::clamp(
        int(std::ceil(std::max({triangle.a.x, triangle.b.x, triangle.c.x}))) - 1,
        0,
        width - 1
    );
    const int maxY = std::clamp(
        int(std::ceil(std::max({triangle.a.y, triangle.b.y, triangle.c.y}))) - 1,
        0,
        height - 1
    );

    std::size_t covered = 0;
    for (int y = minY; y <= maxY; ++y) {
        for (int x = minX; x <= maxX; ++x) {
            const double sampleX = double(x) + 0.5;
            const double sampleY = double(y) + 0.5;
            const double edgeAB = orient2D(triangle.a, triangle.b, sampleX, sampleY);
            const double edgeBC = orient2D(triangle.b, triangle.c, sampleX, sampleY);
            const double edgeCA = orient2D(triangle.c, triangle.a, sampleX, sampleY);
            const bool inside = acceptsEdge(edgeAB, isTopLeftEdge(triangle.a, triangle.b)) &&
                acceptsEdge(edgeBC, isTopLeftEdge(triangle.b, triangle.c)) &&
                acceptsEdge(edgeCA, isTopLeftEdge(triangle.c, triangle.a));
            if (!inside) {
                continue;
            }
            shadeFragment(
                x,
                y,
                Barycentric{edgeBC / area, edgeCA / area, edgeAB / area},
                triangle
            );
            ++covered;
        }
    }
    return covered;
}

struct PainterStats {
    std::size_t rasterizedTriangles{};
    std::size_t coveredFragments{};
    std::size_t degenerateTriangles{};
};

inline PainterStats renderPainterMesh(
    const ObjMesh& mesh,
    int width,
    int height,
    double angleX,
    double angleY,
    double distance,
    bool cullBackfaces,
    std::vector<std::uint32_t>& colors
) {
    PainterStats stats{};
    const Color base{92, 190, 246, 255};
    const Vec3 lightDirection{-0.45, -0.75, -1.0};
    for (const ObjTriangle& source : mesh.triangles) {
        const Vec3 a = toCameraPoint(mesh.positions[source.indices[0]], angleX, angleY, distance);
        const Vec3 b = toCameraPoint(mesh.positions[source.indices[1]], angleX, angleY, distance);
        const Vec3 c = toCameraPoint(mesh.positions[source.indices[2]], angleX, angleY, distance);
        const std::optional<Vec3> normal = faceNormal(a, b, c);
        if (!normal) {
            ++stats.degenerateTriangles;
            continue;
        }
        if (cullBackfaces && !isFrontFacing(*normal, a, b, c)) {
            continue;
        }
        const std::optional<ScreenVertex> screenA = projectVertex(a, width, height);
        const std::optional<ScreenVertex> screenB = projectVertex(b, width, height);
        const std::optional<ScreenVertex> screenC = projectVertex(c, width, height);
        if (!screenA || !screenB || !screenC) {
            continue;
        }
        const Color color = shadeColor(base, lambertIntensity(*normal, lightDirection));
        ++stats.rasterizedTriangles;
        stats.coveredFragments += rasterizeTriangle(
            {*screenA, *screenB, *screenC, color, source.sourceFace},
            width,
            height,
            [&](int x, int y, Barycentric, const ScreenTriangle& triangle) {
                const std::size_t index = std::size_t(y) * std::size_t(width) + std::size_t(x);
                colors[index] = packColor(triangle.color);
            }
        );
    }
    return stats;
}
#endif

#if LAB_CHECKPOINT >= 7
// Final pipeline clip trước projection rồi chỉ ghi color khi fragment vượt Z-buffer.
struct DepthBuffer {
    int width{1};
    int height{1};
    std::vector<double> values{1, 1.0};

    DepthBuffer(int initialWidth, int initialHeight) {
        resize(initialWidth, initialHeight);
    }

    void resize(int newWidth, int newHeight) {
        width = std::max(1, newWidth);
        height = std::max(1, newHeight);
        values.assign(std::size_t(width) * std::size_t(height), 1.0);
    }

    void clear() {
        std::fill(values.begin(), values.end(), 1.0);
    }

    [[nodiscard]] std::size_t index(int x, int y) const {
        return std::size_t(y) * std::size_t(width) + std::size_t(x);
    }
};

inline Vec3 intersectNearPlane(Vec3 start, Vec3 end, double nearPlane) {
    const double denominator = end.z - start.z;
    if (std::abs(denominator) <= 1e-12) {
        return {start.x, start.y, nearPlane};
    }
    const double t = std::clamp((nearPlane - start.z) / denominator, 0.0, 1.0);
    Vec3 result = start + (end - start) * t;
    result.z = nearPlane;
    return result;
}

inline std::vector<Vec3> clipTriangleToNearPlane(
    Vec3 a,
    Vec3 b,
    Vec3 c,
    double nearPlane
) {
    const std::array<Vec3, 3> input{a, b, c};
    std::vector<Vec3> output{};
    Vec3 previous = input.back();
    bool previousInside = previous.z >= nearPlane;
    for (const Vec3 current : input) {
        const bool currentInside = current.z >= nearPlane;
        if (previousInside && currentInside) {
            output.push_back(current);
        } else if (previousInside && !currentInside) {
            output.push_back(intersectNearPlane(previous, current, nearPlane));
        } else if (!previousInside && currentInside) {
            output.push_back(intersectNearPlane(previous, current, nearPlane));
            output.push_back(current);
        }
        previous = current;
        previousInside = currentInside;
    }
    return output;
}

inline double interpolateDepth(const ScreenTriangle& triangle, Barycentric weights) {
    return weights.a * triangle.a.ndcDepth + weights.b * triangle.b.ndcDepth +
        weights.c * triangle.c.ndcDepth;
}

struct RenderOptions {
    double angleX{-0.35};
    double angleY{0.65};
    double distance{4.2};
    double nearPlane{0.7};
    bool cullBackfaces{true};
    bool reverseOrder{};
};

struct RenderStats {
    std::size_t sourceTriangles{};
    std::size_t culledTriangles{};
    std::size_t degenerateTriangles{};
    std::size_t clippedTriangles{};
    std::size_t rasterizedTriangles{};
    std::size_t coveredFragments{};
    std::size_t passedFragments{};
    std::size_t rejectedFragments{};
};

inline RenderStats renderObjMesh(
    const ObjMesh& mesh,
    int width,
    int height,
    const RenderOptions& options,
    std::vector<std::uint32_t>& colors,
    DepthBuffer& depths
) {
    constexpr std::uint32_t clearColor = 0x090f1dffU;
    colors.assign(std::size_t(width) * std::size_t(height), clearColor);
    if (depths.width != width || depths.height != height) {
        depths.resize(width, height);
    } else {
        depths.clear();
    }

    RenderStats stats{};
    stats.sourceTriangles = mesh.triangles.size();
    const Color base{92, 190, 246, 255};
    const Vec3 lightDirection{-0.45, -0.75, -1.0};
    for (std::size_t position = 0; position < mesh.triangles.size(); ++position) {
        std::size_t triangleIndex = position;
        if (options.reverseOrder) {
            triangleIndex = mesh.triangles.size() - 1 - position;
        }
        const ObjTriangle& source = mesh.triangles[triangleIndex];
        const Vec3 a = toCameraPoint(
            mesh.positions[source.indices[0]],
            options.angleX,
            options.angleY,
            options.distance
        );
        const Vec3 b = toCameraPoint(
            mesh.positions[source.indices[1]],
            options.angleX,
            options.angleY,
            options.distance
        );
        const Vec3 c = toCameraPoint(
            mesh.positions[source.indices[2]],
            options.angleX,
            options.angleY,
            options.distance
        );
        const std::optional<Vec3> normal = faceNormal(a, b, c);
        if (!normal) {
            ++stats.degenerateTriangles;
            continue;
        }
        if (options.cullBackfaces && !isFrontFacing(*normal, a, b, c)) {
            ++stats.culledTriangles;
            continue;
        }

        const std::vector<Vec3> polygon = clipTriangleToNearPlane(
            a,
            b,
            c,
            options.nearPlane
        );
        if (polygon.size() < 3) {
            ++stats.clippedTriangles;
            continue;
        }
        if (polygon.size() != 3) {
            ++stats.clippedTriangles;
        }
        const Color color = shadeColor(base, lambertIntensity(*normal, lightDirection));
        for (std::size_t fanIndex = 1; fanIndex + 1 < polygon.size(); ++fanIndex) {
            const std::optional<ScreenVertex> screenA = projectVertex(
                polygon[0],
                width,
                height,
                options.nearPlane
            );
            const std::optional<ScreenVertex> screenB = projectVertex(
                polygon[fanIndex],
                width,
                height,
                options.nearPlane
            );
            const std::optional<ScreenVertex> screenC = projectVertex(
                polygon[fanIndex + 1],
                width,
                height,
                options.nearPlane
            );
            if (!screenA || !screenB || !screenC) {
                continue;
            }
            ++stats.rasterizedTriangles;
            stats.coveredFragments += rasterizeTriangle(
                {*screenA, *screenB, *screenC, color, source.sourceFace},
                width,
                height,
                [&](int x, int y, Barycentric weights, const ScreenTriangle& triangle) {
                    const std::size_t index = depths.index(x, y);
                    const double newDepth = interpolateDepth(triangle, weights);
                    if (newDepth >= depths.values[index]) {
                        ++stats.rejectedFragments;
                        return;
                    }
                    depths.values[index] = newDepth;
                    colors[index] = packColor(triangle.color);
                    ++stats.passedFragments;
                }
            );
        }
    }
    return stats;
}

inline bool depthBuffersNearlyEqual(
    const std::vector<double>& first,
    const std::vector<double>& second,
    double epsilon = 1e-9
) {
    if (first.size() != second.size()) {
        return false;
    }
    for (std::size_t index = 0; index < first.size(); ++index) {
        if (std::abs(first[index] - second[index]) > epsilon) {
            return false;
        }
    }
    return true;
}
#endif

#if LAB_CHECKPOINT >= 8
struct MeshValidation {
    std::size_t invalidIndexCount{};
    std::size_t degenerateTriangleCount{};

    [[nodiscard]] bool valid() const {
        return invalidIndexCount == 0 && degenerateTriangleCount == 0;
    }
};

inline MeshValidation validateMesh(const ObjMesh& mesh) {
    MeshValidation result{};
    for (const ObjTriangle& triangle : mesh.triangles) {
        bool indicesValid = true;
        for (const std::size_t index : triangle.indices) {
            if (index >= mesh.positions.size()) {
                ++result.invalidIndexCount;
                indicesValid = false;
            }
        }
        if (!indicesValid) {
            continue;
        }
        if (!faceNormal(
                mesh.positions[triangle.indices[0]],
                mesh.positions[triangle.indices[1]],
                mesh.positions[triangle.indices[2]]
            )) {
            ++result.degenerateTriangleCount;
        }
    }
    return result;
}
#endif
} // namespace lab
