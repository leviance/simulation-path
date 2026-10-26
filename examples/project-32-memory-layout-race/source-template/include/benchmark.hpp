#pragma once
#include "simulation.hpp"
#include <array>

namespace lab {
#if LAB_CHECKPOINT >= 3
struct TimingStats {
    double median{}, minimum{}, maximum{};
};

// [snippet:summarizeTimes]
inline TimingStats summarizeTimes(std::vector<double> samples) {
    if (samples.empty())
        throw std::invalid_argument("No timing samples");
    std::sort(samples.begin(), samples.end());
    return {samples[samples.size() / 2], samples.front(), samples.back()};
}

// [/snippet:summarizeTimes]
struct BenchmarkRow {
    std::size_t count{}, updated{};
    MemoryWorkload workload{MemoryWorkload::fullLifecycle};
    TimingStats aos{}, soa{};
    double copyMs{}, conversionMs{}, checksumAoS{}, checksumSoA{};
    float maximumDifference{};
    bool paired{};
};
enum class BenchmarkPhase { prepare,
                            reset,
                            kernel,
                            verify };

struct BenchmarkJob {
    bool active{}, paused{}, timedOut{}, paired{};
    FountainConfig config{};
    std::vector<std::size_t> sizes{};
    std::vector<MemoryWorkload> workloads{};
    std::vector<ParticleAoS> initial{}, workAoS{};
#if LAB_CHECKPOINT >= 7
    ParticlesSoA workSoA{};
#endif
    std::vector<BenchmarkRow> rows{};
    std::vector<double> aosTimes{}, soaTimes{};
    BenchmarkRow row{};
    BenchmarkPhase phase{BenchmarkPhase::prepare};
    std::size_t caseIndex{}, target{};
    int sample{-1}, trial{}, method{}, step{};
    double kernelMs{};
    Clock::time_point deadline{};
    std::string notice{"No benchmark"};

    void start(const FountainConfig& source, std::vector<std::size_t> requestedSizes, std::vector<MemoryWorkload> requestedWorkloads) {
        validateConfig(source);
        if (requestedSizes.empty() || requestedSizes.size() > 3 || requestedWorkloads.empty() || requestedWorkloads.size() > 2)
            throw std::invalid_argument("Benchmark case budget");
        for (std::size_t count : requestedSizes) {
            if (count < 1 || count > maximumParticles)
                throw std::invalid_argument("Benchmark particle budget");
        }
        config = source;
        sizes = std::move(requestedSizes);
        workloads = std::move(requestedWorkloads);
#if LAB_CHECKPOINT >= 7
        paired = true;
#else
        paired = false;
#endif
        active = true;
        paused = timedOut = false;
        rows.clear();
        caseIndex = 0;
        deadline = Clock::now() + std::chrono::seconds(30);
        prepareCase();
    }

    void prepareCase() {
        row = {};
        row.count = sizes[caseIndex / workloads.size()];
        row.workload = workloads[caseIndex % workloads.size()];
        row.updated = row.count * 3;
        row.paired = paired;
        initial.resize(row.count);
        workAoS.resize(row.count);
#if LAB_CHECKPOINT >= 7
        workSoA.resize(row.count);
#endif
        target = 0;
        phase = BenchmarkPhase::prepare;
        aosTimes.clear();
        soaTimes.clear();
        sample = -1;
        trial = step = method = 0;
        kernelMs = 0;
        notice = "Preparing seeded input; allocation/copy excluded from kernel";
    }

    void chooseMethod() {
        // Alternate AB/BA between samples rather than always timing AoS first.
        method = paired ? (trial + std::max(0, sample) % 2) % 2 : 0;
        target = 0;
        step = 0;
        kernelMs = 0;
        phase = BenchmarkPhase::reset;
    }

    void resetUnit() {
        const std::size_t end = std::min(row.count, target + 4096);
        const auto started = Clock::now();
        if (method == 0) {
            std::copy(initial.begin() + target, initial.begin() + end, workAoS.begin() + target);
        }
#if LAB_CHECKPOINT >= 7
        else {
            for (std::size_t index = target; index < end; ++index)
                writeParticle(workSoA, index, initial[index]);
        }
#endif
        if (sample == 0) {
            if (method == 0)
                row.copyMs += milliseconds(started);
            else
                row.conversionMs += milliseconds(started);
        }
        target = end;
        if (target == row.count) {
            target = 0;
            phase = BenchmarkPhase::kernel;
        }
    }

