#version 330 core
#ifndef LAB_CHECKPOINT
#define LAB_CHECKPOINT 10
#endif
layout(location = 0) out vec4 screen;
uniform sampler2D uResult;
uniform vec2 uSize;
uniform vec2 uOffset;
#if LAB_CHECKPOINT >= 5
uniform vec3 uForward;
uniform vec3 uRight;
uniform vec3 uUp;
#endif
#if LAB_CHECKPOINT >= 6
uniform int uMode;
#endif
#if LAB_CHECKPOINT >= 7
uniform int uPalette;
#endif

#if LAB_CHECKPOINT >= 5
vec3 projectionColor(float density) {
#if LAB_CHECKPOINT >= 7
    const vec3 warm[5] = vec3[5](vec3(0.42, 0.55, 0.70), vec3(0.68, 0.78, 0.88), vec3(0.88, 0.91, 0.95), vec3(0.98, 0.97, 0.93), vec3(1.0, 0.98, 0.90));
    const vec3 cool[5] = vec3[5](vec3(0.07, 0.16, 0.24), vec3(0.08, 0.49, 0.57), vec3(0.35, 0.78, 0.74), vec3(1.0, 0.55, 0.22), vec3(1.0, 0.92, 0.72));
    if (uPalette == 2) return vec3(1.0);
    float position = clamp(density, 0.0, 1.0) * 4.0;
    int first = min(3, int(position));
    if (uPalette == 1) return mix(cool[first], cool[first + 1], position - float(first));
    return mix(warm[first], warm[first + 1], position - float(first));
#else
    return vec3(1.0);
#endif
}

// The horizon follows the camera. It is outside the texture and never enters the measurement.
vec3 background(vec2 uv) {
    float tangent = tan(radians(50.0) * 0.5);
    vec3 direction = normalize(uForward + uRight * ((2.0 * uv.x - 1.0) * (uSize.x / uSize.y) * tangent) + uUp * ((2.0 * uv.y - 1.0) * tangent));
    vec3 horizon = vec3(0.17, 0.29, 0.42);
    vec3 color = mix(horizon, vec3(0.029, 0.106, 0.235), smoothstep(-0.12, 0.67, direction.y));
    color = mix(color, vec3(0.065, 0.143, 0.225), smoothstep(0.0, 0.66, -direction.y));
    return color;
}
#endif

void main() {
    vec2 uv = (gl_FragCoord.xy - uOffset) / uSize;
    vec4 raw = texture(uResult, uv);
#if LAB_CHECKPOINT < 5
    vec3 linear = raw.rgb;
#else
    vec3 bg = background(uv);
    // MIP/average carry scalar, not a physical transmittance.
    vec3 linear = mix(bg, projectionColor(raw.r), clamp(raw.r, 0.0, 1.0));
#if LAB_CHECKPOINT >= 6
    // [snippet present-alpha]
    if (uMode == 2) linear = raw.rgb + raw.a * bg;
    // [/snippet present-alpha]
#endif
    if (raw.a < 0.0) linear = vec3(1.0, 0.0, 1.0);
#endif
    screen = vec4(pow(clamp(linear, 0.0, 1.0), vec3(1.0 / 2.2)), 1.0);
}
