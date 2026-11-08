#version 430 core
layout(location=0) in vec3 aPosition;
uniform mat4 uViewProjection;
out vec3 vWorld;
void main() {
    vWorld = aPosition;
    gl_Position = uViewProjection * vec4(aPosition,1.0);
}
