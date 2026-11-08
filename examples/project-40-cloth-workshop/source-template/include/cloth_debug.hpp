#pragma once

#include "cloth_gpu.hpp"

#include <array>
#include <chrono>
#include <cstddef>
#include <filesystem>
#include <string>

namespace cloth {

// This is a bounded UI preview, not a contact list used by the solver.
// The solver never receives this 32-item limit or the 8192-slot diagnostic budget.
inline constexpr std::uint32_t debugPreviewCapacity = 32U;
inline constexpr std::uint32_t debugSlotBudget = 8192U;
inline constexpr std::uint32_t debugValid = 1U;
inline constexpr std::uint32_t debugPartial = 2U;
inline constexpr std::uint32_t debugInvalid = 4U;

struct alignas(16) DebugVertex {
    Vec4 position{};
    std::uint32_t id{noVertex};
    std::uint32_t cell{noVertex};
    std::uint32_t flags{};
    std::uint32_t padding{};
};

struct alignas(16) DebugCell {
    // xyz is a cell coordinate in the last solver CSR grid. w=-1 is outside the grid.
    std::array<std::int32_t, 4> coordinateAndCount{};
};

struct alignas(16) DebugPacket {
    Vec4 selectedPosition{};
    // selected, side, last CSR source cell, flags.
    std::array<std::uint32_t, 4> identity{};
    // Total eligible candidates, checked candidates, candidate preview size, checked contacts.
    std::array<std::uint32_t, 4> candidateCounts{};
    // Contact preview size, total bucket slots, visited bucket slots, slot budget.
    std::array<std::uint32_t, 4> previewCounts{};
    std::array<DebugCell, 27> cells{};
    std::array<DebugVertex, debugPreviewCapacity> candidates{};
    std::array<DebugVertex, debugPreviewCapacity> contacts{};
};

static_assert(sizeof(DebugVertex) == 32U);
static_assert(sizeof(DebugCell) == 16U);
static_assert(offsetof(DebugPacket, cells) == 64U);
static_assert(offsetof(DebugPacket, candidates) == 496U);
static_assert(offsetof(DebugPacket, contacts) == 1520U);
static_assert(sizeof(DebugPacket) == 2544U);

struct DebugSnapshot {
    bool valid{};
    std::uint64_t epoch{};
    std::uint64_t solverSteps{};
    std::uint32_t selected{noVertex};
    std::uint32_t side{};
    std::uint32_t sourceCell{noVertex};
    std::uint32_t flags{};
    Vec4 selectedPosition{};
    GridPlan grid{};
    float thickness{};
    std::uint32_t totalCandidates{};
    std::uint32_t checkedCandidates{};
    std::uint32_t totalBucketSlots{};
    std::uint32_t visitedBucketSlots{};
    std::uint32_t checkedContacts{};
    std::uint32_t candidateCount{};
    std::uint32_t contactCount{};
    std::array<DebugCell, 27> cells{};
    std::array<DebugVertex, debugPreviewCapacity> candidates{};
    std::array<DebugVertex, debugPreviewCapacity> contacts{};

    bool partial() const {
        return (flags & debugPartial) != 0U;
    }
};

class GpuClothDebug {
    GLuint program_{};
    GLuint output_{};
    GLsync fence_{};
    std::uint64_t epoch_{};
    std::uint64_t submittedEpoch_{};
    std::chrono::steady_clock::time_point submittedAt_{};
    DebugSnapshot submitted_{};
    DebugSnapshot snapshot_{};
    std::string pendingError_{};

    void releaseFence(GlApi& gl) {
        if (fence_ != nullptr) {
            gl.DeleteSync(fence_);
            fence_ = nullptr;
        }
    }

    void uintUniform(GlApi& gl, const char* name, std::uint32_t value) {
        gl.Uniform1ui(gl.GetUniformLocation(program_, name), value);
    }

public:
    GpuClothDebug() = default;
    GpuClothDebug(const GpuClothDebug&) = delete;
    GpuClothDebug& operator=(const GpuClothDebug&) = delete;

