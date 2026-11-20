#ifndef LAB_CHECKPOINT
#define LAB_CHECKPOINT 5
#endif
#include "trail/window.hpp"

// Tên trên thanh tiêu đề cho biết bản C++ nào đang chạy khi mở nhiều checkpoint.
constexpr const char* windowTitle = "63 / VOXEL FIELD NOTES - Snow to sea | F1: HUD";

// Khởi tạo SDL, camera và cửa sổ trong trail::run; starter cũng dùng đúng vòng lặp này.
int main(int argc, char** argv) {
    // Giải phóng texture rồi renderer và window bằng destructor khi rời vòng lặp.
    return trail::run(windowTitle, argc, argv);
}
