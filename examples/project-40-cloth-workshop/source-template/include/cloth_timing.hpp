#pragma once

#include <algorithm>
#include <cmath>
#include <cstdint>
#include <limits>
#include <string>
#include <vector>

namespace cloth {

inline constexpr std::uint32_t benchmarkSettlingSteps = 60U;
inline constexpr std::uint32_t benchmarkWarmupPairs = 2U;
inline constexpr std::uint32_t benchmarkMeasuredPairs = 9U;
inline constexpr std::uint32_t benchmarkTotalPairs = benchmarkWarmupPairs + benchmarkMeasuredPairs;
inline constexpr std::uint32_t benchmarkTotalSteps = benchmarkSettlingSteps + benchmarkTotalPairs;

struct TimingSummary {
    bool valid{};
    std::size_t samples{};
    double medianMs{};
    double madMs{};
    double minimumMs{};
    double maximumMs{};
};

inline double sortedMedian(const std::vector<double>& sorted) {
    if (sorted.empty()) {
        return std::numeric_limits<double>::quiet_NaN();
    }
    const std::size_t middle = sorted.size() / 2U;
    if (sorted.size() % 2U != 0U) {
        return sorted[middle];
    }
    return sorted[middle - 1U] + (sorted[middle] - sorted[middle - 1U]) * 0.5;
}

inline TimingSummary summarizeTimings(const std::vector<double>& values) {
    TimingSummary summary{};
    if (values.empty()) {
        return summary;
    }
    for (const double value : values) {
        if (!std::isfinite(value) || value < 0.0) {
            return summary;
        }
    }
    auto sorted = values;
    std::sort(sorted.begin(), sorted.end());
    summary.samples = sorted.size();
    summary.medianMs = sortedMedian(sorted);
    summary.minimumMs = sorted.front();
    summary.maximumMs = sorted.back();
    std::vector<double> deviations{};
    deviations.reserve(sorted.size());
    for (const double value : sorted) {
        deviations.push_back(std::abs(value - summary.medianMs));
    }
    std::sort(deviations.begin(), deviations.end());
    summary.madMs = sortedMedian(deviations);
    summary.valid = true;
    return summary;
}

// Subtractions avoid overflow even when an external caller supplies UINT64_MAX.
inline bool timingBudgetFits(std::uint64_t external, std::uint64_t candidate, std::uint64_t previous, std::uint64_t budget) {
    if (external > budget) {
        return false;
    }
    std::uint64_t available = budget - external;
    if (candidate > available) {
        return false;
    }
    available -= candidate;
    return previous <= available;
}

} // namespace cloth

// Windowless CPU tests exercise the actual summary implementation without importing SDL.
#ifndef CLOTH_TIMING_SUMMARY_ONLY

#include "cloth_gpu.hpp"

#include <iomanip>
#include <sstream>

namespace cloth {

// Timestamp pairs do not nest GL_TIME_ELAPSED, so a renderer timer cannot conflict with
// the solver's stage queries. A query is never read until its fence and availability agree.
class DrawTimer {
    GlApi* gl_{};
    std::array<GLuint, 2> queries_{};
    GLsync fence_{};
    bool recording_{};
    bool valid_{};
    bool failed_{};
    double milliseconds_{};
    std::string message_{"Draw timer is idle"};
    std::chrono::steady_clock::time_point beganAt_{};
    std::chrono::steady_clock::time_point endedAt_{};

    void fail(const std::string& reason) {
        cancel();
        failed_ = true;
        message_ = reason;
    }

    public:
    DrawTimer() = default;
    DrawTimer(const DrawTimer&) = delete;
    DrawTimer& operator=(const DrawTimer&) = delete;

    ~DrawTimer() {
        destroy();
    }

    bool initialize(GlApi& gl, std::string& error) {
        destroy();
        gl_ = &gl;
        gl_->GenQueries(2, queries_.data());
        if (queries_[0] == 0U || queries_[1] == 0U || gl_->GetError() != GL_NO_ERROR) {
            error = "Cannot allocate the GPU draw timestamp queries.";
            destroy();
            return false;
        }
        message_ = "GPU draw timer ready";
        return true;
    }

