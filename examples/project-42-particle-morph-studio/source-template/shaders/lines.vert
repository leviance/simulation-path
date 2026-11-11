#version 430 core
layout(location = 0) in vec3 position;
layout(location = 1) in vec3 tint;
uniform mat4 transform;
out vec3 lineColor;
void main() {
    lineColor = tint;
    gl_Position = transform * vec4(position, 1.0);
}
