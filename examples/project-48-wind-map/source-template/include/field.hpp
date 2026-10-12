#pragma once
#ifndef LAB_CHECKPOINT
#define LAB_CHECKPOINT 9
#endif
#include <algorithm>
#include <cmath>
#include <stdexcept>
#include <vector>

namespace wind {
struct Vec2 {
    double x = 0;
    double y = 0;
};

struct Field {
    int width;
    int height;
    double dx;
    double dy;
    std::vector<double> scalar;
    std::vector<double> vx;
    std::vector<double> vy;

    explicit Field(int columns = 33, int rows = 25)
        : width(columns), height(rows) {
        if (width < 3 || height < 3 || width > 129 || height > 129) {
            throw std::invalid_argument("Grid dimensions must be in [3, 129]");
        }
        dx = 4.0 / (width - 1);
        dy = 3.0 / (height - 1);
        scalar.assign(static_cast<std::size_t>(width * height), 0.0);
        vx.assign(scalar.size(), 1.0);
        vy.assign(scalar.size(), 0.25);
    }

    std::size_t index(int x, int y) const {
        return static_cast<std::size_t>(y * width + x);
    }
};

inline Vec2 world(const Field& field, int x, int y) {
    // Nút lưới gồm cả hai đầu miền; y tăng từ đáy lên trên.
    return {-2 + x * field.dx, -1.5 + y * field.dy};
}

inline bool inside(Vec2 p) {
    return std::isfinite(p.x) && std::isfinite(p.y) && p.x >= -2 && p.x <= 2 && p.y >= -1.5 && p.y <= 1.5;
}

#if LAB_CHECKPOINT >= 2
enum class Preset {
    Uniform,
    Source,
    Sink,
    Rotation,
    Shear,
    Gradient,
};

enum class Potential {
    Bowl,
    Hill,
};

struct Scene {
    Preset preset = Preset::Uniform;
    Potential potential = Potential::Bowl;
    bool vortex = false;
    Vec2 center{};
    double strength = 2;
};

inline Scene initialScene() {
    Scene scene;
#if LAB_CHECKPOINT == 2
    scene.preset = Preset::Source;
#elif LAB_CHECKPOINT == 3
    scene.preset = Preset::Gradient;
#elif LAB_CHECKPOINT == 4
    scene.preset = Preset::Source;
#elif LAB_CHECKPOINT == 5
    scene.preset = Preset::Rotation;
#elif LAB_CHECKPOINT == 6
    scene.preset = Preset::Gradient;
    scene.potential = Potential::Hill;
#elif LAB_CHECKPOINT >= 7
    scene.preset = Preset::Rotation;
#endif
    return scene;
}

inline double potentialAt(Vec2 p, Potential potential) {
    const double r2 = p.x * p.x + p.y * p.y;
    if (potential == Potential::Hill) {
        return std::exp(-r2);
    }
    return 0.5 * r2;
}

inline Vec2 exactGradient(Vec2 p, Potential potential) {
    if (potential == Potential::Hill) {
        const double value = std::exp(-p.x * p.x - p.y * p.y);
        return {-2 * p.x * value, -2 * p.y * value};
    }
    return p;
}
#endif
} // namespace wind
