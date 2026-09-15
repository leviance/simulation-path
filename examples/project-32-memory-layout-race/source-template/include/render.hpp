#pragma once

#include "particles.hpp"

#include <array>

namespace lab {

inline constexpr std::uint32_t kBackgroundColor = 0x0b1020ffU;
inline constexpr std::array<std::uint32_t, 6> kFieldColors{
    0x61afefffU,
    0x56b6c2ffU,
    0x98c379ffU,
    0xe5c07bffU,
    0xd19a66ffU,
    0xc678ddffU,
};

// Framebuffer CPU giữ phần minh họa tách khỏi benchmark: timer không bao giờ đo đoạn vẽ này.
struct Framebuffer {
    int width{};
    int height{};
    std::vector<std::uint32_t> pixels{};

    void resize(int nextWidth, int nextHeight) {
        width = std::max(1, nextWidth);
        height = std::max(1, nextHeight);
        pixels.assign(std::size_t(width) * std::size_t(height), kBackgroundColor);
    }

    void clear() {
        std::fill(pixels.begin(), pixels.end(), kBackgroundColor);
    }

    void putPixel(int x, int y, std::uint32_t color) {
        if (x < 0 || y < 0 || x >= width || y >= height) {
            return;
        }
        pixels[std::size_t(y) * std::size_t(width) + std::size_t(x)] = color;
    }

    void fillRectangle(int left, int top, int rectangleWidth, int rectangleHeight, std::uint32_t color) {
        for (int y = top; y < top + rectangleHeight; ++y) {
            for (int x = left; x < left + rectangleWidth; ++x) {
                putPixel(x, y, color);
            }
        }
    }
};

// Sơ đồ dùng cùng sáu màu field để người học nhìn thấy AoS xen kẽ và SoA liên tục.
inline void drawMemoryDiagram(
    Framebuffer& framebuffer,
    bool showSoA,
    const std::array<bool, 6>& activeFields
) {
    const int left = 28;
    const int top = 32;
    const int cellWidth = 34;
    const int cellHeight = 22;
    constexpr int visibleParticles = 6;
    if (!showSoA) {
        int slot = 0;
        for (int particle = 0; particle < visibleParticles; ++particle) {
            for (int field = 0; field < int(kParticleFieldCount); ++field) {
                std::uint32_t color = kFieldColors[std::size_t(field)];
                if (!activeFields[std::size_t(field)]) {
                    color = 0x26344cffU;
                }
                framebuffer.fillRectangle(
                    left + slot * cellWidth,
                    top,
                    cellWidth - 2,
                    cellHeight,
                    color
                );
                ++slot;
            }
        }
        return;
    }

    for (int field = 0; field < int(kParticleFieldCount); ++field) {
        std::uint32_t color = kFieldColors[std::size_t(field)];
        if (!activeFields[std::size_t(field)]) {
            color = 0x26344cffU;
        }
        for (int particle = 0; particle < visibleParticles; ++particle) {
            framebuffer.fillRectangle(
                left + particle * cellWidth,
                top + field * (cellHeight + 5),
                cellWidth - 2,
                cellHeight,
                color
            );
        }
    }
}

#if LAB_CHECKPOINT >= 1
// Chỉ lấy mẫu một số particle khi vẽ; kernel benchmark vẫn xử lý đủ toàn bộ mảng.
inline void drawAoSParticles(
    Framebuffer& framebuffer,
    std::span<const ParticleAoS> particles,
    bool showSoA
) {
    int top = 92;
    if (showSoA) {
        top = 220;
    }
    const int left = 28;
    const int viewWidth = std::max(1, framebuffer.width - 56);
    const int viewHeight = std::max(1, framebuffer.height - top - 28);
    const std::size_t maximumDrawCount = 40'000U;
    std::size_t stride = 1U;
    if (particles.size() > maximumDrawCount) {
        stride = (particles.size() + maximumDrawCount - 1U) / maximumDrawCount;
    }
    for (std::size_t index = 0; index < particles.size(); index += stride) {
        const ParticleAoS& particle = particles[index];
        const int x = left + int((particle.positionX * 0.5F + 0.5F) * float(viewWidth - 1));
        const int y = top + int((1.0F - (particle.positionY * 0.5F + 0.5F)) * float(viewHeight - 1));
        framebuffer.putPixel(x, y, 0x61afefffU);
    }
}
#endif

#if LAB_CHECKPOINT >= 4
// Bản SoA đọc trực tiếp hai vector position, đúng với access pattern mà sơ đồ đang mô tả.
inline void drawSoAParticles(Framebuffer& framebuffer, const ParticlesSoA& particles) {
    const int top = 220;
    const int left = 28;
    const int viewWidth = std::max(1, framebuffer.width - 56);
    const int viewHeight = std::max(1, framebuffer.height - top - 28);
    const std::size_t maximumDrawCount = 40'000U;
    std::size_t stride = 1U;
    if (particles.size() > maximumDrawCount) {
        stride = (particles.size() + maximumDrawCount - 1U) / maximumDrawCount;
    }
    for (std::size_t index = 0; index < particles.size(); index += stride) {
        const int x = left + int((particles.positionX[index] * 0.5F + 0.5F) * float(viewWidth - 1));
        const int y = top + int((1.0F - (particles.positionY[index] * 0.5F + 0.5F)) * float(viewHeight - 1));
        framebuffer.putPixel(x, y, 0x98c379ffU);
    }
}
#endif

} // namespace lab
