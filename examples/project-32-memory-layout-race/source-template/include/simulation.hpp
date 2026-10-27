#pragma once
#include "storage.hpp"
#include <chrono>
#include <string>

namespace lab {
using Clock = std::chrono::steady_clock;

inline double milliseconds(Clock::time_point start) {
    return std::chrono::duration<double, std::milli>(Clock::now() - start).count();
}
enum class Layout { aos,
                    soa };
enum class PendingWork { none,
                         physics,
                         conversion };

struct Simulation {
    FountainConfig config{};
    Layout layout{Layout::aos};
    std::vector<ParticleAoS> aos{}, nextAoS{};
#if LAB_CHECKPOINT >= 4
    ParticlesSoA soa{}, nextSoA{};
#endif
    std::size_t count{}, active{}, cursor{}, targetActive{}, updated{}, committedUpdated{}, respawned{}, born{};
    std::uint64_t steps{};
    double time{}, emissionRemainder{}, targetRemainder{};
    double copyMs{}, updateMs{}, conversionMs{}, wholeStepMs{};
    bool paused{true}, singleStep{}, cold{};
    PendingWork pending{PendingWork::none};
    Clock::time_point stepStarted{};
    std::string notice{"Ready; pre-warm is only the initial state"};

    // [snippet:reset]
    void reset(std::size_t requested, bool coldStart = false) {
        validateConfig(config);
        aos = makeParticlesAoS(requested, config, !coldStart);
        count = requested;
        cold = coldStart;
#if LAB_CHECKPOINT >= 1
        active = cold ? 0 : count;
#else
        active = std::min<std::size_t>(8, count);
#endif
        layout = Layout::aos;
        nextAoS.clear();
#if LAB_CHECKPOINT >= 4
        soa = {};
        nextSoA = {};
#endif
        pending = PendingWork::none;
        paused = true;
        singleStep = false;
        steps = 0;
        time = emissionRemainder = 0;
        updated = committedUpdated = born = respawned = cursor = 0;
        copyMs = updateMs = conversionMs = wholeStepMs = 0;
#if LAB_CHECKPOINT >= 1
        notice = cold ? "Cold start: emission adds stable slots" : "Warm start: every allocated slot is alive";
#else
        notice = "Scaffold: eight fixed particles; physics is not enabled";
#endif
    }

    // [/snippet:reset]

    ParticleAoS particle(std::size_t index) const {
#if LAB_CHECKPOINT >= 4
        if (layout == Layout::soa)
            return readParticle(soa, index);
#endif
        return aos[index];
    }

    void cancel() {
        pending = PendingWork::none;
        cursor = 0;
        paused = true;
        singleStep = false;
        notice = "Pending work cancelled; last complete state preserved";
    }

    std::size_t aosBytes() const {
        return (aos.capacity() + nextAoS.capacity()) * sizeof(ParticleAoS);
    }

    std::size_t soaBytes() const {
#if LAB_CHECKPOINT >= 4
        return allocatedBytes(soa) + allocatedBytes(nextSoA);
#else
        return 0;
#endif
    }

#if LAB_CHECKPOINT >= 2
    // [snippet:beginStep]
    void beginStep() {
        validateConfig(config);
#if LAB_CHECKPOINT < 5
        if (layout == Layout::soa) {
            notice = "SoA update arrives in checkpoint 05; use AoS to simulate";
            paused = true;
            singleStep = false;
            return;
        }
#endif
        const EmissionPlan plan = planEmission(active, count, emissionRemainder, config, fixedDt);
        targetActive = plan.active;
        targetRemainder = plan.remainder;
        if (layout == Layout::aos)
            nextAoS.resize(count);
#if LAB_CHECKPOINT >= 5
        else
            nextSoA.resize(count);
#endif
        cursor = updated = respawned = 0;
        born = targetActive - active;
        copyMs = updateMs = 0;
        stepStarted = Clock::now();
        pending = PendingWork::physics;
    }

    // [/snippet:beginStep]

    // [snippet:tickStep]
    bool tickStep(double budgetMs = 6) {
        if (pending != PendingWork::physics || (paused && !singleStep))
            return false;
        const auto deadline = Clock::now() + std::chrono::duration<double, std::milli>(budgetMs);
        do {
            const std::size_t end = std::min(count, cursor + 4096);
            auto started = Clock::now();
            if (layout == Layout::aos) {
                std::copy(aos.begin() + cursor, aos.begin() + end, nextAoS.begin() + cursor);
            }
#if LAB_CHECKPOINT >= 5
            else {
                for (std::size_t index = cursor; index < end; ++index)
                    writeParticle(nextSoA, index, readParticle(soa, index));
            }
#endif
            copyMs += milliseconds(started);
            const std::size_t updateEnd = std::min(end, targetActive);
            if (cursor < updateEnd) {
                started = Clock::now();
                if (layout == Layout::aos) {
                    respawned += updateAoSRange(nextAoS, cursor, updateEnd, config, fixedDt, MemoryWorkload::fullLifecycle, active);
                }
#if LAB_CHECKPOINT >= 5
                else {
                    respawned += updateSoARange(nextSoA, cursor, updateEnd, config, fixedDt, MemoryWorkload::fullLifecycle, active);
                }
#endif
                updateMs += milliseconds(started);
                updated += updateEnd - cursor;
            }
            cursor = end;
        } while (cursor < count && Clock::now() < deadline);
        if (cursor < count)
            return false;
        if (layout == Layout::aos)
            aos.swap(nextAoS);
#if LAB_CHECKPOINT >= 5
        else
            std::swap(soa, nextSoA);
#endif
        active = targetActive;
        committedUpdated = updated;
        emissionRemainder = targetRemainder;
        time += double(fixedDt);
        ++steps;
        wholeStepMs = milliseconds(stepStarted);
        singleStep = false;
        pending = PendingWork::none;
        notice = "Complete step committed; updated=" + std::to_string(updated);
        return true;
    }

    // [/snippet:tickStep]
#endif

#if LAB_CHECKPOINT >= 4
    // [snippet:beginConversion]
    void beginConversion() {
        cancel();
        if (layout == Layout::aos)
            soa.resize(count);
        else
            aos.resize(count);
        cursor = 0;
        conversionMs = 0;
        pending = PendingWork::conversion;
    }

    // [/snippet:beginConversion]
    // [snippet:tickConversion]
    bool tickConversion(double budgetMs = 6) {
        if (pending != PendingWork::conversion)
            return false;
        const auto deadline = Clock::now() + std::chrono::duration<double, std::milli>(budgetMs);
        do {
            const std::size_t end = std::min(count, cursor + 4096);
            const auto started = Clock::now();
            for (std::size_t index = cursor; index < end; ++index) {
                if (layout == Layout::aos)
                    writeParticle(soa, index, aos[index]);
                else
                    aos[index] = readParticle(soa, index);
            }
            conversionMs += milliseconds(started);
            cursor = end;
        } while (cursor < count && Clock::now() < deadline);
        if (cursor < count)
            return false;
        layout = layout == Layout::aos ? Layout::soa : Layout::aos;
        pending = PendingWork::none;
        notice = "Layout changed; ID/generation/fields/time and emission remainder preserved";
        return true;
    }

    // [/snippet:tickConversion]
#endif
};
} // namespace lab
