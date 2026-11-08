#pragma once

#include "city_program.hpp"
#include "city_types.hpp"

#include <filesystem>
#include <functional>
#include <new>
#include <utility>

namespace city {

struct ScanLevel {
    std::size_t count{};
    GLuint prefixes{};
    GLuint sums{};
};

struct CityBuffers {
    GLuint objects{};
    GLuint masks{};
    GLuint visible{};
    GLuint identityIDs{};
    GLuint commands{};
    GLuint identityCommands{};
    GLuint identityStats{};
    std::vector<GLuint> reduction{};
    std::vector<std::size_t> reductionCounts{};
    std::vector<ScanLevel> scan{};
    std::size_t count{};
    std::size_t bytes{};
};

inline void destroyCityBuffers(GlApi& gl, CityBuffers& buffers) {
    // A failed candidate owns only its own names; the live scene is untouched.
    const std::array<GLuint, 7> fixed{buffers.objects, buffers.masks, buffers.visible, buffers.identityIDs, buffers.commands, buffers.identityCommands, buffers.identityStats};
    gl.DeleteBuffers(static_cast<GLsizei>(fixed.size()), fixed.data());
    for (const GLuint buffer : buffers.reduction) {
        gl.DeleteBuffers(1, &buffer);
    }
    for (const ScanLevel& level : buffers.scan) {
        gl.DeleteBuffers(1, &level.prefixes);
        gl.DeleteBuffers(1, &level.sums);
    }
    buffers = {};
}

class CityGpu {
    public:
    using StageHook = std::function<void(int, bool)>;

    bool initialize(GlApi& gl, const std::filesystem::path& directory, std::string& error) {
        const std::array<const char*, 7> names{"cull.comp", "reduce.comp", "scan.comp", "uniform_add.comp", "compact.comp", "commands.comp", "integer_fixture.comp"};
        for (std::size_t index = 0; index < programs_.size(); ++index) {
            programs_[index] = buildProgram(gl, {{GL_COMPUTE_SHADER, directory / names[index]}}, error);
            if (programs_[index] == 0U) {
                destroy(gl);
                return false;
            }
        }
        return true;
    }

