#pragma once
#include <algorithm>
#include <cmath>
#include <cstdint>
#include <vector>

namespace lab {
// Lớp sáng mềm chỉ nhận đóng góp của những giọt vượt qua phép thử độ sâu.
// Tính trên ô 6 pixel, tách khỏi solver và giữ dung lượng cố định giữa các frame.
struct SprayLight {
    static constexpr int cell = 6;
    int columns{}, rows{};
    std::vector<float> light, across, smooth;

    void clear(int width, int height) {
        columns = (width + cell - 1) / cell + 1;
        rows = (height + cell - 1) / cell + 1;
        const auto count = std::size_t(columns) * rows;
        light.assign(count, 0);
        across.resize(count);
        smooth.resize(count);
    }

    void record(double x, double y, float intensity) {
        const float u = float(x) / cell, v = float(y) / cell;
        const int col = int(u), row = int(v);
        const float fx = u - col, fy = v - row;
        const int i = row * columns + col;
        light[i] += intensity * (1 - fx) * (1 - fy);
        light[i + 1] += intensity * fx * (1 - fy);
        light[i + columns] += intensity * (1 - fx) * fy;
        light[i + columns + 1] += intensity * fx * fy;
    }

    void develop(std::vector<std::uint32_t>& pixels, int width, int height) {
        // Hạt nhân [1, 4, 6, 4, 1]/16; làm mờ ngang rồi dọc.
        constexpr float weight[]{1, 4, 6, 4, 1};
        for (int row = 0; row < rows; ++row) {
            for (int col = 0; col < columns; ++col) {
                float value = 0;
                for (int d = -2; d <= 2; ++d)
                    value += weight[d + 2] * light[row * columns + std::clamp(col + d, 0, columns - 1)];
                across[row * columns + col] = value / 16;
            }
        }
        for (int row = 0; row < rows; ++row) {
            for (int col = 0; col < columns; ++col) {
                float value = 0;
                for (int d = -2; d <= 2; ++d)
                    value += weight[d + 2] * across[std::clamp(row + d, 0, rows - 1) * columns + col];
                smooth[row * columns + col] = value / (16 + value);
            }
        }
        for (int y = 0; y < height; ++y) {
            const int row = y / cell;
            const float fy = float(y % cell) / cell;
            for (int col = 0; col * cell < width; ++col) {
                const int i = row * columns + col;
                const float left = std::lerp(smooth[i], smooth[i + columns], fy);
                const float right = std::lerp(smooth[i + 1], smooth[i + columns + 1], fy);
                if (std::max(left, right) < 0.01F) continue;
                for (int j = 0; j < cell && col * cell + j < width; ++j) {
                    const float strength = std::lerp(left, right, float(j) / cell);
                    auto& pixel = pixels[std::size_t(y) * width + col * cell + j];
                    const auto r = std::min(255U, (pixel >> 24U) + unsigned(32 * strength));
                    const auto g = std::min(255U, ((pixel >> 16U) & 255U) + unsigned(42 * strength));
                    const auto b = std::min(255U, ((pixel >> 8U) & 255U) + unsigned(46 * strength));
                    pixel = (r << 24U) | (g << 16U) | (b << 8U) | 255U;
                }
            }
        }
    }
};
} // namespace lab
