#include "sculpt_benchmark_statistics.hpp"
#include <iostream>

// Known distributions check statistics without making hardware-speed assertions.
// Zero/repeated/large finite samples must not be silently discarded or mutated.
void testBenchmarkStatistics() {
    using namespace sculpt;
    const std::array<double, 5> odd{1, 9, 5, 2, 6};
    const auto original = odd;
    const auto result = summarizeTimings(odd);
    if (result.median != 5 || result.minimum != 1 || result.maximum != 9 || result.mad != 3 || result.samples != 5 || odd != original)
        throw std::runtime_error("Timing distribution is wrong or mutated the recorded samples");
    const auto even = summarizeTimings(std::array<double, 4>{8, 2, 4, 6});
    if (even.median != 5 || even.mad != 2)
        throw std::runtime_error("Even timing sample counts did not average the central values");
    const auto repeated = summarizeTimings(std::array<double, 5>{2, 2, 2, 2, 2});
    const auto zero = summarizeTimings(std::array<double, 1>{0});
    if (repeated.median != 2 || repeated.mad != 0 || zero.median != 0 || zero.mad != 0)
        throw std::runtime_error("Repeated or zero timing samples were not retained honestly");
    const auto largest = std::numeric_limits<double>::max();
    const auto large = summarizeTimings(std::array<double, 2>{largest, largest});
    if (!std::isfinite(large.median) || large.median != largest)
        throw std::runtime_error("Median overflowed while averaging finite large values");

    const std::array<std::vector<double>, 5> invalid{{{}, {-1}, {std::numeric_limits<double>::quiet_NaN()}, {std::numeric_limits<double>::infinity()}, std::vector<double>(65, 1)}};
    for (const auto& values : invalid) {
        bool rejected = false;
        try {
            summarizeTimings(values);
        } catch (const std::invalid_argument&) {
            rejected = true;
        }
        if (!rejected)
            throw std::runtime_error("Invalid or unbounded timing samples reached the report");
    }

    BenchmarkTimings timings;
    timings.initial = {1, 101, 102, 103, 2, 3, 4, 5, 104};
    timings.local = {201, 202, 6, 7, 8, 9, 10, 11, 203};
    timings.full = {301, 302, 303, 304, 12, 13, 14, 15, 305};
    timings.draw = 16;
    const auto columns = timings.values();
    const std::array<std::string_view, 16> expectedNames{
        "initial.field", "initial.count", "initial.scan", "initial.emit", "initial.normals",
        "local.brush", "local.history", "local.count", "local.scan", "local.emit", "local.normals",
        "full.count", "full.scan", "full.emit", "full.normals", "render.draw"};
    if (benchmarkMetricNames != expectedNames)
        throw std::runtime_error("Benchmark labels no longer match the declared timing columns");
    for (std::size_t index = 0; index < columns.size(); ++index)
        if (columns[index] != static_cast<double>(index + 1) || benchmarkMetricNames[index].empty())
            throw std::runtime_error("Benchmark columns mixed lifetime totals or lost their labels");
    std::cout << "BENCHMARK STATISTICS PASS oddEven=1 medianMadRange=1 immutable=1 repeatedZero=1 finiteLarge=1 invalid=5 columns=16 noLifetimeDoubleCount=1\n";
}
