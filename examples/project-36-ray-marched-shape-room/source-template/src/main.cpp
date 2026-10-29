#include "room_application.hpp"

// Setup SDL, context và shader nằm trong Application::initialize.
// Giải phóng tài nguyên do destructor xử lý sau mọi đường thoát, kể cả lỗi.

int main(int argc, char** argv) {
    return lab::runApplication(argc, argv);
}
