#pragma once
#include "lab.hpp"

namespace lab {
inline constexpr std::array<Vec3, 8> kVertices{{
    {-1.0, -1.0, -1.0},
    {1.0, -1.0, -1.0},
    {1.0, 1.0, -1.0},
    {-1.0, 1.0, -1.0},
    {-1.0, -1.0, 1.0},
    {1.0, -1.0, 1.0},
    {1.0, 1.0, 1.0},
    {-1.0, 1.0, 1.0},
}};

inline constexpr std::array<std::array<std::size_t, 2>, 12> kEdges{{
    {0, 1},
    {1, 2},
    {2, 3},
    {3, 0},
    {4, 5},
    {5, 6},
    {6, 7},
    {7, 4},
    {0, 4},
    {1, 5},
    {2, 6},
    {3, 7},
}};

struct Scene {
    std::array<Vec3, 8> vertices = kVertices;
    std::size_t selectedVertex = 6;
    int selectedStage = 0;
    ModelTransform model{};
    Camera3D camera{};
    PerspectiveLens lens{};
    bool debug = true;
    bool paused = true;
};

inline Viewport viewportFor(const Scene& scene) {
    if (scene.debug) {
        return {1100.0, 560.0};
    }
    return {1100.0, 800.0};
}

inline void applyPreset(Scene& scene, int index) {
    scene = {};
    if (index == 1) {
        // Oracle: local (1,1,0) -> world (1,1,4) -> view (0,1,4).
        scene.selectedVertex = 0;
        scene.vertices[0] = {1.0, 1.0, 0.0};
        scene.model = {{1.0, 0.0, 6.0}, {2.0, 1.0, 1.0}, kPi / 2.0};
        scene.camera = {{1.0, 0.0, 0.0}, 0.0, 0.0};
        scene.lens = {kPi / 2.0, 1.0, 9.0};
    }
    if (index >= 2 && index <= 6) {
        scene.selectedVertex = 0;
        scene.vertices[0] = {0.0, 0.0, 0.0};
        scene.model = {{0.0, 1.6, 6.0}, {1.0, 1.0, 1.0}, 0.0};
        if (index == 2) {
            scene.model.position.z = 0.2;
        }
        if (index == 3) {
            scene.model.position.z = -2.0;
        }
        if (index == 4) {
            scene.model.position.z = 34.0;
        }
        if (index == 5) {
            scene.model.position = {12.0, 1.6, 4.0};
        }
        if (index == 6) {
            scene.model.position.z = 0.0;
        }
    }
}

enum class Parameter {
    LocalX,
    LocalY,
    LocalZ,
    ModelX,
    ModelZ,
    ModelYaw,
    ScaleX,
    CameraZ,
    CameraYaw,
    CameraPitch,
    Fov,
    Near,
    Far,
};

// Cả input SDL và slider Canvas dùng cùng khoảng giá trị, tính theo đơn vị world/radian.
inline void setParameter(Scene& scene, Parameter parameter, double value) {
    if (!std::isfinite(value) || scene.selectedVertex >= scene.vertices.size()) {
        return;
    }
    if ((parameter == Parameter::Near || parameter == Parameter::Far) && !validLens(scene.lens)) {
        return;
    }
    scene.paused = true;
    Vec3& local = scene.vertices[scene.selectedVertex];
    switch (parameter) {
    case Parameter::LocalX:
        local.x = std::clamp(value, -4.0, 4.0);
        break;
    case Parameter::LocalY:
        local.y = std::clamp(value, -4.0, 4.0);
        break;
    case Parameter::LocalZ:
        local.z = std::clamp(value, -4.0, 4.0);
        break;
    case Parameter::ModelX:
        scene.model.position.x = std::clamp(value, -12.0, 12.0);
        break;
    case Parameter::ModelZ:
        scene.model.position.z = std::clamp(value, -4.0, 34.0);
        break;
    case Parameter::ModelYaw:
        scene.model.yaw = wrapAngle(value);
        break;
    case Parameter::ScaleX:
        scene.model.scale.x = std::clamp(value, -2.0, 2.0);
        break;
    case Parameter::CameraZ:
        scene.camera.position.z = std::clamp(value, -4.0, 8.0);
        break;
    case Parameter::CameraYaw:
        scene.camera.yaw = wrapAngle(value);
        break;
    case Parameter::CameraPitch:
        scene.camera.pitch = std::clamp(value, -89.0 * kPi / 180.0, 89.0 * kPi / 180.0);
        break;
    case Parameter::Fov:
        scene.lens.verticalFovRadians = std::clamp(value, 25.0 * kPi / 180.0, 110.0 * kPi / 180.0);
        break;
    case Parameter::Near:
        scene.lens.nearPlane = std::clamp(value, 0.05, scene.lens.farPlane - 0.05);
        break;
    case Parameter::Far:
        scene.lens.farPlane = std::clamp(value, scene.lens.nearPlane + 0.05, 60.0);
        break;
    }
}

struct InspectorRow {
    const char* name = "";
    std::optional<Vec4> value = std::nullopt;
    int components = 4;
};

struct Inspection {
    std::array<InspectorRow, 6> rows{{
        {"LOCAL"},
        {"WORLD"},
        {"VIEW"},
        {"CLIP"},
        {"NDC", {}, 3},
        {"SCREEN", {}, 2},
    }};
    const char* status = "preview from P11 / stages not built yet";
    std::optional<double> agreement;
};

// Các bộ chuyển tiếp giúp renderer không phải biết checkpoint đang học.
inline Vec3 activeModelPoint(Vec3 local, const Scene& scene) {
#if LAB_CHECKPOINT >= 3
    return xyz(transform(modelMatrix(scene.model), toPoint(local)));
#else
    return add(local, scene.model.position);
#endif
}

inline Vec3 activeViewPoint(Vec3 world, const Scene& scene) {
#if LAB_CHECKPOINT >= 4
    return xyz(transform(viewMatrix(scene.camera), toPoint(world)));
#else
    return subtract(world, scene.camera.position);
#endif
}

inline Inspection inspectScene(const Scene& scene) {
    Inspection result;
    if (scene.selectedVertex >= scene.vertices.size()) {
        result.status = "invalid vertex index";
        return result;
    }
#if LAB_CHECKPOINT >= 1
    const Vec3 local = scene.vertices[scene.selectedVertex];
    if (finite(local)) {
        result.rows[0].value = Vec4{local.x, local.y, local.z, 1.0};
    }
#endif
#if LAB_CHECKPOINT >= 3
    const Vec4 world = transform(modelMatrix(scene.model), toPoint(local));
    if (finite(world)) {
        result.rows[1].value = world;
    }
#endif
#if LAB_CHECKPOINT >= 4
    const Vec4 view = transform(viewMatrix(scene.camera), world);
    if (finite(view)) {
        result.rows[2].value = view;
    }
#endif
#if LAB_CHECKPOINT >= 5
    const Viewport viewport = viewportFor(scene);
    if (validLens(scene.lens) && validViewport(viewport)) {
        const Vec4 clip = transform(projectionMatrix(scene.lens, viewport.width / viewport.height), view);
        if (finite(clip)) {
            result.rows[3].value = clip;
        }
    }
#endif
#if LAB_CHECKPOINT >= 6
    const PipelineTrace trace = tracePipeline(local, scene.model, scene.camera, scene.lens, viewport);
    result.rows[0].value = trace.local;
    result.rows[1].value = trace.world;
    result.rows[2].value = trace.camera;
    result.rows[3].value = trace.clip;
    if (trace.ndc) {
        result.rows[4].value = Vec4{trace.ndc->x, trace.ndc->y, trace.ndc->z, 0.0};
    }
    if (trace.screen) {
        result.rows[5].value = Vec4{trace.screen->x, trace.screen->y, 0.0, 0.0};
    }
    result.status = statusName(trace.status);
#endif
#if LAB_CHECKPOINT >= 7
    const double agreement = pipelineAgreementError(local, scene.model, scene.camera, scene.lens, viewport);
    if (std::isfinite(agreement)) {
        result.agreement = agreement;
    }
#endif
    return result;
}

inline void advanceScene(Scene& scene, double deltaTime) {
#if LAB_CHECKPOINT >= 7
    if (!scene.paused) {
        scene.model.yaw = advanceModelYaw(scene.model.yaw, 35.0 * kPi / 180.0, deltaTime);
    }
#else
    static_cast<void>(scene);
    static_cast<void>(deltaTime);
#endif
}
} // namespace lab