    bool rebuild(GlApi& gl, std::span<const Object> objects, std::string& error) {
        if (objects.size() > kMaximumObjects) {
            error = "Object budget exceeded (maximum 2,000,003 records).";
            return false;
        }
        for (const Object& object : objects) {
            if (!validObject(object)) {
                error = "Invalid object bounds, material or mesh group; previous scene retained.";
                return false;
            }
        }
        GLint64 blockLimit = 0;
        gl.GetInteger64v(GL_MAX_SHADER_STORAGE_BLOCK_SIZE, &blockLimit);
        const std::size_t objectBytes = objects.size() * sizeof(Object);
        if (blockLimit <= 0 || objectBytes > static_cast<std::uint64_t>(blockLimit)) {
            error = "Object SSBO exceeds GL_MAX_SHADER_STORAGE_BLOCK_SIZE; previous scene retained.";
            return false;
        }

        CityBuffers candidate{};
        try {
            // Reserve host metadata before owning GL names, so later push_back cannot leak one.
            candidate.reduction.reserve(8);
            candidate.reductionCounts.reserve(8);
            candidate.scan.reserve(8);
            candidate.count = objects.size();
            const void* objectData = nullptr;
            if (!objects.empty()) {
                objectData = objects.data();
            }
            bool success = allocate(gl, candidate, candidate.objects, std::max(objectBytes, sizeof(Object)), objectData, error);
            success = success && allocate(gl, candidate, candidate.masks, (std::max(objects.size(), std::size_t{1}) + 1) * sizeof(Counts), nullptr, error);
            success = success && allocate(gl, candidate, candidate.visible, (std::max(objects.size(), std::size_t{1}) + 1) * sizeof(std::uint32_t), nullptr, error);

            // This one-time CPU identity list makes early learning checkpoints runnable.
            // The final runtime never consults this list or CPU-computed instance counts.
            Frustum unusedPlanes{};
            const std::vector<std::uint32_t> identity = cpuVisibleIDs(objects, unusedPlanes, false);
            const GpuStats identityStats = cpuStatistics(objects, unusedPlanes, {}, false);
            const auto identityCommands = makeCommands(identityStats.counts);
            const void* identityData = nullptr;
            if (!identity.empty()) {
                identityData = identity.data();
            }
            success = success && allocate(gl, candidate, candidate.identityIDs, std::max(identity.size(), std::size_t{1}) * sizeof(std::uint32_t), identityData, error);
            success = success && allocate(gl, candidate, candidate.identityStats, sizeof(GpuStats), &identityStats, error);
            success = success && allocate(gl, candidate, candidate.identityCommands, sizeof(identityCommands), identityCommands.data(), error);
            const auto emptyCommands = makeCommands({});
            success = success && allocate(gl, candidate, candidate.commands, sizeof(emptyCommands), emptyCommands.data(), error);

            std::size_t reductionCount = std::max(ceilDiv(objects.size(), kWorkgroupSize), std::size_t{1});
            const GpuStats empty{};
            while (success) {
                GLuint buffer = 0U;
                const void* initial = nullptr;
                if (reductionCount == 1U) {
                    initial = &empty;
                }
                success = allocate(gl, candidate, buffer, reductionCount * sizeof(GpuStats), initial, error);
                candidate.reduction.push_back(buffer);
                candidate.reductionCounts.push_back(reductionCount);
                if (reductionCount == 1U) {
                    break;
                }
                reductionCount = ceilDiv(reductionCount, kWorkgroupSize);
            }
            std::size_t scanCount = std::max(objects.size(), std::size_t{1});
            while (success) {
                ScanLevel level{};
                level.count = scanCount;
                const std::size_t blocks = ceilDiv(scanCount, kScanSpan);
                success = allocate(gl, candidate, level.prefixes, (scanCount + 1) * sizeof(Counts), nullptr, error);
                success = success && allocate(gl, candidate, level.sums, (blocks + 1) * sizeof(Counts), nullptr, error);
                candidate.scan.push_back(level);
                if (blocks == 1U) {
                    break;
                }
                scanCount = blocks;
            }
            if (!success || candidate.bytes > 256U * 1024U * 1024U) {
                if (success) {
                    error = "Candidate exceeds the explicit 256 MiB project GPU-buffer budget.";
                }
                destroyCityBuffers(gl, candidate);
                return false;
            }
            initializeGuards(gl, candidate);
            if (gl.GetError() != GL_NO_ERROR) {
                error = "Cannot initialize candidate guards; previous scene retained.";
                destroyCityBuffers(gl, candidate);
                return false;
            }
            destroyCityBuffers(gl, buffers_);
            buffers_ = std::move(candidate);
            return true;
        } catch (const std::bad_alloc&) {
            destroyCityBuffers(gl, candidate);
            error = "Host allocation failed while preparing GPU candidate; previous scene retained.";
            return false;
        }
    }

    void run(GlApi& gl, const Frustum& planes, Vec3 eye, bool culling, const StageHook& hook = {}) {
        if (buffers_.objects == 0U) {
            return;
        }
#if LAB_CHECKPOINT >= 4
        stage(hook, 0, true);
        dispatchCull(gl, planes, eye, culling);
        stage(hook, 0, false);
#else
        (void)gl;
        (void)planes;
        (void)eye;
        (void)culling;
        (void)hook;
#endif
#if LAB_CHECKPOINT >= 5
        stage(hook, 1, true);
        dispatchReduction(gl);
        stage(hook, 1, false);
#endif
#if LAB_CHECKPOINT >= 6
        stage(hook, 2, true);
        dispatchScan(gl);
        stage(hook, 2, false);
#endif
#if LAB_CHECKPOINT >= 8
        stage(hook, 3, true);
        dispatchCompaction(gl);
        stage(hook, 3, false);
#endif
#if LAB_CHECKPOINT >= 9
        stage(hook, 4, true);
        dispatchCommands(gl);
        stage(hook, 4, false);
#endif
    }