    bool begin() {
        if (gl_ == nullptr || recording_ || fence_ != nullptr) {
            return false;
        }
        // Keep the last completed value readable while a newer sample is in flight.
        failed_ = false;
        recording_ = true;
        beganAt_ = std::chrono::steady_clock::now();
        gl_->QueryCounter(queries_[0], GL_TIMESTAMP);
        if (gl_->GetError() != GL_NO_ERROR) {
            fail("GPU draw start timestamp failed.");
            return false;
        }
        return true;
    }

    bool end() {
        if (!recording_ || gl_ == nullptr) {
            return false;
        }
        gl_->QueryCounter(queries_[1], GL_TIMESTAMP);
        fence_ = gl_->FenceSync(GL_SYNC_GPU_COMMANDS_COMPLETE, 0U);
        gl_->Flush();
        endedAt_ = std::chrono::steady_clock::now();
        recording_ = false;
        if (fence_ == nullptr || gl_->GetError() != GL_NO_ERROR) {
            fail("GPU draw end timestamp or fence failed.");
            return false;
        }
        return true;
    }

    bool poll() {
        if (recording_ && std::chrono::steady_clock::now() - beganAt_ > std::chrono::seconds(5)) {
            fail("GPU draw recording was not ended within five seconds.");
            return false;
        }
        if (fence_ == nullptr || gl_ == nullptr) {
            return false;
        }
        const GLenum result = gl_->ClientWaitSync(fence_, 0U, 0ULL);
        if (result == GL_WAIT_FAILED) {
            fail("GPU draw timer fence failed.");
            return false;
        }
        if (result != GL_ALREADY_SIGNALED && result != GL_CONDITION_SATISFIED) {
            if (std::chrono::steady_clock::now() - endedAt_ > std::chrono::seconds(5)) {
                fail("GPU draw timer exceeded its five-second deadline.");
            }
            return false;
        }
        GLint firstReady = GL_FALSE;
        GLint lastReady = GL_FALSE;
        gl_->GetQueryObjectiv(queries_[0], GL_QUERY_RESULT_AVAILABLE, &firstReady);
        gl_->GetQueryObjectiv(queries_[1], GL_QUERY_RESULT_AVAILABLE, &lastReady);
        if (firstReady != GL_TRUE || lastReady != GL_TRUE) {
            if (std::chrono::steady_clock::now() - endedAt_ > std::chrono::seconds(5)) {
                fail("GPU draw timestamp availability exceeded its five-second deadline.");
            }
            return false;
        }
        GLuint64 first = 0ULL;
        GLuint64 last = 0ULL;
        gl_->GetQueryObjectui64v(queries_[0], GL_QUERY_RESULT, &first);
        gl_->GetQueryObjectui64v(queries_[1], GL_QUERY_RESULT, &last);
        if (last < first || gl_->GetError() != GL_NO_ERROR) {
            fail("GPU draw timestamps are invalid or unordered.");
            return false;
        }
        milliseconds_ = static_cast<double>(last - first) / 1000000.0;
        gl_->DeleteSync(fence_);
        fence_ = nullptr;
        valid_ = true;
        message_ = "GPU draw timestamp sample complete";
        return true;
    }

    void cancel() {
        if (fence_ != nullptr && gl_ != nullptr) {
            gl_->DeleteSync(fence_);
        }
        fence_ = nullptr;
        recording_ = false;
        valid_ = false;
        failed_ = false;
        milliseconds_ = 0.0;
    }

    void destroy() {
        cancel();
        if (gl_ != nullptr && (queries_[0] != 0U || queries_[1] != 0U)) {
            gl_->DeleteQueries(2, queries_.data());
        }
        queries_ = {};
        gl_ = nullptr;
    }

    bool busy() const {
        return recording_ || fence_ != nullptr;
    }

    bool valid() const {
        return valid_;
    }

    bool failed() const {
        return failed_;
    }

