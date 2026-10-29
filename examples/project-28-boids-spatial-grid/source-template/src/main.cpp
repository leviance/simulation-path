// SDL resources, event routing and the finite diagnostic modes live in app/.
#include "app/application.hpp"

int main(int argc, char** argv) {
    // Khởi tạo SDL và xử lý input được gom trong app/application.hpp.
    // Giải phóng capture và tài nguyên cũng thuộc runApplication, kể cả nhánh lỗi.

    return lab::runApplication(argc, argv);
}
