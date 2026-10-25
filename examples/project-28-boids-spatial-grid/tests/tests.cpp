#include <cstdlib>
#include <iostream>
#include <string_view>

namespace grid_tests {
int checks = 0;
int failures = 0;

// Không dùng assert: các phép kiểm vẫn chạy khi Release bật NDEBUG.
void check(bool condition, std::string_view message) {
    ++checks;
    if (!condition) {
        ++failures;
        std::cerr << "FAIL: " << message << '\n';
    }
}
} // namespace grid_tests

#include "boids-grid-cases.hpp"

int main() {
    grid_tests::run();
    const int failures = grid_tests::failures;
    if (failures != 0) {
        return EXIT_FAILURE;
    }
    return EXIT_SUCCESS;
}
