#pragma once
#include "viewer-mesh.hpp"
#include "viewer-scene.hpp"

namespace lab {
#if LAB_CHECKPOINT >= 3
inline float clipDistance(Vec4 point, int plane) {
    switch (plane) {
    case 0:
        return point.w + point.x;
    case 1:
        return point.w - point.x;
    case 2:
        return point.w + point.y;
    case 3:
        return point.w - point.y;
    case 4:
        return point.w + point.z;
    default:
        return point.w - point.z;
    }
}

inline Vec4 intersectClipEdge(Vec4 a, Vec4 b, int plane) {
    // Canonical endpoint order keeps shared clip intersections reproducible.
    if (std::array<float, 4>{a.x, a.y, a.z, a.w} > std::array<float, 4>{b.x, b.y, b.z, b.w})
        std::swap(a, b);
    const float start = clipDistance(a, plane), end = clipDistance(b, plane);
    const float along = start / (start - end);
    return {a.x + along * (b.x - a.x), a.y + along * (b.y - a.y), a.z + along * (b.z - a.z), a.w + along * (b.w - a.w)};
}

struct ClipPolygon {
    std::array<Vec4, 12> points{};
    std::size_t count{};

    void append(Vec4 point) {
        if (count > 0) {
            const auto last = points[count - 1];
            if (last.x == point.x && last.y == point.y && last.z == point.z && last.w == point.w)
                return;
        }
        if (count == points.size())
            throw std::runtime_error("Convex clipping budget exceeded");
        points[count++] = point;
    }
};

inline ClipPolygon clipViewerTriangle(Vec4 a, Vec4 b, Vec4 c) {
    ClipPolygon polygon{};
    polygon.append(a);
    polygon.append(b);
    polygon.append(c);
    for (int plane = 0; plane < 6 && polygon.count >= 3; ++plane) {
        ClipPolygon output{};
        Vec4 previous = polygon.points[polygon.count - 1];
        bool wasInside = clipDistance(previous, plane) >= 0;
        for (std::size_t index = 0; index < polygon.count; ++index) {
            const auto current = polygon.points[index];
            const bool inside = clipDistance(current, plane) >= 0;
            if (inside != wasInside)
                output.append(intersectClipEdge(previous, current, plane));
            if (inside)
                output.append(current);
            previous = current;
            wasInside = inside;
        }
        if (output.count > 1) {
            const auto first = output.points[0], last = output.points[output.count - 1];
            if (first.x == last.x && first.y == last.y && first.z == last.z && first.w == last.w)
                --output.count;
        }
        polygon = output;
    }
    return polygon;
}

inline ScreenVertex viewerScreenVertex(Vec4 clip, int width, int height) {
    return {(clip.x / clip.w * 0.5F + 0.5F) * width, (0.5F - clip.y / clip.w * 0.5F) * height, clip.z / clip.w * 0.5F + 0.5F, clip.w};
}

inline float viewerEdge(ScreenVertex a, ScreenVertex b, float x, float y) {
    bool reverse = a.y > b.y || (a.y == b.y && a.x > b.x);
    if (reverse)
        std::swap(a, b);
    const float value = (b.x - a.x) * (y - a.y) - (b.y - a.y) * (x - a.x);
    if (reverse) {
        return -value;
    }
    return value;
}

inline bool topLeftEdge(ScreenVertex a, ScreenVertex b) {
    return b.y < a.y || (b.y == a.y && b.x > a.x);
}

inline Rgb viewerFaceColor(const MeshVertex& vertex, const ViewerScene& scene, const ViewerMatrices& matrices) {
    float intensity = 1;
    if (scene.lit) {
        const Vec4 rotated = transform(matrices.model, {vertex.normalX, vertex.normalY, vertex.normalZ, 0});
        const Vec3 normal = unitVector({rotated.x, rotated.y, rotated.z});
        const Vec3 light = unitVector({scene.lightX, scene.lightY, scene.lightZ});
        intensity = 0.22F + 0.78F * std::max(0.0F, dotVector(normal, light));
    }
    return {std::uint8_t(std::lround(std::clamp(scene.baseRed * intensity, 0.0F, 1.0F) * 255)), std::uint8_t(std::lround(std::clamp(scene.baseGreen * intensity, 0.0F, 1.0F) * 255)), std::uint8_t(std::lround(std::clamp(scene.baseBlue * intensity, 0.0F, 1.0F) * 255))};
}

inline bool writeViewerPixel(Framebuffer& frame, int x, int y, float depth, Rgb color, bool depthEnabled, float bias = 0) {
    if (x < 0 || y < 0 || x >= frame.width || y >= frame.height || !std::isfinite(depth) || depth < 0 || depth > 1)
        return false;
    const auto pixel = std::size_t(y) * std::size_t(frame.width) + std::size_t(x);
    if (depthEnabled && depth - bias >= frame.depth[pixel])
        return false;
    if (depthEnabled)
        frame.depth[pixel] = depth;
    const auto offset = pixel * 4;
    frame.rgba[offset] = color.red;
    frame.rgba[offset + 1] = color.green;
    frame.rgba[offset + 2] = color.blue;
    frame.rgba[offset + 3] = 255;
    return true;
}

inline void drawViewerLine(Framebuffer& frame, Vec4 a, Vec4 b, Rgb color, bool depthEnabled) {
    for (int plane = 0; plane < 6; ++plane) {
        const bool insideA = clipDistance(a, plane) >= 0, insideB = clipDistance(b, plane) >= 0;
        if (!insideA && !insideB)
            return;
        if (insideA != insideB) {
            const auto hit = intersectClipEdge(a, b, plane);
            if (!insideA)
                a = hit;
            else
                b = hit;
        }
    }
    if (a.w <= 1e-7F || b.w <= 1e-7F)
        return;
    const auto start = viewerScreenVertex(a, frame.width, frame.height), end = viewerScreenVertex(b, frame.width, frame.height);
    const int steps = std::max(1, int(std::ceil(std::max(std::abs(end.x - start.x), std::abs(end.y - start.y)))));
    for (int step = 0; step <= steps; ++step) {
        const float along = float(step) / steps;
        writeViewerPixel(frame, int(std::floor(start.x + along * (end.x - start.x))), int(std::floor(start.y + along * (end.y - start.y))), start.depth + along * (end.depth - start.depth), color, depthEnabled, 1e-5F);
    }
}

struct ViewerCpuStats {
    std::size_t submitted{}, clipped{}, culled{}, rasterized{}, passed{}, rejected{};
};

inline void fillViewerTriangle(Framebuffer& frame, ScreenVertex a, ScreenVertex b, ScreenVertex c, Rgb color, bool depthEnabled, ViewerCpuStats& stats) {
    float area = viewerEdge(a, b, c.x, c.y);
    if (std::abs(area) < 1e-7F)
        return;
    if (area < 0) {
        std::swap(b, c);
        area = -area;
    }
    const int left = std::clamp(int(std::floor(std::min({a.x, b.x, c.x}))), 0, frame.width - 1);
    const int right = std::clamp(int(std::ceil(std::max({a.x, b.x, c.x}))), 0, frame.width - 1);
    const int top = std::clamp(int(std::floor(std::min({a.y, b.y, c.y}))), 0, frame.height - 1);
    const int bottom = std::clamp(int(std::ceil(std::max({a.y, b.y, c.y}))), 0, frame.height - 1);
    const bool includeA = topLeftEdge(b, c), includeB = topLeftEdge(c, a), includeC = topLeftEdge(a, b);
    ++stats.rasterized;
    for (int y = top; y <= bottom; ++y) {
        for (int x = left; x <= right; ++x) {
            const float sampleX = x + 0.5F, sampleY = y + 0.5F;
            const float edgeA = viewerEdge(b, c, sampleX, sampleY), edgeB = viewerEdge(c, a, sampleX, sampleY), edgeC = viewerEdge(a, b, sampleX, sampleY);
            if (edgeA < 0 || (edgeA == 0 && !includeA) || edgeB < 0 || (edgeB == 0 && !includeB) || edgeC < 0 || (edgeC == 0 && !includeC))
                continue;
            const float depth = (edgeA * a.depth + edgeB * b.depth + edgeC * c.depth) / area;
            if (writeViewerPixel(frame, x, y, depth, color, depthEnabled))
                ++stats.passed;
            else
                ++stats.rejected;
        }
    }
}

struct CpuViewerRenderer {
    std::vector<Vec4> clipVertices{};

