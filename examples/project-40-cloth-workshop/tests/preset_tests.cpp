#include "cloth_topology.hpp"

#include <iostream>

namespace {

// These checks compare declared scene geometry, independently of the GPU collision implementation.

bool equalPoint(cloth::Vec3 a, cloth::Vec3 b) {
    return a.x == b.x && a.y == b.y && a.z == b.z;
}

} // namespace

int runPresetTests() {
    int failures = 0;
    const auto check = [&](bool condition, const char* label) {
        if (!condition) {
            ++failures;
            std::cerr << "FAIL: " << label << '\n';
        }
    };
    cloth::Settings custom{};
    custom.side = 65U;
    custom.extent = 6.0F;
    custom.thickness = 0.02F;
    custom.compliance = 3.0e-6F;
    custom.bendCompliance = 7.0e-5F;
    custom.damping = 1.25F;
    custom.friction = 0.45F;
    custom.gravity = 7.5F;
    custom.wind = 2.5F;
    custom.dt = 1.0F / 120.0F;
    custom.substeps = 4U;
    custom.iterations = 8U;
    custom.candidateBudget = 64000000ULL;
    custom.memoryBudget = 384ULL * 1024ULL * 1024ULL;
    custom.floorHeight = 0.2F;
    custom.sphereCenter = {1.0F, 2.0F, 1.0F};
    custom.sphereRadius = 0.7F;
    custom.capsuleA = {-2.0F, 1.3F, 1.0F};
    custom.capsuleB = {2.0F, 1.3F, 1.0F};
    custom.capsuleRadius = 0.2F;
    const cloth::Settings defaults{};
    for (const auto preset : {cloth::Preset::Hanging, cloth::Preset::SphereDrape, cloth::Preset::DropTable}) {
        const cloth::Settings selected = cloth::presetSettings(custom, preset);
        check(selected.preset == preset, "explicit preset selection changes the requested scene kind");
        check(selected.side == custom.side && selected.extent == custom.extent
            && selected.thickness == custom.thickness && selected.compliance == custom.compliance
            && selected.bendCompliance == custom.bendCompliance && selected.damping == custom.damping
            && selected.friction == custom.friction && selected.gravity == custom.gravity
            && selected.wind == custom.wind && selected.dt == custom.dt && selected.substeps == custom.substeps
            && selected.iterations == custom.iterations && selected.candidateBudget == custom.candidateBudget
            && selected.memoryBudget == custom.memoryBudget,
            "scene preset selection preserves grid, material, forces, timestep and resource budgets");
        std::string error{};
        check(cloth::validSettings(selected, error), "each canonical obstacle preset is inside the declared safe settings domain");
        if (preset != cloth::Preset::DropTable) {
            check(selected.floorHeight == defaults.floorHeight && equalPoint(selected.sphereCenter, defaults.sphereCenter)
                && selected.sphereRadius == defaults.sphereRadius && equalPoint(selected.capsuleA, defaults.capsuleA)
                && equalPoint(selected.capsuleB, defaults.capsuleB) && selected.capsuleRadius == defaults.capsuleRadius,
                "hanging/sphere selection restores every canonical obstacle field after an edited scene");
        } else {
            check(selected.floorHeight == 0.7F && equalPoint(selected.sphereCenter, {0.0F, 0.5F, 0.0F})
                && selected.sphereRadius == 0.1F, "table preset hides the small sphere fully below its support plane");
            check(selected.sphereCenter.y + selected.sphereRadius + selected.thickness < selected.floorHeight,
                "sphere plus collision thickness cannot create a dome above the table");
            check(equalPoint(selected.capsuleA, {-1.0F, 1.15F, 0.0F})
                && equalPoint(selected.capsuleB, {1.0F, 1.15F, 0.0F}) && selected.capsuleRadius == 0.45F,
                "table preset supplies the declared horizontal capsule bar");
            check(std::abs(selected.capsuleA.y - selected.capsuleRadius - selected.floorHeight) < 1.0e-6F
                && selected.capsuleA.y + selected.capsuleRadius > selected.floorHeight + selected.thickness,
                "capsule bottom touches the tabletop while its upper surface protrudes for bar draping");
        }
    }
    check(equalPoint(custom.sphereCenter, {1.0F, 2.0F, 1.0F}) && custom.floorHeight == 0.2F,
        "pure preset helper does not mutate its caller's settings value");
    const auto table = cloth::presetSettings(custom, cloth::Preset::DropTable);
    const auto sphereAgain = cloth::presetSettings(table, cloth::Preset::SphereDrape);
    check(sphereAgain.floorHeight == 0.0F && sphereAgain.sphereRadius == 1.35F
        && sphereAgain.sphereCenter.y == 1.75F && sphereAgain.capsuleA.y == 0.9F,
        "switching back from table restores the sphere-drape silhouette rather than retaining table obstacles");
    return failures;
}
