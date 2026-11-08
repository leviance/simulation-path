#pragma once
#include "cloth_cpu.hpp"
#include "cloth_scan.hpp"

#include <bit>
#include <chrono>
#include <filesystem>
#include <memory>

namespace cloth {

struct Stats {
    std::uint64_t steps{};
    std::uint32_t updated{};
    std::uint32_t dynamic{};
    std::uint32_t pinned{};
    std::uint32_t normals{};
    std::uint32_t constraints{};
    std::uint64_t candidates{};
    std::uint32_t contacts{};
    std::uint32_t selfContacts{};
    std::uint32_t analyticContacts{};
    std::uint32_t occupiedCells{};
    std::uint32_t countedVertices{};
    std::uint32_t maxOccupancy{};
    float maxStrain{};  // Absolute relative distance residual, all constraint kinds including bend approximation.
    float maxStretch{}; // Positive relative elongation of stretch/shear edges only, not compression.
    float maxResidual{};
    float maxPenetration{};
    float maxSelfPenetration{};
    std::uint32_t invalid{};
    std::uint32_t overflow{};
    double predictionMs{};
    double solverMs{};
    double gridMs{};
    double contactMs{};
    double velocityMs{};
    double normalsMs{};
    double diagnosticsMs{};
    double totalMs{};
};

struct SmallSnapshot {
    std::vector<Vec4> positions{};
    std::vector<Vec4> velocities{};
    std::vector<Vec4> normals{};
    std::vector<std::uint32_t> counts{};
    std::vector<std::uint32_t> offsets{};
    std::vector<std::uint32_t> ids{};
    std::vector<std::uint32_t> vertexCells{};
};

struct ClothBuffers {
    GlApi& gl;
    Topology topology{};
    GridPlan grid{};
    Settings settings{};
    GLuint position{};
    GLuint previous{};
    GLuint velocity{};
    GLuint normal{};
    GLuint constraint{};
    GLuint correction{};
    GLuint lambda{};
    GLuint diagnostic{};
    GLuint backupPosition{};
    GLuint backupVelocity{};
    GLuint counts{};
    GLuint offsets{};
    GLuint cursors{};
    GLuint ids{};
    GLuint vertexCells{};
    GLuint indices{};
    GpuScan scan;
    std::uint64_t bytes{};
#if LAB_CHECKPOINT == 3
    std::uint32_t teachingConstraint{};
#endif

    explicit ClothBuffers(GlApi& api)
        : gl(api), scan(api) {}

    ~ClothBuffers() {
        scan.clear();
        const std::array<GLuint, 16> names{position, previous, velocity, normal, constraint, correction, lambda, diagnostic, backupPosition, backupVelocity, counts, offsets, cursors, ids, vertexCells, indices};
        gl.DeleteBuffers(static_cast<GLsizei>(names.size()), names.data());
    }
};

class GpuCloth {
    GlApi& gl_;
    GLuint solver_{};
    GLuint grid_{};
    GLuint scan_{};
    GLuint scanAdd_{};
    std::unique_ptr<ClothBuffers> state_{};
    Stats stats_{};
    GLsync fence_{};
    std::array<GLuint, 512> elapsedQueries_{};
    std::array<GLuint, 2> timestampQueries_{};
    std::vector<std::uint32_t> queryStages_{};
    std::uint64_t acceptedSteps_{};
    Settings stepSettings_{};
    Input input_{};
    std::chrono::steady_clock::time_point submittedAt_{};

    void uintUniform(GLuint program, const char* name, std::uint32_t value) {
        gl_.Uniform1ui(gl_.GetUniformLocation(program, name), value);
    }

    void floatUniform(GLuint program, const char* name, float value) {
        gl_.Uniform1f(gl_.GetUniformLocation(program, name), value);
    }

    void vectorUniform(GLuint program, const char* name, Vec3 value) {
        gl_.Uniform3f(gl_.GetUniformLocation(program, name), value.x, value.y, value.z);
    }

