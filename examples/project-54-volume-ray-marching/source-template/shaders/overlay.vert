#version 330 core
layout(location = 0) in vec2 position;
layout(location = 1) in vec4 color;
uniform vec2 uViewport;
out vec4 tint;
void main() {
    gl_Position = vec4(2.0 * position.x / uViewport.x - 1.0, 1.0 - 2.0 * position.y / uViewport.y, 0.0, 1.0);
    tint = color;
}
