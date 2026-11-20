#pragma once
#include "scan.hpp"
#include <span>

namespace ct {
#if LAB_CHECKPOINT >= 10
constexpr int sliceSide = 112;
constexpr double sliceRadius = 1.55;

inline Point slicePoint(int x, int y) {
    const double pitch = 2 * sliceRadius / sliceSide;
    return {-sliceRadius + (x + 0.5) * pitch, sliceRadius - (y + 0.5) * pitch};
}

struct Reconstruction {
    std::vector<double> sum = std::vector<double>(sliceSide * sliceSide, 0.0);
    int rows = 0;
};

// Tia đầu tiên đi qua tâm ô số 0 ở u=0.5/N, không đi qua mép trái của detector.
inline double readDetector(std::span<const double, detectorCount> detector, double offset) {
    const double column = (offset / detectorWidth + 0.5) * detectorCount - 0.5;
    if (column < 0 || column > detectorCount - 1) {
        return 0;
    }
    const int left = static_cast<int>(std::floor(column));
    const int right = std::min(left + 1, detectorCount - 1);
    return std::lerp(detector[left], detector[right], column - left);
}

// Máy dựng ảnh chỉ nhận góc và một hàng p=-log(I/I0). Nó không biết vật mẫu là gì.
// Đây là phép trải ngược không lọc trên detector phẳng, không phải phép nghịch đảo chính xác.
// [snippet backproject-row]
inline void backproject(Reconstruction& image, double angle, std::span<const double, detectorCount> detector) {
    const Point radial{std::cos(angle), std::sin(angle)};
    const Point tangent{-radial[1], radial[0]};
    for (int y = 0; y < sliceSide; ++y) {
        for (int x = 0; x < sliceSide; ++x) {
            const Point p = slicePoint(x, y);
            const double depth = sourceRadius - dot(p, radial);
            const double offset = (sourceRadius + detectorRadius) * dot(p, tangent) / depth;
            image.sum[x + sliceSide * y] += readDetector(detector, offset);
        }
    }
    ++image.rows;
}
// [/snippet backproject-row]

inline double averageAt(const Reconstruction& image, int index) {
    if (image.rows == 0) {
        return 0;
    }
    return image.sum.at(index) / image.rows;
}
#endif

#if LAB_CHECKPOINT >= 11
// So hình dạng, không tuyên bố p trung bình là hệ số suy giảm mu.
// Chuẩn hóa mỗi ảnh bằng cực đại riêng trên cùng miền vuông rồi lấy RMSE.
inline double shapeError(const Reconstruction& image, const Scene& reference, double strength) {
    if (image.rows == 0) {
        throw std::invalid_argument("No views to compare");
    }
    std::vector<double> truth(image.sum.size());
    double peakTruth = 0;
    double peakEstimate = 0;
    for (int y = 0; y < sliceSide; ++y) {
        for (int x = 0; x < sliceSide; ++x) {
            const int index = x + sliceSide * y;
            truth[index] = strength * densityAt(reference, slicePoint(x, y));
            peakTruth = std::max(peakTruth, truth[index]);
            peakEstimate = std::max(peakEstimate, averageAt(image, index));
        }
    }
    // [snippet shape-rmse]
    double squared = 0;
    for (size_t i = 0; i < truth.size(); ++i) {
        double expected = 0;
        double estimate = 0;
        if (peakTruth > 0) {
            expected = truth[i] / peakTruth;
        }
        if (peakEstimate > 0) {
            estimate = averageAt(image, static_cast<int>(i)) / peakEstimate;
        }
        squared += (expected - estimate) * (expected - estimate);
    }
    return std::sqrt(squared / truth.size());
    // [/snippet shape-rmse]
}
#endif
} // namespace ct
