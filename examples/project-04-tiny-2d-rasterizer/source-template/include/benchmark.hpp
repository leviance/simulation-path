#pragma once
#include "lab.hpp"
#if LAB_CHECKPOINT >= 6
#include <array>
#include <chrono>
#include <cstdint>
#include <iostream>

namespace lab {
struct Segment {
    Point start;
    Point end;
};

inline std::vector<Segment> benchmarkData(int count) {
    std::uint32_t seed = 0x2D04u;
    const auto next = [&seed]() {
        seed = seed * 1664525u + 1013904223u;
        return seed;
    };
    std::vector<Segment> segments;
    for (int index = 0; index < count; ++index) {
        const Point start{static_cast<int>(next() % 960u), static_cast<int>(next() % 540u)};
        const Point end{static_cast<int>(next() % 960u), static_cast<int>(next() % 540u)};
        segments.push_back({start, end});
    }
    return segments;
}

// Hash mọi tọa độ, không chỉ size(): các pixel giữa đoạn phải thật sự được tính.
inline std::uint64_t consumePixels(const std::vector<LineStep>& steps, std::uint64_t checksum) {
    for (const LineStep& step : steps) {
        checksum ^= static_cast<std::uint32_t>(step.point.x);
        checksum *= 1099511628211ull;
        checksum ^= static_cast<std::uint32_t>(step.point.y);
        checksum *= 1099511628211ull;
    }
    return checksum;
}

struct Benchmark {
    static constexpr int rounds = 7;
    std::vector<Segment> segments;
    std::array<std::array<double, rounds>, 2> milliseconds{};
    std::array<std::uint64_t, 2> checksums{14695981039346656037ull, 14695981039346656037ull};
    std::uint64_t warmupChecksum = 0;
    std::size_t cursor = 0;
    int round = 0;
    bool warming = true;
    bool active = false;
    bool complete = false;
    std::chrono::steady_clock::time_point started{};
};

inline void beginBenchmark(Benchmark& benchmark, int count = 20'000) {
    benchmark = {};
    benchmark.segments = benchmarkData(std::clamp(count, 1, 20'000));
    benchmark.started = std::chrono::steady_clock::now();
    benchmark.active = true;
}

inline void measureBatch(Benchmark& benchmark, int algorithmIndex, std::size_t end) {
    Algorithm algorithm = Algorithm::Dda;
    if (algorithmIndex == 1) {
        algorithm = Algorithm::Bresenham;
    }
    std::uint64_t checksum = benchmark.checksums[static_cast<std::size_t>(algorithmIndex)];
    if (benchmark.warming) {
        checksum = benchmark.warmupChecksum;
    }

    const auto begin = std::chrono::steady_clock::now();
    for (std::size_t index = benchmark.cursor; index < end; ++index) {
        const Segment& segment = benchmark.segments[index];
        const auto steps = lineSteps(segment.start, segment.end, algorithm);
        checksum = consumePixels(steps, checksum);
    }
    const auto elapsed = std::chrono::steady_clock::now() - begin;
    if (benchmark.warming) {
        benchmark.warmupChecksum = checksum;
    } else {
        benchmark.checksums[static_cast<std::size_t>(algorithmIndex)] = checksum;
        benchmark.milliseconds[static_cast<std::size_t>(algorithmIndex)][static_cast<std::size_t>(benchmark.round)] += std::chrono::duration<double, std::milli>(elapsed).count();
    }
}

// Mỗi lần gọi xử lý tối đa 128 đoạn cho mỗi thuật toán rồi trả quyền cho event loop.
inline void advanceBenchmark(Benchmark& benchmark) {
    if (!benchmark.active) {
        return;
    }
    const auto age = std::chrono::steady_clock::now() - benchmark.started;
    if (age > std::chrono::seconds(30)) {
        benchmark.active = false;
        return;
    }
    std::size_t limit = benchmark.segments.size();
    if (benchmark.warming) {
        limit = std::min(limit, std::size_t(500));
    }
    const std::size_t end = std::min(benchmark.cursor + 128, limit);
    int first = benchmark.round % 2;
    measureBatch(benchmark, first, end);
    measureBatch(benchmark, 1 - first, end);
    benchmark.cursor = end;
    if (benchmark.cursor < limit) {
        return;
    }
    benchmark.cursor = 0;
    if (benchmark.warming) {
        benchmark.warming = false;
        return;
    }
    ++benchmark.round;
    if (benchmark.round == Benchmark::rounds) {
        benchmark.active = false;
        benchmark.complete = true;
    }
}

inline double median(std::array<double, Benchmark::rounds> values) {
    std::sort(values.begin(), values.end());
    return values[Benchmark::rounds / 2];
}

inline void printBenchmark(const Benchmark& benchmark) {
    if (!benchmark.complete) {
        std::cout << "Benchmark cancelled or timed out; no median reported.\n";
        return;
    }
#ifdef NDEBUG
    constexpr const char* kBuildType = "Release";
#else
    constexpr const char* kBuildType = "Debug";
#endif
    std::cout << kBuildType << " | " << benchmark.segments.size() << " lines x 7 rounds"
        << " | median per-round accumulated kernel time (ms): DDA " << median(benchmark.milliseconds[0])
        << ", Bresenham " << median(benchmark.milliseconds[1])
        << " | coordinate checksums " << benchmark.checksums[0] << "/" << benchmark.checksums[1]
        << " | warmup " << benchmark.warmupChecksum << '\n'
        << "Includes trace vector allocation, rasterization and coordinate hashing; excludes SDL, input generation and time between batches.\n";
}
} // namespace lab
#endif