    void dispatchCull(GlApi& gl, const Frustum& planes, Vec3 eye, bool culling) {
#if LAB_CHECKPOINT >= 4
        if (buffers_.count == 0U) {
            return;
        }
        const GLuint program = programs_[0];
        gl.UseProgram(program);
        gl.BindBufferBase(GL_SHADER_STORAGE_BUFFER, 0U, buffers_.objects);
        gl.BindBufferBase(GL_SHADER_STORAGE_BUFFER, 1U, buffers_.masks);
        gl.BindBufferBase(GL_SHADER_STORAGE_BUFFER, 2U, buffers_.reduction.front());
        gl.Uniform1ui(gl.GetUniformLocation(program, "uCount"), static_cast<GLuint>(buffers_.count));
        gl.Uniform4fv(gl.GetUniformLocation(program, "uPlanes"), 6, &planes[0].x);
        gl.Uniform3f(gl.GetUniformLocation(program, "uEye"), eye.x, eye.y, eye.z);
        int enabled = 0;
        if (culling) {
            enabled = 1;
        }
        gl.Uniform1i(gl.GetUniformLocation(program, "uCulling"), enabled);
        gl.DispatchCompute(static_cast<GLuint>(ceilDiv(buffers_.count, kWorkgroupSize)), 1U, 1U);
        gl.MemoryBarrier(GL_SHADER_STORAGE_BARRIER_BIT);
#else
        (void)gl;
        (void)planes;
        (void)eye;
        (void)culling;
#endif
    }

    void dispatchReduction(GlApi& gl) {
#if LAB_CHECKPOINT >= 5
        const GLuint program = programs_[1];
        gl.UseProgram(program);
        for (std::size_t level = 1; level < buffers_.reduction.size(); ++level) {
            const std::size_t count = buffers_.reductionCounts[level - 1];
            gl.BindBufferBase(GL_SHADER_STORAGE_BUFFER, 0U, buffers_.reduction[level - 1]);
            gl.BindBufferBase(GL_SHADER_STORAGE_BUFFER, 1U, buffers_.reduction[level]);
            gl.Uniform1ui(gl.GetUniformLocation(program, "uCount"), static_cast<GLuint>(count));
            gl.DispatchCompute(static_cast<GLuint>(ceilDiv(count, kWorkgroupSize)), 1U, 1U);
            gl.MemoryBarrier(GL_SHADER_STORAGE_BARRIER_BIT);
        }
#else
        (void)gl;
#endif
    }

    void dispatchScan(GlApi& gl) {
#if LAB_CHECKPOINT >= 6
        if (buffers_.count == 0U) {
            return;
        }
        GLuint input = buffers_.masks;
        std::size_t levelCount = 1;
#if LAB_CHECKPOINT >= 7
        levelCount = buffers_.scan.size();
#endif
        for (std::size_t index = 0; index < levelCount; ++index) {
            const ScanLevel& level = buffers_.scan[index];
            const GLuint program = programs_[2];
            gl.UseProgram(program);
            gl.BindBufferBase(GL_SHADER_STORAGE_BUFFER, 0U, input);
            gl.BindBufferBase(GL_SHADER_STORAGE_BUFFER, 1U, level.prefixes);
            gl.BindBufferBase(GL_SHADER_STORAGE_BUFFER, 2U, level.sums);
            gl.Uniform1ui(gl.GetUniformLocation(program, "uCount"), static_cast<GLuint>(level.count));
            gl.DispatchCompute(static_cast<GLuint>(ceilDiv(level.count, kScanSpan)), 1U, 1U);
            gl.MemoryBarrier(GL_SHADER_STORAGE_BARRIER_BIT);
            input = level.sums;
        }
#if LAB_CHECKPOINT >= 7
        // Walk back down the hierarchy. Prefixes of block totals stay on the GPU.
        for (std::size_t index = buffers_.scan.size() - 1; index > 0; --index) {
            const ScanLevel& destination = buffers_.scan[index - 1];
            const ScanLevel& offsets = buffers_.scan[index];
            const GLuint program = programs_[3];
            gl.UseProgram(program);
            gl.BindBufferBase(GL_SHADER_STORAGE_BUFFER, 0U, destination.prefixes);
            gl.BindBufferBase(GL_SHADER_STORAGE_BUFFER, 1U, offsets.prefixes);
            gl.Uniform1ui(gl.GetUniformLocation(program, "uCount"), static_cast<GLuint>(destination.count));
            gl.DispatchCompute(static_cast<GLuint>(ceilDiv(destination.count, kWorkgroupSize)), 1U, 1U);
            gl.MemoryBarrier(GL_SHADER_STORAGE_BARRIER_BIT);
        }
#endif
#else
        (void)gl;
#endif
    }

