#pragma once
#include "gl_api.hpp"
#include "pipeline.hpp"
#include <cstdio>
#include <string_view>

#if LAB_CHECKPOINT >= 9
namespace lab {
// Tiny diagnostic font. Scissored clears draw only the overlay, after readback;
// they do not replace the CPU rasterizer or the triangle shader.
inline std::array<unsigned, 5> glyph(char character) {
    switch (character) {
    case 'A':
        return {2, 5, 7, 5, 5};
    case 'B':
        return {6, 5, 6, 5, 6};
    case 'C':
        return {3, 4, 4, 4, 3};
    case 'D':
        return {6, 5, 5, 5, 6};
    case 'E':
        return {7, 4, 6, 4, 7};
    case 'F':
        return {7, 4, 6, 4, 4};
    case 'G':
        return {3, 4, 5, 5, 3};
    case 'H':
        return {5, 5, 7, 5, 5};
    case 'I':
        return {7, 2, 2, 2, 7};
    case 'J':
        return {1, 1, 1, 5, 2};
    case 'K':
        return {5, 5, 6, 5, 5};
    case 'L':
        return {4, 4, 4, 4, 7};
    case 'M':
        return {5, 7, 7, 5, 5};
    case 'N':
        return {5, 7, 7, 7, 5};
    case 'O':
        return {2, 5, 5, 5, 2};
    case 'P':
        return {6, 5, 6, 4, 4};
    case 'Q':
        return {2, 5, 5, 3, 1};
    case 'R':
        return {6, 5, 6, 5, 5};
    case 'S':
        return {3, 4, 2, 1, 6};
    case 'T':
        return {7, 2, 2, 2, 2};
    case 'U':
        return {5, 5, 5, 5, 7};
    case 'V':
        return {5, 5, 5, 5, 2};
    case 'W':
        return {5, 5, 7, 7, 5};
    case 'X':
        return {5, 5, 2, 5, 5};
    case 'Y':
        return {5, 5, 2, 2, 2};
    case 'Z':
        return {7, 1, 2, 4, 7};
    case '0':
        return {7, 5, 5, 5, 7};
    case '1':
        return {2, 6, 2, 2, 7};
    case '2':
        return {6, 1, 2, 4, 7};
    case '3':
        return {6, 1, 2, 1, 6};
    case '4':
        return {5, 5, 7, 1, 1};
    case '5':
        return {7, 4, 6, 1, 6};
    case '6':
        return {3, 4, 7, 5, 7};
    case '7':
        return {7, 1, 2, 2, 2};
    case '8':
        return {7, 5, 7, 5, 7};
    case '9':
        return {7, 5, 7, 1, 6};
    case '-':
        return {0, 0, 7, 0, 0};
    case '.':
        return {0, 0, 0, 0, 2};
    case ':':
        return {0, 2, 0, 2, 0};
    case '/':
        return {1, 1, 2, 4, 4};
    default:
        return {};
    }
}

inline void overlayRect(GlApi& gl, int x, int y, int width, int height, int framebufferHeight, Color color) {
    gl.Scissor(x, framebufferHeight - y - height, width, height);
    gl.ClearColor(color.red, color.green, color.blue, 1);
    gl.Clear(GL_COLOR_BUFFER_BIT);
}

inline void overlayText(GlApi& gl, int x, int y, std::string_view text, int height, Color color, int scale = 2) {
    for (char character : text) {
        const auto rows = glyph(character);
        for (int row = 0; row < 5; ++row) {
            for (int column = 0; column < 3; ++column) {
                if (rows[row] & (4U >> column)) {
                    overlayRect(gl, x + column * scale, y + row * scale, scale, scale, height, color);
                }
            }
        }
        x += 4 * scale;
    }
}

inline void drawPipelineOverlay(GlApi& gl, const std::array<GpuVertex, 3>& triangle, const Transform2D& transform, int selected, int width, int height, bool smoothColor, std::string_view probeStatus) {
    gl.Enable(GL_SCISSOR_TEST);
    const Color ink{0.77F, 0.86F, 0.94F};
    const Color background{0.035F, 0.055F, 0.09F};
    overlayRect(gl, 0, 0, width, 86, height, background);
    overlayRect(gl, 0, std::max(86, height - 56), width, 56, height, background);
    const int leftWidth = width / 2;
    overlayText(gl, 14, 12, "CPU - SOFTWARE RASTERIZER", height, ink);
    overlayText(gl, leftWidth + 14, 12, "GPU - GLSL / NDC EXPECTED", height, ink);
    const auto transformed = transformedTriangle(triangle, transform);
    for (int index = 0; index < 3; ++index) {
        char line[100]{};
        std::snprintf(line, sizeof(line), "%c %s NDC %.3f %.3f", 'A' + index, index == selected ? "SELECTED" : "        ", double(transformed[index].positionX), double(transformed[index].positionY));
        overlayText(gl, 14, 30 + index * 16, line, height, ink);
        overlayText(gl, leftWidth + 14, 30 + index * 16, line, height, ink);
        for (int panel = 0; panel < 2; ++panel) {
            const int panelWidth = panel == 0 ? leftWidth : width - leftWidth;
            const int origin = panel == 0 ? 0 : leftWidth;
            const Vec2 pixel = ndcToCpuScreen({transformed[index].positionX, transformed[index].positionY}, panelWidth, height);
            if (pixel.x < 0 || pixel.x >= panelWidth || pixel.y < 86 || pixel.y >= height - 56)
                continue;
            const auto& vertex = triangle[index];
            const Color color{vertex.red, vertex.green, vertex.blue};
            overlayRect(gl, origin + int(pixel.x) - 4, int(pixel.y) - 4, 9, 9, height, color);
            char label[2]{char('A' + index), '\0'};
            overlayText(gl, origin + int(pixel.x) + 8, int(pixel.y) - 4, label, height, ink);
        }
    }
    overlayText(gl, 14, height - 45, "DRAG VERTEX / 1 2 3 SELECT / I J K L MOVE / V COLOR / R RESET", height, ink);
    overlayText(gl, 14, height - 29, smoothColor ? "C SMOOTH / SPACE RUN / N STEP / P PROBE" : "C SOLID / SPACE RUN / N STEP / P PROBE", height, ink);
    overlayText(gl, 14, height - 13, probeStatus, height, {0.4F, 0.85F, 0.78F});
    gl.Disable(GL_SCISSOR_TEST);
}
} // namespace lab
#endif
