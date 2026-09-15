#pragma once

#include <algorithm>
#include <array>
#include <cmath>

#ifndef LAB_CHECKPOINT
#define LAB_CHECKPOINT 7
#endif

namespace lab {
#if LAB_CHECKPOINT >= 1
constexpr double kPi = 3.14159265358979323846;

struct Vec2 {
    double x{};
    double y{};
};

struct Vec3 {
    double x{};
    double y{};
    double z{};
};

inline Vec2 previewLocalVertex(Vec3 point, double pixelsPerUnit) {
    return {point.x * pixelsPerUnit, point.y * pixelsPerUnit};
}
#endif

#if LAB_CHECKPOINT >= 2
// Mat4 lưu theo row-major, nhưng mọi phép biến đổi dùng column vector.
struct Vec4 {
    double x{};
    double y{};
    double z{};
    double w{};
};

struct Mat4 {
    std::array<double, 16> values{};

    double& at(int row, int column) {
        return values[std::size_t(row * 4 + column)];
    }

    double at(int row, int column) const {
        return values[std::size_t(row * 4 + column)];
    }
};

inline Vec4 toPoint(Vec3 point) {
    return {point.x, point.y, point.z, 1.0};
}

inline Vec4 toDirection(Vec3 direction) {
    return {direction.x, direction.y, direction.z, 0.0};
}

inline Vec3 xyz(Vec4 vector) {
    return {vector.x, vector.y, vector.z};
}

inline Vec3 add(Vec3 left, Vec3 right) {
    return {left.x + right.x, left.y + right.y, left.z + right.z};
}

inline Vec3 subtract(Vec3 left, Vec3 right) {
    return {left.x - right.x, left.y - right.y, left.z - right.z};
}

inline Vec3 multiply(Vec3 vector, double scalar) {
    return {vector.x * scalar, vector.y * scalar, vector.z * scalar};
}

inline double magnitude(Vec3 vector) {
    return std::hypot(vector.x, vector.y, vector.z);
}

inline Mat4 identityMatrix() {
    Mat4 matrix{};
    for (int index = 0; index < 4; ++index) {
        matrix.at(index, index) = 1.0;
    }
    return matrix;
}

inline Mat4 multiply(Mat4 left, Mat4 right) {
    Mat4 result{};
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

inline Vec4 transform(Mat4 matrix, Vec4 vector) {
    return {
        matrix.at(0, 0) * vector.x + matrix.at(0, 1) * vector.y +
            matrix.at(0, 2) * vector.z + matrix.at(0, 3) * vector.w,
        matrix.at(1, 0) * vector.x + matrix.at(1, 1) * vector.y +
            matrix.at(1, 2) * vector.z + matrix.at(1, 3) * vector.w,
        matrix.at(2, 0) * vector.x + matrix.at(2, 1) * vector.y +
            matrix.at(2, 2) * vector.z + matrix.at(2, 3) * vector.w,
        matrix.at(3, 0) * vector.x + matrix.at(3, 1) * vector.y +
            matrix.at(3, 2) * vector.z + matrix.at(3, 3) * vector.w,
    };
}

inline Mat4 translationMatrix(Vec3 translation) {
    Mat4 matrix = identityMatrix();
    matrix.at(0, 3) = translation.x;
    matrix.at(1, 3) = translation.y;
    matrix.at(2, 3) = translation.z;
    return matrix;
}
#endif

#if LAB_CHECKPOINT >= 3
struct ModelTransform {
    Vec3 position{0.3, -0.2, 6.0};
    Vec3 scale{1.2, 0.9, 1.0};
    double yaw{20.0 * kPi / 180.0};
};

inline Mat4 scaleMatrix(Vec3 scale) {
    Mat4 matrix = identityMatrix();
    matrix.at(0, 0) = scale.x;
    matrix.at(1, 1) = scale.y;
    matrix.at(2, 2) = scale.z;
    return matrix;
}

inline Mat4 rotationYMatrix(double angle) {
    Mat4 matrix = identityMatrix();
    const double cosine = std::cos(angle);
    const double sine = std::sin(angle);
    matrix.at(0, 0) = cosine;
    matrix.at(0, 2) = sine;
    matrix.at(2, 0) = -sine;
    matrix.at(2, 2) = cosine;
    return matrix;
}

inline Vec3 rotateY(Vec3 point, double angle) {
    const double cosine = std::cos(angle);
    const double sine = std::sin(angle);
    return {
        cosine * point.x + sine * point.z,
        point.y,
        -sine * point.x + cosine * point.z,
    };
}

inline Mat4 modelMatrix(const ModelTransform& model) {
    const Mat4 scale = scaleMatrix(model.scale);
    const Mat4 rotation = rotationYMatrix(model.yaw);
    const Mat4 translation = translationMatrix(model.position);
    return multiply(translation, multiply(rotation, scale));
}

inline Vec3 modelPointDirect(Vec3 localPoint, const ModelTransform& model) {
    const Vec3 scaled = {
        localPoint.x * model.scale.x,
        localPoint.y * model.scale.y,
        localPoint.z * model.scale.z,
    };
    const Vec3 rotated = rotateY(scaled, model.yaw);
    return add(rotated, model.position);
}
#endif

#if LAB_CHECKPOINT >= 4
struct Camera3D {
    Vec3 position{};
    double yaw{};
    double pitch{};
};

inline Mat4 rotationXMatrix(double angle) {
    Mat4 matrix = identityMatrix();
    const double cosine = std::cos(angle);
    const double sine = std::sin(angle);
    matrix.at(1, 1) = cosine;
    matrix.at(1, 2) = -sine;
    matrix.at(2, 1) = sine;
    matrix.at(2, 2) = cosine;
    return matrix;
}

inline Vec3 rotateX(Vec3 point, double angle) {
    const double cosine = std::cos(angle);
    const double sine = std::sin(angle);
    return {
        point.x,
        cosine * point.y - sine * point.z,
        sine * point.y + cosine * point.z,
    };
}

inline Mat4 viewMatrix(const Camera3D& camera) {
    const Mat4 inverseTranslation = translationMatrix(multiply(camera.position, -1.0));
    const Mat4 inverseYaw = rotationYMatrix(-camera.yaw);
    const Mat4 inversePitch = rotationXMatrix(camera.pitch);
    return multiply(inversePitch, multiply(inverseYaw, inverseTranslation));
}

inline Vec3 worldToCameraDirect(Vec3 worldPoint, const Camera3D& camera) {
    const Vec3 relative = subtract(worldPoint, camera.position);
    const Vec3 yawNeutral = rotateY(relative, -camera.yaw);
    return rotateX(yawNeutral, camera.pitch);
}
#endif

#if LAB_CHECKPOINT >= 5
struct PerspectiveLens {
    double verticalFovRadians{60.0 * kPi / 180.0};
    double nearPlane{0.5};
    double farPlane{30.0};
};

inline Mat4 projectionMatrix(const PerspectiveLens& lens, double aspectRatio) {
    Mat4 matrix{};
    const double focalScale = 1.0 / std::tan(lens.verticalFovRadians * 0.5);
    const double depthRange = lens.farPlane - lens.nearPlane;
    matrix.at(0, 0) = focalScale / aspectRatio;
    matrix.at(1, 1) = focalScale;
    matrix.at(2, 2) = lens.farPlane / depthRange;
    matrix.at(2, 3) = -lens.nearPlane * lens.farPlane / depthRange;
    matrix.at(3, 2) = 1.0;
    return matrix;
}
#endif

#if LAB_CHECKPOINT >= 6
enum class PipelineStatus {
    Visible,
    BehindCamera,
    BeforeNearPlane,
    BeyondFarPlane,
    OutsideFrustum,
};

struct PipelineTrace {
    Vec4 local{};
    Vec4 world{};
    Vec4 camera{};
    Vec4 clip{};
    Vec3 ndc{};
    Vec2 screen{};
    PipelineStatus status{PipelineStatus::BehindCamera};
};

inline Vec3 perspectiveDivide(Vec4 clipPoint) {
    return {
        clipPoint.x / clipPoint.w,
        clipPoint.y / clipPoint.w,
        clipPoint.z / clipPoint.w,
    };
}

inline Vec2 ndcToScreen(Vec3 ndc, int width, int height) {
    return {
        (ndc.x + 1.0) * 0.5 * double(width),
        (1.0 - ndc.y) * 0.5 * double(height),
    };
}

inline bool insideNdc(Vec3 ndc) {
    return std::abs(ndc.x) <= 1.0 && std::abs(ndc.y) <= 1.0 && ndc.z >= 0.0 &&
        ndc.z <= 1.0;
}

inline PipelineTrace tracePipeline(
    Vec3 localVertex,
    const ModelTransform& model,
    const Camera3D& camera,
    const PerspectiveLens& lens,
    int viewportWidth,
    int viewportHeight
) {
    PipelineTrace trace{};
    trace.local = toPoint(localVertex);
    trace.world = transform(modelMatrix(model), trace.local);
    trace.camera = transform(viewMatrix(camera), trace.world);
    const double aspectRatio = double(viewportWidth) / double(viewportHeight);
    trace.clip = transform(projectionMatrix(lens, aspectRatio), trace.camera);

    if (trace.camera.z <= 0.0 || trace.clip.w <= 0.0) {
        trace.status = PipelineStatus::BehindCamera;
        return trace;
    }
    if (trace.camera.z < lens.nearPlane) {
        trace.status = PipelineStatus::BeforeNearPlane;
        return trace;
    }
    if (trace.camera.z > lens.farPlane) {
        trace.status = PipelineStatus::BeyondFarPlane;
        return trace;
    }

    trace.ndc = perspectiveDivide(trace.clip);
    if (!insideNdc(trace.ndc)) {
        trace.status = PipelineStatus::OutsideFrustum;
        return trace;
    }
    trace.screen = ndcToScreen(trace.ndc, viewportWidth, viewportHeight);
    trace.status = PipelineStatus::Visible;
    return trace;
}
#endif

#if LAB_CHECKPOINT >= 7
inline Mat4 mvpMatrix(
    const ModelTransform& model,
    const Camera3D& camera,
    const PerspectiveLens& lens,
    double aspectRatio
) {
    const Mat4 viewModel = multiply(viewMatrix(camera), modelMatrix(model));
    return multiply(projectionMatrix(lens, aspectRatio), viewModel);
}

inline double maxAbsDifference(Vec4 left, Vec4 right) {
    double error = 0.0;
    error = std::max(error, std::abs(left.x - right.x));
    error = std::max(error, std::abs(left.y - right.y));
    error = std::max(error, std::abs(left.z - right.z));
    error = std::max(error, std::abs(left.w - right.w));
    return error;
}

inline double pipelineAgreementError(
    Vec3 localVertex,
    const ModelTransform& model,
    const Camera3D& camera,
    const PerspectiveLens& lens,
    int viewportWidth,
    int viewportHeight
) {
    const PipelineTrace separate = tracePipeline(
        localVertex,
        model,
        camera,
        lens,
        viewportWidth,
        viewportHeight
    );
    const double aspectRatio = double(viewportWidth) / double(viewportHeight);
    const Vec4 composed = transform(mvpMatrix(model, camera, lens, aspectRatio), toPoint(localVertex));
    return maxAbsDifference(separate.clip, composed);
}

inline double advanceModelYaw(double yaw, double angularSpeed, double deltaTime) {
    const double safeDeltaTime = std::clamp(deltaTime, 0.0, 0.1);
    return std::remainder(yaw + angularSpeed * safeDeltaTime, 2.0 * kPi);
}
#endif
} // namespace lab
