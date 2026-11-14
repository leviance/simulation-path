#pragma once

#include "options.hpp"
#include "presets.hpp"
#include "rules.hpp"
#include "workshop.hpp"
#include <chrono>
#include <cstdlib>
#include <iostream>
#include <thread>

namespace sand {

#if LAB_CHECKPOINT >= 9
inline std::string processorDescription() {
#ifdef _MSC_VER
    std::array<char, 512> buffer{};
    std::size_t required = 0;
    if (getenv_s(&required, buffer.data(), buffer.size(), "PROCESSOR_IDENTIFIER") == 0 && required > 1) {
        return buffer.data();
    }
#else
    if (const char* processor = std::getenv("PROCESSOR_IDENTIFIER")) {
        return processor;
    }
#endif
    return "not reported; record the machine separately";
}

inline double sampleQuantile(std::vector<double> values, double quantile) {
    if (values.empty() || !std::isfinite(quantile) || quantile < 0 || quantile > 1) {
        throw std::invalid_argument("Quantile requires samples and a finite fraction in [0,1]");
    }
    std::sort(values.begin(), values.end());
    const std::size_t index = static_cast<std::size_t>(quantile * static_cast<double>(values.size() - 1));
    return values[index];
}

inline int runBenchmark(const Options& options) {
    using Clock = std::chrono::steady_clock;
    const auto deadline = Clock::now() + std::chrono::seconds(30);
    Grid initial = makeWorkshopScene(options.preset, options.seed);
    initial.order = options.order;
    const auto counts = countMaterials(initial);
    Grid warmup = initial;
    for (int tick = 0; tick < 32; ++tick) {
        stepGrid(warmup);
    }
    std::vector<double> milliseconds;
    std::uint64_t visits = 0;
    std::uint64_t swaps = 0;
    std::uint32_t finalChecksum = 0;
    for (int repeat = 0; repeat < options.repeats; ++repeat) {
        Grid grid = initial;
        for (int tick = 0; tick < options.steps; ++tick) {
            if (Clock::now() >= deadline) {
                throw std::runtime_error("Benchmark exceeded its thirty-second deadline");
            }
            const auto begin = Clock::now();
            const StepStats stats = stepGrid(grid);
            const auto end = Clock::now();
            milliseconds.push_back(std::chrono::duration<double, std::milli>(end - begin).count());
            visits += stats.visited;
            swaps += stats.swaps;
            if (stats.visited != grid.cells.size()) {
                throw std::runtime_error("Benchmark did not visit the full grid");
            }
        }
        if (countMaterials(grid) != counts) {
            throw std::runtime_error("Benchmark changed a material count without input");
        }
        for (std::size_t index = 0; index < initial.cells.size(); ++index) {
            if (initial.cells[index] == Cell::Wall && grid.cells[index] != Cell::Wall) {
                throw std::runtime_error("Benchmark moved a wall");
            }
        }
        const std::uint32_t hash = checksum(grid);
        if (repeat > 0 && hash != finalChecksum) {
            throw std::runtime_error("Benchmark repeats did not reproduce the same end state");
        }
        finalChecksum = hash;
    }
    auto sorted = milliseconds;
    std::sort(sorted.begin(), sorted.end());
    const std::size_t middle = sorted.size() / 2;
    double median = sorted[middle];
    if (sorted.size() % 2 == 0) {
        median = (sorted[middle - 1] + sorted[middle]) / 2;
    }
    std::cout << "CPU_BENCH grid=" << initial.width << 'x' << initial.height
        << " cells=" << initial.cells.size() << " seed=" << options.seed
        << " preset=" << options.preset << " order=" << static_cast<int>(options.order)
        << " warmup_ticks=32 repeats=" << options.repeats << " steps_per_repeat=" << options.steps
        << " samples=" << milliseconds.size() << " visited=" << visits << " swaps=" << swaps
        << " median_update_ms=" << median << " p95_update_ms=" << sampleQuantile(milliseconds, 0.95)
        << " checksum=" << finalChecksum << " grid_and_mask_bytes=" << initial.cells.size() + initial.moved.size()
        << " logical_cores=" << std::thread::hardware_concurrency();
#ifdef NDEBUG
    std::cout << " configuration=Release";
#else
    std::cout << " configuration=Debug";
#endif
#ifdef _MSC_VER
    std::cout << " compiler=MSVC-" << _MSC_VER;
#endif
    std::cout << " processor=\"" << processorDescription() << '"';
    std::cout << "\nUPDATE_RAW_MS";
    for (double value : milliseconds) {
        std::cout << ' ' << value;
    }
    std::cout << "\nNo input, allocation, RGBA conversion, upload, draw, or present is timed here.\n";
    return EXIT_SUCCESS;
}
#endif

} // namespace sand
