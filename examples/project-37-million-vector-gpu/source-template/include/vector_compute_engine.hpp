#pragma once

#include "compute_benchmark.hpp"
#include "gl_api.hpp"

#include <cstring>
#include <stop_token>
#include <thread>

namespace lab {

#if LAB_CHECKPOINT >= 2
inline ComputeLimits queryComputeLimits(GlApi& api) {
    ComputeLimits limits{};
    api.GetIntegerv(GL_MAJOR_VERSION, &limits.majorVersion);
    api.GetIntegerv(GL_MINOR_VERSION, &limits.minorVersion);
    api.GetIntegerv(GL_MAX_COMPUTE_WORK_GROUP_INVOCATIONS, &limits.maximumInvocations);
    api.GetIntegerv(GL_MAX_SHADER_STORAGE_BUFFER_BINDINGS, &limits.maximumStorageBindings);
    api.GetIntegerv(GL_MAX_COMPUTE_SHADER_STORAGE_BLOCKS, &limits.maximumComputeStorageBlocks);
    api.GetInteger64v(GL_MAX_SHADER_STORAGE_BLOCK_SIZE, &limits.maximumShaderStorageBlockBytes);
    for (GLuint axis = 0; axis < 3; ++axis) {
        api.GetIntegeri_v(GL_MAX_COMPUTE_WORK_GROUP_COUNT, axis, &limits.maximumWorkgroupCount[axis]);
        api.GetIntegeri_v(GL_MAX_COMPUTE_WORK_GROUP_SIZE, axis, &limits.maximumWorkgroupSize[axis]);
    }
    return limits;
}
#endif

inline void requireNoGlError(GlApi& api, const char* stage) {
    const GLenum error = api.GetError();
    if (error != GL_NO_ERROR) {
        throw std::runtime_error(std::string(stage) + ": OpenGL error " + std::to_string(error));
    }
}

// Host padding giúp phát hiện tail writes; không thay thế guard trước lần đọc trong shader.
inline Vec4 guardValue() {
    return {9876.5F, -4321.25F, 1357.0F, -2468.0F};
}

struct ComputeResult {
    std::vector<Vec4> output{};
    double kernelMilliseconds{};
    double endToEndMilliseconds{};
    bool tailIntact{};
};

class VectorComputeEngine {
    public:
    VectorComputeEngine() = default;
    VectorComputeEngine(const VectorComputeEngine&) = delete;
    VectorComputeEngine& operator=(const VectorComputeEngine&) = delete;

#if LAB_CHECKPOINT >= 3
    void prepareBuffers(GlApi& api, const VectorInputs& inputs) {
        requireElementCount(inputs.a.size());
        if (inputs.a.empty() || inputs.a.size() != inputs.b.size()) {
            throw std::invalid_argument("GPU input A/B must have the same non-zero size.");
        }
        elementCount_ = inputs.a.size();
        const std::size_t paddedCount = elementCount_ + computeLocalSize;
        paddedA_ = inputs.a;
        paddedB_ = inputs.b;
        paddedA_.resize(paddedCount, guardValue());
        paddedB_.resize(paddedCount, guardValue());
        const float sentinel = std::numeric_limits<float>::quiet_NaN();
        unwritten_.assign(paddedCount, guardValue());
        std::fill_n(unwritten_.begin(), elementCount_, Vec4{sentinel, sentinel, sentinel, sentinel});
        readback_.resize(paddedCount);

        // Cấp phát ngoài vùng đo. Mỗi sample vẫn upload A/B và reset output.
        if (buffers_[0] == 0) {
            api.GenBuffers(3, buffers_.data());
        }
        for (GLuint buffer : buffers_) {
            if (buffer == 0) {
                throw std::runtime_error("Cannot create all three SSBOs.");
            }
            api.BindBuffer(GL_SHADER_STORAGE_BUFFER, buffer);
            api.BufferData(GL_SHADER_STORAGE_BUFFER, byteCount(), nullptr, GL_DYNAMIC_COPY);
            GLint64 allocatedBytes = 0;
            api.GetBufferParameteri64v(GL_SHADER_STORAGE_BUFFER, GL_BUFFER_SIZE, &allocatedBytes);
            requireNoGlError(api, "SSBO allocation");
            if (allocatedBytes != byteCount()) {
                throw std::runtime_error("Driver did not allocate the requested SSBO size.");
            }
        }
        uploadInputs(api);
    }

