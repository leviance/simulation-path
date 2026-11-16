#version 430 core
#include "camera.glsl"
flat in vec3 centerEye;
flat in vec3 particleColor;
flat in float radius;
uniform int uMode;
out vec4 fragment;

// [snippet sphere-fragment]
void main() {
    vec2 local = vec2(gl_PointCoord.x * 2.0 - 1.0, 1.0 - gl_PointCoord.y * 2.0);
    vec3 ray = normalize(centerEye + vec3(local * radius * 1.15, 0.0));
    float projected = dot(ray, centerEye);
    // Dùng khoảng cách vuông góc để tránh trừ hai số lớn gần bằng nhau.
    vec3 perpendicular = cross(ray, centerEye);
    float discriminant = radius * radius - dot(perpendicular, perpendicular);
    if (discriminant < 0.0)
        discard;
    float distance = projected - sqrt(discriminant);
    if (distance <= 0.0)
        discard;
    vec3 hit = distance * ray;
    vec3 normal = normalize(hit - centerEye);
    vec4 clip = eyeToClip(hit);
    float depth = 0.5 * clip.z / clip.w + 0.5;
    if (depth < 0.0 || depth > 1.0)
        discard;
    gl_FragDepth = depth;
    vec3 light = normalize(vec3(-0.45, 0.8, 0.6));
    vec3 towardEye = -ray;
    float diffuse = max(0.0, dot(normal, light));
    float rim = pow(1.0 - max(0.0, dot(normal, towardEye)), 3.0);
    float highlight = pow(max(0.0, dot(normal, normalize(light + towardEye))), 70.0);
    vec3 color = particleColor * (0.42 + 0.58 * diffuse);
    color += vec3(0.31, 0.67, 0.85) * rim * 0.55;
    color += vec3(0.95, 0.99, 1.0) * highlight * 0.18;
    if (uMode == 4)
        color = particleColor;
    fragment = vec4(color, 1.0);
}

// [/snippet sphere-fragment]
