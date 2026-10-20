#pragma once
#include <algorithm>
#include <array>
#include <cmath>
#include <limits>
#include <optional>

#ifndef LAB_CHECKPOINT
#define LAB_CHECKPOINT 7
#endif

namespace lab {
constexpr double kPi = 3.14159265358979323846;
constexpr double kDivideEpsilon = 1e-9;

struct Vec2 {
    double x = 0.0;
    double y = 0.0;
};

struct Vec3 {
    double x = 0.0;
    double y = 0.0;
    double z = 0.0;
};

// Kiểu dữ liệu cho inspector; phép toán Mat4 được thêm từ checkpoint 2.
struct Vec4 {
    double x = 0.0;
    double y = 0.0;
    double z = 0.0;
    double w = 0.0;
};

struct ModelTransform {
    Vec3 position{0.0, 1.0, 6.0};
    Vec3 scale{1.2, 0.9, 1.0};
    double yaw = kPi / 9.0;
};

struct Camera3D {
    Vec3 position{0.0, 1.6, 0.0};
    double yaw = 0.0;
    double pitch = 0.0;
};

struct PerspectiveLens {
    double verticalFovRadians = kPi / 3.0;
    double nearPlane = 0.5;
    double farPlane = 30.0;
};

struct Viewport {
    double width = 1100.0;
    double height = 560.0;
};

inline bool finite(Vec2 v) {
    return std::isfinite(v.x) && std::isfinite(v.y);
}

inline bool finite(Vec3 v) {
    return std::isfinite(v.x) && std::isfinite(v.y) && std::isfinite(v.z);
}

inline bool finite(Vec4 v) {
    return finite(Vec3{v.x, v.y, v.z}) && std::isfinite(v.w);
}

inline Vec3 add(Vec3 a, Vec3 b) {
    return {a.x + b.x, a.y + b.y, a.z + b.z};
}

inline Vec3 subtract(Vec3 a, Vec3 b) {
    return {a.x - b.x, a.y - b.y, a.z - b.z};
}

inline Vec3 scaleVector(Vec3 a, double s) {
    return {a.x * s, a.y * s, a.z * s};
}

inline Vec3 xyz(Vec4 v) {
    return {v.x, v.y, v.z};
}

inline double magnitude(Vec3 v) {
    return std::hypot(v.x, v.y, v.z);
}

inline double wrapAngle(double angle) {
    if (!std::isfinite(angle)) {
        return 0.0;
    }
    return std::remainder(angle, 2.0 * kPi);
}

inline Vec3 rotateY(Vec3 p, double angle) {
    const double cosine = std::cos(angle);
    const double sine = std::sin(angle);
    return {cosine * p.x + sine * p.z, p.y, -sine * p.x + cosine * p.z};
}

inline Vec3 rotateX(Vec3 p, double angle) {
    const double cosine = std::cos(angle);
    const double sine = std::sin(angle);
    return {p.x, cosine * p.y - sine * p.z, sine * p.y + cosine * p.z};
}

inline bool validLens(const PerspectiveLens& lens) {
    return std::isfinite(lens.verticalFovRadians) && lens.verticalFovRadians > 0.0 && lens.verticalFovRadians < kPi &&
        std::isfinite(lens.nearPlane) && std::isfinite(lens.farPlane) &&
        lens.nearPlane > 0.0 && lens.farPlane > lens.nearPlane;
}

inline bool validViewport(Viewport viewport) {
    return std::isfinite(viewport.width) && std::isfinite(viewport.height) && viewport.width > 0.0 && viewport.height > 0.0 &&
        std::isfinite(viewport.width / viewport.height);
}

#if LAB_CHECKPOINT >= 2
// Storage row-major KHÔNG quyết định convention nhân vector.
struct Mat4 {
    std::array<double, 16> values{};

    double& at(int row, int column) {
        return values[static_cast<std::size_t>(row * 4 + column)];
    }

