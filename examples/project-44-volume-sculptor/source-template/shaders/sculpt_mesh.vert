#version 430 core
layout(location = 0) in vec3 position;
layout(location = 1) in vec3 normal;
uniform vec3 cameraEye;
uniform vec3 cameraRight;
uniform vec3 cameraUp;
uniform vec3 cameraForward;
uniform float tanHalfFov;
uniform float aspect;
out vec3 worldPoint;
out vec3 worldNormal;

void main() {
    vec3 delta = position - cameraEye;
    vec3 view = vec3(dot(delta,cameraRight), dot(delta,cameraUp), dot(delta,cameraForward));
    const float nearPlane = 0.03;
    const float farPlane = 64.0;
    float a = (farPlane + nearPlane) / (farPlane - nearPlane);
    float b = -2.0 * farPlane * nearPlane / (farPlane - nearPlane);
    gl_Position = vec4(view.x / (tanHalfFov * aspect), view.y / tanHalfFov, a * view.z + b, view.z);
    worldPoint = position;
    worldNormal = normal;
}
