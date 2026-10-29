#pragma once

#include "compute_worker.hpp"

#include <iostream>

namespace lab {

#if LAB_CHECKPOINT >= 11
// Kiểm orchestration trên context thật, không giả lập thao tác phím/Windows UI.
inline bool verifyBenchmarkJobs(SDL_Window* window, SDL_GLContext context, const std::string& source) {
    int checks = 0;
    int failures = 0;
    auto check = [&](bool condition, const char* label) {
        ++checks;
        if (!condition) {
            ++failures;
            std::cerr << "FAIL: " << label << '\n';
        }
    };
    if (!SDL_GL_MakeCurrent(window, nullptr)) {
        std::cerr << "Cannot detach verification context: " << SDL_GetError() << '\n';
        return false;
    }
    {
        ComputeWorker worker(window, context, source);
        auto waitForJob = [&]() {
            const auto deadline = ComputeClock::now() + std::chrono::seconds(18);
            while (worker.active()) {
                if (ComputeClock::now() >= deadline) {
                    worker.cancel();
                    throw std::runtime_error("Benchmark verification exceeded 18 seconds.");
                }
                std::this_thread::sleep_for(std::chrono::milliseconds(1));
            }
        };
        try {
            WorkloadConfig selected{};
            selected.operation = VectorOperation::axpy;
            selected.scalar = 1.25F;
            check(worker.start(selected, true), "benchmark starts from idle");
            selected.operation = VectorOperation::difference;
            selected.scalar = -4.0F;
            waitForJob();
            const WorkerReport completed = worker.snapshot();
            check(!completed.failed && !completed.cancelled, "full GPU benchmark completes");
            check(completed.samplesCompleted == 33U && completed.samplesExpected == 33U, "three cases each execute two warmups and nine measured samples");
            check(completed.rows.size() == 3U, "three distinct N rows are published");
            const std::size_t rowCount = std::min(completed.rows.size(), benchmarkCounts.size());
            for (std::size_t index = 0; index < rowCount; ++index) {
                const BenchmarkRow& row = completed.rows[index];
                check(row.config.elementCount == benchmarkCounts[index], "row retains its exact N");
                check(row.config.operation == VectorOperation::axpy && row.config.scalar == 1.25F, "UI value changes cannot mutate job snapshot");
                check(row.warmupsCompleted == 2U && row.samples.size() == 9U, "warmups never enter measured samples");
                for (const TimingSample& sample : row.samples) {
                    check(std::isfinite(sample.cpuMilliseconds) && sample.cpuMilliseconds >= 0.0 && std::isfinite(sample.kernelMilliseconds) && sample.kernelMilliseconds >= 0.0 && std::isfinite(sample.endToEndMilliseconds) && sample.endToEndMilliseconds >= 0.0 && std::isfinite(sample.checksum), "every raw sample has finite independent clocks and consumed output");
                }
                check(row.cpu.minimum <= row.cpu.median && row.cpu.median <= row.cpu.maximum, "CPU spread is ordered");
                check(row.kernel.minimum <= row.kernel.median && row.kernel.median <= row.kernel.maximum, "GPU spread is ordered");
                check(row.endToEnd.minimum <= row.endToEnd.median && row.endToEnd.median <= row.endToEnd.maximum, "E2E spread is ordered");
            }
            check(completed.data && completed.data->config.elementCount == 1'000'003U && completed.data->gpu.size() == 1'000'003U && completed.data->validation.allPassed(), "final benchmark publishes actual validated million-element output");

            selected.elementCount = maximumElementCount;
            check(worker.start(selected, false), "new generation starts without reusing old rows");
            worker.cancel();
            waitForJob();
            const WorkerReport cancelled = worker.snapshot();
            check(cancelled.cancelled && !cancelled.failed, "stop request is distinct from GPU failure");
            check(cancelled.rows.empty() && !cancelled.data, "cancelled incomplete job publishes no old or partial output");
            check(cancelled.generation == completed.generation + 1U, "generation advances after cancellation");
        } catch (const std::exception& error) {
            ++failures;
            std::cerr << error.what() << '\n';
        }
    }
    // Worker đã join và nhả context trước khi main nhận lại ownership.
    check(SDL_GL_MakeCurrent(window, context), "main reclaims context after worker cleanup");
    std::cout << "Project 37 benchmark: " << checks << " checks, " << failures << " failures\n";
    return failures == 0;
}

// Kiểm GPU thật và cả khả năng bắt lỗi; không thay kết quả shader bằng CPU reference.
inline bool verifyCompute(GlApi& api, const std::string& source) {
    int checks = 0;
    int failures = 0;
    auto check = [&](bool condition, const char* label) {
        ++checks;
        if (!condition) {
            ++failures;
            std::cerr << "FAIL: " << label << '\n';
        }
    };
    VectorComputeEngine engine{};
    try {
        engine.loadProgram(api, source);
        const ComputeLimits limits = queryComputeLimits(api);
        const std::array<std::size_t, 6> counts{1U, 255U, 256U, 257U, 65'537U, 1'000'003U};
        const std::array<VectorOperation, 3> operations{VectorOperation::add, VectorOperation::axpy, VectorOperation::difference};
        const auto deadline = ComputeClock::now() + std::chrono::seconds(20);
        for (std::size_t count : counts) {
            if (ComputeClock::now() >= deadline) {
                throw std::runtime_error("Verification exceeded its 20-second workload budget.");
            }
            const bool supported = validateCapabilities(limits, makeDispatchPlan(count, computeLocalSize)).allPassed();
            check(supported, "capability preflight for each N");
            if (!supported) {
                throw std::runtime_error("GPU verification stopped before allocation: capability preflight failed.");
            }
            VectorInputs inputs = makeVectorInputs(count);
            inputs.a[0] = {0.0F, -2.0F, 3.0F, -4.0F};
            inputs.b[0] = {0.0F, 1.5F, -2.0F, 4.0F};
            const std::array<Vec4, 3> known{{{0.0F, -0.5F, 1.0F, 0.0F}, {0.0F, -2.5F, 4.0F, -4.0F}, {0.0F, -3.5F, 5.0F, -8.0F}}};
            engine.prepareBuffers(api, inputs);
            for (std::size_t operationIndex = 0; operationIndex < operations.size(); ++operationIndex) {
                const auto operation = operations[operationIndex];
                const auto expected = computeCpu(inputs, operation, 2.0F);
                const ComputeResult actual = engine.execute(api, operation, 2.0F, {});
                check(validateOutput(expected, actual.output).allPassed(), "all N outputs match CPU with abs/rel tolerance");
                check(validateOutput({known[operationIndex]}, {actual.output[0]}).allPassed(), "independent known answer includes zero/negative/all four channels");
                check(actual.tailIntact, "all 256 output canaries unchanged");
                check(engine.inputsUnchanged(api), "input A/B including padding unchanged");
                check(std::isfinite(actual.kernelMilliseconds) && actual.kernelMilliseconds >= 0.0, "consumed GPU timer query is finite");
                check(std::isfinite(actual.endToEndMilliseconds) && actual.endToEndMilliseconds >= 0.0, "end-to-end wall time is finite");
            }
        }

        std::string wrongGuard = source;
        const std::string guard = "index >= uint(uElementCount)";
        const auto guardPosition = wrongGuard.find(guard);
        if (guardPosition == std::string::npos) {
            throw std::runtime_error("Cannot construct the intentional off-by-one guard fixture.");
        }
        wrongGuard.replace(guardPosition, guard.size(), "index > uint(uElementCount)");
        engine.loadProgram(api, wrongGuard);
        engine.prepareBuffers(api, makeVectorInputs(257U));
        const ComputeResult corrupt = engine.execute(api, VectorOperation::add, 1.0F, {});
        check(!corrupt.tailIntact, "off-by-one guard mutation is detected by real GPU canary readback");
        engine.loadProgram(api, source);

        std::string wrongBinding = source;
        const auto binding = wrongBinding.find("binding = 2");
        if (binding == std::string::npos) {
            throw std::runtime_error("Cannot construct the interface mismatch fixture.");
        }
        wrongBinding.replace(binding, 11U, "binding = 3");
        bool rejected = false;
        try {
            engine.loadProgram(api, wrongBinding);
        } catch (const std::exception&) {
            rejected = true;
        }
        check(rejected, "linked compute program with wrong binding is rejected");
        engine.prepareBuffers(api, makeVectorInputs(257U));
        const ComputeResult recovered = engine.execute(api, VectorOperation::add, 1.0F, {});
        check(recovered.tailIntact && recovered.output.size() == 257U, "last-good program survives failed interface replacement");
        check(api.GetError() == GL_NO_ERROR, "verification leaves no OpenGL error");
    } catch (const std::exception& error) {
        ++failures;
        std::cerr << error.what() << '\n';
    }
    engine.destroy(api);
    GLint currentProgram = -1;
    api.GetIntegerv(GL_CURRENT_PROGRAM, &currentProgram);
    check(currentProgram == 0, "compute program unbound before deletion/context teardown");
    check(api.GetError() == GL_NO_ERROR, "GPU resources deleted while context is current");
    std::cout << "Project 37 GPU: " << checks << " checks, " << failures << " failures\n";
    return failures == 0;
}
#endif

} // namespace lab
