#version 430 core
out vec2 uv;
void main() {
    const vec2 points[6] = vec2[6](vec2(-1,-1),vec2(1,-1),vec2(1,1),vec2(-1,-1),vec2(1,1),vec2(-1,1));
    vec2 point = points[gl_VertexID];
    gl_Position = vec4(point,0,1);
    uv = 0.5 * (point + vec2(1));
}
