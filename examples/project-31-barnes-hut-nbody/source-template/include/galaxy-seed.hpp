#pragma once

#include <algorithm>
#include <cmath>
#include <cstddef>

namespace lab {
constexpr double galaxyTurn = 6.283185307179586;

// Bán kính có trọng số diện tích: một vành rộng dr ở xa chứa nhiều diện tích hơn.
inline double sampleDiskRadius(double unit) {
    constexpr double scale = 0.47;
    constexpr double rim = 1.82;
    const auto cumulative = [](double x) { return 1.0 - (1.0 + x) * std::exp(-x); };
    const double target = unit * cumulative(rim / scale);
    double low = 0.0;
    double high = rim;
    for (int pass = 0; pass < 16; ++pass) {
        const double middle = 0.5 * (low + high);
        if (cumulative(middle / scale) < target) {
            low = middle;
        } else {
            high = middle;
        }
    }
    return 0.5 * (low + high);
}

inline double smoothBand(double t) {
    t = std::clamp(t, 0.0, 1.0);
    return t * t * (3.0 - 2.0 * t);
}

// Mỗi vòng ở bán kính r có hai vùng đông sao và những đoạn nhánh ngắn.
// Ta chỉ dùng bản mô tả mật độ này lúc gieo hạt, không dùng khi vẽ hoặc tính lực.
struct SpiralRing {
    double armA, armB, spurA, spurB, width, strengthA, strengthB, branchA, branchB, contrast;
};

inline SpiralRing spiralRing(double r) {
    const double armA = 0.55 + 4.25 * std::log1p(r / 0.27) + 0.16 * std::sin(6.2 * r);
    const double armB = 3.92 + 3.65 * std::log1p(r / 0.22) - 0.20 * std::sin(5.3 * r + 0.5);
    const double width = 0.22 + 0.12 / (r + 0.30);
    const double strengthA = 0.72 + 0.24 * std::cos(10.0 * r + 0.4);
    const double strengthB = 0.65 + 0.22 * std::sin(13.0 * r - 0.7);
    const double branchA = 0.67 * smoothBand((r - 0.56) / 0.27) * smoothBand((1.65 - r) / 0.44);
    const double branchB = 0.58 * smoothBand((r - 0.36) / 0.23) * smoothBand((1.14 - r) / 0.33);
    const double contrast = smoothBand((r - 0.12) / 0.30) * (1.0 - 0.45 * smoothBand((r - 1.40) / 0.42));
    return {armA, armB, armA + 1.75 * (r - 0.56), armB - 1.95 * (r - 0.36),
            width, strengthA, strengthB, branchA, branchB, contrast};
}

inline double ridgeAt(double angle, double center, double width) {
    const double turns = (angle - center) / galaxyTurn;
    const double offset = galaxyTurn * (turns - std::floor(turns + 0.5)) / width;
    const double ridge = std::max(0.0, 1.0 - offset * offset);
    return ridge * ridge;
}

// [snippet disk-density]
inline double diskDensity(const SpiralRing& ring, double angle) {
    const double main = ring.strengthA * ridgeAt(angle, ring.armA, ring.width)
        + ring.strengthB * ridgeAt(angle, ring.armB, 1.22 * ring.width);
    const double branches = ring.branchA * ridgeAt(angle, ring.spurA, 0.75 * ring.width)
        + ring.branchB * ridgeAt(angle, ring.spurB, 0.90 * ring.width);
    // Nền liên tục: giữa hai nhánh vẫn có sao. Không có texture bụi để che pixel.
    return 0.115 + ring.contrast * (main + branches);
}
// [/snippet disk-density]

struct SeedPoint {
    double planarRadius, angle, height, speedRadius, verticalSpread;
};

template <class Generator>
inline SeedPoint sampleGalaxyPoint(std::size_t id, Generator& random) {
    const double radial = random.unit();
    const bool bulge = id % 5 == 0;
    const bool halo = !bulge && id % 23 == 0;
    if (bulge || halo) {
        double radius = 0.48 + 1.18 * std::sqrt(radial);
        double flatten = 0.86;
        if (bulge) {
            // Khối phình tập trung ở tâm, mờ dần và nối vào đĩa; không khoét lỗ ở giữa.
            constexpr double scale = 0.16;
            constexpr double rim = 0.66;
            const double q = std::cbrt(radial) * rim / std::hypot(rim, scale);
            radius = scale * q / std::sqrt(1.0 - q * q);
            flatten = 0.76;
        }
        const double angle = galaxyTurn * random.unit();
        const double cosine = 2.0 * random.unit() - 1.0;
        return {radius * std::sqrt(1.0 - cosine * cosine), angle, radius * cosine * flatten,
                std::max(0.06, radius), 0.36};
    }

    const double radius = sampleDiskRadius(radial);
    const SpiralRing ring = spiralRing(radius);
    // 2.05 là cận trên cho mật độ ở mọi góc. Giới hạn số lần thử;
    // nếu chưa chọn được thì lấy một sao của nền thay vì chặn giao diện.
    double angle = galaxyTurn * random.unit();
    for (int attempt = 0; attempt < 32; ++attempt) {
        const double candidate = galaxyTurn * random.unit();
        if (2.05 * random.unit() < diskDensity(ring, candidate)) {
            angle = candidate;
            break;
        }
    }
    const double zNoise = 2.0 * (random.unit() + random.unit() + random.unit() - 1.5);
    const double height = (0.030 + 0.030 * radius) * zNoise
                        + 0.014 * radius * radius * std::sin(angle - 0.65);
    return {radius, angle, height, std::max(0.06, radius), 0.045};
}
} // namespace lab
