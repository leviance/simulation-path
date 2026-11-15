#pragma once
#include "field.hpp"
#include <string>

namespace wind {
struct Options {
    bool hidden = false;
    bool run = false;
    bool verify = false;
    bool help = false;
    double seconds = 0;
    std::string capture;
};

inline Options parseOptions(int argc, char** argv) {
    Options options;
    for (int i = 1; i < argc; ++i) {
        const std::string argument = argv[i];
        if (argument == "--hidden") {
            options.hidden = true;
        } else if (argument == "--run") {
            options.run = true;
        } else if (argument == "--verify") {
            options.verify = true;
        } else if (argument == "--help") {
            options.help = true;
        } else if (argument.starts_with("--seconds=")) {
            const std::string value = argument.substr(10);
            std::size_t consumed = 0;
            options.seconds = std::stod(value, &consumed);
            if (consumed != value.size() || !std::isfinite(options.seconds) || options.seconds < 0.05 || options.seconds > 60) {
                throw std::invalid_argument("--seconds must be finite and in [0.05, 60]");
            }
        } else if (argument.starts_with("--capture=")) {
            options.capture = argument.substr(10);
            if (options.capture.empty())
                throw std::invalid_argument("Missing BMP capture path");
        } else {
            throw std::invalid_argument("Unknown argument: " + argument);
        }
    }
    if ((options.hidden || !options.capture.empty()) && options.seconds == 0) {
        throw std::invalid_argument("Hidden/capture runs require --seconds=... to stay finite");
    }
    if (options.verify && argc != 2) {
        throw std::invalid_argument("--verify is a standalone CPU command");
    }
    return options;
}
} // namespace wind
