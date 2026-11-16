#pragma once
#include "model.hpp"
#include <bit>

namespace water3 {
// Record nhỏ đọc sau fence; không tải position của workload lớn về CPU.
inline constexpr std::uint32_t diagnosticWords = 72;
inline constexpr std::uint32_t histogramBins = 64;

struct Diagnostics {
    std::array<std::uint32_t, diagnosticWords> values{};

    std::uint32_t updated() const {
        return values[0];
    }

    std::uint32_t inspected() const {
        return values[1];
    }

    std::uint32_t leaked() const {
        return values[2];
    }

    std::uint32_t invalid() const {
        return values[3];
    }

    float minimum() const {
        return std::bit_cast<float>(values[4]);
    }

    float maximum() const {
        return std::bit_cast<float>(values[5]);
    }

    // Histogram của rho/rho0 trong [0,1.6]; bin cuối giữ cả phần vượt thang.
    // Kết quả là xấp xỉ ở tâm bin, không phải percentile chính xác của mọi hạt.
    double quantile(double fraction) const {
        if (inspected() == 0)
            return 0;
        const auto target = static_cast<std::uint32_t>(std::ceil(fraction * inspected()));
        std::uint32_t total = 0;
        for (std::uint32_t bin = 0; bin < histogramBins; ++bin) {
            total += values[8 + bin];
            if (total >= target)
                return (bin + 0.5) * 1.6 / histogramBins;
        }
        return 0;
    }
};

static_assert(sizeof(Diagnostics) == diagnosticWords * sizeof(std::uint32_t));
} // namespace water3
