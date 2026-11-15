#pragma once

#include "presets.hpp"
#include <charconv>
#include <string>
#include <string_view>

namespace heat {

struct Options {
    bool help = false;
    bool hidden = false;
    bool run = false;
    bool clean = false;
    bool verify = false;
    bool benchmark = false;
    double seconds = 0;
    int size = 32;
    int steps = 120;
    int repeats = 7;
    Preset preset = Preset::Hotspot;
    Settings settings;
    std::string capture;

    Options() {
#if LAB_CHECKPOINT >= 7
        size = 192;
#endif
    }
};

inline int integerArgument(std::string_view text, int minimum, int maximum) {
    int value = 0;
    const auto parsed = std::from_chars(text.data(), text.data() + text.size(), value);
    if (parsed.ec != std::errc{} || parsed.ptr != text.data() + text.size() || value < minimum || value > maximum) {
        throw std::invalid_argument("Invalid integer argument: " + std::string(text));
    }
    return value;
}

inline double realArgument(const std::string& text, double minimum, double maximum) {
    std::size_t used = 0;
    const double value = std::stod(text, &used);
    if (used != text.size() || !std::isfinite(value) || value < minimum || value > maximum) {
        throw std::invalid_argument("Invalid finite real argument: " + text);
    }
    return value;
}

// Viewer, fixture và benchmark là các chế độ riêng; không âm thầm bỏ qua cờ.
inline Options parseOptions(int argc, char** argv) {
    Options options;
    bool viewerSpecified = false;
    bool workloadSpecified = false;
    bool modelSpecified = false;
    auto valueAfter = [&](int& index) {
        ++index;
        if (index >= argc) {
            throw std::invalid_argument("Missing CLI argument value");
        }
        return std::string(argv[index]);
    };
    for (int index = 1; index < argc; ++index) {
        const std::string argument = argv[index];
        if (argument == "--help") {
            options.help = true;
        } else if (argument == "--verify") {
            options.verify = true;
        } else if (argument == "--benchmark") {
            options.benchmark = true;
        } else if (argument == "--steps") {
            options.steps = integerArgument(valueAfter(index), 1, 1000);
            workloadSpecified = true;
        } else if (argument == "--repeats") {
            options.repeats = integerArgument(valueAfter(index), 1, 9);
            workloadSpecified = true;
        } else if (argument == "--hidden") {
            options.hidden = true;
            viewerSpecified = true;
        } else if (argument == "--run") {
            options.run = true;
            viewerSpecified = true;
        } else if (argument == "--clean") {
            options.clean = true;
            viewerSpecified = true;
        } else if (argument == "--seconds") {
            options.seconds = realArgument(valueAfter(index), 0.05, 60);
            viewerSpecified = true;
        } else if (argument == "--capture") {
            options.capture = valueAfter(index);
            if (options.capture.empty()) {
                throw std::invalid_argument("Capture path must not be empty");
            }
            viewerSpecified = true;
        } else if (argument == "--size") {
            modelSpecified = true;
            options.size = integerArgument(valueAfter(index), 1, 256);
#if LAB_CHECKPOINT >= 7
            if (options.size != 128 && options.size != 192 && options.size != 256) {
                throw std::invalid_argument("Large viewer sizes are 128, 192 or 256");
            }
#else
            if (options.size != 32) {
                throw std::invalid_argument("This checkpoint uses a 32x32 learning grid");
            }
#endif
        } else if (argument == "--preset") {
            modelSpecified = true;
            options.preset = static_cast<Preset>(integerArgument(valueAfter(index), 0, 5));
        } else if (argument == "--diffusivity") {
            modelSpecified = true;
            options.settings.diffusivity = realArgument(valueAfter(index), 0, 6);
        } else if (argument == "--dt") {
            modelSpecified = true;
            options.settings.dt = realArgument(valueAfter(index), 0.002, 0.1);
        } else if (argument == "--boundary") {
            modelSpecified = true;
            const std::string boundary = valueAfter(index);
            if (boundary == "insulated") {
                options.settings.boundary = Boundary::Insulated;
            } else if (boundary == "rim") {
                options.settings.boundary = Boundary::ColdRim;
            } else {
                throw std::invalid_argument("Boundary is insulated or rim");
            }
        } else if (argument == "--experiment") {
            modelSpecified = true;
            options.settings.experiment = true;
        } else {
            throw std::invalid_argument("Unknown option: " + argument);
        }
    }
    if (!options.help && !options.verify && !options.benchmark && (options.hidden || !options.capture.empty()) && options.seconds == 0) {
        throw std::invalid_argument("Hidden/capture runs require finite --seconds");
    }
    if (options.verify && (options.benchmark || viewerSpecified || workloadSpecified || modelSpecified)) {
        throw std::invalid_argument("--verify is a separate finite CPU fixture run");
    }
    if (options.benchmark && viewerSpecified) {
        throw std::invalid_argument("CPU benchmark cannot be combined with viewer/run/capture flags");
    }
    if (!options.benchmark && workloadSpecified) {
        throw std::invalid_argument("--steps/--repeats are CPU benchmark options");
    }
#if LAB_CHECKPOINT < 9
    if (options.verify || options.benchmark) {
        throw std::invalid_argument("CPU verification/benchmark are introduced in checkpoint 9");
    }
#endif
#if LAB_CHECKPOINT < 5
    if (options.settings.boundary != Boundary::Insulated || options.preset == Preset::Heaters) {
        throw std::invalid_argument("Boundary/heater controls are introduced in checkpoint 5");
    }
#endif
#if LAB_CHECKPOINT < 6
    if (options.run || options.settings.experiment || options.settings.diffusivity != 1.5 || options.settings.dt != 1.0 / 30.0 || options.preset == Preset::Checker) {
        throw std::invalid_argument("Clock, D/dt and instability controls are introduced in checkpoint 6");
    }
#endif
#if LAB_CHECKPOINT < 7
    if (options.clean) {
        throw std::invalid_argument("Clean texture view is introduced in checkpoint 7");
    }
#endif
#if LAB_CHECKPOINT < 8
    if (options.preset == Preset::Uniform || options.preset == Preset::Cosine) {
        throw std::invalid_argument("The complete preset gallery is introduced in checkpoint 8");
    }
#endif
#if LAB_CHECKPOINT >= 7
    options.settings.dx = 96.0 / options.size;
    options.settings.dy = options.settings.dx;
#endif
    const std::uint64_t visits = static_cast<std::uint64_t>(options.size) * options.size * options.steps * options.repeats;
    if (options.benchmark && (visits > 100000000ULL || options.settings.experiment || !stability(options.settings).stable)) {
        throw std::invalid_argument("Benchmark requires a stable policy and at most 100-million timed cell visits");
    }
    return options;
}

} // namespace heat
