#pragma once
#include "camera.hpp"
#include "render-timer.hpp"
#include "storage.hpp"

namespace water3 {
#if LAB_CHECKPOINT >= 1
// [snippet preview]
inline void drawPreview(lab::GlApi& gl, const Camera& camera, int width, int height, int viewportX = 0, int viewportY = 0) {
    // Bài đầu chỉ vẽ 64 hạt CPU bằng scaffold; chưa chạy solver GPU.
    gl.Enable(GL_SCISSOR_TEST);
    gl.ClearColor(0.25F, 0.7F, 0.95F, 1);
    const auto plan = makePlan(4);
    for (std::uint32_t i = 0; i < std::min(plan.count, 64U); ++i) {
        const auto p = cameraPoint(initialPosition(plan, i), camera);
        if (p.z >= -nearPlane) {
            continue;
        }
        const double scale = height * 0.5 * focalLength / -p.z;
        const int x = static_cast<int>(width / 2 + scale * p.x);
        const int y = static_cast<int>(height / 2 + scale * p.y);
        gl.Scissor(viewportX + x - 2, viewportY + y - 2, 4, 4);
        gl.Clear(GL_COLOR_BUFFER_BIT);
    }
    gl.Disable(GL_SCISSOR_TEST);
}

// [/snippet preview]
#endif
class View {
    public:
    Camera camera;
    std::uint32_t drawn = 0;
    int mode = 0;
    RenderTimer timer;

    void load(lab::GlApi& gl, const std::string& directory) {
        program_ = loadProgram(gl, directory, {{GL_VERTEX_SHADER, "particle.vert"}, {GL_FRAGMENT_SHADER, "particle.frag"}});
        scene_ = loadProgram(gl, directory, {{GL_VERTEX_SHADER, "scene.vert"}, {GL_FRAGMENT_SHADER, "scene.frag"}});
        stride_ = requireUniform(gl, program_, "uStride");
        camera_ = requireUniform(gl, program_, "uCamera");
        aspect_ = requireUniform(gl, program_, "uAspect");
        radius_ = requireUniform(gl, program_, "uRadius");
        height_ = requireUniform(gl, program_, "uHeight");
        mode_ = requireUniform(gl, program_, "uMode");
        sceneCamera_ = requireUniform(gl, scene_, "uCamera");
        sceneAspect_ = requireUniform(gl, scene_, "uAspect");
        geometry_ = requireUniform(gl, scene_, "uGeometry");
        gl.GenVertexArrays(1, &vao_);
        if (!vao_) {
            throw std::runtime_error("Cannot create VAO");
        }
    }

    void draw(lab::GlApi& gl, const Storage& storage, int current, int width, int height) {
        const bool measured = timer.begin(gl);
        // Mọi hạt đã mô phỏng đều được gửi để vẽ, không dùng stride/LOD ngầm.
        drawn = storage.plan.count;
        gl.Enable(GL_DEPTH_TEST);
        gl.BindVertexArray(vao_);
        gl.UseProgram(scene_);
        gl.Uniform3f(sceneCamera_, camera.yaw, camera.pitch, camera.zoom);
        gl.Uniform1f(sceneAspect_, static_cast<float>(width) / std::max(1, height));
        gl.Uniform1i(geometry_, 0);
        gl.DrawArrays(GL_TRIANGLES, 0, 6);
        gl.Uniform1i(geometry_, 1);
        gl.DrawArrays(GL_LINES, 0, 24);
        // [snippet draw-particles]
        gl.UseProgram(program_);
        bind(gl, 0, storage.positions[current]);
        bind(gl, 1, storage.density);
        bind(gl, 2, storage.velocities[current]);
        gl.Uniform1ui(stride_, 1);
        gl.Uniform3f(camera_, camera.yaw, camera.pitch, camera.zoom);
        gl.Uniform1f(aspect_, static_cast<float>(width) / std::max(1, height));
        gl.Uniform1f(radius_, static_cast<float>(0.65 * storage.plan.spacing));
        gl.Uniform1f(height_, static_cast<float>(height));
        gl.Uniform1i(mode_, mode);
        gl.Enable(GL_PROGRAM_POINT_SIZE);
        gl.DrawArrays(GL_POINTS, 0, static_cast<GLsizei>(drawn));
        // [/snippet draw-particles]
        gl.BindVertexArray(0);
        timer.end(gl, measured);
    }

    void destroy(lab::GlApi& gl) {
        timer.destroy(gl);
        gl.DeleteVertexArrays(1, &vao_);
        gl.DeleteProgram(program_);
        gl.DeleteProgram(scene_);
        vao_ = 0;
        program_ = 0;
        scene_ = 0;
    }

    private:
    GLuint program_ = 0, scene_ = 0, vao_ = 0;
    GLint stride_ = -1, camera_ = -1, aspect_ = -1;
    GLint radius_ = -1, height_ = -1, mode_ = -1;
    GLint sceneCamera_ = -1, sceneAspect_ = -1, geometry_ = -1;
};
} // namespace water3
