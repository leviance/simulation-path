#pragma once

#include "compute_program.hpp"

#include <atomic>
#include <memory>
#include <mutex>

namespace lab {

struct CalculationData {
    WorkloadConfig config{};
    VectorInputs inputs{};
    std::vector<Vec4> cpu{};
    std::vector<Vec4> gpu{};
#if LAB_CHECKPOINT >= 7
    OutputValidationReport validation{};
#endif
    bool tailIntact{};
};

struct WorkerReport {
    std::uint64_t generation{};
    std::string status{"Ready. SPACE runs a calculation."};
    std::string device{"CPU preview - no GPU result yet"};
    bool failed{};
    bool cancelled{};
    std::size_t samplesCompleted{};
    std::size_t samplesExpected{};
    std::shared_ptr<const CalculationData> data{};
#if LAB_CHECKPOINT >= 8
    std::vector<BenchmarkRow> rows{};
#endif
};

// Lớp này chỉ điều phối công việc. Các công thức và compute wrapper nằm ở file riêng.
// Context không được current trên hai thread cùng lúc; UI dùng SDL window surface.
class ComputeWorker {
    public:
    ComputeWorker(SDL_Window* window, SDL_GLContext context, std::string shaderSource)
        : window_(window), context_(context), shaderSource_(std::move(shaderSource)) {}

    ~ComputeWorker() {
        cancel();
        if (thread_.joinable()) {
            thread_.join();
        }
    }

    bool active() const {
        return active_.load();
    }

    WorkerReport snapshot() const {
        std::lock_guard lock(mutex_);
        return report_;
    }

    void cancel() {
        if (thread_.joinable()) {
            thread_.request_stop();
        }
    }

    bool start(WorkloadConfig config, bool benchmark) {
        if (active()) {
            return false;
        }
        if (thread_.joinable()) {
            thread_.join();
        }
        {
            std::lock_guard lock(mutex_);
            const std::uint64_t generation = report_.generation + 1U;
            report_ = {};
            report_.generation = generation;
            report_.status = "Preparing a new immutable workload...";
        }
        active_.store(true);
        try {
            thread_ = std::jthread([this, config, benchmark](std::stop_token stop) {
                run(config, benchmark, stop);
            });
        } catch (...) {
            active_.store(false);
            throw;
        }
        return true;
    }

    private:
    void publishStatus(const std::string& message) {
        std::lock_guard lock(mutex_);
        report_.status = message;
    }

