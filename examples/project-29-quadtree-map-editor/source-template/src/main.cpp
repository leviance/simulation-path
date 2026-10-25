// Khởi tạo SDL và vòng event được runApplication quản lý trong app/application.hpp.
// Giải phóng texture, renderer và window ở cùng một nơi khi thoát hoặc có lỗi.

#include "app/application.hpp"

int main(int argc, char** argv) {
    return maplab::runApplication(argc, argv);
}
