#pragma once
#include "chamber_camera.hpp"
#include "chamber_gpu.hpp"
#include "chamber_probe.hpp"
#include "chamber_program.hpp"

namespace chamber {

struct DrawVertex {
    Vec3 position{}, color{};
    float alpha{1.0F};
};

inline void appendRibbon(std::vector<DrawVertex>& vertices, Vec3 start, Vec3 end, Vec3 eye, Vec3 cameraRight, float halfWidth, Vec3 color, float alpha) {
    const Vec3 direction = end - start;
    if (length(direction) < 1.0e-6F)
        return;
    Vec3 side = normalized(cross(direction, eye - (start + end) * 0.5F));
    if (length(side) < 0.5F)
        side = cameraRight;
    side = side * halfWidth;
    for (Vec3 point : {start - side, end - side, start + side, start + side, end - side, end + side}) {
        vertices.push_back({point, color, alpha});
    }
}

class SceneRenderer {
    GLuint program_{};
    GLuint array_{};
    GLuint buffer_{};
    GLuint particleProgram_{};
    GLuint emptyArray_{};

    public:
    static std::size_t haloSampleCount(std::size_t count) {
        if (count < 10'000U)
            return count;
        return (count / 32U) * 2U + std::min(count % 32U, std::size_t{2});
    }

    bool initialize(GlApi& gl, const std::filesystem::path& directory, std::string& error) {
        program_ = buildProgram(gl, {{GL_VERTEX_SHADER, directory / "scene.vert"}, {GL_FRAGMENT_SHADER, directory / "scene.frag"}}, error);
        if (!program_)
            return false;
        gl.GenVertexArrays(1, &array_);
        gl.GenBuffers(1, &buffer_);
        gl.BindVertexArray(array_);
        gl.BindBuffer(GL_ARRAY_BUFFER, buffer_);
        gl.EnableVertexAttribArray(0);
        gl.VertexAttribPointer(0, 3, GL_FLOAT, GL_FALSE, sizeof(DrawVertex), nullptr);
        gl.EnableVertexAttribArray(1);
        gl.VertexAttribPointer(1, 3, GL_FLOAT, GL_FALSE, sizeof(DrawVertex), reinterpret_cast<void*>(offsetof(DrawVertex, color)));
        gl.EnableVertexAttribArray(2);
        gl.VertexAttribPointer(2, 1, GL_FLOAT, GL_FALSE, sizeof(DrawVertex), reinterpret_cast<void*>(offsetof(DrawVertex, alpha)));
#if LAB_CHECKPOINT >= 6
        particleProgram_ = buildProgram(gl, {{GL_VERTEX_SHADER, directory / "particle.vert"}, {GL_FRAGMENT_SHADER, directory / "particle.frag"}}, error);
        if (!particleProgram_)
            return false;
        gl.GenVertexArrays(1, &emptyArray_);
#endif
        return gl.GetError() == GL_NO_ERROR;
    }

    void drawVertices(GlApi& gl, const std::vector<DrawVertex>& vertices, GLenum primitive, const Mat4& matrix) {
        if (vertices.empty())
            return;
        gl.UseProgram(program_);
        gl.UniformMatrix4fv(gl.GetUniformLocation(program_, "uViewProjection"), 1, GL_FALSE, matrix.values.data());
        gl.BindVertexArray(array_);
        gl.BindBuffer(GL_ARRAY_BUFFER, buffer_);
        gl.BufferData(GL_ARRAY_BUFFER, static_cast<GLsizeiptr>(vertices.size() * sizeof(DrawVertex)), vertices.data(), GL_STREAM_DRAW);
        gl.DrawArrays(primitive, 0, static_cast<GLsizei>(vertices.size()));
    }

    void grid(GlApi& gl, const Mat4& matrix) {
        std::vector<DrawVertex> vertices{};
        const Vec3 dim{0.008F, 0.014F, 0.022F};
        for (int coordinate = -12; coordinate <= 12; ++coordinate) {
            const float value = static_cast<float>(coordinate);
            Vec3 color = dim;
            if (coordinate % 5 == 0)
                color = {0.02F, 0.035F, 0.05F};
            vertices.push_back({{value, -0.15F, -12}, color});
            vertices.push_back({{value, -0.15F, 12}, color});
            vertices.push_back({{-12, -0.15F, value}, color});
            vertices.push_back({{12, -0.15F, value}, color});
        }
        const std::array<Vec3, 3> ends{{{3, 0, 0}, {0, 3, 0}, {0, 0, 3}}};
        const std::array<Vec3, 3> colors{{{0.9F, 0.22F, 0.22F}, {0.3F, 0.9F, 0.52F}, {0.25F, 0.55F, 1.0F}}};
        for (std::size_t axis = 0; axis < ends.size(); ++axis) {
            vertices.push_back({{}, colors[axis]});
            vertices.push_back({ends[axis], colors[axis]});
        }
        // Two faint perpendicular reference grids make depth readable without introducing walls/forces.
        const Vec3 back{0.006F, 0.012F, 0.02F};
        for (int level = 0; level <= 8; ++level) {
            const float y = static_cast<float>(level);
            vertices.push_back({{-6, y, -6}, back});
            vertices.push_back({{-6, y, 6}, back});
            vertices.push_back({{-6, y, 6}, back});
            vertices.push_back({{6, y, 6}, back});
        }
        for (int coordinate = -6; coordinate <= 6; ++coordinate) {
            const float value = static_cast<float>(coordinate);
            vertices.push_back({{-6, 0, value}, back});
            vertices.push_back({{-6, 8, value}, back});
            vertices.push_back({{value, 0, 6}, back});
            vertices.push_back({{value, 8, 6}, back});
        }
        drawVertices(gl, vertices, GL_LINES, matrix);
    }

#if LAB_CHECKPOINT >= 2
    void previewParticles(GlApi& gl, const std::vector<Particle>& particles, const Mat4& matrix) {
        std::vector<DrawVertex> vertices{};
        vertices.reserve(particles.size());
        for (const Particle& p : particles) {
            Vec3 color{1.0F, 0.46F, 0.20F};
            if (p.positionCharge.w < 0.0F)
                color = {0.18F, 0.72F, 1.0F};
            vertices.push_back({position(p), color});
        }
        drawVertices(gl, vertices, GL_POINTS, matrix);
    }

    void fieldArrow(GlApi& gl, Vec3 origin, Vec3 vector, Vec3 color, const Mat4& matrix) {
        if (length(vector) < 1.0e-6F)
            return;
        const Vec3 direction = normalized(vector);
        Vec3 helper{0, 1, 0};
        if (std::abs(dot(direction, helper)) > 0.9F)
            helper = {1, 0, 0};
        const Vec3 side = normalized(cross(direction, helper)) * 0.15F;
        const Vec3 end = origin + vector * 0.8F;
        const Vec3 back = end - direction * 0.3F;
        const std::vector<DrawVertex> vertices{{origin, color}, {end, color}, {end, color}, {back + side, color}, {end, color}, {back - side, color}};
        drawVertices(gl, vertices, GL_LINES, matrix);
    }
#endif

#if LAB_CHECKPOINT >= 6
    std::size_t particles(GlApi& gl, const GpuState& state, const Mat4& matrix, Vec3 eye, bool bySpeed, float dpr) {
        if (!state.buffer)
            return 0;
        gl.UseProgram(particleProgram_);
        gl.UniformMatrix4fv(gl.GetUniformLocation(particleProgram_, "uViewProjection"), 1, GL_FALSE, matrix.values.data());
        gl.Uniform3f(gl.GetUniformLocation(particleProgram_, "uEye"), eye.x, eye.y, eye.z);
        gl.Uniform1i(gl.GetUniformLocation(particleProgram_, "uColorBySpeed"), bySpeed);
        gl.Uniform1f(gl.GetUniformLocation(particleProgram_, "uChargeScale"), state.settings.fields.chargeScale);
        gl.Uniform1ui(gl.GetUniformLocation(particleProgram_, "uCount"), static_cast<GLuint>(state.settings.count));
        std::array<GLint, 4> viewport{};
        gl.GetIntegerv(GL_VIEWPORT, viewport.data());
        const float projectionScale = length({matrix.values[1], matrix.values[5], matrix.values[9]});
        gl.Uniform1f(gl.GetUniformLocation(particleProgram_, "uPixelScale"), projectionScale * viewport[3]);
        gl.Uniform1f(gl.GetUniformLocation(particleProgram_, "uDpr"), dpr);
        float alpha = 0.12F;
        if (state.settings.count >= 10'000U)
            alpha = 0.02F;
        if (state.settings.count >= 1'000'000U)
            alpha = 0.0025F;
        if (state.settings.count >= 5'000'000U)
            alpha = 0.0005F;
        gl.Uniform1f(gl.GetUniformLocation(particleProgram_, "uOpacity"), alpha);
        gl.BindBufferBase(GL_SHADER_STORAGE_BUFFER, 0, state.buffer);
        gl.BindVertexArray(emptyArray_);
        // Pass 1: lit particle surfaces write depth, so the front beam really hides the back beam.
        gl.Disable(GL_BLEND);
        gl.DepthMask(GL_TRUE);
        gl.Uniform1i(gl.GetUniformLocation(particleProgram_, "uRenderPass"), 0);
        gl.Uniform1ui(gl.GetUniformLocation(particleProgram_, "uDrawStride"), 1);
        gl.DrawArrays(GL_POINTS, 0, static_cast<GLsizei>(state.settings.count));
        // Pass 2: subtle halo, still depth-tested; it cannot paint a hidden rear strand over the front.
        gl.Enable(GL_BLEND);
        gl.BlendFunc(GL_SRC_ALPHA, GL_ONE);
        gl.DepthMask(GL_FALSE);
        gl.Uniform1i(gl.GetUniformLocation(particleProgram_, "uRenderPass"), 1);
        std::size_t haloSlots = state.settings.count;
        if (state.settings.count >= 10'000U) {
            gl.Uniform1ui(gl.GetUniformLocation(particleProgram_, "uDrawStride"), 32);
            gl.Uniform1f(gl.GetUniformLocation(particleProgram_, "uOpacity"), alpha * 16.0F);
            haloSlots = (1U + (state.settings.count - 1U) / 32U) * 2U;
        }
        gl.DrawArrays(GL_POINTS, 0, static_cast<GLsizei>(haloSlots));
        gl.DepthMask(GL_TRUE);
        gl.Disable(GL_BLEND);
        return state.settings.count;
    }
#endif

#if LAB_CHECKPOINT >= 9
    void trails(GlApi& gl, const TrailHistory& history, std::size_t count, float chargeScale, const Camera& camera, const Mat4& matrix) {
        if (history.size < 2U)
            return;
        std::vector<DrawVertex> glow{}, core{};
        for (std::size_t track = 0; track < kTrailCount; ++track) {
            if (track < kTrailCount - 1U && track >= count)
                continue;
            Vec3 base{1.0F, 0.42F, 0.12F};
            bool negative = (track & 1U) != 0U;
            if (chargeScale < 0)
                negative = !negative;
            if (negative)
                base = {0.12F, 0.65F, 1.0F};
            if (chargeScale == 0)
                base = {0.65F, 0.7F, 0.75F};
            if (track == kTrailCount - 1U)
                base = {1.0F, 0.95F, 0.5F};
            for (std::size_t sample = 1; sample < history.size; ++sample) {
                const std::size_t start = (history.head + kTrailCapacity - history.size + sample - 1U) % kTrailCapacity;
                const std::size_t end = (start + 1U) % kTrailCapacity;
                const float fade = 0.15F + 0.85F * static_cast<float>(sample) / static_cast<float>(history.size);
                const Vec3 a = history.points[track][start];
                const Vec3 b = history.points[track][end];
                appendRibbon(glow, a, b, camera.eye(), camera.right(), 0.075F, base, fade * 0.025F);
                appendRibbon(core, a, b, camera.eye(), camera.right(), 0.012F, base, fade * 0.45F);
            }
        }
        gl.Enable(GL_BLEND);
        gl.BlendFunc(GL_SRC_ALPHA, GL_ONE);
        gl.DepthMask(GL_FALSE);
        drawVertices(gl, glow, GL_TRIANGLES, matrix);
        drawVertices(gl, core, GL_TRIANGLES, matrix);
        gl.DepthMask(GL_TRUE);
        gl.Disable(GL_BLEND);
    }

    void selectedMarker(GlApi& gl, Vec3 point, const Camera& camera, const Mat4& matrix) {
        const float size = std::clamp(length(camera.eye() - point) * 0.008F, 0.025F, 0.6F);
        const Vec3 right = camera.right() * size;
        const Vec3 up = camera.up() * size;
        const Vec3 yellow{1.0F, 0.95F, 0.5F};
        drawVertices(gl, {{point - right, yellow}, {point + right, yellow}, {point - up, yellow}, {point + up, yellow}}, GL_LINES, matrix);
    }
#endif

    void destroy(GlApi& gl) {
        if (buffer_)
            gl.DeleteBuffers(1, &buffer_);
        if (array_)
            gl.DeleteVertexArrays(1, &array_);
        if (emptyArray_)
            gl.DeleteVertexArrays(1, &emptyArray_);
        if (program_)
            gl.DeleteProgram(program_);
        if (particleProgram_)
            gl.DeleteProgram(particleProgram_);
        buffer_ = array_ = emptyArray_ = program_ = particleProgram_ = 0;
    }
};

} // namespace chamber
