#version 330 core

in vec3 vColor;
in vec3 vLocalPosition;

#if LAB_CHECKPOINT >= 6
uniform float uTime;
uniform vec2 uResolution;
uniform vec2 uMouse;
#endif

out vec4 fragColor;

void main() {
#if LAB_CHECKPOINT >= 7
    vec2 p = vLocalPosition.xy;
    float rings = 0.5 + 0.5 * cos(length(p) * 18.0 - uTime * 4.0);
    vec2 safeResolution = max(uResolution, vec2(1.0));
    vec2 mouseUv = uMouse / safeResolution;
    vec2 fragmentUv = gl_FragCoord.xy / safeResolution;
    float mouseGlow = max(0.0, 1.0 - distance(fragmentUv, mouseUv) * 5.0);
    vec3 cold = vec3(0.08, 0.18, 0.42);
    vec3 hot = vec3(1.0, 0.42, 0.18);
    vec3 color = mix(cold, hot, rings) * (0.55 + 0.45 * vColor);
    color += vec3(0.10, 0.16, 0.20) * mouseGlow;
    fragColor = vec4(color, 1.0);
#elif LAB_CHECKPOINT >= 6
    vec2 safeResolution = max(uResolution, vec2(1.0));
    vec2 mouseUv = uMouse / safeResolution;
    vec2 fragmentUv = gl_FragCoord.xy / safeResolution;
    float mouseGlow = max(0.0, 1.0 - distance(fragmentUv, mouseUv) * 5.0);
    float pulse = 0.82 + 0.18 * sin(uTime * 2.0);
    fragColor = vec4(vColor * pulse + vec3(mouseGlow * 0.08), 1.0);
#else
    fragColor = vec4(vColor, 1.0);
#endif
}