    double milliseconds() const {
        return milliseconds_;
    }

    const std::string& message() const {
        return message_;
    }
};

struct BenchmarkSample {
    Stats stats{};
    double drawMs{};
    double drawEnqueueMs{};
    double completionWallMs{};
};

struct BenchmarkSummary {
    TimingSummary resetBaselineStep{};
    TimingSummary prediction{};
    TimingSummary solver{};
    TimingSummary grid{};
    TimingSummary contact{};
    TimingSummary velocity{};
    TimingSummary normals{};
    TimingSummary diagnostics{};
    TimingSummary step{};
    TimingSummary draw{};
    TimingSummary stepPlusDraw{};
    TimingSummary drawEnqueue{};
    TimingSummary completionWall{};
};

class BenchmarkJob {
    enum class Phase { Submit,
                    AwaitStep,
                    ReadyToDraw,
                    Drawing,
                    AwaitDraw };
    GlApi* gl_{};
    std::unique_ptr<GpuCloth> shadow_{};
    DrawTimer drawTimer_{};
    Settings settings_{};
    Settings solverSettings_{};
    Phase phase_{Phase::Submit};
    bool active_{};
    bool passed_{};
    bool allocated_{};
    std::uint32_t completed_{};
    std::uint32_t settled_{};
    std::uint64_t externalBytes_{};
    std::uint64_t peakBytes_{};
    int viewportWidth_{};
    int viewportHeight_{};
    Stats pendingStats_{};
    std::vector<BenchmarkSample> samples_{};
    std::vector<Stats> resetBaseline_{};
    BenchmarkSummary summary_{};
    std::string device_{};
    std::string version_{};
    std::string message_{"Benchmark is idle"};
    std::chrono::steady_clock::time_point deadline_{};
    std::chrono::steady_clock::time_point submittedAt_{};
    std::chrono::steady_clock::time_point drawBeganAt_{};
    double drawEnqueueMs_{};
    double resetPreparationMs_{};

    void fail(const std::string& reason) {
        active_ = false;
        passed_ = false;
        drawTimer_.cancel();
        message_ = "Benchmark incomplete: " + reason;
    }

    bool deadlineExceeded() {
        if (active_ && std::chrono::steady_clock::now() >= deadline_) {
            fail("25-second total deadline exceeded; no successful result is reported");
            return true;
        }
        return false;
    }

    TimingSummary summarizeStage(double Stats::*member) const {
        std::vector<double> values{};
        values.reserve(samples_.size());
        for (const auto& sample : samples_) {
            values.push_back(sample.stats.*member);
        }
        return summarizeTimings(values);
    }