    // [snippet:benchmarkKernelUnit]
    void kernelUnit() {
        const std::size_t end = std::min(row.count, target + 4096);
        const auto started = Clock::now();
        if (method == 0) {
            updateAoSRange(workAoS, target, end, config, fixedDt, row.workload, row.count);
        }
#if LAB_CHECKPOINT >= 7
        else {
            updateSoARange(workSoA, target, end, config, fixedDt, row.workload, row.count);
        }
#endif
        kernelMs += milliseconds(started);
        target = end;
        if (target != row.count)
            return;
        target = 0;
        if (++step < 3)
            return;
        if (sample >= 0) {
            if (method == 0)
                aosTimes.push_back(kernelMs);
            else
                soaTimes.push_back(kernelMs);
        }
        ++trial;
        if (trial < (paired ? 2 : 1))
            chooseMethod();
        else {
            row.checksumAoS = row.checksumSoA = 0;
            phase = BenchmarkPhase::verify;
        }
    }

    // [/snippet:benchmarkKernelUnit]
    void verifyUnit() {
        const std::size_t end = std::min(row.count, target + 4096);
        for (std::size_t index = target; index < end; ++index) {
            const auto& first = workAoS[index];
            if (first.id != index || !finiteParticle(first))
                throw std::runtime_error("AoS state validation failed");
            row.checksumAoS += particleChecksum(first);
#if LAB_CHECKPOINT >= 7
            const ParticleAoS second = readParticle(workSoA, index);
            row.checksumSoA += particleChecksum(second);
            row.maximumDifference = std::max(row.maximumDifference, particleDifference(first, second));
#endif
        }
        target = end;
        if (target < row.count)
            return;
        if (paired && row.maximumDifference > 1e-5F)
            throw std::runtime_error("AoS/SoA state mismatch");
        target = 0;
        trial = 0;
        ++sample;
        if (sample < 5) {
            chooseMethod();
            return;
        }
        row.aos = summarizeTimes(aosTimes);
#if LAB_CHECKPOINT >= 7
        row.soa = summarizeTimes(soaTimes);
#endif
        rows.push_back(row);
        if (++caseIndex < sizes.size() * workloads.size())
            prepareCase();
        else {
            active = false;
            notice = "Complete: 1 warm-up + 5 samples, 3 full-N passes each; checksum verified";
        }
    }

    void tick(double budgetMs = 6) {
        if (!active || paused)
            return;
        const auto until = Clock::now() + std::chrono::duration<double, std::milli>(budgetMs);
        do {
            if (Clock::now() >= deadline) {
                active = false;
                timedOut = true;
                notice = "INCOMPLETE: 30-second wall deadline (including pauses)";
                return;
            }
            if (phase == BenchmarkPhase::prepare) {
                const std::size_t end = std::min(row.count, target + 4096);
                for (std::size_t index = target; index < end; ++index)
                    initial[index] = warmParticle(std::uint32_t(index), config);
                target = end;
                if (target == row.count)
                    chooseMethod();
            } else if (phase == BenchmarkPhase::reset)
                resetUnit();
            else if (phase == BenchmarkPhase::kernel)
                kernelUnit();
            else
                verifyUnit();
        } while (active && Clock::now() < until);
    }

    void cancel() {
        active = false;
        notice = "Cancelled; only completed rows retained";
    }
};
#endif

#if LAB_CHECKPOINT >= 6
struct TrafficModel {
    std::size_t usefulBytes{}, uniqueLines{}, loadedBytes{};
    bool upperBound{};
};

// [snippet:modelTraffic]
inline TrafficModel modelTraffic(std::size_t count, Layout layout, MemoryWorkload workload) {
    if (count > maximumParticles)
        throw std::invalid_argument("Traffic model budget");
    if (count == 0)
        return {};
    TrafficModel result{};
    if (workload == MemoryWorkload::gravityOnly) {
        result.usefulBytes = count * sizeof(float);
        if (layout == Layout::aos) {
            const std::size_t offset = offsetof(ParticleAoS, velocityY);
            result.uniqueLines = (offset + (count - 1) * sizeof(ParticleAoS)) / 64 + 1;
        } else
            result.uniqueLines = (count * sizeof(float) + 63) / 64;
    } else {
        // Upper bound assuming all eleven fields are touched. Real respawn
        // touches ID/generation/hue selectively; this is not a cache-miss count.
        result.upperBound = true;
        result.usefulBytes = count * sizeof(ParticleAoS);
        result.uniqueLines = layout == Layout::aos ? (result.usefulBytes + 63) / 64 : 11 * ((count * sizeof(float) + 63) / 64);
    }
    result.loadedBytes = result.uniqueLines * 64;
    return result;
}

// [/snippet:modelTraffic]
#endif
} // namespace lab
