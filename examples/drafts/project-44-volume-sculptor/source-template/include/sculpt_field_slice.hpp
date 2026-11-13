#pragma once

#include "sculpt_gpu_buffer.hpp"
#include "sculpt_overlay.hpp"
#include "sculpt_slice.hpp"

namespace sculpt {

// Caller must first finish the field's GPU ticket. This is a numeric probe, not extraction.
inline float readSliceValue(const GpuBuffer& field, const GridSpec& grid, const SliceState& slice) {
    if (field.bytes() != grid.sampleCount() * sizeof(float) + guardBytes)
        throw std::invalid_argument("Slice probe needs the exact scalar allocation");
    const auto coordinate = sliceGridCoordinate(grid, slice);
    const int x = std::min(static_cast<int>(std::floor(coordinate.x)), grid.samples - 2);
    const int y = std::min(static_cast<int>(std::floor(coordinate.y)), grid.samples - 2);
    const int z = std::min(static_cast<int>(std::floor(coordinate.z)), grid.samples - 2);
    const Vec3 t = coordinate - Vec3{static_cast<float>(x), static_cast<float>(y), static_cast<float>(z)};
    std::array<float, 4> rows{};
    for (int dz = 0; dz < 2; ++dz) {
        for (int dy = 0; dy < 2; ++dy) {
            std::array<float, 2> values{};
            field.read(grid.sampleIndex(x, y + dy, z + dz) * sizeof(float), std::as_writable_bytes(std::span(values)));
            rows[dz * 2 + dy] = interpolate(values[0], values[1], t.x);
        }
    }
    const float value = interpolate(interpolate(rows[0], rows[1], t.y), interpolate(rows[2], rows[3], t.y), t.z);
    if (!std::isfinite(value))
        throw std::runtime_error("Numeric field probe is not finite");
    return value;
}

// Supplied presentation: the fragment shader samples the same SSBO used by compute.
class FieldSliceRenderer {
    public:
    explicit FieldSliceRenderer(GlApi& gl)
        : gl_(gl), program_(gl, "sculpt_slice.vert", "sculpt_slice.frag") {
        gl_.GenVertexArrays(1, &vao_);
        if (!vao_)
            throw std::runtime_error("Could not allocate slice VAO");
    }

    ~FieldSliceRenderer() {
        gl_.DeleteVertexArrays(1, &vao_);
    }

    FieldSliceRenderer(const FieldSliceRenderer&) = delete;
    FieldSliceRenderer& operator=(const FieldSliceRenderer&) = delete;

    void draw(const GpuBuffer& field, const GridSpec& grid, float isovalue, const SliceState& slice, const UiRect& rectangle, int width, int height, int logicalWidth, int logicalHeight) {
        if (!slice.enabled || width <= 0 || height <= 0 || logicalWidth <= 0 || logicalHeight <= 0 || rectangle.width <= 0 || rectangle.height <= 0)
            return;
        slice.validate(grid);
        const float sx = static_cast<float>(width) / logicalWidth;
        const float sy = static_cast<float>(height) / logicalHeight;
        gl_.Viewport(static_cast<int>(rectangle.x * sx), static_cast<int>((logicalHeight - rectangle.y - rectangle.height) * sy), static_cast<int>(rectangle.width * sx), static_cast<int>(rectangle.height * sy));
        gl_.Disable(GL_DEPTH_TEST);
        program_.use();
        gl_.Uniform1i(program_.uniform("gridN"), grid.samples);
        gl_.Uniform1i(program_.uniform("sliceAxis"), slice.axis);
        gl_.Uniform1i(program_.uniform("sliceLayer"), slice.layer);
        gl_.Uniform1f(program_.uniform("isovalue"), isovalue);
        gl_.Uniform2f(program_.uniform("probeUV"), slice.u, slice.v);
        field.bind(0);
        gl_.BindVertexArray(vao_);
        gl_.DrawArrays(GL_TRIANGLES, 0, 6);
    }

    private:
    GlApi& gl_;
    Program program_;
    GLuint vao_{};
};

} // namespace sculpt