    void buildReport() {
        if (samples_.size() != benchmarkMeasuredPairs || resetBaseline_.size() != benchmarkMeasuredPairs) {
            fail("the reset baseline or representative measured sample set is incomplete");
            return;
        }
        summary_.prediction = summarizeStage(&Stats::predictionMs);
        summary_.solver = summarizeStage(&Stats::solverMs);
        summary_.grid = summarizeStage(&Stats::gridMs);
        summary_.contact = summarizeStage(&Stats::contactMs);
        summary_.velocity = summarizeStage(&Stats::velocityMs);
        summary_.normals = summarizeStage(&Stats::normalsMs);
        summary_.diagnostics = summarizeStage(&Stats::diagnosticsMs);
        summary_.step = summarizeStage(&Stats::totalMs);
        std::vector<double> draw{};
        std::vector<double> combined{};
        std::vector<double> enqueue{};
        std::vector<double> wall{};
        std::uint64_t minimumCandidates = std::numeric_limits<std::uint64_t>::max();
        std::uint64_t maximumCandidates = 0ULL;
        std::uint32_t minimumContacts = std::numeric_limits<std::uint32_t>::max();
        std::uint32_t maximumContacts = 0U;
        std::uint64_t analyticEvents = 0ULL;
        float worstStretch = 0.0F;
        float worstDistanceResidual = 0.0F;
        float worstResidual = 0.0F;
        float worstPenetration = 0.0F;
        for (const auto& sample : samples_) {
            draw.push_back(sample.drawMs);
            combined.push_back(sample.stats.totalMs + sample.drawMs);
            enqueue.push_back(sample.drawEnqueueMs);
            wall.push_back(sample.completionWallMs);
            minimumCandidates = std::min(minimumCandidates, sample.stats.candidates);
            maximumCandidates = std::max(maximumCandidates, sample.stats.candidates);
            minimumContacts = std::min(minimumContacts, sample.stats.contacts);
            maximumContacts = std::max(maximumContacts, sample.stats.contacts);
            analyticEvents += sample.stats.analyticContacts;
            worstStretch = std::max(worstStretch, sample.stats.maxStretch);
            worstDistanceResidual = std::max(worstDistanceResidual, sample.stats.maxStrain);
            worstResidual = std::max(worstResidual, sample.stats.maxResidual);
            worstPenetration = std::max(worstPenetration, sample.stats.maxPenetration);
        }
        summary_.draw = summarizeTimings(draw);
        summary_.stepPlusDraw = summarizeTimings(combined);
        summary_.drawEnqueue = summarizeTimings(enqueue);
        summary_.completionWall = summarizeTimings(wall);
        if (settings_.preset != Preset::Hanging && analyticEvents == 0ULL) {
            fail("sphere/table representative samples have no analytic contact after 60 settling steps; no contact benchmark is certified");
            return;
        }
        std::vector<double> baselineStep{};
        std::uint64_t baselineAnalyticEvents = 0ULL;
        std::uint64_t baselineSelfEvents = 0ULL;
        for (const Stats& stats : resetBaseline_) {
            baselineStep.push_back(stats.totalMs);
            baselineAnalyticEvents += stats.analyticContacts;
            baselineSelfEvents += stats.selfContacts;
        }
        summary_.resetBaselineStep = summarizeTimings(baselineStep);
        std::ostringstream output{};
        output << std::fixed << std::setprecision(3);
        output << "BENCHMARK COMPLETE: 60 settling/preparation GPU steps excluded from representative statistics, "
            << "then 2 warm-up + 9 matched measured step/draw pairs (GPU steps 63..71).\n";
        output << "GPU=" << device_ << "; OpenGL=" << version_;
#ifdef NDEBUG
        output << "; configuration=Release/NDEBUG";
#else
        output << "; configuration=Debug (performance result is not a Release claim)";
#endif
        output << "; C++20; viewport=" << viewportWidth_ << 'x' << viewportHeight_ << ".\n";
        output << "preset=" << static_cast<std::uint32_t>(settings_.preset) << " (0 hanging, 1 sphere, 2 table)"
            << "; side=" << settings_.side << "; vertices=" << shadow_->topology().positions.size()
            << "; dynamic=" << pendingStats_.dynamic << "; pinned=" << pendingStats_.pinned
            << "; updated=" << pendingStats_.updated << "; drawn=" << shadow_->topology().positions.size()
            << "; normals=" << pendingStats_.normals << "; triangles=" << shadow_->topology().indices.size() / 3U
            << "; unique constraints=" << shadow_->topology().constraints.size()
            << "; visits/step=" << pendingStats_.constraints << "; dt=" << std::setprecision(6) << settings_.dt
            << "; substeps=" << settings_.substeps << "; iterations=" << settings_.iterations << ".\n";
        output << std::scientific << "extent=" << settings_.extent << "; thickness=" << settings_.thickness
            << "; compliance=" << settings_.compliance << "; bend compliance=" << settings_.bendCompliance
            << "; damping=" << settings_.damping << "; friction fraction=" << settings_.friction
            << "; gravity=" << settings_.gravity << "; wind=" << settings_.wind << ".\n";
        output << std::fixed << std::setprecision(3);
        output << "Memory bytes: external=" << externalBytes_ << "; shadow GPU=" << shadow_->memoryBytes()
            << "; shadow planned host=" << shadow_->hostMemoryBytes() << "; allocation peak=" << peakBytes_
            << "; budget=" << settings_.memoryBudget << ".\n";
        output << "Shadow reset/allocation CPU wall=" << resetPreparationMs_
            << "ms (excluded from per-step GPU samples).\n";
        const auto line = [&](const char* label, const TimingSummary& value) {
            output << label << " median=" << value.medianMs << "ms MAD=" << value.madMs
                << "ms range=[" << value.minimumMs << ',' << value.maximumMs << "]ms\n";
        };
        output << "Separate from-reset GPU-only baseline: settling steps 1..9, no matched draw; analytic events="
            << baselineAnalyticEvents << "; self-contact events=" << baselineSelfEvents << ". ";
        if (baselineAnalyticEvents == 0ULL && baselineSelfEvents == 0ULL) {
            output << "Contact-free initial transient; freefall applies only to unpinned presets.\n";
        } else {
            output << "This requested configuration is not a contact-free/freefall baseline.\n";
        }
        line("From-reset baseline GPU whole step", summary_.resetBaselineStep);
        output << "Representative settled samples below: 9 pairs; analytic events=" << analyticEvents << ".\n";
        line("GPU prediction/input/lambda reset", summary_.prediction);
        line("GPU solver + analytic contacts", summary_.solver);
        line("GPU grid + hierarchical scan/scatter", summary_.grid);
        line("GPU self-contact + correction/analytic apply", summary_.contact);
        line("GPU velocity", summary_.velocity);
        line("GPU normals", summary_.normals);
        line("GPU diagnostics/rollback", summary_.diagnostics);
        line("GPU whole step", summary_.step);
        line("GPU scene draw (excludes UI/present)", summary_.draw);
        line("GPU step + draw interval sum (not wall frame)", summary_.stepPlusDraw);
        line("CPU draw enqueue (not GPU duration)", summary_.drawEnqueue);
        line("Sample completion wall (includes UI poll cadence)", summary_.completionWall);
        output << "Candidates/step=" << minimumCandidates << ".." << maximumCandidates
            << "; contact events/step=" << minimumContacts << ".." << maximumContacts
            << "; max stretch/shear elongation=" << worstStretch << "; max residual=" << worstResidual
            << "m; max all-kind relative distance residual=" << worstDistanceResidual
            << "; analytic penetration=" << worstPenetration << "m.\n";
        if (worstStretch > 0.25F) {
            output << "WARNING: local positive elongation exceeds 25%; finite solver error remains.\n";
        }
        output << "Original interactive state was not modified. Reset baseline and settled samples are different physical states, "
            << "not a speedup comparison. Timings certify measurement completion, not garment accuracy or universal FPS.";
        message_ = output.str();
        passed_ = true;
        active_ = false;
    }

