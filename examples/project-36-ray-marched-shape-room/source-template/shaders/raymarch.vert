#version 330 core

out vec2 vNdc;

void main() {
    // Một triangle phủ kín viewport; gl_VertexID thay cho VBO của object mesh.
    vec2 positions[3] = vec2[](
        vec2(-1.0, -1.0),
        vec2(3.0, -1.0),
        vec2(-1.0, 3.0)
    );
    vec2 position = positions[gl_VertexID];
    vNdc = position;
    gl_Position = vec4(position, 0.0, 1.0);
}
