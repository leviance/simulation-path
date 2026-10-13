#pragma once
#include "storage.hpp"

namespace water3 {
// Orthographic orbit is deliberately separate from the physical solver.
struct Camera {
    float yaw = 0.6F;
    float pitch = -0.3F;
    float zoom = 1;
};

inline Vec3 cameraPoint(Vec3 p, const Camera& camera) {
    p = subtract(p, {0.5, 0.5, 0.5});
    const double x = std::cos(camera.yaw) * p.x + std::sin(camera.yaw) * p.z;
    const double depth = -std::sin(camera.yaw) * p.x + std::cos(camera.yaw) * p.z;
    return {x, std::cos(camera.pitch) * p.y - std::sin(camera.pitch) * depth, std::sin(camera.pitch) * p.y + std::cos(camera.pitch) * depth};
}
#if LAB_CHECKPOINT >= 1
inline void drawPreview(lab::GlApi& gl, const Camera& camera, int width, int height) {
    // First checkpoint shows 64 representative CPU points, not a hidden GPU simulation.
    gl.Enable(GL_SCISSOR_TEST);
    gl.ClearColor(0.25F, 0.7F, 0.95F, 1);
    const auto plan = makePlan(4);
    for (std::uint32_t i = 0; i < std::min(plan.count, 64U); ++i) {
        const auto p = cameraPoint(initialPosition(plan, i), camera);
        const double scale = height * 0.75 * camera.zoom;
        const int x = static_cast<int>(width / 2 + scale * p.x);
        const int y = static_cast<int>(height / 2 + scale * p.y);
        gl.Scissor(x - 2, y - 2, 4, 4);
        gl.Clear(GL_COLOR_BUFFER_BIT);
    }
    gl.Disable(GL_SCISSOR_TEST);
}
#endif
class View {
    public:
    Camera camera;
    std::uint32_t drawn = 0;

    void load(lab::GlApi& gl, const std::string& directory) {
        program_ = loadProgram(gl, directory, {{GL_VERTEX_SHADER, "particle.vert"}, {GL_FRAGMENT_SHADER, "particle.frag"}});
        stride_ = requireUniform(gl, program_, "uStride");
        camera_ = requireUniform(gl, program_, "uCamera");
        aspect_ = requireUniform(gl, program_, "uAspect");
        gl.GenVertexArrays(1, &vao_);
        if (!vao_) {
            throw std::runtime_error("Cannot create VAO");
        }
    }

    void draw(lab::GlApi& gl, const Storage& storage, int current, int width, int height) {
        const auto stride = std::max(1U, ceilDivide(storage.plan.count, 100000));
        drawn = ceilDivide(storage.plan.count, stride);
        gl.UseProgram(program_);
        bind(gl, 0, storage.positions[current]);
        bind(gl, 1, storage.density);
        gl.Uniform1ui(stride_, stride);
        gl.Uniform3f(camera_, camera.yaw, camera.pitch, camera.zoom);
        gl.Uniform1f(aspect_, static_cast<float>(width) / std::max(1, height));
        gl.Enable(GL_PROGRAM_POINT_SIZE);
        gl.Enable(GL_DEPTH_TEST);
        gl.BindVertexArray(vao_);
        gl.DrawArrays(GL_POINTS, 0, static_cast<GLsizei>(drawn));
        gl.BindVertexArray(0);
    }

    void destroy(lab::GlApi& gl) {
        gl.DeleteVertexArrays(1, &vao_);
        gl.DeleteProgram(program_);
        vao_ = 0;
        program_ = 0;
    }

    private:
    GLuint program_ = 0, vao_ = 0;
    GLint stride_ = -1, camera_ = -1, aspect_ = -1;
};
} // namespace water3
