#pragma once
#include "vector.hpp"

namespace lab {

// Camera bay tự do. Pause không khóa việc nhìn hoặc di chuyển trong world.
struct Camera {
    Vec3 position{2.7, 1.1, 6.1};
    double yaw{-0.37};
    double pitch{-0.14};
    double verticalFieldOfViewRadians{1.0471975511965976};
};

inline Vec3 cameraForward(const Camera& camera) {
    const double horizontal = std::cos(camera.pitch);
    return {std::sin(camera.yaw) * horizontal, std::sin(camera.pitch), -std::cos(camera.yaw) * horizontal};
}

inline Vec3 cameraRight(const Camera& camera) {
    return normalize(cross(cameraForward(camera), {0.0, 1.0, 0.0}));
}

inline Vec3 cameraUp(const Camera& camera) {
    return normalize(cross(cameraRight(camera), cameraForward(camera)));
}

inline bool validCamera(const Camera& camera) {
    return finite(camera.position) && std::isfinite(camera.yaw) && std::isfinite(camera.pitch) && std::abs(camera.pitch) <= 1.45 && std::isfinite(camera.verticalFieldOfViewRadians) && camera.verticalFieldOfViewRadians >= 0.2 && camera.verticalFieldOfViewRadians <= 2.8;
}

// [snippet:camera-ray]
inline Ray makeCameraRay(const Camera& camera, double pixelX, double pixelY, int framebufferWidth, int framebufferHeight) {
    if (!validCamera(camera) || !std::isfinite(pixelX) || !std::isfinite(pixelY) || framebufferWidth < 1 || framebufferHeight < 1 || framebufferWidth > 16384 || framebufferHeight > 16384) {
        return {camera.position, {}};
    }
    const double width = static_cast<double>(framebufferWidth);
    const double height = static_cast<double>(framebufferHeight);
    const double ndcX = 2.0 * (pixelX + 0.5) / width - 1.0;
    const double ndcY = 1.0 - 2.0 * (pixelY + 0.5) / height;
    const double tangent = std::tan(camera.verticalFieldOfViewRadians * 0.5);
    const Vec3 offsetX = cameraRight(camera) * (ndcX * width / height * tangent);
    const Vec3 offsetY = cameraUp(camera) * (ndcY * tangent);
    return {camera.position, normalize(cameraForward(camera) + offsetX + offsetY)};
}
// [/snippet:camera-ray]

inline void lookCamera(Camera& camera, double dx, double dy) {
    if (!std::isfinite(dx) || !std::isfinite(dy)) {
        return;
    }
    camera.yaw = std::remainder(camera.yaw + dx * 0.004, 6.283185307179586);
    camera.pitch = std::clamp(camera.pitch - dy * 0.004, -1.45, 1.45);
}

inline void moveCamera(Camera& camera, Vec3 localDisplacement) {
    if (!finite(localDisplacement) || !validCamera(camera)) {
        return;
    }
    const Vec3 vertical = cameraUp(camera) * localDisplacement.y;
    const Vec3 candidate = camera.position + cameraRight(camera) * localDisplacement.x + cameraForward(camera) * localDisplacement.z + vertical;
    if (!finite(candidate)) {
        return;
    }
    camera.position = {std::clamp(candidate.x, -40.0, 40.0), std::clamp(candidate.y, -40.0, 40.0), std::clamp(candidate.z, -40.0, 40.0)};
}

} // namespace lab
