#pragma once
#ifndef LAB_CHECKPOINT
#define LAB_CHECKPOINT 10
#endif

#include <algorithm>
#include <array>
#include <cmath>
#include <cstddef>
#include <cstdint>
#include <stdexcept>
#include <string>
#include <string_view>
#include <utility>

namespace lab {
struct EffectInfo {
    std::string_view name;
    std::string_view filename;
};

inline constexpr std::array<EffectInfo, 4> kEffects{{
    {"Gradient Aurora", "gradient.frag"},
    {"Circle Ripples", "circle.frag"},
    {"Mandelbrot", "mandelbrot.frag"},
    {"Noise Flow", "noise.frag"},
}};

struct ShaderSources {
    std::string vertex;
    std::string fragment;
    std::string vertexLabel{"embedded.vert"};
    std::string fragmentLabel{"embedded.frag"};
};

struct ShaderScene {
    double timeSeconds{};
    double mouseX{0.5}; // Normalized, top-left input. Convert once at uniform upload.
    double mouseY{0.5};
    float zoom{1};
    bool paused{};
    bool showDebug{true};
    bool autoReload{true};
    std::size_t requestedEffect{};
};

struct UniformSnapshot {
    float time{};
    float width{1};
    float height{1};
    float mouseX{0.5F};
    float mouseY{0.5F};
    float zoom{1};
};

inline UniformSnapshot makeUniformSnapshot(const ShaderScene& scene, int width, int height) {
    if (width <= 0 || height <= 0 || !std::isfinite(scene.timeSeconds) ||
        !std::isfinite(scene.mouseX) || !std::isfinite(scene.mouseY) ||
        !std::isfinite(scene.zoom) || scene.zoom <= 0) {
        throw std::invalid_argument("Invalid shader uniform snapshot");
    }
    return {float(scene.timeSeconds), float(width), float(height), float(std::clamp(scene.mouseX, 0.0, 1.0) * width), float((1 - std::clamp(scene.mouseY, 0.0, 1.0)) * height), scene.zoom};
}

inline void setShaderMouse(ShaderScene& scene, double x, double y, int logicalWidth, int logicalHeight) {
    if (logicalWidth <= 0 || logicalHeight <= 0 || !std::isfinite(x) || !std::isfinite(y))
        return;
    scene.mouseX = std::clamp(x / logicalWidth, 0.0, 1.0);
    scene.mouseY = std::clamp(y / logicalHeight, 0.0, 1.0);
}

inline void zoomShader(ShaderScene& scene, double wheel) {
    if (!std::isfinite(wheel))
        return;
    scene.zoom = float(std::clamp(double(scene.zoom) * std::exp(std::clamp(wheel, -40.0, 40.0) * 0.12), 0.25, 8.0));
}

inline void advanceShaderTime(ShaderScene& scene, double seconds) {
    if (!scene.paused && std::isfinite(seconds) && seconds > 0)
        scene.timeSeconds += std::min(seconds, 0.05);
}

inline void resetShaderView(ShaderScene& scene) {
    scene.timeSeconds = 0;
    scene.mouseX = scene.mouseY = 0.5;
    scene.zoom = 1;
    scene.paused = true;
}

inline std::uint64_t hashText(std::string_view text, std::uint64_t seed = 14695981039346656037ULL) {
    for (unsigned char byte : text) {
        seed ^= byte;
        seed *= 1099511628211ULL;
    }
    return seed;
}

inline std::uint64_t fingerprintShaderSources(const ShaderSources& sources) {
    // NUL is forbidden in files, so this separator cannot collide with a split
    // such as ("ab","c") versus ("a","bc"). This is a cache ID, not security.
    const auto vertex = hashText(sources.vertex);
    const auto separated = hashText(std::string_view("\0", 1), vertex);
    return hashText(sources.fragment, separated);
}

struct ReloadState {
    std::uint64_t generation{1};
    std::uint64_t attempts{};
    std::uint64_t activeFingerprint{};
    std::uint64_t candidateFingerprint{};
    std::size_t activeEffect{4}; // 4 means embedded recovery program, not a gallery item.
    bool lastReloadSucceeded{true};
    std::string diagnostics{"Embedded recovery shader ready"};
};

inline void recordReloadAttempt(ReloadState& state, std::uint64_t fingerprint, std::size_t effect, bool succeeded, std::string diagnostics) {
    ++state.attempts;
    state.candidateFingerprint = fingerprint;
    state.lastReloadSucceeded = succeeded;
    state.diagnostics = std::move(diagnostics);
    if (succeeded) {
        ++state.generation;
        state.activeFingerprint = fingerprint;
        state.activeEffect = effect;
    }
}
} // namespace lab
