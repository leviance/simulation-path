#version 330 core

layout (location = 0) in vec3 aPosition;
layout (location = 1) in vec3 aColor;

uniform mat4 uMvp;

out vec3 vColor;
out vec3 vLocalPosition;

void main() {
    vColor = aColor;
    vLocalPosition = aPosition;
    gl_Position = uMvp * vec4(aPosition, 1.0);
}