    ViewerCpuStats render(Framebuffer& frame, const ViewerMesh& mesh, const ViewerScene& scene, const ViewerMatrices& matrices) {
        frame.clear();
        clipVertices.resize(mesh.vertices.size());
        for (std::size_t index = 0; index < mesh.vertices.size(); ++index) {
            const auto& vertex = mesh.vertices[index];
            clipVertices[index] = transform(matrices.mvp, {vertex.positionX, vertex.positionY, vertex.positionZ, 1});
        }
        ViewerCpuStats stats{};
        stats.submitted = mesh.triangleCount();
        for (std::size_t order = 0; order < mesh.triangleCount(); ++order) {
            std::size_t triangle = order;
            if (scene.view.reverseOrder) {
                triangle = mesh.triangleCount() - order - 1;
            }
            const auto offset = triangle * 3;
            const auto ia = mesh.indices[offset], ib = mesh.indices[offset + 1], ic = mesh.indices[offset + 2];
            const auto polygon = clipViewerTriangle(clipVertices[ia], clipVertices[ib], clipVertices[ic]);
            if (polygon.count < 3) {
                ++stats.clipped;
                continue;
            }
            if (polygon.count != 3)
                ++stats.clipped;
            std::array<ScreenVertex, 12> screen{};
            bool valid = true;
            for (std::size_t index = 0; index < polygon.count; ++index) {
                if (polygon.points[index].w <= 1e-7F) {
                    valid = false;
                    break;
                }
                screen[index] = viewerScreenVertex(polygon.points[index], frame.width, frame.height);
            }
            if (!valid) {
                ++stats.clipped;
                continue;
            }
            float area = 0;
            for (std::size_t index = 1; index + 1 < polygon.count && std::abs(area) < 1e-7F; ++index)
                area = viewerEdge(screen[0], screen[index], screen[index + 1].x, screen[index + 1].y);
            if (std::abs(area) < 1e-7F)
                continue;
            if (scene.view.cullBackfaces && area > 0) {
                ++stats.culled;
                continue;
            }
            const auto color = viewerFaceColor(mesh.vertices[ia], scene, matrices);
            if (scene.view.wireframe) {
                for (std::size_t index = 0; index < polygon.count; ++index)
                    drawViewerLine(frame, polygon.points[index], polygon.points[(index + 1) % polygon.count], color, scene.depthEnabled);
            } else {
                for (std::size_t index = 1; index + 1 < polygon.count; ++index)
                    fillViewerTriangle(frame, screen[0], screen[index], screen[index + 1], color, scene.depthEnabled, stats);
            }
        }
        if (scene.view.grid) {
            const auto viewProjection = multiply(matrices.projection, matrices.view);
            for (int index = -6; index <= 6; ++index) {
                const float position = index * 0.5F;
                drawViewerLine(frame, transform(viewProjection, {position, -1.1F, -3, 1}), transform(viewProjection, {position, -1.1F, 3, 1}), {37, 51, 74}, scene.depthEnabled);
                drawViewerLine(frame, transform(viewProjection, {-3, -1.1F, position, 1}), transform(viewProjection, {3, -1.1F, position, 1}), {37, 51, 74}, scene.depthEnabled);
            }
        }
        if (scene.view.normals) {
            for (std::size_t triangle = 0; triangle < mesh.triangleCount(); ++triangle) {
                const auto& a = mesh.vertices[mesh.indices[triangle * 3]];
                const auto& b = mesh.vertices[mesh.indices[triangle * 3 + 1]];
                const auto& c = mesh.vertices[mesh.indices[triangle * 3 + 2]];
                const Vec4 center{(a.positionX + b.positionX + c.positionX) / 3, (a.positionY + b.positionY + c.positionY) / 3, (a.positionZ + b.positionZ + c.positionZ) / 3, 1};
                const Vec4 tip{center.x + a.normalX * 0.12F, center.y + a.normalY * 0.12F, center.z + a.normalZ * 0.12F, 1};
                drawViewerLine(frame, transform(matrices.mvp, center), transform(matrices.mvp, tip), {255, 201, 107}, scene.depthEnabled);
            }
        }
        return stats;
    }
};
#endif
} // namespace lab
