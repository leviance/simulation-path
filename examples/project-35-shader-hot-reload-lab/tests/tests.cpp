#include "pipeline.hpp"
#include "shader_effects.hpp"
#include "shader_files.hpp"
#include <chrono>
#include <cstdlib>
#include <filesystem>
#include <fstream>
#include <iostream>
#include <string_view>

namespace {
int failures = 0;

void check(bool condition, std::string_view label) {
    if (!condition) {
        std::cerr << "FAIL: " << label << '\n';
        ++failures;
    }
}

// Only generated test fixtures live here. Cleanup is restricted to the unique
// directory created by this test, never a source/workspace directory.
struct TemporaryFiles {
    std::filesystem::path root{};

    TemporaryFiles() {
        const auto parent = std::filesystem::temp_directory_path();
        const auto stamp = std::chrono::steady_clock::now().time_since_epoch().count();
        for (int attempt = 0; attempt < 10; ++attempt) {
            const auto candidate = parent / ("simulation-path-p35-test-" + std::to_string(stamp) + "-" + std::to_string(attempt));
            if (std::filesystem::create_directory(candidate)) {
                root = candidate;
                return;
            }
        }
        throw std::runtime_error("Cannot create unique P35 test directory");
    }

    ~TemporaryFiles() {
        std::error_code error;
        if (!root.empty() && root.parent_path() == std::filesystem::temp_directory_path() && root.filename().string().starts_with("simulation-path-p35-test-")) {
            std::filesystem::remove_all(root, error);
        }
    }

