#version 330 core
// Chỉ nạp stage này khi đã có framebuffer dành riêng cho độ sâu.
#if LAB_CHECKPOINT >= 3

// [snippet write-depth]
void main() {
    // Không xuất màu, cũng không sửa gl_FragDepth. Khi bật depth test và
    // cho phép ghi depth, OpenGL giữ lại bề mặt gần nguồn sáng nhất.
}
// [/snippet write-depth]
#endif
