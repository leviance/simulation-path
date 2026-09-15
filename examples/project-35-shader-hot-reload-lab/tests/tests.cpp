#include "pipeline.hpp"

#include <cstdlib>
#include <iostream>
#include <string_view>

namespace {

int failures = 0;

// These tests cover the deterministic CPU-side contract. OpenGL driver
// compilation remains an integration check because it requires a real context.
void check(bool condition, std::string_view label) {
    if (!condition) {
        std::cerr << "FAIL: " << label << '\n';
        ++failures;
    }
}

lab::ShaderSources validSources() {
    return {
        "aPosition aColor uMvp vColor vLocalPosition",
        "vColor vLocalPosition uTime uResolution uMouse",
    };
}

void testMeshAndMatrixContract() {
    check(lab::kCubeVertices.size() == 24U, "cube keeps twenty-four face vertices");
    check(lab::kCubeIndices.size() == 36U, "cube keeps twelve indexed triangles");
    check(sizeof(lab::ShaderVertex) == sizeof(float) * 6U, "vertex layout remains six floats");

    const lab::ShaderScene scene{};
    const lab::Mat4 mvp = lab::makeMvp(scene, 16.0F / 9.0F);
    check(std::isfinite(mvp.values[0]) && std::isfinite(mvp.values[14]), "MVP stays finite");
}

void testInterfaceValidation() {
    const lab::ShaderSources valid = validSources();
    check(lab::validateShaderInterface(valid, true).empty(), "complete shader interface passes");

    lab::ShaderSources missingMouse = valid;
    missingMouse.fragment = "vColor vLocalPosition uTime uResolution";
    check(lab::validateShaderInterface(missingMouse, true).find("uMouse") != std::string::npos, "missing live uniform is named");
}

void testTransactionalReloadState() {
    lab::ReloadState state{};
    state.activeFingerprint = 100;
    lab::recordReloadAttempt(state, 200, false);
    check(state.generation == 1, "failed reload keeps program generation");
    check(state.activeFingerprint == 100, "failed reload preserves last-good fingerprint");
    check(!state.lastReloadSucceeded, "failed reload remains observable");

    lab::recordReloadAttempt(state, 300, true);
    check(state.generation == 2, "successful reload advances generation");
    check(state.activeFingerprint == 300, "successful reload commits candidate fingerprint");
}

void testWatcherDebounce() {
    lab::ShaderWatchState state{};
    check(!lab::updateShaderWatch(state, {10, 20}, 0, 120), "initial scan does not reload");
    check(!lab::updateShaderWatch(state, {10, 21}, 40, 120), "file change begins debounce");
    check(!lab::updateShaderWatch(state, {10, 21}, 159, 120), "watcher waits for full debounce interval");
    check(lab::updateShaderWatch(state, {10, 21}, 160, 120), "stable files trigger one reload");
    check(!lab::updateShaderWatch(state, {10, 21}, 300, 120), "unchanged files do not reload repeatedly");
}

void testNamedValidationReport() {
    const lab::ShaderLabValidationReport report = lab::validateShaderLabContract();
    check(report.meshLayout, "validation locks mesh layout");
    check(report.shaderInterface, "validation locks shader interface");
    check(report.failedReloadKeepsGeneration, "validation locks last-good behavior");
    check(report.successfulReloadAdvancesGeneration, "validation locks successful commit");
    check(report.watcherDebounces, "validation locks watcher debounce");
    check(report.allPassed(), "named shader lab validation passes");
}

} // namespace

int main() {
    testMeshAndMatrixContract();
    testInterfaceValidation();
    testTransactionalReloadState();
    testWatcherDebounce();
    testNamedValidationReport();

    if (failures != 0) {
        std::cerr << failures << " Project 35 validation checks failed.\n";
        return EXIT_FAILURE;
    }
    std::cout << "Project 35 shader hot-reload contract is valid.\n";
    return EXIT_SUCCESS;
}