    void write(const char* name, const std::string& source) {
        std::ofstream output(root / name, std::ios::binary | std::ios::trunc);
        output.write(source.data(), std::streamsize(source.size()));
        if (!output)
            throw std::runtime_error("Cannot write test fixture");
    }
};

void testBoundedFileReads() {
    TemporaryFiles files{};
    std::string result = "keep previous data", diagnostics;
    check(!lab::readTextFile(files.root / "missing.frag", result, diagnostics), "missing shader is an I/O failure");
    check(result == "keep previous data" && diagnostics.find("missing.frag") != std::string::npos, "failed read keeps previous data and names file");
    files.write("lab.vert", "\xEF\xBB\xBF#version 330 core\nvoid main(){}\n");
    check(lab::readTextFile(files.root / "lab.vert", result, diagnostics) && result.starts_with("#version"), "UTF-8 BOM is removed before #version");
    files.write("gradient.frag", "#version 330 core\nvoid main(){}\n");
    lab::ShaderSources sources{};
    check(lab::readShaderFiles(files.root, 0, sources, diagnostics), "vertex/selected fragment read as one temporary pair");
    const auto original = sources.fragment;
    files.write("gradient.frag", std::string("abc\0def", 7));
    check(!lab::readShaderFiles(files.root, 0, sources, diagnostics) && sources.fragment == original, "embedded NUL cannot silently truncate GLSL or replace prior source");
    files.write("gradient.frag", "0123456789abcdef");
    check(!lab::readTextFile(files.root / "gradient.frag", result, diagnostics, 8), "size budget is enforced before allocating file bytes");
    const auto stamp = lab::shaderFileStamp(files.root / "gradient.frag");
    check(stamp.status == lab::ShaderFileStamp::Status::ready && stamp.size == 16, "filesystem stamp retains size and ready status");
    std::filesystem::remove(files.root / "gradient.frag");
    check(lab::shaderFileStamp(files.root / "gradient.frag").status == lab::ShaderFileStamp::Status::missing, "deleted file has a distinct stamp");
    check(!lab::readShaderFiles(files.root, 99, sources, diagnostics), "invalid gallery selection is rejected before indexing");
}

void testReloadStateAndFingerprint() {
    check(lab::fingerprintShaderSources({"ab", "c"}) != lab::fingerprintShaderSources({"a", "bc"}), "source fingerprint preserves vertex/fragment boundary");
    lab::ReloadState state{};
    state.activeFingerprint = 100;
    state.activeEffect = 0;
    lab::recordReloadAttempt(state, 200, 1, false, "fragment error");
    check(state.attempts == 1 && state.generation == 1 && state.activeFingerprint == 100 && state.activeEffect == 0, "failure preserves all committed metadata");
    check(!state.lastReloadSucceeded && state.diagnostics == "fragment error", "failure remains observable");
    lab::recordReloadAttempt(state, 300, 2, true, "repaired");
    check(state.attempts == 2 && state.generation == 2 && state.activeFingerprint == 300 && state.activeEffect == 2, "repair advances generation and commits effect/fingerprint once");
}

void testWatcher() {
    lab::ShaderFileStamps first{};
    first.vertex.status = first.fragment.status = lab::ShaderFileStamp::Status::ready;
    first.vertex.size = first.fragment.size = 10;
    auto second = first;
    second.fragment.size = 11; // Same timestamp, different size must still count.
    lab::ShaderWatchState watcher{};
    check(!lab::updateShaderWatch(watcher, first, 0), "watch startup establishes baseline without redundant reload");
    check(!lab::updateShaderWatch(watcher, second, 40), "first edit starts debounce");
    check(!lab::updateShaderWatch(watcher, second, 179), "full 140 ms stability is required");
    check(lab::updateShaderWatch(watcher, second, 180), "stable changed pair emits exactly one reload");
    check(!lab::updateShaderWatch(watcher, second, 1000), "unchanged bad source does not create retry storm");
    auto third = second;
    third.vertex.size = 12;
    check(!lab::updateShaderWatch(watcher, third, 1100), "vertex changes are observed too");
    third.fragment.size = 13;
    check(!lab::updateShaderWatch(watcher, third, 1200), "second save restarts debounce");
    check(!lab::updateShaderWatch(watcher, third, 1339) && lab::updateShaderWatch(watcher, third, 1340), "paired saves coalesce after latest change");
    third.fragment = {};
    check(!lab::updateShaderWatch(watcher, third, 1400) && lab::updateShaderWatch(watcher, third, 1540), "file removal is observable once");
    check(!lab::updateShaderWatch(watcher, third, 2000), "missing file does not cause retries every frame");
    check(!lab::updateShaderWatch(watcher, first, 2100) && lab::updateShaderWatch(watcher, first, 2240), "recreated shader triggers recovery attempt");
    check(!lab::updateShaderWatch(watcher, first, 10), "clock rollback resets stability timer instead of unsigned underflow");
    check(!lab::updateShaderWatch(watcher, first, 149) && lab::updateShaderWatch(watcher, first, 150), "rollback has bounded, non-storm recovery");
}

void testUniformsAndControls() {
    lab::ShaderScene scene{};
    scene.requestedEffect = 3;
    lab::setShaderMouse(scene, 160, 120, 640, 480);
    const auto uniform = lab::makeUniformSnapshot(scene, 1280, 960);
    check(uniform.mouseX == 320 && uniform.mouseY == 720, "logical top-left mouse maps to physical bottom-left pixels at DPR 2");
    check(uniform.width == 1280 && uniform.height == 960, "resolution is physical pixels");
    lab::setShaderMouse(scene, -20, 10000, 640, 480);
    check(scene.mouseX == 0 && scene.mouseY == 1, "captured pointer outside window remains bounded");
    lab::advanceShaderTime(scene, 10);
    check(std::abs(scene.timeSeconds - 0.05) < 1e-9, "long frame dt is bounded");
    scene.paused = true;
    lab::advanceShaderTime(scene, 1);
    check(std::abs(scene.timeSeconds - 0.05) < 1e-9, "pause stops time");
    lab::zoomShader(scene, 1000);
    check(scene.zoom == 8, "zoom-in bounded");
    lab::zoomShader(scene, -1000);
    check(scene.zoom == 0.25F, "zoom-out bounded");
    lab::resetShaderView(scene);
    check(scene.requestedEffect == 3 && scene.paused && scene.timeSeconds == 0 && scene.mouseX == 0.5 && scene.zoom == 1, "reset view preserves selected effect");
    bool rejected = false;
    try {
        lab::makeUniformSnapshot(scene, 0, 600);
    } catch (const std::invalid_argument&) {
        rejected = true;
    }
    check(rejected, "zero viewport cannot create invalid uniforms");
}

void testEffectReferences() {
    check(lab::kEffects.size() == 4, "gallery has four named effects");
    check(lab::mandelbrotOrbit(0, 0).escaped == 0 && lab::mandelbrotOrbit(-1, 0).escaped == 0, "known periodic Mandelbrot points do not escape");
    check(lab::mandelbrotOrbit(2, 0).escaped == 2 && lab::mandelbrotOrbit(3, 0).escaped == 1, "known exterior Mandelbrot points escape at correct step");
    check(lab::hashCell(-3, 7) == lab::hashCell(-3, 7), "unsigned cell hash is deterministic for negative coordinates");
    check(lab::hashCell(0, 0) == 0 && lab::valueNoise(2, 3) == lab::hashCell(2, 3), "noise at grid corner matches its hash");
    check(std::abs(lab::valueNoise(1 - 1e-6, 0.37) - lab::valueNoise(1 + 1e-6, 0.37)) < 1e-5, "value noise is continuous across a cell boundary");
    lab::ShaderScene scene{};
    scene.timeSeconds = 1.25;
    const auto uniform = lab::makeUniformSnapshot(scene, 640, 400);
    for (std::size_t effect = 0; effect < 4; ++effect) {
        for (int y = 0; y < 400; y += 57) {
            for (int x = 0; x < 640; x += 71) {
                const auto color = lab::referenceShaderColor(effect, x + 0.5, y + 0.5, uniform);
                for (double channel : color)
                    check(std::isfinite(channel) && channel >= 0 && channel <= 1, "effect samples remain finite and bounded");
                const double n = lab::fbm(x * 0.01, y * 0.01);
                check(n >= 0 && n <= 0.96875, "five fBm amplitudes have bounded sum");
            }
        }
    }
}
} // namespace

int main() {
    try {
        testBoundedFileReads();
        testReloadStateAndFingerprint();
        testWatcher();
        testUniformsAndControls();
        testEffectReferences();
    } catch (const std::exception& error) {
        check(false, error.what());
    }
    if (failures != 0) {
        std::cerr << failures << " Project 35 checks failed.\n";
        return EXIT_FAILURE;
    }
    std::cout << "Project 35 CPU file/watch/state/uniform/math checks passed (no window).\n";
    return EXIT_SUCCESS;
}
