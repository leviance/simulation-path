#pragma once
#ifndef LAB_CHECKPOINT
#define LAB_CHECKPOINT 8
#endif
#include "diffusion.hpp"

namespace heat {
#if LAB_CHECKPOINT >= 7
struct Stats {
    double minimum = 0;
    double maximum = 0;
    double mean = 0;
    double sum = 0;
};

inline Stats measure(const Field& field) {
    // Tổng theta chỉ tỉ lệ với nhiệt lượng khi thể tích ô và nhiệt dung là hằng số.
    Stats result;
    result.minimum = field.current.front();
    result.maximum = field.current.front();
    for (const double value : field.current) {
        result.minimum = std::min(result.minimum, value);
        result.maximum = std::max(result.maximum, value);
        result.sum += value;
    }
    result.mean = result.sum / static_cast<double>(field.current.size());
    return result;
}
#endif

#if LAB_CHECKPOINT >= 8
struct Validation {
    bool conserved = true;
    bool bounded = true;
    bool coldEdges = true;
    double maxSumError = 0;
};

inline Validation validatePlate() {
    Field field = makeField();
    Settings settings;
    const double initialSum = measure(field).sum;
    Validation result;
    // Kiểm tra một bản riêng, không biến thời gian chờ thành tick của cảnh đang vẽ.
    for (int step = 0; step < 120; ++step) {
        const bool accepted = diffuse(field, settings);
        const Stats stats = measure(field);
        result.maxSumError = std::max(result.maxSumError, std::abs(stats.sum - initialSum));
        result.conserved = result.conserved && accepted && result.maxSumError < 1e-9;
        result.bounded = result.bounded && stats.minimum >= -1e-12 && stats.maximum <= 1 + 1e-12;
    }
    settings.boundary = Boundary::Cold;
    field = makeField(1);
    applyBoundary(field, settings);
    double previousSum = measure(field).sum;
    for (int step = 0; step < 120; ++step) {
        diffuse(field, settings);
        const double sum = measure(field).sum;
        result.coldEdges = result.coldEdges && sum <= previousSum + 1e-9;
        previousSum = sum;
        for (int y = 0; y < field.height; ++y) {
            for (int x = 0; x < field.width; ++x) {
                if (field.edge(x, y) && sample(field, x, y) != 0) {
                    result.coldEdges = false;
                }
            }
        }
    }
    return result;
}
#endif
} // namespace heat
