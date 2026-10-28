#pragma once
#include "viewer-cpu.hpp"

namespace lab {
#if LAB_CHECKPOINT >= 3
// Dung sai cố định, không thay theo ảnh đo được: RGB 3/255, depth 2e-5.
// Chỉ pixel cách cạnh tam giác <= 1.5 pixel được phép khác coverage.
struct ViewerComparison {
    std::size_t interiorFailures{}, edgeDifferences{}, interiorCovered{}, edgePixels{};
    float maxInteriorDepthError{};

    bool passed(std::size_t pixelCount) const {
        return interiorFailures == 0 && edgeDifferences <= std::max(std::size_t(8), pixelCount / 200);
    }
};

inline std::vector<bool> viewerEdgeMask(const ViewerMesh& mesh, const ViewerMatrices& matrices, int width, int height) {
    std::vector<bool> mask(std::size_t(width) * height, false);
    for (std::size_t offset = 0; offset < mesh.indices.size(); offset += 3) {
        std::array<Vec4, 3> clip{};
        for (std::size_t index = 0; index < 3; ++index) {
            const auto& v = mesh.vertices[mesh.indices[offset + index]];
            clip[index] = transform(matrices.mvp, {v.positionX, v.positionY, v.positionZ, 1});
        }
        const auto polygon = clipViewerTriangle(clip[0], clip[1], clip[2]);
        for (std::size_t index = 0; index < polygon.count; ++index) {
            const auto ca = polygon.points[index], cb = polygon.points[(index + 1) % polygon.count];
            if (ca.w <= 1e-7F || cb.w <= 1e-7F)
                continue;
            const auto a = viewerScreenVertex(ca, width, height), b = viewerScreenVertex(cb, width, height);
            const int left = std::max(0, int(std::floor(std::min(a.x, b.x) - 2)));
            const int right = std::min(width - 1, int(std::ceil(std::max(a.x, b.x) + 2)));
            const int top = std::max(0, int(std::floor(std::min(a.y, b.y) - 2)));
            const int bottom = std::min(height - 1, int(std::ceil(std::max(a.y, b.y) + 2)));
            const float dx = b.x - a.x, dy = b.y - a.y;
            const float lengthSquared = dx * dx + dy * dy;
            for (int y = top; y <= bottom; ++y) {
                for (int x = left; x <= right; ++x) {
                    const float along = lengthSquared > 0 ? std::clamp(((x + 0.5F - a.x) * dx + (y + 0.5F - a.y) * dy) / lengthSquared, 0.0F, 1.0F) : 0;
                    const float ex = x + 0.5F - a.x - along * dx, ey = y + 0.5F - a.y - along * dy;
                    if (ex * ex + ey * ey <= 2.25F)
                        mask[std::size_t(y) * width + x] = true;
                }
            }
        }
    }
    return mask;
}

inline ViewerComparison compareViewerImage(const Framebuffer& cpu, const std::vector<std::uint8_t>& gpuColor, const std::vector<float>& gpuDepth, const std::vector<bool>& edgeMask) {
    if (gpuColor.size() != cpu.rgba.size() || gpuDepth.size() != cpu.depth.size() || edgeMask.size() != cpu.depth.size()) {
        throw std::invalid_argument("Comparison image sizes differ");
    }
    ViewerComparison result{};
    for (int y = 0; y < cpu.height; ++y) {
        for (int x = 0; x < cpu.width; ++x) {
            const auto top = std::size_t(y) * cpu.width + x;
            const auto bottom = std::size_t(cpu.height - 1 - y) * cpu.width + x;
            int colorError = 0;
            for (int channel = 0; channel < 3; ++channel) {
                colorError = std::max(colorError, std::abs(int(cpu.rgba[top * 4 + channel]) - int(gpuColor[bottom * 4 + channel])));
            }
            const float depthError = std::abs(cpu.depth[top] - gpuDepth[bottom]);
            const bool cpuCovered = cpu.rgba[top * 4] != 13 || cpu.rgba[top * 4 + 1] != 21 || cpu.rgba[top * 4 + 2] != 38;
            const bool gpuCovered = gpuColor[bottom * 4] != 13 || gpuColor[bottom * 4 + 1] != 21 || gpuColor[bottom * 4 + 2] != 38;
            const bool differs = cpuCovered != gpuCovered || colorError > 3 || !std::isfinite(gpuDepth[bottom]) || depthError > 2e-5F;
            if (edgeMask[top]) {
                ++result.edgePixels;
                if (differs)
                    ++result.edgeDifferences;
            } else {
                if (differs)
                    ++result.interiorFailures;
                if (cpuCovered && gpuCovered)
                    ++result.interiorCovered;
                result.maxInteriorDepthError = std::max(result.maxInteriorDepthError, depthError);
            }
        }
    }
    return result;
}
#endif
} // namespace lab
