#version 330 core
layout(location = 0) out vec4 color;
uniform sampler2D uResult;
uniform vec2 uDisplaySize;
uniform vec2 uOffset;

void main() {
    vec2 uv = (gl_FragCoord.xy - uOffset) / uDisplaySize;
    vec4 value = texture(uResult, uv);
    if (value.a < 0.0) {
        color = vec4(1, 0, 1, 1);
        return;
    }
    // Compose in linear space first; this is a display approximation, not sRGB calibration.
    vec3 linearColor = value.rgb + value.a * vec3(0.025, 0.035, 0.055);
    color = vec4(pow(clamp(linearColor, 0.0, 1.0), vec3(1.0 / 2.2)), 1);
}