    double at(int row, int column) const {
        return values[static_cast<std::size_t>(row * 4 + column)];
    }
};

inline Vec4 toPoint(Vec3 point) {
    return {point.x, point.y, point.z, 1.0};
}

inline Vec4 toDirection(Vec3 direction) {
    return {direction.x, direction.y, direction.z, 0.0};
}

inline Mat4 identityMatrix() {
    Mat4 result;
    for (int index = 0; index < 4; ++index) {
        result.at(index, index) = 1.0;
    }
    return result;
}

inline Mat4 multiply(const Mat4& left, const Mat4& right) {
    Mat4 result;
    for (int row = 0; row < 4; ++row) {
        for (int column = 0; column < 4; ++column) {
            double sum = 0.0;
            for (int index = 0; index < 4; ++index) {
                sum += left.at(row, index) * right.at(index, column);
            }
            result.at(row, column) = sum;
        }
    }
    return result;
}

inline Vec4 transform(const Mat4& matrix, Vec4 vector) {
    Vec4 result;
    result.x = matrix.at(0, 0) * vector.x + matrix.at(0, 1) * vector.y + matrix.at(0, 2) * vector.z + matrix.at(0, 3) * vector.w;
    result.y = matrix.at(1, 0) * vector.x + matrix.at(1, 1) * vector.y + matrix.at(1, 2) * vector.z + matrix.at(1, 3) * vector.w;
    result.z = matrix.at(2, 0) * vector.x + matrix.at(2, 1) * vector.y + matrix.at(2, 2) * vector.z + matrix.at(2, 3) * vector.w;
    result.w = matrix.at(3, 0) * vector.x + matrix.at(3, 1) * vector.y + matrix.at(3, 2) * vector.z + matrix.at(3, 3) * vector.w;
    return result;
}

inline Mat4 translationMatrix(Vec3 translation) {
    Mat4 result = identityMatrix();
    result.at(0, 3) = translation.x;
    result.at(1, 3) = translation.y;
    result.at(2, 3) = translation.z;
    return result;
}
#endif

#if LAB_CHECKPOINT >= 3
inline Mat4 scaleMatrix(Vec3 scale) {
    Mat4 result = identityMatrix();
    result.at(0, 0) = scale.x;
    result.at(1, 1) = scale.y;
    result.at(2, 2) = scale.z;
    return result;
}

inline Mat4 rotationYMatrix(double angle) {
    Mat4 result = identityMatrix();
    const double cosine = std::cos(angle);
    const double sine = std::sin(angle);
    result.at(0, 0) = cosine;
    result.at(0, 2) = sine;
    result.at(2, 0) = -sine;
    result.at(2, 2) = cosine;
    return result;
}

inline Mat4 modelMatrix(const ModelTransform& model) {
    const Mat4 scale = scaleMatrix(model.scale);
    const Mat4 rotation = rotationYMatrix(model.yaw);
    const Mat4 translation = translationMatrix(model.position);
    return multiply(translation, multiply(rotation, scale));
}

// Đường tham chiếu không nhân Mat4: scale từng tọa độ -> sin/cos -> cộng position.
inline Vec3 modelPointDirect(Vec3 localPoint, const ModelTransform& model) {
    const Vec3 scaled{localPoint.x * model.scale.x, localPoint.y * model.scale.y, localPoint.z * model.scale.z};
    return add(rotateY(scaled, model.yaw), model.position);
}
#endif

#if LAB_CHECKPOINT >= 4
inline Mat4 rotationXMatrix(double angle) {
    Mat4 result = identityMatrix();
    const double cosine = std::cos(angle);
    const double sine = std::sin(angle);
    result.at(1, 1) = cosine;
    result.at(1, 2) = -sine;
    result.at(2, 1) = sine;
    result.at(2, 2) = cosine;
    return result;
}

inline Mat4 viewMatrix(const Camera3D& camera) {
    const Mat4 inverseTranslation = translationMatrix(scaleVector(camera.position, -1.0));
    const Mat4 inverseYaw = rotationYMatrix(-camera.yaw);
    const Mat4 inversePitch = rotationXMatrix(camera.pitch);
    return multiply(inversePitch, multiply(inverseYaw, inverseTranslation));
}

inline Vec3 worldToCameraDirect(Vec3 worldPoint, const Camera3D& camera) {
    const Vec3 relative = subtract(worldPoint, camera.position);
    return rotateX(rotateY(relative, -camera.yaw), camera.pitch);
}
#endif

#if LAB_CHECKPOINT >= 5
// Tiền điều kiện: validLens(lens), aspectRatio hữu hạn và >0.
// Convention +Z trước, NDC z trong [0,1]; không chép ma trận OpenGL nhìn -Z.
inline Mat4 projectionMatrix(const PerspectiveLens& lens, double aspectRatio) {
    Mat4 result;
    const double focalScale = 1.0 / std::tan(lens.verticalFovRadians * 0.5);
    const double depthRange = lens.farPlane - lens.nearPlane;
    result.at(0, 0) = focalScale / aspectRatio;
    result.at(1, 1) = focalScale;
    result.at(2, 2) = lens.farPlane / depthRange;
    result.at(2, 3) = -lens.nearPlane * lens.farPlane / depthRange;
    result.at(3, 2) = 1.0;
    return result;
}
#endif

#if LAB_CHECKPOINT >= 6
enum class PipelineStatus {
    Visible,
    BehindCamera,
    BeforeNearPlane,
    BeyondFarPlane,
    OutsideFrustum,
    Invalid,
};

struct PipelineTrace {
    std::optional<Vec4> local;
    std::optional<Vec4> world;
    std::optional<Vec4> camera;
    std::optional<Vec4> clip;
    std::optional<Vec3> ndc;
    std::optional<Vec2> screen;
    PipelineStatus status = PipelineStatus::Invalid;
};

inline std::optional<Vec3> perspectiveDivide(Vec4 clipPoint) {
    if (!finite(clipPoint) || clipPoint.w <= kDivideEpsilon) {
        return std::nullopt;
    }
    const Vec3 ndc{clipPoint.x / clipPoint.w, clipPoint.y / clipPoint.w, clipPoint.z / clipPoint.w};
    if (!finite(ndc)) {
        return std::nullopt;
    }
    return ndc;
}

inline std::optional<Vec2> ndcToScreen(Vec3 ndc, Viewport viewport) {
    if (!finite(ndc) || !validViewport(viewport)) {
        return std::nullopt;
    }
    const Vec2 screen{(ndc.x + 1.0) * 0.5 * viewport.width, (1.0 - ndc.y) * 0.5 * viewport.height};
    if (!finite(screen)) {
        return std::nullopt;
    }
    return screen;
}

inline PipelineTrace tracePipeline(Vec3 localVertex, const ModelTransform& model, const Camera3D& camera, const PerspectiveLens& lens, Viewport viewport) {
    PipelineTrace trace;
    if (!finite(localVertex)) {
        return trace;
    }
    trace.local = toPoint(localVertex);
    if (!finite(model.position) || !finite(model.scale) || !std::isfinite(model.yaw)) {
        return trace;
    }
    const Vec4 world = transform(modelMatrix(model), *trace.local);
    if (!finite(world)) {
        return trace;
    }
    trace.world = world;
    if (!finite(camera.position) || !std::isfinite(camera.yaw) || !std::isfinite(camera.pitch)) {
        return trace;
    }
    const Vec4 view = transform(viewMatrix(camera), world);
    if (!finite(view)) {
        return trace;
    }
    trace.camera = view;
    if (!validLens(lens) || !validViewport(viewport)) {
        return trace;
    }
    const Vec4 clip = transform(projectionMatrix(lens, viewport.width / viewport.height), view);
    if (!finite(clip)) {
        return trace;
    }
    trace.clip = clip;
    if (clip.w <= kDivideEpsilon) {
        trace.status = PipelineStatus::BehindCamera;
        return trace;
    }
    trace.ndc = perspectiveDivide(clip);
    if (!trace.ndc) {
        return trace;
    }
    trace.screen = ndcToScreen(*trace.ndc, viewport);
    if (!trace.screen) {
        return trace;
    }
    // Giữ NDC/screen hữu hạn kể cả điểm bị clip; không dùng (0,0) làm giá trị giả.
    const double epsilon = 1e-10 * std::max(1.0, std::abs(clip.w));
    if (clip.z < -epsilon) {
        trace.status = PipelineStatus::BeforeNearPlane;
    } else if (clip.z > clip.w + epsilon) {
        trace.status = PipelineStatus::BeyondFarPlane;
    } else if (std::abs(clip.x) > clip.w + epsilon || std::abs(clip.y) > clip.w + epsilon) {
        trace.status = PipelineStatus::OutsideFrustum;
    } else {
        trace.status = PipelineStatus::Visible;
    }
    return trace;
}

inline const char* statusName(PipelineStatus status) {
    switch (status) {
    case PipelineStatus::Visible:
        return "visible";
    case PipelineStatus::BehindCamera:
        return "behind / w too small";
    case PipelineStatus::BeforeNearPlane:
        return "before-near";
    case PipelineStatus::BeyondFarPlane:
        return "beyond-far";
    case PipelineStatus::OutsideFrustum:
        return "outside";
    case PipelineStatus::Invalid:
        return "invalid input";
    }
    return "invalid input";
}
#endif

#if LAB_CHECKPOINT >= 7
inline Mat4 mvpMatrix(const ModelTransform& model, const Camera3D& camera, const PerspectiveLens& lens, double aspectRatio) {
    const Mat4 viewModel = multiply(viewMatrix(camera), modelMatrix(model));
    return multiply(projectionMatrix(lens, aspectRatio), viewModel);
}

inline double maxAbsDifference(Vec4 left, Vec4 right) {
    if (!finite(left) || !finite(right)) {
        return std::numeric_limits<double>::infinity();
    }
    double error = 0.0;
    error = std::max(error, std::abs(left.x - right.x));
    error = std::max(error, std::abs(left.y - right.y));
    error = std::max(error, std::abs(left.z - right.z));
    return std::max(error, std::abs(left.w - right.w));
}

inline double pipelineAgreementError(Vec3 localVertex, const ModelTransform& model, const Camera3D& camera, const PerspectiveLens& lens, Viewport viewport) {
    const PipelineTrace separate = tracePipeline(localVertex, model, camera, lens, viewport);
    if (!separate.local || !separate.clip) {
        return std::numeric_limits<double>::infinity();
    }
    const Vec4 composed = transform(mvpMatrix(model, camera, lens, viewport.width / viewport.height), *separate.local);
    return maxAbsDifference(*separate.clip, composed);
}

inline double advanceModelYaw(double yaw, double angularSpeed, double deltaTime) {
    if (!std::isfinite(yaw) || !std::isfinite(angularSpeed) || !std::isfinite(deltaTime) || deltaTime <= 0.0) {
        return yaw;
    }
    const double next = yaw + angularSpeed * std::min(deltaTime, 0.1);
    if (!std::isfinite(next)) {
        return yaw;
    }
    return wrapAngle(next);
}
#endif
} // namespace lab
