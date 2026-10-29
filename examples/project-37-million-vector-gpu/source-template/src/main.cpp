#include "compute_application.hpp"

#include <cstdlib>
#include <iostream>
#include <string>

int main(int argc, char** argv) {
    try {
        bool verify = false;
        int smokeFrames = 0;
        std::string snapshotPath{};
        for (int index = 1; index < argc; ++index) {
            const std::string argument = argv[index];
            if (argument == "--verify") {
                verify = true;
            } else if (argument == "--smoke") {
                smokeFrames = 30;
            } else if (argument == "--snapshot" && index + 1 < argc) {
                snapshotPath = argv[++index];
                smokeFrames = 30;
            } else {
                throw std::invalid_argument("Usage: project_37_final [--verify | --smoke | --snapshot file.bmp]");
            }
        }

        // Setup và event loop do application quản lý, không tạo context ở global scope.
        lab::ComputeApplication application{};
        const int result = application.run(verify, smokeFrames, snapshotPath);

        // Cleanup: destructor join worker trước khi hủy context/windows khi rời scope.
        return result;
    } catch (const std::exception& error) {
        std::cerr << "Project 37: " << error.what() << '\n';
        return EXIT_FAILURE;
    }
}
