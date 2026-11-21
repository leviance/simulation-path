#pragma once
#include "shader_files.hpp"
#include "shader_renderer.hpp"

namespace lab {
#if LAB_CHECKPOINT >= 3
// Một texture duy nhất giữ khoảng sâu gần nguồn sáng nhất. Không dùng ảnh màu giả độ sâu.
struct ShadowTarget {
    static constexpr int side = 1024;
    GLuint fbo{}, texture{}, writer{}, viewer{}, emptyVao{};
    GLint model{-1}, light{-1}, viewerMap{-1};
    bool initialize(GlApi& gl, const std::filesystem::path& dir, std::string& error) {
        // [snippet depth-target]
        gl.GenTextures(1, &texture);
        gl.BindTexture(GL_TEXTURE_2D, texture);
        gl.TexImage2D(GL_TEXTURE_2D, 0, GL_DEPTH_COMPONENT24, side, side, 0, GL_DEPTH_COMPONENT, GL_FLOAT, nullptr);
        gl.TexParameteri(GL_TEXTURE_2D, GL_TEXTURE_MIN_FILTER, GL_NEAREST);
        gl.TexParameteri(GL_TEXTURE_2D, GL_TEXTURE_MAG_FILTER, GL_NEAREST);
        gl.TexParameteri(GL_TEXTURE_2D, GL_TEXTURE_WRAP_S, GL_CLAMP_TO_EDGE);
        gl.TexParameteri(GL_TEXTURE_2D, GL_TEXTURE_WRAP_T, GL_CLAMP_TO_EDGE);
        gl.GenFramebuffers(1, &fbo);
        gl.BindFramebuffer(GL_FRAMEBUFFER, fbo);
        gl.FramebufferTexture2D(GL_FRAMEBUFFER, GL_DEPTH_ATTACHMENT, GL_TEXTURE_2D, texture, 0);
        gl.DrawBuffer(GL_NONE);
        gl.ReadBuffer(GL_NONE);
        const GLenum status = gl.CheckFramebufferStatus(GL_FRAMEBUFFER);
        gl.BindFramebuffer(GL_FRAMEBUFFER, 0);
        // [/snippet depth-target]
        if (status != GL_FRAMEBUFFER_COMPLETE) { error = "Depth framebuffer incomplete"; return false; }
        ShaderSources src{};
        src.vertexLabel = shaderPathText(dir / "depth.vert");
        src.fragmentLabel = shaderPathText(dir / "depth.frag");
        if (!readTextFile(dir / "depth.vert", src.vertex, error) || !readTextFile(dir / "depth.frag", src.fragment, error)) return false;
        writer = linkShaderProgram(gl, src, error);
        if (!writer) return false;
        model = gl.GetUniformLocation(writer, "uModel");
        light = gl.GetUniformLocation(writer, "uLightVP");
        const std::string vertex = R"(#version 330 core
out vec2 uv;
void main(){
    vec2 p = vec2((gl_VertexID << 1) & 2, gl_VertexID & 2);
    uv = p;
    gl_Position = vec4(2.0 * p - 1.0, 0.0, 1.0);
})";
        const std::string fragment = R"(#version 330 core
in vec2 uv;
uniform sampler2D mapDepth;
out vec4 fragColor;
void main(){
    float depth = texture(mapDepth, uv).r;
    fragColor = vec4(vec3(depth), 1.0);
})";
        viewer = linkShaderProgram(gl, {vertex, fragment, "depth-view.vert", "depth-view.frag"}, error);
        if (!viewer) return false;
        viewerMap = gl.GetUniformLocation(viewer, "mapDepth");
        gl.GenVertexArrays(1, &emptyVao);
        return model >= 0 && light >= 0 && viewerMap >= 0;
    }
    void show(GlApi& gl, int w, int h) const {
        const int edge = std::min(w, h);
        gl.Viewport((w - edge) / 2, (h - edge) / 2, edge, edge);
        gl.Disable(GL_DEPTH_TEST);
        gl.Disable(GL_CULL_FACE);
        gl.UseProgram(viewer);
        gl.ActiveTexture(GL_TEXTURE0);
        gl.BindTexture(GL_TEXTURE_2D, texture);
        gl.Uniform1i(viewerMap, 0);
        gl.BindVertexArray(emptyVao);
        gl.DrawArrays(GL_TRIANGLES, 0, 3);
    }
    void destroy(GlApi& gl) {
        if (fbo) gl.DeleteFramebuffers(1, &fbo);
        if (texture) gl.DeleteTextures(1, &texture);
        if (writer) gl.DeleteProgram(writer);
        if (viewer) gl.DeleteProgram(viewer);
        if (emptyVao) gl.DeleteVertexArrays(1, &emptyVao);
    }
};
#endif
} // namespace lab
