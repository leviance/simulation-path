#pragma once
#include "fluid/state.hpp"
#include <string>

namespace smoke {
// Các lần chạy ẩn/capture luôn có deadline; lỗi tham số không được mở cửa sổ chờ vô hạn.
struct Options {
    bool hidden = false;
    bool paused = false;
    bool verify = false;
    bool help = false;
    double seconds = 0;
    int ticks = 0;
    int resolution = 0;
    std::string capture;
};

inline Options parseOptions(int argc, char** argv) {
    Options result;
    for (int i = 1; i < argc; ++i) {
        const std::string argument = argv[i];
        if (argument == "--hidden") {
            result.hidden = true;
        } else if (argument == "--paused") {
            result.paused = true;
        } else if (argument == "--verify") {
            result.verify = true;
        } else if (argument == "--help") {
            result.help = true;
        } else if (argument.starts_with("--seconds=")) {
            const auto value = argument.substr(10);
            std::size_t consumed = 0;
            result.seconds = std::stod(value, &consumed);
            if (consumed != value.size() || !std::isfinite(result.seconds) || result.seconds < 0.05 || result.seconds > 60) {
                throw std::invalid_argument("--seconds must be in [0.05,60]");
            }
        } else if (argument.starts_with("--ticks=")) {
            const auto value = argument.substr(8);
            std::size_t consumed = 0;
            result.ticks = std::stoi(value, &consumed);
            if (consumed != value.size() || result.ticks < 1 || result.ticks > 360) {
                throw std::invalid_argument("--ticks must be in [1,360]");
            }
        } else if (argument.starts_with("--resolution=")) {
            const auto value = argument.substr(13);
            std::size_t consumed = 0;
            result.resolution = std::stoi(value, &consumed);
            if (consumed != value.size() || result.resolution < 8 || result.resolution > 256 || (result.resolution & (result.resolution - 1)) != 0) {
                throw std::invalid_argument("--resolution must be a power of two in [8,256]");
            }
        } else if (argument.starts_with("--capture=")) {
            result.capture = argument.substr(10);
            if (result.capture.empty()) {
                throw std::invalid_argument("Empty capture filename");
            }
        } else {
            throw std::invalid_argument("Unknown argument: " + argument);
        }
    }
    if ((result.hidden || result.ticks > 0 || !result.capture.empty()) && result.seconds == 0) {
        throw std::invalid_argument("Finite --seconds is required for hidden/ticks/capture runs");
    }
    if (result.verify && argc != 2) {
        throw std::invalid_argument("--verify is standalone");
    }
    return result;
}
} // namespace smoke
