#pragma once
#include "fluid/model.hpp"
#include "gpu/program.hpp"
#include "render/target.hpp"
#include <iostream>
#include <vector>

namespace water51 {
// The real GPU filter must preserve a flat field, an empty mask and a sharp depth jump.

#if LAB_CHECKPOINT >= 13
inline void waitFinite(Gl& gl);

inline void verifyWaterSurface(Gl& gl, const std::filesystem::path& root) {
    constexpr int size = 80;
    std::vector<float> depth(size * size), thickness(size * size), pixels(size * size * 2);
    for (int y = 8; y < size - 8; ++y) {
        for (int x = 8; x < size - 8; ++x) {
            const int index = x + y * size;
            depth[index] = 2;
            if (x >= size / 2)
                depth[index] = 4;
            thickness[index] = .1f;
            if ((x + y) % 2 != 0)
                thickness[index] = .3f;
        }
    }
    Target rawDepth(gl, size, size, false), rawThickness(gl, size, size, false);
    Target a(gl, size, size, false, true), b(gl, size, size, false, true);
    gl.BindTexture(GL_TEXTURE_2D, rawDepth.texture);
    gl.TexSubImage2D(GL_TEXTURE_2D, 0, 0, 0, size, size, GL_RED, GL_FLOAT, depth.data());
    gl.BindTexture(GL_TEXTURE_2D, rawThickness.texture);
    gl.TexSubImage2D(GL_TEXTURE_2D, 0, 0, 0, size, size, GL_RED, GL_FLOAT, thickness.data());
    Program filter(gl, root, {{GL_VERTEX_SHADER, "water/fullscreen.vert"}, {GL_FRAGMENT_SHADER, "water/filter.frag"}});
    GLuint vao = 0;
    gl.GenVertexArrays(1, &vao);
    try {
        gl.BindVertexArray(vao);
        gl.Viewport(0, 0, size, size);
        gl.Disable(GL_DEPTH_TEST);
        gl.Disable(GL_BLEND);
        filter.use();
        filter.setInt("source", 0);
        filter.setInt("rawThickness", 1);
        filter.setFloat("spacing", .05f);
        filter.setFloat("focal", 85.78f);
        rawThickness.sample(1);
        for (int pass = 0; pass < 3; ++pass) {
            if (pass == 0) {
                rawDepth.sample(0);
                a.bind();
            } else if (pass == 1) {
                a.sample(0);
                b.bind();
            } else {
                b.sample(0);
                a.bind();
            }
            filter.setInt("packedSource", static_cast<int>(pass > 0));
            filter.setInt("stepScale", 1 << pass);
            gl.DrawArrays(GL_TRIANGLES, 0, 3);
        }
        waitFinite(gl);
        gl.ReadPixels(0, 0, size, size, GL_RG, GL_FLOAT, pixels.data());
        gl.check("Verify reconstructed water surface");
        for (float value : pixels)
            if (!std::isfinite(value) || value < 0)
                throw std::runtime_error("Invalid surface filter result");
        for (int x : {24, 56}) {
            const int index = 2 * (x + 40 * size);
            float expectedDepth = 2;
            if (x >= 40)
                expectedDepth = 4;
            if (std::abs(pixels[index] - expectedDepth) > 1e-5f || std::abs(pixels[index + 1] - .2f) > 1e-5f)
                throw std::runtime_error("Surface filter failed flat-depth/checker-thickness oracle");
        }
        const int empty = 2 * (4 + 40 * size);
        if (pixels[empty] != 0 || pixels[empty + 1] != 0 || std::abs(pixels[2 * (39 + 40 * size)] - 2) > 1e-5f || std::abs(pixels[2 * (40 + 40 * size)] - 4) > 1e-5f)
            throw std::runtime_error("Surface reconstruction bridged an empty pixel or a depth discontinuity");
    } catch (...) {
        gl.BindFramebuffer(GL_FRAMEBUFFER, 0);
        gl.BindVertexArray(0);
        gl.DeleteVertexArrays(1, &vao);
        throw;
    }
    gl.BindFramebuffer(GL_FRAMEBUFFER, 0);
    gl.BindVertexArray(0);
    gl.DeleteVertexArrays(1, &vao);
    std::cout << "SURFACE FILTER PASS: RG packing, three 2D passes, flat depth, checker thickness, empty mask and sharp edge\n";
}
#endif
} // namespace water51
