#version 430 core

#if LAB_CHECKPOINT >= 5
in float vAge01;
in float vSpeed01;

layout(location = 0) out vec4 outputColor;

void main() {
    vec2 centered = gl_PointCoord - vec2(0.5);
    float radiusSquared = dot(centered, centered);
    if (radiusSquared > 0.25) {
        discard;
    }

    vec3 cool = vec3(0.16, 0.58, 1.0);
    vec3 hot = vec3(1.0, 0.72, 0.25);
    vec3 color = mix(cool, hot, vSpeed01);
    float softEdge = 1.0 - smoothstep(0.12, 0.25, radiusSquared);
    float lifetimeFade = 1.0 - smoothstep(0.72, 1.0, vAge01);
    outputColor = vec4(color, softEdge * lifetimeFade * 0.34);
}
#endif