    void beginStage(std::uint32_t stage) {
        const auto index = queryStages_.size();
        queryStages_.push_back(stage);
        gl_.BeginQuery(GL_TIME_ELAPSED, elapsedQueries_[index]);
    }

    void endStage() {
        gl_.EndQuery(GL_TIME_ELAPSED);
    }

    void solverBindings() {
        const std::array<GLuint, 8> buffers{state_->position, state_->previous, state_->velocity, state_->normal, state_->constraint, state_->correction, state_->diagnostic, state_->lambda};
        for (GLuint binding = 0U; binding < buffers.size(); ++binding) {
            gl_.BindBufferBase(GL_SHADER_STORAGE_BUFFER, binding, buffers[binding]);
        }
        gl_.UseProgram(solver_);
    }

    void solverUniforms(const Settings& settings, const Input& input) {
        solverBindings();
        uintUniform(solver_, "uCount", static_cast<std::uint32_t>(state_->topology.positions.size()));
        uintUniform(solver_, "uSide", state_->topology.side);
        uintUniform(solver_, "uEdgeCount", static_cast<std::uint32_t>(state_->topology.constraints.size()));
        const float h = settings.dt / static_cast<float>(settings.substeps);
        floatUniform(solver_, "uH", h);
        floatUniform(solver_, "uCompliance", settings.compliance);
        floatUniform(solver_, "uBendCompliance", settings.bendCompliance);
        floatUniform(solver_, "uThickness", settings.thickness);
        floatUniform(solver_, "uDamping", settings.damping);
        floatUniform(solver_, "uFriction", settings.friction);
        floatUniform(solver_, "uGravity", settings.gravity);
        floatUniform(solver_, "uWind", settings.wind);
        floatUniform(solver_, "uFloor", settings.floorHeight);
        vectorUniform(solver_, "uSphere", settings.sphereCenter);
        floatUniform(solver_, "uSphereRadius", settings.sphereRadius);
        vectorUniform(solver_, "uCapsuleA", settings.capsuleA);
        vectorUniform(solver_, "uCapsuleB", settings.capsuleB);
        floatUniform(solver_, "uCapsuleRadius", settings.capsuleRadius);
        const float horizontal = length(xyz(state_->topology.positions[1]) - xyz(state_->topology.positions[0]));
        const float vertical = length(xyz(state_->topology.positions[state_->topology.side]) - xyz(state_->topology.positions[0]));
        gl_.Uniform2f(gl_.GetUniformLocation(solver_, "uRestSpacing"), horizontal, vertical);
        std::uint32_t dragId = noVertex;
        if (input.dragging && input.dragId < state_->topology.positions.size()) {
            dragId = input.dragId;
        }
        uintUniform(solver_, "uDragId", dragId);
        uintUniform(solver_, "uDragRadius", std::min(input.regionRadiusNodes, 4U));
        vectorUniform(solver_, "uDragTarget", input.dragTarget);
        uintUniform(solver_, "uPinId", input.pinId);
        gl_.Uniform1i(gl_.GetUniformLocation(solver_, "uPinAction"), input.pinAction);
    }

    void dispatchSolver(std::uint32_t phase, std::uint32_t count) {
        solverBindings();
        uintUniform(solver_, "uPhase", phase);
        gl_.DispatchCompute(groupCount(count), 1U, 1U);
        gl_.MemoryBarrier(GL_SHADER_STORAGE_BARRIER_BIT);
    }

    void gridBindings() {
        const std::array<GLuint, 8> buffers{state_->position, state_->counts, state_->offsets, state_->cursors, state_->ids, state_->vertexCells, state_->diagnostic, state_->correction};
        for (GLuint binding = 0U; binding < buffers.size(); ++binding) {
            gl_.BindBufferBase(GL_SHADER_STORAGE_BUFFER, binding, buffers[binding]);
        }
        gl_.UseProgram(grid_);
    }

