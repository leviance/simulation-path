#version 330 core
// One oversized triangle covers the target without a vertex buffer.
const vec2 positions[3] = vec2[3](vec2(-1, -1), vec2(3, -1), vec2(-1, 3));

void main() {
    gl_Position = vec4(positions[gl_VertexID], 0, 1);
}
