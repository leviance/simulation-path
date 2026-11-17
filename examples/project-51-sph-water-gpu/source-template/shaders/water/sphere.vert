#version 430 core
#include "shared/camera.glsl"

layout(std430, binding = 0) readonly buffer Positions {
    vec4 position[];
};

layout(std430, binding = 1) readonly buffer Velocities {
    vec4 velocity[];
};

layout(std430, binding = 2) readonly buffer Fields {
    vec2 field[];
};

uniform float radius;
flat out vec3 center;
flat out vec2 diagnostic;

// [snippet billboard]
void main() {
    const vec2 quad[6] = vec2[6](vec2(-1, -1), vec2(1, -1), vec2(1, 1), vec2(-1, -1), vec2(1, 1), vec2(-1, 1));
    uint i = uint(gl_InstanceID);
    center = position[i].xyz;
    diagnostic = vec2(field[i].x, length(velocity[i].xyz));
    vec3 delta = center - eye;
    float z = dot(delta, forward);
    vec2 pixel = vec2(dot(delta, right), dot(delta, up)) * focal / max(z, .04);
    float pixels = radius * focal / max(z - radius, .04);
    vec2 ndc = (pixel + quad[gl_VertexID] * pixels) * 2.0 / viewport;
    gl_Position = vec4(ndc, 0, 1);
}

// [/snippet billboard]
