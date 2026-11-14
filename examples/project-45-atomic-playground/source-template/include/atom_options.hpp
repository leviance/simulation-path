#pragma once

#include "atom_config.hpp"
#include <filesystem>
#include <string>

namespace atom {

struct Options {
    PlaygroundConfig config;
    bool hidden{}, verify{}, benchmark{};
    double seconds{};
    std::filesystem::path capture, load;
};

inline std::uint32_t unsignedOption(const std::string& text) {
    std::istringstream input(text);
    const auto value = readUnsigned(input);
    std::string extra;
    if (input >> extra)
        throw std::invalid_argument("An integer option must contain exactly one value");
    return value;
}

// Parse and validate before opening a window or allocating GPU resources.
inline Options parseOptions(int argc, char** argv) {
    Options result;
    result.config.autoFit = false;
    for (int index = 1; index < argc; ++index) {
        const std::string option = argv[index];
        const auto value = [&]() -> std::string {
            if (index + 1 >= argc)
                throw std::invalid_argument("Missing value after " + option);
            return argv[++index];
        };
        if (option == "--hidden")
            result.hidden = true;
        else if (option == "--verify")
            result.verify = true;
        else if (option == "--benchmark")
            result.benchmark = true;
        else if (option == "--orbital") {
            result.config.primary.orbital = parseOrbital(value());
            result.config.primary.radius = defaultRadius(result.config.primary.orbital);
        } else if (option == "--compare") {
            result.config.comparison = true;
            result.config.secondary.orbital = parseOrbital(value());
            result.config.secondary.radius = defaultRadius(result.config.secondary.orbital);
        } else if (option == "--count") {
            result.config.primary.count = unsignedOption(value());
            result.config.secondary.count = result.config.primary.count;
        } else if (option == "--seed")
            result.config.primary.seed = unsignedOption(value());
        else if (option == "--seconds") {
            const auto token = value();
            std::size_t consumed{};
            result.seconds = std::stod(token, &consumed);
            if (consumed != token.size() || !std::isfinite(result.seconds) || result.seconds <= 0 || result.seconds > 120)
                throw std::invalid_argument("--seconds must be in (0,120]");
        } else if (option == "--capture")
            result.capture = value();
        else if (option == "--load")
            result.load = value();
        else
            throw std::invalid_argument("Unknown option: " + option);
    }
    result.config.validate();
#if LAB_CHECKPOINT < 9
    if (result.config.comparison)
        throw std::invalid_argument("Comparison is introduced at checkpoint 9");
#endif
#if LAB_CHECKPOINT < 4
    if (result.verify)
        throw std::invalid_argument("GPU verification is introduced at checkpoint 4");
#endif
    if (result.hidden && result.seconds == 0 && !result.verify)
        throw std::invalid_argument("A hidden run needs --seconds or --verify");
    if (result.benchmark && result.seconds == 0)
        throw std::invalid_argument("A benchmark needs a finite --seconds duration");
    if (!result.capture.empty() && std::filesystem::exists(result.capture))
        throw std::invalid_argument("Capture refuses to overwrite an existing file");
    return result;
}

} // namespace atom
