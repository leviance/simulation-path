#version 430 core
layout(location = 0) in vec3 aPosition;
layout(location = 1) in vec3 aColor;
layout(location = 2) in float aAlpha;
uniform mat4 uViewProjection;
out vec3 color;
out float opacity;
void main() {
    color = aColor;
    opacity = aAlpha;
    gl_Position = uViewProjection * vec4(aPosition, 1.0);
    gl_PointSize = 4.0;
}
