#pragma once

#include "atom_probe.hpp"
#include "atom_scene.hpp"
#include "atom_statistics.hpp"
#if LAB_CHECKPOINT >= 11
#include "atom_evaluate.hpp"
#endif
#include <iostream>
#include <numeric>

namespace atom {

namespace verify_detail {

using Clock = std::chrono::steady_clock;

inline void require(bool condition, const char* message) {
    if (!condition)
        throw std::runtime_error(message);
}

inline void deadline(Clock::time_point stop) {
    if (Clock::now() >= stop)
        throw std::runtime_error("GPU verification exceeded its thirty-second total deadline");
}

inline void finish(GpuCloud& cloud, Clock::time_point stop) {
    while (cloud.phase() == CloudPhase::generating) {
        deadline(stop);
        cloud.tick();
        if (cloud.phase() == CloudPhase::failed)
            throw std::runtime_error("GPU verification candidate failed: " + cloud.error());
        SDL_Delay(1);
    }
    require(cloud.ready(), "GPU verification did not publish a ready cloud");
    require(cloud.generated() == cloud.config().count && cloud.accepted() == cloud.config().count && cloud.invalid() == 0, "Requested/attempted/accepted counters disagree");
}

// Only a bounded subset is downloaded. Full-cloud correctness measurements
// below run against the actual GPU buffer, not against this CPU reference.
inline void compareRecords(const GpuCloud& cloud, std::uint32_t first, std::uint32_t count) {
    const auto records = cloud.referenceReadback(first, count);
    const float positionTolerance = cloud.config().radius * 0.00003F + 0.000001F;
    for (std::uint32_t index = 0; index < count; ++index) {
        const auto expected = sampleCpu(cloud.tables(), first + index);
        const auto& actual = records[index];
        require(finite(pointOf(actual)), "GPU readback contains nonfinite positions");
        for (int component = 0; component < 3; ++component)
            require(std::abs(actual.positionDensity[component] - expected.positionDensity[component]) <= positionTolerance, "GPU/CPU counter-sampler position mismatch");
        const double expectedDensity = expected.positionDensity[3];
        const double densityTolerance = 0.0000002 + expectedDensity * 0.0002;
        require(std::isfinite(actual.positionDensity[3]) && actual.positionDensity[3] >= 0 && std::abs(actual.positionDensity[3] - expectedDensity) <= densityTolerance, "GPU density does not match supplied CPU field");
        if (expectedDensity > 1e-18)
            require(actual.signPadding[0] == expected.signPadding[0], "GPU real-basis sign mismatch");
        for (int component = 1; component < 4; ++component)
            require(actual.signPadding[component] == 0, "GPU record padding was not initialized");
    }
}

#if LAB_CHECKPOINT >= 8
inline void measure(GlApi& gl, MemoryBudget& budget, const GpuCloud& cloud, Clock::time_point stop) {
    ProbeSettings settings;
    settings.clipAxis = 2;
    const bool testField = cloud.config().orbital == Orbital::uniformVolume || cloud.config().orbital == Orbital::affineMu;
    settings.radius = cloud.config().radius / 8;
    if (testField)
        settings.radius = cloud.config().radius / 2;
    GpuProbe probe(gl, budget);
    probe.request(cloud, settings);
    while (probe.busy()) {
        deadline(stop);
        probe.tick();
        SDL_Delay(1);
    }
    const auto& counts = probe.values();
    const auto count = cloud.config().count;
    require(probe.ready() && counts[0] == count && counts[1] == count && counts[21] == 0, "GPU probe did not examine every finite accepted record");
    std::uint64_t histogramSum = 0;
    const auto expectedHistogram = referenceRadialHistogram(cloud.config());
    // Explicitly separate Monte Carlo uncertainty (6 sigma) from the configured
    // midpoint/float CDF allowance. Clipping never replaces the denominator N.
    constexpr double tableTolerance = 0.0003;
    for (std::size_t bin = 0; bin < expectedHistogram.size(); ++bin) {
        histogramSum += counts[4 + bin];
        require(probabilityWithinTolerance(counts[4 + bin], count, expectedHistogram[bin], tableTolerance, 6), "Full GPU radial histogram differs from the independent analytic reference");
    }
    require(histogramSum == count, "GPU histogram lost or duplicated records");
    const double regionReference = referenceRadialProbability(cloud.config(), settings.radius);
    require(probabilityWithinTolerance(counts[3], count, regionReference, tableTolerance, 6), "GPU origin-region count differs from its independent integral");
    double visibleReference = 0.5;
    if (cloud.config().orbital == Orbital::affineMu)
        visibleReference = 0.35;
    require(probabilityWithinTolerance(counts[2], count, visibleReference, tableTolerance, 6), "GPU hemisphere count detects an angular PDF error");
    require(counts[20] <= counts[2] && counts[20] <= counts[3], "Clipped region count is not an intersection");
    // The public display interval uses the same full accepted-cloud denominator.
    const auto interval = binomialWilson(counts[3], count);
    require(interval.low >= 0 && interval.high <= 1, "GPU region produced an invalid uncertainty interval");
}
#endif

inline SamplingConfig config(Orbital id, std::uint32_t count, std::uint32_t seed) {
    SamplingConfig result;
    result.orbital = id;
    result.radius = defaultRadius(id);
    result.count = count;
    result.seed = seed;
    return result;
}

#if LAB_CHECKPOINT >= 5
inline void requireRetainedCloud(const CloudPane& pane, const GpuCloud* expectedCloud, const PointRecord& expectedRecord, std::uint32_t expectedCount) {
    require(pane.active() == expectedCloud && pane.active() != nullptr, "Lifecycle replaced the last-good cloud before publication");
    require(pane.active()->ready() && pane.active()->accepted() == expectedCount, "Lifecycle changed the last-good accepted count");
    const auto actual = pane.active()->referenceReadback(0, 1).front();
    require(actual.positionDensity == expectedRecord.positionDensity && actual.signPadding == expectedRecord.signPadding, "Lifecycle mutated the last-good point record");
}

inline std::uint32_t finishPane(CloudPane& pane, std::uint32_t expectedSeed, Clock::time_point stop, std::optional<std::uint32_t> forbiddenSeed = {}) {
    std::uint32_t published = 0;
    while (pane.pending()) {
        deadline(stop);
        if (pane.tick()) {
            ++published;
            require(pane.active() && pane.active()->config().seed == expectedSeed, "Lifecycle published an obsolete request");
        }
        if (forbiddenSeed && pane.active())
            require(pane.active()->config().seed != *forbiddenSeed, "Obsolete seed became visible during a replacement");
        SDL_Delay(1);
    }
    require(pane.active() && pane.current() && pane.active()->config().seed == expectedSeed, "Lifecycle did not publish the latest requested cloud");
    return published;
}

// Fill only the accounting budget, not VRAM. Restoring its prior peak prevents
// the final report from presenting a synthetic reservation as a real allocation.
class SyntheticBudgetReservation {
    public:
    explicit SyntheticBudgetReservation(MemoryBudget& budget) :
        budget_(budget),
        bytes_(MemoryBudget::limit - budget.reserved),
        previousPeak_(budget.peak) {
        budget_.acquire(bytes_);
    }

