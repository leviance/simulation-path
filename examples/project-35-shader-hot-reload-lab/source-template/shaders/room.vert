#version 330 core

layout(location = 0) in vec3 aPosition;
layout(location = 1) in vec3 aNormal;
uniform mat4 uModel;
uniform mat4 uCameraVP;

out vec3 vWorld;
out vec3 vNormal;
out vec3 vLocal;
#if LAB_CHECKPOINT >= 4
uniform mat4 uLightVP;
out vec4 vLightClip;
#endif

void main() {
    vec4 world = uModel * vec4(aPosition, 1.0);
    vWorld = world.xyz;
    vLocal = aPosition;
    // Một khối lập phương được kéo thành sàn hoặc nan cửa. Pháp tuyến không
    // biến đổi giống điểm khi các trục bị kéo dài không đều.
    vNormal = transpose(inverse(mat3(uModel))) * aNormal;
    gl_Position = uCameraVP * world;
#if LAB_CHECKPOINT >= 4
    vLightClip = uLightVP * world;
#endif
}
