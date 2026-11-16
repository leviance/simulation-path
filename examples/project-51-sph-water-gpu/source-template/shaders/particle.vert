#version 430 core
#include "camera.glsl"

layout(std430, binding = 0) readonly buffer Positions {
    vec4 positions[];
};

layout(std430, binding = 1) readonly buffer Density {
    vec4 density[];
};

layout(std430, binding = 2) readonly buffer Velocities {
    vec4 velocities[];
};

uniform uint uStride;
uniform float uRadius;
uniform float uHeight;
uniform int uMode;
flat out vec3 centerEye;
flat out vec3 particleColor;
flat out float radius;

// [snippet sphere-vertex]
void main() {
    uint id = uint(gl_VertexID) * uStride;
    centerEye = worldToEye(positions[id].xyz);
    gl_Position = eyeToClip(centerEye);
    radius = uRadius;
    // Padding bao đường viền cầu ngoài trục nhìn; fragment tự tìm giao điểm.
    gl_PointSize = clamp(1.15 * radius * focalLength * uHeight / max(nearPlane, -centerEye.z), 1.0, 160.0);
    particleColor = vec3(0.025, 0.34, 0.67);
#if LAB_CHECKPOINT >= 5
    if (uMode == 1) {
        float t = clamp((density[id].x / 1000.0 - 0.6) / 0.6, 0.0, 1.0);
        particleColor = mix(vec3(0.12, 0.36, 0.88), vec3(1.0, 0.58, 0.13), t);
    }
#endif
#if LAB_CHECKPOINT >= 6
    if (uMode == 2) {
        float t = clamp(density[id].y / 60000.0, 0.0, 1.0);
        particleColor = mix(vec3(0.08, 0.16, 0.30), vec3(1.0, 0.36, 0.14), t);
    }
    if (uMode == 3) {
        float t = clamp(length(velocities[id].xyz) / 4.0, 0.0, 1.0);
        particleColor = mix(vec3(0.06, 0.27, 0.51), vec3(0.48, 0.94, 0.87), t);
    }
#endif
}

// [/snippet sphere-vertex]