    ~SyntheticBudgetReservation() {
        budget_.release(bytes_);
        budget_.peak = previousPeak_;
    }

    SyntheticBudgetReservation(const SyntheticBudgetReservation&) = delete;
    SyntheticBudgetReservation& operator=(const SyntheticBudgetReservation&) = delete;

    private:
    MemoryBudget& budget_;
    std::size_t bytes_, previousPeak_;
};

// Exercise the actual C++ owner/state machine, not a text grep or a Canvas copy.
// These small lifecycle fixtures are reported separately from scale-test jobs.
inline std::uint32_t lifecycle(GlApi& gl, MemoryBudget& budget, Clock::time_point stop) {
    const auto baseline = budget.reserved;
    std::uint32_t checks = 0;
    {
        CloudPane pane(gl, budget);
        const auto original = config(Orbital::s1, 4093, 31337);
        pane.request(original, SamplingMode::weighted);
        require(finishPane(pane, original.seed, stop) == 1, "Initial lifecycle request was not published exactly once");
        const auto* originalCloud = pane.active();
        const auto originalRecord = originalCloud->referenceReadback(0, 1).front();
        const auto originalGeneration = pane.generation();
        ++checks;

        // A paused queued request must allocate no candidate and submit nothing.
        pane.pause();
        const auto replacement = config(Orbital::pz, 65537, 31338);
        pane.request(replacement, SamplingMode::weighted);
        for (int poll = 0; poll < 3; ++poll) {
            deadline(stop);
            require(!pane.tick() && pane.candidate() == nullptr && pane.pending(), "Pause started or published a queued replacement");
            require(pane.generation() == originalGeneration && !pane.current(), "Pause relabeled the old generation as current");
        }
        requireRetainedCloud(pane, originalCloud, originalRecord, original.count);
        ++checks;

        // Resume, create the candidate, then submit exactly its first batch.
        pane.pause();
        require(!pane.tick() && pane.candidate(), "Resume failed to create a candidate");
        require(pane.candidate()->generated() == 0 && !pane.candidate()->busy(), "Candidate submitted work during construction");
        require(!pane.tick() && pane.candidate() && pane.candidate()->busy(), "Candidate did not submit its first finite batch");
        pane.cancel();
        while (pane.pending()) {
            deadline(stop);
            require(!pane.tick(), "Cancel published the partial candidate");
            require(pane.active() == originalCloud && pane.generation() == originalGeneration, "Cancel replaced the visible last-good generation");
            SDL_Delay(1);
        }
        require(!pane.current() && pane.candidate() == nullptr, "Cancelled replacement remained current or pending");
        requireRetainedCloud(pane, originalCloud, originalRecord, original.count);
        ++checks;

        // Obsolete work is already in flight when the latest request arrives.
        const auto obsolete = config(Orbital::pz, 65537, 31339);
        const auto latest = config(Orbital::s2, 4093, 31340);
        pane.request(obsolete, SamplingMode::weighted);
        require(!pane.tick() && pane.candidate(), "Could not prepare the obsolete-request fixture");
        require(!pane.tick() && pane.candidate() && pane.candidate()->busy(), "Obsolete-request fixture submitted no work");
        pane.request(latest, SamplingMode::weighted);
        requireRetainedCloud(pane, originalCloud, originalRecord, original.count);
        require(finishPane(pane, latest.seed, stop, obsolete.seed) == 1, "Rapid requests published more than the latest cloud");
        require(pane.active()->accepted() == latest.count, "Latest request published an incorrect count");
        ++checks;

        // Reset is a fresh generation with the original config/seed, not a
        // camera operation or reuse of a differently labeled point buffer.
        pane.request(original, SamplingMode::weighted);
        require(finishPane(pane, original.seed, stop) == 1, "Reset request was not published exactly once");
        const auto* resetCloud = pane.active();
        require(resetCloud->config().orbital == original.orbital && resetCloud->config().radius == original.radius, "Reset changed the original field/domain");
        requireRetainedCloud(pane, resetCloud, originalRecord, original.count);
        ++checks;

        const auto reservedBeforeFailure = budget.reserved;
        {
            SyntheticBudgetReservation reservation(budget);
            const auto refused = config(Orbital::pz, 4093, 31341);
            pane.request(refused, SamplingMode::weighted);
            deadline(stop);
            require(!pane.tick() && !pane.pending() && !pane.candidate(), "Budget failure left a candidate queued or published");
            require(!pane.current() && pane.notice().find("budget") != std::string::npos, "Budget failure did not retain a clearly labeled last-good/error state");
            requireRetainedCloud(pane, resetCloud, originalRecord, original.count);
            require(budget.reserved == MemoryBudget::limit, "Failed candidate leaked or released another owner's budget");
        }
        require(budget.reserved == reservedBeforeFailure, "Synthetic budget reservation was not released");
        requireRetainedCloud(pane, resetCloud, originalRecord, original.count);
        ++checks;
    }
    require(budget.reserved == baseline, "CloudPane lifecycle leaked a buffer reservation after destruction");
    require(gl.GetError() == GL_NO_ERROR, "CloudPane lifecycle left a GL error");
    return checks;
}
#endif

} // namespace verify_detail

// This finite hidden-context check is separate from render/manual QA. It does
// not claim a frame rate, visual quality, or support for a five-million cloud.
inline void verifyGpu(GlApi& gl, MemoryBudget& budget) {
    using namespace verify_detail;
    const auto started = Clock::now();
    const auto stop = started + std::chrono::seconds(30);
    const auto baselineMemory = budget.reserved;
    std::uint64_t generated = 0;
    std::uint64_t evaluated = 0;
    std::uint32_t jobs = 0, maximumCount = 0;
    std::uint32_t corruptedFixtureN = 0, detectedInvalid = 0;
    std::uint32_t lifecycleChecks = 0;
    double evaluationGpuMs = 0;
    const char* scope = "small GPU records, odd counts and cancellation";
#if LAB_CHECKPOINT >= 5
    scope = "GPU million, odd counts and cancellation";
#endif
#if LAB_CHECKPOINT >= 8
    scope = "GPU million and multi-seed region/histogram references";
#endif
#if LAB_CHECKPOINT >= 11
    scope = "GPU million, probability references and field-consistency pass";
#endif
    const auto run = [&](SamplingConfig request, bool statistics, bool extensiveReadback) {
        deadline(stop);
        {
            GpuCloud cloud(gl, budget, request);
            finish(cloud, stop);
            std::uint32_t readCount = std::min<std::uint32_t>(257, request.count);
            if (extensiveReadback)
                readCount = std::min<std::uint32_t>(8191, request.count);
            compareRecords(cloud, 0, readCount);
            if (request.count > readCount)
                compareRecords(cloud, request.count - 257, 257);
#if LAB_CHECKPOINT >= 8
            if (statistics)
                measure(gl, budget, cloud, stop);
#else
            // Region/histogram measurement has not been implemented at this
            // checkpoint. A successful record check does not claim that evidence.
            (void)statistics;
#endif
#if LAB_CHECKPOINT >= 11
            if (request.count == 1000003) {
                GpuEvaluation evaluation(gl, budget);
                evaluation.request(cloud);
                while (evaluation.busy()) {
                    deadline(stop);
                    evaluation.tick();
                    SDL_Delay(1);
                }
                require(evaluation.ready() && evaluation.values()[0] == request.count && evaluation.values()[1] == 0, "Separate GPU field pass did not validate every million-cloud record");
                evaluated += evaluation.values()[0];
                evaluationGpuMs += evaluation.gpuMs();
            }
#endif
            generated += cloud.generated();
            ++jobs;
            maximumCount = std::max(maximumCount, request.count);
        }
        require(budget.reserved == baselineMemory, "GPU verification leaked a buffer reservation");
        require(gl.GetError() == GL_NO_ERROR, "GPU verification left a GL error");
    };

    // Padded dispatch boundaries and catalog formulas must work for actual odd
    // counts, not only a power of two or a convenient workgroup multiple.
    for (const auto count : std::array<std::uint32_t, 5>{1, 255, 256, 257, 4093})
        run(config(Orbital::pz, count, 17), false, false);
    for (std::size_t index = 0; index < physicalPresetCount; ++index)
        run(config(catalog()[index].id, 4093, 12345), false, false);

#if LAB_CHECKPOINT >= 5
    // The milestone is an actual GPU-generated million plus an odd tail. No
    // million-position CPU vector is created, uploaded, or read back here.
    run(config(Orbital::s1, 1000003, 12345), true, true);
#endif
#if LAB_CHECKPOINT >= 8
    for (const auto seed : std::array<std::uint32_t, 3>{1, 7, 987654321}) {
        run(config(Orbital::uniformVolume, 65537, seed), true, false);
        run(config(Orbital::affineMu, 65537, seed), true, false);
        run(config(Orbital::pz, 65537, seed), true, false);
    }
#endif

#if LAB_CHECKPOINT >= 11
    {
        // Prove the new pass checks stored density rather than merely counting
        // records. Corrupt only a disposable tiny fixture, never the visible app.
        GpuCloud cloud(gl, budget, config(Orbital::s1, 257, 991));
        finish(cloud, stop);
        const auto first = cloud.referenceReadback(0, 1).front();
        const float incorrectDensity = first.positionDensity[3] + 1;
        gl.BindBuffer(GL_SHADER_STORAGE_BUFFER, cloud.points().id());
        gl.BufferSubData(GL_SHADER_STORAGE_BUFFER, 3 * sizeof(float), sizeof(float), &incorrectDensity);
        gl.MemoryBarrier(GL_BUFFER_UPDATE_BARRIER_BIT | GL_SHADER_STORAGE_BARRIER_BIT);
        require(gl.GetError() == GL_NO_ERROR, "Could not prepare the corrupt-density GPU fixture");
        GpuEvaluation evaluation(gl, budget);
        evaluation.request(cloud);
        bool rejected = false;
        while (evaluation.busy()) {
            deadline(stop);
            try {
                evaluation.tick();
            } catch (const std::runtime_error&) {
                rejected = !evaluation.busy() && !evaluation.ready() && evaluation.values()[0] == 257 && evaluation.values()[1] == 1;
                if (!rejected)
                    throw;
            }
            SDL_Delay(1);
        }
        require(rejected, "GPU evaluation failed to reject an injected density mismatch");
        corruptedFixtureN = 257;
        detectedInvalid = evaluation.values()[1];
    }
    require(budget.reserved == baselineMemory, "Corrupt-density check leaked GPU buffers");
#endif

    {
        // Pausing before dispatch must submit no work. Cancellation after one
        // bounded dispatch must never make an unfinished candidate publishable.
#if LAB_CHECKPOINT >= 5
        GpuCloud candidate(gl, budget, config(Orbital::s1, 1000003, 99));
#else
        GpuCloud candidate(gl, budget, config(Orbital::s1, 4093, 99));
#endif
        candidate.pause(true);
        candidate.tick();
        require(!candidate.busy() && candidate.generated() == 0, "Paused generation submitted work");
        candidate.pause(false);
        candidate.tick();
        candidate.cancel();
        while (candidate.busy()) {
            deadline(stop);
            candidate.tick();
            SDL_Delay(1);
        }
        require(candidate.phase() == CloudPhase::cancelled && !candidate.ready() && candidate.accepted() <= 32768, "Cancellation published or overran a partial candidate");
    }
    require(budget.reserved == baselineMemory, "Cancel leaked GPU candidate buffers");
#if LAB_CHECKPOINT >= 5
    lifecycleChecks = lifecycle(gl, budget, stop);
#endif
    deadline(stop);
    const double elapsedMs = std::chrono::duration<double, std::milli>(Clock::now() - started).count();
    std::cout << "Atomic GPU verification passed: scope=" << scope << " jobs=" << jobs << " generated=" << generated
        << " accepted=" << generated << " maximumN=" << maximumCount
        << " evaluationExamined=" << evaluated << " evaluationReadFieldCompareAtomicsGpuMs=" << evaluationGpuMs
        << " corruptedFixtureN=" << corruptedFixtureN << " detectedInvalid=" << detectedInvalid
        << " lifecycleChecks=" << lifecycleChecks
        << " peakReservedBytes=" << budget.peak << " elapsedMs=" << elapsedMs << '\n';
}

} // namespace atom
