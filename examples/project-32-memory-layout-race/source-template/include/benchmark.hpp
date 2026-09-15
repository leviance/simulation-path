#pragma once

#include "particles.hpp"

#include <chrono>
#include <string_view>

namespace lab {

// Checkpoint 3: workload có tên và checksum observable cho baseline AoS.
#if LAB_CHECKPOINT >= 3
enum class MemoryWorkload {
    positionX,
    velocityOnly,
    integrate,
};

enum class MemoryLayout {
    aos,
    soa,
};

inline std::string_view workloadName(MemoryWorkload workload) {
    if (workload == MemoryWorkload::positionX) {
        return "position-x";
    }
    if (workload == MemoryWorkload::velocityOnly) {
        return "velocity-only";
    }
    return "integrate";
}

inline double runAoSWorkload(
    std::vector<ParticleAoS>& particles,
    MemoryWorkload workload,
    float deltaSeconds = 1.0F / 120.0F
) {
    if (workload == MemoryWorkload::positionX) {
        return sumPositionXAoS(particles);
    }
    if (workload == MemoryWorkload::velocityOnly) {
        dampVelocitiesAoS(particles, 0.9995F);
        return sumPositionXAoS(particles);
    }
    integrateAoS(particles, deltaSeconds);
    return sumPositionXAoS(particles);
}

struct AoSBaseline {
    std::size_t particleCount{};
    MemoryWorkload workload{};
    int repetitions{};
    double elapsedMilliseconds{};
    double checksum{};
};

inline AoSBaseline benchmarkAoSBaseline(
    std::span<const ParticleAoS> source,
    MemoryWorkload workload,
    int repetitions
) {
    AoSBaseline result{};
    result.particleCount = source.size();
    result.workload = workload;
    if (source.empty() || repetitions <= 0) {
        return result;
    }
    result.repetitions = repetitions;
    std::vector<ParticleAoS> warm(source.begin(), source.end());
    (void)runAoSWorkload(warm, workload);

    std::vector<ParticleAoS> measured(source.begin(), source.end());
    const auto started = std::chrono::steady_clock::now();
    for (int repetition = 0; repetition < repetitions; ++repetition) {
        result.checksum += runAoSWorkload(measured, workload);
    }
    const auto finished = std::chrono::steady_clock::now();
    result.elapsedMilliseconds =
        std::chrono::duration<double, std::milli>(finished - started).count();
    return result;
}
#endif

#if LAB_CHECKPOINT >= 5
inline double runSoAWorkload(
    ParticlesSoA& particles,
    MemoryWorkload workload,
    float deltaSeconds = 1.0F / 120.0F
) {
    if (workload == MemoryWorkload::positionX) {
        return sumPositionXSoA(particles);
    }
    if (workload == MemoryWorkload::velocityOnly) {
        dampVelocitiesSoA(particles, 0.9995F);
        return sumPositionXSoA(particles);
    }
    integrateSoA(particles, deltaSeconds);
    return sumPositionXSoA(particles);
}
#endif

// Checkpoint 6: mô hình cache line tách useful bytes khỏi bytes phải nạp.
#if LAB_CHECKPOINT >= 6
struct FieldSelection {
    std::array<std::size_t, kParticleFieldCount> offsets{};
    std::size_t count{};
};

inline FieldSelection fieldsForWorkload(MemoryWorkload workload) {
    FieldSelection selection{};
    if (workload == MemoryWorkload::positionX) {
        selection.offsets[0] = 0U;
        selection.count = 1U;
        return selection;
    }
    if (workload == MemoryWorkload::velocityOnly) {
        selection.offsets[0] = 3U;
        selection.offsets[1] = 4U;
        selection.offsets[2] = 5U;
        selection.count = 3U;
        return selection;
    }
    for (std::size_t field = 0; field < kParticleFieldCount; ++field) {
        selection.offsets[field] = field;
    }
    selection.count = kParticleFieldCount;
    return selection;
}

struct MemoryTrafficEstimate {
    MemoryLayout layout{};
    MemoryWorkload workload{};
    std::size_t particleCount{};
    std::size_t fieldCount{};
    std::size_t usefulBytes{};
    std::size_t cacheLines{};
    std::size_t loadedBytes{};
    double efficiency{};
};

inline MemoryTrafficEstimate estimateMemoryTraffic(
    MemoryLayout layout,
    MemoryWorkload workload,
    std::size_t particleCount,
    std::size_t cacheLineBytes = 64U
) {
    const std::size_t lineSize = std::max(cacheLineBytes, sizeof(float));
    const FieldSelection fields = fieldsForWorkload(workload);
    std::size_t cacheLines = 0U;
    if (layout == MemoryLayout::soa) {
        const std::size_t bytesPerArray = particleCount * sizeof(float);
        const std::size_t linesPerArray = (bytesPerArray + lineSize - 1U) / lineSize;
        cacheLines = linesPerArray * fields.count;
    } else {
        const std::size_t strideBytes = kParticleFieldCount * sizeof(float);
        if (particleCount > 0U && lineSize >= strideBytes) {
            const std::size_t firstAddress = fields.offsets[0] * sizeof(float);
            const std::size_t lastParticleOffset =
                (particleCount - 1U) * kParticleFieldCount;
            const std::size_t lastFieldOffset = fields.offsets[fields.count - 1U];
            const std::size_t lastAddress =
                (lastParticleOffset + lastFieldOffset) * sizeof(float);
            cacheLines = lastAddress / lineSize - firstAddress / lineSize + 1U;
        } else {
            std::size_t previousLine = std::numeric_limits<std::size_t>::max();
            for (std::size_t index = 0; index < particleCount; ++index) {
                for (std::size_t field = 0; field < fields.count; ++field) {
                    const std::size_t byteAddress =
                        (index * kParticleFieldCount + fields.offsets[field]) * sizeof(float);
                    const std::size_t line = byteAddress / lineSize;
                    if (line != previousLine) {
                        ++cacheLines;
                        previousLine = line;
                    }
                }
            }
        }
    }
    MemoryTrafficEstimate estimate{};
    estimate.layout = layout;
    estimate.workload = workload;
    estimate.particleCount = particleCount;
    estimate.fieldCount = fields.count;
    estimate.usefulBytes = particleCount * fields.count * sizeof(float);
    estimate.cacheLines = cacheLines;
    estimate.loadedBytes = cacheLines * lineSize;
    estimate.efficiency = 1.0;
    if (estimate.loadedBytes > 0U) {
        estimate.efficiency = double(estimate.usefulBytes) / double(estimate.loadedBytes);
    }
    return estimate;
}
#endif

// Checkpoint 7: benchmark đo hai layout trên cùng source và báo median.
#if LAB_CHECKPOINT >= 7
inline double medianMilliseconds(std::vector<double> samples) {
    if (samples.empty()) {
        return 0.0;
    }
    std::sort(samples.begin(), samples.end());
    const std::size_t middle = samples.size() / 2U;
    if (samples.size() % 2U == 1U) {
        return samples[middle];
    }
    return 0.5 * (samples[middle - 1U] + samples[middle]);
}

struct LayoutBenchmark {
    std::size_t particleCount{};
    MemoryWorkload workload{};
    int repetitions{};
    double aosMilliseconds{};
    double soaMilliseconds{};
    double aosChecksum{};
    double soaChecksum{};
    float maximumDifference{};
};

inline LayoutBenchmark benchmarkLayoutRace(
    std::span<const ParticleAoS> source,
    MemoryWorkload workload,
    int repetitions
) {
    LayoutBenchmark result{};
    result.particleCount = source.size();
    result.workload = workload;
    if (repetitions <= 0 || source.empty()) {
        return result;
    }
    result.repetitions = repetitions;

    std::vector<ParticleAoS> warmAoS(source.begin(), source.end());
    ParticlesSoA warmSoA = makeParticlesSoA(source);
    (void)runAoSWorkload(warmAoS, workload);
    (void)runSoAWorkload(warmSoA, workload);

    std::vector<double> aosSamples{};
    std::vector<double> soaSamples{};
    aosSamples.reserve(std::size_t(repetitions));
    soaSamples.reserve(std::size_t(repetitions));
    for (int repetition = 0; repetition < repetitions; ++repetition) {
        std::vector<ParticleAoS> aos(source.begin(), source.end());
        ParticlesSoA soa = makeParticlesSoA(source);

        const auto measureAoS = [&]() {
            const auto started = std::chrono::steady_clock::now();
            result.aosChecksum += runAoSWorkload(aos, workload);
            const auto finished = std::chrono::steady_clock::now();
            aosSamples.push_back(
                std::chrono::duration<double, std::milli>(finished - started).count()
            );
        };
        const auto measureSoA = [&]() {
            const auto started = std::chrono::steady_clock::now();
            result.soaChecksum += runSoAWorkload(soa, workload);
            const auto finished = std::chrono::steady_clock::now();
            soaSamples.push_back(
                std::chrono::duration<double, std::milli>(finished - started).count()
            );
        };

        // Đổi thứ tự qua từng sample để layout chạy sau không luôn có cùng lợi thế cache.
        if (repetition % 2 == 0) {
            measureAoS();
            measureSoA();
        } else {
            measureSoA();
            measureAoS();
        }
        result.maximumDifference = std::max(
            result.maximumDifference,
            maximumLayoutDifference(aos, soa)
        );
    }
    result.aosMilliseconds = medianMilliseconds(aosSamples);
    result.soaMilliseconds = medianMilliseconds(soaSamples);
    return result;
}

struct LayoutScalingRow {
    std::size_t particleCount{};
    LayoutBenchmark benchmark{};
    MemoryTrafficEstimate aosTraffic{};
    MemoryTrafficEstimate soaTraffic{};
};

inline std::vector<LayoutScalingRow> makeLayoutScalingStudy(
    std::span<const std::size_t> counts,
    std::uint32_t seed,
    MemoryWorkload workload,
    int repetitions
) {
    std::vector<LayoutScalingRow> rows{};
    rows.reserve(counts.size());
    for (const std::size_t count : counts) {
        const std::vector<ParticleAoS> source = makeParticlesAoS(count, seed);
        rows.push_back({
            count,
            benchmarkLayoutRace(source, workload, repetitions),
            estimateMemoryTraffic(MemoryLayout::aos, workload, count),
            estimateMemoryTraffic(MemoryLayout::soa, workload, count),
        });
    }
    return rows;
}
#endif

// Checkpoint 8: validation tách correctness, memory model và timing.
#if LAB_CHECKPOINT >= 8
struct MemoryLayoutValidationReport {
    bool deterministic{};
    bool conversionExact{};
    bool kernelsAgree{};
    bool singleFieldReducesTraffic{};
    bool fullWorkloadUsesAllBytes{};
    bool benchmarkObservable{};
};

inline MemoryLayoutValidationReport validateMemoryLayoutExperiment(std::uint32_t seed) {
    const std::vector<ParticleAoS> first = makeParticlesAoS(4'096, seed);
    const std::vector<ParticleAoS> second = makeParticlesAoS(4'096, seed);
    const ParticlesSoA converted = makeParticlesSoA(first);
    bool deterministic = first.size() == second.size();
    for (std::size_t index = 0; deterministic && index < first.size(); ++index) {
        deterministic = first[index].positionX == second[index].positionX &&
            first[index].positionY == second[index].positionY &&
            first[index].positionZ == second[index].positionZ &&
            first[index].velocityX == second[index].velocityX &&
            first[index].velocityY == second[index].velocityY &&
            first[index].velocityZ == second[index].velocityZ;
    }

    std::vector<ParticleAoS> aos = first;
    ParticlesSoA soa = converted;
    integrateAoS(aos, 1.0F / 120.0F);
    integrateSoA(soa, 1.0F / 120.0F);
    dampVelocitiesAoS(aos, 0.975F);
    dampVelocitiesSoA(soa, 0.975F);

    const MemoryTrafficEstimate aosSingle = estimateMemoryTraffic(
        MemoryLayout::aos,
        MemoryWorkload::positionX,
        1'000'000
    );
    const MemoryTrafficEstimate soaSingle = estimateMemoryTraffic(
        MemoryLayout::soa,
        MemoryWorkload::positionX,
        1'000'000
    );
    const MemoryTrafficEstimate aosFull = estimateMemoryTraffic(
        MemoryLayout::aos,
        MemoryWorkload::integrate,
        16'384
    );
    const MemoryTrafficEstimate soaFull = estimateMemoryTraffic(
        MemoryLayout::soa,
        MemoryWorkload::integrate,
        16'384
    );
    const LayoutBenchmark benchmark = benchmarkLayoutRace(
        first,
        MemoryWorkload::positionX,
        2
    );
    return {
        deterministic,
        maximumLayoutDifference(first, converted) == 0.0F,
        maximumLayoutDifference(aos, soa) == 0.0F,
        soaSingle.cacheLines < aosSingle.cacheLines,
        aosFull.efficiency == 1.0 && soaFull.efficiency == 1.0,
        std::isfinite(benchmark.aosMilliseconds) &&
            std::isfinite(benchmark.soaMilliseconds) &&
            benchmark.aosChecksum == benchmark.soaChecksum,
    };
}
#endif

} // namespace lab
