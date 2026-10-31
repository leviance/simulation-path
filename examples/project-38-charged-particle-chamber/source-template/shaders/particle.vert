#version 430 core

#ifndef LAB_CHECKPOINT
#define LAB_CHECKPOINT 12
#endif
#if LAB_CHECKPOINT >= 6
struct Particle { vec4 positionCharge; vec4 velocityMass; };
layout(std430, binding = 0) readonly buffer State { Particle particles[]; };
uniform mat4 uViewProjection;
uniform vec3 uEye;
uniform float uOpacity;
uniform bool uColorBySpeed;
uniform float uChargeScale;
uniform float uPixelScale;
uniform float uDpr;
uniform int uRenderPass;
uniform uint uCount;
uniform uint uDrawStride;
out vec3 color;
out float opacity;
out vec3 lightDirection;
out float depthCue;
flat out float viewDepth;
flat out float glyphRadius;
void main() {
    uint id = uint(gl_VertexID);
    if (uDrawStride > 1u) id = (id / 2u) * uDrawStride + (id & 1u);
    if (id >= uCount) {
        gl_Position = vec4(2, 2, 2, 1);
        gl_PointSize = 1;
        return;
    }
    Particle p = particles[id];
    vec3 positive = vec3(1.0, 0.31, 0.09);
    vec3 negative = vec3(0.06, 0.58, 0.95);
    color = positive;
    if (p.positionCharge.w * uChargeScale < 0.0) color = negative;
    if (uChargeScale == 0.0) color = vec3(0.65, 0.7, 0.75);
    if (uColorBySpeed) color = mix(vec3(0.22, 0.46, 1.0), vec3(1.0, 0.78, 0.20), clamp(length(p.velocityMass.xyz) / 5.0, 0.0, 1.0));
    float distanceToEye = length(p.positionCharge.xyz - uEye);
    opacity = uOpacity * exp(-0.018 * distanceToEye);
    gl_Position = uViewProjection * vec4(p.positionCharge.xyz, 1.0);
    viewDepth = max(gl_Position.w, 0.051);
    depthCue = clamp(pow(max(abs(uViewProjection[3][3]), 1.0) / viewDepth, 3.0), 0.2, 1.25);
    float diameter = clamp(0.025 * uPixelScale / viewDepth, 1.2 * uDpr, 7.0 * uDpr);
    glyphRadius = diameter * viewDepth / uPixelScale;
    gl_PointSize = diameter;
    if (uRenderPass == 1) gl_PointSize = min(diameter * 2.4, 12.0 * uDpr);

    // Camera basis comes from the MVP rows; it does not change the particle state.
    vec3 right = normalize(vec3(uViewProjection[0][0], uViewProjection[1][0], uViewProjection[2][0]));
    vec3 up = normalize(vec3(uViewProjection[0][1], uViewProjection[1][1], uViewProjection[2][1]));
    vec3 towardEye = cross(right, up);
    vec3 light = normalize(vec3(-5.0, 9.0, -5.0) - p.positionCharge.xyz);
    lightDirection = vec3(dot(light, right), dot(light, up), dot(light, towardEye));
}
#endif