    void dispatchGrid(std::uint32_t phase, std::uint32_t count) {
        gridBindings();
        uintUniform(grid_, "uPhase", phase);
        uintUniform(grid_, "uCount", static_cast<std::uint32_t>(state_->topology.positions.size()));
        uintUniform(grid_, "uSide", state_->topology.side);
        uintUniform(grid_, "uCells", state_->grid.cells);
        gl_.Uniform3ui(gl_.GetUniformLocation(grid_, "uDimensions"), state_->grid.nx, state_->grid.ny, state_->grid.nz);
        floatUniform(grid_, "uCellSize", state_->grid.cellSize);
        floatUniform(grid_, "uThickness", stepSettings_.thickness);
        uintUniform(grid_, "uCandidateBudget", static_cast<std::uint32_t>(stepSettings_.candidateBudget));
        gl_.DispatchCompute(groupCount(count), 1U, 1U);
        gl_.MemoryBarrier(GL_SHADER_STORAGE_BARRIER_BIT);
    }

    void copyBuffer(GLuint source, GLuint destination, std::uint64_t bytes) {
        gl_.BindBuffer(GL_COPY_READ_BUFFER, source);
        gl_.BindBuffer(GL_COPY_WRITE_BUFFER, destination);
        gl_.CopyBufferSubData(GL_COPY_READ_BUFFER, GL_COPY_WRITE_BUFFER, 0, 0, static_cast<GLsizeiptr>(bytes));
    }

    template <typename Value>
    void readBuffer(GLuint source, std::vector<Value>& output, std::size_t count) {
        output.resize(count);
        gl_.BindBuffer(GL_SHADER_STORAGE_BUFFER, source);
        gl_.GetBufferSubData(GL_SHADER_STORAGE_BUFFER, 0, static_cast<GLsizeiptr>(count * sizeof(Value)), output.data());
    }

    public:
    explicit GpuCloth(GlApi& gl)
        : gl_(gl) {}

    GpuCloth(const GpuCloth&) = delete;
    GpuCloth& operator=(const GpuCloth&) = delete;

    ~GpuCloth() {
        if (fence_ != nullptr) {
            gl_.DeleteSync(fence_);
        }
        state_.reset();
        for (const auto program : {solver_, grid_, scan_, scanAdd_}) {
            if (program != 0U) {
                gl_.DeleteProgram(program);
            }
        }
        if (elapsedQueries_[0] != 0U) {
            gl_.DeleteQueries(static_cast<GLsizei>(elapsedQueries_.size()), elapsedQueries_.data());
            gl_.DeleteQueries(2, timestampQueries_.data());
        }
    }

    bool initialize(const std::filesystem::path& directory, std::string& error) {
        solver_ = buildProgram(gl_, {{GL_COMPUTE_SHADER, directory / "cloth_solver.comp"}}, error);
        if (solver_ == 0U) {
            return false;
        }
        grid_ = buildProgram(gl_, {{GL_COMPUTE_SHADER, directory / "cloth_grid.comp"}}, error);
        scan_ = buildProgram(gl_, {{GL_COMPUTE_SHADER, directory / "cloth_scan.comp"}}, error);
        scanAdd_ = buildProgram(gl_, {{GL_COMPUTE_SHADER, directory / "cloth_scan_add.comp"}}, error);
        if (grid_ == 0U || scan_ == 0U || scanAdd_ == 0U) {
            return false;
        }
        gl_.GenQueries(static_cast<GLsizei>(elapsedQueries_.size()), elapsedQueries_.data());
        gl_.GenQueries(2, timestampQueries_.data());
        return gl_.GetError() == GL_NO_ERROR;
    }

