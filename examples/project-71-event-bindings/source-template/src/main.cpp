#ifndef LAB_CHECKPOINT
#define LAB_CHECKPOINT 5
#endif
#include "events/tool.hpp"
#include "markup/window.hpp"

// Cây HTML gửi sự kiện có target; chỉ các callback đã đăng ký được phép sửa model.
int main(int argc, char** argv) {
    return tiny::run<tiny::EventTool>(argc, argv, "71 / Flock Observatory - Event desk");
}
