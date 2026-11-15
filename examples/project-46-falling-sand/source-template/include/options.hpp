#pragma once

#include "grid.hpp"
#include <charconv>
#include <cmath>
#include <string>
#include <string_view>

namespace sand {

struct Options {
    bool help = false;
    bool hidden = false;
    bool run = false;
    bool clean = false;
    bool benchmark = false;
    double seconds = 0;
    int preset = 0;
    std::uint32_t seed = 46;
    int steps = 120;
    int repeats = 7;
    ScanOrder order = ScanOrder::Alternating;
    std::string capture;
};

inline std::uint32_t parseUnsigned(std::string_view text, std::uint32_t minimum, std::uint32_t maximum) {
    std::uint32_t value = 0;
    const auto parsed = std::from_chars(text.data(), text.data() + text.size(), value);
    if (parsed.ec != std::errc{} || parsed.ptr != text.data() + text.size() || value < minimum || value > maximum) {
        throw std::invalid_argument("Invalid integer argument: " + std::string(text));
    }
    return value;
}

inline Options parseOptions(int argc, char** argv) {
    Options options;
    auto valueAfter = [&](int& index) -> std::string {
        if (++index >= argc) {
            throw std::invalid_argument("Option requires a value");
        }
        return argv[index];
    };
    for (int index = 1; index < argc; ++index) {
        const std::string argument = argv[index];
        if (argument == "--help") {
            options.help = true;
        } else if (argument == "--hidden") {
            options.hidden = true;
        } else if (argument == "--run") {
            options.run = true;
        } else if (argument == "--clean") {
            options.clean = true;
        } else if (argument == "--benchmark") {
            options.benchmark = true;
        } else if (argument == "--seconds") {
            const std::string text = valueAfter(index);
            std::size_t used = 0;
            options.seconds = std::stod(text, &used);
            if (used != text.size() || !std::isfinite(options.seconds) || options.seconds < 0.05 || options.seconds > 60) {
                throw std::invalid_argument("seconds must be finite in [0.05,60]");
            }
        } else if (argument == "--preset") {
            options.preset = static_cast<int>(parseUnsigned(valueAfter(index), 0, 4));
        } else if (argument == "--seed") {
            options.seed = parseUnsigned(valueAfter(index), 0, UINT32_MAX);
        } else if (argument == "--steps") {
            options.steps = static_cast<int>(parseUnsigned(valueAfter(index), 1, 600));
        } else if (argument == "--repeats") {
            options.repeats = static_cast<int>(parseUnsigned(valueAfter(index), 1, 15));
        } else if (argument == "--order") {
            options.order = static_cast<ScanOrder>(parseUnsigned(valueAfter(index), 0, 3));
        } else if (argument == "--capture") {
            options.capture = valueAfter(index);
            if (options.capture.empty()) {
                throw std::invalid_argument("capture path must not be empty");
            }
        } else {
            throw std::invalid_argument("Unknown option: " + argument);
        }
    }
    if (!options.help && !options.benchmark && (options.hidden || !options.capture.empty()) && options.seconds == 0) {
        throw std::invalid_argument("Hidden/capture runs require --seconds; no unbounded background run");
    }
    if (options.benchmark && (options.hidden || options.run || options.clean || options.seconds > 0 || !options.capture.empty())) {
        throw std::invalid_argument("CPU benchmark cannot be combined with viewer, capture, or run options");
    }
#if LAB_CHECKPOINT < 6
    if (options.run) {
        throw std::invalid_argument("Automatic running is introduced in checkpoint 6; use N from checkpoint 3");
    }
#endif
#if LAB_CHECKPOINT < 7
    if (options.clean || options.preset != 0 || options.seed != 46) {
        throw std::invalid_argument("Large preset/seed/clean viewer options are introduced in checkpoint 7");
    }
#endif
#if LAB_CHECKPOINT < 8
    if (options.order != ScanOrder::Alternating) {
        throw std::invalid_argument("Changing scan order is introduced in checkpoint 8");
    }
#endif
    const std::uint64_t work = 512ULL * 320ULL * options.steps * options.repeats;
    if (options.benchmark && work > 500000000ULL) {
        throw std::invalid_argument("Benchmark exceeds the finite 500-million-cell-visit budget");
    }
    return options;
}

} // namespace sand