    bool validStep(const Stats& stats) const {
        const auto vertices = static_cast<std::uint32_t>(shadow_->topology().positions.size());
        const auto visits = static_cast<std::uint32_t>(shadow_->topology().constraints.size()) * settings_.substeps * settings_.iterations;
        if (stats.steps != settled_ + completed_ + 1ULL || stats.updated + stats.pinned != vertices || stats.normals != vertices || stats.constraints != visits || stats.countedVertices != vertices || stats.invalid != 0U || stats.overflow != 0U) {
            return false;
        }
        for (double Stats::*member : {&Stats::predictionMs, &Stats::solverMs, &Stats::gridMs, &Stats::contactMs, &Stats::velocityMs, &Stats::normalsMs, &Stats::diagnosticsMs, &Stats::totalMs}) {
            const double value = stats.*member;
            if (!std::isfinite(value) || value < 0.0) {
                return false;
            }
        }
        return std::isfinite(stats.maxStretch) && std::isfinite(stats.maxStrain) && std::isfinite(stats.maxResidual) && std::isfinite(stats.maxPenetration);
    }

    public:
    BenchmarkJob() = default;
    BenchmarkJob(const BenchmarkJob&) = delete;
    BenchmarkJob& operator=(const BenchmarkJob&) = delete;

    ~BenchmarkJob() {
        destroy();
    }

