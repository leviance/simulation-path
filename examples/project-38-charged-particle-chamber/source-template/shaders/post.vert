#version 430 core

#ifndef LAB_CHECKPOINT
#define LAB_CHECKPOINT 12
#endif
#if LAB_CHECKPOINT >= 12
out vec2 texCoord;
void main() {
    vec2 point = vec2(-1.0, -1.0);
    if (gl_VertexID == 1) point = vec2(3.0, -1.0);
    if (gl_VertexID == 2) point = vec2(-1.0, 3.0);
    texCoord = point * 0.5 + 0.5;
    gl_Position = vec4(point, 0, 1);
}
#endif
