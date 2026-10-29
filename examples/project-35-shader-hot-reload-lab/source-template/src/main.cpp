#include "shader_application.hpp"

int main(int argc, char** argv) {
    // Khởi tạo SDL/context và chạy gallery được thực hiện trong application.
    // Giải phóng program, overlay và context cũng do hàm này đảm nhiệm.

    return lab::runShaderApplication(argc, argv);
}
