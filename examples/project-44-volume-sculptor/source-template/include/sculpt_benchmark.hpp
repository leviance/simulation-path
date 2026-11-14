#pragma once

#include "sculpt_benchmark_statistics.hpp"
#include "sculpt_gpu_mesh.hpp"
#include "sculpt_renderer.hpp"
#include <chrono>
#include <iomanip>
#include <iostream>
#include <locale>
#include <optional>

namespace sculpt {

inline constexpr int benchmarkWarmups = 2;
inline constexpr int benchmarkRepeats = 5;

inline void benchmarkCheck(bool condition, const char* message) {
    if (!condition)
        throw std::runtime_error(message);
}

class BenchmarkDeadline {
    public:
    void poll() const {
        if (std::chrono::steady_clock::now() >= deadline_)
            throw std::runtime_error("Sculpt benchmark exceeded its 45-second deadline; no complete aggregate report");
        SDL_Event event;
        while (SDL_PollEvent(&event))
            if (event.type == SDL_EVENT_QUIT || (event.type == SDL_EVENT_KEY_DOWN && (event.key.key == SDLK_Q || event.key.key == SDLK_ESCAPE)))
                throw std::runtime_error("Sculpt benchmark cancelled; incomplete samples are not a completed result");
    }

    private:
    std::chrono::steady_clock::time_point deadline_{std::chrono::steady_clock::now() + std::chrono::seconds(45)};
};

// No full-field or full-mesh readback belongs in a timed workload.
inline void waitForBenchmarkMesh(GpuMeshBuilder& model, const BenchmarkDeadline& deadline) {
    while (!model.ready()) {
        deadline.poll();
        model.tick();
        if (model.state() == MeshJobState::failed)
            throw std::runtime_error("Benchmark mesh job failed: " + model.error());
        if (!model.ready())
            SDL_Delay(1);
    }
}

struct BenchmarkMeshCounts {
    std::uint64_t activeCells{}, vertices{};
    std::size_t nonemptyChunks{};
    bool operator==(const BenchmarkMeshCounts&) const = default;
};

inline BenchmarkMeshCounts benchmarkMeshCounts(const GpuMeshBuilder& model) {
    benchmarkCheck(model.ready(), "Benchmark counters require a complete current mesh");
    BenchmarkMeshCounts result;
    for (const auto& chunk : model.active()) {
        benchmarkCheck(chunk.validForGeneration == model.activeGeneration() && chunk.stats.emitted == chunk.stats.vertices, "Benchmark observed a stale or partial mesh chunk");
        result.activeCells += chunk.stats.activeCells;
        result.vertices += chunk.stats.vertices;
        if (chunk.stats.vertices != 0)
            ++result.nonemptyChunks;
    }
    benchmarkCheck(result.vertices != 0 && result.vertices % 3 == 0 && result.vertices <= maximumMeshVertices && result.activeCells <= model.settings().grid.cellCount(), "Benchmark counters are empty or outside the workload bounds");
    return result;
}

// All these counters must be identical across fresh trials, not just their labels.
struct BenchmarkWork {
    BenchmarkMeshCounts initial, edited;
    std::size_t dirtyChunks{}, reusedNonempty{};
    std::uint64_t brushWrites{};
    bool operator==(const BenchmarkWork&) const = default;
};

// snippet:sculpt-benchmark-draw-query
inline double benchmarkMeshDraw(GlApi& gl, MeshRenderer& renderer, const GpuMeshBuilder& model, int width, int height, const BenchmarkDeadline& deadline) {
    benchmarkCheck(model.ready() && !model.gpuBusy(), "Draw timing cannot overlap a compute batch");
    Camera camera;
    GpuTicket ticket(gl);
    gl.ClearColor(0.01F, 0.02F, 0.03F, 1);
    gl.Clear(GL_COLOR_BUFFER_BIT | GL_DEPTH_BUFFER_BIT);
    ticket.begin(0);
    renderer.draw(model.active(), camera, 0, 0, width, height, false, false);
    ticket.end();
    ticket.submit();
    std::optional<std::array<double, 2>> elapsed;
    while (!elapsed) {
        deadline.poll();
        elapsed = ticket.poll();
        if (!elapsed)
            SDL_Delay(1);
    }
    // Outside the query: prove the hidden back buffer contains the mesh, not only a clear.
    std::array<std::uint8_t, 4> pixel{};
    gl.ReadPixels(width / 2, height / 2, 1, 1, GL_RGBA, GL_UNSIGNED_BYTE, pixel.data());
    benchmarkCheck(gl.GetError() == GL_NO_ERROR && (pixel[0] > 32 || pixel[1] > 32 || pixel[2] > 32), "Benchmark draw produced no visible center surface or an OpenGL error");
    return (*elapsed)[0];
}

// end-snippet:sculpt-benchmark-draw-query

// snippet:sculpt-benchmark-trial
inline BenchmarkTimings runBenchmarkTrial(GlApi& gl, GpuBudget& budget, MeshRenderer& renderer, const ModelSettings& settings, int width, int height, const BenchmarkDeadline& deadline, BenchmarkWork& work) {
    GpuMeshBuilder model(gl, budget, settings);
    waitForBenchmarkMesh(model, deadline);
    BenchmarkTimings timings;
    timings.initial = model.times();
    work.initial = benchmarkMeshCounts(model);
    benchmarkCheck(model.lastRebuiltChunks() == chunkCount(settings.grid), "Initial benchmark did not process the full grid");

    const Brush brush{{0.7F, 0, 0}, 0.32F, 0.28F, BrushMode::add};
    benchmarkCheck(model.beginStroke(90, brush) && model.endStroke(90), "Benchmark could not submit its fixed one-stamp stroke");
    waitForBenchmarkMesh(model, deadline);
    timings.local = model.times();
    work.edited = benchmarkMeshCounts(model);
    work.dirtyChunks = model.lastRebuiltChunks();
    work.brushWrites = model.document().changedSampleWrites();
    for (const auto& chunk : model.active())
        if (chunk.buffer && chunk.stats.generation != model.activeGeneration())
            ++work.reusedNonempty;
    benchmarkCheck(work.brushWrites != 0 && work.dirtyChunks != 0 && work.dirtyChunks < chunkCount(settings.grid) && work.reusedNonempty != 0, "The local benchmark did not edit stored samples and reuse unaffected geometry");

    const auto editedRevision = model.document().revision();
    model.requestIsovalue(settings.isovalue);
    waitForBenchmarkMesh(model, deadline);
    timings.full = model.times();
    benchmarkCheck(model.document().revision() == editedRevision && benchmarkMeshCounts(model) == work.edited && model.lastRebuiltChunks() == chunkCount(settings.grid), "Full benchmark did not rebuild the same edited field");
    const auto generation = model.activeGeneration();
    timings.draw = benchmarkMeshDraw(gl, renderer, model, width, height, deadline);
    benchmarkCheck(model.activeGeneration() == generation && model.document().revision() == editedRevision && model.guardsIntact(), "Draw changed the field/generation or a benchmark canary was damaged");
    deadline.poll();
    return timings;
}

// end-snippet:sculpt-benchmark-trial

inline void printBenchmarkStatistic(std::string_view name, std::span<const double> samples) {
    const auto summary = summarizeTimings(samples);
    std::cout << "BENCH_STAT name=" << name << " unit=ms samples=" << summary.samples
            << " median=" << summary.median << " min=" << summary.minimum << " max=" << summary.maximum << " mad=" << summary.mad << '\n';
}

inline int runSculptBenchmark(GlApi& gl, GpuBudget& budget, SDL_Window* window, const ModelSettings& settings) {
    BenchmarkDeadline deadline;
    benchmarkCheck(settings.shape == Shape::sphere && settings.isovalue == 0, "Benchmark starts from its fixed sphere preset and isovalue zero");
    GLint timerBits{};
    gl.GetQueryiv(GL_TIME_ELAPSED, GL_QUERY_COUNTER_BITS, &timerBits);
    benchmarkCheck(gl.GetError() == GL_NO_ERROR && timerBits >= 32, "Benchmark needs at least 32 elapsed-counter bits for the three-second batch deadline");
    int width{}, height{};
    benchmarkCheck((SDL_GetWindowFlags(window) & SDL_WINDOW_HIDDEN) != 0, "Benchmark must use its hidden window, not take over editor input");
    benchmarkCheck(SDL_GetWindowSizeInPixels(window, &width, &height) && width > 0 && height > 0 && width <= 4096 && height <= 4096, "Benchmark needs a bounded nonempty drawable");
    MeshRenderer renderer(gl);
    const auto baselineBytes = budget.used;
    std::vector<BenchmarkTimings> measured;
    std::vector<double> hostTimes;
    std::optional<BenchmarkWork> expected;
    std::cout.imbue(std::locale::classic());
    std::cout << std::fixed << std::setprecision(6);
    std::cout << "BENCH protocol=volume-sculptor-v1 warmups=" << benchmarkWarmups << " measured=" << benchmarkRepeats
            << " samples=" << settings.grid.sampleCount() << " cells=" << settings.grid.cellCount() << " grid=" << settings.grid.samples
            << " width=" << width << " height=" << height << " timerBits=" << timerBits << " noSwap=1 meshOnlyDraw=1\n";
    std::cout << "BENCH_WINDOW hidden=1 userInputCapture=0\n";
    const auto vendor = gl.GetString(GL_VENDOR), device = gl.GetString(GL_RENDERER), version = gl.GetString(GL_VERSION);
    benchmarkCheck(vendor && device && version, "Benchmark device metadata is unavailable");
    std::cout << "BENCH_DEVICE vendor=" << reinterpret_cast<const char*>(vendor)
            << " renderer=" << reinterpret_cast<const char*>(device) << " GL=" << reinterpret_cast<const char*>(version) << '\n';
#ifdef NDEBUG
    std::cout << "BENCH_BUILD ndebug=1\n";
#else
    std::cout << "BENCH_BUILD ndebug=0 diagnosticOnly=1\n";
#endif
    std::cout << "BENCH_WORKLOAD sphereRadius=0.82 stampCenter=0.7,0,0 stampRadius=0.32 stampStrength=0.28 stamps=1 mode=add freshModelEachTrial=1\n"
            << std::flush;

    // snippet:sculpt-benchmark-warmup-repeat
    for (int trial = 0; trial < benchmarkWarmups + benchmarkRepeats; ++trial) {
        deadline.poll();
        int currentWidth{}, currentHeight{};
        benchmarkCheck(SDL_GetWindowSizeInPixels(window, &currentWidth, &currentHeight) && currentWidth == width && currentHeight == height, "Drawable changed during benchmark; no aggregate report");
        BenchmarkWork work;
        const auto began = std::chrono::steady_clock::now();
        const auto timings = runBenchmarkTrial(gl, budget, renderer, settings, width, height, deadline, work);
        const double hostMs = std::chrono::duration<double, std::milli>(std::chrono::steady_clock::now() - began).count();
        benchmarkCheck(budget.used == baselineBytes, "A benchmark trial leaked tracked buffer reservations");
        if (expected)
            benchmarkCheck(work == *expected, "Benchmark changed samples/counters/workload between trials");
        else
            expected = work;
        const bool included = trial >= benchmarkWarmups;
        if (included) {
            measured.push_back(timings);
            hostTimes.push_back(hostMs);
        }
        std::cout << "BENCH_TRIAL index=" << trial << " included=" << included << " hostMs=" << hostMs;
        const auto values = timings.values();
        for (std::size_t metric = 0; metric < values.size(); ++metric)
            std::cout << ' ' << benchmarkMetricNames[metric] << '=' << values[metric];
        std::cout << '\n'
                << std::flush;
    }
    // end-snippet:sculpt-benchmark-warmup-repeat

    deadline.poll();
    benchmarkCheck(measured.size() == benchmarkRepeats && expected.has_value(), "Benchmark did not complete every measured trial");
    // Validate all timing columns before printing any aggregate.
    std::array<TimingDistribution, benchmarkMetricNames.size()> distributions{};
    for (std::size_t metric = 0; metric < benchmarkMetricNames.size(); ++metric) {
        std::vector<double> samples;
        for (const auto& trial : measured)
            samples.push_back(trial.values()[metric]);
        distributions[metric] = summarizeTimings(samples);
    }
    summarizeTimings(hostTimes);
    for (std::size_t metric = 0; metric < distributions.size(); ++metric) {
        const auto& summary = distributions[metric];
        std::cout << "BENCH_STAT name=" << benchmarkMetricNames[metric] << " unit=ms samples=" << summary.samples
                << " median=" << summary.median << " min=" << summary.minimum << " max=" << summary.maximum << " mad=" << summary.mad << '\n';
    }
    printBenchmarkStatistic("host.total", hostTimes);
    const auto& work = *expected;
    std::cout << "BENCH_COUNTERS initialVertices=" << work.initial.vertices << " initialActiveCells=" << work.initial.activeCells
            << " editedVertices=" << work.edited.vertices << " triangles=" << work.edited.vertices / 3 << " activeCells=" << work.edited.activeCells
            << " dirtyChunks=" << work.dirtyChunks << " allChunks=" << chunkCount(settings.grid) << " reusedNonempty=" << work.reusedNonempty << " brushWrites=" << work.brushWrites << '\n';
    std::cout << "BENCH_MEMORY trackedReservedPeakBytes=" << budget.peakReserved << " trackedBaselineBytes=" << baselineBytes << " trackedFinalBytes=" << budget.used
            << " trackedLimitBytes=" << budget.limit << " includesGuards=1 excludesDriverProgramsWindow=1\n";
    std::cout << "BENCHMARK COMPLETE warmupsDiscarded=" << benchmarkWarmups << " measuredTrials=" << measured.size()
            << " stableWorkload=1 gpuElapsedQueries=1 fullFieldMeshReadback=0 correctnessAndUiAreSeparate=1\n";
    return 0;
}

} // namespace sculpt
