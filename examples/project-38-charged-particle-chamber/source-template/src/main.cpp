#include "chamber_application.hpp"

#include <cstdlib>
#include <exception>
#include <iostream>
#include <string>

int main(int argc, char** argv) {
    try {
        // Setup: parse bounded verification/capture options before creating the SDL/GL application.
        chamber::RunOptions options{};
        for (int index = 1; index < argc; ++index) {
            const std::string argument = argv[index];
            if (argument == "--verify")
                options.verify = true;
            else if (argument == "--side-view")
                options.sideView = true;
            else if (argument == "--hidden")
                options.hidden = true;
            else if (argument == "--frames" && index + 1 < argc)
                options.frames = std::stoi(argv[++index]);
            else if (argument == "--seconds" && index + 1 < argc)
                options.seconds = std::stod(argv[++index]);
            else if (argument == "--count" && index + 1 < argc)
                options.count = std::stoull(argv[++index]);
            else if (argument == "--capture" && index + 1 < argc) {
                options.capture = argv[++index];
            } else
                throw std::invalid_argument("Usage: project_38_final [--verify] [--count N] [--hidden] [--frames N | --seconds S] [--capture file.bmp]");
        }
        if (!std::isfinite(options.seconds) || options.seconds < 0 || options.seconds > 30)
            throw std::invalid_argument("Finite duration must be 0..30 seconds");
        if (!options.capture.empty() && options.frames == 0 && options.seconds == 0)
            options.seconds = 6;
        if (options.frames < 0 || options.frames > 10000)
            throw std::invalid_argument("Finite capture frame limit must be 1..10000");
        // Cleanup: Application releases GPU resources before deleting the GL context and SDL window.
        chamber::Application application{};
        return application.run(options);
    } catch (const std::exception& error) {
        std::cerr << "Project 38: " << error.what() << '\n';
        return EXIT_FAILURE;
    }
}
