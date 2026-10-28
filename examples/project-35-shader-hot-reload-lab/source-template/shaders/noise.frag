#version 330 core
uniform float uTime;
uniform vec2 uResolution;
uniform vec2 uMouse;
uniform float uZoom;
out vec4 fragColor;

const float SPEED = 0.18;

#if LAB_CHECKPOINT >= 9
float hashCell(ivec2 cell) {
    uvec2 p = uvec2(cell);
    uint h = p.x * 374761393u + p.y * 668265263u;
    h = (h ^ (h >> 13u)) * 1274126177u;
    h = h ^ (h >> 16u);
    return float(h & 65535u) / 65535.0;
}

float valueNoise(vec2 p) {
    ivec2 cell = ivec2(floor(p));
    vec2 f = fract(p);
    vec2 smoothF = f * f * (3.0 - 2.0 * f);
    float bottom = mix(hashCell(cell), hashCell(cell + ivec2(1, 0)), smoothF.x);
    float top = mix(hashCell(cell + ivec2(0, 1)), hashCell(cell + ivec2(1, 1)), smoothF.x);
    return mix(bottom, top, smoothF.y);
}

float fbm(vec2 p) {
    float result = 0.0;
    float amplitude = 0.5;
    for (int octave = 0; octave < 5; ++octave) {
        result += amplitude * valueNoise(p);
        p = p * 2.03 + vec2(1.7, -2.1);
        amplitude *= 0.5;
    }
    return result;
}
#endif

void main() {
    vec2 uv = gl_FragCoord.xy / max(uResolution, vec2(1.0));
#if LAB_CHECKPOINT >= 9
    vec2 p = (2.0 * gl_FragCoord.xy - uResolution) / min(uResolution.x, uResolution.y);
    p = p * (2.2 * uZoom) + (uMouse / uResolution - 0.5) * 2.0;
    vec2 flow = vec2(uTime * SPEED, -uTime * SPEED * 0.7);
    float warp = fbm(p + flow);
    float n = fbm(p + vec2(warp * 2.5, -warp * 1.8) - flow);
    vec3 color = mix(vec3(0.025, 0.045, 0.13), vec3(0.09, 0.69, 0.72), smoothstep(0.15, 0.78, n));
    color += vec3(0.82, 0.37, 0.12) * pow(max(0.0, n), 5.0);
    fragColor = vec4(color, 1.0);
#elif LAB_CHECKPOINT >= 6
    float glow = exp(-20.0 * dot(uv - uMouse / uResolution, uv - uMouse / uResolution));
    fragColor = vec4(uv.x, uv.y, 0.3 + 0.1 * sin(uTime) + 0.05 * glow * uZoom, 1.0);
#else
    fragColor = vec4(uv.x, uv.y, 0.3, 1.0);
#endif
}
