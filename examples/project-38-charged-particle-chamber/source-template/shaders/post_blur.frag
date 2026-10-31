#version 430 core

#ifndef LAB_CHECKPOINT
#define LAB_CHECKPOINT 12
#endif
#if LAB_CHECKPOINT >= 12
in vec2 texCoord;
uniform sampler2D uSource;
uniform vec2 uDirection;
out vec4 fragment;
void main() {
    const float weights[5] = float[](0.227027, 0.194595, 0.121622, 0.054054, 0.016216);
    vec3 color = texture(uSource, texCoord).rgb * weights[0];
    for (int offset = 1; offset < 5; ++offset) {
        color += texture(uSource, texCoord + uDirection * offset).rgb * weights[offset];
        color += texture(uSource, texCoord - uDirection * offset).rgb * weights[offset];
    }
    fragment = vec4(color, 1);
}
#endif
