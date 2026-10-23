#pragma once
#include "lab.hpp"

namespace lab {
struct Settings {
    double speed{28.0};
    double angle{50.0 * kPi / 180.0};
    double gravity{9.81};
    double fixedDt{1.0 / 30.0};
};

struct ErrorStats {
    std::size_t count{};
    double sum{};
    double maximum{};

    double mean() const {
        if (count == 0) {
            return 0.0;
        }
        return sum / static_cast<double>(count);
    }
};

#if LAB_CHECKPOINT >= 3
inline BallisticLaunch makeLaunch(const Settings& settings) {
    const Vec2 position{0.0, 1.2};
    const Vec2 velocity = velocityFromPolar(settings.speed, settings.angle);
    const Vec2 acceleration{0.0, -settings.gravity};
    return {position, velocity, acceleration};
}
#endif

#if LAB_CHECKPOINT >= 4
struct TrajectorySample {
    double elapsed{};
    Vec2 position{};
    double error{};
};

struct Shot {
    BallisticLaunch launch{};
    ProjectileState projectile{};
    double fixedDt{};
    std::vector<TrajectorySample> samples{};
    ErrorStats errors{};
    double accumulator{};
    double droppedTime{};
    int substeps{};
    bool exists{};
    bool logLimitReached{};
#if LAB_CHECKPOINT >= 6
    ImpactStepResult impact{};
#endif
};

// Mỗi sample giữ đúng thời gian của nghiệm số, không lấy thời gian render.
inline void recordSample(Shot& shot) {
    double error = 0.0;
#if LAB_CHECKPOINT >= 7
    error = compareProjectile(shot.launch, shot.projectile).error;
#endif
    shot.samples.push_back({shot.projectile.elapsed, shot.projectile.position, error});
    ++shot.errors.count;
    shot.errors.sum += error;
    shot.errors.maximum = std::max(shot.errors.maximum, error);
    if (shot.samples.size() >= 8192) {
        shot.logLimitReached = true;
        shot.projectile.active = false;
    }
}

inline Shot startShot(const Settings& settings) {
    Shot shot{};
    shot.launch = makeLaunch(settings);
    shot.projectile = launchProjectile(shot.launch);
    shot.fixedDt = settings.fixedDt;
    shot.exists = true;
    recordSample(shot);
    return shot;
}

// Mọi đường đi (animation và single-step) cùng gọi một physics step.
inline void stepShot(Shot& shot, double dt) {
    if (!shot.projectile.active) {
        return;
    }
#if LAB_CHECKPOINT >= 6
    shot.impact = explicitEulerStepToGround(shot.projectile, shot.launch.acceleration, dt, 0.0);
#else
    explicitEulerStep(shot.projectile, shot.launch.acceleration, dt);
    // Checkpoint chưa học ground impact: dừng hữu hạn, không rơi vô tận.
    if (shot.projectile.elapsed >= 30.0 || shot.projectile.position.y < -2.0) {
        shot.projectile.active = false;
    }
#endif
    recordSample(shot);
}

inline void advanceShot(Shot& shot, double frameSeconds) {
    shot.substeps = 0;
    if (!shot.projectile.active || !std::isfinite(frameSeconds) || frameSeconds <= 0.0) {
        return;
    }
#if LAB_CHECKPOINT >= 5
    const FixedStepPlan plan = planFixedSteps(shot.accumulator, frameSeconds, shot.fixedDt, 32, 0.1);
    shot.accumulator = plan.remainder;
    shot.droppedTime += plan.droppedTime;
    for (int index = 0; index < plan.steps && shot.projectile.active; ++index) {
        stepShot(shot, shot.fixedDt);
        ++shot.substeps;
    }
#else
    stepShot(shot, std::min(frameSeconds, 0.1));
    shot.substeps = 1;
#endif
}
#endif

struct Experiment {
    Settings settings{};
    bool paused{true};
    bool debug{true};
#if LAB_CHECKPOINT >= 4
    Shot current{};
    std::vector<Shot> history{};
#endif
};

inline void fire(Experiment& experiment) {
#if LAB_CHECKPOINT >= 4
    if (experiment.current.exists) {
        experiment.history.push_back(experiment.current);
        if (experiment.history.size() > 4) {
            experiment.history.erase(experiment.history.begin());
        }
    }
    // Snapshot: sửa settings sau đây không được làm đổi lần bắn này.
    experiment.current = startShot(experiment.settings);
    experiment.paused = false;
#else
    (void)experiment;
#endif
}

inline void singleStep(Experiment& experiment) {
#if LAB_CHECKPOINT >= 4
    if (!experiment.current.exists) {
        fire(experiment);
    }
    if (experiment.current.projectile.active) {
        stepShot(experiment.current, experiment.current.fixedDt);
        experiment.current.substeps = 1;
    }
#endif
    experiment.paused = true;
}
} // namespace lab
