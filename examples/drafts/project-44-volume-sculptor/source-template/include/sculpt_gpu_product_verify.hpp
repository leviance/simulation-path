#pragma once

#include "sculpt_controls.hpp"
#include "sculpt_gpu_scene_verify.hpp"
#include "sculpt_mesh_topology.hpp"

namespace sculpt {

inline MeshTopology inspectGpuProduct(const GpuMeshBuilder& model, std::size_t components, std::int64_t euler) {
    std::size_t count = 0;
    for (const auto& chunk : model.active())
        count += chunk.stats.vertices;
    gpuCheck(model.ready() && count <= 1000000, "Product topology readback exceeds its bounded validation-only workload");
    std::vector<SurfaceVertex> triangles;
    triangles.reserve(count);
    for (std::size_t chunk = 0; chunk < model.active().size(); ++chunk) {
        const auto vertices = model.readChunk(chunk);
        triangles.insert(triangles.end(), vertices.begin(), vertices.end());
    }
    const auto result = inspectMeshTopology(triangles);
    gpuCheck(result.closedOriented(), "Brush product has boundary, non-manifold or incorrectly oriented edges");
    gpuCheck(result.components == components && result.eulerCharacteristic() == euler, "Brush product does not have the required connected surface and hole topology");
    gpuCheck(model.guardsIntact(), "A product stroke damaged a field or mesh canary");
    std::cout << "GPU PRODUCT TOPOLOGY samples=" << model.settings().grid.samples << " vertices=" << result.vertices << " edges=" << result.edges << " faces=" << result.faces << " components=" << result.components << " euler=" << result.eulerCharacteristic() << " closedOriented=1\n";
    return result;
}

inline void verifyBrushShortcuts(GpuMeshBuilder& model, GlApi& gl, GpuBudget& budget) {
    SculptControls controls(gl, budget);
    Camera camera;
    const auto generation = model.activeGeneration();
    const auto revision = model.document().revision();
    SDL_Event event{};
    event.type = SDL_EVENT_KEY_DOWN;
    event.key.mod = SDL_KMOD_SHIFT;
    event.key.scancode = SDL_SCANCODE_RIGHTBRACKET;
    event.key.key = '}';
    for (int step = 0; step < 3; ++step)
        controls.event(event, model, camera, 640, 480);
    gpuCheck(std::abs(controls.brush().radius - 0.58F) < 0.000001F, "Shift punctuation or repeated coarse radius input was lost");
    controls.event(event, model, camera, 640, 480);
    gpuCheck(controls.brush().radius == 0.6F, "Coarse radius exceeded its configured bound");
    event.key.scancode = SDL_SCANCODE_EQUALS;
    event.key.key = '+';
    for (int step = 0; step < 3; ++step)
        controls.event(event, model, camera, 640, 480);
    gpuCheck(std::abs(controls.brush().strength - 0.65F) < 0.000001F, "Shift changed the strength key's physical command");
    event.key.scancode = SDL_SCANCODE_PAGEUP;
    event.key.key = SDLK_PAGEUP;
    controls.event(event, model, camera, 640, 480);
    gpuCheck(controls.depth() == 0.25F, "Coarse brush depth step is wrong");
    event.key.repeat = true;
    controls.event(event, model, camera, 640, 480);
    gpuCheck(controls.depth() == 0.25F, "OS key repeat changed an explicit-step brush setting");
    event.key.repeat = false;
    event.key.scancode = SDL_SCANCODE_F2;
    event.key.key = SDLK_F2;
    event.key.mod = SDL_KMOD_CTRL | SDL_KMOD_SHIFT;
    controls.event(event, model, camera, 640, 480);
    gpuCheck(std::abs(controls.brush().radius - 0.5F) < 0.000001F, "Function-key radius decrease was not layout independent");
    event.key.mod = SDL_KMOD_CTRL;
    controls.event(event, model, camera, 640, 480);
    gpuCheck(controls.brush().radius == 0.6F, "Function-key radius increase did not use its coarse step");
    gpuCheck(model.activeGeneration() == generation && model.document().revision() == revision, "Brush parameter input remeshed or edited the field");
    std::cout << "GPU BRUSH CONTROLS PASS shiftedPunctuation=1 repeatedPresses=3 radiusClamp=1 coarseStrength=1 coarseDepth=1 functionKeyAlternative=1 repeatIgnored=1 noRemesh=1\n";
}

inline void verifyGpuProducts(GpuMeshBuilder& sphere, GlApi& gl, GpuBudget& budget) {
    const auto deadline = std::chrono::steady_clock::now() + std::chrono::seconds(30);
    waitForGpuModel(
        sphere, [&] {
            return sphere.ready();
        },
        deadline
    );
    verifyBrushShortcuts(sphere, gl, budget);
    inspectGpuProduct(sphere, 1, 2);

    // A genuine subtract stroke drills through stored samples; this does not select the torus preset.
    const Brush drill{{0, 0, 0.95F}, 0.32F, 0.65F, BrushMode::subtract};
    gpuCheck(sphere.beginStroke(70, drill) && sphere.moveStroke(70, {0, 0, -0.95F}) && sphere.endStroke(70), "Could not submit the complete bounded drill stroke");
    waitForGpuModel(
        sphere, [&] {
            return sphere.ready();
        },
        deadline
    );
    const auto hole = inspectGpuProduct(sphere, 1, 0);
    ScalarGrid drilled(sphere.settings().grid);
    drilled.replaceValues(snapshotGpuField(sphere));
    for (int sample = 0; sample <= 256; ++sample) {
        const float z = -1.4F + 2.8F * sample / 256.0F;
        gpuCheck(drilled.sample({0, 0, z}) > 0.01F, "The apparent hole is a blind cavity instead of an open tunnel");
    }
    gpuCheck(sphere.undo(), "Drilled mesh could not undo its stroke");
    waitForGpuModel(
        sphere, [&] {
            return sphere.ready();
        },
        deadline
    );
    inspectGpuProduct(sphere, 1, 2);
    gpuCheck(sphere.redo(), "Drilled mesh could not redo its stroke");
    waitForGpuModel(
        sphere, [&] {
            return sphere.ready();
        },
        deadline
    );
    inspectGpuProduct(sphere, 1, 0);
    std::cout << "GPU DRILLED HOLE PASS samples=" << sphere.settings().grid.samples << " tunnelProbes=257 requiredFieldAbove=0.01 connected=1 euler=" << hole.eulerCharacteristic() << " undoRedo=1 storedBrush=1\n";

    NativeSceneTasks scenes(gl, budget);
    gpuCheck(scenes.reset(sphere, Shape::separatedSpheres), "Could not initialize two separate brush targets");
    auto bridge = waitForScene(scenes, sphere, deadline);
    gpuCheck(static_cast<bool>(bridge), "Two-sphere reset did not publish a complete model");
    inspectGpuProduct(*bridge, 2, 4);
    const Brush joining{{-0.3F, 0, 0}, 0.28F, 0.35F, BrushMode::add};
    gpuCheck(bridge->beginStroke(71, joining) && bridge->moveStroke(71, {0.3F, 0, 0}) && bridge->endStroke(71), "Could not submit the joining stroke");
    waitForGpuModel(
        *bridge, [&] {
            return bridge->ready();
        },
        deadline
    );
    inspectGpuProduct(*bridge, 1, 2);
    ScalarGrid joined(bridge->settings().grid);
    joined.replaceValues(snapshotGpuField(*bridge));
    for (int sample = 0; sample <= 128; ++sample) {
        const float x = -0.55F + 1.1F * sample / 128.0F;
        gpuCheck(joined.sample({x, 0, 0}) < -0.01F, "The bridge image hides an unjoined gap in its stored field");
    }
    gpuCheck(bridge->undo(), "Joined mesh could not undo its stroke");
    waitForGpuModel(
        *bridge, [&] {
            return bridge->ready();
        },
        deadline
    );
    inspectGpuProduct(*bridge, 2, 4);
    gpuCheck(bridge->redo(), "Joined mesh could not redo its stroke");
    waitForGpuModel(
        *bridge, [&] {
            return bridge->ready();
        },
        deadline
    );
    inspectGpuProduct(*bridge, 1, 2);
    std::cout << "GPU JOINED BRIDGE PASS samples=" << bridge->settings().grid.samples << " insideProbes=129 requiredFieldBelow=-0.01 beforeComponents=2 afterComponents=1 undoRedo=1 storedBrush=1\n";
}

} // namespace sculpt
