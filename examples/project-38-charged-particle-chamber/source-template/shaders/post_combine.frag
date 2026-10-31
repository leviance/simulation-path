#version 430 core

#ifndef LAB_CHECKPOINT
#define LAB_CHECKPOINT 12
#endif
#if LAB_CHECKPOINT >= 12
in vec2 texCoord;
uniform sampler2D uSource;
uniform sampler2D uBloom;
out vec4 fragment;
void main() {
    vec3 hdr = texture(uSource, texCoord).rgb + texture(uBloom, texCoord).rgb * 0.5;
    vec3 mapped = (hdr * (2.51 * hdr + 0.03)) / (hdr * (2.43 * hdr + 0.59) + 0.14);
    fragment = vec4(pow(clamp(mapped, 0.0, 1.0), vec3(1.0 / 2.2)), 1);
}
#endif
