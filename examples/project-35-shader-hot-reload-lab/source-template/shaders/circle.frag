#version 330 core
uniform float uTime;
uniform vec2 uResolution;
uniform vec2 uMouse;
uniform float uZoom;
out vec4 fragColor;

const float SPEED = 0.8;

void main() {
    vec2 uv = gl_FragCoord.xy / max(uResolution, vec2(1.0));
#if LAB_CHECKPOINT >= 7
    float unit = min(uResolution.x, uResolution.y);
    vec2 p = (2.0 * gl_FragCoord.xy - uResolution) / unit;
    vec2 center = (2.0 * uMouse - uResolution) / unit * 0.55;
    float radius = 0.50 * sqrt(uZoom);
    float distanceToCircle = length(p - center) - radius;
    float aa = 2.0 / unit;
    float disc = 1.0 - smoothstep(-aa, aa, distanceToCircle);
    float glow = exp(-abs(distanceToCircle) * 18.0);
    float waves = 0.5 + 0.5 * cos(length(p - center) * 22.0 - uTime * SPEED * 6.0);
    vec3 color = vec3(0.025, 0.04, 0.095);
    color += disc * mix(vec3(0.08, 0.20, 0.45), vec3(0.13, 0.65, 0.78), waves);
    color += vec3(0.30, 0.75, 0.95) * glow * 0.65;
    fragColor = vec4(color, 1.0);
#elif LAB_CHECKPOINT >= 6
    float glow = exp(-20.0 * dot(uv - uMouse / uResolution, uv - uMouse / uResolution));
    fragColor = vec4(uv.x, uv.y, 0.3 + 0.1 * sin(uTime) + 0.05 * glow * uZoom, 1.0);
#else
    fragColor = vec4(uv.x, uv.y, 0.3, 1.0);
#endif
}
