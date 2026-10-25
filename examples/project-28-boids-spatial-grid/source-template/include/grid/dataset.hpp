#pragma once
#include "boids/flock.hpp"

namespace lab {
enum class Layout { Uniform,
                    Clustered,
                    Dense };

inline const char* layoutName(Layout layout) {
    if (layout == Layout::Clustered) {
        return "clustered";
    }
    if (layout == Layout::Dense) {
        return "dense";
    }
    return "uniform";
}

inline std::vector<Boid> makeDataset(std::size_t count, std::uint32_t seed, const Params& params, Layout layout) {
    auto flock = makeFlock(count, seed, params);
#if LAB_CHECKPOINT >= 7
    // Chỉ thay vị trí ban đầu, không đổi vận tốc hoặc quy tắc steering.
    for (Boid& boid : flock) {
        if (layout == Layout::Clustered) {
            const double side = static_cast<double>(boid.id % 2);
            boid.position.x = params.width * (0.15 + side * 0.5) + boid.position.x * 0.2;
            boid.position.y = params.height * 0.35 + boid.position.y * 0.2;
        } else if (layout == Layout::Dense) {
            boid.position.x = params.width * 0.507 + boid.position.x * 0.0001;
            boid.position.y = params.height * 0.506 + boid.position.y * 0.0001;
        }
    }
#else
    static_cast<void>(layout);
#endif
    return flock;
}
} // namespace lab