    bool initialize(GlApi& gl, const std::filesystem::path& directory, std::string& error) {
        destroy(gl);
        program_ = buildProgram(gl, {{GL_COMPUTE_SHADER, directory / "cloth_debug.comp"}}, error);
        if (program_ == 0U) {
            return false;
        }
        gl.GenBuffers(1, &output_);
        gl.BindBuffer(GL_SHADER_STORAGE_BUFFER, output_);
        gl.BufferData(GL_SHADER_STORAGE_BUFFER, sizeof(DebugPacket), nullptr, GL_DYNAMIC_COPY);
        if (output_ == 0U || gl.GetError() != GL_NO_ERROR) {
            error = "Could not allocate the bounded 2544-byte cloth debug output.";
            destroy(gl);
            return false;
        }
        return true;
    }

    bool busy() const {
        return fence_ != nullptr;
    }

    const DebugSnapshot& getSnapshot() const {
        return snapshot_;
    }

    void cancel(GlApi& gl) {
        // A GL name is not a topology generation. Explicit cancellation advances this epoch,
        // clears the old selected-ID snapshot, and prevents publishing a result after Reset.
        ++epoch_;
        releaseFence(gl);
        submitted_ = {};
        snapshot_ = {};
        snapshot_.epoch = epoch_;
        pendingError_.clear();
    }

    bool request(GlApi& gl, const GpuCloth& gpu, std::uint32_t selected) {
        if (busy() || gpu.busy()) {
            return false;
        }
#if LAB_CHECKPOINT < 9
        (void)gl;
        (void)gpu;
        (void)selected;
        pendingError_ = "CSR debug is available from checkpoint 09; no grid preview was fabricated.";
        return false;
#else
        if (program_ == 0U || output_ == 0U) {
            pendingError_ = "Cloth debug helper has not initialized.";
            return false;
        }
        const auto count = static_cast<std::uint32_t>(gpu.topology().positions.size());
        if (selected >= count || gpu.stats().steps == 0U) {
            pendingError_ = "Choose a valid vertex and finish one solver step before requesting CSR debug.";
            return false;
        }
        const GridPlan grid = gpu.gridPlan();
        if (grid.nx == 0U || grid.ny == 0U || grid.nz == 0U || grid.cells == 0U) {
            pendingError_ = "Cannot inspect an empty cloth grid.";
            return false;
        }
        ++epoch_;
        submittedEpoch_ = epoch_;
        submitted_ = {};
        submitted_.epoch = submittedEpoch_;
        submitted_.solverSteps = gpu.stats().steps;
        submitted_.selected = selected;
        submitted_.side = gpu.topology().side;
        submitted_.grid = grid;
        submitted_.thickness = gpu.thickness();
        pendingError_.clear();
        gl.UseProgram(program_);
        const std::array<GLuint, 6> buffers{gpu.positionBuffer(), gpu.countsBuffer(),
            gpu.offsetsBuffer(), gpu.idsBuffer(), gpu.vertexCellsBuffer(), output_};
        for (GLuint binding = 0U; binding < buffers.size(); ++binding) {
            gl.BindBufferBase(GL_SHADER_STORAGE_BUFFER, binding, buffers[binding]);
        }
        uintUniform(gl, "uSelected", selected);
        uintUniform(gl, "uCount", count);
        uintUniform(gl, "uSide", submitted_.side);
        uintUniform(gl, "uCells", grid.cells);
        gl.Uniform3ui(gl.GetUniformLocation(program_, "uDimensions"), grid.nx, grid.ny, grid.nz);
        gl.Uniform1f(gl.GetUniformLocation(program_, "uThickness"), submitted_.thickness);
        gl.MemoryBarrier(GL_SHADER_STORAGE_BARRIER_BIT);
        // Exactly one invocation inspects <=27 cells, <=25 topology exclusions, <=8192 slots.
        // All input buffers are readonly. Later solver work cannot mutate this output packet.
        gl.DispatchCompute(1U, 1U, 1U);
        gl.MemoryBarrier(GL_SHADER_STORAGE_BARRIER_BIT | GL_BUFFER_UPDATE_BARRIER_BIT);
        fence_ = gl.FenceSync(GL_SYNC_GPU_COMMANDS_COMPLETE, 0U);
        submittedAt_ = std::chrono::steady_clock::now();
        gl.Flush();
        if (fence_ == nullptr || gl.GetError() != GL_NO_ERROR) {
            releaseFence(gl);
            pendingError_ = "Could not submit the bounded cloth debug query.";
            return false;
        }
        return true;
#endif
    }

