#version 330 core
// Chỉ nạp stage này khi đã có framebuffer dành riêng cho độ sâu.
#if LAB_CHECKPOINT >= 3

layout(location = 0) in vec3 aPosition;
uniform mat4 uModel;
uniform mat4 uLightVP;

// [snippet light-clip]
void main() {
    vec4 world = uModel * vec4(aPosition, 1.0);
    gl_Position = uLightVP * world;
}
// [/snippet light-clip]
#endif
