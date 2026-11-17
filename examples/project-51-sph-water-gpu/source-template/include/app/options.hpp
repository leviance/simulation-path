#pragma once
#include "fluid/model.hpp"
#include <filesystem>
#include <string>

namespace water51 {
// Finite CLI targets are separate from the interactive run, which ends on user request.

struct Options {
    int side = 48;
    Preset preset = Preset::Dam;
    bool run = false;
    bool hidden = false;
    bool verify = false;
    bool benchmark = false;
    int tickLimit = 0;
    double timeLimit = 0;
    double seconds = 0;
    std::filesystem::path capture;
    std::filesystem::path report;

    Options(int argc, char** argv) {
#if LAB_CHECKPOINT <= 1
        side = 4;
#elif LAB_CHECKPOINT <= 5
        side = 8;
#elif LAB_CHECKPOINT <= 9
        side = 16;
#elif LAB_CHECKPOINT <= 11
        side = 32;
#endif
        for (int i = 1; i < argc; ++i) {
            const std::string arg = argv[i];
            auto value = [&]() -> std::string {
                if (i + 1 >= argc)
                    throw std::invalid_argument("Missing value for " + arg);
                return argv[++i];
            };
            if (arg == "--side")
                side = std::stoi(value());
            else if (arg == "--preset") {
                const auto name = value();
                if (name == "dam")
                    this->preset = Preset::Dam;
                else if (name == "pool")
                    this->preset = Preset::Pool;
                else if (name == "obstacle")
                    this->preset = Preset::Obstacle;
                else
                    throw std::invalid_argument("Preset: dam, pool, obstacle");
            } else if (arg == "--run")
                run = true;
            else if (arg == "--hidden")
                hidden = true;
            else if (arg == "--verify")
                verify = true;
            else if (arg == "--benchmark")
                benchmark = true;
            else if (arg == "--ticks")
                tickLimit = std::stoi(value());
            else if (arg == "--time")
                timeLimit = std::stod(value());
            else if (arg == "--seconds")
                seconds = std::stod(value());
            else if (arg == "--capture")
                capture = value();
            else if (arg == "--report")
                report = value();
            else
                throw std::invalid_argument("Unknown option: " + arg);
        }
        if (tickLimit < 0 || tickLimit > 20000 || !std::isfinite(timeLimit) || timeLimit < 0 || timeLimit > 10 || !std::isfinite(seconds) || seconds < 0 || seconds > 300)
            throw std::invalid_argument("Finite run limits exceeded");
        if (timeLimit > 0 || tickLimit > 0 || benchmark)
            run = true;
        if ((timeLimit > 0 || tickLimit > 0 || benchmark || !capture.empty()) && seconds == 0)
            seconds = 180;
#if LAB_CHECKPOINT < 6
        if (side > 8)
            throw std::invalid_argument("Early all-pairs checkpoint is limited to 512 particles");
#endif
        if (benchmark && seconds == 0)
            seconds = 120;
        makeModel(side, preset);
#if LAB_CHECKPOINT < 13
        if (verify)
            throw std::invalid_argument("GPU verifier is available in the final checkpoint");
#endif
    }
};
} // namespace water51
