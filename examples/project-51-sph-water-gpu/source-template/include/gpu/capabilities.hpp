#pragma once
#include "fluid/model.hpp"
#include "gpu/api.hpp"
#include <iostream>

namespace water51 {
// Reject unsupported drivers and peak allocations before replacing the committed state.

struct Capabilities {
    GLint64 maximumBlock = 0;
    GLint groups = 0;
    GLint bindings = 0;
    GLint invocations = 0;

    explicit Capabilities(Gl& gl) {
        GLint major = 0;
        GLint minor = 0;
        gl.GetIntegerv(GL_MAJOR_VERSION, &major);
        gl.GetIntegerv(GL_MINOR_VERSION, &minor);
        if (major < 4 || (major == 4 && minor < 3))
            throw std::runtime_error("OpenGL 4.3 compute is required");
        gl.GetInteger64v(GL_MAX_SHADER_STORAGE_BLOCK_SIZE, &maximumBlock);
        gl.GetIntegeri_v(GL_MAX_COMPUTE_WORK_GROUP_COUNT, 0, &groups);
        gl.GetIntegerv(GL_MAX_SHADER_STORAGE_BUFFER_BINDINGS, &bindings);
        gl.GetIntegerv(GL_MAX_COMPUTE_WORK_GROUP_INVOCATIONS, &invocations);
        if (bindings < 8 || invocations < 256)
            throw std::runtime_error("Insufficient compute limits");
        GLint computeBlocks = 0, vertexBlocks = 0, localX = 0, timestampBits = 0;
        gl.GetIntegerv(GL_MAX_COMPUTE_SHADER_STORAGE_BLOCKS, &computeBlocks);
        gl.GetIntegerv(GL_MAX_VERTEX_SHADER_STORAGE_BLOCKS, &vertexBlocks);
        gl.GetIntegeri_v(GL_MAX_COMPUTE_WORK_GROUP_SIZE, 0, &localX);
        gl.GetQueryiv(GL_TIMESTAMP, GL_QUERY_COUNTER_BITS, &timestampBits);
        if (computeBlocks < 8 || vertexBlocks < 3 || localX < 256 || timestampBits == 0)
            throw std::runtime_error("Need 8 compute/3 vertex SSBO blocks, local X=256 and GPU timestamps");
        std::cout << "GPU: " << reinterpret_cast<const char*>(gl.GetString(GL_RENDERER)) << " | " << reinterpret_cast<const char*>(gl.GetString(GL_VERSION)) << '\n';
    }

    // [snippet limits]
    void validateModel(const Model& model, std::size_t previousBytes = 0) const {
        const auto largest = std::max<std::size_t>(model.count * sizeof(Float4), (model.cellCount + 1) * sizeof(std::uint32_t));
        if (largest > static_cast<std::size_t>(maximumBlock))
            throw std::length_error("SSBO block limit exceeded");
        const std::uint32_t dispatch = std::max((model.count + 127) / 128, (model.cellCount + 255) / 256);
        if (dispatch > static_cast<std::uint32_t>(groups))
            throw std::length_error("Workgroup limit exceeded");
        if (plannedBytes(model) > bufferBudget || previousBytes > bufferBudget - plannedBytes(model))
            throw std::length_error("192 MiB simulation-buffer peak budget exceeded");
    }

    // [/snippet limits]
};
} // namespace water51
