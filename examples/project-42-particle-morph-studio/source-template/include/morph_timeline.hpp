#pragma once

#include "morph_math.hpp"

namespace morph {

enum class Easing { linear,
                    smooth };
enum class Path { straight,
                  arc,
                  flow };
enum class Matching { random,
                      spatial };

inline Vec3 curveOffset(Vec3 source) {
    // A coherent sideways sweep: nearby source points receive nearby offsets, not random kicks.
    return {-0.28 * source.z, 0.35 + 0.08 * std::sin(1.5 * source.x), 0.28 * source.x};
}

inline double eased(double t, Easing mode) {
    t = std::clamp(t, 0.0, 1.0);
#if LAB_CHECKPOINT >= 5
    if (mode == Easing::smooth)
        return t * t * (3.0 - 2.0 * t);
#else
    (void)mode;
#endif
    return t;
}

#if LAB_CHECKPOINT >= 5
inline double flowRandom(std::uint32_t id, std::uint32_t salt) {
    // The high 24 bits are exactly representable in GLSL float. No per-frame randomness.
    return static_cast<double>(hashId(id ^ salt) >> 8U) / 16777216.0;
}

inline double flowPhase(double t, std::uint32_t id) {
    const double skew = 2.0 * flowRandom(id, 0x68bc21ebU) - 1.0;
    // Derivative is in [0.52, 1.48]: every particle keeps moving forward, at its own pace.
    return t + 0.48 * skew * std::sin(std::numbers::pi_v<double> * t) / std::numbers::pi_v<double>;
}

inline Vec3 flowJitter(std::uint32_t id) {
    // Use a ball, not a cube: the dispersing cloud must not acquire flat box-shaped sides.
    const double z = 2.0 * flowRandom(id, 0x9e3779b9U) - 1.0;
    const double phi = 2.0 * std::numbers::pi_v<double> * flowRandom(id, 0x243f6a88U);
    const double radial = std::sqrt(std::max(0.0, 1.0 - z * z));
    const double radius = std::cbrt(flowRandom(id, 0xb7e15162U));
    return Vec3{radial * std::cos(phi), z, radial * std::sin(phi)} * radius;
}

inline Vec3 flowOffset(Vec3 offset, double s, std::uint32_t id) {
    const Vec3 drift = offset * 0.7 + flowJitter(id) * 0.65;
    const double angle = 2.0 * std::numbers::pi_v<double> * s;
    const Vec3 swirl{drift.x * std::cos(angle) - drift.z * std::sin(angle), drift.y, drift.x * std::sin(angle) + drift.z * std::cos(angle)};
    const double envelope = std::sin(std::numbers::pi_v<double> * s);
    // Squaring the envelope brings this displacement AND its velocity to zero at both ends.
    return swirl * (envelope * envelope);
}
#endif

inline Vec3 morphPosition(Vec3 source, Vec3 target, Vec3 offset, double t, Easing easing, Path path, std::uint32_t id = 0) {
    // Preserve exact endpoint records; sin(pi) is not exactly zero in floating-point.
    if (t <= 0.0)
        return source;
    if (t >= 1.0)
        return target;
#if LAB_CHECKPOINT >= 5
    if (path == Path::flow)
        t = flowPhase(t, id);
#endif
    const double s = eased(t, easing);
    Vec3 point = source * (1.0 - s) + target * s;
#if LAB_CHECKPOINT >= 5
    if (path == Path::arc)
        point = point + offset * std::sin(std::numbers::pi_v<double> * s);
    if (path == Path::flow)
        point = point + flowOffset(offset, s, id);
#else
    (void)offset;
    (void)path;
    (void)id;
#endif
    return point;
}

class Timeline {
    public:
    double time{};
    double duration{5.0};
    bool paused{true};
    bool reverse{};
    bool loop{true};

    void advance(double dt) {
        validateDuration();
        if (!std::isfinite(dt) || dt < 0.0 || dt > 60.0)
            throw std::invalid_argument("Timeline dt must be finite and between 0 and 60 seconds");
        if (paused)
            return;
        double direction = 1.0;
        if (reverse)
            direction = -1.0;
        const double next = time + direction * dt;
        if (loop) {
            if (next >= 0.0 && next <= duration)
                time = next;
            else
                time = next - std::floor(next / duration) * duration;
        } else {
            time = std::clamp(next, 0.0, duration);
            if (time == 0.0 || time == duration)
                paused = true;
        }
    }
    double normalized() const {
        validateDuration();
        return std::clamp(time / duration, 0.0, 1.0);
    }
    void scrub(double value) {
        validateDuration();
        if (!std::isfinite(value))
            throw std::invalid_argument("Scrub value must be finite");
        time = std::clamp(value, 0.0, 1.0) * duration;
        paused = true;
    }
    void reset() {
        time = 0.0;
        paused = true;
    }

    private:
    void validateDuration() const {
        if (!std::isfinite(duration) || duration < 0.25 || duration > 60.0)
            throw std::invalid_argument("Morph duration must be finite and between 0.25 and 60 seconds");
    }
};

} // namespace morph
