#pragma once
#include "model.hpp"
#include <numbers>

namespace water {
// Bể kín có bốn biên; lattice của tường kéo dài ra ngoài đúng ba lớp.
inline std::vector<Particle> wallSamples() {
    std::vector<Particle> walls;
    for (int y = -3; y < 111; ++y) {
        for (int x = -3; x < 183; ++x) {
            if (x < 0 || x >= 180 || y < 0 || y >= 108) {
                walls.push_back({(x + 0.5) * spacing, (y + 0.5) * spacing});
            }
        }
    }
    return walls;
}

// [snippet scene]
inline State makeState([[maybe_unused]] Preset preset = Preset::Dam, std::size_t count = 5000) {
    if (count != 1000 && count != 5000 && count != 10000) {
        throw std::invalid_argument("Choose 1000, 5000 or 10000 particles");
    }
    State state;
#if LAB_CHECKPOINT >= 1
    if (preset != Preset::Empty) {
        std::size_t columns = count / 100;
        if (count == 1000) {
            columns = 20;
        }
        if (preset == Preset::Pool) {
            columns = 125;
        }
        state.particles.reserve(capacity);
        for (std::size_t i = 0; i < count; ++i) {
            const double x = (static_cast<double>(i % columns) + 0.5) * spacing;
            const double y = (static_cast<double>(i / columns) + 0.5) * spacing;
            state.particles.push_back({x, y});
        }
    }
#if LAB_CHECKPOINT >= 4
    state.walls = wallSamples();
#endif
#if LAB_CHECKPOINT >= 11
    state.paddle.enabled = preset == Preset::Obstacle;
#endif
#endif
    return state;
}

// [/snippet scene]
// [snippet solid-samples]
inline std::vector<Particle> samples(const State& state) {
    std::vector<Particle> result = state.particles;
    result.insert(result.end(), state.walls.begin(), state.walls.end());
#if LAB_CHECKPOINT >= 11
    if (state.paddle.enabled) {
        // Vành đai mẫu nằm bên trong vật rắn, chuyển động với cùng velocity.
        for (int layer = 0; layer < 3; ++layer) {
            const double radius = state.paddle.radius - (layer + 0.5) * spacing;
            const int count = static_cast<int>(std::ceil(2 * std::numbers::pi * radius / spacing));
            for (int k = 0; k < count; ++k) {
                const double angle = 2 * std::numbers::pi * k / count;
                result.push_back({state.paddle.x + radius * std::cos(angle), state.paddle.y + radius * std::sin(angle), state.paddle.vx, state.paddle.vy});
            }
        }
    }
#endif
    return result;
}

// [/snippet solid-samples]
} // namespace water