    bool reset(const Settings& settings, std::string& error) {
        if (!validSettings(settings, error)) {
            return false;
        }
        try {
            const auto bytes = plannedMemoryBytes(settings);
            const auto hostBytes = plannedHostMemoryBytes(settings);
            std::uint64_t previousBytes = 0ULL;
            if (state_) {
                previousBytes = state_->bytes + plannedHostMemoryBytes(state_->settings);
            }
            const auto gridPlan = makeGridPlan(settings);
            GLint groups = 0;
            GLint64 blockLimit = 0;
            GLint bindings = 0;
            gl_.GetIntegeri_v(GL_MAX_COMPUTE_WORK_GROUP_COUNT, 0, &groups);
            gl_.GetInteger64v(GL_MAX_SHADER_STORAGE_BLOCK_SIZE, &blockLimit);
            gl_.GetIntegerv(GL_MAX_COMPUTE_SHADER_STORAGE_BLOCKS, &bindings);
            const std::uint64_t n = static_cast<std::uint64_t>(settings.side) * settings.side;
            const std::uint64_t maxConstraintBytes = 6ULL * n * sizeof(Constraint);
            if (bytes + hostBytes + previousBytes > settings.memoryBudget || bindings < 8 || maxConstraintBytes > static_cast<std::uint64_t>(blockLimit) || groupCount(gridPlan.cells) > static_cast<GLuint>(groups)) {
                error = "Preset unsupported by the declared RAM/VRAM, SSBO or dispatch budget; last-good scene retained."
                        " Peak planned bytes=" +
                    std::to_string(bytes + hostBytes + previousBytes) + ", budget=" + std::to_string(settings.memoryBudget) + ".";
                return false;
            }
            auto candidate = std::make_unique<ClothBuffers>(gl_);
            candidate->settings = settings;
            candidate->topology = makeTopology(settings);
#if LAB_CHECKPOINT == 3
            // CP3 is an isolated one-edge experiment, not a solved cloth surface yet.
            // Rest lengths already exist. Extend the first edge with a movable endpoint
            // by 0.4m, retaining its original rest length so XPBD has nonzero work to do.
            // Search past a pinned hanging row instead of perturbing an immovable pin.
            for (std::uint32_t edgeId = 0U; edgeId < candidate->topology.constraints.size(); ++edgeId) {
                const Constraint edge = candidate->topology.constraints[edgeId];
                std::uint32_t moved = edge.b;
                std::uint32_t anchor = edge.a;
                if (candidate->topology.positions[moved].w == 0.0F) {
                    moved = edge.a;
                    anchor = edge.b;
                }
                if (candidate->topology.positions[moved].w == 0.0F) {
                    continue;
                }
                const Vec3 direction = normalized(xyz(candidate->topology.positions[moved]) - xyz(candidate->topology.positions[anchor]));
                Vec4& position = candidate->topology.positions[moved];
                position = vector4(xyz(position) + direction * 0.4F, position.w);
                candidate->teachingConstraint = edgeId;
                break;
            }
#endif
            candidate->grid = gridPlan;
            candidate->bytes = bytes;
            const auto& topology = candidate->topology;
            const std::uint64_t vectorBytes = n * sizeof(Vec4);
            std::vector<Vec4> zeros(static_cast<std::size_t>(n));
            const auto normals = meshNormals(topology.positions, topology.side);
            std::array<std::uint32_t, 32> diagnostics{};
            bool success = storageBuffer(gl_, candidate->position, vectorBytes, topology.positions.data(), error) && storageBuffer(gl_, candidate->previous, vectorBytes, topology.positions.data(), error) && storageBuffer(gl_, candidate->velocity, vectorBytes, zeros.data(), error) && storageBuffer(gl_, candidate->normal, vectorBytes, normals.data(), error) && storageBuffer(gl_, candidate->correction, vectorBytes, zeros.data(), error) && storageBuffer(gl_, candidate->backupPosition, vectorBytes, topology.positions.data(), error) && storageBuffer(gl_, candidate->backupVelocity, vectorBytes, zeros.data(), error) && storageBuffer(gl_, candidate->constraint, topology.constraints.size() * sizeof(Constraint), topology.constraints.data(), error) && storageBuffer(gl_, candidate->lambda, topology.constraints.size() * sizeof(float), nullptr, error) && storageBuffer(gl_, candidate->diagnostic, sizeof(diagnostics), diagnostics.data(), error) && storageBuffer(gl_, candidate->counts, 4ULL * gridPlan.cells, nullptr, error) && storageBuffer(gl_, candidate->offsets, 4ULL * gridPlan.cells, nullptr, error) && storageBuffer(gl_, candidate->cursors, 4ULL * gridPlan.cells, nullptr, error) && storageBuffer(gl_, candidate->ids, 4ULL * n, nullptr, error) && storageBuffer(gl_, candidate->vertexCells, 4ULL * n, nullptr, error) && storageBuffer(gl_, candidate->indices, topology.indices.size() * sizeof(std::uint32_t), topology.indices.data(), error) && candidate->scan.allocate(gridPlan.cells, candidate->offsets, error);
            if (!success) {
                return false;
            }
            if (fence_ != nullptr) {
                gl_.DeleteSync(fence_);
                fence_ = nullptr;
            }
            state_ = std::move(candidate);
            acceptedSteps_ = 0U;
            stats_ = {};
            queryStages_.clear();
            stats_.pinned = state_->topology.pinned;
            stats_.dynamic = static_cast<std::uint32_t>(n) - stats_.pinned;
            stats_.normals = static_cast<std::uint32_t>(n);
            stepSettings_ = settings;
            return true;
        } catch (const std::exception& exception) {
            error = exception.what();
            return false;
        }
    }

