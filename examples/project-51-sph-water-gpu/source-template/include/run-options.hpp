#pragma once
#include "oracle-stats.hpp"
#include <charconv>
#include <string>
#include <string_view>

namespace water3 {
struct RunOptions {
    bool hidden = false;
    bool debug = false;
    bool verify = false;
    bool tail = false;
    bool scaleCheck = false;
    bool benchmark = false;
    std::uint32_t side = 0;
    std::uint32_t ticks = 0;
    double seconds = 0;
    std::string capture;
#if LAB_CHECKPOINT >= 12
    VerifyCase fixture = VerifyCase::lattice;
#endif
};

inline std::uint32_t unsignedOption(std::string_view text) {
    std::uint32_t value = 0;
    const auto parsed = std::from_chars(text.data(), text.data() + text.size(), value);
    if (parsed.ec != std::errc{} || parsed.ptr != text.data() + text.size()) {
        throw std::invalid_argument("Expected an unsigned integer argument");
    }
    return value;
}

// Những lượt kiểm tự động luôn hữu hạn; không tự đẩy N lên theo thời gian.
inline RunOptions runOptions(int argc, char** argv) {
    RunOptions result;
    for (int i = 1; i < argc; ++i) {
        const std::string_view arg = argv[i];
        if (arg == "--hidden")
            result.hidden = true;
        else if (arg == "--debug")
            result.debug = true;
        else if (arg.starts_with("--seconds=")) {
            const std::string text(arg.substr(10));
            std::size_t consumed = 0;
            result.seconds = std::stod(text, &consumed);
            if (consumed != text.size())
                throw std::invalid_argument("Invalid seconds");
        } else if (arg.starts_with("--capture="))
            result.capture = std::string(arg.substr(10));
#if LAB_CHECKPOINT >= 12
        else if (arg == "--verify-gpu")
            result.verify = true;
        else if (arg == "--tail-case")
            result.tail = true;
        else if (arg == "--verify-acoustic") {
            result.verify = true;
            result.fixture = VerifyCase::acoustic;
        } else if (arg == "--verify-force") {
            result.verify = true;
            result.fixture = VerifyCase::force;
        } else if (arg == "--verify-perturbed") {
            result.verify = true;
            result.fixture = VerifyCase::perturbed;
        } else if (arg == "--verify-scan") {
            result.verify = true;
            result.fixture = VerifyCase::scan;
        } else if (arg == "--benchmark") {
            result.benchmark = true;
        } else if (arg == "--scale-check")
            result.scaleCheck = true;
        else if (arg.starts_with("--side="))
            result.side = unsignedOption(arg.substr(7));
        else if (arg.starts_with("--ticks="))
            result.ticks = unsignedOption(arg.substr(8));
#endif
        else
            throw std::invalid_argument("Unknown argument: " + std::string(arg));
    }
    if (!std::isfinite(result.seconds) || result.seconds < 0 || result.seconds > 60 || result.ticks > 6000) {
        throw std::invalid_argument("seconds in [0,60], ticks in [0,6000]");
    }
    if (result.side != 0 && result.side != 8 && result.side != 32 && result.side != 48 && result.side != 80 && result.side != 100) {
        throw std::invalid_argument("side must be 8/32/48/80/100");
    }
    if (result.verify && (result.scaleCheck || result.benchmark || result.side > 8 || result.ticks > 0)) {
        throw std::invalid_argument("Oracle mode is separate from large workloads");
    }
    if (result.scaleCheck && (result.ticks == 0 || result.side < 48)) {
        throw std::invalid_argument("Scale check requires explicit side>=48 and a finite tick target");
    }
    if (result.ticks > 0 && result.seconds == 0)
        result.seconds = 60;
    if (result.benchmark && (result.ticks > 0 || result.scaleCheck))
        throw std::invalid_argument("Benchmark is a separate finite mode");
    if (result.benchmark && result.seconds == 0)
        result.seconds = 30;
    if (!result.capture.empty() && result.seconds == 0 && result.ticks == 0) {
        throw std::invalid_argument("Capture requires a finite run");
    }
    return result;
}
} // namespace water3
