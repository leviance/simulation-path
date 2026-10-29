#include "app/application.hpp"
#include <cstdlib>
#include <exception>
#include <iostream>

int main(int argc, char** argv) {
    // Khởi tạo SDL và vòng lặp khảo sát nằm trong runApplication.
    // Giải phóng tài nguyên cũng nằm ở đó; main chỉ đổi lỗi thành mã thoát.

    try {
        return survey::runApplication(argc, argv);
    } catch (const std::exception& error) {
        std::cerr << "Point Cloud Survey: " << error.what() << '\n';
        return EXIT_FAILURE;
    }
}