    bool poll(std::string& error) {
        if (fence_ == nullptr) {
            return true;
        }
        const GLenum result = gl_.ClientWaitSync(fence_, 0U, 0ULL);
        if (result == GL_WAIT_FAILED) {
            error = "GPU step fence failed.";
            return false;
        }
        if (result != GL_ALREADY_SIGNALED && result != GL_CONDITION_SATISFIED) {
            if (std::chrono::steady_clock::now() - submittedAt_ > std::chrono::seconds(5)) {
                error = "GPU cloth step exceeded the five-second bounded-job deadline; stop submission and inspect the workload.";
                return false;
            }
            return true;
        }
        gl_.DeleteSync(fence_);
        fence_ = nullptr;
        std::array<std::uint32_t, 32> values{};
        gl_.BindBuffer(GL_SHADER_STORAGE_BUFFER, state_->diagnostic);
        gl_.GetBufferSubData(GL_SHADER_STORAGE_BUFFER, 0, sizeof(values), values.data());
        Stats next{};
        next.updated = values[0];
        next.dynamic = values[0];
        next.pinned = values[1];
        next.normals = values[2];
        next.selfContacts = values[3];
        next.analyticContacts = values[21];
        next.contacts = next.selfContacts + next.analyticContacts;
        next.candidates = values[4] | (static_cast<std::uint64_t>(values[5]) << 32U);
        next.maxStrain = std::bit_cast<float>(values[6]);
        next.maxStretch = std::bit_cast<float>(values[22]);
        next.maxResidual = std::bit_cast<float>(values[7]);
        next.maxPenetration = std::bit_cast<float>(values[8]);
        next.invalid = values[9];
        next.overflow = values[10];
        if ((next.overflow & 4U) != 0U) {
            next.contacts = 0U;
        }
        next.occupiedCells = values[11];
        next.countedVertices = values[12];
        next.constraints = values[13];
        next.maxOccupancy = values[19];
        next.maxSelfPenetration = std::bit_cast<float>(values[20]);
        std::array<double, 7> stageMs{};
        for (std::size_t index = 0U; index < queryStages_.size(); ++index) {
            GLuint64 nanoseconds = 0ULL;
            gl_.GetQueryObjectui64v(elapsedQueries_[index], GL_QUERY_RESULT, &nanoseconds);
            stageMs[queryStages_[index]] += static_cast<double>(nanoseconds) / 1000000.0;
        }
        next.predictionMs = stageMs[0];
        next.solverMs = stageMs[1];
        next.gridMs = stageMs[2];
        next.contactMs = stageMs[3];
        next.velocityMs = stageMs[4];
        next.normalsMs = stageMs[5];
        next.diagnosticsMs = stageMs[6];
        GLuint64 first = 0ULL;
        GLuint64 last = 0ULL;
        gl_.GetQueryObjectui64v(timestampQueries_[0], GL_QUERY_RESULT, &first);
        gl_.GetQueryObjectui64v(timestampQueries_[1], GL_QUERY_RESULT, &last);
        next.totalMs = static_cast<double>(last - first) / 1000000.0;
        if (next.overflow == 0U) {
            ++acceptedSteps_;
        } else {
            next.updated = 0U;
            next.dynamic = stats_.dynamic;
            next.pinned = stats_.pinned;
            error = "GPU step refused and rolled back: candidate budget, diagnostic counter overflow or non-finite state. No contacts were truncated.";
        }
        next.steps = acceptedSteps_;
        stats_ = next;
        return next.overflow == 0U;
    }

