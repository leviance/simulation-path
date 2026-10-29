#pragma once
#include "sdf.hpp"

namespace lab {

struct RayMarchSettings {
    int maximumSteps{128};
    double hitEpsilon{0.0015};
    double maximumDistance{30.0};
    double normalEpsilon{0.001};
};

#if LAB_CHECKPOINT >= 4
inline bool validSettings(const RayMarchSettings& settings) {
    return settings.maximumSteps >= 1 && settings.maximumSteps <= 256 && std::isfinite(settings.hitEpsilon) && settings.hitEpsilon >= 1e-5 && settings.hitEpsilon <= 0.02 && std::isfinite(settings.maximumDistance) && settings.maximumDistance >= 0.1 && settings.maximumDistance <= 80.0 && std::isfinite(settings.normalEpsilon) && settings.normalEpsilon >= 1e-5 && settings.normalEpsilon <= 0.02;
}

enum class MarchStatus {
    hit,
    distanceLimit,
    stepLimit,
    invalidInput,
    invalidSample,
    stalled,
    emptyScene
};

inline const char* marchStatusName(MarchStatus status) {
    switch (status) {
    case MarchStatus::hit:
        return "HIT";
    case MarchStatus::distanceLimit:
        return "DISTANCE LIMIT";
    case MarchStatus::stepLimit:
        return "STEP LIMIT";
    case MarchStatus::invalidInput:
        return "INVALID INPUT";
    case MarchStatus::invalidSample:
        return "INVALID SAMPLE";
    case MarchStatus::stalled:
        return "STALLED";
    case MarchStatus::emptyScene:
        return "EMPTY SCENE";
    }
    return "UNKNOWN";
}

struct RayMarchResult {
    bool hit{};
    double traveled{};
    int steps{};
    int materialId{};
    Vec3 position{};
    MarchStatus status{MarchStatus::invalidInput};
};

// [snippet:march-ray]
inline RayMarchResult marchRay(const Ray& ray, const RayMarchSettings& settings = {}, const SceneOptions& scene = {}) {
    RayMarchResult result{};
    result.position = ray.origin;
    if (!validRay(ray) || !validSettings(settings) || !validScene(scene)) {
        return result;
    }
    for (int step = 0; step < settings.maximumSteps; ++step) {
        result.position = ray.origin + ray.direction * result.traveled;
        const SceneSample sample = sampleScene(result.position, scene);
        result.steps = step + 1;
        if (!finite(result.position) || !std::isfinite(sample.distance)) {
            result.status = MarchStatus::invalidSample;
            return result;
        }
        if (sample.materialId == 0) {
            result.status = MarchStatus::emptyScene;
            return result;
        }
        const double distanceToSurface = std::abs(sample.distance);
        if (distanceToSurface <= settings.hitEpsilon) {
            result.hit = true;
            result.materialId = sample.materialId;
            result.status = MarchStatus::hit;
            return result;
        }
        const double next = result.traveled + distanceToSurface;
        if (!std::isfinite(next) || next <= result.traveled) {
            result.status = MarchStatus::stalled;
            return result;
        }
        if (next > settings.maximumDistance || result.traveled == settings.maximumDistance) {
            result.traveled = settings.maximumDistance;
            result.position = ray.origin + ray.direction * result.traveled;
            result.status = MarchStatus::distanceLimit;
            return result;
        }
        result.traveled = next;
    }
    result.position = ray.origin + ray.direction * result.traveled;
    result.status = MarchStatus::stepLimit;
    return result;
}

// [/snippet:march-ray]
#endif

#if LAB_CHECKPOINT >= 5
// [snippet:normal]
inline Vec3 estimateNormal(Vec3 point, const SceneOptions& scene = {}, double epsilon = 0.001) {
    if (!finite(point) || !std::isfinite(epsilon) || epsilon < 1e-5 || epsilon > 0.02) {
        return {};
    }
    const Vec3 dx{epsilon, 0.0, 0.0};
    const Vec3 dy{0.0, epsilon, 0.0};
    const Vec3 dz{0.0, 0.0, epsilon};
    const Vec3 gradient{
        sampleScene(point + dx, scene).distance - sampleScene(point - dx, scene).distance,
        sampleScene(point + dy, scene).distance - sampleScene(point - dy, scene).distance,
        sampleScene(point + dz, scene).distance - sampleScene(point - dz, scene).distance,
    };
    return normalize(gradient);
}

// [/snippet:normal]
#endif

#if LAB_CHECKPOINT >= 8
struct ShadowResult {
    double visibility{};
    int steps{};
    bool reachedLight{};
};

// [snippet:shadow]
inline ShadowResult traceShadow(Vec3 origin, Vec3 direction, double lightDistance, const SceneOptions& scene = {}, int maximumSteps = 64) {
    ShadowResult result{};
    if (!validRay({origin, direction}) || !validScene(scene) || !std::isfinite(lightDistance) || lightDistance <= 0.0 || lightDistance > 80.0 || maximumSteps < 1 || maximumSteps > 128) {
        return result;
    }
    double traveled = 0.004;
    double visibility = 1.0;
    for (int step = 0; step < maximumSteps; ++step) {
        if (traveled >= lightDistance) {
            result.visibility = std::clamp(visibility, 0.0, 1.0);
            result.reachedLight = true;
            return result;
        }
        const SceneSample sample = sampleScene(origin + direction * traveled, scene);
        result.steps = step + 1;
        if (!std::isfinite(sample.distance) || sample.distance <= 0.001) {
            return result;
        }
        visibility = std::min(visibility, 14.0 * sample.distance / traveled);
        traveled += std::clamp(sample.distance, 0.004, 0.4);
    }
    // Hết budget là chưa giải quyết được tia: không gọi nó là ánh sáng thấy rõ.
    return result;
}

// [/snippet:shadow]

inline double softShadow(Vec3 origin, Vec3 direction, double maximumDistance, const SceneOptions& scene = {}, int maximumSteps = 64) {
    return traceShadow(origin, direction, maximumDistance, scene, maximumSteps).visibility;
}
#endif

} // namespace lab
