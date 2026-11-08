#define CLOTH_TIMING_SUMMARY_ONLY
#include "cloth_timing.hpp"

#include <iostream>

// Called by the ordinary project test runner; no SDL include, context, or GPU is required.
int runTimingSummaryTests() {
    int failures = 0;
    const auto check = [&](bool condition, const char* label) {
        if (!condition) {
            ++failures;
            std::cerr << "FAIL: " << label << '\n';
        }
    };
    check(cloth::benchmarkSettlingSteps == 60U && cloth::benchmarkWarmupPairs == 2U && cloth::benchmarkMeasuredPairs == 9U && cloth::benchmarkTotalSteps == 71U, "contact benchmark separates 60 preparation steps, 2 warm-up pairs and 9 measured pairs");
    check(cloth::benchmarkSettlingSteps + cloth::benchmarkWarmupPairs + 1U == 63U, "the first representative measured step is 63 rather than a freefall reset sample");
    const auto odd = cloth::summarizeTimings({100.0, 2.0, 1.0, 3.0, 4.0});
    check(odd.valid && odd.samples == 5U && odd.medianMs == 3.0 && odd.madMs == 1.0 && odd.minimumMs == 1.0 && odd.maximumMs == 100.0, "odd median and MAD resist a large timing outlier");
    const auto even = cloth::summarizeTimings({8.0, 2.0, 4.0, 6.0});
    check(even.valid && even.medianMs == 5.0 && even.madMs == 2.0, "even median and MAD use the midpoint of the two central values");
    const auto equal = cloth::summarizeTimings({0.0, 0.0, 0.0});
    check(equal.valid && equal.medianMs == 0.0 && equal.madMs == 0.0, "zero-duration and identical timing samples are valid");
    const auto singleton = cloth::summarizeTimings({7.0});
    check(singleton.valid && singleton.medianMs == 7.0 && singleton.madMs == 0.0, "one sample has its own median and zero MAD");
    check(!cloth::summarizeTimings({}).valid, "empty timing samples are not a completed measurement");
    check(!cloth::summarizeTimings({-1.0}).valid, "negative timing values are rejected");
    check(!cloth::summarizeTimings({std::numeric_limits<double>::infinity()}).valid, "infinite timing values are rejected");
    check(!cloth::summarizeTimings({std::numeric_limits<double>::quiet_NaN()}).valid, "NaN timing values are rejected");
    const auto huge = cloth::summarizeTimings({std::numeric_limits<double>::max(), std::numeric_limits<double>::max()});
    check(huge.valid && std::isfinite(huge.medianMs) && huge.madMs == 0.0, "even midpoint does not overflow for equal large finite durations");
    check(cloth::timingBudgetFits(20ULL, 40ULL, 40ULL, 100ULL), "memory peak includes original, candidate and previous shadow exactly");
    check(!cloth::timingBudgetFits(20ULL, 41ULL, 40ULL, 100ULL), "one byte over the allocation peak is refused");
    check(!cloth::timingBudgetFits(std::numeric_limits<std::uint64_t>::max(), 1ULL, 0ULL, std::numeric_limits<std::uint64_t>::max()), "memory preflight cannot wrap UINT64_MAX into a false fit");
    return failures;
}
