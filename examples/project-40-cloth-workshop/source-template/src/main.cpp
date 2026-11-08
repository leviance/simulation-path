#include "cloth_application.hpp"

#include <charconv>
#include <cstdlib>
#include <iostream>
#include <string>

namespace {

std::uint32_t positiveInteger(const char* text, std::uint32_t maximum, const std::string& option) {
    // Parse into the final integer type: overflow and trailing characters must not wrap into a valid workload.
    const std::string value = text;
    std::uint32_t result{};
    const auto parsed = std::from_chars(value.data(), value.data() + value.size(), result);
    if (parsed.ec != std::errc{} || parsed.ptr != value.data() + value.size() || result == 0U || result > maximum) {
        throw std::runtime_error(option + " requires a positive integer no larger than " + std::to_string(maximum));
    }
    return result;
}

} // namespace

int main(int argc, char** argv) {
    try {
        // Setup options stay separate from the event loop and solver equations.
        cloth::RunOptions options{};
        for (int index = 1; index < argc; ++index) {
            const std::string argument = argv[index];
            if (argument == "--hidden") {
                options.hidden = true;
            } else if (argument == "--verify") {
                options.verify = true;
            } else if (argument == "--benchmark") {
                options.benchmark = true;
            } else if (argument == "--exercise-controls") {
                options.exerciseControls = true;
            } else if (argument == "--side" && index + 1 < argc) {
                options.side = positiveInteger(argv[++index], 1001U, argument);
            } else if (argument == "--steps" && index + 1 < argc) {
                options.steps = positiveInteger(argv[++index], 1000U, argument);
            } else if (argument == "--frames" && index + 1 < argc) {
                options.frames = positiveInteger(argv[++index], 10000U, argument);
            } else if (argument == "--seconds" && index + 1 < argc) {
                const std::string value = argv[++index];
                std::size_t consumed{};
                options.seconds = std::stod(value, &consumed);
                if (consumed != value.size()) {
                    throw std::runtime_error("--seconds must not contain trailing characters");
                }
            } else if (argument == "--capture" && index + 1 < argc) {
                options.capture = argv[++index];
            } else if (argument == "--preset" && index + 1 < argc) {
                const std::string preset = argv[++index];
                if (preset == "hanging") {
                    options.preset = cloth::Preset::Hanging;
                } else if (preset == "sphere") {
                    options.preset = cloth::Preset::SphereDrape;
                } else if (preset == "table") {
                    options.preset = cloth::Preset::DropTable;
                } else {
                    throw std::runtime_error("Preset must be hanging, sphere or table");
                }
            } else {
                throw std::runtime_error("Unknown or incomplete argument: " + argument);
            }
        }
        if (options.side > 1001U || options.steps > 1000U || options.frames > 10000U || !std::isfinite(options.seconds) || options.seconds < 0.0 || options.seconds > 120.0) {
            throw std::runtime_error("Requested workload exceeds CLI limits");
        }
        if (options.hidden && !options.verify && !options.benchmark && !options.exerciseControls && options.steps == 0U && options.frames == 0U && options.seconds == 0.0) {
            options.seconds = 5.0;
        }
        cloth::Application application{};
        const int status = application.run(options);

        // Cleanup is owned by Application: physics resources, renderer, context, then SDL.
        return status;
    } catch (const std::exception& error) {
        std::cerr << "Project 40: " << error.what() << '\n';
        return EXIT_FAILURE;
    }
}
