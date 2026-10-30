#pragma once
#include "gpu_renderer.hpp"
#include <iostream>

#if LAB_CHECKPOINT >= 9
namespace lab {
inline bool verifyShaderDiagnostics(GlApi& gl) {
    std::string diagnostics;
    const char* badVertex = "#version 330 core\nvoid main() { gl_Position = ; }";
    GLuint program = createProgram(gl, badVertex, kTriangleFragmentShader, diagnostics);
    if (program != 0) {
        gl.DeleteProgram(program);
        return false;
    }
    if (diagnostics.find("vertex shader compile failed:") == std::string::npos)
        return false;
    const char* wrongInterface = "#version 330 core\nin vec2 vColor; out vec4 fragmentColor; void main() { fragmentColor = vec4(vColor, 0.0, 1.0); }";
    program = createProgram(gl, kTriangleVertexShader, wrongInterface, diagnostics);
    if (program != 0) {
        gl.DeleteProgram(program);
        return false;
    }
    if (diagnostics.find("program link failed:") == std::string::npos)
        return false;
    std::cout << "Shader compile/link failure diagnostics verified on the current driver.\n";
    return gl.GetError() == GL_NO_ERROR;
}

inline bool captureFramebuffer(GlApi& gl, int width, int height, const char* path) {
    const std::size_t pitch = std::size_t(width) * 4;
    std::vector<std::uint8_t> pixels(pitch * std::size_t(height));
    gl.ReadPixels(0, 0, width, height, GL_RGBA, GL_UNSIGNED_BYTE, pixels.data());
    // OpenGL rows run bottom-up; BMP receives a conventional top-left surface.
    for (int y = 0; y < height / 2; ++y) {
        auto top = pixels.begin() + std::size_t(y) * pitch;
        auto bottom = pixels.begin() + std::size_t(height - 1 - y) * pitch;
        std::swap_ranges(top, top + pitch, bottom);
    }
    SDL_Surface* surface = SDL_CreateSurfaceFrom(width, height, SDL_PIXELFORMAT_RGBA32, pixels.data(), int(pitch));
    if (!surface)
        return false;
    const bool saved = SDL_SaveBMP(surface, path);
    SDL_DestroySurface(surface);
    return saved && gl.GetError() == GL_NO_ERROR;
}

inline bool verifyCoverageBand(GlApi& gl, const Viewport& viewport, const std::array<GpuVertex, 3>& triangle, const Transform2D& transform, bool smoothColor) {
    Framebuffer expected{};
    if (!expected.resize(viewport.width, viewport.height)) {
        return false;
    }
    rasterizeCpuTriangle(expected, triangle, transform, smoothColor);
    std::vector<std::uint8_t> actual(expected.rgba.size());
    gl.ReadPixels(viewport.x, viewport.y, viewport.width, viewport.height, GL_RGBA, GL_UNSIGNED_BYTE, actual.data());
    const auto transformed = transformedTriangle(triangle, transform);
    std::array<Vec2, 3> screen{};
    for (int index = 0; index < 3; ++index) {
        screen[index] = ndcToCpuScreen({transformed[index].positionX, transformed[index].positionY}, viewport.width, viewport.height);
    }
    std::size_t edgeDifferences = 0;
    for (int y = 0; y < viewport.height; ++y) {
        for (int x = 0; x < viewport.width; ++x) {
            const std::size_t cpuOffset = (std::size_t(y) * viewport.width + x) * 4;
            const std::size_t gpuOffset = (std::size_t(viewport.height - 1 - y) * viewport.width + x) * 4;
            int error = 0;
            for (int channel = 0; channel < 3; ++channel) {
                error = std::max(error, std::abs(int(expected.rgba[cpuOffset + channel]) - int(actual[gpuOffset + channel])));
            }
            if (error <= 2)
                continue;
            float nearestEdge = std::numeric_limits<float>::infinity();
            for (int index = 0; index < 3; ++index) {
                const auto a = screen[index];
                const auto b = screen[(index + 1) % 3];
                const Vec2 segment = subtract(b, a);
                const Vec2 pixel{float(x) + 0.5F, float(y) + 0.5F};
                const Vec2 relative = subtract(pixel, a);
                const float squaredLength = segment.x * segment.x + segment.y * segment.y;
                float along = 0;
                if (squaredLength > 0)
                    along = std::clamp((relative.x * segment.x + relative.y * segment.y) / squaredLength, 0.0F, 1.0F);
                const Vec2 closest{a.x + along * segment.x, a.y + along * segment.y};
                nearestEdge = std::min(nearestEdge, length(subtract(pixel, closest)));
            }
            // Precision/fill-rule differences may touch a narrow boundary band,
            // never arbitrary interior pixels. This is not a general image SSIM test.
            if (nearestEdge > 1.5F)
                return false;
            ++edgeDifferences;
        }
    }
    std::cout << "full-image edge differences=" << edgeDifferences << " band<=1.5px RGB tolerance=2/255\n";
    return gl.GetError() == GL_NO_ERROR;
}

// This is a real-driver check. CTest remains CPU-only so CI needs no display.
inline bool verifyGpuImage(GlApi& gl, const Viewport& viewport, const std::array<GpuVertex, 3>& triangle, const Transform2D& transform, bool smoothColor) {
    const auto transformed = transformedTriangle(triangle, transform);
    constexpr std::array<std::array<float, 3>, 3> weights{{{1.0F / 3, 1.0F / 3, 1.0F / 3}, {0.6F, 0.2F, 0.2F}, {0.2F, 0.6F, 0.2F}}};
    for (const auto& weight : weights) {
        Vec2 point{};
        for (int index = 0; index < 3; ++index) {
            point.x += transformed[index].positionX * weight[index];
            point.y += transformed[index].positionY * weight[index];
        }
        const auto result = readGpuProbe(gl, viewport, transform, point, smoothColor, triangle);
        std::cout << "interior pixel=" << result.pixelX << ',' << result.pixelY << " error=" << result.maximumDifference << '\n';
        if (!result.valid || !result.inside || result.nearEdge || result.maximumDifference > 2.0F / 255.0F)
            return false;
    }
    const auto outside = readGpuProbe(gl, viewport, transform, {-0.98F, 0.98F}, smoothColor, triangle);
    if (!outside.valid || outside.inside || outside.maximumDifference > 2.0F / 255.0F)
        return false;
    return gl.GetError() == GL_NO_ERROR && verifyCoverageBand(gl, viewport, triangle, transform, smoothColor);
}
} // namespace lab
#endif
