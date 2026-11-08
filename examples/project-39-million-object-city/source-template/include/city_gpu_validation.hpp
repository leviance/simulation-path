#pragma once

#include "city_compute.hpp"

#include <iostream>

namespace city {

#if LAB_CHECKPOINT >= 11
inline bool waitCityVerification(GlApi& gl, std::string& error) {
    const GLsync fence = gl.FenceSync(GL_SYNC_GPU_COMMANDS_COMPLETE, 0);
    if (fence == nullptr) {
        error = "Cannot allocate validation fence.";
        return false;
    }
    gl.Flush();
    const Uint64 deadline = SDL_GetTicks() + 5000;
    while (SDL_GetTicks() < deadline) {
        if (fenceReady(gl, fence, error)) {
            gl.DeleteSync(fence);
            return true;
        }
        SDL_Event event{};
        while (SDL_PollEvent(&event)) {
            if (event.type == SDL_EVENT_QUIT || (event.type == SDL_EVENT_KEY_DOWN && event.key.key == SDLK_ESCAPE)) {
                error = "Validation cancelled.";
            }
        }
        if (!error.empty()) {
            gl.DeleteSync(fence);
            return false;
        }
        SDL_Delay(1);
    }
    gl.DeleteSync(fence);
    error = "Validation fence exceeded its five-second deadline.";
    return false;
}

inline Object fixtureObject(std::uint32_t index) {
    Object object{};
    object.centerRadius = {static_cast<float>(static_cast<int>(index % 29U) - 14), static_cast<float>(static_cast<int>(index % 11U) - 5), static_cast<float>(static_cast<int>(index % 31U) - 15), 0.5F};
    object.halfX = object.halfY = object.halfZ = 0.25F;
    object.mesh = index % 3U;
    object.red = 0.5F;
    object.green = 0.6F;
    object.blue = 0.7F;
    object.id = index * 17U + 7U;
    return object;
}

inline Frustum fixtureFrustum(float extent) {
    return {{{1, 0, 0, extent}, {-1, 0, 0, extent}, {0, 1, 0, extent}, {0, -1, 0, extent}, {0, 0, 1, extent}, {0, 0, -1, extent}}};
}

inline bool snapshotMatches(std::span<const Object> objects, const Frustum& planes, Vec3 eye, bool culling, const GpuSnapshot& snapshot, std::string& error) {
    std::vector<Counts> masks(objects.size());
    // Independent scalar double classifier, not the host sphereAccepted helper.
    for (std::size_t index = 0; index < objects.size(); ++index) {
        const Object& object = objects[index];
        bool accepted = true;
        for (const Vec4 plane : planes) {
            const double signedDistance = static_cast<double>(plane.x) * object.centerRadius.x + static_cast<double>(plane.y) * object.centerRadius.y + static_cast<double>(plane.z) * object.centerRadius.z + plane.w;
            if (culling && signedDistance < -static_cast<double>(object.centerRadius.w)) {
                accepted = false;
            }
        }
        if (accepted) {
            masks[index][object.mesh] = 1U;
            masks[index][3] = 1U;
        }
    }
    if (snapshot.masks != masks || snapshot.prefixes != cpuExclusiveScan(masks)) {
        error = "GPU mask/prefix differs from independent double/serial fixture.";
        return false;
    }
    const auto expectedIDs = cpuVisibleIDs(objects, planes, culling);
    if (snapshot.visibleIDs != expectedIDs) {
        error = "Compaction lost, duplicated or reordered a record index.";
        return false;
    }
    const GpuStats expected = cpuStatistics(objects, planes, eye, culling);
    if (snapshot.stats.counts != expected.counts || snapshot.stats.integerStats != expected.integerStats || snapshot.stats.tested != objects.size()) {
        error = "GPU integer sum/min/max/count differs from exact CPU fixture.";
        return false;
    }
    if (!distanceMatches(snapshot.stats.minimumDistance, expected.minimumDistance) || !distanceMatches(snapshot.stats.maximumDistance, expected.maximumDistance)) {
        error = "Distance reduction exceeds 0.002 world units + 2e-5 relative tolerance.";
        return false;
    }
    const auto commands = makeCommands(expected.counts);
    for (std::size_t group = 0; group < commands.size(); ++group) {
        const IndirectCommand& actual = snapshot.commands[group];
        const IndirectCommand& wanted = commands[group];
        if (actual.count != wanted.count || actual.instanceCount != wanted.instanceCount || actual.firstIndex != wanted.firstIndex || actual.baseVertex != 0 || actual.baseInstance != 0) {
            error = "GPU indirect command has an invalid mesh range or instance count.";
            return false;
        }
    }
    return true;
}

inline bool verifyCityGpuFixtures(GlApi& gl, const std::filesystem::path& directory, std::string& error) {
    CityGpu pipeline{};
    if (!pipeline.initialize(gl, directory, error)) {
        return false;
    }
    bool success = true;
    const Uint64 deadline = SDL_GetTicks() + 35000;
    const auto checkDeadline = [&]() {
        if (SDL_GetTicks() >= deadline) {
            error = "Primitive validation exceeded its 35-second batch deadline.";
            return false;
        }
        return true;
    };
    for (const std::size_t count : {std::size_t{0}, std::size_t{1}, std::size_t{7}, std::size_t{257}, std::size_t{513}, std::size_t{262145}}) {
        if (!success || !checkDeadline()) {
            success = false;
            break;
        }
        std::vector<Object> objects(count);
        std::vector<Counts> input(count);
        std::vector<std::uint32_t> integers(count);
        for (std::size_t index = 0; index < count; ++index) {
            objects[index] = fixtureObject(static_cast<std::uint32_t>(index));
            input[index] = {static_cast<std::uint32_t>(index % 3), static_cast<std::uint32_t>((index * 7 + 2) % 5), static_cast<std::uint32_t>(index % 2), 1U};
            integers[index] = static_cast<std::uint32_t>((index * 37 + 11) % 97);
        }
        success = pipeline.rebuild(gl, objects, error);
        success = success && pipeline.dispatchScanFixture(gl, input, error);
        success = success && pipeline.dispatchIntegerFixture(gl, integers, error);
        success = success && waitCityVerification(gl, error);
        if (!success) {
            break;
        }
        const GpuSnapshot snapshot = pipeline.readSnapshot(gl, count);
        const IntegerReduction expected = cpuIntegerReduction(integers);
        if (snapshot.prefixes != cpuExclusiveScan(input) || snapshot.stats.integerStats[0] != expected.sum || snapshot.stats.integerStats[1] != expected.minimum || snapshot.stats.integerStats[2] != expected.maximum || snapshot.stats.integerStats[3] != count || !pipeline.guardRecordsIntact(gl)) {
            error = "GPU primitive mismatch or guard overwritten at N=" + std::to_string(count);
            success = false;
            break;
        }
        std::cout << "PRIMITIVES PASS N=" << count << " sum=" << expected.sum << " min=" << expected.minimum << " max=" << expected.maximum << '\n';
    }

    // A single allocation exercises all-visible -> mixed -> empty without stale counts.
    std::vector<Object> objects(257);
    for (std::size_t index = 0; index < objects.size(); ++index) {
        objects[index] = fixtureObject(static_cast<std::uint32_t>(index));
    }
    // Add inside, outside and intersecting spheres at each of the six planes.
    for (std::size_t plane = 0; plane < 6; ++plane) {
        for (std::size_t state = 0; state < 3; ++state) {
            Object& object = objects[plane * 3 + state];
            object.centerRadius = {0, 0, 0, 0.5F};
            float value = 19.0F;
            if (state == 1) {
                value = 21.0F;
            }
            if (state == 2) {
                value = 20.25F;
            }
            if (plane % 2 == 0) {
                value = -value;
            }
            if (plane / 2 == 0) {
                object.centerRadius.x = value;
            }
            if (plane / 2 == 1) {
                object.centerRadius.y = value;
            }
            if (plane / 2 == 2) {
                object.centerRadius.z = value;
            }
        }
    }
    success = success && pipeline.rebuild(gl, objects, error);
    for (int fixture = 0; fixture < 3 && success; ++fixture) {
        Frustum planes = fixtureFrustum(20.0F);
        bool culling = fixture != 0;
        if (fixture == 2) {
            planes[0].w = -1000.0F;
        }
        pipeline.run(gl, planes, {2, 3, 4}, culling);
        success = waitCityVerification(gl, error);
        if (success) {
            const GpuSnapshot snapshot = pipeline.readSnapshot(gl, objects.size());
            success = snapshotMatches(objects, planes, {2, 3, 4}, culling, snapshot, error) && pipeline.guardRecordsIntact(gl);
            std::cout << "SCENE FIXTURE " << fixture << " accepted=" << snapshot.stats.counts[3] << " tested=" << snapshot.stats.tested << '\n';
        }
    }
    if (success && gl.GetError() != GL_NO_ERROR) {
        error = "OpenGL error during fixture validation.";
        success = false;
    }
    pipeline.destroy(gl);
    return success;
}
#endif

} // namespace city
