#pragma once

#include "sculpt_brush.hpp"
#include "sculpt_camera.hpp"
#include "sculpt_gl.hpp"
#include "sculpt_slice.hpp"
#include "sculpt_ui_geometry.hpp"
#include <optional>
#include <span>

namespace sculpt {

class GuideRenderer {
    public:
    explicit GuideRenderer(GlApi& gl)
        : gl_(gl), program_(gl, "sculpt_guide.vert", "sculpt_guide.frag") {
        gl_.GenVertexArrays(1, &vao_);
        gl_.GenBuffers(1, &buffer_);
        if (!vao_ || !buffer_) {
            gl_.DeleteBuffers(1, &buffer_);
            gl_.DeleteVertexArrays(1, &vao_);
            throw std::runtime_error("Could not allocate viewport guides");
        }
        gl_.BindVertexArray(vao_);
        gl_.BindBuffer(GL_ARRAY_BUFFER, buffer_);
        gl_.VertexAttribPointer(0, 3, GL_FLOAT, GL_FALSE, sizeof(LineVertex), nullptr);
        gl_.VertexAttribPointer(1, 3, GL_FLOAT, GL_FALSE, sizeof(LineVertex), reinterpret_cast<void*>(12));
        gl_.EnableVertexAttribArray(0);
        gl_.EnableVertexAttribArray(1);
    }

    ~GuideRenderer() {
        gl_.DeleteBuffers(1, &buffer_);
        gl_.DeleteVertexArrays(1, &vao_);
    }

    void draw(const Camera& camera, int width, int height, std::optional<Brush> preview, const GridSpec& grid, const SliceState& slice, std::span<const LineVertex> extra = {}, bool xrayExtra = false) {
        if (extra.size() > 1024)
            throw std::invalid_argument("Teaching guides exceed their fixed line budget");
        vertices_.clear();
        if (!xrayExtra)
            vertices_.insert(vertices_.end(), extra.begin(), extra.end());
        const Vec3 gridColor{0.13F, 0.20F, 0.25F};
        for (int index = -10; index <= 10; ++index) {
            const float coordinate = index * 0.15F;
            line({coordinate, -1.1F, -1.5F}, {coordinate, -1.1F, 1.5F}, gridColor);
            line({-1.5F, -1.1F, coordinate}, {1.5F, -1.1F, coordinate}, gridColor);
        }
        line({0, -1.1F, 0}, {1.6F, -1.1F, 0}, {0.65F, 0.25F, 0.22F});
        line({0, -1.1F, 0}, {0, -1.1F, 1.6F}, {0.22F, 0.42F, 0.7F});
        if (slice.enabled) {
            const std::array<std::array<float, 2>, 4> uv{{{0, 0}, {1, 0}, {1, 1}, {0, 1}}};
            std::array<Vec3, 4> corners;
            for (std::size_t index = 0; index < corners.size(); ++index) {
                auto sample = slice;
                sample.u = uv[index][0];
                sample.v = uv[index][1];
                corners[index] = sliceWorldPoint(grid, sample);
            }
            for (std::size_t edge = 0; edge < corners.size(); ++edge)
                line(corners[edge], corners[(edge + 1) % 4], {0.2F, 0.58F, 0.6F});
            const auto selected = sliceWorldPoint(grid, slice);
            const float marker = grid.spacing() * 1.5F;
            line(selected - Vec3{marker, 0, 0}, selected + Vec3{marker, 0, 0}, {0.95F, 0.83F, 0.4F});
            line(selected - Vec3{0, marker, 0}, selected + Vec3{0, marker, 0}, {0.95F, 0.83F, 0.4F});
            line(selected - Vec3{0, 0, marker}, selected + Vec3{0, 0, marker}, {0.95F, 0.83F, 0.4F});
        }
        if (preview)
            brush(*preview);
        gl_.Enable(GL_DEPTH_TEST);
        program_.use();
        vector("cameraEye", camera.eye());
        vector("cameraRight", camera.right());
        vector("cameraUp", camera.up());
        vector("cameraForward", camera.forward());
        gl_.Uniform1f(program_.uniform("tanHalfFov"), camera.tanHalfFov);
        gl_.Uniform1f(program_.uniform("aspect"), static_cast<float>(width) / height);
        gl_.BindVertexArray(vao_);
        gl_.BindBuffer(GL_ARRAY_BUFFER, buffer_);
        gl_.BufferData(GL_ARRAY_BUFFER, static_cast<GLsizeiptr>(vertices_.size() * sizeof(LineVertex)), vertices_.data(), GL_DYNAMIC_DRAW);
        gl_.DrawArrays(GL_LINES, 0, static_cast<GLsizei>(vertices_.size()));
        if (xrayExtra && !extra.empty()) {
            // Teaching-only guides: expose all four scalar samples, not extra surface geometry.
            gl_.Disable(GL_DEPTH_TEST);
            gl_.BufferData(GL_ARRAY_BUFFER, static_cast<GLsizeiptr>(extra.size_bytes()), extra.data(), GL_DYNAMIC_DRAW);
            gl_.DrawArrays(GL_LINES, 0, static_cast<GLsizei>(extra.size()));
            gl_.Enable(GL_DEPTH_TEST);
        }
    }

    private:
    void vector(const char* name, Vec3 value) {
        gl_.Uniform3f(program_.uniform(name), value.x, value.y, value.z);
    }

    void line(Vec3 a, Vec3 b, Vec3 color) {
        vertices_.push_back(lineVertex(a, color));
        vertices_.push_back(lineVertex(b, color));
    }

    void brush(const Brush& brush) {
        Vec3 color{0.35F, 0.95F, 0.75F};
        if (brush.mode == BrushMode::subtract)
            color = {1.0F, 0.44F, 0.25F};
        for (int axis = 0; axis < 3; ++axis) {
            for (int segment = 0; segment < 64; ++segment) {
                const float a = segment * 6.28318530718F / 64;
                const float b = (segment + 1) * 6.28318530718F / 64;
                Vec3 first{0, std::cos(a), std::sin(a)};
                Vec3 second{0, std::cos(b), std::sin(b)};
                if (axis == 1) {
                    first = {std::cos(a), 0, std::sin(a)};
                    second = {std::cos(b), 0, std::sin(b)};
                } else if (axis == 2) {
                    first = {std::cos(a), std::sin(a), 0};
                    second = {std::cos(b), std::sin(b), 0};
                }
                line(brush.center + first * brush.radius, brush.center + second * brush.radius, color);
            }
        }
        const float crossSize = brush.radius * 0.12F;
        line(brush.center - Vec3{crossSize, 0, 0}, brush.center + Vec3{crossSize, 0, 0}, color);
        line(brush.center - Vec3{0, crossSize, 0}, brush.center + Vec3{0, crossSize, 0}, color);
    }

    GlApi& gl_;
    Program program_;
    GLuint vao_{}, buffer_{};
    std::vector<LineVertex> vertices_;
};

} // namespace sculpt
