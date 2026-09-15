#pragma once

#include "gpu_program.hpp"
#include "gpu_storage.hpp"

namespace molecular {

struct Camera {
    float x = 6.4F;
    float y = 6.4F;
    float halfHeight = 7.2F;

    void reset(const Plan& plan) {
        x = plan.width * 0.5F;
        y = plan.height * 0.5F;
        halfHeight = std::max(plan.width, plan.height) * 0.6F;
    }

    void pan(float dx, float dy, int height) {
        const float worldPerPixel = 2.0F * halfHeight / static_cast<float>(std::max(1, height));
        x -= dx * worldPerPixel;
        y += dy * worldPerPixel;
    }

    void zoom(float mouseX, float mouseY, int width, int height, float wheel) {
        const float screenHeight = static_cast<float>(std::max(1, height));
        const float normalizedX = (2.0F * mouseX - static_cast<float>(width)) / screenHeight;
        const float normalizedY = 1.0F - 2.0F * mouseY / screenHeight;
        const float before = halfHeight;
        halfHeight = std::clamp(before * std::exp(-wheel * 0.12F), 0.5F, 10000.0F);
        x += normalizedX * (before - halfHeight);
        y += normalizedY * (before - halfHeight);
    }
};

// Bài 1 đã có hình: preview CPU chỉ vẽ 64 hạt đứng yên, không giả làm compute GPU.
inline void drawCpuPreview(lab::GlApi& gl, const Plan& plan, const Camera& camera, int width, int height) {
    const float scale = static_cast<float>(height) / (2.0F * camera.halfHeight);
    gl.Enable(GL_SCISSOR_TEST);
    gl.ClearColor(0.2F, 0.8F, 0.9F, 1.0F);
    for (std::uint32_t i = 0; i < std::min(plan.count, 64U); ++i) {
        const auto position = initialPosition(plan, i);
        const int x = static_cast<int>((position.x - camera.x) * scale + static_cast<float>(width) * 0.5F);
        const int y = static_cast<int>((position.y - camera.y) * scale + static_cast<float>(height) * 0.5F);
        gl.Scissor(x - 3, y - 3, 6, 6);
        gl.Clear(GL_COLOR_BUFFER_BIT);
    }
    gl.Disable(GL_SCISSOR_TEST);
}

class ParticleView {
    public:
    Camera camera{};
    std::uint32_t drawn = 0;

    void load(lab::GlApi& gl, const std::string& directory) {
        program_ = loadProgram(gl, directory, {{GL_VERTEX_SHADER, "particle.vert"}, {GL_FRAGMENT_SHADER, "particle.frag"}});
        stride_ = requireUniform(gl, program_, "uStride");
        center_ = requireUniform(gl, program_, "uCenter");
        halfExtent_ = requireUniform(gl, program_, "uHalfExtent");
        gl.GenVertexArrays(1, &vao_);
        if (vao_ == 0) {
            throw std::runtime_error("Cannot allocate a vertex array.");
        }
    }

    void draw(lab::GlApi& gl, const Storage& storage, int current, int width, int height) {
        const auto& bank = storage.banks.at(current);
        const std::uint32_t stride = std::max(1U, ceilDivide(storage.plan.count, 100000));
        drawn = ceilDivide(storage.plan.count, stride);
        gl.UseProgram(program_);
        bind(gl, 0, bank.positions);
        bind(gl, 1, bank.velocities);
        gl.Uniform1ui(stride_, stride);
        gl.Uniform2f(center_, camera.x, camera.y);
        const float aspect = static_cast<float>(width) / static_cast<float>(std::max(1, height));
        gl.Uniform2f(halfExtent_, camera.halfHeight * aspect, camera.halfHeight);
        gl.Enable(GL_PROGRAM_POINT_SIZE);
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
    GLuint program_ = 0;
    GLuint vao_ = 0;
    GLint stride_ = -1;
    GLint center_ = -1;
    GLint halfExtent_ = -1;
};

} // namespace molecular
