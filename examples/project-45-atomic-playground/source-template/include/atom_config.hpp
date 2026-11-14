#pragma once

#include "atom_sampler.hpp"
#include <charconv>
#include <iomanip>
#include <istream>
#include <locale>
#include <ostream>
#include <sstream>
#include <string>

namespace atom {

struct PlaygroundConfig {
    SamplingConfig primary;
    SamplingConfig secondary{Orbital::s2, 98765, 1000000, 2048, 64, 128, 32};
    SamplingMode mode{SamplingMode::weighted};
    bool comparison{}, autoFit{true}, debug{true}, clipEnabled{}, densityBoost{};
    int clipAxis{2}, palette{};
    float clipOffset{}, probeRadius{2}, exposure{1}, opacity{0.03F}, pointSize{2};
    Vec3 probeCenter{};

    void validate() const {
        primary.validate();
        secondary.validate();
        const bool invalidMode = static_cast<std::uint32_t>(mode) > 2;
        const bool invalidClip = clipAxis < 0 || clipAxis > 2 || !std::isfinite(clipOffset) || std::abs(clipOffset) > 128;
        const bool invalidCenter = !finite(probeCenter) || std::abs(probeCenter.x) > 128 || std::abs(probeCenter.y) > 128 || std::abs(probeCenter.z) > 128;
        const bool invalidRadius = !std::isfinite(probeRadius) || probeRadius < 0 || probeRadius > 128;
        const bool invalidExposure = !std::isfinite(exposure) || exposure < 0.01F || exposure > 20;
        const bool invalidOpacity = !std::isfinite(opacity) || opacity < 0.0001F || opacity > 1;
        const bool invalidPointSize = !std::isfinite(pointSize) || pointSize < 0.5F || pointSize > 12;
        if (invalidMode || invalidClip || invalidCenter || invalidRadius || invalidExposure || invalidOpacity || invalidPointSize || palette < 0 || palette > 2)
            throw std::invalid_argument("Playground configuration is outside the finite display/probe bounds");
    }
};

inline void writeSamplingConfig(std::ostream& output, const SamplingConfig& config) {
    output << static_cast<std::uint32_t>(config.orbital) << ' ' << config.seed << ' ' << config.count << ' ' << config.radialBins << ' ' << config.muBins << ' ' << config.phiBins << ' ' << config.radius << '\n';
}

// Formatted extraction into unsigned integers accepts a leading minus sign.
// Parse tokens explicitly so a user typo such as seed=-1 is rejected, not
// silently converted to UINT32_MAX. Seed=4294967295 remains a valid seed.
inline std::uint32_t readUnsigned(std::istream& input) {
    std::string token;
    if (!(input >> token) || token.empty() || token.size() > 10)
        throw std::invalid_argument("Missing or oversized unsigned configuration field");
    std::uint32_t value{};
    const auto parsed = std::from_chars(token.data(), token.data() + token.size(), value);
    if (parsed.ec != std::errc{} || parsed.ptr != token.data() + token.size())
        throw std::invalid_argument("Configuration integer must be an unsigned decimal token");
    return value;
}

inline SamplingConfig readSamplingConfig(std::istream& input) {
    SamplingConfig result;
    const auto orbital = readUnsigned(input);
    result.seed = readUnsigned(input);
    result.count = readUnsigned(input);
    result.radialBins = readUnsigned(input);
    result.muBins = readUnsigned(input);
    result.phiBins = readUnsigned(input);
    if (!(input >> result.radius))
        throw std::invalid_argument("Incomplete sampling configuration");
    result.orbital = static_cast<Orbital>(orbital);
    result.validate();
    return result;
}

// Save parameters only. A loader validates the complete small file before the
// app requests a candidate; it must not relabel the currently visible cloud.
// snippet:atom-configuration
inline void writeConfig(std::ostream& output, const PlaygroundConfig& config) {
    config.validate();
    output.imbue(std::locale::classic());
    output << std::dec << std::noboolalpha << std::defaultfloat << std::setprecision(std::numeric_limits<float>::max_digits10);
    output << "ATOMIC_PLAYGROUND 1\n";
    writeSamplingConfig(output, config.primary);
    writeSamplingConfig(output, config.secondary);
    output << static_cast<std::uint32_t>(config.mode) << ' ' << config.comparison << ' ' << config.autoFit << ' ' << config.debug << ' ' << config.clipEnabled << ' ' << config.densityBoost << '\n';
    output << config.clipAxis << ' ' << config.clipOffset << ' ' << config.probeCenter.x << ' ' << config.probeCenter.y << ' ' << config.probeCenter.z << ' ' << config.probeRadius << '\n';
    output << config.palette << ' ' << config.exposure << ' ' << config.opacity << ' ' << config.pointSize << '\n';
    if (!output)
        throw std::runtime_error("Configuration write failed");
}

inline PlaygroundConfig readConfig(std::istream& source) {
    std::string bytes;
    for (char value; source.get(value);) {
        if (bytes.size() >= 16384)
            throw std::invalid_argument("Configuration exceeds the 16 KiB input budget");
        bytes.push_back(value);
    }
    if (!source.eof())
        throw std::runtime_error("Configuration input failed");
    std::istringstream input(bytes);
    input.imbue(std::locale::classic());
    std::string magic;
    if (!(input >> magic) || magic != "ATOMIC_PLAYGROUND" || readUnsigned(input) != 1)
        throw std::invalid_argument("Unsupported Atomic Playground configuration");
    PlaygroundConfig config;
    config.primary = readSamplingConfig(input);
    config.secondary = readSamplingConfig(input);
    const auto mode = readUnsigned(input);
    const auto comparison = readUnsigned(input), autoFit = readUnsigned(input);
    const auto debug = readUnsigned(input), clip = readUnsigned(input), boost = readUnsigned(input);
    if (comparison > 1 || autoFit > 1 || debug > 1 || clip > 1 || boost > 1)
        throw std::invalid_argument("Invalid configuration mode/boolean fields");
    config.mode = static_cast<SamplingMode>(mode);
    config.comparison = comparison != 0;
    config.autoFit = autoFit != 0;
    config.debug = debug != 0;
    config.clipEnabled = clip != 0;
    config.densityBoost = boost != 0;
    if (!(input >> config.clipAxis >> config.clipOffset >> config.probeCenter.x >> config.probeCenter.y >> config.probeCenter.z >> config.probeRadius >> config.palette >> config.exposure >> config.opacity >> config.pointSize))
        throw std::invalid_argument("Incomplete display/probe configuration");
    std::string trailing;
    if (input >> trailing)
        throw std::invalid_argument("Configuration has trailing tokens");
    config.validate();
    return config;
}

// end-snippet:atom-configuration

} // namespace atom
