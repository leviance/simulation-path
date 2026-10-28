#version 330 core
uniform float uTime;
uniform vec2 uResolution;
uniform vec2 uMouse;
uniform float uZoom;
out vec4 fragColor;

const float SPEED = 0.65;

void main() {
    vec2 uv = gl_FragCoord.xy / max(uResolution, vec2(1.0));
#if LAB_CHECKPOINT >= 7
    vec2 mouse = uMouse / uResolution;
    float phase = uv.y + 0.18 * sin(uv.x * 5.0 * uZoom + uTime * SPEED);
    vec3 palette = 0.5 + 0.5 * cos(6.2831853 * (phase + vec3(0.0, 0.24, 0.44)));
    vec3 color = mix(vec3(0.025, 0.045, 0.13), palette, 0.25 + 0.65 * uv.y);
    color += vec3(0.12, 0.19, 0.20) * exp(-20.0 * dot(uv - mouse, uv - mouse));
    fragColor = vec4(color, 1.0);
#elif LAB_CHECKPOINT >= 6
    float glow = exp(-20.0 * dot(uv - uMouse / uResolution, uv - uMouse / uResolution));
    fragColor = vec4(uv.x, uv.y, 0.3 + 0.1 * sin(uTime) + 0.05 * glow * uZoom, 1.0);
#else
    fragColor = vec4(uv.x, uv.y, 0.3, 1.0);
#endif
}
