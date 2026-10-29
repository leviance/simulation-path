#pragma once
#include "shader_program.hpp"
#include "room_frame.hpp"

namespace lab {

struct UniformLocations {
    GLint resolution{-1};
    GLint cameraPosition{-1};
    GLint forward{-1};
    GLint right{-1};
    GLint up{-1};
    GLint tangent{-1};
    GLint maximumSteps{-1};
    GLint hitEpsilon{-1};
    GLint maximumDistance{-1};
    GLint normalEpsilon{-1};
    GLint sphereRadius{-1};
    GLint torusRadius{-1};
    GLint mask{-1};
    GLint time{-1};
    GLint debugView{-1};
    bool operator==(const UniformLocations&) const = default;
};

inline UniformLocations locateUniforms(GlApi& api, GLuint program) {
    UniformLocations locations{};
    locations.resolution = api.GetUniformLocation(program, "uResolution");
    locations.cameraPosition = api.GetUniformLocation(program, "uCameraPosition");
    locations.forward = api.GetUniformLocation(program, "uCameraForward");
    locations.right = api.GetUniformLocation(program, "uCameraRight");
    locations.up = api.GetUniformLocation(program, "uCameraUp");
    locations.tangent = api.GetUniformLocation(program, "uTanHalfFov");
    locations.maximumSteps = api.GetUniformLocation(program, "uMaximumSteps");
    locations.hitEpsilon = api.GetUniformLocation(program, "uHitEpsilon");
    locations.maximumDistance = api.GetUniformLocation(program, "uMaximumDistance");
    locations.normalEpsilon = api.GetUniformLocation(program, "uNormalEpsilon");
    locations.sphereRadius = api.GetUniformLocation(program, "uSphereRadius");
    locations.torusRadius = api.GetUniformLocation(program, "uTorusMinorRadius");
    locations.mask = api.GetUniformLocation(program, "uPrimitiveMask");
    locations.time = api.GetUniformLocation(program, "uTime");
    locations.debugView = api.GetUniformLocation(program, "uDebugView");
    return locations;
}

inline bool validateUniforms(GlApi& api, GLuint program, UniformLocations& locations, std::string& diagnostics) {
    const bool cameraActive = LAB_CHECKPOINT == 2 || LAB_CHECKPOINT >= 4;
    struct Requirement {
        const char* name;
        GLenum type;
        bool required;
        GLint* location;
    };
    const Requirement requirements[]{
        {"uResolution", GL_FLOAT_VEC2, LAB_CHECKPOINT >= 1, &locations.resolution},
        {"uCameraPosition", GL_FLOAT_VEC3, LAB_CHECKPOINT >= 4, &locations.cameraPosition},
        {"uCameraForward", GL_FLOAT_VEC3, cameraActive, &locations.forward},
        {"uCameraRight", GL_FLOAT_VEC3, cameraActive, &locations.right},
        {"uCameraUp", GL_FLOAT_VEC3, cameraActive, &locations.up},
        {"uTanHalfFov", GL_FLOAT, cameraActive, &locations.tangent},
        {"uMaximumSteps", GL_INT, LAB_CHECKPOINT >= 4, &locations.maximumSteps},
        {"uHitEpsilon", GL_FLOAT, LAB_CHECKPOINT >= 4, &locations.hitEpsilon},
        {"uMaximumDistance", GL_FLOAT, LAB_CHECKPOINT >= 4, &locations.maximumDistance},
        {"uNormalEpsilon", GL_FLOAT, LAB_CHECKPOINT >= 5, &locations.normalEpsilon},
        {"uSphereRadius", GL_FLOAT, LAB_CHECKPOINT >= 3, &locations.sphereRadius},
        {"uTorusMinorRadius", GL_FLOAT, LAB_CHECKPOINT >= 6, &locations.torusRadius},
        {"uPrimitiveMask", GL_INT, LAB_CHECKPOINT >= 6, &locations.mask},
        {"uTime", GL_FLOAT, LAB_CHECKPOINT >= 8, &locations.time},
        {"uDebugView", GL_INT, LAB_CHECKPOINT >= 10, &locations.debugView},
    };
    for (const auto& item : requirements) {
        if (!findUniform(api, program, item.name, item.type, item.required, *item.location, diagnostics)) {
            return false;
        }
    }
    return true;
}

inline int primitiveMask(const SceneOptions& scene) {
    int mask = 0;
    if (scene.includeSphere) {
        mask |= 1;
    }
    if (scene.includeBox) {
        mask |= 2;
    }
    if (scene.includeTorus) {
        mask |= 4;
    }
    if (scene.includeRoom) {
        mask |= 8;
    }
    return mask;
}

inline void uploadUniforms(GlApi& api, const UniformLocations& locations, const RayMarchFrame& frame, int width, int height) {
    const Vec3 forward = cameraForward(frame.camera);
    const Vec3 right = cameraRight(frame.camera);
    const Vec3 up = cameraUp(frame.camera);
    api.Uniform2f(locations.resolution, static_cast<float>(width), static_cast<float>(height));
    api.Uniform3f(locations.cameraPosition, static_cast<float>(frame.camera.position.x), static_cast<float>(frame.camera.position.y), static_cast<float>(frame.camera.position.z));
    api.Uniform3f(locations.forward, static_cast<float>(forward.x), static_cast<float>(forward.y), static_cast<float>(forward.z));
    api.Uniform3f(locations.right, static_cast<float>(right.x), static_cast<float>(right.y), static_cast<float>(right.z));
    api.Uniform3f(locations.up, static_cast<float>(up.x), static_cast<float>(up.y), static_cast<float>(up.z));
    api.Uniform1f(locations.tangent, static_cast<float>(std::tan(frame.camera.verticalFieldOfViewRadians * 0.5)));
    api.Uniform1i(locations.maximumSteps, frame.settings.maximumSteps);
    api.Uniform1f(locations.hitEpsilon, static_cast<float>(frame.settings.hitEpsilon));
    api.Uniform1f(locations.maximumDistance, static_cast<float>(frame.settings.maximumDistance));
    api.Uniform1f(locations.normalEpsilon, static_cast<float>(frame.settings.normalEpsilon));
    api.Uniform1f(locations.sphereRadius, static_cast<float>(frame.scene.sphereRadius));
    api.Uniform1f(locations.torusRadius, static_cast<float>(frame.scene.torusMinorRadius));
    api.Uniform1i(locations.mask, primitiveMask(frame.scene));
    api.Uniform1f(locations.time, static_cast<float>(frame.elapsedSeconds));
    api.Uniform1i(locations.debugView, frame.debugView);
    // OpenGL bỏ qua location=-1: uniform chưa được dùng ở checkpoint hiện tại.
}

} // namespace lab