    bool step(const Settings& settings, const Input& input, std::string& error) {
        if (!state_ || !validSettings(settings, error)) {
            if (error.empty()) {
                error = "Cloth state has not been allocated.";
            }
            return false;
        }
        if (!poll(error)) {
            return false;
        }
        if (fence_ != nullptr) {
            return true;
        }
        if (settings.side != state_->settings.side || settings.extent != state_->settings.extent || settings.preset != state_->settings.preset || settings.thickness != state_->settings.thickness) {
            error = "Topology, thickness or preset changed; call transactional reset before stepping.";
            return false;
        }
        if (!finite(input.dragTarget) || input.pinAction < -1 || input.pinAction > 1 || settings.candidateBudget == 0ULL || settings.candidateBudget > 1000000000ULL) {
            error = "Input or candidate budget is invalid.";
            return false;
        }
        stepSettings_ = settings;
        input_ = input;
        queryStages_.clear();
        gl_.QueryCounter(timestampQueries_[0], GL_TIMESTAMP);
        const auto n = static_cast<std::uint32_t>(state_->topology.positions.size());
        const auto edgeCount = static_cast<std::uint32_t>(state_->topology.constraints.size());
        copyBuffer(state_->position, state_->backupPosition, 16ULL * n);
        copyBuffer(state_->velocity, state_->backupVelocity, 16ULL * n);
        std::array<std::uint32_t, 32> diagnostics{};
        gl_.BindBuffer(GL_SHADER_STORAGE_BUFFER, state_->diagnostic);
        gl_.BufferSubData(GL_SHADER_STORAGE_BUFFER, 0, sizeof(diagnostics), diagnostics.data());
        gl_.MemoryBarrier(GL_BUFFER_UPDATE_BARRIER_BIT | GL_SHADER_STORAGE_BARRIER_BIT);
        solverUniforms(settings, input);
        for (std::uint32_t substep = 0U; substep < settings.substeps; ++substep) {
            beginStage(0U);
            dispatchSolver(10U, 1U);
            dispatchSolver(1U, n);
            dispatchSolver(0U, edgeCount);
            endStage();
            for (std::uint32_t iteration = 0U; iteration < settings.iterations; ++iteration) {
                beginStage(1U);
#if LAB_CHECKPOINT >= 5
                for (std::uint32_t color = 0U; color < 12U; ++color) {
                    solverBindings();
                    const auto first = state_->topology.colorOffsets[color];
                    const auto count = state_->topology.colorOffsets[color + 1U] - first;
                    uintUniform(solver_, "uOffset", first);
                    uintUniform(solver_, "uRange", count);
                    dispatchSolver(2U, count);
                }
#else
                solverBindings();
#if LAB_CHECKPOINT == 3
                uintUniform(solver_, "uOffset", state_->teachingConstraint);
#else
                uintUniform(solver_, "uOffset", 0U);
#endif
                uintUniform(solver_, "uRange", 1U);
                dispatchSolver(2U, 1U);
#endif
                dispatchSolver(3U, n);
                endStage();
#if LAB_CHECKPOINT >= 8
                beginStage(2U);
                dispatchGrid(0U, state_->grid.cells);
                dispatchGrid(1U, n);
#if LAB_CHECKPOINT >= 9
                state_->scan.run(state_->counts, scan_, scanAdd_);
                dispatchGrid(2U, state_->grid.cells);
                dispatchGrid(3U, n);
                dispatchGrid(4U, state_->grid.cells);
#endif
                endStage();
#if LAB_CHECKPOINT >= 10
                beginStage(3U);
                dispatchGrid(5U, n);
                dispatchSolver(4U, n);
                endStage();
#endif
#endif
            }
            beginStage(4U);
            dispatchSolver(5U, n);
            endStage();
        }
        beginStage(5U);
        dispatchSolver(6U, n);
        endStage();
        beginStage(6U);
        dispatchSolver(7U, edgeCount);
        dispatchSolver(8U, n);
        solverBindings();
        gl_.BindBufferBase(GL_SHADER_STORAGE_BUFFER, 1U, state_->backupPosition);
        gl_.BindBufferBase(GL_SHADER_STORAGE_BUFFER, 5U, state_->backupVelocity);
        uintUniform(solver_, "uPhase", 9U);
        gl_.DispatchCompute(groupCount(n), 1U, 1U);
        gl_.MemoryBarrier(GL_SHADER_STORAGE_BARRIER_BIT);
        endStage();
        // Recompute normals after rollback too: a refused step never publishes a mismatched surface.
        beginStage(5U);
        dispatchSolver(6U, n);
        endStage();
        gl_.MemoryBarrier(GL_SHADER_STORAGE_BARRIER_BIT | GL_VERTEX_ATTRIB_ARRAY_BARRIER_BIT | GL_ELEMENT_ARRAY_BARRIER_BIT | GL_BUFFER_UPDATE_BARRIER_BIT);
        gl_.QueryCounter(timestampQueries_[1], GL_TIMESTAMP);
        fence_ = gl_.FenceSync(GL_SYNC_GPU_COMMANDS_COMPLETE, 0U);
        submittedAt_ = std::chrono::steady_clock::now();
        gl_.Flush();
        if (gl_.GetError() != GL_NO_ERROR || fence_ == nullptr) {
            error = "OpenGL error while dispatching the bounded cloth step.";
            return false;
        }
        return true;
    }

