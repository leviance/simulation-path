#pragma once
#include "cloth_gpu.hpp"

#include <functional>
#include <sstream>

namespace cloth {

using CancelCheck = std::function<bool()>;

inline bool verificationFence(GlApi& gl, std::chrono::steady_clock::time_point deadline,
    const CancelCheck& canceled, std::string& error) {
    GLsync fence = gl.FenceSync(GL_SYNC_GPU_COMMANDS_COMPLETE, 0U);
    gl.Flush();
    bool done = false;
    while (std::chrono::steady_clock::now() < deadline) {
        if (canceled && canceled()) {
            error = "Verification canceled between bounded GPU fixtures.";
            break;
        }
        const GLenum result = gl.ClientWaitSync(fence, 0U, 0ULL);
        if (result == GL_ALREADY_SIGNALED || result == GL_CONDITION_SATISFIED) {
            done = true;
            break;
        }
        if (result == GL_WAIT_FAILED) {
            error = "Verification GPU fence failed.";
            break;
        }
        SDL_Delay(1U);
    }
    gl.DeleteSync(fence);
    if (!done && error.empty()) {
        error = "Verification reached its finite wall-clock deadline.";
    }
    return done;
}

struct FixtureStorage {
    GlApi& gl;
    std::vector<GLuint> buffers{};
    std::vector<GLuint> programs{};
    explicit FixtureStorage(GlApi& api) : gl(api) {}
    ~FixtureStorage() {
        if (!buffers.empty()) {
            gl.DeleteBuffers(static_cast<GLsizei>(buffers.size()), buffers.data());
        }
        for (const GLuint program : programs) {
            gl.DeleteProgram(program);
        }
    }
    GLuint makeBuffer(std::uint64_t bytes, const void* data, std::string& error) {
        GLuint name = 0U;
        if (!storageBuffer(gl, name, bytes, data, error)) {
            return 0U;
        }
        buffers.push_back(name);
        return name;
    }
    GLuint makeProgram(const std::filesystem::path& file, std::string& error) {
        GLuint name = buildProgram(gl, {{GL_COMPUTE_SHADER, file}}, error);
        if (name != 0U) {
            programs.push_back(name);
        }
        return name;
    }
};

inline bool closeFloat(float actual, float expected, float tolerance) {
    return std::isfinite(actual) && std::abs(actual - expected) <= tolerance;
}

inline bool verifyDistanceAndAnalyticGpu(GlApi& gl, const std::filesystem::path& directory,
    std::chrono::steady_clock::time_point deadline, const CancelCheck& canceled, std::string& error) {
    FixtureStorage storage(gl);
    const GLuint program = storage.makeProgram(directory / "cloth_solver.comp", error);
    if (program == 0U) {
        return false;
    }
    std::array<Vec4, 8> positions{};
    positions[0] = {0.0F, 3.0F, 0.0F, 0.0F};
    positions[1] = {2.0F, 3.0F, 0.0F, 2.0F};
    const Constraint edge{0U, 1U, 1.0F, 0.0F};
    const std::array<std::uint32_t, 32> zeros{};
    const float lambda = 0.0F;
    std::array<GLuint, 8> names{
        storage.makeBuffer(sizeof(positions), positions.data(), error),
        storage.makeBuffer(sizeof(positions), positions.data(), error),
        storage.makeBuffer(sizeof(positions), positions.data(), error),
        storage.makeBuffer(sizeof(positions), positions.data(), error),
        storage.makeBuffer(sizeof(edge), &edge, error),
        storage.makeBuffer(sizeof(positions), positions.data(), error),
        storage.makeBuffer(sizeof(zeros), zeros.data(), error),
        storage.makeBuffer(sizeof(lambda), &lambda, error)};
    if (std::find(names.begin(), names.end(), 0U) != names.end()) {
        return false;
    }
    gl.UseProgram(program);
    for (GLuint binding = 0U; binding < names.size(); ++binding) {
        gl.BindBufferBase(GL_SHADER_STORAGE_BUFFER, binding, names[binding]);
    }
    auto integer = [&](const char* name, std::uint32_t value) {
        gl.Uniform1ui(gl.GetUniformLocation(program, name), value);
    };
    auto scalar = [&](const char* name, float value) {
        gl.Uniform1f(gl.GetUniformLocation(program, name), value);
    };
    integer("uPhase", 2U);
    integer("uCount", 8U);
    integer("uSide", 4U);
    integer("uOffset", 0U);
    integer("uRange", 1U);
    integer("uEdgeCount", 1U);
    scalar("uH", 0.1F);
    scalar("uCompliance", 0.01F);
    gl.DispatchCompute(1U, 1U, 1U);
    gl.MemoryBarrier(GL_SHADER_STORAGE_BARRIER_BIT | GL_BUFFER_UPDATE_BARRIER_BIT);
    if (!verificationFence(gl, deadline, canceled, error)) {
        return false;
    }
    gl.BindBuffer(GL_SHADER_STORAGE_BUFFER, names[0]);
    gl.GetBufferSubData(GL_SHADER_STORAGE_BUFFER, 0, sizeof(positions), positions.data());
    if (!closeFloat(positions[0].x, 0.0F, 1.0e-6F) || !closeFloat(positions[1].x, 4.0F / 3.0F, 2.0e-6F)) {
        error = "GPU one-constraint answer differs from the independent alpha=1, denominator=3 fixture.";
        return false;
    }
    positions[0] = {0.0F, 3.0F, 0.0F, 1.0F};
    positions[1] = positions[0];
    gl.BindBuffer(GL_SHADER_STORAGE_BUFFER, names[0]);
    gl.BufferSubData(GL_SHADER_STORAGE_BUFFER, 0, sizeof(positions), positions.data());
    gl.BindBuffer(GL_SHADER_STORAGE_BUFFER, names[7]);
    gl.BufferSubData(GL_SHADER_STORAGE_BUFFER, 0, sizeof(lambda), &lambda);
    gl.DispatchCompute(1U, 1U, 1U);
    gl.MemoryBarrier(GL_SHADER_STORAGE_BARRIER_BIT | GL_BUFFER_UPDATE_BARRIER_BIT);
    if (!verificationFence(gl, deadline, canceled, error)) {
        return false;
    }
    gl.BindBuffer(GL_SHADER_STORAGE_BUFFER, names[0]);
    gl.GetBufferSubData(GL_SHADER_STORAGE_BUFFER, 0, sizeof(positions), positions.data());
    if (!finite(xyz(positions[0])) || !finite(xyz(positions[1]))
        || length(xyz(positions[0]) - xyz(positions[1])) != 0.0F) {
        error = "GPU zero-distance gradient handling produced an invalid correction.";
        return false;
    }
    const std::array<Vec3, 6> axes{{{1, 0, 0}, {-1, 0, 0}, {0, 1, 0}, {0, -1, 0}, {0, 0, 1}, {0, 0, -1}}};
    for (std::size_t index = 0U; index < axes.size(); ++index) {
        positions[index] = vector4(Vec3{0.0F, 3.0F, 0.0F} + axes[index], 1.0F);
    }
    positions[6] = {4.0F, -1.0F, 4.0F, 1.0F};
    positions[7] = {3.0F, 1.25F, 0.0F, 1.0F};
    gl.BindBuffer(GL_SHADER_STORAGE_BUFFER, names[0]);
    gl.BufferSubData(GL_SHADER_STORAGE_BUFFER, 0, sizeof(positions), positions.data());
    integer("uPhase", 3U);
    integer("uDragId", noVertex);
    scalar("uThickness", 0.1F);
    scalar("uFloor", 0.0F);
    gl.Uniform3f(gl.GetUniformLocation(program, "uSphere"), 0.0F, 3.0F, 0.0F);
    scalar("uSphereRadius", 1.0F);
    gl.Uniform3f(gl.GetUniformLocation(program, "uCapsuleA"), 2.0F, 1.0F, 0.0F);
    gl.Uniform3f(gl.GetUniformLocation(program, "uCapsuleB"), 4.0F, 1.0F, 0.0F);
    scalar("uCapsuleRadius", 0.5F);
    gl.DispatchCompute(1U, 1U, 1U);
    gl.MemoryBarrier(GL_SHADER_STORAGE_BARRIER_BIT | GL_BUFFER_UPDATE_BARRIER_BIT);
    if (!verificationFence(gl, deadline, canceled, error)) {
        return false;
    }
    gl.BindBuffer(GL_SHADER_STORAGE_BUFFER, names[0]);
    gl.GetBufferSubData(GL_SHADER_STORAGE_BUFFER, 0, sizeof(positions), positions.data());
    for (std::size_t index = 0U; index < axes.size(); ++index) {
        const auto expected = Vec3{0.0F, 3.0F, 0.0F} + axes[index] * 1.1F;
        if (length(xyz(positions[index]) - expected) > 2.0e-6F) {
            error = "GPU sphere projection failed an independent signed-axis contact fixture.";
            return false;
        }
    }
    if (!closeFloat(positions[6].y, 0.1F, 1.0e-6F) || !closeFloat(positions[7].y, 1.6F, 2.0e-6F)) {
        error = "GPU plane/capsule penetration projection disagrees with the independent geometry fixture.";
        return false;
    }
    return true;
}

inline bool verifyScanGpu(GlApi& gl, const std::filesystem::path& directory,
    std::chrono::steady_clock::time_point deadline, const CancelCheck& canceled, std::string& error) {
    FixtureStorage storage(gl);
    const GLuint scanProgram = storage.makeProgram(directory / "cloth_scan.comp", error);
    const GLuint addProgram = storage.makeProgram(directory / "cloth_scan_add.comp", error);
    if (scanProgram == 0U || addProgram == 0U) {
        return false;
    }
    for (const std::uint32_t count : {0U, 1U, 3U, 257U, 65537U}) {
        std::vector<std::uint32_t> input(std::max(1U, count));
        for (std::uint32_t index = 0U; index < count; ++index) {
            input[index] = index % 7U;
        }
        const GLuint source = storage.makeBuffer(4ULL * input.size(), input.data(), error);
        const GLuint target = storage.makeBuffer(4ULL * input.size(), nullptr, error);
        GpuScan scan(gl);
        if (source == 0U || target == 0U || !scan.allocate(count, target, error)) {
            return false;
        }
        scan.run(source, scanProgram, addProgram);
        if (!verificationFence(gl, deadline, canceled, error)) {
            return false;
        }
        std::vector<std::uint32_t> output(input.size());
        gl.BindBuffer(GL_SHADER_STORAGE_BUFFER, target);
        gl.GetBufferSubData(GL_SHADER_STORAGE_BUFFER, 0, static_cast<GLsizeiptr>(4ULL * output.size()), output.data());
        std::uint32_t running = 0U;
        for (std::uint32_t index = 0U; index < count; ++index) {
            if (output[index] != running) {
                error = "GPU exclusive integer scan mismatch at N=" + std::to_string(count) + ".";
                return false;
            }
            running += input[index];
        }
    }
    return true;
}

inline bool verifyGridContactGpu(GlApi& gl, const std::filesystem::path& directory,
    std::chrono::steady_clock::time_point deadline, const CancelCheck& canceled, std::string& error) {
    FixtureStorage storage(gl);
    const GLuint program = storage.makeProgram(directory / "cloth_grid.comp", error);
    const GLuint scanProgram = storage.makeProgram(directory / "cloth_scan.comp", error);
    const GLuint addProgram = storage.makeProgram(directory / "cloth_scan_add.comp", error);
    if (program == 0U || scanProgram == 0U || addProgram == 0U) {
        return false;
    }
    Settings settings{};
    settings.side = 5U;
    settings.extent = 1.0F;
    settings.thickness = 0.04F;
    const GridPlan plan = makeGridPlan(settings);
    std::vector<Vec4> positions(25U);
    for (std::uint32_t id = 0U; id < positions.size(); ++id) {
        positions[id] = {-4.0F + static_cast<float>(id % 5U), 4.0F, -4.0F + static_cast<float>(id / 5U), 1.0F};
    }
    positions[0] = {0.0F, 4.0F, 0.0F, 1.0F};
    positions[24] = {0.0F, 4.0F, 0.0F, 1.0F};
    positions[1] = {0.01F, 4.0F, 0.0F, 1.0F};
    positions[23] = {0.08F, 4.0F, 0.0F, 1.0F};
    const auto cpu = buildCpuGrid(positions, plan);
    const std::array<std::uint32_t, 32> zeros{};
    std::array<GLuint, 8> names{
        storage.makeBuffer(16ULL * positions.size(), positions.data(), error),
        storage.makeBuffer(4ULL * plan.cells, nullptr, error),
        storage.makeBuffer(4ULL * plan.cells, nullptr, error),
        storage.makeBuffer(4ULL * plan.cells, nullptr, error),
        storage.makeBuffer(4ULL * positions.size(), nullptr, error),
        storage.makeBuffer(4ULL * positions.size(), nullptr, error),
        storage.makeBuffer(sizeof(zeros), zeros.data(), error),
        storage.makeBuffer(16ULL * positions.size(), nullptr, error)};
    if (std::find(names.begin(), names.end(), 0U) != names.end()) {
        return false;
    }
    auto integer = [&](const char* name, std::uint32_t value) {
        gl.Uniform1ui(gl.GetUniformLocation(program, name), value);
    };
    auto dispatch = [&](std::uint32_t phase, std::uint32_t count) {
        gl.UseProgram(program);
        for (GLuint binding = 0U; binding < names.size(); ++binding) {
            gl.BindBufferBase(GL_SHADER_STORAGE_BUFFER, binding, names[binding]);
        }
        integer("uPhase", phase);
        integer("uCount", 25U);
        integer("uSide", 5U);
        integer("uCells", plan.cells);
        integer("uCandidateBudget", 10000U);
        gl.Uniform3ui(gl.GetUniformLocation(program, "uDimensions"), plan.nx, plan.ny, plan.nz);
        gl.Uniform1f(gl.GetUniformLocation(program, "uCellSize"), plan.cellSize);
        gl.Uniform1f(gl.GetUniformLocation(program, "uThickness"), settings.thickness);
        gl.DispatchCompute(groupCount(count), 1U, 1U);
        gl.MemoryBarrier(GL_SHADER_STORAGE_BARRIER_BIT);
    };
    GpuScan scan(gl);
    if (!scan.allocate(plan.cells, names[2], error)) {
        return false;
    }
    dispatch(0U, plan.cells);
    dispatch(1U, 25U);
    scan.run(names[1], scanProgram, addProgram);
    dispatch(2U, plan.cells);
    dispatch(3U, 25U);
    dispatch(4U, plan.cells);
    if (!verificationFence(gl, deadline, canceled, error)) {
        return false;
    }
    std::vector<std::uint32_t> counts(plan.cells);
    std::vector<std::uint32_t> offsets(plan.cells);
    std::vector<std::uint32_t> ids(25U);
    std::vector<std::uint32_t> membership(25U);
    auto read = [&](GLuint buffer, auto& values) {
        gl.BindBuffer(GL_SHADER_STORAGE_BUFFER, buffer);
        gl.GetBufferSubData(GL_SHADER_STORAGE_BUFFER, 0,
            static_cast<GLsizeiptr>(values.size() * sizeof(values[0])), values.data());
    };
    read(names[1], counts);
    read(names[2], offsets);
    read(names[4], ids);
    read(names[5], membership);
    if (counts != cpu.counts || offsets != cpu.offsets || membership != cpu.vertexCells) {
        error = "GPU 3D cell counts, exact offsets or vertex membership differ from CPU.";
        return false;
    }
    auto permutation = ids;
    std::sort(permutation.begin(), permutation.end());
    for (std::uint32_t id = 0U; id < 25U; ++id) {
        const auto cell = membership[id];
        const auto first = ids.begin() + offsets[cell];
        if (permutation[id] != id || std::find(first, first + counts[cell], id) == first + counts[cell]) {
            error = "GPU CSR lost, duplicated or misclassified a vertex ID.";
            return false;
        }
    }
    gl.UseProgram(program);
    integer("uFixtureRecord", 1U);
    dispatch(5U, 25U);
    if (!verificationFence(gl, deadline, canceled, error)) {
        return false;
    }
    read(names[5], membership);
    std::vector<Vec4> corrections(25U);
    read(names[7], corrections);
    const auto cpuCorrections = selfContactCorrections(positions, cpu, 5U, settings.thickness);
    std::uint64_t candidateCount = 0ULL;
    for (std::uint32_t a = 0U; a < 25U; ++a) {
        std::uint32_t mask = 0U;
        for (std::uint32_t b = 0U; b < 25U; ++b) {
            if (a == b) {
                continue;
            }
            const auto first = cellCoordinate(xyz(positions[a]), plan);
            const auto second = cellCoordinate(xyz(positions[b]), plan);
            if (std::abs(first[0] - second[0]) <= 1 && std::abs(first[1] - second[1]) <= 1
                && std::abs(first[2] - second[2]) <= 1) {
                ++candidateCount;
            }
            if (!topologyNeighbors(a, b, 5U) && length(xyz(positions[a]) - xyz(positions[b])) < 0.08F) {
                mask |= 1U << b;
            }
        }
        if (membership[a] != mask || length(xyz(corrections[a]) - cpuCorrections[a]) > 3.0e-6F) {
            error = "GPU self-contact IDs/corrections differ from brute force (2-ring, coincidence or thickness predicate).";
            return false;
        }
    }
    std::array<std::uint32_t, 32> diagnostic{};
    read(names[6], diagnostic);
    const auto actualCandidates = diagnostic[4] | (static_cast<std::uint64_t>(diagnostic[5]) << 32U);
    if (actualCandidates != candidateCount || diagnostic[12] != 25U) {
        error = "GPU occupancy-derived candidate count or CSR sum is not exact.";
        return false;
    }
    gl.UseProgram(program);
    integer("uCandidateBudget", 1U);
    integer("uPhase", 5U);
    gl.DispatchCompute(1U, 1U, 1U);
    gl.MemoryBarrier(GL_SHADER_STORAGE_BARRIER_BIT);
    if (!verificationFence(gl, deadline, canceled, error)) {
        return false;
    }
    read(names[6], diagnostic);
    read(names[7], corrections);
    bool zero = true;
    for (const auto correction : corrections) {
        zero = zero && length(xyz(correction)) == 0.0F;
    }
    if (diagnostic[10] == 0U || !zero) {
        error = "Unsafe GPU candidate workload was not refused before traversal.";
        return false;
    }
    return true;
}

inline bool runGpuFixtures(GlApi& gl, const std::filesystem::path& directory,
    std::string& report, std::string& error, std::uint32_t timeoutMs = 10000U,
    const CancelCheck& canceled = {}) {
    const auto deadline = std::chrono::steady_clock::now() + std::chrono::milliseconds(timeoutMs);
    if (!verifyDistanceAndAnalyticGpu(gl, directory, deadline, canceled, error)
        || !verifyScanGpu(gl, directory, deadline, canceled, error)
        || !verifyGridContactGpu(gl, directory, deadline, canceled, error)) {
        return false;
    }
    Settings settings{};
    settings.side = 17U;
    settings.wind = 0.75F;
    auto cpu = makeCpuState(settings);
    cpuStep(cpu, settings);
    GpuCloth gpu(gl);
    if (!gpu.initialize(directory, error) || !gpu.reset(settings, error) || !gpu.step(settings, {}, error)) {
        return false;
    }
    while (gpu.busy() && std::chrono::steady_clock::now() < deadline) {
        if (canceled && canceled()) {
            error = "Verification canceled during bounded CPU/GPU comparison.";
            return false;
        }
        if (!gpu.poll(error)) {
            return false;
        }
        SDL_Delay(1U);
    }
    if (gpu.busy()) {
        error = "CPU/GPU fixture reached the finite verification deadline.";
        return false;
    }
    SmallSnapshot snapshot{};
    if (!gpu.snapshotSmall(snapshot, error)) {
        return false;
    }
    float positionError = 0.0F;
    float velocityError = 0.0F;
    float normalError = 0.0F;
    for (std::size_t id = 0U; id < snapshot.positions.size(); ++id) {
        positionError = std::max(positionError, length(xyz(snapshot.positions[id]) - xyz(cpu.positions[id])));
        velocityError = std::max(velocityError, length(xyz(snapshot.velocities[id]) - xyz(cpu.velocities[id])));
        normalError = std::max(normalError, length(xyz(snapshot.normals[id]) - xyz(cpu.normals[id])));
        if (snapshot.positions[id].w != cpu.positions[id].w || !finite(xyz(snapshot.positions[id]))
            || !finite(xyz(snapshot.velocities[id])) || !finite(xyz(snapshot.normals[id]))) {
            error = "GPU small-state fixture has an invalid mass, position, velocity or normal.";
            return false;
        }
    }
    if (positionError > 0.0002F || velocityError > 0.025F || normalError > 0.001F) {
        error = "CPU/GPU small snapshot exceeds absolute tolerances: position=" + std::to_string(positionError)
            + "m, velocity=" + std::to_string(velocityError) + "m/s, normal=" + std::to_string(normalError) + ".";
        return false;
    }
    const auto expectedEdges = cpu.topology.constraints.size() * settings.iterations * settings.substeps;
    if (gpu.stats().updated != 272U || gpu.stats().pinned != 17U || gpu.stats().normals != 289U
        || gpu.stats().constraints != expectedEdges || gpu.stats().countedVertices != 289U) {
        error = "GPU did not process every small-fixture dynamic vertex, constraint, grid member and normal.";
        return false;
    }
    float referenceStretch = 0.0F;
    for (const auto& edge : cpu.topology.constraints) {
        if (edge.kind < 2.0F) {
            const float distance = length(xyz(cpu.positions[edge.a]) - xyz(cpu.positions[edge.b]));
            referenceStretch = std::max(referenceStretch, std::max(0.0F, distance / edge.rest - 1.0F));
        }
    }
    if (!closeFloat(gpu.stats().maxStretch, referenceStretch, 0.0002F)) {
        error = "GPU positive stretch/shear elongation diagnostic differs from the CPU snapshot.";
        return false;
    }
    settings.candidateBudget = 1ULL;
    if (!gpu.reset(settings, error)) {
        return false;
    }
    Input changedPin{};
    changedPin.pinId = 18U;
    changedPin.pinAction = 1;
    if (!gpu.step(settings, changedPin, error)) {
        return false;
    }
    while (gpu.busy() && std::chrono::steady_clock::now() < deadline) {
        if (canceled && canceled()) {
            error = "Verification canceled during the bounded rollback fixture.";
            return false;
        }
        const bool accepted = gpu.poll(error);
        if (!accepted) {
            break;
        }
        SDL_Delay(1U);
    }
    if (gpu.busy() || gpu.stats().overflow == 0U || gpu.stats().steps != 0ULL) {
        error = "Candidate overflow did not refuse the complete high-level cloth step.";
        return false;
    }
    error.clear();
    if (!gpu.snapshotSmall(snapshot, error)) {
        return false;
    }
    for (std::size_t id = 0U; id < snapshot.positions.size(); ++id) {
        const auto original = gpu.topology().positions[id];
        if (snapshot.positions[id].x != original.x || snapshot.positions[id].y != original.y
            || snapshot.positions[id].z != original.z || snapshot.positions[id].w != original.w
            || length(xyz(snapshot.velocities[id])) != 0.0F) {
            error = "Candidate refusal failed to restore positions, inverse masses or velocities exactly.";
            return false;
        }
    }
    const GLuint lastGood = gpu.positionBuffer();
    Settings million = settings;
    million.side = 1001U;
    if (gpu.reset(million, error) || gpu.positionBuffer() != lastGood) {
        error = "Unsupported million-vertex allocation destroyed or replaced the last-good scene.";
        return false;
    }
    error.clear();
    std::ostringstream output{};
    output << "GPU FIXTURES PASS: independent distance/mass/compliance; plane/sphere/capsule; uint scan N=0/1/3/257/65537; "
        << "3D CSR permutation; exact candidate/contact IDs with empty/dense/coincident/boundary/topological cases; "
        << "candidate-budget refusal plus exact position/mass/velocity rollback and safe million preflight; "
        << "same-order CPU/GPU 17x17 position " << positionError << "m, velocity "
        << velocityError << "m/s, normal " << normalError << ".";
    report = output.str();
    return gl.GetError() == GL_NO_ERROR;
}

} // namespace cloth