    bool poll(GlApi& gl, std::string& error) {
        if (!pendingError_.empty()) {
            error = pendingError_;
            pendingError_.clear();
            return false;
        }
        if (fence_ == nullptr) {
            return false;
        }
        const GLenum result = gl.ClientWaitSync(fence_, 0U, 0ULL);
        if (result == GL_WAIT_FAILED) {
            cancel(gl);
            error = "Cloth debug fence failed; no debug result was published.";
            return false;
        }
        if (result != GL_ALREADY_SIGNALED && result != GL_CONDITION_SATISFIED) {
            if (std::chrono::steady_clock::now() - submittedAt_ > std::chrono::seconds(5)) {
                cancel(gl);
                error = "Cloth debug exceeded its five-second deadline; no result was published.";
            }
            return false;
        }
        if (submittedEpoch_ != epoch_) {
            releaseFence(gl);
            return false;
        }
        // The fence orders the immutable 2544-byte packet. Never read the full cloth on CPU.
        DebugPacket packet{};
        gl.BindBuffer(GL_SHADER_STORAGE_BUFFER, output_);
        gl.GetBufferSubData(GL_SHADER_STORAGE_BUFFER, 0, sizeof(packet), &packet);
        releaseFence(gl);
        if (gl.GetError() != GL_NO_ERROR || (packet.identity[3] & debugValid) == 0U
            || (packet.identity[3] & debugInvalid) != 0U
            || packet.identity[0] != submitted_.selected
            || packet.identity[1] != submitted_.side
            || packet.candidateCounts[2] > debugPreviewCapacity
            || packet.previewCounts[0] > debugPreviewCapacity
            || packet.previewCounts[2] > debugSlotBudget) {
            error = "Cloth debug rejected an invalid CSR/preview packet; last good snapshot was retained.";
            return false;
        }
        DebugSnapshot candidate = submitted_;
        candidate.valid = true;
        candidate.flags = packet.identity[3];
        candidate.sourceCell = packet.identity[2];
        candidate.selectedPosition = packet.selectedPosition;
        candidate.totalCandidates = packet.candidateCounts[0];
        candidate.checkedCandidates = packet.candidateCounts[1];
        candidate.candidateCount = packet.candidateCounts[2];
        candidate.checkedContacts = packet.candidateCounts[3];
        candidate.contactCount = packet.previewCounts[0];
        candidate.totalBucketSlots = packet.previewCounts[1];
        candidate.visitedBucketSlots = packet.previewCounts[2];
        candidate.cells = packet.cells;
        candidate.candidates = packet.candidates;
        candidate.contacts = packet.contacts;
        snapshot_ = candidate;
        // CSR membership is from the last pre-correction solver grid. Distances above use
        // positions at this probe command, not an unavailable replay of the grid-build state.
        return true;
    }

    void destroy(GlApi& gl) {
        cancel(gl);
        if (output_ != 0U) {
            gl.DeleteBuffers(1, &output_);
            output_ = 0U;
        }
        if (program_ != 0U) {
            gl.DeleteProgram(program_);
            program_ = 0U;
        }
    }
};

} // namespace cloth
