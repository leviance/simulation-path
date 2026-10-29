#include "core_checks.hpp"
#include <cstdlib>
#include <iostream>
#include <string_view>

namespace lab_test {

int failures = 0;
int checks = 0;

// Luôn ghi nhận kết quả, kể cả khi Release định nghĩa NDEBUG.
void check(bool condition, std::string_view label) {
    ++checks;
    if (!condition) {
        ++failures;
        std::cerr << "FAIL: " << label << '\n';
    }
}

} // namespace lab_test

int main() {
    // CTest chỉ chạy toán CPU: không mở window và không cần OpenGL context.
    lab_test::cameraChecks();
    lab_test::sdfChecks();
    lab_test::marchChecks();
    lab_test::normalAndShadowChecks();

    const int failures = lab_test::failures;
    std::cout << lab_test::checks << " CPU checks, " << failures << " failures\n";
    if (failures != 0) {
        return EXIT_FAILURE;
    }
    return EXIT_SUCCESS;
}