    void dispatchCompaction(GlApi& gl) {
#if LAB_CHECKPOINT >= 8
        if (buffers_.count == 0U) {
            return;
        }
        const GLuint program = programs_[4];
        gl.UseProgram(program);
        gl.BindBufferBase(GL_SHADER_STORAGE_BUFFER, 0U, buffers_.masks);
        gl.BindBufferBase(GL_SHADER_STORAGE_BUFFER, 1U, buffers_.scan.front().prefixes);
        gl.BindBufferBase(GL_SHADER_STORAGE_BUFFER, 2U, statsBuffer());
        gl.BindBufferBase(GL_SHADER_STORAGE_BUFFER, 3U, buffers_.visible);
        gl.Uniform1ui(gl.GetUniformLocation(program, "uCount"), static_cast<GLuint>(buffers_.count));
        gl.DispatchCompute(static_cast<GLuint>(ceilDiv(buffers_.count, kWorkgroupSize)), 1U, 1U);
        gl.MemoryBarrier(GL_SHADER_STORAGE_BARRIER_BIT);
#else
        (void)gl;
#endif
    }

    void dispatchCommands(GlApi& gl) {
#if LAB_CHECKPOINT >= 9
        const GLuint program = programs_[5];
        gl.UseProgram(program);
        gl.BindBufferBase(GL_SHADER_STORAGE_BUFFER, 0U, statsBuffer());
        gl.BindBufferBase(GL_SHADER_STORAGE_BUFFER, 1U, buffers_.commands);
        gl.DispatchCompute(1U, 1U, 1U);
        // Two consumers: the indirect command parser AND vertex-shader SSBO reads.
        gl.MemoryBarrier(GL_COMMAND_BARRIER_BIT | GL_SHADER_STORAGE_BARRIER_BIT);
#else
        (void)gl;
#endif
    }

    GpuSnapshot readSnapshot(GlApi& gl, std::size_t limit) const {
        // Diagnostic/validation path only. Caller polls a fence before entering.
        gl.MemoryBarrier(GL_BUFFER_UPDATE_BARRIER_BIT);
        GpuSnapshot result{};
        read(gl, statsBuffer(), 1, &result.stats);
        read(gl, buffers_.commands, result.commands.size(), result.commands.data());
        const std::size_t count = std::min(limit, buffers_.count);
        result.masks.resize(count);
        result.prefixes.resize(count);
        const std::size_t visibleCount = std::min(limit, static_cast<std::size_t>(result.stats.counts[3]));
        result.visibleIDs.resize(visibleCount);
        read(gl, buffers_.masks, count, result.masks.data());
        read(gl, buffers_.scan.front().prefixes, count, result.prefixes.data());
        read(gl, buffers_.visible, visibleCount, result.visibleIDs.data());
        return result;
    }

    GpuStats readStats(GlApi& gl) const {
        gl.MemoryBarrier(GL_BUFFER_UPDATE_BARRIER_BIT);
        GpuStats result{};
        read(gl, statsBuffer(), 1, &result);
        return result;
    }

    bool dispatchScanFixture(GlApi& gl, std::span<const Counts> input, std::string& error) {
#if LAB_CHECKPOINT >= 11
        if (input.size() != buffers_.count || !scanInputFits(input)) {
            error = "Scan fixture size mismatch or uint32 prefix overflow.";
            return false;
        }
        if (!input.empty()) {
            gl.BindBuffer(GL_SHADER_STORAGE_BUFFER, buffers_.masks);
            gl.BufferSubData(GL_SHADER_STORAGE_BUFFER, 0, static_cast<GLsizeiptr>(input.size_bytes()), input.data());
            dispatchScan(gl);
        }
        return gl.GetError() == GL_NO_ERROR;
#else
        (void)gl;
        (void)input;
        error = "Primitive validation is introduced at checkpoint 11.";
        return false;
#endif
    }

