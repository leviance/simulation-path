#pragma once
#include "shader_effects.hpp"
#include "shader_files.hpp"
#include "shader_input.hpp"
#include "shader_overlay.hpp"
#include <iostream>

namespace lab {
#if LAB_CHECKPOINT >= 10
inline void requireShader(bool condition, const std::string& message) {
    if (!condition)
        throw std::runtime_error(message);
}

inline std::vector<std::uint8_t> readShaderImage(GlApi& gl, int width, int height) {
    std::vector<std::uint8_t> image(std::size_t(width) * height * 4);
    gl.ReadPixels(0, 0, width, height, GL_RGBA, GL_UNSIGNED_BYTE, image.data());
    return image;
}

inline void verifyDeletedShaders(GlApi& gl, const ProgramBuildAudit& audit, GLuint expectedProgram) {
    for (auto shader : audit.shaders)
        requireShader(!gl.IsShader(shader), "Intermediate shader object leaked");
    for (auto program : audit.programs)
        requireShader(bool(gl.IsProgram(program)) == (program == expectedProgram), "Candidate program lifetime differs from transaction");
}

inline void verifyShaderUniforms(GlApi& gl, const ShaderLabRenderer& renderer, const UniformSnapshot& expected) {
    std::array<float, 2> actual{};
    gl.GetUniformfv(renderer.activeProgram, renderer.locations.resolution, actual.data());
    requireShader(actual[0] == expected.width && actual[1] == expected.height, "Resolution uniform differs");
    gl.GetUniformfv(renderer.activeProgram, renderer.locations.time, actual.data());
    requireShader(std::abs(actual[0] - expected.time) < 1e-5F, "Time uniform differs");
    gl.GetUniformfv(renderer.activeProgram, renderer.locations.mouse, actual.data());
    requireShader(std::abs(actual[0] - expected.mouseX) < 1e-5F && std::abs(actual[1] - expected.mouseY) < 1e-5F, "Mouse/high-DPI uniform differs");
    gl.GetUniformfv(renderer.activeProgram, renderer.locations.zoom, actual.data());
    requireShader(actual[0] == expected.zoom, "Zoom uniform differs");
}

inline void verifyShaderPixels(const std::vector<std::uint8_t>& image, std::size_t effect, const UniformSnapshot& uniform) {
    const int width = int(uniform.width), height = int(uniform.height);
    const std::array<std::array<double, 2>, 5> positions{{{0.1, 0.1}, {0.9, 0.9}, {0.5, 0.5}, {0.85, 0.5}, {0.1, 0.8}}};
    for (const auto point : positions) {
        const int x = int(point[0] * width), y = int(point[1] * height);
        const auto expected = referenceShaderColor(effect, x + 0.5, y + 0.5, uniform);
        const auto pixel = (std::size_t(y) * width + x) * 4;
        for (std::size_t channel = 0; channel < 3; ++channel) {
            const int reference = int(std::lround(expected[channel] * 255));
            requireShader(std::abs(int(image[pixel + channel]) - reference) <= 6, "GPU pixel/reference differs for " + std::string(kEffects[effect].filename));
        }
    }
}

inline std::size_t changedShaderPixels(const std::vector<std::uint8_t>& a, const std::vector<std::uint8_t>& b) {
    requireShader(a.size() == b.size(), "Image comparison dimensions differ");
    std::size_t different = 0;
    for (std::size_t offset = 0; offset < a.size(); offset += 4) {
        if (a[offset] != b[offset] || a[offset + 1] != b[offset + 1] || a[offset + 2] != b[offset + 2])
            ++different;
    }
    return different;
}

inline void verifyShaderGallery(GlApi& gl, SDL_Window* window, ShaderLabRenderer& renderer, ShaderOverlay& overlay, const std::filesystem::path& directory) {
    const auto started = SDL_GetTicks();
    const auto deadline = [&]() {
        requireShader(SDL_GetTicks() - started < 15000, "Shader gallery verification deadline");
    };
    ShaderScene scene{};
    scene.timeSeconds = 1.25;
    scene.paused = true;
    scene.showDebug = false;
    const auto preservedScene = scene;
    std::string diagnostics;
    std::size_t sampledPixels = 0;
    for (std::size_t effect = 0; effect < kEffects.size(); ++effect) {
        deadline();
        ShaderSources sources{};
        requireShader(readShaderFiles(directory, effect, sources, diagnostics), diagnostics);
        const auto oldProgram = renderer.activeProgram;
        ProgramBuildAudit audit{};
        requireShader(renderer.reload(gl, sources, effect, diagnostics, &audit), diagnostics);
        requireShader(!gl.IsProgram(oldProgram), "Successful commit did not release old program");
        verifyDeletedShaders(gl, audit, renderer.activeProgram);
        for (const auto dimensions : {std::array<int, 2>{640, 400}, std::array<int, 2>{800, 520}}) {
            deadline();
            requireShader(SDL_SetWindowSize(window, dimensions[0], dimensions[1]), "Verification resize failed");
            SDL_PumpEvents();
            int width = 0, height = 0;
            requireShader(SDL_GetWindowSizeInPixels(window, &width, &height), "Cannot query verification pixel size");
            const auto uniform = makeUniformSnapshot(scene, width, height);
            renderer.draw(gl, uniform);
            auto image = readShaderImage(gl, width, height);
            verifyShaderPixels(image, effect, uniform);
            verifyShaderUniforms(gl, renderer, uniform);
            sampledPixels += 5;
            const auto generation = renderer.reloadState.generation, attempts = renderer.reloadState.attempts;
            auto varied = uniform;
            varied.time += 1;
            renderer.draw(gl, varied);
            requireShader(changedShaderPixels(image, readShaderImage(gl, width, height)) > 100, "Time must visibly affect every gallery shader");
            varied = uniform;
            varied.mouseX = width * 0.72F;
            varied.mouseY = height * 0.35F;
            renderer.draw(gl, varied);
            requireShader(changedShaderPixels(image, readShaderImage(gl, width, height)) > 100, "Mouse must visibly affect every gallery shader");
            varied = uniform;
            varied.zoom = 1.3F;
            renderer.draw(gl, varied);
            requireShader(changedShaderPixels(image, readShaderImage(gl, width, height)) > 100, "Zoom must visibly affect every gallery shader");
            requireShader(renderer.reloadState.generation == generation && renderer.reloadState.attempts == attempts, "Uniform updates must not recompile");
            requireShader(gl.GetError() == GL_NO_ERROR, "GL error in gallery samples");
        }
        std::cout << "GPU EFFECT PASS " << kEffects[effect].filename << " / resize, time, mouse, zoom, CPU reference\n";
    }
    requireShader(scene.timeSeconds == preservedScene.timeSeconds && scene.mouseX == preservedScene.mouseX && scene.zoom == preservedScene.zoom, "Reload/renderer changed scene");
    ShaderSources good{};
    requireShader(readShaderFiles(directory, 0, good, diagnostics), diagnostics);
    requireShader(renderer.reload(gl, good, 0, diagnostics), diagnostics);
    constexpr int width = 640, height = 400;
    const auto uniform = makeUniformSnapshot(scene, width, height);
    renderer.draw(gl, uniform);
    const auto lastGoodImage = readShaderImage(gl, width, height);
    const auto reject = [&](const ShaderSources& bad, std::string_view expected) {
        deadline();
        const auto program = renderer.activeProgram;
        const auto locations = renderer.locations;
        const auto state = renderer.reloadState;
        ProgramBuildAudit audit{};
        requireShader(!renderer.reload(gl, bad, 1, diagnostics, &audit), "Broken shader was committed");
        requireShader(diagnostics.find(expected) != std::string::npos, "Diagnostics do not name the failed stage/interface: " + diagnostics);
        requireShader(renderer.activeProgram == program && renderer.locations == locations && gl.IsProgram(program), "Failed candidate replaced last-good program/locations");
        requireShader(renderer.reloadState.generation == state.generation && renderer.reloadState.activeFingerprint == state.activeFingerprint && renderer.reloadState.activeEffect == state.activeEffect && renderer.reloadState.attempts == state.attempts + 1, "Failed reload changed committed metadata");
        verifyDeletedShaders(gl, audit, 0);
        renderer.draw(gl, uniform);
        requireShader(readShaderImage(gl, width, height) == lastGoodImage, "Failed reload changed last-good image");
        std::cout << "EXPECTED REJECTION " << expected << '\n';
        std::cout << diagnostics << '\n';
    };
    auto bad = good;
    bad.fragment += "\nTHIS_IS_NOT_VALID_GLSL\n";
    reject(bad, "fragment compile");
    bad = good;
    bad.vertex += "\nTHIS_IS_NOT_VALID_GLSL\n";
    reject(bad, "vertex compile");
    bad = good;
    bad.vertex = "#version 330 core\nout vec3 bridge;\nvoid main(){gl_Position=vec4(float(gl_VertexID)-1.0,0.0,0.0,1.0);bridge=vec3(gl_Position.xy,float(gl_VertexID));}\n";
    bad.fragment = "#version 330 core\nin vec2 bridge;\nout vec4 fragColor;\nvoid main(){fragColor=vec4(bridge,0.0,1.0);}\n";
    reject(bad, "[link]");
    bad = good;
    bad.fragment = "#version 330 core\nuniform vec2 uResolution;uniform float uTime;uniform float uZoom;out vec4 fragColor;void main(){fragColor=vec4(gl_FragCoord.xy/uResolution,sin(uTime)*uZoom,1.0);}";
    reject(bad, "uMouse");
    bad.fragment = "#version 330 core\nuniform vec2 uResolution;uniform float uTime;uniform vec3 uMouse;uniform float uZoom;out vec4 fragColor;void main(){fragColor=vec4(gl_FragCoord.xy/uResolution+uMouse.xy/uResolution,sin(uTime)*uZoom,1.0);}";
    reject(bad, "Wrong type/array size for uMouse");
    requireShader(renderer.reload(gl, good, 0, diagnostics), "Repair after multiple failures did not recover");
    renderer.draw(gl, uniform);
    requireShader(readShaderImage(gl, width, height) == lastGoodImage, "Repaired source did not restore image");
    int scroll = 0;
    auto controls = scene;
    const auto reloadKey = handleShaderKey(controls, SDLK_F5, false, scroll);
    requireShader(reloadKey.reload && controls.timeSeconds == scene.timeSeconds, "F5 adapter resets time");
    const auto select = handleShaderKey(controls, SDLK_4, false, scroll);
    requireShader(select.reload && select.resetWatch && controls.requestedEffect == 3, "Gallery selection adapter failed");
    handleShaderKey(controls, SDLK_SPACE, false, scroll);
    handleShaderKey(controls, SDLK_N, false, scroll);
    requireShader(controls.paused && controls.timeSeconds > scene.timeSeconds, "Pause/step adapter failed");
    handleShaderKey(controls, SDLK_EQUALS, false, scroll);
    requireShader(controls.zoom > scene.zoom, "Zoom key failed");
    requireShader(handleShaderKey(controls, SDLK_ESCAPE, true, scroll).cancelDrag, "Escape must cancel a mouse gesture first");
    // Error overlay must be readable even in clean/showcase mode.
    auto error = renderer.reloadState;
    error.lastReloadSucceeded = false;
    error.diagnostics = "[fragment compile] gradient.frag\n0(8): error: unexpected token\nLast-good remains active. Fix the file and press F5.";
    renderer.draw(gl, uniform);
    overlay.draw(gl, width, height, scene, error, 0, 0, SDL_GetTicks());
    const auto overlayImage = readShaderImage(gl, width, height);
    std::size_t textPixels = 0;
    for (std::size_t pixel = 0; pixel < std::size_t(width) * 240; ++pixel) {
        if (overlayImage[pixel * 4] > 170 && overlayImage[pixel * 4 + 1] > 100)
            ++textPixels;
    }
    requireShader(textPixels > 100, "Error overlay has no readable text pixels");
    const auto program = renderer.activeProgram, vao = renderer.vertexArray, overlayProgram = overlay.program, texture = overlay.texture, overlayVao = overlay.vao;
    overlay.destroy(gl);
    renderer.destroy(gl);
    requireShader(!gl.IsProgram(program) && !gl.IsProgram(overlayProgram) && !gl.IsVertexArray(vao) && !gl.IsVertexArray(overlayVao) && !gl.IsTexture(texture), "Gallery/overlay resources survived cleanup");
    requireShader(gl.GetError() == GL_NO_ERROR, "GL error at verification cleanup");
    deadline();
    std::cout << "VERIFY PASS: 4 fullscreen effects, " << sampledPixels << " analytic pixel samples, resize/uniforms, compile/link/type failures, last-good repair, SDL key adapter, error overlay and resource cleanup\n";
}
#endif
} // namespace lab
