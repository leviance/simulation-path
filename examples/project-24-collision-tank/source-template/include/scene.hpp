#pragma once
#include "lab.hpp"
#include "sphere.hpp"
#include <deque>
#include <string>

namespace lab {
inline constexpr TankBounds kTankBounds{-10.0, -6.0, 10.0, 6.0};
inline constexpr std::uint32_t kSceneSeed = 0x00c0ffeeU;

struct CameraSettings {
    double yaw = 0.7;
    double pitch = 0.35;
    double distance = 26.0;
};

struct HistorySample {
    double time = 0.0;
    double energy = 0.0;
    double penetration = 0.0;
};

struct Scene {
    std::vector<Ball> balls{};
    double elapsed = 0.0;
    double accumulator = 0.0;
    double droppedTime = 0.0;
    int substeps = 0;
    bool paused = true;
    bool debug = true;
    bool spatial = false;
    bool elastic = false;
    bool correction = true;
    int count = 256;
    double dt = 1.0 / 120.0;
    double restitution = 1.0;
    int iterations = 3;
    int fastRemaining = 0;
    std::string message{};
    CameraSettings camera{};
#if LAB_CHECKPOINT >= 4
    CircleContact lastContact{};
    double lastNormalSpeed = 0.0;
    double lastImpulse = 0.0;
    double lastCorrection = 0.0;
#endif
#if LAB_CHECKPOINT >= 7
    CollisionStepStats stats{};
#endif
#if LAB_CHECKPOINT >= 8
    WorldMetrics metrics{};
    double initialEnergy = 0.0;
    Vec2 initialMomentum{};
    Vec2 wallImpulse{};
    std::deque<HistorySample> history{};
#endif
#if LAB_CHECKPOINT >= 9
    std::vector<Sphere> spheres{};
    SphereStats sphereStats{};
    SphereMetrics sphereMetrics{};
    Vec3 initialMomentum3{};
    Vec3 wallImpulse3{};
#endif
};

inline void stopScene(Scene& scene) {
    scene.paused = true;
    scene.accumulator = 0.0;
    scene.fastRemaining = 0;
}

inline void beginMeasurement(Scene& scene) {
    stopScene(scene);
    scene.elapsed = 0.0;
    scene.droppedTime = 0.0;
    scene.substeps = 0;
#if LAB_CHECKPOINT >= 7
    scene.stats = {};
#endif
#if LAB_CHECKPOINT >= 8
    scene.metrics = measureWorld(scene.balls);
    scene.initialEnergy = scene.metrics.kineticEnergy;
    scene.initialMomentum = scene.metrics.totalMomentum;
    scene.wallImpulse = {};
    scene.history.clear();
    scene.history.push_back({0.0, scene.initialEnergy, scene.metrics.maximumPenetration});
#endif
#if LAB_CHECKPOINT >= 9
    scene.sphereStats = {};
    scene.sphereMetrics = measureSpheres(scene.spheres);
    scene.initialMomentum3 = scene.sphereMetrics.momentum;
    scene.wallImpulse3 = {};
    if (scene.spatial) {
        scene.initialEnergy = scene.sphereMetrics.energy;
        scene.history.clear();
        scene.history.push_back({0.0, scene.initialEnergy, scene.sphereMetrics.penetration});
    }
#endif
}

inline void rebuildScene(Scene& scene) {
    scene.message.clear();
#if LAB_CHECKPOINT >= 1
    scene.balls = makeTankBalls(kSceneSeed, scene.elastic);
    if (scene.count == 64)
        scene.balls.resize(64);
#endif
#if LAB_CHECKPOINT == 3
    scene.balls = {{{-9.7, 0.0}, {-2.0, 0.8}, 0.5, 1.0, 0x61afefffU, 1.0}};
#endif
#if LAB_CHECKPOINT >= 4
#if LAB_CHECKPOINT < 7
    scene.balls = {{{-0.6, 0.0}, {1.5, 0.0}, 0.75, 1.0, 0xff7b72ffU, 1.0}, {{0.6, 0.0}, {-0.5, 0.0}, 0.75, 0.5, 0x53f0aeffU, 1.0}};
    scene.lastContact = findCircleContact(scene.balls[0], scene.balls[1]);
    scene.lastNormalSpeed = dot(subtract(scene.balls[1].velocity, scene.balls[0].velocity), scene.lastContact.normal);
    scene.lastImpulse = 0.0;
    scene.lastCorrection = 0.0;
#endif
#endif
#if LAB_CHECKPOINT >= 9
    scene.spheres.clear();
    if (scene.spatial) {
        scene.spheres = makeSpheres(kSceneSeed, scene.elastic);
        if (scene.count == 64)
            scene.spheres.resize(64);
    }
#endif
    beginMeasurement(scene);
}

inline Scene makeScene() {
    Scene scene;
    rebuildScene(scene);
    return scene;
}

inline bool stepScene(Scene& scene) {
#if LAB_CHECKPOINT >= 2
    const double dt = scene.dt;
    if (!std::isfinite(dt) || dt < 1e-6 || dt > 1.0 / 30.0) {
        stopScene(scene);
        scene.message = "Invalid fixed dt rejected.";
        return false;
    }
#if LAB_CHECKPOINT >= 10
    if (scene.spatial) {
        auto candidate = scene.spheres;
        const auto stats = stepSpheres(candidate, {dt, scene.restitution, scene.iterations, scene.correction ? 0.8 : 0.0, 0.001});
        const auto metrics = measureSpheres(candidate);
        if (!stats.valid || !metrics.finite) {
            scene.message = "Invalid 3D step rejected; state was not committed.";
            stopScene(scene);
            return false;
        }
        scene.spheres = std::move(candidate);
        scene.sphereStats = stats;
        scene.sphereMetrics = metrics;
        scene.wallImpulse3 = add3(scene.wallImpulse3, stats.wallImpulse);
    } else
#endif
    {
        auto candidate = scene.balls;
#if LAB_CHECKPOINT >= 7
        const auto stats = stepCollisionWorld(candidate, kTankBounds, {dt, scene.restitution, scene.iterations, scene.correction ? 0.8 : 0.0, 0.001});
        if (!stats.valid) {
            scene.message = "Invalid 2D step rejected; state was not committed.";
            stopScene(scene);
            return false;
        }
        scene.stats = stats;
#else
        for (auto& ball : candidate) {
            integrateBall(ball, dt);
#if LAB_CHECKPOINT >= 3
            resolveWallCollision(ball, kTankBounds, scene.restitution);
#endif
        }
#if LAB_CHECKPOINT >= 4
        if (candidate.size() == 2) {
            const auto contact = findCircleContact(candidate[0], candidate[1]);
            scene.lastContact = contact;
            scene.lastNormalSpeed = dot(subtract(candidate[1].velocity, candidate[0].velocity), contact.normal);
#if LAB_CHECKPOINT >= 5
            scene.lastImpulse = applyCollisionImpulse(candidate[0], candidate[1], contact, scene.restitution);
#endif
#if LAB_CHECKPOINT >= 6
            if (scene.correction)
                scene.lastCorrection = correctBallPenetration(candidate[0], candidate[1], contact, 0.8, 0.001);
#endif
            (void)contact;
        }
#endif
#endif
        scene.balls = std::move(candidate);
#if LAB_CHECKPOINT >= 8
        scene.metrics = measureWorld(scene.balls);
        scene.wallImpulse = add(scene.wallImpulse, scene.stats.wallImpulse);
#endif
    }
    scene.elapsed += dt;
    ++scene.substeps;
#if LAB_CHECKPOINT >= 8
    double energy = scene.metrics.kineticEnergy;
    double penetration = scene.metrics.maximumPenetration;
#if LAB_CHECKPOINT >= 10
    if (scene.spatial) {
        energy = scene.sphereMetrics.energy;
        penetration = scene.sphereMetrics.penetration;
    }
#endif
    scene.history.push_back({scene.elapsed, energy, penetration});
    if (scene.history.size() > 601)
        scene.history.pop_front();
#endif
    return true;
#else
    (void)scene;
    return false;
#endif
}

inline void advanceFrame(Scene& scene, double frameSeconds) {
    scene.substeps = 0;
#if LAB_CHECKPOINT >= 8
    if (scene.fastRemaining > 0) {
        const int count = std::min(4, scene.fastRemaining);
        for (int i = 0; i < count; ++i) {
            if (!stepScene(scene))
                break;
            --scene.fastRemaining;
        }
        return;
    }
#endif
#if LAB_CHECKPOINT >= 2
    if (!scene.paused) {
        const auto plan = planFixedSteps(scene.accumulator, frameSeconds, scene.dt, 4, 0.05);
        scene.accumulator = plan.remainder;
        scene.droppedTime += plan.droppedTime;
        for (int i = 0; i < plan.steps; ++i) {
            if (!stepScene(scene))
                break;
        }
    }
#else
    (void)frameSeconds;
#endif
}

#if LAB_CHECKPOINT >= 8
inline void requestFast(Scene& scene) {
    stopScene(scene);
    scene.fastRemaining = static_cast<int>(std::lround(2.0 / scene.dt));
}

inline double momentumResidual(const Scene& scene) {
#if LAB_CHECKPOINT >= 10
    if (scene.spatial) {
        const auto residual = sub3(sub3(scene.sphereMetrics.momentum, scene.initialMomentum3), scene.wallImpulse3);
        return std::sqrt(dot3(residual, residual));
    }
#endif
    return length(subtract(subtract(scene.metrics.totalMomentum, scene.initialMomentum), scene.wallImpulse));
}
#endif

#if LAB_CHECKPOINT >= 11
#define COURSE_HAS_SPAWN 1

// Spawn thử hữu hạn các điểm lưới; không ép vật mới vào chỗ đang bị chiếm.
inline int spawnBodies(Scene& scene) {
    stopScene(scene);
    int added = 0;
    const std::size_t size = scene.spatial ? scene.spheres.size() : scene.balls.size();
    if (size >= 512) {
        scene.message = "Capacity 512 reached.";
        return 0;
    }
    if (scene.spatial) {
        const auto candidates = makeSpheres(kSceneSeed + 1, scene.elastic);
        for (auto body : candidates) {
            body.position.x += 1.0;
            if (body.position.x + body.radius > 8.0)
                continue;
            bool free = true;
            for (const auto& other : scene.spheres) {
                if (findSphereContact(body, other).colliding) {
                    free = false;
                    break;
                }
            }
            if (free && scene.spheres.size() < 512) {
                scene.spheres.push_back(body);
                if (++added == 16)
                    break;
            }
        }
    } else {
        const auto candidates = makeTankBalls(kSceneSeed + 1, scene.elastic);
        for (auto body : candidates) {
            body.position.x = -body.position.x;
            body.position.y = -body.position.y;
            body.position.x += 0.55;
            if (body.position.x + body.radius > kTankBounds.maximumX)
                continue;
            bool free = true;
            for (const auto& other : scene.balls) {
                if (findCircleContact(body, other).colliding) {
                    free = false;
                    break;
                }
            }
            if (free && scene.balls.size() < 512) {
                scene.balls.push_back(body);
                if (++added == 16)
                    break;
            }
        }
    }
    beginMeasurement(scene);
    scene.message = "Spawned " + std::to_string(added) + " bodies; measurement baseline restarted.";
    return added;
}
#endif
} // namespace lab