    bool dispatchIntegerFixture(GlApi& gl, std::span<const std::uint32_t> input, std::string& error) {
#if LAB_CHECKPOINT >= 11
        const IntegerReduction reference = cpuIntegerReduction(input);
        if (input.size() != buffers_.count || reference.sum > std::numeric_limits<std::uint32_t>::max()) {
            error = "Integer fixture size mismatch or uint32 sum overflow.";
            return false;
        }
        if (input.empty()) {
            return true;
        }
        GLuint inputBuffer = 0U;
        gl.GenBuffers(1, &inputBuffer);
        gl.BindBuffer(GL_SHADER_STORAGE_BUFFER, inputBuffer);
        gl.BufferData(GL_SHADER_STORAGE_BUFFER, static_cast<GLsizeiptr>(input.size_bytes()), input.data(), GL_STATIC_DRAW);
        if (inputBuffer == 0U || gl.GetError() != GL_NO_ERROR) {
            gl.DeleteBuffers(1, &inputBuffer);
            error = "Integer fixture input allocation failed.";
            return false;
        }
        gl.UseProgram(programs_[6]);
        gl.BindBufferBase(GL_SHADER_STORAGE_BUFFER, 0U, inputBuffer);
        gl.BindBufferBase(GL_SHADER_STORAGE_BUFFER, 1U, buffers_.reduction.front());
        gl.Uniform1ui(gl.GetUniformLocation(programs_[6], "uCount"), static_cast<GLuint>(input.size()));
        gl.DispatchCompute(static_cast<GLuint>(ceilDiv(input.size(), kWorkgroupSize)), 1U, 1U);
        gl.MemoryBarrier(GL_SHADER_STORAGE_BARRIER_BIT);
        dispatchReduction(gl);
        // OpenGL retains queued uses until execution completes even after deletion.
        gl.DeleteBuffers(1, &inputBuffer);
        return gl.GetError() == GL_NO_ERROR;
#else
        (void)gl;
        (void)input;
        error = "Primitive validation is introduced at checkpoint 11.";
        return false;
#endif
    }

    bool guardRecordsIntact(GlApi& gl) const {
        // Guard records are diagnostics, never part of the object/accepted counts.
        gl.MemoryBarrier(GL_BUFFER_UPDATE_BARRIER_BIT);
        const Counts expected{kGuard, kGuard, kGuard, kGuard};
        Counts actual{};
        readAt(gl, buffers_.masks, buffers_.count * sizeof(Counts), sizeof(Counts), actual.data());
        if (actual != expected) {
            return false;
        }
        std::uint32_t visibleGuard = 0;
        readAt(gl, buffers_.visible, buffers_.count * sizeof(std::uint32_t), sizeof(visibleGuard), &visibleGuard);
        if (visibleGuard != kGuard) {
            return false;
        }
        for (const ScanLevel& level : buffers_.scan) {
            readAt(gl, level.prefixes, level.count * sizeof(Counts), sizeof(Counts), actual.data());
            if (actual != expected) {
                return false;
            }
            readAt(gl, level.sums, ceilDiv(level.count, kScanSpan) * sizeof(Counts), sizeof(Counts), actual.data());
            if (actual != expected) {
                return false;
            }
        }
        return true;
    }

    GLuint objectsBuffer() const {
        return buffers_.objects;
    }

    GLuint visibleBuffer() const {
#if LAB_CHECKPOINT >= 9
        return buffers_.visible;
#else
        return buffers_.identityIDs;
#endif
    }

    GLuint commandsBuffer() const {
#if LAB_CHECKPOINT >= 9
        return buffers_.commands;
#else
        return buffers_.identityCommands;
#endif
    }

    GLuint drawStatsBuffer() const {
#if LAB_CHECKPOINT >= 9
        return statsBuffer();
#else
        return buffers_.identityStats;
#endif
    }

