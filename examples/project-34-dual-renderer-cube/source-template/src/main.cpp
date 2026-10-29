#include "viewer-application.hpp"
#include "viewer-bootstrap.hpp"
#include <string>

// Source của từng checkpoint là một chương trình độc lập; không cần link project khác.
int main(int argc, char** argv) {
    // Khởi tạo SDL và context nằm trong hàm ứng với checkpoint đang học.
    // Giải phóng tài nguyên cũng thuộc hàm đó, trước khi trả mã thoát về main.

#if LAB_CHECKPOINT >= 3
    return lab::runViewerApplication(argc, argv);
#else
    if (argc > 2 || (argc == 2 && std::string(argv[1]) != "--smoke")) {
        return EXIT_FAILURE;
    }
    return lab::runViewerBootstrap(argc == 2);
#endif
}