    bool initialize(GlApi& gl, const std::filesystem::path& directory, std::string& error) {
        destroy();
        gl_ = &gl;
        shadow_ = std::make_unique<GpuCloth>(gl);
        if (!shadow_->initialize(directory, error) || !drawTimer_.initialize(gl, error)) {
            destroy();
            return false;
        }
        const auto* renderer = gl.GetString(GL_RENDERER);
        const auto* version = gl.GetString(GL_VERSION);
        device_ = "unavailable";
        version_ = "unavailable";
        if (renderer != nullptr) {
            device_ = reinterpret_cast<const char*>(renderer);
        }
        if (version != nullptr) {
            version_ = reinterpret_cast<const char*>(version);
        }
        message_ = "Benchmark ready: shadow scene, 60 settling steps + 2 warm-ups + 9 measured pairs";
        return true;
    }

    bool begin(const Settings& settings, std::uint64_t externalResidentBytes, int viewportWidth, int viewportHeight, std::string& error) {
        const auto refused = [&]() {
            passed_ = false;
            message_ = "Benchmark refused: " + error;
            return false;
        };
        if (!shadow_ || active_ || !validSettings(settings, error)) {
            if (error.empty()) {
                error = "Benchmark is uninitialized or already active; cancel before restarting.";
            }
            return refused();
        }
        if (viewportWidth < 1 || viewportHeight < 1 || viewportWidth > 16384 || viewportHeight > 16384) {
            error = "Benchmark viewport is outside the finite 1..16384 pixel range.";
            return refused();
        }
        const auto startedAt = std::chrono::steady_clock::now();
        try {
            const std::uint64_t candidate = plannedMemoryBytes(settings) + plannedHostMemoryBytes(settings) + 8192ULL;
            std::uint64_t previous = 0ULL;
            if (allocated_) {
                previous = shadow_->memoryBytes() + shadow_->hostMemoryBytes();
            }
            if (!timingBudgetFits(externalResidentBytes, candidate, previous, settings.memoryBudget)) {
                error = "Benchmark shadow preflight exceeds the memory budget with the original scene and old/new candidate peak retained.";
                return refused();
            }
            solverSettings_ = settings;
            solverSettings_.memoryBudget = settings.memoryBudget - externalResidentBytes - 8192ULL;
            if (!shadow_->reset(solverSettings_, error)) {
                return refused();
            }
            resetPreparationMs_ = std::chrono::duration<double, std::milli>(
                                    std::chrono::steady_clock::now() - startedAt
            )
                                    .count();
            allocated_ = true;
            settings_ = settings;
            externalBytes_ = externalResidentBytes;
            peakBytes_ = externalResidentBytes + candidate + previous;
            viewportWidth_ = viewportWidth;
            viewportHeight_ = viewportHeight;
            completed_ = 0U;
            settled_ = 0U;
            samples_.clear();
            samples_.reserve(benchmarkMeasuredPairs);
            resetBaseline_.clear();
            resetBaseline_.reserve(benchmarkMeasuredPairs);
            summary_ = {};
            pendingStats_ = {};
            phase_ = Phase::Submit;
            drawTimer_.cancel();
            passed_ = false;
            active_ = true;
            deadline_ = startedAt + std::chrono::seconds(25);
            if (deadlineExceeded()) {
                error = message_;
                return false;
            }
            message_ = "Benchmark settling 0/60; these steps are excluded from the 2 warm-up + 9 measured pairs";
            return true;
        } catch (const std::exception& exception) {
            error = exception.what();
            return refused();
        }
    }

    void tick() {
        if (!active_ || deadlineExceeded() || phase_ != Phase::Submit) {
            return;
        }
        std::string error{};
        submittedAt_ = std::chrono::steady_clock::now();
        if (!shadow_->step(solverSettings_, {}, error)) {
            fail(error);
            return;
        }
        phase_ = Phase::AwaitStep;
    }

    bool readyForDraw() const {
        return active_ && phase_ == Phase::ReadyToDraw;
    }

