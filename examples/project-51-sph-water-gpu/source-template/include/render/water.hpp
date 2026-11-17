#pragma once
#include "app/camera.hpp"
#include "gpu/engine.hpp"
#include "render/target.hpp"
#include <memory>

namespace water51 {
enum class View {
    Water,
    Particles,
    Density,
    Speed
};

class WaterRenderer {
    Gl& gl_;
    Program sphere_;
    Program filter_;
    Program composite_;
    GLuint vao_ = 0;
    int width_ = 0;
    int height_ = 0;
    std::unique_ptr<Target> depth_, thickness_, scratch_, smooth_;

    void setup(const Program& program, const Camera& camera, const GpuMeta& meta) {
        program.use();
        camera.uniforms(program, width_, height_);
        program.setVec4("obstacle", {meta.body.x, meta.body.y, meta.body.z}, meta.body.w);
    }

    public:
    WaterRenderer(Gl& gl, const std::filesystem::path& root)
        : gl_(gl), sphere_(gl, root, {{GL_VERTEX_SHADER, "water/sphere.vert"}, {GL_FRAGMENT_SHADER, "water/sphere.frag"}}), filter_(gl, root, {{GL_VERTEX_SHADER, "water/fullscreen.vert"}, {GL_FRAGMENT_SHADER, "water/filter.frag"}}), composite_(gl, root, {{GL_VERTEX_SHADER, "water/fullscreen.vert"}, {GL_FRAGMENT_SHADER, "water/composite.frag"}}) {
        gl_.GenVertexArrays(1, &vao_);
    }

    ~WaterRenderer() {
        gl_.DeleteVertexArrays(1, &vao_);
    }

    void resize(int width, int height) {
        const double scale = std::min({1.0, 1024.0 / width, 768.0 / height});
        width = std::max(80, static_cast<int>(width * scale));
        height = std::max(80, static_cast<int>(height * scale));
        if (width == width_ && height == height_)
            return;
        width_ = width;
        height_ = height;
        depth_ = std::make_unique<Target>(gl_, width, height, true);
        thickness_ = std::make_unique<Target>(gl_, width, height, false);
        scratch_ = std::make_unique<Target>(gl_, width, height, false, true);
        smooth_ = std::make_unique<Target>(gl_, width, height, false, true);
    }

    // [snippet surface-passes]
    void draw(Engine& engine, Camera camera, int outputWidth, int outputHeight, View view) {
        resize(outputWidth, outputHeight);
        camera.update(height_);
        gl_.BindVertexArray(vao_);
        gl_.Viewport(0, 0, width_, height_);
        auto& s = engine.storage();
        const int bank = engine.bank();
        s.banks[bank].position.bind(0);
        s.banks[bank].velocity.bind(1);
        s.banks[bank].field.bind(2);
        depth_->bind();
        gl_.Disable(GL_BLEND);
        gl_.Enable(GL_DEPTH_TEST);
        gl_.DepthMask(GL_TRUE);
        const float zero[4]{};
        gl_.ClearBufferfv(GL_COLOR, 0, zero);
        gl_.Clear(GL_DEPTH_BUFFER_BIT);
        setup(sphere_, camera, engine.meta());
        sphere_.setFloat("radius", 1.15f * s.model.spacing);
        sphere_.setInt("pass", 0);
        gl_.DrawArraysInstanced(GL_TRIANGLES, 0, 6, static_cast<GLsizei>(s.model.count));
        thickness_->bind();
        gl_.ClearBufferfv(GL_COLOR, 0, zero);
        gl_.Disable(GL_DEPTH_TEST);
        gl_.Enable(GL_BLEND);
        gl_.BlendEquation(GL_FUNC_ADD);
        gl_.BlendFunc(GL_ONE, GL_ONE);
        sphere_.setInt("pass", 1);
        constexpr double sphereVolume = 4.0 * std::numbers::pi / 3;
        sphere_.setFloat("volumeRatio", static_cast<float>(1 / (sphereVolume * 1.15 * 1.15 * 1.15)));
        gl_.DrawArraysInstanced(GL_TRIANGLES, 0, 6, static_cast<GLsizei>(s.model.count));
        gl_.Disable(GL_BLEND);
        filter_.use();
        filter_.setInt("source", 0);
        filter_.setInt("rawThickness", 1);
        filter_.setFloat("spacing", s.model.spacing);
        filter_.setFloat("focal", static_cast<float>(camera.focal));
        thickness_->sample(1);
#if LAB_CHECKPOINT >= 9
        const int filterPasses = 3;
#else
        const int filterPasses = 1;
#endif
        for (int pass = 0; pass < filterPasses; ++pass) {
            if (pass == 0) {
                depth_->sample(0);
                smooth_->bind();
            } else if (pass == 1) {
                smooth_->sample(0);
                scratch_->bind();
            } else {
                scratch_->sample(0);
                smooth_->bind();
            }
            filter_.setInt("packedSource", static_cast<int>(pass > 0));
            filter_.setInt("stepScale", 1 << pass);
            gl_.DrawArrays(GL_TRIANGLES, 0, 3);
        }
        gl_.BindFramebuffer(GL_FRAMEBUFFER, 0);
        gl_.Viewport(0, 0, outputWidth, outputHeight);
        // The output camera uses output pixels while texture coordinates use the scaled target.
        camera.update(outputHeight);
        setup(composite_, camera, engine.meta());
        camera.uniforms(composite_, outputWidth, outputHeight);
        smooth_->sample(0);
        composite_.setInt("surfaceMap", 0);
        composite_.setInt("fluidVisible", static_cast<int>(view == View::Water));
        gl_.DrawArrays(GL_TRIANGLES, 0, 3);
        if (view != View::Water) {
            gl_.Clear(GL_DEPTH_BUFFER_BIT);
            gl_.Enable(GL_DEPTH_TEST);
            setup(sphere_, camera, engine.meta());
            camera.uniforms(sphere_, outputWidth, outputHeight);
            sphere_.setFloat("radius", .42f * s.model.spacing);
            sphere_.setInt("pass", static_cast<int>(view) + 1);
            gl_.DrawArraysInstanced(GL_TRIANGLES, 0, 6, static_cast<GLsizei>(s.model.count));
        }
        gl_.Disable(GL_DEPTH_TEST);
        gl_.check("Render water surface");
    }

    // [/snippet surface-passes]
};
} // namespace water51
