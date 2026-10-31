#version 430 core

#ifndef LAB_CHECKPOINT
#define LAB_CHECKPOINT 12
#endif
#if LAB_CHECKPOINT >= 6
in vec3 color;
in float opacity;
in vec3 lightDirection;
in float depthCue;
flat in float viewDepth;
flat in float glyphRadius;
uniform int uRenderPass;
out vec4 fragment;
void main() {
    vec2 radius = 2.0 * gl_PointCoord - 1.0;
    float squared = dot(radius, radius);
    if (squared > 1.0) discard;
    float normalZ = sqrt(max(0.0, 1.0 - squared));
    float surfaceDepth = viewDepth - glyphRadius * normalZ;
    if (uRenderPass == 1) surfaceDepth = viewDepth - glyphRadius * 0.8;
    // A sphere impostor writes its front surface, not one flat point-center depth.
    const float nearPlane = 0.05;
    const float farPlane = 2000.0;
    float a = (farPlane + nearPlane) / (farPlane - nearPlane);
    float b = -2.0 * farPlane * nearPlane / (farPlane - nearPlane);
    gl_FragDepth = 0.5 + 0.5 * (a + b / max(surfaceDepth, nearPlane));
    if (uRenderPass == 1) {
        fragment = vec4(color, opacity * exp(-3.4 * squared));
        return;
    }
    vec3 normal = normalize(vec3(radius.x, -radius.y, normalZ));
    vec3 light = normalize(lightDirection);
    float diffuse = max(dot(normal, light), 0.0);
    float highlight = pow(max(dot(reflect(-light, normal), vec3(0, 0, 1)), 0.0), 20.0);
    vec3 lit = color * (0.2 + 0.85 * diffuse) + vec3(0.7, 0.83, 1.0) * highlight * 0.12;
    fragment = vec4(lit * depthCue * 1.3, 1.0);
}
#endif
