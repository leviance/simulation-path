#pragma once

#include "field.hpp"
#include <cmath>

namespace heat {

enum class StepStatus {
    Advanced,
    InvalidSettings,
    UnstableSettings,
    NonFiniteCandidate,
    ExperimentBudget,
    ExperimentAmplitude
};

struct StepResult {
    StepStatus status = StepStatus::InvalidSettings;
    std::uint32_t visited = 0;
    double maximumAbs = 0;
    double sourceChange = 0;
    bool advanced = false;
};

inline const char* stepMessage(StepStatus status) {
    if (status == StepStatus::Advanced) {
        return "Advanced one model timestep";
    }
    if (status == StepStatus::UnstableSettings) {
        return "CFL rejected: reduce dt/D or explicitly enable the bounded experiment";
    }
    if (status == StepStatus::NonFiniteCandidate) {
        return "Non-finite candidate rejected; the previous field is unchanged";
    }
    if (status == StepStatus::ExperimentBudget) {
        return "Experiment stopped at 400 accepted steps; reset before another run";
    }
    if (status == StepStatus::ExperimentAmplitude) {
        return "Candidate |theta| exceeds 16; retained the last finite field, no clamping";
    }
    return "Invalid D/dt/dx/dy or boundary; field unchanged";
}

#if LAB_CHECKPOINT >= 3
// [snippet diffuse]
inline StepResult diffuse(Field& field, const Settings& settings) {
    bool twoDimensions = false;
#if LAB_CHECKPOINT >= 4
    twoDimensions = true;
#endif
    const Stability coefficients = stability(settings, twoDimensions);
    StepResult result;
    if (!coefficients.valid) {
        return result;
    }
    bool allowUnstable = false;
#if LAB_CHECKPOINT >= 6
    allowUnstable = settings.experiment;
    if (allowUnstable && field.experimentSteps >= 400) {
        result.status = StepStatus::ExperimentBudget;
        return result;
    }
#endif
    if (!coefficients.stable && !allowUnstable) {
        result.status = StepStatus::UnstableSettings;
        return result;
    }

    for (int y = 0; y < field.height; ++y) {
        for (int x = 0; x < field.width; ++x) {
            const std::size_t index = field.index(x, y);
            ++result.visited;
            double value = 0;
            bool fixedRim = false;
#if LAB_CHECKPOINT >= 5
            fixedRim = settings.boundary == Boundary::ColdRim && field.edge(x, y);
#endif
            if (!fixedRim) {
                const double center = sample(field, x, y);
                const double horizontal = sample(field, x - 1, y) - 2 * center + sample(field, x + 1, y);
                value = center + coefficients.rx * horizontal;
#if LAB_CHECKPOINT >= 4
                const double vertical = sample(field, x, y - 1) - 2 * center + sample(field, x, y + 1);
                value += coefficients.ry * vertical;
#endif
            }
#if LAB_CHECKPOINT >= 5
            // [snippet source-ledger]
            if (!fixedRim && field.pins[index] != Pin::None) {
                const double target = static_cast<double>(field.pins[index]);
                result.sourceChange += (target - value) * settings.dx * settings.dy;
                value = target;
            }
            // [/snippet source-ledger]
#endif
            if (!std::isfinite(value)) {
                result.status = StepStatus::NonFiniteCandidate;
                return result;
            }
            result.maximumAbs = std::max(result.maximumAbs, std::abs(value));
            field.next[index] = value;
        }
    }
    if (allowUnstable && result.maximumAbs > 16) {
        result.status = StepStatus::ExperimentAmplitude;
        return result;
    }
    // Mọi ô đã được tính xong: publish một mức thời gian, không clamp nghiệm.
    field.current.swap(field.next);
    ++field.tick;
    field.time += settings.dt;
#if LAB_CHECKPOINT >= 6
    if (allowUnstable) {
        ++field.experimentSteps;
    }
#endif
    result.advanced = true;
    result.status = StepStatus::Advanced;
    return result;
}

// [/snippet diffuse]
#endif

} // namespace heat
