#pragma once

#include "morph_camera.hpp"
#include "morph_gpu.hpp"
#include "morph_ui_geometry.hpp"

namespace morph {

struct RenderPoint {
    Vec4 position;
    Vec4 path;
};
struct View {
#if LAB_CHECKPOINT >= 4
    Matching matching{Matching::spatial};
#else
    Matching matching{Matching::random};
#endif
#if LAB_CHECKPOINT >= 5
    Easing easing{Easing::smooth};
    Path path{Path::flow};
#else
    Easing easing{Easing::linear};
    Path path{Path::straight};
#endif
    bool heatmap{};
    bool paths{};
    bool grid{true};
    float pointScale{0.018F};
};

class Renderer {
    public:
    explicit Renderer(GlApi &gl)
        : gl_(gl), points_(gl, "particles.vert", "particles.frag"), lines_(gl, "lines.vert", "lines.frag") {
        gl_.GenVertexArrays(1, &pointsVao_);
        gl_.GenVertexArrays(1, &lineVao_);
        gl_.GenBuffers(1, &pointsBuffer_);
        gl_.GenBuffers(1, &lineBuffer_);
        if (!pointsVao_ || !lineVao_ || !pointsBuffer_ || !lineBuffer_)
            throw std::runtime_error("Could not allocate renderer objects");
#if LAB_CHECKPOINT < 6
        gl_.BindVertexArray(pointsVao_);
        gl_.BindBuffer(GL_ARRAY_BUFFER, pointsBuffer_);
        gl_.VertexAttribPointer(0, 4, GL_FLOAT, GL_FALSE, sizeof(RenderPoint), nullptr);
        gl_.VertexAttribPointer(1, 4, GL_FLOAT, GL_FALSE, sizeof(RenderPoint), reinterpret_cast<void *>(sizeof(Vec4)));
        gl_.EnableVertexAttribArray(0);
        gl_.EnableVertexAttribArray(1);
#endif
        gl_.BindVertexArray(lineVao_);
        gl_.BindBuffer(GL_ARRAY_BUFFER, lineBuffer_);
        gl_.VertexAttribPointer(0, 3, GL_FLOAT, GL_FALSE, sizeof(LineVertex), nullptr);
        gl_.VertexAttribPointer(1, 3, GL_FLOAT, GL_FALSE, sizeof(LineVertex), reinterpret_cast<void *>(sizeof(std::array<float, 3>)));
        gl_.EnableVertexAttribArray(0);
        gl_.EnableVertexAttribArray(1);
        gl_.Enable(GL_PROGRAM_POINT_SIZE);
    }
    ~Renderer() {
        gl_.DeleteBuffers(1, &pointsBuffer_);
        gl_.DeleteBuffers(1, &lineBuffer_);
        gl_.DeleteVertexArrays(1, &pointsVao_);
        gl_.DeleteVertexArrays(1, &lineVao_);
    }
    void uploadCpu(const Prepared &data, double t, const View &view) {
        std::vector<RenderPoint> points;
        points.reserve(data.settings.count);
        for (std::uint32_t id = 0; id < data.settings.count; ++id) {
            const Vec4 position = pack(positionAt(data, id, t, view.matching, view.easing, view.path), static_cast<float>(id));
            points.push_back({position, data.path[id]});
        }
        gl_.BindBuffer(GL_ARRAY_BUFFER, pointsBuffer_);
        gl_.BufferData(GL_ARRAY_BUFFER, static_cast<GLsizeiptr>(points.size() * sizeof(RenderPoint)), points.data(), GL_DYNAMIC_DRAW);
    }
    void clear(int width, int height) {
        gl_.Viewport(0, 0, width, height);
        gl_.ClearColor(0.018F, 0.027F, 0.049F, 1.0F);
        gl_.Clear(GL_COLOR_BUFFER_BIT | GL_DEPTH_BUFFER_BIT);
    }
    void scene(const Prepared *data, const GpuParticles *gpu, double t, const View &view, const OrbitCamera &camera, int width, int height) {
        drawn_ = 0;
        gl_.Viewport(0, 0, width, height);
        gl_.Enable(GL_DEPTH_TEST);
        gl_.Disable(GL_BLEND);
        const Mat4 transform = camera.viewProjection(static_cast<double>(width) / std::max(1, height));
        std::vector<LineVertex> guides;
        if (view.grid) {
            for (int step = -16; step <= 16; ++step) {
                const double value = step * 0.4;
                Vec3 tint{0.070, 0.105, 0.14};
                if (step == 0)
                    tint = {0.12, 0.22, 0.26};
                guides.push_back(lineVertex({value, -2.15, -6.4}, tint));
                guides.push_back(lineVertex({value, -2.15, 6.4}, tint));
                guides.push_back(lineVertex({-6.4, -2.15, value}, tint));
                guides.push_back(lineVertex({6.4, -2.15, value}, tint));
            }
        }
#if LAB_CHECKPOINT >= 9
        if (data && view.paths) {
            const std::uint32_t subset = std::min(32U, data->settings.count);
            for (std::uint32_t item = 0; item < subset; ++item) {
                std::uint32_t id = 0;
                if (subset > 1)
                    id = static_cast<std::uint32_t>(static_cast<std::uint64_t>(item) * (data->settings.count - 1) / (subset - 1));
                for (int segment = 0; segment < 16; ++segment) {
                    guides.push_back(lineVertex(positionAt(*data, id, segment / 16.0, view.matching, view.easing, view.path), {0.12, 0.31, 0.37}));
                    guides.push_back(lineVertex(positionAt(*data, id, (segment + 1) / 16.0, view.matching, view.easing, view.path), {0.38, 0.28, 0.15}));
                }
            }
        }
#endif
        drawLines(guides, transform, GL_LINES);
        if (!data)
            return;
        points_.use();
        gl_.UniformMatrix4fv(points_.uniform("transform"), 1, GL_FALSE, transform.data());
        gl_.Uniform1f(points_.uniform("viewportHeight"), static_cast<float>(height));
        gl_.Uniform1f(points_.uniform("pointScale"), view.pointScale);
        gl_.Uniform1f(points_.uniform("phase"), static_cast<float>(t));
        gl_.Uniform1i(points_.uniform("heatmap"), static_cast<int>(view.heatmap));
#if LAB_CHECKPOINT >= 6
        if (!gpu)
            throw std::logic_error("SSBO renderer has no ACTIVE generation");
        gpu->bind();
#else
        (void)gpu;
#endif
        gl_.BindVertexArray(pointsVao_);
        gl_.DrawArrays(GL_POINTS, 0, static_cast<GLsizei>(data->settings.count));
        drawn_ = data->settings.count;
    }
    void overlay(const std::vector<LineVertex> &vertices, int width, int height) {
        gl_.Viewport(0, 0, width, height);
        gl_.Disable(GL_DEPTH_TEST);
        constexpr Mat4 identity{1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1};
        drawLines(vertices, identity, GL_TRIANGLES);
    }
    std::uint32_t drawn() const {
        return drawn_;
    }

    private:
    void drawLines(const std::vector<LineVertex> &vertices, const Mat4 &transform, GLenum primitive) {
        if (vertices.empty())
            return;
        lines_.use();
        gl_.UniformMatrix4fv(lines_.uniform("transform"), 1, GL_FALSE, transform.data());
        gl_.BindVertexArray(lineVao_);
        gl_.BindBuffer(GL_ARRAY_BUFFER, lineBuffer_);
        gl_.BufferData(GL_ARRAY_BUFFER, static_cast<GLsizeiptr>(vertices.size() * sizeof(LineVertex)), vertices.data(), GL_DYNAMIC_DRAW);
        gl_.DrawArrays(primitive, 0, static_cast<GLsizei>(vertices.size()));
    }
    GlApi &gl_;
    Program points_;
    Program lines_;
    GLuint pointsVao_{};
    GLuint lineVao_{};
    GLuint pointsBuffer_{};
    GLuint lineBuffer_{};
    std::uint32_t drawn_{};
};

} // namespace morph
