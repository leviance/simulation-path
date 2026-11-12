#pragma once
#include "bulb_gpu.hpp"
#include "bulb_overlay.hpp"

namespace bulb {

class OverlayRenderer {
    public:
    explicit OverlayRenderer(GlApi &gl)
        : gl_(gl), program_(gl, "overlay.vert", "overlay.frag") {
        gl_.GenVertexArrays(1, &vao_);
        gl_.GenBuffers(1, &vbo_);
        if (!vao_ || !vbo_)
            throw std::runtime_error("UI allocation failed");
        gl_.BindVertexArray(vao_);
        gl_.BindBuffer(GL_ARRAY_BUFFER, vbo_);
        gl_.VertexAttribPointer(0, 3, GL_FLOAT, GL_FALSE, sizeof(LineVertex), nullptr);
        gl_.EnableVertexAttribArray(0);
        gl_.VertexAttribPointer(1, 3, GL_FLOAT, GL_FALSE, sizeof(LineVertex), reinterpret_cast<void *>(3 * sizeof(float)));
        gl_.EnableVertexAttribArray(1);
    }
    ~OverlayRenderer() {
        gl_.DeleteBuffers(1, &vbo_);
        gl_.DeleteVertexArrays(1, &vao_);
    }
    void draw(const Overlay &overlay, int width, int height) {
        gl_.Viewport(0, 0, width, height);
        gl_.Disable(GL_DEPTH_TEST);
        program_.use();
        gl_.BindVertexArray(vao_);
        gl_.BindBuffer(GL_ARRAY_BUFFER, vbo_);
        const auto &vertices = overlay.vertices();
        if (vertices.size() > 250000)
            throw std::runtime_error("UI geometry exceeds its bounded scaffold budget");
        gl_.BufferData(GL_ARRAY_BUFFER, vertices.size() * sizeof(LineVertex), vertices.data(), GL_DYNAMIC_DRAW);
        gl_.DrawArrays(GL_TRIANGLES, 0, static_cast<GLsizei>(vertices.size()));
    }

    private:
    GlApi &gl_;
    Program program_;
    GLuint vao_{}, vbo_{};
};

} // namespace bulb
