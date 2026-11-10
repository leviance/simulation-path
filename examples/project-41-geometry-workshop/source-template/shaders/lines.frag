#version 330 core

in vec3 lineColor;
out vec4 color;

void main() {
    color = vec4(lineColor, 1.0);
}
