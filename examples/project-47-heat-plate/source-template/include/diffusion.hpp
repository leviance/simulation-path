#pragma once
#ifndef LAB_CHECKPOINT
#define LAB_CHECKPOINT 8
#endif
#include "field.hpp"

namespace heat {
enum class Boundary {
    Insulated,
    Cold
};

struct Settings {
    double diffusivity = 6;
    double dx = 1;
    double dy = 1;
    double dt = 1.0 / 30.0;
    Boundary boundary = Boundary::Insulated;
};

inline double ratioX(const Settings& settings) {
    return settings.diffusivity * settings.dt / (settings.dx * settings.dx);
}

inline double ratioY(const Settings& settings) {
    return settings.diffusivity * settings.dt / (settings.dy * settings.dy);
}

inline bool stable(const Settings& settings) {
    if (!std::isfinite(settings.diffusivity) || !std::isfinite(settings.dt) || !std::isfinite(settings.dx) || !std::isfinite(settings.dy)) {
        return false;
    }
    if (settings.diffusivity < 0 || settings.dt <= 0 || settings.dx <= 0 || settings.dy <= 0) {
        return false;
    }
    double sum = ratioX(settings);
#if LAB_CHECKPOINT >= 4
    sum += ratioY(settings);
#endif
    return std::isfinite(sum) && sum <= 0.5;
}

// Biên cách nhiệt dùng giá trị ô sát biên cho ghost cell: thông lượng qua mặt ngoài bằng 0.
inline double sample(const Field& field, int x, int y) {
    x = std::clamp(x, 0, field.width - 1);
    y = std::clamp(y, 0, field.height - 1);
    return field.current[field.index(x, y)];
}

inline void applyBoundary(Field& field, const Settings& settings) {
    if (settings.boundary != Boundary::Cold) {
        return;
    }
    for (int y = 0; y < field.height; ++y) {
        for (int x = 0; x < field.width; ++x) {
            if (field.edge(x, y)) {
                field.current[field.index(x, y)] = 0;
            }
        }
    }
}

#if LAB_CHECKPOINT >= 3
inline bool diffuse(Field& field, const Settings& settings) {
    // Từ chối cấu hình không ổn định trước khi chạm vào trạng thái.
    if (!stable(settings)) {
        return false;
    }
#if LAB_CHECKPOINT >= 5
    applyBoundary(field, settings);
#endif
    const double rx = ratioX(settings);
#if LAB_CHECKPOINT >= 4
    const double ry = ratioY(settings);
#endif
    for (int y = 0; y < field.height; ++y) {
        for (int x = 0; x < field.width; ++x) {
            const std::size_t index = field.index(x, y);
#if LAB_CHECKPOINT >= 5
            if (settings.boundary == Boundary::Cold && field.edge(x, y)) {
                field.next[index] = 0;
                continue;
            }
#endif
            const double center = sample(field, x, y);
            const double horizontal = sample(field, x - 1, y) - 2 * center + sample(field, x + 1, y);
            double value = center + rx * horizontal;
#if LAB_CHECKPOINT >= 4
            const double vertical = sample(field, x, y - 1) - 2 * center + sample(field, x, y + 1);
            value += ry * vertical;
#endif
            field.next[index] = value;
        }
    }
    // Chỉ hoán đổi sau khi đã tính xong tất cả ô; tuyệt đối không clamp nghiệm.
    field.current.swap(field.next);
    ++field.tick;
    return true;
}
#endif
} // namespace heat
