#pragma once
#include "scene.hpp"

namespace lab {
// Cắt screen trước khi đổi sang int để Bresenham luôn chạy trong giới hạn bảng.
inline bool clipScreen(Vec2& start, Vec2& end, const Viewport& viewport) {
    const Vec2 delta{end.x - start.x, end.y - start.y};
    double first = 0.0;
    double last = 1.0;
    const auto boundary = [&](double direction, double distance) {
        if (direction == 0.0) {
            return distance >= 0.0;
        }
        const double fraction = distance / direction;
        if (direction < 0.0) {
            first = std::max(first, fraction);
        } else {
            last = std::min(last, fraction);
        }
        return first <= last;
    };
    if (!boundary(-delta.x, start.x - viewport.x) || !boundary(delta.x, viewport.x + viewport.width - start.x) || !boundary(-delta.y, start.y - viewport.y) || !boundary(delta.y, viewport.y + viewport.height - start.y)) {
        return false;
    }
    end = {start.x + last * delta.x, start.y + last * delta.y};
    start = {start.x + first * delta.x, start.y + first * delta.y};
    return true;
}

// Kết quả là screen point hữu hạn, đã clip; không đưa tọa độ cực lớn vào Bresenham.
struct ScreenSegment {
    Vec2 from{};
    Vec2 to{};
    double averageDepth = 0.0;
};

inline std::optional<ScreenSegment> projectSegment(const ProjectionResult& a, const ProjectionResult& b, const Scene& scene, std::size_t& extraProjections) {
    Vec3 start = a.cameraPoint;
    Vec3 end = b.cameraPoint;
    if (a.status == ProjectionStatus::Invalid || b.status == ProjectionStatus::Invalid || !clipDepth(start, end, scene.lens)) {
        return std::nullopt;
    }
    std::optional<Vec2> from = a.screen;
    std::optional<Vec2> to = b.screen;
    // Endpoint gốc hợp lệ thì dùng cache. Chỉ project lại khi clip near/far sinh endpoint mới.
    if (!from || !to) {
        Scene cameraScene = scene;
        cameraScene.camera = {};
        from = projectVertex(start, cameraScene).screen;
        to = projectVertex(end, cameraScene).screen;
        extraProjections += 2;
    }
    if (!from || !to || !clipScreen(*from, *to, viewportFor())) {
        return std::nullopt;
    }
    return ScreenSegment{*from, *to, (start.z + end.z) * 0.5};
}
#if LAB_CHECKPOINT >= 2
struct RenderEdge {
    ScreenSegment screen{};
    std::size_t edgeIndex = 0;
    double depthFactor = 1.0;
};

struct EdgeFrame {
    std::array<RenderEdge, 12> edges{};
    std::size_t count = 0;
    std::size_t extraProjections = 0;
};

inline EdgeFrame buildEdges(const ProjectedCube& projected, const Scene& scene) {
    EdgeFrame frame;
    for (std::size_t i = 0; i < kCubeEdges.size(); ++i) {
        const Edge edge = kCubeEdges[i];
        if (!isEdgeValid(edge)) {
            continue;
        }
        const auto screen = projectSegment(projected.vertices[edge.from], projected.vertices[edge.to], scene, frame.extraProjections);
        if (screen) {
            frame.edges[frame.count] = {*screen, i, 1.0};
            ++frame.count;
        }
    }
#if LAB_CHECKPOINT >= 6
    // Average Z chỉ hỗ trợ thứ tự/màu của wireframe, không loại mặt hay cạnh bị che.
    std::stable_sort(frame.edges.begin(), frame.edges.begin() + frame.count, [](const RenderEdge& a, const RenderEdge& b) {
        return a.screen.averageDepth > b.screen.averageDepth;
    });
    if (frame.count > 0) {
        const double farthest = frame.edges[0].screen.averageDepth;
        const double nearest = frame.edges[frame.count - 1].screen.averageDepth;
        const double range = farthest - nearest;
        if (range > 1e-12) {
            for (std::size_t i = 0; i < frame.count; ++i) {
                frame.edges[i].depthFactor = (farthest - frame.edges[i].screen.averageDepth) / range;
            }
        }
    }
#endif
    return frame;
}
#endif
} // namespace lab
