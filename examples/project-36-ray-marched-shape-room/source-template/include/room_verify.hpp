#pragma once
#include "raymarch_renderer.hpp"
#include "raymarch_oracle.hpp"
#include <iostream>

namespace lab {

// FBO float dùng để đọc số đo, không lượng tử hóa t thành màu RGB 8-bit.
struct FloatTarget {
    GlApi& api;
    GLuint framebuffer{};
    GLuint texture{};
    GLint previousFramebuffer{};
    GLint viewport[4]{};
    int width{};
    int height{};

    explicit FloatTarget(GlApi& source) : api(source) {
        api.GetIntegerv(GL_FRAMEBUFFER_BINDING, &previousFramebuffer);
        api.GetIntegerv(GL_VIEWPORT, viewport);
    }

    FloatTarget(const FloatTarget&) = delete;
    FloatTarget& operator=(const FloatTarget&) = delete;

    bool initialize(int newWidth, int newHeight) {
        if (newWidth < 1 || newHeight < 1 || newWidth > 256 || newHeight > 256) {
            return false;
        }
        width = newWidth;
        height = newHeight;
        api.GenTextures(1, &texture);
        api.BindTexture(GL_TEXTURE_2D, texture);
        api.TexParameteri(GL_TEXTURE_2D, GL_TEXTURE_MIN_FILTER, GL_NEAREST);
        api.TexParameteri(GL_TEXTURE_2D, GL_TEXTURE_MAG_FILTER, GL_NEAREST);
        api.TexImage2D(GL_TEXTURE_2D, 0, GL_RGBA32F, width, height, 0, GL_RGBA, GL_FLOAT, nullptr);
        api.GenFramebuffers(1, &framebuffer);
        api.BindFramebuffer(GL_FRAMEBUFFER, framebuffer);
        api.FramebufferTexture2D(GL_FRAMEBUFFER, GL_COLOR_ATTACHMENT0, GL_TEXTURE_2D, texture, 0);
        api.DrawBuffer(GL_COLOR_ATTACHMENT0);
        api.ReadBuffer(GL_COLOR_ATTACHMENT0);
        return texture && framebuffer && api.CheckFramebufferStatus(GL_FRAMEBUFFER) == GL_FRAMEBUFFER_COMPLETE;
    }

    std::vector<float> read() {
        std::vector<float> pixels(static_cast<std::size_t>(width * height * 4));
        // glReadPixels hoàn tất readback; đây không phải phép đo GPU runtime.
        api.ReadPixels(0, 0, width, height, GL_RGBA, GL_FLOAT, pixels.data());
        return pixels;
    }

