// Canonical GLSL templates, byte-checked against the C++ final snapshot.
export const defaultVertexShader = `#version 330 core

void main() {
    vec2 positions[3] = vec2[3](vec2(-1.0, -1.0), vec2(3.0, -1.0), vec2(-1.0, 3.0));
    gl_Position = vec4(positions[gl_VertexID], 0.0, 1.0);
}
`;

export const fragmentTemplates = {
  gradient: `#version 330 core
uniform float uTime;
uniform vec2 uResolution;
uniform vec2 uMouse;
uniform float uZoom;
out vec4 fragColor;

const float SPEED = 0.65;

void main() {
    vec2 uv = gl_FragCoord.xy / max(uResolution, vec2(1.0));
    vec2 mouse = uMouse / uResolution;
    float phase = uv.y + 0.18 * sin(uv.x * 5.0 * uZoom + uTime * SPEED);
    vec3 palette = 0.5 + 0.5 * cos(6.2831853 * (phase + vec3(0.0, 0.24, 0.44)));
    vec3 color = mix(vec3(0.025, 0.045, 0.13), palette, 0.25 + 0.65 * uv.y);
    color += vec3(0.12, 0.19, 0.20) * exp(-20.0 * dot(uv - mouse, uv - mouse));
    fragColor = vec4(color, 1.0);
}
`,
  circle: `#version 330 core
uniform float uTime;
uniform vec2 uResolution;
uniform vec2 uMouse;
uniform float uZoom;
out vec4 fragColor;

const float SPEED = 0.8;

void main() {
    vec2 uv = gl_FragCoord.xy / max(uResolution, vec2(1.0));
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
}
`,
  mandelbrot: `#version 330 core
uniform float uTime;
uniform vec2 uResolution;
uniform vec2 uMouse;
uniform float uZoom;
out vec4 fragColor;

const float SPEED = 0.12;

void main() {
    vec2 uv = gl_FragCoord.xy / max(uResolution, vec2(1.0));
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
}
`,
  noise: `#version 330 core
uniform float uTime;
uniform vec2 uResolution;
uniform vec2 uMouse;
uniform float uZoom;
out vec4 fragColor;

const float SPEED = 0.18;

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

void main() {
    vec2 uv = gl_FragCoord.xy / max(uResolution, vec2(1.0));
    vec2 p = (2.0 * gl_FragCoord.xy - uResolution) / min(uResolution.x, uResolution.y);
    p = p * (2.2 * uZoom) + (uMouse / uResolution - 0.5) * 2.0;
    vec2 flow = vec2(uTime * SPEED, -uTime * SPEED * 0.7);
    float warp = fbm(p + flow);
    float n = fbm(p + vec2(warp * 2.5, -warp * 1.8) - flow);
    vec3 color = mix(vec3(0.025, 0.045, 0.13), vec3(0.09, 0.69, 0.72), smoothstep(0.15, 0.78, n));
    color += vec3(0.82, 0.37, 0.12) * pow(max(0.0, n), 5.0);
    fragColor = vec4(color, 1.0);
}
`,
} as const;
