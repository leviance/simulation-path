#version 430 core

#if LAB_CHECKPOINT >= 6
layout(std430, binding = 2) readonly buffer Current { vec4 current[]; };
layout(std430, binding = 3) readonly buffer Paths { vec4 paths[]; };
#else
layout(location = 0) in vec4 particle;
layout(location = 1) in vec4 trajectory;
#endif
uniform mat4 transform;
uniform float viewportHeight;
uniform float pointScale;
out float density;
out float variation;
out float depthShade;

void main() {
#if LAB_CHECKPOINT >= 6
    vec4 point = current[gl_VertexID];
    density = paths[gl_VertexID].w;
#else
    vec4 point = particle;
    density = trajectory.w;
#endif
    variation = fract(point.w * 0.61803398875);
    gl_Position = transform * vec4(point.xyz, 1.0);
    depthShade = clamp((11.0 - gl_Position.w) / 6.0, 0.28, 1.0);
    gl_PointSize = clamp(pointScale * viewportHeight / max(0.05, gl_Position.w), 1.0, 18.0);
}