    void uploadInputs(GlApi& api) {
        const std::array<const Vec4*, 3> data{paddedA_.data(), paddedB_.data(), unwritten_.data()};
        for (GLuint binding = 0; binding < 3; ++binding) {
            api.BindBuffer(GL_SHADER_STORAGE_BUFFER, buffers_[binding]);
            api.BufferSubData(GL_SHADER_STORAGE_BUFFER, 0, byteCount(), data[binding]);
            api.BindBufferBase(GL_SHADER_STORAGE_BUFFER, binding, buffers_[binding]);
        }
        api.BindBuffer(GL_SHADER_STORAGE_BUFFER, 0);
        requireNoGlError(api, "SSBO upload");
    }
#endif

#if LAB_CHECKPOINT >= 4
    void loadProgram(GlApi& api, const std::string& shaderSource);

    ComputeResult execute(GlApi& api, VectorOperation operation, float scalar, std::stop_token stop) {
        if (program_ == 0 || elementCount_ == 0 || !std::isfinite(scalar)) {
            throw std::runtime_error("Compute program/input/scalar is not ready.");
        }
        if (operation != VectorOperation::add && operation != VectorOperation::axpy && operation != VectorOperation::difference) {
            throw std::invalid_argument("Unknown vector operation.");
        }
        if (timerPending_) {
            throw std::logic_error("A pending timer query must be consumed before reuse.");
        }

        ComputeResult result{};
        // Host generation/allocation, CPU reference và validation không nằm trong E2E.
        const auto totalBegin = ComputeClock::now();
        uploadInputs(api);
        api.UseProgram(program_);
        api.Uniform1i(operationLocation_, static_cast<GLint>(operation));
        api.Uniform1f(scalarLocation_, scalar);
#if LAB_CHECKPOINT >= 5
        const DispatchPlan plan = makeDispatchPlan(elementCount_, computeLocalSize);
        api.Uniform1i(elementCountLocation_, static_cast<GLint>(elementCount_));
        const GLuint workgroupCount = plan.workgroupCount;
#else
        const GLuint workgroupCount = 1U;
#endif
#if LAB_CHECKPOINT >= 8
        if (timerQuery_ == 0) {
            api.GenQueries(1, &timerQuery_);
            if (timerQuery_ == 0) {
                throw std::runtime_error("Cannot create a timer query.");
            }
        }
        api.BeginQuery(GL_TIME_ELAPSED, timerQuery_);
#endif
        api.DispatchCompute(workgroupCount, 1, 1);
#if LAB_CHECKPOINT >= 8
        api.EndQuery(GL_TIME_ELAPSED);
        timerPending_ = true;
#endif
#if LAB_CHECKPOINT >= 6
        // Consumer là glGetBufferSubData, không phải một SSBO shader pass kế tiếp.
        api.MemoryBarrier(GL_BUFFER_UPDATE_BARRIER_BIT);
#endif
        requireNoGlError(api, "Compute dispatch/barrier");
        const auto deadline = ComputeClock::now() + std::chrono::seconds(3);
        waitForCompletion(api, stop, deadline);

#if LAB_CHECKPOINT >= 6
        api.BindBuffer(GL_SHADER_STORAGE_BUFFER, buffers_[2]);
        api.GetBufferSubData(GL_SHADER_STORAGE_BUFFER, 0, byteCount(), readback_.data());
        api.BindBuffer(GL_SHADER_STORAGE_BUFFER, 0);
        requireNoGlError(api, "Output readback");
        result.endToEndMilliseconds = elapsedMilliseconds(totalBegin, ComputeClock::now());

        result.output.assign(readback_.begin(), readback_.begin() + elementCount_);
        result.tailIntact = true;
        const Vec4 guard = guardValue();
        for (std::size_t index = elementCount_; index < readback_.size(); ++index) {
            if (std::memcmp(&readback_[index], &guard, sizeof(Vec4)) != 0) {
                result.tailIntact = false;
            }
        }
#endif
#if LAB_CHECKPOINT >= 8
        // Giữ query pending qua mọi lần poll; không được ghi đè mẫu chưa đọc.
        GLint available = GL_FALSE;
        while (available != GL_TRUE) {
            checkWaitBudget(stop, deadline);
            api.GetQueryObjectiv(timerQuery_, GL_QUERY_RESULT_AVAILABLE, &available);
            if (available != GL_TRUE) {
                std::this_thread::sleep_for(std::chrono::microseconds(100));
            }
        }
        GLuint64 elapsedNanoseconds = 0;
        api.GetQueryObjectui64v(timerQuery_, GL_QUERY_RESULT, &elapsedNanoseconds);
        result.kernelMilliseconds = static_cast<double>(elapsedNanoseconds) / 1'000'000.0;
        timerPending_ = false;
        requireNoGlError(api, "Timer query result");
#endif
        return result;
    }

