#pragma once
#include "room_uniforms.hpp"
#include <cstdint>

namespace lab {

struct ProgramCandidate {
    GLuint program{};
    UniformLocations locations{};
};

inline void destroyCandidate(GlApi& api, ProgramCandidate& candidate) {
    if (candidate.program) {
        api.DeleteProgram(candidate.program);
    }
    candidate = {};
}

inline bool buildProgramCandidate(GlApi& api, const ShaderSources& sources, ProgramCandidate& candidate, std::string& diagnostics, ProgramBuildAudit* audit = nullptr) {
    candidate = {};
    candidate.program = linkShaderProgram(api, sources, diagnostics, audit);
    if (!candidate.program) {
        return false;
    }
    if (!validateUniforms(api, candidate.program, candidate.locations, diagnostics)) {
        destroyCandidate(api, candidate);
        return false;
    }
    return true;
}

struct RayMarchRenderer {
    GLuint vertexArray{};
    ProgramCandidate activeProgram{};
    std::uint64_t generation{};

    bool initialize(GlApi& api, const ShaderSources& sources, std::string& diagnostics) {
        if (!buildProgramCandidate(api, sources, activeProgram, diagnostics)) {
            return false;
        }
        api.GenVertexArrays(1, &vertexArray);
        if (!vertexArray) {
            diagnostics = "Could not create fullscreen VAO";
            destroyCandidate(api, activeProgram);
            return false;
        }
        generation = 1;
        return true;
    }

    // [snippet:reload-transaction]
    bool reload(GlApi& api, const ShaderSources& sources, std::string& diagnostics, ProgramBuildAudit* audit = nullptr) {
        ProgramCandidate candidate{};
        if (!buildProgramCandidate(api, sources, candidate, diagnostics, audit)) {
            return false;
        }
        const GLuint previousProgram = activeProgram.program;
        activeProgram = candidate;
        ++generation;
        api.UseProgram(activeProgram.program);
        api.DeleteProgram(previousProgram);
        diagnostics = "Reload committed: active program replaced; camera/time unchanged.";
        return true;
    }

    // [/snippet:reload-transaction]

    void draw(GlApi& api, const RayMarchFrame& frame, int width, int height) {
        api.Viewport(0, 0, width, height);
        api.UseProgram(activeProgram.program);
        uploadUniforms(api, activeProgram.locations, frame, width, height);
        // Chỉ triangle tạo fragment: sphere/box/torus không có VBO hay EBO.
        api.BindVertexArray(vertexArray);
        api.DrawArrays(GL_TRIANGLES, 0, 3);
        api.BindVertexArray(0);
    }

    void destroy(GlApi& api) {
        // Nhả program đang bound trước khi kiểm tra nó đã bị xóa thật sự.
        api.UseProgram(0);
        destroyCandidate(api, activeProgram);
        if (vertexArray) {
            api.DeleteVertexArrays(1, &vertexArray);
        }
        vertexArray = 0;
    }
};

} // namespace lab
