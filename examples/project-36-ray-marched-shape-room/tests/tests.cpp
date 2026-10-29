#include "core_checks.hpp"

// CTest chỉ chạy toán CPU: không mở window và không cần OpenGL context.
// runCoreChecks dùng phép kiểm tường minh, nên Release/NDEBUG không bỏ test.

int main() {
    return lab_test::runCoreChecks();
}