    ~FloatTarget() {
        api.BindFramebuffer(GL_FRAMEBUFFER, static_cast<GLuint>(previousFramebuffer));
        api.Viewport(viewport[0], viewport[1], viewport[2], viewport[3]);
        if (framebuffer) api.DeleteFramebuffers(1, &framebuffer);
        if (texture) api.DeleteTextures(1, &texture);
    }
};

inline bool verifyRoom(GlApi& api, RayMarchRenderer& renderer, const ShaderSources& sources) {
    int failures = 0;
    int checks = 0;
    const auto check = [&](bool condition, const char* label) {
        ++checks;
        if (!condition) {
            ++failures;
            std::cerr << "FAIL GPU: " << label << '\n';
        }
    };
    std::cout << "GPU: " << reinterpret_cast<const char*>(api.GetString(GL_RENDERER)) << " | " << reinterpret_cast<const char*>(api.GetString(GL_VERSION)) << '\n';
    FloatTarget target(api);
    if (!target.initialize(192, 128)) {
        std::cerr << "RGBA32F verification framebuffer is unavailable\n";
        return false;
    }
    RayMarchFrame frame{};
    renderer.draw(api, frame, target.width, target.height);
    const auto baseline = target.read();
    check(std::all_of(baseline.begin(), baseline.end(), [](float value) { return std::isfinite(value); }), "primary shader produces finite pixels");
    check(*std::max_element(baseline.begin(), baseline.end()) > 0.0F, "primary shader writes framebuffer");
    const GLuint lastGood = renderer.activeProgram.program;
    const auto generation = renderer.generation;
    const auto locations = renderer.activeProgram.locations;
    std::string diagnostics;
    ProgramBuildAudit audit{};
    ShaderSources invalid = sources;
    invalid.fragment += "\nthis_is_not_valid_GLSL;\n";
    check(!renderer.reload(api, invalid, diagnostics, &audit), "compile error rejects candidate");
    check(renderer.activeProgram.program == lastGood && renderer.generation == generation && renderer.activeProgram.locations == locations, "failed reload preserves program/generation/locations");
    for (GLuint shader : audit.shaders) check(api.IsShader(shader) == GL_FALSE, "temporary shader deleted");
    for (GLuint program : audit.programs) check(api.IsProgram(program) == GL_FALSE, "temporary program deleted");
    renderer.draw(api, frame, target.width, target.height);
    check(target.read() == baseline, "last-good image is unchanged after compile error");

#if LAB_CHECKPOINT >= 11
    // Thay duy nhất main: mọi hàm SDF/march/normal vẫn là GLSL của sản phẩm.
    const auto mainStart = sources.fragment.find("\nvoid main()");
    if (mainStart == std::string::npos) {
        std::cerr << "Cannot locate diagnostic entry point\n";
        return false;
    }
    ShaderSources probe = sources;
    probe.fragment = sources.fragment.substr(0, mainStart) + R"glsl(
uniform vec3 uProbeOrigin;
uniform vec3 uProbeDirection;
uniform int uProbeMode;
void main() {
    vec3 origin = uProbeOrigin;
    vec3 direction = uProbeDirection;
    if (uProbeMode == 1) {
        origin = uCameraPosition;
        direction = makeCameraRay(gl_FragCoord.xy);
    }
    MarchResult result = marchRay(origin,direction);
    fragColor = vec4(result.traveled,float(result.status),float(result.materialId),float(result.steps));
}
)glsl";
    const GLuint program = linkShaderProgram(api, probe, diagnostics);
    check(program != 0, "diagnostic shader compiles from real product functions");
    if (program) {
        const auto uniforms = locateUniforms(api, program);
        const auto originLocation = api.GetUniformLocation(program, "uProbeOrigin");
        const auto directionLocation = api.GetUniformLocation(program, "uProbeDirection");
        const auto modeLocation = api.GetUniformLocation(program, "uProbeMode");
        const auto measure = [&](Ray ray, const RayMarchFrame& snapshot, int mode) {
            api.Viewport(0, 0, target.width, target.height);
            api.UseProgram(program);
            uploadUniforms(api, uniforms, snapshot, target.width, target.height);
            api.Uniform3f(originLocation, static_cast<float>(ray.origin.x), static_cast<float>(ray.origin.y), static_cast<float>(ray.origin.z));
            api.Uniform3f(directionLocation, static_cast<float>(ray.direction.x), static_cast<float>(ray.direction.y), static_cast<float>(ray.direction.z));
            api.Uniform1i(modeLocation, mode);
            api.BindVertexArray(renderer.vertexArray);
            api.DrawArrays(GL_TRIANGLES, 0, 3);
            api.BindVertexArray(0);
            return target.read();
        };
        RayMarchFrame sphereFrame{};
        sphereFrame.scene.includeBox = false;
        sphereFrame.scene.includeTorus = false;
        sphereFrame.scene.includeRoom = false;
        for (const Ray ray : {Ray{{-1,-0.18,4},{0,0,-1}}, Ray{{-1,-0.18,0.15},{1,0,0}}, Ray{{0,0,4},{0,0,1}}}) {
            const auto measured = measure(ray, sphereFrame, 0);
            const auto exact = intersectSphere(ray, {-1,-0.18,0.15}, sphereFrame.scene.sphereRadius);
            if (exact.hit) {
                check(measured[1] == 0 && std::abs(measured[0] - exact.distance) < 0.0001, "real GPU t agrees with independent analytic sphere");
            } else {
                check(measured[1] == 1 && measured[0] <= sphereFrame.settings.maximumDistance, "real GPU miss respects distance limit");
            }
        }
        sphereFrame.settings.maximumSteps = 1;
        const auto exhausted = measure({{-1,-0.18,4},{0,0,-1}}, sphereFrame, 0);
        check(exhausted[1] == 2 && exhausted[3] == 1, "GPU step budget counts SDF queries");
        const auto materials = measure({}, frame, 1);
        std::array<int,5> counts{};
        for (std::size_t index = 0; index < materials.size(); index += 4) {
            const int id = static_cast<int>(materials[index + 2]);
            if (id >= 0 && id <= 4) ++counts[static_cast<std::size_t>(id)];
        }
        for (int id = 1; id <= 4; ++id) {
            std::cout << "Visible material " << id << ": " << counts[static_cast<std::size_t>(id)] << " pixels\n";
            check(counts[static_cast<std::size_t>(id)] >= 12, "all required primitives and room are visible in default scene");
        }
        api.UseProgram(0);
        api.DeleteProgram(program);
    }
#endif
    check(renderer.reload(api, sources, diagnostics), "valid reload commits a new generation");
    check(renderer.generation == generation + 1, "successful reload increments generation exactly once");
    check(api.IsProgram(lastGood) == GL_FALSE, "previous active program is deleted after commit");
    check(api.GetError() == GL_NO_ERROR, "no OpenGL errors in verification");
    std::cout << checks << " GPU checks, " << failures << " failures\n";
    return failures == 0;
}

} // namespace lab
