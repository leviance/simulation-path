#pragma once
#include "gl_api.hpp"
#include "pipeline.hpp"
#include "viewer-scene.hpp"
#include "viewer-timing.hpp"
#include <cctype>
#include <cstdio>
#include <string_view>

#if LAB_CHECKPOINT >= 9
namespace lab {
struct HudColor {
    float red{}, green{}, blue{};
};

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

inline void overlayRect(GlApi& gl, int x, int y, int width, int height, int framebufferHeight, HudColor color) {
    gl.Scissor(x, framebufferHeight - y - height, width, height);
    gl.ClearColor(color.red, color.green, color.blue, 1);
    gl.Clear(GL_COLOR_BUFFER_BIT);
}

inline void overlayText(GlApi& gl, int x, int y, std::string_view text, int height, HudColor color, int scale = 2) {
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

inline void drawViewerHud(GlApi& gl, const ViewerScene& scene, RendererKind backend, std::string name, std::size_t triangles, int width, int height, const ViewerFrameStats& stats, const ViewerGpuTimer& timer, bool vsync) {
    for (char& character : name)
        character = char(std::toupper(static_cast<unsigned char>(character)));
    gl.Enable(GL_SCISSOR_TEST);
    overlayRect(gl, 0, height - 100, width, 100, height, {0.035F, 0.055F, 0.09F});
    const HudColor ink{0.78F, 0.87F, 0.94F};
    char line[256]{};
    const char* backendName = "F2 GPU GEOMETRY";
    if (backend == RendererKind::cpu) {
        backendName = "F1 CPU GEOMETRY";
    }
    std::snprintf(line, sizeof(line), "%s / %s / %zu TRIANGLES", backendName, name.c_str(), triangles);
    overlayText(gl, 14, height - 87, line, height, {0.4F, 0.86F, 0.78F});
    const char* dragMode = "MODEL";
    if (scene.view.cameraDrag) {
        dragMode = "CAMERA";
    }
    const char* depthStatus = "OFF";
    if (scene.depthEnabled) {
        depthStatus = "ON";
    }
    const char* cullStatus = "OFF";
    if (scene.view.cullBackfaces) {
        cullStatus = "ON";
    }
    const char* lightStatus = "OFF";
    if (scene.lit) {
        lightStatus = "ON";
    }
    std::snprintf(line, sizeof(line), "DRAG %s / DIST %.2f / DEPTH %s / CULL %s / LIGHT %s", dragMode, scene.view.distance, depthStatus, cullStatus, lightStatus);
    overlayText(gl, 14, height - 69, line, height, ink);
    if (stats.frame == 0)
        std::snprintf(line, sizeof(line), "TIMING PENDING FIRST FRAME");
    else if (stats.cpuPathExecuted)
        std::snprintf(line, sizeof(line), "PREV F1 CPU MS: PREP %.3f PATH %.3f UPLOAD %.3f SUBMIT %.3f PRESENT %.3f", stats.prepareMs, stats.cpuRenderMs, stats.uploadMs, stats.submitMs, stats.presentMs);
    else
        std::snprintf(line, sizeof(line), "PREV F2 CPU MS: PREP %.3f PATH -- UPLOAD -- SUBMIT %.3f PRESENT %.3f", stats.prepareMs, stats.submitMs, stats.presentMs);
    overlayText(gl, 14, height - 51, line, height, ink);
    const char* vsyncStatus = "OFF";
    if (vsync) {
        vsyncStatus = "ON";
    }
    if (timer.hasSample) {
        std::snprintf(line, sizeof(line), "GPU DRAW %.4f MS FROM FRAME %llu / FRAME CPU WALL %.3f MS / VSYNC %s", timer.milliseconds, static_cast<unsigned long long>(timer.sampleFrame), stats.frameMs, vsyncStatus);
    } else {
        const char* timerStatus = "UNAVAILABLE";
        if (timer.supported) {
            timerStatus = "PENDING GPU FRAME";
        }
        std::snprintf(line, sizeof(line), "GPU TIME %s / FRAME CPU WALL %.3f MS / VSYNC %s", timerStatus, stats.frameMs, vsyncStatus);
    }
    overlayText(gl, 14, height - 33, line, height, ink);
    overlayText(gl, 14, height - 15, "1 ROCKET 2 SPHERE 3 CUBE / V DRAG MODE / RIGHT PAN / W WIRE / H NORMAL / G GRID / N STEP / R RESET", height, ink);
    gl.Disable(GL_SCISSOR_TEST);
}
} // namespace lab
#endif
