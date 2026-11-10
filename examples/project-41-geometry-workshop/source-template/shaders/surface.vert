#version 330 core

layout (location = 0) in vec3 position;
layout (location = 1) in vec3 normal;
layout (location = 2) in vec2 uv;

uniform mat4 viewProjection;
out vec3 worldPosition;
out vec3 surfaceNormal;
out vec2 surfaceUv;

void main() {
    worldPosition = position;
    surfaceNormal = normal;
    surfaceUv = uv;
    gl_Position = viewProjection * vec4(position, 1.0);
}
