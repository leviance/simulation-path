#pragma once
#include "geometry.hpp"
#include <stdexcept>

namespace lab {
// Depth buffer có cùng tọa độ và row-major index với color buffer.
struct DepthBuffer {
#if LAB_CHECKPOINT >= 3
    explicit DepthBuffer(int width, int height, double clearDepth = 1.0) {
        if (!resize(width, height, clearDepth)) {
            throw std::invalid_argument("Invalid depth buffer size");
        }
    }

    bool resize(int width, int height, double clearDepth = 1.0) {
        constexpr std::size_t maxPixels = 4000000;
        if (width <= 0 || height <= 0 || !std::isfinite(clearDepth) || clearDepth < 0.0 || clearDepth > 1.0 || std::size_t(width) > maxPixels / std::size_t(height)) {
            return false;
        }
        std::vector<double> next(std::size_t(width) * std::size_t(height), clearDepth);
        values_.swap(next);
        width_ = width;
        height_ = height;
        return true;
    }

    void clear(double clearDepth = 1.0) {
        if (!std::isfinite(clearDepth) || clearDepth < 0.0 || clearDepth > 1.0) {
            throw std::invalid_argument("Invalid clear depth");
        }
        std::fill(values_.begin(), values_.end(), clearDepth);
    }

    std::size_t index(int x, int y) const {
        if (x < 0 || y < 0 || x >= width_ || y >= height_) {
            throw std::out_of_range("Depth pixel outside buffer");
        }
        return std::size_t(y) * std::size_t(width_) + std::size_t(x);
    }

    double at(int x, int y) const {
        return values_[index(x, y)];
    }

    double& at(int x, int y) {
        return values_[index(x, y)];
    }

    int width() const {
        return width_;
    }

    int height() const {
        return height_;
    }

    const std::vector<double>& values() const {
        return values_;
    }

    private:
    int width_{};
    int height_{};
    std::vector<double> values_{};
#else
    // Stub chưa cấp phát hay so sánh depth; bài 3 thay toàn bộ struct này.
    explicit DepthBuffer(int width, int height) {
        (void)width;
        (void)height;
    }
#endif
};

#if LAB_CHECKPOINT >= 4
inline double interpolateNdcDepth(const ScreenTriangle& triangle, Barycentric weights) {
    return weights.a * triangle.a.ndcDepth + weights.b * triangle.b.ndcDepth + weights.c * triangle.c.ndcDepth;
}
#endif

struct DepthTestResult {
    double storedDepth{1.0};
    double newDepth{};
    bool passed{};
};

#if LAB_CHECKPOINT >= 5
inline DepthTestResult depthTestAndWrite(DepthBuffer& depthBuffer, int x, int y, double newDepth, bool depthEnabled = true) {
    DepthTestResult result{1.0, newDepth, false};
    if (x < 0 || y < 0 || x >= depthBuffer.width() || y >= depthBuffer.height() || !std::isfinite(newDepth) || newDepth < 0.0 || newDepth >= 1.0) {
        return result;
    }
    result.storedDepth = depthBuffer.at(x, y);
    result.passed = !depthEnabled || newDepth < result.storedDepth;
    // Khi tắt depth test, color vẫn được ghi nhưng depth giữ giá trị clear.
    if (result.passed && depthEnabled) {
        depthBuffer.at(x, y) = newDepth;
    }
    return result;
}
#endif
} // namespace lab