    bool inputsUnchanged(GlApi& api) {
        std::vector<Vec4> inputCopy(paddedA_.size());
        const std::array<const std::vector<Vec4>*, 2> original{&paddedA_, &paddedB_};
        for (std::size_t index = 0; index < original.size(); ++index) {
            api.BindBuffer(GL_SHADER_STORAGE_BUFFER, buffers_[index]);
            api.GetBufferSubData(GL_SHADER_STORAGE_BUFFER, 0, byteCount(), inputCopy.data());
            if (std::memcmp(inputCopy.data(), original[index]->data(), static_cast<std::size_t>(byteCount())) != 0) {
                api.BindBuffer(GL_SHADER_STORAGE_BUFFER, 0);
                return false;
            }
        }
        api.BindBuffer(GL_SHADER_STORAGE_BUFFER, 0);
        requireNoGlError(api, "Input preservation check");
        return true;
    }
#endif

    void destroy(GlApi& api) {
        // Worker dọn GPU resources trước khi bỏ current context, kể cả khi hủy job.
        // Program còn current chỉ được đánh dấu xóa; unbind để nhả reference của context.
        api.UseProgram(0);
        if (timerQuery_ != 0) {
            api.DeleteQueries(1, &timerQuery_);
        }
        api.DeleteBuffers(3, buffers_.data());
        if (program_ != 0) {
            api.DeleteProgram(program_);
        }
        buffers_ = {};
        program_ = 0;
        timerQuery_ = 0;
        timerPending_ = false;
        elementCount_ = 0;
    }

    private:
    GLsizeiptr byteCount() const {
        return static_cast<GLsizeiptr>((elementCount_ + computeLocalSize) * sizeof(Vec4));
    }

    static void checkWaitBudget(std::stop_token stop, ComputeClock::time_point deadline) {
        if (stop.stop_requested()) {
            throw std::runtime_error("Job cancelled; incomplete samples are not published.");
        }
        if (ComputeClock::now() >= deadline) {
            throw std::runtime_error("GPU completion/query exceeded the 3-second deadline.");
        }
    }

    static void waitForCompletion(GlApi& api, std::stop_token stop, ComputeClock::time_point deadline) {
        GLsync fence = api.FenceSync(GL_SYNC_GPU_COMMANDS_COMPLETE, 0);
        if (!fence) {
            throw std::runtime_error("Cannot create GPU completion fence.");
        }
        api.Flush();
        try {
            for (;;) {
                checkWaitBudget(stop, deadline);
                const GLenum status = api.ClientWaitSync(fence, 0, 0);
                if (status == GL_ALREADY_SIGNALED || status == GL_CONDITION_SATISFIED) {
                    break;
                }
                if (status != GL_TIMEOUT_EXPIRED) {
                    throw std::runtime_error("glClientWaitSync failed.");
                }
                std::this_thread::sleep_for(std::chrono::microseconds(100));
            }
        } catch (...) {
            api.DeleteSync(fence);
            throw;
        }
        api.DeleteSync(fence);
    }

    std::array<GLuint, 3> buffers_{};
    GLuint program_{};
    GLuint timerQuery_{};
    bool timerPending_{};
    std::size_t elementCount_{};
    GLint elementCountLocation_{-1};
    GLint operationLocation_{-1};
    GLint scalarLocation_{-1};
    std::vector<Vec4> paddedA_{};
    std::vector<Vec4> paddedB_{};
    std::vector<Vec4> unwritten_{};
    std::vector<Vec4> readback_{};
};

} // namespace lab
