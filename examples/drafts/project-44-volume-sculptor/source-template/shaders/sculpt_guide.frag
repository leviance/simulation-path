#version 430 core
in vec3 lineColor;
out vec4 pixel;
void main() { pixel = vec4(lineColor,1); }