    void run(WorkloadConfig config, bool benchmark, std::stop_token stop) {
        GlApi api{};
        VectorComputeEngine engine{};
        bool apiLoaded = false;
        const auto jobDeadline = ComputeClock::now() + std::chrono::seconds(15);
        try {
#if LAB_CHECKPOINT >= 2
            if (!SDL_GL_MakeCurrent(window_, context_)) {
                throw std::runtime_error(std::string("Worker cannot bind compute context: ") + SDL_GetError());
            }
            if (!api.load()) {
                throw std::runtime_error("Missing OpenGL entry point: " + api.missingFunction);
            }
            apiLoaded = true;
            const char* renderer = reinterpret_cast<const char*>(api.GetString(GL_RENDERER));
            const char* version = reinterpret_cast<const char*>(api.GetString(GL_VERSION));
            if (!renderer || !version) {
                throw std::runtime_error("Cannot read GPU renderer/version.");
            }
            {
                std::lock_guard lock(mutex_);
                report_.device = std::string(renderer) + " | OpenGL " + version;
            }
            const ComputeLimits limits = queryComputeLimits(api);
#endif
#if LAB_CHECKPOINT >= 4
            engine.loadProgram(api, shaderSource_);
#endif
            std::vector<std::size_t> counts{config.elementCount};
#if LAB_CHECKPOINT >= 9
            if (benchmark) {
                counts.assign(benchmarkCounts.begin(), benchmarkCounts.end());
            }
#endif
            std::size_t warmupCount = 0;
            std::size_t measuredCount = 1;
#if LAB_CHECKPOINT >= 8
            if (benchmark) {
                warmupCount = benchmarkWarmupCount;
                measuredCount = benchmarkSampleCount;
            }
#else
            (void)benchmark;
#endif
            {
                std::lock_guard lock(mutex_);
                report_.samplesExpected = counts.size() * (warmupCount + measuredCount);
            }
            for (std::size_t count : counts) {
                config.elementCount = count;
#if LAB_CHECKPOINT >= 5
                if (!validateCapabilities(limits, makeDispatchPlan(count, computeLocalSize)).allPassed()) {
                    throw std::runtime_error("Selected N exceeds compute/local-size/SSBO/binding limits.");
                }
#elif LAB_CHECKPOINT >= 2
                if (limits.majorVersion < 4 || (limits.majorVersion == 4 && limits.minorVersion < 3) ||
                    limits.maximumWorkgroupSize[0] < 256 || limits.maximumInvocations < 256 ||
                    limits.maximumWorkgroupCount[0] < 1 || limits.maximumStorageBindings < 3 ||
                    limits.maximumComputeStorageBlocks < 3 || limits.maximumShaderStorageBlockBytes < 8192) {
                    throw std::runtime_error("OpenGL 4.3 / 256 lanes / three SSBO blocks are required.");
                }
#endif
#if LAB_CHECKPOINT >= 1
                auto data = std::make_shared<CalculationData>();
                data->config = config;
                data->inputs = makeVectorInputs(count, config.seed);
#if LAB_CHECKPOINT >= 3
                engine.prepareBuffers(api, data->inputs);
#endif
#if LAB_CHECKPOINT >= 8
                BenchmarkRow row{};
                row.config = config;
#endif
                for (std::size_t sample = 0; sample < warmupCount + measuredCount; ++sample) {
                    if (stop.stop_requested() || ComputeClock::now() >= jobDeadline) {
                        throw std::runtime_error("Job cancelled or reached its 15-second deadline.");
                    }
                    publishStatus("N = " + std::to_string(count) + " | sample " + std::to_string(sample + 1U));

                    // Preallocate ngoài vùng đo CPU; checksum/validation ở sau đồng hồ.
                    data->cpu.resize(count);
                    const auto cpuBegin = ComputeClock::now();
                    for (std::size_t index = 0; index < count; ++index) {
                        data->cpu[index] = applyOperation(data->inputs.a[index], data->inputs.b[index], config.operation, config.scalar);
                    }
                    const double cpuMilliseconds = elapsedMilliseconds(cpuBegin, ComputeClock::now());
                    (void)cpuMilliseconds;
#if LAB_CHECKPOINT >= 4
                    ComputeResult result = engine.execute(api, config.operation, config.scalar, stop);
#endif
#if LAB_CHECKPOINT >= 6
                    data->gpu = std::move(result.output);
                    data->tailIntact = result.tailIntact;
                    if (!result.tailIntact) {
                        throw std::runtime_error("Tail canary changed: shader wrote outside valid N.");
                    }
#endif
#if LAB_CHECKPOINT >= 7
                    data->validation = validateOutput(data->cpu, data->gpu);
                    if (!data->validation.allPassed()) {
                        throw std::runtime_error("CPU/GPU output mismatch at index " + std::to_string(data->validation.firstMismatch));
                    }
#endif
#if LAB_CHECKPOINT >= 8
                    const double outputChecksum = checksum(data->gpu);
                    if (sample < warmupCount) {
                        ++row.warmupsCompleted;
                    } else {
                        row.samples.push_back({cpuMilliseconds, result.kernelMilliseconds, result.endToEndMilliseconds, outputChecksum});
                    }
#endif
                    {
                        std::lock_guard lock(mutex_);
                        ++report_.samplesCompleted;
                    }
                }
#if LAB_CHECKPOINT >= 8
                row.summarize();
#endif
                {
                    std::lock_guard lock(mutex_);
                    report_.data = std::move(data);
#if LAB_CHECKPOINT >= 8
                    report_.rows.push_back(std::move(row));
#endif
                }
#else
                (void)count;
#endif
            }
            publishStatus("Completed. All published rows belong to this job's configuration.");
        } catch (const std::exception& error) {
            std::lock_guard lock(mutex_);
            report_.failed = !stop.stop_requested();
            report_.cancelled = stop.stop_requested();
            report_.status = error.what();
        }
        if (apiLoaded) {
            engine.destroy(api);
        }
#if LAB_CHECKPOINT >= 2
        SDL_GL_MakeCurrent(window_, nullptr);
#endif
        active_.store(false);
    }

    SDL_Window* window_{};
    SDL_GLContext context_{};
    std::string shaderSource_{};
    std::jthread thread_{};
    std::atomic<bool> active_{false};
    mutable std::mutex mutex_{};
    WorkerReport report_{};
};

} // namespace lab