    bool busy() const {
        return fence_ != nullptr;
    }

    GLuint positionBuffer() const {
        return state_->position;
    }

    GLuint normalBuffer() const {
        return state_->normal;
    }

    GLuint indexBuffer() const {
        return state_->indices;
    }

    GLuint countsBuffer() const {
        return state_->counts;
    }

    GLuint offsetsBuffer() const {
        return state_->offsets;
    }

    GLuint idsBuffer() const {
        return state_->ids;
    }

    GLuint vertexCellsBuffer() const {
        return state_->vertexCells;
    }

    float thickness() const {
        return state_->settings.thickness;
    }

    const Topology& topology() const {
        return state_->topology;
    }

    const GridPlan& gridPlan() const {
        return state_->grid;
    }

    const Stats& stats() const {
        return stats_;
    }

    std::uint64_t memoryBytes() const {
        return state_->bytes;
    }

    std::uint64_t hostMemoryBytes() const {
        return plannedHostMemoryBytes(state_->settings);
    }

    bool snapshotSmall(SmallSnapshot& output, std::string& error, std::size_t limit = 4096U) {
        if (busy() || !state_ || state_->topology.positions.size() > limit || state_->grid.cells > 100000U) {
            error = "Full snapshots are restricted to a completed small verification fixture.";
            return false;
        }
        const auto n = state_->topology.positions.size();
        readBuffer(state_->position, output.positions, n);
        readBuffer(state_->velocity, output.velocities, n);
        readBuffer(state_->normal, output.normals, n);
        readBuffer(state_->counts, output.counts, state_->grid.cells);
        readBuffer(state_->offsets, output.offsets, state_->grid.cells);
        readBuffer(state_->ids, output.ids, n);
        readBuffer(state_->vertexCells, output.vertexCells, n);
        return gl_.GetError() == GL_NO_ERROR;
    }
};

} // namespace cloth
