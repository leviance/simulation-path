#pragma once
#include "fluid/reference.hpp"
#include "gpu/engine.hpp"
#include <iostream>
#include <numeric>

namespace water51 {
inline void waitFinite(Gl& gl) {
    gl.MemoryBarrier(GL_BUFFER_UPDATE_BARRIER_BIT | GL_SHADER_STORAGE_BARRIER_BIT);
    GLsync fence = gl.FenceSync(GL_SYNC_GPU_COMMANDS_COMPLETE, 0);
    gl.Flush();
    const auto start = std::chrono::steady_clock::now();
    try {
        while (true) {
            const auto result = gl.ClientWaitSync(fence, 0, 0);
            if (result == GL_ALREADY_SIGNALED || result == GL_CONDITION_SATISFIED)
                break;
            if (result == GL_WAIT_FAILED)
                fatalGpu("Verification fence failed");
            if (std::chrono::steady_clock::now() - start > std::chrono::seconds(5))
                fatalGpu("Verification dispatch exceeded five seconds");
            SDL_PumpEvents();
            SDL_Delay(1);
        }
    } catch (...) {
        gl.DeleteSync(fence);
        throw;
    }
    gl.DeleteSync(fence);
}
#if LAB_CHECKPOINT >= 2
inline void completeReferenceBatch(Engine& engine) {
    while (engine.pending()) {
        engine.poll();
        SDL_Delay(1);
    }
}

inline void verifyResetReuse(Gl& gl, const std::filesystem::path& root) {
    Engine engine(gl, root, makeModel(8));
    completeReferenceBatch(engine);
    Storage* original = &engine.storage();
    std::array<GLuint, 3> ids{};
    for (int bank = 0; bank < 3; ++bank)
        ids[bank] = engine.storage().banks[bank].position.id();
    engine.submit(1);
    completeReferenceBatch(engine);
    const int previousBank = engine.bank();
    engine.reset(makeModel(8, Preset::Pool));
    completeReferenceBatch(engine);
    if (&engine.storage() != original || engine.bank() == previousBank || engine.ticks != 0 || engine.modelTime != 0)
        throw std::runtime_error("Reset did not reuse an idle state bank");
    for (int bank = 0; bank < 3; ++bank)
        if (ids[bank] != engine.storage().banks[bank].position.id())
            throw std::runtime_error("Same-size reset unexpectedly reallocated buffers");
    Float4 first;
    engine.storage().banks[engine.bank()].position.read(&first, sizeof(first));
    if (std::abs(first.x - seedPoint(engine.model(), 0).x) > 1e-6)
        throw std::runtime_error("Reset committed the wrong seed bank");
    std::cout << "RESET REUSE PASS: allocation preserved, idle bank initialized, clock cleared\n";
}

// [snippet independent-oracle]
inline void verifyGpu(Gl& gl, const std::filesystem::path& root) {
    Passes passes(gl, root);
    Capabilities limits(gl);
    for (int fixture = 0; fixture < 6; ++fixture) {
        std::uint32_t count = 512;
        if (fixture == 0)
            count = 2;
        if (fixture == 1)
            count = 64;
        if (fixture == 2)
            count = 257;
        if (fixture == 5)
            count = 257;
        Preset preset = Preset::Dam;
        if (fixture == 4)
            preset = Preset::Obstacle;
        int side = 8;
        if (fixture == 5)
            side = 100;
        auto model = makeModel(side, preset, count);
        limits.validateModel(model);
        Storage storage(gl, model);
        std::vector<Float4> positions(count), velocities(count);
        auto cpu = makeReference(model);
        Body body;
        body.enabled = preset == Preset::Obstacle;
        if (body.enabled)
            body.velocity = {.35, 0, 0};
        Parameters parameters;
        for (std::uint32_t i = 0; i < count; ++i) {
            Vec3 point = seedPoint(model, i);
            if (fixture == 3) {
                point = add(scale(point, .90), {.15, .03, .03});
            }
            if (fixture == 4) {
                point = add(point, {.50, .03, 0});
            }
            positions[i] = {static_cast<float>(point.x), static_cast<float>(point.y), static_cast<float>(point.z), 1};
            velocities[i] = {static_cast<float>(.05 * std::sin(i)), static_cast<float>(.03 * std::cos(i)), 0, 0};
            cpu.position[i] = {positions[i].x, positions[i].y, positions[i].z};
            cpu.velocity[i] = {velocities[i].x, velocities[i].y, velocities[i].z};
        }
        referenceFields(model, parameters, body, cpu);
        storage.banks[0].position.write(positions.data(), positions.size() * sizeof(Float4));
        storage.banks[0].velocity.write(velocities.data(), velocities.size() * sizeof(Float4));
        GpuMeta initial;
        if (body.enabled)
            initial.body.w = static_cast<float>(body.radius);
        initial.bodyVelocity = {static_cast<float>(body.velocity.x), static_cast<float>(body.velocity.y), static_cast<float>(body.velocity.z), 0};
        storage.meta.write(&initial, sizeof(initial));
        passes.grid(storage, 0, parameters);
        passes.density(storage, 0, parameters, true);
        passes.force(storage, 0, parameters, true);
        passes.extrema(storage, 0, parameters);
        waitFinite(gl);
        GpuMeta meta;
        storage.meta.read(&meta, sizeof(meta));
        if (meta.flags)
            throw std::runtime_error("Oracle grid flags=" + std::to_string(meta.flags));
        std::vector<DensityPressure> fields(count);
        std::vector<Float4> accelerations(count);
        storage.banks[0].field.read(fields.data(), fields.size() * sizeof(DensityPressure));
        storage.acceleration.read(accelerations.data(), accelerations.size() * sizeof(Float4));
        double rhoError = 0, pressureError = 0, forceError = 0;
        for (std::uint32_t i = 0; i < count; ++i) {
            rhoError = std::max(rhoError, std::abs(fields[i].density - cpu.density[i]));
            pressureError = std::max(pressureError, std::abs(fields[i].pressure - cpu.pressure[i]));
            const Vec3 actualAcceleration{accelerations[i].x, accelerations[i].y, accelerations[i].z};
            for (int axis = 0; axis < 3; ++axis)
                forceError = std::max(forceError, std::abs(actualAcceleration[axis] - cpu.acceleration[i][axis]) / (1 + std::abs(cpu.acceleration[i][axis])));
        }
        if (rhoError > .05 || pressureError > 25 || forceError > .003)
            throw std::runtime_error("CPU/GPU oracle mismatch: rho=" + std::to_string(rhoError) + " p=" + std::to_string(pressureError) + " force=" + std::to_string(forceError));
        passes.density(storage, 0, parameters, false);
        passes.force(storage, 0, parameters, false);
        waitFinite(gl);
        std::vector<DensityPressure> pairs(count);
        std::vector<Float4> pairForces(count);
        storage.banks[0].field.read(pairs.data(), pairs.size() * sizeof(DensityPressure));
        storage.acceleration.read(pairForces.data(), pairForces.size() * sizeof(Float4));
        for (std::uint32_t i = 0; i < count; ++i) {
            if (std::abs(pairs[i].density - fields[i].density) > .05 || length(subtract({pairForces[i].x, pairForces[i].y, pairForces[i].z}, {accelerations[i].x, accelerations[i].y, accelerations[i].z})) > .2)
                throw std::runtime_error("GPU CSR differs from GPU all-pairs");
        }
        const double dt = referenceTimestep(model, parameters, cpu);
        if (std::abs(meta.dt - dt) > 1e-7)
            throw std::runtime_error("Adaptive dt differs from CPU reduction");
        std::vector<std::uint32_t> offsets(model.cellCount + 1), ids(count);
        storage.offsets.read(offsets.data(), offsets.size() * sizeof(std::uint32_t));
        storage.indices.read(ids.data(), ids.size() * sizeof(std::uint32_t));
        if (offsets.front() != 0 || offsets.back() != count || !std::is_sorted(offsets.begin(), offsets.end()))
            throw std::runtime_error("Invalid CSR offsets");
        // A permutation alone is insufficient: each ID must also belong to its recorded cell.
        for (std::uint32_t cell = 0; cell < model.cellCount; ++cell) {
            for (auto slot = offsets[cell]; slot < offsets[cell + 1]; ++slot) {
                const auto id = ids[slot];
                if (id >= count)
                    throw std::runtime_error("CSR contains an out-of-range ID");
                const Vec3 point{positions[id].x, positions[id].y, positions[id].z};
                std::array<int, 3> coordinate{};
                for (int axis = 0; axis < 3; ++axis)
                    coordinate[axis] = std::clamp(static_cast<int>(std::floor(point[axis] / (2 * model.h))), 0, model.cells[axis] - 1);
                const auto expected = static_cast<std::uint32_t>(coordinate[0] + model.cells[0] * (coordinate[1] + model.cells[1] * coordinate[2]));
                if (expected != cell)
                    throw std::runtime_error("CSR ID belongs to another cell");
            }
        }
        std::sort(ids.begin(), ids.end());
        for (std::uint32_t i = 0; i < count; ++i)
            if (ids[i] != i)
                throw std::runtime_error("CSR is not a permutation");
        passes.integrate(storage, 0, 1);
        waitFinite(gl);
        storage.meta.read(&meta, sizeof(meta));
        if (meta.flags || meta.updated != count)
            throw std::runtime_error("Incomplete oracle integration");
        Body endBody = body;
        endBody.position = add(body.position, scale(body.velocity, dt));
        referenceIntegrate(model, endBody, cpu, dt);
        storage.banks[1].position.read(positions.data(), positions.size() * sizeof(Float4));
        storage.banks[1].velocity.read(velocities.data(), velocities.size() * sizeof(Float4));
        double positionError = 0, velocityError = 0;
        for (std::uint32_t i = 0; i < count; ++i) {
            positionError = std::max(positionError, length(subtract({positions[i].x, positions[i].y, positions[i].z}, cpu.position[i])));
            velocityError = std::max(velocityError, length(subtract({velocities[i].x, velocities[i].y, velocities[i].z}, cpu.velocity[i])));
        }
        if (positionError > 2e-5 || velocityError > .002)
            throw std::runtime_error("Integration differs from independent CPU oracle");
        std::cout << "ORACLE PASS fixture=" << fixture << " N=" << count << " rhoAbs=" << rhoError << " pressureAbs=" << pressureError << " forceScaled=" << forceError << " position=" << positionError << " velocity=" << velocityError << '\n';
    }
    verifyResetReuse(gl, root);
}

// [/snippet independent-oracle]
#endif
} // namespace water51
