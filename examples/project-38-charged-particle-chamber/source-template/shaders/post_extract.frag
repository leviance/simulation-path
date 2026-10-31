#version 430 core

#ifndef LAB_CHECKPOINT
#define LAB_CHECKPOINT 12
#endif
#if LAB_CHECKPOINT >= 12
in vec2 texCoord;
uniform sampler2D uSource;
out vec4 fragment;
void main() {
    vec2 step = 0.5 / vec2(textureSize(uSource, 0));
    vec3 color = (texture(uSource, texCoord + step).rgb + texture(uSource, texCoord - step).rgb
        + texture(uSource, texCoord + vec2(step.x, -step.y)).rgb
        + texture(uSource, texCoord + vec2(-step.x, step.y)).rgb) * 0.25;
    float peak = max(color.r, max(color.g, color.b));
    fragment = vec4(color * max(0.0, peak - 0.9) / max(peak, 0.00001), 1);
}
#endif