    bool beginDraw() {
        if (!readyForDraw() || deadlineExceeded()) {
            return false;
        }
        if (!drawTimer_.begin()) {
            fail("draw timestamp pair was not available before the matching scene draw");
            return false;
        }
        drawBeganAt_ = std::chrono::steady_clock::now();
        phase_ = Phase::Drawing;
        return true;
    }

    void finishDraw() {
        if (!active_ || phase_ != Phase::Drawing) {
            return;
        }
        drawEnqueueMs_ = std::chrono::duration<double, std::milli>(
                            std::chrono::steady_clock::now() - drawBeganAt_
        )
                            .count();
        if (!drawTimer_.end()) {
            fail(drawTimer_.message());
            return;
        }
        phase_ = Phase::AwaitDraw;
    }

    void poll() {
        if (!active_ || deadlineExceeded()) {
            return;
        }
        if (phase_ == Phase::AwaitStep) {
            std::string error{};
            if (!shadow_->poll(error)) {
                fail(error);
                return;
            }
            if (!shadow_->busy()) {
                pendingStats_ = shadow_->stats();
                if (!validStep(pendingStats_)) {
                    fail("step coverage, finite timings or the matched step ID is invalid");
                    return;
                }
                if (settled_ < benchmarkSettlingSteps) {
                    if (settled_ < benchmarkMeasuredPairs) {
                        resetBaseline_.push_back(pendingStats_);
                    }
                    ++settled_;
                    phase_ = Phase::Submit;
                    message_ = "Benchmark settling " + std::to_string(settled_) + "/60 (not representative samples); then 2 warm-up + 9 measured pairs";
                    return;
                }
                phase_ = Phase::ReadyToDraw;
            }
            return;
        }
        if (phase_ != Phase::AwaitDraw) {
            return;
        }
        if (!drawTimer_.poll()) {
            if (drawTimer_.failed()) {
                fail(drawTimer_.message());
            }
            return;
        }
        if (completed_ >= benchmarkWarmupPairs) {
            const double wallMs = std::chrono::duration<double, std::milli>(
                                    std::chrono::steady_clock::now() - submittedAt_
            )
                                    .count();
            samples_.push_back({pendingStats_, drawTimer_.milliseconds(), drawEnqueueMs_, wallMs});
        }
        ++completed_;
        if (completed_ == benchmarkTotalPairs) {
            buildReport();
            return;
        }
        message_ = "Benchmark settled 60/60; " + std::to_string(completed_) + "/11 step/draw pairs complete; " + std::to_string(samples_.size()) + "/9 measured samples";
        phase_ = Phase::Submit;
    }

    void cancel() {
        const bool wasActive = active_;
        active_ = false;
        passed_ = false;
        drawTimer_.cancel();
        if (wasActive) {
            message_ = "Benchmark canceled after settling " + std::to_string(settled_) + "/60, " + std::to_string(completed_) + "/11 pairs; no successful result. Original state retained.";
        } else {
            message_ = "Benchmark reset/canceled; cached measurement invalidated. Original state retained.";
        }
    }

    void destroy() {
        cancel();
        drawTimer_.destroy();
        shadow_.reset();
        gl_ = nullptr;
        allocated_ = false;
    }

    bool active() const {
        return active_;
    }

    bool passed() const {
        return passed_;
    }

    float progress() const {
        return static_cast<float>(settled_ + completed_) / static_cast<float>(benchmarkTotalSteps);
    }

    const std::string& message() const {
        return message_;
    }

    const Settings& settings() const {
        return settings_;
    }

    const BenchmarkSummary& summary() const {
        return summary_;
    }

    const std::vector<BenchmarkSample>& samples() const {
        return samples_;
    }

    const std::vector<Stats>& resetBaseline() const {
        return resetBaseline_;
    }

    bool drawTimingValid() const {
        return drawTimer_.valid();
    }

    double lastDrawMs() const {
        return drawTimer_.milliseconds();
    }

    GpuCloth& cloth() {
        return *shadow_;
    }

    const GpuCloth& cloth() const {
        return *shadow_;
    }
};

} // namespace cloth

#endif