    GLuint statsBuffer() const {
#if LAB_CHECKPOINT >= 5
        return buffers_.reduction.back();
#else
        return buffers_.identityStats;
#endif
    }

    GLuint maskBuffer() const {
        return buffers_.masks;
    }

    GLuint identityVisibleBuffer() const {
        return buffers_.identityIDs;
    }

    GLuint identityCommandsBuffer() const {
        return buffers_.identityCommands;
    }

    GLuint identityStatsBuffer() const {
        return buffers_.identityStats;
    }

    GLuint prefixBuffer() const {
        return buffers_.scan.front().prefixes;
    }

    std::size_t count() const {
        return buffers_.count;
    }

    std::size_t bytes() const {
        return buffers_.bytes;
    }

    void destroy(GlApi& gl) {
        destroyCityBuffers(gl, buffers_);
        for (GLuint& program : programs_) {
            if (program != 0U) {
                gl.DeleteProgram(program);
                program = 0U;
            }
        }
    }

    private:
    inline static constexpr std::uint32_t kGuard = 0xdefacedU;

    static void stage(const StageHook& hook, int index, bool begin) {
        if (hook) {
            hook(index, begin);
        }
    }

    static bool allocate(GlApi& gl, CityBuffers& buffers, GLuint& name, std::size_t bytes, const void* data, std::string& error) {
        constexpr std::size_t budget = 256U * 1024U * 1024U;
        if (bytes > budget || buffers.bytes > budget - bytes) {
            error = "Candidate exceeds the explicit 256 MiB project GPU-buffer budget.";
            return false;
        }
        gl.GenBuffers(1, &name);
        if (name == 0U) {
            error = "glGenBuffers failed; previous scene retained.";
            return false;
        }
        gl.BindBuffer(GL_SHADER_STORAGE_BUFFER, name);
        gl.BufferData(GL_SHADER_STORAGE_BUFFER, static_cast<GLsizeiptr>(bytes), data, GL_DYNAMIC_COPY);
        if (gl.GetError() != GL_NO_ERROR) {
            error = "glBufferData failed; previous scene retained.";
            return false;
        }
        buffers.bytes += bytes;
        return true;
    }

    template <typename Value>
    static void read(GlApi& gl, GLuint buffer, std::size_t count, Value* output) {
        if (count == 0) {
            return;
        }
        gl.BindBuffer(GL_SHADER_STORAGE_BUFFER, buffer);
        gl.GetBufferSubData(GL_SHADER_STORAGE_BUFFER, 0, static_cast<GLsizeiptr>(count * sizeof(Value)), output);
    }

    static void readAt(GlApi& gl, GLuint buffer, std::size_t offset, std::size_t bytes, void* output) {
        gl.BindBuffer(GL_SHADER_STORAGE_BUFFER, buffer);
        gl.GetBufferSubData(GL_SHADER_STORAGE_BUFFER, static_cast<GLintptr>(offset), static_cast<GLsizeiptr>(bytes), output);
    }

    static void writeAt(GlApi& gl, GLuint buffer, std::size_t offset, std::size_t bytes, const void* value) {
        gl.BindBuffer(GL_SHADER_STORAGE_BUFFER, buffer);
        gl.BufferSubData(GL_SHADER_STORAGE_BUFFER, static_cast<GLintptr>(offset), static_cast<GLsizeiptr>(bytes), value);
    }

    static void initializeGuards(GlApi& gl, const CityBuffers& buffers) {
        const Counts guard{kGuard, kGuard, kGuard, kGuard};
        writeAt(gl, buffers.masks, buffers.count * sizeof(Counts), sizeof(Counts), guard.data());
        writeAt(gl, buffers.visible, buffers.count * sizeof(std::uint32_t), sizeof(kGuard), &kGuard);
        for (const ScanLevel& level : buffers.scan) {
            writeAt(gl, level.prefixes, level.count * sizeof(Counts), sizeof(Counts), guard.data());
            writeAt(gl, level.sums, ceilDiv(level.count, kScanSpan) * sizeof(Counts), sizeof(Counts), guard.data());
        }
    }

    CityBuffers buffers_{};
    std::array<GLuint, 7> programs_{};
};

} // namespace city
