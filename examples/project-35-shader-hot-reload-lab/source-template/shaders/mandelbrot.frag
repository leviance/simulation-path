#version 330 core
uniform float uTime;
uniform vec2 uResolution;
uniform vec2 uMouse;
uniform float uZoom;
out vec4 fragColor;

const float SPEED = 0.12;

void main() {
    vec2 uv = gl_FragCoord.xy / max(uResolution, vec2(1.0));
#if LAB_CHECKPOINT >= 8
    vec2 p = (2.0 * gl_FragCoord.xy - uResolution) / min(uResolution.x, uResolution.y);
    vec2 mouse = uMouse / uResolution - 0.5;
    vec2 c = vec2(-0.60, 0.0) + p * (1.35 / uZoom) + mouse * vec2(0.70, 0.50);
    vec2 z = vec2(0.0);
    int escaped = 0;
    for (int iteration = 0; iteration < 128; ++iteration) {
        z = vec2(z.x * z.x - z.y * z.y, 2.0 * z.x * z.y) + c;
        if (dot(z, z) > 4.0) { escaped = iteration + 1; break; }
    }
    vec3 color = vec3(0.012, 0.018, 0.045);
    if (escaped > 0) {
        float smoothCount = float(escaped) + 1.0 - log2(max(0.001, log2(length(z))));
        float phase = 0.035 * smoothCount + uTime * SPEED;
        color = 0.5 + 0.5 * cos(6.2831853 * (phase + vec3(0.0, 0.18, 0.39)));
        color *= 0.45 + 0.55 * (1.0 - exp(-float(escaped) * 0.08));
    }
    fragColor = vec4(color, 1.0);
#elif LAB_CHECKPOINT >= 6
    float glow = exp(-20.0 * dot(uv - uMouse / uResolution, uv - uMouse / uResolution));
    fragColor = vec4(uv.x, uv.y, 0.3 + 0.1 * sin(uTime) + 0.05 * glow * uZoom, 1.0);
#else
    fragColor = vec4(uv.x, uv.y, 0.3, 1.0);
#endif
}
