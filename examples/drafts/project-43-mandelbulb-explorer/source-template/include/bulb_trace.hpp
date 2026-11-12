#pragma once
#include "bulb_field.hpp"
#include "bulb_camera.hpp"

namespace bulb {

constexpr std::uint32_t hitFlag = 1, missFlag = 2, budgetFlag = 4, insideFlag = 8, invalidFlag = 16;
struct RaySample {
    double t{};
    double trap{};
    std::uint32_t state{missFlag};
    std::uint32_t raySteps{};
    std::uint32_t orbitIterations{};
};
#if LAB_CHECKPOINT >= 2
inline RaySample march(Vec3 origin, Vec3 direction, Settings s) {
    RaySample result;
    const double b = dot(origin, direction);
    const double discriminant = b * b - dot(origin, origin) + 4.0;
    if (discriminant < 0)
        return result;
    const double root = std::sqrt(discriminant);
    const double farT = std::min(s.farBound, -b + root);
    double t = std::max(0.001, -b - root);
    if (farT < t)
        return result;
    if (length(origin) < 2.0) {
        const auto eye = evaluate(origin, s);
        result.orbitIterations += eye.iterations;
        if (eye.state == OrbitState::invalid) {
            result.state = invalidFlag;
            return result;
        }
        if (eye.state == OrbitState::bounded) {
            result.state = insideFlag;
            return result;
        }
    }
    double previous = t;
    for (int step = 0; step < s.raySteps; ++step) {
        const auto field = evaluate(origin + direction * t, s);
        ++result.raySteps;
        result.orbitIterations += field.iterations;
        result.t = t;
        result.trap = field.trap;
        if (field.state == OrbitState::invalid) {
            result.state = invalidFlag;
            return result;
        }
        if (field.state == OrbitState::bounded) {
#if LAB_CHECKPOINT >= 3
            double low = previous, high = t;
            for (int refinement = 0; refinement < 8; ++refinement) {
                const double middle = (low + high) * 0.5;
                const auto candidate = evaluate(origin + direction * middle, s);
                result.orbitIterations += candidate.iterations;
                if (candidate.state == OrbitState::escaped)
                    low = middle;
                else
                    high = middle;
            }
            result.t = high;
#endif
            result.state = hitFlag;
            return result;
        }
#if LAB_CHECKPOINT >= 3
        if (field.distance < s.epsilon) {
            // DE is not an exact SDF. Confirm a bounded orbit with a short, finite forward scan.
            double low=t;
            for(int probe=1;probe<=32;++probe) {
                double high=t+probe*s.epsilon;
                if(high>farT) { result.state=missFlag;return result; }
                const auto candidate=evaluate(origin+direction*high,s);
                result.orbitIterations+=candidate.iterations;
                if(candidate.state==OrbitState::invalid) { result.state=invalidFlag;return result; }
                if(candidate.state==OrbitState::bounded) {
                    for(int refinement=0;refinement<8;++refinement) {
                        const double middle=(low+high)*0.5;
                        const auto sample=evaluate(origin+direction*middle,s);
                        result.orbitIterations+=sample.iterations;
                        if(sample.state==OrbitState::escaped) low=middle;
                        else high=middle;
                    }
                    result.t=high;result.state=hitFlag;return result;
                }
                low=high;
            }
            result.state=budgetFlag;return result;
        }
        const double advance = std::clamp(s.safety * field.distance, s.epsilon * 0.1, 0.12);
#else
        const double advance = (farT - std::max(0.001, -b - root)) / s.raySteps;
#endif
        previous = t;
        t += advance;
        if (t > farT) {
            result.state = missFlag;
            return result;
        }
    }
    result.state = budgetFlag;
    return result;
}
#endif

} // namespace bulb
