#version 430 core
in vec3 color;
out vec4 fragmentColor;

void main() {
    vec2 offset = gl_PointCoord * 2.0 - 1.0;
    if (dot(offset, offset) > 1.0) {
        discard;
    }
    fragmentColor = vec4(color, 1);
}
