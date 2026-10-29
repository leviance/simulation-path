#pragma once
#include "raymarch_renderer.hpp"
#include <iomanip>
#include <sstream>

namespace lab {

// SDL vẽ font debug lên surface CPU; texture nhỏ này chỉ là UI, không phải scene.
struct RoomOverlay {
    SDL_Surface* surface{};
    SDL_Renderer* textRenderer{};
    GLuint texture{};
    GLuint program{};
    GLuint vertexArray{};
    GLint sampler{-1};
    int width{};
    int height{};
    float textScale{};
    std::uint64_t nextRefresh{};
    std::string cachedText{};
    std::string cachedError{};
    std::uint64_t cachedGeneration{};

    bool initialize(GlApi& api, std::string& diagnostics) {
        const ShaderSources sources{
            R"glsl(#version 330 core
out vec2 uv;
void main() {
    vec2 positions[3] = vec2[3](vec2(-1,-1), vec2(3,-1), vec2(-1,3));
    vec2 point = positions[gl_VertexID];
    uv = point * 0.5 + 0.5;
    gl_Position = vec4(point,0,1);
}
)glsl",
            R"glsl(#version 330 core
in vec2 uv;
uniform sampler2D uTexture;
out vec4 fragColor;
void main() {
    fragColor = texture(uTexture, vec2(uv.x,1.0-uv.y));
}
)glsl"};
        program = linkShaderProgram(api, sources, diagnostics);
        if (!program) {
            return false;
        }
        sampler = api.GetUniformLocation(program, "uTexture");
        api.GenVertexArrays(1, &vertexArray);
        api.GenTextures(1, &texture);
        api.BindTexture(GL_TEXTURE_2D, texture);
        api.TexParameteri(GL_TEXTURE_2D, GL_TEXTURE_MIN_FILTER, GL_NEAREST);
        api.TexParameteri(GL_TEXTURE_2D, GL_TEXTURE_MAG_FILTER, GL_NEAREST);
        api.TexParameteri(GL_TEXTURE_2D, GL_TEXTURE_WRAP_S, GL_CLAMP_TO_EDGE);
        api.TexParameteri(GL_TEXTURE_2D, GL_TEXTURE_WRAP_T, GL_CLAMP_TO_EDGE);
        return sampler >= 0 && vertexArray != 0 && texture != 0;
    }

    bool resize(GlApi& api, int newWidth, int newHeight, float scale) {
        if (newWidth == width && newHeight == height && scale == textScale) {
            return true;
        }
        if (textRenderer)
            SDL_DestroyRenderer(textRenderer);
        if (surface)
            SDL_DestroySurface(surface);
        textRenderer = nullptr;
        surface = nullptr;
        width = 0;
        height = 0;
        if (newWidth < 1 || newWidth > 4096 || newHeight < 1 || newHeight > 720) {
            return false;
        }
        surface = SDL_CreateSurface(newWidth, newHeight, SDL_PIXELFORMAT_RGBA32);
        if (!surface) {
            return false;
        }
        textRenderer = SDL_CreateSoftwareRenderer(surface);
        if (!textRenderer || !SDL_SetRenderScale(textRenderer, scale, scale)) {
            return false;
        }
        width = newWidth;
        height = newHeight;
        textScale = scale;
        api.BindTexture(GL_TEXTURE_2D, texture);
        api.TexImage2D(GL_TEXTURE_2D, 0, GL_RGBA8, width, height, 0, GL_RGBA, GL_UNSIGNED_BYTE, nullptr);
        cachedText.clear();
        return api.GetError() == GL_NO_ERROR;
    }

