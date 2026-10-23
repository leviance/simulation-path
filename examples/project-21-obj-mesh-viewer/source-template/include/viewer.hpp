#pragma once
#include "framebuffer.hpp"
#include "validation.hpp"

namespace lab {
struct ViewerState {
    double angleX{-0.35};
    double angleY{0.65};
    double cameraYaw{};
    double cameraPitch{};
    double distance{4.2};
    bool cameraDrag{};
    bool paused{true};
    bool wireframe{};
    bool normals{};
    bool cullBackfaces{true};
    bool reverseOrder{};
    bool debug{true};
    bool grid{true};
};

inline void turnViewer(ViewerState& state, double horizontal, double vertical) {
    if (state.cameraDrag) {
        state.cameraYaw = std::remainder(state.cameraYaw + horizontal, 6.283185307179586);
        state.cameraPitch = std::clamp(state.cameraPitch + vertical, -1.3, 1.3);
    } else {
        state.angleY = std::remainder(state.angleY + horizontal, 6.283185307179586);
        state.angleX = std::remainder(state.angleX + vertical, 6.283185307179586);
    }
    state.paused = true;
}

inline bool advanceViewer(ViewerState& state, double dt, bool singleStep = false) {
    if (!std::isfinite(dt) || (state.paused && !singleStep)) {
        return false;
    }
    state.angleY = std::remainder(state.angleY + std::clamp(dt, 0.0, 0.05) * 0.45, 6.283185307179586);
    return true;
}

struct ViewerModel {
#if LAB_CHECKPOINT >= 1
    ObjMesh mesh{};
#endif
    std::string path{};
    std::string message{};
    std::size_t sourceFaces{};
    std::size_t ignoredRecords{};
};

#if LAB_CHECKPOINT >= 1
// Nạp vào biến tạm. Lỗi không phá model hợp lệ mà người dùng đang xem.
inline bool openModel(ViewerModel& model, const std::string& path) {
    ObjLoadResult loaded = loadObjFile(path);
    if (!loaded.opened || loaded.hasErrors()) {
        model.message = path + ": ";
        for (const auto& diagnostic : loaded.diagnostics) {
            model.message += "line " + std::to_string(diagnostic.line) + ": " + diagnostic.message + "; ";
        }
        return false;
    }
#if LAB_CHECKPOINT >= 2
    if (loaded.mesh.triangles.empty()) {
        model.message = path + ": không có face được hỗ trợ";
        return false;
    }
#endif
#if LAB_CHECKPOINT >= 5
    if (!normalizeMesh(loaded.mesh)) {
        model.message = path + ": bounds rỗng hoặc suy biến";
        return false;
    }
#endif
    model.mesh = std::move(loaded.mesh);
    model.path = path;
    model.sourceFaces = loaded.sourceFaceCount;
    model.ignoredRecords = loaded.ignoredRecordCount;
    model.message.clear();
    return true;
}

inline OrbitCamera viewerCamera(const ViewerState& state) {
    return {state.cameraYaw, state.cameraPitch, state.distance};
}

inline Vec3 modelToCamera(Vec3 point, const ViewerState& state) {
    return worldToCamera(rotateModelPoint(point, state.angleX, state.angleY), viewerCamera(state));
}

inline void drawGrid(Framebuffer& frame, const ViewerState& state, const std::vector<double>* depths = nullptr) {
    const auto camera = viewerCamera(state);
    for (int index = -6; index <= 6; ++index) {
        const double offset = double(index) * 0.5;
        drawCameraLine(frame, worldToCamera({offset, -1.1, -3.0}, camera), worldToCamera({offset, -1.1, 3.0}, camera), 0x25334affU, depths);
        drawCameraLine(frame, worldToCamera({-3.0, -1.1, offset}, camera), worldToCamera({3.0, -1.1, offset}, camera), 0x25334affU, depths);
    }
    const Vec3 origin = worldToCamera({0.0, -1.1, 0.0}, camera);
    drawCameraLine(frame, origin, worldToCamera({1.4, -1.1, 0.0}, camera), 0xef657affU, depths);
    drawCameraLine(frame, origin, worldToCamera({0.0, 0.3, 0.0}, camera), 0x55d9a3ffU, depths);
    drawCameraLine(frame, origin, worldToCamera({0.0, -1.1, 1.4}, camera), 0x6eabffffU, depths);
}

inline void drawPoints(Framebuffer& frame, const ObjMesh& mesh, const ViewerState& state) {
    for (const Vec3 position : mesh.positions) {
        const auto screen = projectVertex(modelToCamera(position, state), frame.width, frame.height);
        if (!screen) {
            continue;
        }
        for (int dy = -2; dy <= 2; ++dy) {
            for (int dx = -2; dx <= 2; ++dx) {
                putPixel(frame, int(std::lround(screen->x)) + dx, int(std::lround(screen->y)) + dy, 0xffd166ffU);
            }
        }
    }
}

#if LAB_CHECKPOINT >= 2
inline void drawMeshEdges(Framebuffer& frame, const ObjMesh& mesh, const ViewerState& state) {
    for (const auto& triangle : mesh.triangles) {
        for (std::size_t edge = 0; edge < 3; ++edge) {
            const Vec3 a = modelToCamera(mesh.positions[triangle.indices[edge]], state);
            const Vec3 b = modelToCamera(mesh.positions[triangle.indices[(edge + 1) % 3]], state);
            drawCameraLine(frame, a, b, 0x70d6ffffU);
        }
    }
}
#endif

#if LAB_CHECKPOINT >= 6
inline void drawNormals(Framebuffer& frame, const ObjMesh& mesh, const ViewerState& state) {
    for (const auto& triangle : mesh.triangles) {
        const Vec3 a = modelToCamera(mesh.positions[triangle.indices[0]], state);
        const Vec3 b = modelToCamera(mesh.positions[triangle.indices[1]], state);
        const Vec3 c = modelToCamera(mesh.positions[triangle.indices[2]], state);
        const auto normal = faceNormal(a, b, c);
        if (!normal || !isFrontFacing(*normal, a, b, c)) {
            continue;
        }
        const Vec3 center = (a + b + c) * (1.0 / 3.0);
        drawCameraLine(frame, center, center + *normal * 0.12, 0xffc96bffU);
    }
}
#endif
#endif

// Cùng một điểm vào cho starter và mọi checkpoint; chỉ nhánh đã học được sinh ra.
struct ViewerStats {
    std::size_t triangles{};
    std::size_t passed{};
    std::size_t rejected{};
};

inline ViewerStats renderViewer(Framebuffer& frame, const ViewerState& state, const ViewerModel& model) {
    frame.clear();
    ViewerStats stats{};
#if LAB_CHECKPOINT >= 7
    RenderOptions options{};
    options.angleX = state.angleX;
    options.angleY = state.angleY;
    options.distance = state.distance;
    options.cameraYaw = state.cameraYaw;
    options.cameraPitch = state.cameraPitch;
    options.cullBackfaces = state.cullBackfaces;
    options.reverseOrder = state.reverseOrder;
    DepthBuffer depths(frame.width, frame.height);
    if (!state.wireframe) {
        const auto rendered = renderObjMesh(model.mesh, frame.width, frame.height, options, frame.pixels, depths);
        stats = {rendered.rasterizedTriangles, rendered.passedFragments, rendered.rejectedFragments};
    } else {
        if (state.grid) {
            drawGrid(frame, state);
        }
        drawMeshEdges(frame, model.mesh, state);
    }
    if (state.grid && !state.wireframe) {
        drawGrid(frame, state, &depths.values);
    }
#elif LAB_CHECKPOINT >= 6
    const auto rendered = renderPainterMesh(model.mesh, frame.width, frame.height, state.angleX, state.angleY, state.distance, state.cullBackfaces, frame.pixels);
    stats.triangles = rendered.rasterizedTriangles;
    stats.passed = rendered.coveredFragments;
#elif LAB_CHECKPOINT >= 2
    if (state.grid) {
        drawGrid(frame, state);
    }
    drawMeshEdges(frame, model.mesh, state);
#elif LAB_CHECKPOINT >= 1
    if (state.grid) {
        drawGrid(frame, state);
    }
    drawPoints(frame, model.mesh, state);
#else
    (void)state;
    (void)model;
#endif
#if LAB_CHECKPOINT >= 6
    if (state.normals) {
        drawNormals(frame, model.mesh, state);
    }
#endif
    return stats;
}
} // namespace lab
