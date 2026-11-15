#pragma once
#include "state.hpp"
#include <iostream>

namespace tank {
struct Options {
    bool hidden = false;
    bool paused = false;
    bool verify = false;
    double seconds = 0;
    int ticks = 0;
    std::size_t count = 0;
    water::Preset preset = water::Preset::Dam;
    std::string capture;
};

// CLI hữu hạn phục vụ smoke/scale check; không thay event input của ứng dụng.
inline Options options(int argc, char** argv) {
    Options result;
    for (int i = 1; i < argc; ++i) {
        const std::string value = argv[i];
        if (value == "--hidden")
            result.hidden = true;
        else if (value == "--paused")
            result.paused = true;
        else if (value == "--verify")
            result.verify = true;
        else if (value.starts_with("--seconds="))
            result.seconds = std::stod(value.substr(10));
        else if (value.starts_with("--ticks="))
            result.ticks = std::stoi(value.substr(8));
        else if (value.starts_with("--count="))
            result.count = std::stoul(value.substr(8));
        else if (value.starts_with("--capture="))
            result.capture = value.substr(10);
        else if (value == "--preset=pool")
            result.preset = water::Preset::Pool;
        else if (value == "--preset=obstacle")
            result.preset = water::Preset::Obstacle;
        else if (value == "--preset=empty")
            result.preset = water::Preset::Empty;
        else if (value != "--preset=dam")
            throw std::invalid_argument("Unknown argument: " + value);
    }
    if (!std::isfinite(result.seconds) || result.seconds < 0 || result.seconds > 60 || result.ticks < 0 || result.ticks > 6000 || (result.count != 0 && result.count != 1000 && result.count != 5000 && result.count != 10000)) {
        throw std::invalid_argument("seconds in [0,60], ticks in [0,6000], count=1000/5000/10000");
    }
    return result;
}

inline void log(const App& app) {
    std::cout << "SPH allocated=" << app.state.particles.capacity() << " alive=" << app.state.particles.size() << " updated=" << app.state.updated << " drawn=" << app.surface.drawn << " tick=" << app.state.tick << " model_time=" << app.state.time << '\n';
    std::cout << "DENSITY min=" << app.metrics.minimum << " median=" << app.metrics.median << " max=" << app.metrics.maximum << " p95_compression=" << app.metrics.p95Compression << " dt=" << app.state.dt << " leakage=" << app.metrics.leaked << " candidates=" << app.state.candidates << '\n';
    std::cout << "MASS " << water::mass * app.state.particles.size() << " emitted=" << app.state.emitted << " rejected=" << app.state.rejected << " contacts=" << app.state.contacts << '\n';
}
} // namespace tank
