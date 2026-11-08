#include "city_application.hpp"
#include "city_control_checks.hpp"
#include "city_validation.hpp"

#include <cstdlib>
#include <iostream>
#include <string>

int main(int argc, char** argv) {
    try {
        // Setup options remain outside the teaching loop; unknown arguments fail clearly.
        city::RunOptions options{};
        for (int index = 1; index < argc; ++index) {
            const std::string argument = argv[index];
            if (argument == "--hidden") {
                options.hidden = true;
            } else if (argument == "--verify") {
                options.verify = true;
            } else if (argument == "--benchmark") {
                options.benchmark = true;
            } else if (argument == "--street") {
                options.street = true;
            } else if (argument == "--frames" && index + 1 < argc) {
                options.frames = std::stoi(argv[++index]);
                if (options.frames < 1 || options.frames > 10000) {
                    throw std::runtime_error("Frame limit must be between 1 and 10000");
                }
            } else if (argument == "--seconds" && index + 1 < argc) {
                options.seconds = std::stod(argv[++index]);
                if (!std::isfinite(options.seconds) || options.seconds <= 0.0 || options.seconds > 120.0) {
                    throw std::runtime_error("Time limit must be finite and between 0 and 120 seconds");
                }
            } else if (argument == "--count" && index + 1 < argc) {
                const unsigned long count = std::stoul(argv[++index]);
                if (count > city::kMaximumObjects) {
                    throw std::runtime_error("Requested count exceeds 2,000,003");
                }
                options.count = static_cast<std::uint32_t>(count);
            } else if (argument == "--capture" && index + 1 < argc) {
                options.capture = argv[++index];
            } else {
                throw std::runtime_error("Unknown or incomplete option: " + argument);
            }
        }
        if (options.hidden && !options.verify && !options.benchmark && options.frames == 0 && options.seconds == 0.0) {
            options.seconds = 5.0;
        }
        city::Application application{};
        const int result = application.run(options);

        // Cleanup is owned by Application: GL objects, context, window, then SDL.
        return result;
    } catch (const std::exception& error) {
        std::cerr << "Project 39: " << error.what() << '\n';
        return EXIT_FAILURE;
    }
}
