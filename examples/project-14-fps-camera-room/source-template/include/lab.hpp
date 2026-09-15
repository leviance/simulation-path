#pragma once

#include <algorithm>
#include <cmath>
#include <cstddef>
#include <vector>

#ifndef LAB_CHECKPOINT
#define LAB_CHECKPOINT 7
#endif

namespace lab {
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

inline Vec3 add(Vec3 left, Vec3 right) {
    return {left.x + right.x, left.y + right.y, left.z + right.z};
}

inline Vec3 subtract(Vec3 left, Vec3 right) {
    return {left.x - right.x, left.y - right.y, left.z - right.z};
}

inline Vec3 multiply(Vec3 vector, double scalar) {
    return {vector.x * scalar, vector.y * scalar, vector.z * scalar};
}

inline double dot(Vec3 left, Vec3 right) {
    return left.x * right.x + left.y * right.y + left.z * right.z;
}

inline double magnitude(Vec3 vector) {
    return std::sqrt(dot(vector, vector));
}

struct PerspectiveLens {
    double verticalFovRadians{60.0 * kPi / 180.0};
};

enum class ProjectionStatus {
    Visible,
    BehindCamera,
    BeforeNearPlane,
    OutsideFrustum,
};

struct ProjectionResult {
    ProjectionStatus status{ProjectionStatus::BehindCamera};
    Vec3 cameraPoint{};
    Vec2 ndc{};
    Vec2 screen{};
};

inline ProjectionResult projectCameraPoint(
    Vec3 cameraPoint,
    const PerspectiveLens& lens,
    double nearPlane,
    int width,
    int height
) {
    ProjectionResult result{};
    result.cameraPoint = cameraPoint;
    if (cameraPoint.z <= 0.0) {
        result.status = ProjectionStatus::BehindCamera;
        return result;
    }
    if (cameraPoint.z < nearPlane) {
        result.status = ProjectionStatus::BeforeNearPlane;
        return result;
    }

    const double aspectRatio = double(width) / double(height);
    const double focalScale = 1.0 / std::tan(lens.verticalFovRadians * 0.5);
    result.ndc = {
        cameraPoint.x * focalScale / (cameraPoint.z * aspectRatio),
        cameraPoint.y * focalScale / cameraPoint.z,
    };
    result.screen = {
        (result.ndc.x + 1.0) * 0.5 * width,
        (1.0 - result.ndc.y) * 0.5 * height,
    };
    if (std::abs(result.ndc.x) > 1.0 || std::abs(result.ndc.y) > 1.0) {
        result.status = ProjectionStatus::OutsideFrustum;
        return result;
    }
    result.status = ProjectionStatus::Visible;
    return result;
}

#if LAB_CHECKPOINT >= 1
// Room geometry sống trong world space và không thay đổi khi camera di chuyển.
struct RoomBounds {
    double minX{-6.0};
    double maxX{6.0};
    double floorY{0.0};
    double ceilingY{4.0};
    double minZ{0.0};
    double maxZ{22.0};
};

enum class SegmentKind {
    Floor,
    Wall,
    Ceiling,
};

struct Segment3 {
    Vec3 from{};
    Vec3 to{};
    SegmentKind kind{SegmentKind::Wall};
};

using RoomGeometry = std::vector<Segment3>;

inline void appendSegment(RoomGeometry& room, Vec3 from, Vec3 to, SegmentKind kind) {
    room.push_back({from, to, kind});
}

inline RoomGeometry makeRoomGeometry(const RoomBounds& bounds, double gridSpacing) {
    RoomGeometry room{};
    if (gridSpacing <= 0.0) {
        return room;
    }

    // Chia floor grid thành cell ngắn để từng đoạn có thể rời camera riêng biệt.
    for (double x = bounds.minX; x <= bounds.maxX + 1e-9; x += gridSpacing) {
        for (double z = bounds.minZ; z < bounds.maxZ - 1e-9; z += gridSpacing) {
            const double nextZ = std::min(z + gridSpacing, bounds.maxZ);
            appendSegment(room, {x, bounds.floorY, z}, {x, bounds.floorY, nextZ}, SegmentKind::Floor);
        }
    }
    for (double z = bounds.minZ; z <= bounds.maxZ + 1e-9; z += gridSpacing) {
        for (double x = bounds.minX; x < bounds.maxX - 1e-9; x += gridSpacing) {
            const double nextX = std::min(x + gridSpacing, bounds.maxX);
            appendSegment(room, {x, bounds.floorY, z}, {nextX, bounds.floorY, z}, SegmentKind::Floor);
        }
    }

    // Khung ceiling và bốn cột góc giúp người xem đọc được kích thước căn phòng.
    appendSegment(room, {bounds.minX, bounds.ceilingY, bounds.minZ}, {bounds.maxX, bounds.ceilingY, bounds.minZ}, SegmentKind::Ceiling);
    appendSegment(room, {bounds.maxX, bounds.ceilingY, bounds.minZ}, {bounds.maxX, bounds.ceilingY, bounds.maxZ}, SegmentKind::Ceiling);
    appendSegment(room, {bounds.maxX, bounds.ceilingY, bounds.maxZ}, {bounds.minX, bounds.ceilingY, bounds.maxZ}, SegmentKind::Ceiling);
    appendSegment(room, {bounds.minX, bounds.ceilingY, bounds.maxZ}, {bounds.minX, bounds.ceilingY, bounds.minZ}, SegmentKind::Ceiling);

    for (double x : {bounds.minX, bounds.maxX}) {
        for (double z : {bounds.minZ, bounds.maxZ}) {
            appendSegment(room, {x, bounds.floorY, z}, {x, bounds.ceilingY, z}, SegmentKind::Wall);
        }
    }

    // Hai rail ngang trên tường bên và các post ở tường cuối tạo thêm depth reference.
    for (double z = bounds.minZ; z < bounds.maxZ - 1e-9; z += gridSpacing) {
        const double nextZ = std::min(z + gridSpacing, bounds.maxZ);
        appendSegment(room, {bounds.minX, 2.0, z}, {bounds.minX, 2.0, nextZ}, SegmentKind::Wall);
        appendSegment(room, {bounds.maxX, 2.0, z}, {bounds.maxX, 2.0, nextZ}, SegmentKind::Wall);
    }
    for (double x = bounds.minX; x <= bounds.maxX + 1e-9; x += gridSpacing) {
        appendSegment(room, {x, bounds.floorY, bounds.maxZ}, {x, bounds.ceilingY, bounds.maxZ}, SegmentKind::Wall);
    }
    return room;
}

inline bool roomContainsPoint(const RoomBounds& bounds, Vec3 point) {
    return point.x >= bounds.minX && point.x <= bounds.maxX && point.y >= bounds.floorY &&
        point.y <= bounds.ceilingY && point.z >= bounds.minZ && point.z <= bounds.maxZ;
}
#endif

#if LAB_CHECKPOINT >= 2
struct FpsCamera {
    Vec3 position{0.0, 1.6, 2.0};
    double yaw{};
    double pitch{};
};

inline Vec3 worldToCameraTranslation(Vec3 worldPoint, const FpsCamera& camera) {
    return subtract(worldPoint, camera.position);
}

inline FpsCamera moveCameraWorld(FpsCamera camera, double deltaX, double deltaZ) {
    camera.position.x += deltaX;
    camera.position.z += deltaZ;
    return camera;
}
#endif

#if LAB_CHECKPOINT >= 3
inline Vec3 rotateX(Vec3 point, double angle) {
    const double cosine = std::cos(angle);
    const double sine = std::sin(angle);
    return {
        point.x,
        cosine * point.y - sine * point.z,
        sine * point.y + cosine * point.z,
    };
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

inline Vec3 worldToCamera(Vec3 worldPoint, const FpsCamera& camera) {
    const Vec3 relative = worldToCameraTranslation(worldPoint, camera);
    const Vec3 yawNeutral = rotateY(relative, -camera.yaw);
    return rotateX(yawNeutral, camera.pitch);
}

inline FpsCamera applyKeyboardLook(
    FpsCamera camera,
    double yawDelta,
    double pitchDelta
) {
    camera.yaw += yawDelta;
    camera.pitch += pitchDelta;
    return camera;
}
#endif

#if LAB_CHECKPOINT >= 4
struct CameraBasis {
    Vec3 forward{};
    Vec3 right{};
    Vec3 up{};
};

inline CameraBasis cameraBasis(const FpsCamera& camera) {
    const double sinYaw = std::sin(camera.yaw);
    const double cosYaw = std::cos(camera.yaw);
    const double sinPitch = std::sin(camera.pitch);
    const double cosPitch = std::cos(camera.pitch);

    return {
        {sinYaw * cosPitch, sinPitch, cosYaw * cosPitch},
        {cosYaw, 0.0, -sinYaw},
        {-sinYaw * sinPitch, cosPitch, -cosYaw * sinPitch},
    };
}

inline Vec3 groundForward(const FpsCamera& camera) {
    return {std::sin(camera.yaw), 0.0, std::cos(camera.yaw)};
}
#endif

#if LAB_CHECKPOINT >= 5
struct MoveInput {
    double strafe{};
    double advance{};
};

inline MoveInput makeMoveInput(bool left, bool right, bool backward, bool forward) {
    MoveInput input{};
    if (left) {
        input.strafe -= 1.0;
    }
    if (right) {
        input.strafe += 1.0;
    }
    if (backward) {
        input.advance -= 1.0;
    }
    if (forward) {
        input.advance += 1.0;
    }
    return input;
}

inline MoveInput normalizeMoveInput(MoveInput input) {
    const double length = std::hypot(input.strafe, input.advance);
    if (length > 1.0) {
        input.strafe /= length;
        input.advance /= length;
    }
    return input;
}

inline FpsCamera advanceCamera(
    FpsCamera camera,
    MoveInput rawInput,
    double speed,
    double deltaTime
) {
    const MoveInput input = normalizeMoveInput(rawInput);
    const Vec3 forward = groundForward(camera);
    const CameraBasis basis = cameraBasis(camera);
    const Vec3 strafeVelocity = multiply(basis.right, input.strafe * speed);
    const Vec3 forwardVelocity = multiply(forward, input.advance * speed);
    const Vec3 velocity = add(strafeVelocity, forwardVelocity);
    const double safeDeltaTime = std::clamp(deltaTime, 0.0, 0.1);
    camera.position = add(camera.position, multiply(velocity, safeDeltaTime));
    return camera;
}
#endif

#if LAB_CHECKPOINT >= 6
inline double wrapAngle(double angle) {
    return std::remainder(angle, 2.0 * kPi);
}

inline FpsCamera applyMouseLook(
    FpsCamera camera,
    double deltaX,
    double deltaY,
    double sensitivity
) {
    constexpr double pitchLimit = 89.0 * kPi / 180.0;
    camera.yaw = wrapAngle(camera.yaw + deltaX * sensitivity);
    camera.pitch -= deltaY * sensitivity;
    camera.pitch = std::clamp(camera.pitch, -pitchLimit, pitchLimit);
    return camera;
}
#endif

#if LAB_CHECKPOINT >= 7
inline FpsCamera clampCameraToRoom(
    FpsCamera camera,
    const RoomBounds& bounds,
    double eyeHeight,
    double margin
) {
    const double safeMargin = std::max(0.0, margin);
    camera.position.x = std::clamp(camera.position.x, bounds.minX + safeMargin, bounds.maxX - safeMargin);
    camera.position.y = std::clamp(eyeHeight, bounds.floorY, bounds.ceilingY);
    camera.position.z = std::clamp(camera.position.z, bounds.minZ + safeMargin, bounds.maxZ - safeMargin);
    return camera;
}

inline FpsCamera advanceCameraInRoom(
    FpsCamera camera,
    MoveInput input,
    double speed,
    double deltaTime,
    const RoomBounds& bounds,
    double eyeHeight,
    double margin
) {
    const FpsCamera moved = advanceCamera(camera, input, speed, deltaTime);
    return clampCameraToRoom(moved, bounds, eyeHeight, margin);
}

inline Vec3 cameraToWorld(Vec3 cameraPoint, const FpsCamera& camera) {
    const Vec3 pitchRestored = rotateX(cameraPoint, -camera.pitch);
    const Vec3 yawRestored = rotateY(pitchRestored, camera.yaw);
    return add(yawRestored, camera.position);
}

inline double basisError(const FpsCamera& camera) {
    const CameraBasis basis = cameraBasis(camera);
    double error = 0.0;
    error = std::max(error, std::abs(magnitude(basis.forward) - 1.0));
    error = std::max(error, std::abs(magnitude(basis.right) - 1.0));
    error = std::max(error, std::abs(magnitude(basis.up) - 1.0));
    error = std::max(error, std::abs(dot(basis.forward, basis.right)));
    error = std::max(error, std::abs(dot(basis.forward, basis.up)));
    error = std::max(error, std::abs(dot(basis.right, basis.up)));
    return error;
}

inline double viewRoundTripError(Vec3 worldPoint, const FpsCamera& camera) {
    const Vec3 cameraPoint = worldToCamera(worldPoint, camera);
    const Vec3 restored = cameraToWorld(cameraPoint, camera);
    return magnitude(subtract(restored, worldPoint));
}
#endif
} // namespace lab
