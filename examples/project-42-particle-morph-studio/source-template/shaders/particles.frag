#version 430 core

in float density;
in float variation;
in float depthShade;
uniform float phase;
uniform int heatmap;
out vec4 color;

void main() {
    vec2 local = gl_PointCoord * 2.0 - 1.0;
    float radius2 = dot(local, local);
    if (radius2 > 1.0) discard;
    vec3 normal = vec3(local.x, -local.y, sqrt(max(0.0, 1.0 - radius2)));
    float light = 0.30 + 0.70 * max(0.0, dot(normal, normalize(vec3(-0.4, 0.7, 1.0))));
    vec3 tint;
    if (phase < 0.5) tint = mix(vec3(0.04, 0.83, 1.0), vec3(0.59, 0.28, 1.0), phase * 2.0);
    else tint = mix(vec3(0.59, 0.28, 1.0), vec3(1.0, 0.62, 0.16), phase * 2.0 - 1.0);
    if (heatmap == 1) {
        tint = mix(vec3(0.12, 0.66, 0.91), vec3(1.0, 0.25, 0.16), clamp((density - 0.5) / 1.5, 0.0, 1.0));
    }
    color = vec4(tint * light * depthShade * (0.90 + 0.10 * variation), 1.0);
}
