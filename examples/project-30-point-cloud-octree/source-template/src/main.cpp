#include "app/application.hpp"
#include <cstdlib>
#include <exception>
#include <iostream>

int main(int argc, char** argv) {
    // Parser/build/IO báo lỗi trước khi mở SDL hoặc sau khi đã cleanup tài nguyên.
    try {
        return survey::runApplication(argc, argv);
    } catch (const std::exception& error) {
        std::cerr << "Point Cloud Survey: " << error.what() << '\n';
        return EXIT_FAILURE;
    }
}