    bool draw(GlApi& api, int framebufferWidth, int framebufferHeight, float dpi, const RayMarchFrame& frame, std::uint64_t generation, std::string_view error, double frameMs) {
        if (!frame.showDebug && error.empty()) {
            return true;
        }
        dpi = std::clamp(dpi, 1.0F, 3.0F);
        const float scale = dpi * 2.0F;
        const int panelHeight = std::min(framebufferHeight, static_cast<int>(230.0F * dpi));
        if (!resize(api, std::min(framebufferWidth, 4096), panelHeight, scale)) {
            return false;
        }
        std::ostringstream text;
        text << "RAY-MARCHED ROOM | GL 3.3 | ONE FULLSCREEN SCENE PASS | GEN " << generation << '\n';
        if (!error.empty()) {
            text << "ERROR / LAST-GOOD KEPT: " << error.substr(0, 240) << '\n';
        }
        text << "Tab controls  R reset  Esc release/quit  F5 reload\n";
#if LAB_CHECKPOINT >= 9
        text << "RMB/arrows look  WASD fly  Q/E local up/down  Wheel FOV  J/K sphere  U/I torus\n";
#endif
#if LAB_CHECKPOINT >= 8
        text << "Space pause light  N light +0.1s (camera remains usable)\n";
#endif
#if LAB_CHECKPOINT >= 4
        text << "[ ] step budget  -/= hit epsilon\n";
        text << "steps " << frame.settings.maximumSteps << "  hit eps " << frame.settings.hitEpsilon << "m  normal eps " << frame.settings.normalEpsilon << "m  max t " << frame.settings.maximumDistance << "m\n";
#endif
        text << std::fixed << std::setprecision(2) << "camera " << frame.camera.position.x << "," << frame.camera.position.y << "," << frame.camera.position.z << "  time " << frame.elapsedSeconds << "s  CPUframe " << frameMs << "ms\n";
#if LAB_CHECKPOINT >= 10
        text << "V view  ,/. normal epsilon  Z/X maximum distance\n";
        text << "view " << frame.debugView << " (0 Beauty,1 Steps,2 Hit,3 Normal)  paused " << frame.paused << "\n";
        const auto ray = makeCameraRay(frame.camera, framebufferWidth * 0.5 - 0.5, framebufferHeight * 0.5 - 0.5, framebufferWidth, framebufferHeight);
        const auto sample = marchRay(ray, frame.settings, frame.scene);
        text << "CPU center: " << marchStatusName(sample.status) << "  t " << sample.traveled << "m  samples " << sample.steps << "\n";
#endif
        const std::string lines = text.str();
        const auto now = SDL_GetTicks();
        if (cachedText.empty() || error != cachedError || generation != cachedGeneration || now >= nextRefresh) {
            cachedText = lines;
            cachedError = error;
            cachedGeneration = generation;
            nextRefresh = now + 200;
            if (!SDL_SetRenderDrawColor(textRenderer, 9, 16, 25, 255) || !SDL_RenderClear(textRenderer) || !SDL_SetRenderDrawColor(textRenderer, 216, 230, 245, 255)) {
                return false;
            }
            const std::size_t columns = static_cast<std::size_t>(std::max(12, static_cast<int>(width / (8.0F * scale)) - 2));
            std::string line;
            int y = 2;
            for (unsigned char character : lines) {
                if (character == '\r')
                    continue;
                if (character == '\n' || line.size() >= columns) {
                    if (y + 8 > height / scale)
                        break;
                    if (!SDL_RenderDebugText(textRenderer, 3, static_cast<float>(y), line.c_str()))
                        return false;
                    y += 10;
                    line.clear();
                }
                if (character >= 32 && character < 127)
                    line.push_back(static_cast<char>(character));
            }
            if (!line.empty() && y + 8 <= height / scale && !SDL_RenderDebugText(textRenderer, 3, static_cast<float>(y), line.c_str())) {
                return false;
            }
            if (!SDL_RenderPresent(textRenderer))
                return false;
            api.ActiveTexture(GL_TEXTURE0);
            api.BindTexture(GL_TEXTURE_2D, texture);
            api.PixelStorei(GL_UNPACK_ROW_LENGTH, surface->pitch / 4);
            api.TexSubImage2D(GL_TEXTURE_2D, 0, 0, 0, width, height, GL_RGBA, GL_UNSIGNED_BYTE, surface->pixels);
            api.PixelStorei(GL_UNPACK_ROW_LENGTH, 0);
        }
        api.Viewport(0, framebufferHeight - height, width, height);
        api.UseProgram(program);
        api.Uniform1i(sampler, 0);
        api.ActiveTexture(GL_TEXTURE0);
        api.BindTexture(GL_TEXTURE_2D, texture);
        api.BindVertexArray(vertexArray);
        api.DrawArrays(GL_TRIANGLES, 0, 3);
        api.BindVertexArray(0);
        return api.GetError() == GL_NO_ERROR;
    }

    void destroy(GlApi& api) {
        // SDL surface/renderer và GPU texture có vòng đời riêng, đều phải được nhả.
        if (textRenderer)
            SDL_DestroyRenderer(textRenderer);
        if (surface)
            SDL_DestroySurface(surface);
        textRenderer = nullptr;
        surface = nullptr;
        api.UseProgram(0);
        if (program)
            api.DeleteProgram(program);
        if (texture)
            api.DeleteTextures(1, &texture);
        if (vertexArray)
            api.DeleteVertexArrays(1, &vertexArray);
        program = texture = vertexArray = 0;
    }
};

} // namespace lab
