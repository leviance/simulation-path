#include "cloth_application.hpp"

#include <cstdlib>
#include <iostream>
#include <string>

int main(int argc, char** argv) {
    try {
        // Setup options stay separate from the event loop and solver equations.
        cloth::RunOptions options{};
        for (int index = 1; index < argc; ++index) {
            const std::string argument = argv[index];
            if (argument == "--hidden") { options.hidden = true; }
            else if (argument == "--verify") { options.verify = true; }
            else if (argument == "--benchmark") { options.benchmark = true; }
            else if (argument == "--side" && index + 1 < argc) { options.side = static_cast<std::uint32_t>(std::stoul(argv[++index])); }
            else if (argument == "--steps" && index + 1 < argc) { options.steps = static_cast<std::uint32_t>(std::stoul(argv[++index])); }
            else if (argument == "--frames" && index + 1 < argc) { options.frames = static_cast<std::uint32_t>(std::stoul(argv[++index])); }
            else if (argument == "--seconds" && index + 1 < argc) { options.seconds = std::stod(argv[++index]); }
            else if (argument == "--capture" && index + 1 < argc) { options.capture = argv[++index]; }
            else if (argument == "--preset" && index + 1 < argc) {
                const std::string preset = argv[++index];
                if (preset == "hanging") { options.preset = cloth::Preset::Hanging; }
                else if (preset == "sphere") { options.preset = cloth::Preset::SphereDrape; }
                else if (preset == "table") { options.preset = cloth::Preset::DropTable; }
                else { throw std::runtime_error("Preset must be hanging, sphere or table"); }
            } else { throw std::runtime_error("Unknown or incomplete argument: " + argument); }
        }
        if (options.side > 1001U || options.steps > 1000U || options.frames > 10000U || !std::isfinite(options.seconds) || options.seconds < 0.0 || options.seconds > 120.0) {
            throw std::runtime_error("Requested workload exceeds CLI limits");
        }
        if (options.hidden && !options.verify && options.steps == 0U && options.frames == 0U && options.seconds == 0.0) { options.seconds = 5.0; }
        cloth::Application application{};
        const int status = application.run(options);

        // Cleanup is owned by Application: physics resources, renderer, context, then SDL.
        return status;
    } catch (const std::exception& error) {
        std::cerr << "Project 40: " << error.what() << '\n';
        return EXIT_FAILURE;
    }
}
