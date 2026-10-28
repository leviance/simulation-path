#pragma once
#include "shader_renderer.hpp"
#include <iomanip>
#include <sstream>

namespace lab {
#if LAB_CHECKPOINT >= 10
inline std::vector<std::string> wrapShaderLog(std::string_view message, std::size_t columns) {
    std::vector<std::string> rows;
    std::string line;
    for (unsigned char byte : message) {
        if (byte == '\r')
            continue;
        if (byte == '\n' || line.size() >= columns) {
            rows.push_back(line);
            line.clear();
        }
        if (byte != '\n')
            line.push_back(byte >= 32 && byte < 127 ? char(byte) : '?');
    }
    if (!line.empty())
        rows.push_back(line);
    return rows;
}

// SDL draws its built-in debug font on a CPU surface, not on the GL window.
// Upload that small surface as a texture. No OS fonts or extra library needed.
struct ShaderOverlay {
    SDL_Surface* surface{};
    SDL_Renderer* textRenderer{};
    GLuint texture{}, program{}, vao{};
    GLint sampler{-1};
    int width{}, height{};
    std::uint64_t nextRefresh{};
    std::string cachedText{};

    bool initialize(GlApi& gl, std::string& diagnostics) {
        const std::string vertex = R"glsl(#version 330 core
out vec2 uv;
void main() {
    vec2 p[3] = vec2[3](vec2(-1.0,-1.0),vec2(3.0,-1.0),vec2(-1.0,3.0));
    uv = p[gl_VertexID] * 0.5 + 0.5;
    gl_Position = vec4(p[gl_VertexID],0.0,1.0);
}
)glsl";
        const std::string fragment = R"glsl(#version 330 core
in vec2 uv;
uniform sampler2D uTexture;
out vec4 fragColor;
void main() { fragColor = texture(uTexture, vec2(uv.x, 1.0 - uv.y)); }
)glsl";
        program = linkShaderProgram(gl, {vertex, fragment, "overlay.vert", "overlay.frag"}, diagnostics);
        if (!program)
            return false;
        sampler = gl.GetUniformLocation(program, "uTexture");
        gl.GenVertexArrays(1, &vao);
        gl.BindVertexArray(vao);
        gl.BindVertexArray(0);
        gl.GenTextures(1, &texture);
        gl.BindTexture(GL_TEXTURE_2D, texture);
        gl.TexParameteri(GL_TEXTURE_2D, GL_TEXTURE_MIN_FILTER, GL_NEAREST);
        gl.TexParameteri(GL_TEXTURE_2D, GL_TEXTURE_MAG_FILTER, GL_NEAREST);
        gl.TexParameteri(GL_TEXTURE_2D, GL_TEXTURE_WRAP_S, GL_CLAMP_TO_EDGE);
        gl.TexParameteri(GL_TEXTURE_2D, GL_TEXTURE_WRAP_T, GL_CLAMP_TO_EDGE);
        return sampler >= 0 && texture && vao && gl.GetError() == GL_NO_ERROR;
    }

    void resize(GlApi& gl, int newWidth, int newHeight) {
        if (newWidth == width && newHeight == height)
            return;
        if (textRenderer)
            SDL_DestroyRenderer(textRenderer);
        if (surface)
            SDL_DestroySurface(surface);
        textRenderer = nullptr;
        surface = SDL_CreateSurface(newWidth, newHeight, SDL_PIXELFORMAT_RGBA32);
        if (!surface)
            throw std::runtime_error(SDL_GetError());
        textRenderer = SDL_CreateSoftwareRenderer(surface);
        if (!textRenderer)
            throw std::runtime_error(SDL_GetError());
        if (!SDL_SetRenderScale(textRenderer, 2, 2))
            throw std::runtime_error(SDL_GetError());
        width = newWidth;
        height = newHeight;
        gl.BindTexture(GL_TEXTURE_2D, texture);
        gl.TexImage2D(GL_TEXTURE_2D, 0, GL_RGBA8, width, height, 0, GL_RGBA, GL_UNSIGNED_BYTE, nullptr);
        cachedText.clear();
    }

    void draw(GlApi& gl, int framebufferWidth, int framebufferHeight, const ShaderScene& scene, const ReloadState& reload, double frameMs, int logOffset, std::uint64_t now) {
        const bool error = !reload.lastReloadSucceeded;
        if (!scene.showDebug && !error)
            return;
        resize(gl, framebufferWidth, std::min(240, framebufferHeight));
        const auto active = reload.activeEffect < kEffects.size() ? kEffects[reload.activeEffect].name : "Embedded recovery";
        std::ostringstream text;
        text << "ACTIVE " << active << " / REQ " << scene.requestedEffect + 1 << '\n'
             << "GEN " << reload.generation << " TRY " << reload.attempts << " AUTO " << (scene.autoReload ? "ON" : "OFF") << (error ? " ERROR / LAST-GOOD KEPT" : " OK") << '\n'
             << "1-4 gallery F5 reload Tab debug\n"
             << "Drag/wheel Space N R A PgUp/PgDn\n";
        // Time/frame wall changes continuously. Refresh regular text at 4 Hz,
        // but a new error or generation is shown immediately.
        const std::string key = text.str() + reload.diagnostics + std::to_string(logOffset);
        if (key != cachedText || now >= nextRefresh) {
            cachedText = key;
            nextRefresh = now + 250;
            SDL_SetRenderDrawColor(textRenderer, 8, 14, 25, 255);
            SDL_RenderClear(textRenderer);
            std::vector<std::string> rows = wrapShaderLog(text.str(), std::size_t(std::max(16, (width - 16) / 16)));
            std::ostringstream status;
            status << std::fixed << std::setprecision(2) << "t " << scene.timeSeconds << " z " << scene.zoom << " CPUframe " << frameMs << "ms";
            rows.push_back(status.str());
            auto logRows = wrapShaderLog(reload.diagnostics, std::size_t(std::max(16, (width - 16) / 16)));
            const auto offset = std::min(std::size_t(std::max(0, logOffset)), logRows.size());
            rows.insert(rows.end(), logRows.begin() + offset, logRows.end());
            int y = 4;
            for (std::size_t index = 0; index < rows.size() && y + 8 <= height / 2; ++index) {
                if (error && index >= 5)
                    SDL_SetRenderDrawColor(textRenderer, 255, 147, 142, 255);
                else
                    SDL_SetRenderDrawColor(textRenderer, 191, 220, 234, 255);
                if (!SDL_RenderDebugText(textRenderer, 4, float(y), rows[index].c_str()))
                    throw std::runtime_error(SDL_GetError());
                y += 10;
            }
            if (!SDL_RenderPresent(textRenderer))
                throw std::runtime_error(SDL_GetError());
            gl.ActiveTexture(GL_TEXTURE0);
            gl.BindTexture(GL_TEXTURE_2D, texture);
            gl.PixelStorei(GL_UNPACK_ALIGNMENT, 1);
            gl.PixelStorei(GL_UNPACK_ROW_LENGTH, surface->pitch / 4);
            gl.TexSubImage2D(GL_TEXTURE_2D, 0, 0, 0, width, height, GL_RGBA, GL_UNSIGNED_BYTE, surface->pixels);
            gl.PixelStorei(GL_UNPACK_ROW_LENGTH, 0);
        }
        gl.Disable(GL_DEPTH_TEST);
        gl.Disable(GL_CULL_FACE);
        gl.Viewport(0, 0, width, height);
        gl.UseProgram(program);
        gl.Uniform1i(sampler, 0);
        gl.ActiveTexture(GL_TEXTURE0);
        gl.BindTexture(GL_TEXTURE_2D, texture);
        gl.BindVertexArray(vao);
        gl.DrawArrays(GL_TRIANGLES, 0, 3);
        gl.BindVertexArray(0);
    }

    void destroy(GlApi& gl) {
        if (textRenderer)
            SDL_DestroyRenderer(textRenderer);
        if (surface)
            SDL_DestroySurface(surface);
        textRenderer = nullptr;
        surface = nullptr;
        gl.UseProgram(0);
        if (program)
            gl.DeleteProgram(program);
        if (vao)
            gl.DeleteVertexArrays(1, &vao);
        if (texture)
            gl.DeleteTextures(1, &texture);
        program = vao = texture = 0;
    }
};
#endif
} // namespace lab
