#pragma once
#include "room_mesh.hpp"
#include "shadow_target.hpp"
#include <cstddef>

namespace lab {
struct RoomDrawing {
    GLuint vao{}, vb{}, ib{};
    RoomProgram material;
#if LAB_CHECKPOINT >= 3
    ShadowTarget shadow;
#endif
    bool initialize(GlApi& gl, const std::filesystem::path& dir, std::string& error) {
        const UnitBox cube = unitBox();
        gl.GenVertexArrays(1, &vao);
        gl.BindVertexArray(vao);
        gl.GenBuffers(1, &vb);
        gl.BindBuffer(GL_ARRAY_BUFFER, vb);
        gl.BufferData(GL_ARRAY_BUFFER, sizeof(cube.vertices), cube.vertices.data(), GL_STATIC_DRAW);
        gl.EnableVertexAttribArray(0);
        gl.VertexAttribPointer(0, 3, GL_FLOAT, GL_FALSE, sizeof(RoomVertex), nullptr);
        gl.EnableVertexAttribArray(1);
        gl.VertexAttribPointer(1, 3, GL_FLOAT, GL_FALSE, sizeof(RoomVertex), reinterpret_cast<const void*>(offsetof(RoomVertex, normal)));
        gl.GenBuffers(1, &ib);
        gl.BindBuffer(GL_ELEMENT_ARRAY_BUFFER, ib);
        gl.BufferData(GL_ELEMENT_ARRAY_BUFFER, sizeof(cube.indices), cube.indices.data(), GL_STATIC_DRAW);
        gl.BindVertexArray(0);
        ShaderSources files;
        if (!readShaderFiles(dir, files, error)) return false;
        if (!material.replace(gl, files)) { error = material.reload.diagnostics; return false; }
#if LAB_CHECKPOINT >= 3
        if (!shadow.initialize(gl, dir, error)) return false;
#endif
        return gl.GetError() == GL_NO_ERROR;
    }

#if LAB_CHECKPOINT >= 3
    void recordDepth(GlApi& gl, const Mat4& light, const std::vector<Piece>& room) const {
        // [snippet shadow-pass]
        gl.BindFramebuffer(GL_FRAMEBUFFER, shadow.fbo);
        gl.Viewport(0, 0, ShadowTarget::side, ShadowTarget::side);
        gl.Enable(GL_DEPTH_TEST);
        gl.Enable(GL_CULL_FACE);
        gl.Clear(GL_DEPTH_BUFFER_BIT);
        gl.UseProgram(shadow.writer);
        gl.UniformMatrix4fv(shadow.light, 1, GL_FALSE, light.m.data());
        gl.BindVertexArray(vao);
        for (const Piece& part : room) {
            gl.UniformMatrix4fv(shadow.model, 1, GL_FALSE, part.model.m.data());
            gl.DrawElements(GL_TRIANGLES, 36, GL_UNSIGNED_SHORT, nullptr);
        }
        gl.BindFramebuffer(GL_FRAMEBUFFER, 0);
        // [/snippet shadow-pass]
    }
#endif

    void draw(GlApi& gl, const ShutterState& s, int w, int h) const {
        const auto room = makeRoom(s);
        const auto camera = cameraVP(s, float(w) / float(h));
#if LAB_CHECKPOINT >= 3
        const auto light = lightVP(s);
        recordDepth(gl, light, room);
#endif
        // Lượt camera dùng lại chính danh sách room, không dựng riêng một căn phòng cho bóng.
        gl.Viewport(0, 0, w, h);
        gl.ClearColor(0.70F, 0.80F, 0.83F, 1);
        gl.Clear(GL_COLOR_BUFFER_BIT | GL_DEPTH_BUFFER_BIT);
#if LAB_CHECKPOINT >= 3
        if (s.mode == 1) { shadow.show(gl, w, h); return; }
#endif
        gl.Enable(GL_DEPTH_TEST);
        gl.Enable(GL_CULL_FACE);
        gl.UseProgram(material.active);
        const auto& u = material.locations;
        gl.UniformMatrix4fv(u.camera, 1, GL_FALSE, camera.m.data());
#if LAB_CHECKPOINT >= 2
        const Vec3 sun = sunDirection(s);
        gl.Uniform3f(u.sun, sun.x, sun.y, sun.z);
#endif
#if LAB_CHECKPOINT >= 4
        // [snippet receive-map]
        gl.UniformMatrix4fv(u.light, 1, GL_FALSE, light.m.data());
        gl.ActiveTexture(GL_TEXTURE0);
        gl.BindTexture(GL_TEXTURE_2D, shadow.texture);
        gl.Uniform1i(u.shadow, 0);
        gl.Uniform1i(u.shadows, int(s.shadows));
        // [/snippet receive-map]
#endif
#if LAB_CHECKPOINT >= 5
        gl.Uniform1f(u.bias, s.bias);
        gl.Uniform1i(u.filter, int(s.filtering));
#endif
#if LAB_CHECKPOINT >= 7
        int layer = 0;
        if (s.mode >= 2) layer = s.mode - 1;
        gl.Uniform1i(u.mode, layer);
#endif
        gl.BindVertexArray(vao);
        // [snippet draw-pieces]
        for (const Piece& part : room) {
            gl.UniformMatrix4fv(u.model, 1, GL_FALSE, part.model.m.data());
            gl.Uniform3f(u.color, part.color.x, part.color.y, part.color.z);
            gl.Uniform1i(u.material, part.material);
            gl.DrawElements(GL_TRIANGLES, 36, GL_UNSIGNED_SHORT, nullptr);
        }
        // [/snippet draw-pieces]
        gl.BindVertexArray(0);
    }
    void destroy(GlApi& gl) {
        material.destroy(gl);
#if LAB_CHECKPOINT >= 3
        shadow.destroy(gl);
#endif
        if (ib) gl.DeleteBuffers(1, &ib);
        if (vb) gl.DeleteBuffers(1, &vb);
        if (vao) gl.DeleteVertexArrays(1, &vao);
    }
};
} // namespace lab
