#pragma once
#include <charconv>
#include <iostream>
#include <string>
#include <string_view>

namespace picking {
struct RunOptions {
    int frames = 0;
    int preset = 0;
    std::string capture;
};

inline bool parseOptions(int argc, char** argv, RunOptions& options) {
    for (int i = 1; i < argc; ++i) {
        const std::string_view key = argv[i];
        if (i + 1 >= argc) {
            std::cerr << "Missing value for " << key << '\n';
            return false;
        }
        const std::string_view value = argv[++i];
        if (key == "--capture") {
            options.capture = value;
            continue;
        }
        int parsed = 0;
        const auto result = std::from_chars(value.data(), value.data() + value.size(), parsed);
        if (result.ec != std::errc{} || result.ptr != value.data() + value.size()) {
            std::cerr << "Invalid integer for " << key << '\n';
            return false;
        }
        if (key == "--frames" && parsed >= 1 && parsed <= 600) {
            options.frames = parsed;
        } else if (key == "--preset" && parsed >= 0 && parsed <= 3) {
            options.preset = parsed;
        } else {
            std::cerr << "Unknown or out-of-range option " << key << '\n';
            return false;
        }
    }
    if (!options.capture.empty() && options.frames == 0) {
        std::cerr << "--capture requires --frames (1..600)\n";
        return false;
    }
    return true;
}
} // namespace picking
