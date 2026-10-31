#version 430 core
in vec3 color;
in float opacity;
out vec4 fragment;
void main() { fragment = vec4(color, opacity); }
