#pragma once
#include "raymarch_oracle.hpp"
#include "raymarch_renderer.hpp"
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

    explicit FloatTarget(GlApi& source)
        : api(source) {
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
        if (framebuffer)
            api.DeleteFramebuffers(1, &framebuffer);
        if (texture)
            api.DeleteTextures(1, &texture);
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
    check(std::all_of(baseline.begin(), baseline.end(), [](float value) {
        return std::isfinite(value);
    }), "primary shader produces finite pixels");
    bool hasColor = false;
    for (std::size_t index = 0; index < baseline.size(); index += 4) {
        hasColor = hasColor || baseline[index] > 0.01F || baseline[index + 1] > 0.01F || baseline[index + 2] > 0.01F;
    }
    check(hasColor, "primary shader writes nonzero RGB, not only alpha");
    const GLuint lastGood = renderer.activeProgram.program;
    const auto generation = renderer.generation;
    const auto locations = renderer.activeProgram.locations;
    std::string diagnostics;
    const auto reject = [&](const ShaderSources& candidate, const char* expectedStage) {
        ProgramBuildAudit audit{};
        check(!renderer.reload(api, candidate, diagnostics, &audit), "invalid candidate is rejected");
        if (diagnostics.find(expectedStage) == std::string::npos) {
            std::cerr << "Expected " << expectedStage << ", got: " << diagnostics << '\n';
        }
        check(diagnostics.find(expectedStage) != std::string::npos, "diagnostic identifies the failing stage/interface");
        check(renderer.activeProgram.program == lastGood && renderer.generation == generation && renderer.activeProgram.locations == locations, "failed reload preserves program/generation/locations");
        for (GLuint shader : audit.shaders) {
            check(api.IsShader(shader) == GL_FALSE, "temporary shader deleted");
        }
        for (GLuint program : audit.programs) {
            check(api.IsProgram(program) == GL_FALSE, "temporary program deleted");
        }
        renderer.draw(api, frame, target.width, target.height);
        check(target.read() == baseline, "last-good image remains byte-for-byte unchanged");
    };
    ShaderSources invalid = sources;
    invalid.fragment += "\nthis_is_not_valid_GLSL;\n";
    reject(invalid, "compile");
    // Vertex xuất vNdc vec2; fragment đòi cùng tên nhưng vec3: lỗi link thật.
    invalid.fragment = "#version 330 core\nin vec3 vNdc; out vec4 fragColor; void main(){fragColor=vec4(vNdc,1.0);}";
    reject(invalid, "link");
#if LAB_CHECKPOINT >= 1
    invalid.fragment = "#version 330 core\nout vec4 fragColor; void main(){fragColor=vec4(0.5);}";
    reject(invalid, "uniform");
    invalid.fragment = "#version 330 core\nuniform vec3 uResolution; out vec4 fragColor; void main(){fragColor=vec4(uResolution,1.0);}";
    reject(invalid, "uniform");
#endif

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
    if (uProbeMode == 2) {
        fragColor = vec4(estimateNormal(uProbeOrigin),1.0);
        return;
    }
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
        for (const Ray ray : {Ray{{-1, -0.18, 4}, {0, 0, -1}}, Ray{{-1, -0.18, 0.15}, {1, 0, 0}}, Ray{{0, 0, 4}, {0, 0, 1}}}) {
            const auto measured = measure(ray, sphereFrame, 0);
            const auto exact = intersectSphere(ray, {-1, -0.18, 0.15}, sphereFrame.scene.sphereRadius);
            if (exact.hit) {
                check(measured[1] == 0 && std::abs(measured[0] - exact.distance) < 0.0001, "real GPU t agrees with independent analytic sphere");
            } else {
                check(measured[1] == 1 && measured[0] <= sphereFrame.settings.maximumDistance, "real GPU miss respects distance limit");
            }
        }
        sphereFrame.settings.maximumSteps = 1;
        const auto exhausted = measure({{-1, -0.18, 4}, {0, 0, -1}}, sphereFrame, 0);
        check(exhausted[1] == 2 && exhausted[3] == 1, "GPU step budget counts SDF queries");
        sphereFrame.settings.maximumSteps = 256;
        const Vec3 center{-1, -0.18, 0.15};
        const double radius = sphereFrame.scene.sphereRadius;
        for (const double epsilon : {0.0001, 0.0015, 0.01}) {
            sphereFrame.settings.hitEpsilon = epsilon;
            const Ray tangent{{center.x + radius, center.y, 4}, {0, 0, -1}};
            const auto exact = intersectSphere(tangent, center, radius);
            const auto measured = measure(tangent, sphereFrame, 0);
            const double bound = std::sqrt(2.0 * radius * epsilon + epsilon * epsilon);
            check(exact.hit && measured[1] == 0 && std::abs(measured[0] - exact.distance) <= bound + 0.0001, "GPU tangent t error respects the geometric epsilon-band bound");
            const Ray nearSurface{{center.x + radius + epsilon * 0.5, center.y, center.z}, {1, 0, 0}};
            const auto approximate = measure(nearSurface, sphereFrame, 0);
            check(!intersectSphere(nearSurface, center, radius).hit && approximate[1] == 0 && approximate[0] == 0, "epsilon band may accept a near miss at t=0; it is not an exact intersection");
        }
        const Vec3 expectedNormal = normalize({0.3, 0.4, 0.5});
        const Vec3 surface = center + expectedNormal * radius;
        for (const double epsilon : {0.00001, 0.0001, 0.001, 0.01, 0.02}) {
            sphereFrame.settings.normalEpsilon = epsilon;
            const auto measured = measure({surface, {1, 0, 0}}, sphereFrame, 2);
            const Vec3 normal{measured[0], measured[1], measured[2]};
            const double angle = std::acos(std::clamp(dot(normal, expectedNormal), -1.0, 1.0));
            std::cout << "GPU normal epsilon " << epsilon << "m: angle error " << angle << "rad\n";
            check(finite(normal) && std::abs(length(normal) - 1.0) < 0.00001 && angle < 0.02, "GPU normal has finite unit length and <0.02 rad angular error across epsilon sweep");
        }
        sphereFrame.settings = {};
        sphereFrame.settings.maximumDistance = 2.0;
        const auto clipped = measure({{-1, -0.18, 4}, {0, 0, -1}}, sphereFrame, 0);
        check(clipped[1] == 1 && clipped[0] == 2.0F, "GPU maximum distance clips before the sphere");
        sphereFrame.settings = {};
        sphereFrame.settings.maximumSteps = 257;
        const auto oversized = measure({{-1, -0.18, 4}, {0, 0, -1}}, sphereFrame, 0);
        check(oversized[1] == 3 && oversized[3] == 0, "GPU rejects oversized settings without running the marcher");
        sphereFrame.settings = {};
        sphereFrame.scene.includeSphere = false;
        const auto empty = measure({{-1, -0.18, 4}, {0, 0, -1}}, sphereFrame, 0);
        check(empty[1] == 6, "GPU empty scene has an explicit stop reason");
        const auto materials = measure({}, frame, 1);
        std::array<int, 5> counts{};
        for (std::size_t index = 0; index < materials.size(); index += 4) {
            const int id = static_cast<int>(materials[index + 2]);
            if (id >= 0 && id <= 4)
                ++counts[static_cast<std::size_t>(id)];
        }
        for (int id = 1; id <= 4; ++id) {
            std::cout << "Visible material " << id << ": " << counts[static_cast<std::size_t>(id)] << " pixels\n";
            check(counts[static_cast<std::size_t>(id)] >= 12, "all required primitives and room are visible in default scene");
        }
        // Pixel probes kiểm cả quy ước gốc ảnh: readback có gốc dưới, CPU ở trên.
        for (int y = 8; y < target.height; y += 16) {
            for (int x = 8; x < target.width; x += 16) {
                const Ray ray = makeCameraRay(frame.camera, x, target.height - 1 - y, target.width, target.height);
                const auto reference = marchRay(ray, frame.settings, frame.scene);
                const std::size_t index = static_cast<std::size_t>((y * target.width + x) * 4);
                check(materials[index + 1] == static_cast<float>(reference.status) && materials[index + 2] == static_cast<float>(reference.materialId), "GPU camera and CPU reference agree on sampled status/material");
                check(std::abs(materials[index] - reference.traveled) < 0.02, "GPU sampled distance agrees with CPU within 0.02m");
            }
        }
        api.UseProgram(0);
        api.DeleteProgram(program);
    }
#endif
    check(renderer.reload(api, sources, diagnostics), "valid reload commits a new generation");
    check(renderer.generation == generation + 1, "successful reload increments generation exactly once");
    check(api.IsProgram(lastGood) == GL_FALSE, "previous active program is deleted after commit");
    const GLuint finalProgram = renderer.activeProgram.program;
    const GLuint finalArray = renderer.vertexArray;
    renderer.destroy(api);
    check(api.IsProgram(finalProgram) == GL_FALSE, "final scene program is deleted before context destruction");
    check(api.IsVertexArray(finalArray) == GL_FALSE, "fullscreen VAO is deleted before context destruction");
    check(api.GetError() == GL_NO_ERROR, "no OpenGL errors in verification");
    std::cout << checks << " GPU checks, " << failures << " failures\n";
    return failures == 0;
}

} // namespace lab
