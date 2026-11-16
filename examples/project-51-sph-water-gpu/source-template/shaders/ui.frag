#version 430 core
in vec3 tint;
out vec4 fragment;

void main() {
    fragment = vec4(tint, 1.0);
}
