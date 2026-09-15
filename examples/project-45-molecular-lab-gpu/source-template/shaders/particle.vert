#version 430 core
layout(std430, binding = 0) readonly buffer Positions { vec4 positions[]; };
layout(std430, binding = 1) readonly buffer Velocities { vec4 velocities[]; };
uniform uint uStride;
uniform vec2 uCenter;
uniform vec2 uHalfExtent;
out vec3 color;

void main() {
    uint i = uint(gl_VertexID) * uStride;
    vec2 point = (positions[i].xy - uCenter) / uHalfExtent;
    gl_Position = vec4(point, 0, 1);
    gl_PointSize = 3.0;
    color = mix(vec3(0.2, 0.8, 0.9), vec3(1.0, 0.65, 0.3), clamp(length(velocities[i].xy), 0.0, 1.0));
}
