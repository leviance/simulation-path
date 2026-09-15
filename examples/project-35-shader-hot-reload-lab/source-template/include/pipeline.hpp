#pragma once

#ifndef LAB_CHECKPOINT
#define LAB_CHECKPOINT 8
#endif

#include <array>
#include <cmath>
#include <cstddef>
#include <cstdint>
#include <filesystem>
#include <fstream>
#include <numbers>
#include <sstream>
#include <string>
#include <string_view>

namespace lab {

struct Vec4 {
    float x{};
    float y{};
    float z{};
    float w{};
};

struct Mat4 {
    // Column-major storage: cùng 16 floats được upload bằng GL_FALSE.
    std::array<float, 16> values{};
};

struct ShaderVertex {
    float positionX{};
    float positionY{};
    float positionZ{};
    float red{};
    float green{};
    float blue{};
};

struct ShaderScene {
    float angleX{-0.42F};
    float angleY{0.68F};
    float elapsedSeconds{};
    float mouseX{};
    float mouseY{};
};

static_assert(sizeof(ShaderVertex) == sizeof(float) * 6U);
static_assert(offsetof(ShaderVertex, red) == sizeof(float) * 3U);

inline constexpr std::array<ShaderVertex, 24> kCubeVertices{
    ShaderVertex{-1, -1, 1, 1.0F, 0.35F, 0.40F},
    ShaderVertex{1, -1, 1, 1.0F, 0.35F, 0.40F},
    ShaderVertex{1, 1, 1, 1.0F, 0.35F, 0.40F},
    ShaderVertex{-1, 1, 1, 1.0F, 0.35F, 0.40F},
    ShaderVertex{1, -1, -1, 0.36F, 0.55F, 0.96F},
    ShaderVertex{-1, -1, -1, 0.36F, 0.55F, 0.96F},
    ShaderVertex{-1, 1, -1, 0.36F, 0.55F, 0.96F},
    ShaderVertex{1, 1, -1, 0.36F, 0.55F, 0.96F},
    ShaderVertex{-1, -1, -1, 0.66F, 0.44F, 0.91F},
    ShaderVertex{-1, -1, 1, 0.66F, 0.44F, 0.91F},
    ShaderVertex{-1, 1, 1, 0.66F, 0.44F, 0.91F},
    ShaderVertex{-1, 1, -1, 0.66F, 0.44F, 0.91F},
    ShaderVertex{1, -1, 1, 0.35F, 0.79F, 0.50F},
    ShaderVertex{1, -1, -1, 0.35F, 0.79F, 0.50F},
    ShaderVertex{1, 1, -1, 0.35F, 0.79F, 0.50F},
    ShaderVertex{1, 1, 1, 0.35F, 0.79F, 0.50F},
    ShaderVertex{-1, 1, 1, 0.95F, 0.72F, 0.31F},
    ShaderVertex{1, 1, 1, 0.95F, 0.72F, 0.31F},
    ShaderVertex{1, 1, -1, 0.95F, 0.72F, 0.31F},
    ShaderVertex{-1, 1, -1, 0.95F, 0.72F, 0.31F},
    ShaderVertex{-1, -1, -1, 0.86F, 0.49F, 0.22F},
    ShaderVertex{1, -1, -1, 0.86F, 0.49F, 0.22F},
    ShaderVertex{1, -1, 1, 0.86F, 0.49F, 0.22F},
    ShaderVertex{-1, -1, 1, 0.86F, 0.49F, 0.22F},
};

inline constexpr std::array<std::uint32_t, 36> kCubeIndices{
    0,
    1,
    2,
    0,
    2,
    3,
    4,
    5,
    6,
    4,
    6,
    7,
    8,
    9,
    10,
    8,
    10,
    11,
    12,
    13,
    14,
    12,
    14,
    15,
    16,
    17,
    18,
    16,
    18,
    19,
    20,
    21,
    22,
    20,
    22,
    23,
};

inline Mat4 identityMatrix() {
    Mat4 result{};
    result.values = {1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1};
    return result;
}

inline Mat4 multiply(const Mat4& left, const Mat4& right) {
    Mat4 result{};
    for (int column = 0; column < 4; ++column) {
        for (int row = 0; row < 4; ++row) {
            float value = 0.0F;
            for (int inner = 0; inner < 4; ++inner) {
                value += left.values[std::size_t(inner * 4 + row)] * right.values[std::size_t(column * 4 + inner)];
            }
            result.values[std::size_t(column * 4 + row)] = value;
        }
    }
    return result;
}

inline Mat4 rotationXMatrix(float angle) {
    const float cosine = std::cos(angle);
    const float sine = std::sin(angle);
    Mat4 result = identityMatrix();
    result.values[5] = cosine;
    result.values[6] = sine;
    result.values[9] = -sine;
    result.values[10] = cosine;
    return result;
}

inline Mat4 rotationYMatrix(float angle) {
    const float cosine = std::cos(angle);
    const float sine = std::sin(angle);
    Mat4 result = identityMatrix();
    result.values[0] = cosine;
    result.values[2] = -sine;
    result.values[8] = sine;
    result.values[10] = cosine;
    return result;
}

inline Mat4 translationMatrix(float x, float y, float z) {
    Mat4 result = identityMatrix();
    result.values[12] = x;
    result.values[13] = y;
    result.values[14] = z;
    return result;
}

inline Mat4 perspectiveMatrix(float verticalFovRadians, float aspect, float nearPlane, float farPlane) {
    Mat4 result{};
    const float focalScale = 1.0F / std::tan(verticalFovRadians * 0.5F);
    result.values[0] = focalScale / aspect;
    result.values[5] = focalScale;
    result.values[10] = (farPlane + nearPlane) / (nearPlane - farPlane);
    result.values[11] = -1.0F;
    result.values[14] = (2.0F * farPlane * nearPlane) / (nearPlane - farPlane);
    return result;
}

inline Mat4 makeMvp(const ShaderScene& scene, float aspect) {
    const Mat4 model = multiply(rotationYMatrix(scene.angleY), rotationXMatrix(scene.angleX));
    const Mat4 view = translationMatrix(0.0F, 0.0F, -4.2F);
    const Mat4 projection = perspectiveMatrix(std::numbers::pi_v<float> / 3.0F, aspect, 0.5F, 20.0F);
    return multiply(projection, multiply(view, model));
}

struct ShaderSources {
    std::string vertex{};
    std::string fragment{};
};

#if LAB_CHECKPOINT >= 1
inline bool readTextFile(const std::filesystem::path& path, std::string& contents, std::string& diagnostics) {
    std::ifstream input(path, std::ios::binary);
    if (!input) {
        diagnostics = "Cannot open shader file: " + path.string();
        return false;
    }
    std::ostringstream buffer{};
    buffer << input.rdbuf();
    if (!input.good() && !input.eof()) {
        diagnostics = "Cannot read complete shader file: " + path.string();
        return false;
    }
    contents = buffer.str();
    return true;
}

inline bool readShaderFiles(const std::filesystem::path& directory, ShaderSources& sources, std::string& diagnostics) {
    if (!readTextFile(directory / "lab.vert", sources.vertex, diagnostics)) {
        return false;
    }
    if (!readTextFile(directory / "lab.frag", sources.fragment, diagnostics)) {
        return false;
    }
    return true;
}
#endif

#if LAB_CHECKPOINT >= 3
inline std::uint64_t hashText(std::string_view text, std::uint64_t seed = 1469598103934665603ULL) {
    std::uint64_t value = seed;
    for (const unsigned char character : text) {
        value ^= character;
        value *= 1099511628211ULL;
    }
    return value;
}

inline std::uint64_t fingerprintShaderSources(const ShaderSources& sources) {
    const std::uint64_t vertexHash = hashText(sources.vertex);
    return hashText(sources.fragment, vertexHash);
}

inline std::string validateShaderInterface(const ShaderSources& sources, bool requireLiveUniforms) {
    for (const std::string_view token : {"aPosition", "aColor", "uMvp", "vColor", "vLocalPosition"}) {
        if (sources.vertex.find(token) == std::string::npos && sources.fragment.find(token) == std::string::npos) {
            return "Missing shader interface token: " + std::string(token);
        }
    }
    if (requireLiveUniforms) {
        for (const std::string_view uniform : {"uTime", "uResolution", "uMouse"}) {
            if (sources.fragment.find(uniform) == std::string::npos) {
                return "Missing live uniform: " + std::string(uniform);
            }
        }
    }
    return {};
}
#endif

#if LAB_CHECKPOINT >= 4
struct ReloadState {
    std::uint64_t generation{1};
    std::uint64_t attempts{1};
    std::uint64_t activeFingerprint{};
    std::uint64_t candidateFingerprint{};
    bool lastReloadSucceeded{true};
};

inline void recordReloadAttempt(ReloadState& state, std::uint64_t candidateFingerprint, bool succeeded) {
    ++state.attempts;
    state.candidateFingerprint = candidateFingerprint;
    state.lastReloadSucceeded = succeeded;
    if (!succeeded) {
        return;
    }
    state.activeFingerprint = candidateFingerprint;
    ++state.generation;
}
#endif

#if LAB_CHECKPOINT >= 5
struct ShaderFileStamps {
    std::uint64_t vertex{};
    std::uint64_t fragment{};
};

struct ShaderWatchState {
    bool initialized{};
    ShaderFileStamps observed{};
    bool pending{};
    std::uint64_t changedAtMilliseconds{};
};

inline std::uint64_t fileStamp(const std::filesystem::path& path) {
    std::error_code error{};
    const auto writeTime = std::filesystem::last_write_time(path, error);
    if (error) {
        return 0;
    }
    return static_cast<std::uint64_t>(writeTime.time_since_epoch().count());
}

inline ShaderFileStamps readShaderFileStamps(const std::filesystem::path& directory) {
    return {fileStamp(directory / "lab.vert"), fileStamp(directory / "lab.frag")};
}

inline bool updateShaderWatch(ShaderWatchState& state, ShaderFileStamps stamps, std::uint64_t nowMilliseconds, std::uint64_t debounceMilliseconds) {
    if (!state.initialized) {
        state.initialized = true;
        state.observed = stamps;
        state.changedAtMilliseconds = nowMilliseconds;
        return false;
    }
    const bool changed = stamps.vertex != state.observed.vertex || stamps.fragment != state.observed.fragment;
    if (changed) {
        state.observed = stamps;
        state.pending = true;
        state.changedAtMilliseconds = nowMilliseconds;
        return false;
    }
    if (!state.pending || nowMilliseconds - state.changedAtMilliseconds < debounceMilliseconds) {
        return false;
    }
    state.pending = false;
    return true;
}
#endif

#if LAB_CHECKPOINT >= 8
struct ShaderLabValidationReport {
    bool meshLayout{};
    bool shaderInterface{};
    bool failedReloadKeepsGeneration{};
    bool successfulReloadAdvancesGeneration{};
    bool watcherDebounces{};

    bool allPassed() const {
        return meshLayout && shaderInterface && failedReloadKeepsGeneration && successfulReloadAdvancesGeneration && watcherDebounces;
    }
};

inline ShaderLabValidationReport validateShaderLabContract() {
    ShaderLabValidationReport report{};
    report.meshLayout = kCubeVertices.size() == 24U && kCubeIndices.size() == 36U && sizeof(ShaderVertex) == sizeof(float) * 6U;

    const ShaderSources sources{
        "aPosition aColor uMvp vColor vLocalPosition",
        "vColor vLocalPosition uTime uResolution uMouse",
    };
    report.shaderInterface = validateShaderInterface(sources, true).empty();

    ReloadState reload{};
    reload.activeFingerprint = 10;
    recordReloadAttempt(reload, 20, false);
    report.failedReloadKeepsGeneration = reload.generation == 1 && reload.activeFingerprint == 10;
    recordReloadAttempt(reload, 30, true);
    report.successfulReloadAdvancesGeneration = reload.generation == 2 && reload.activeFingerprint == 30;

    ShaderWatchState watcher{};
    const bool initialReload = updateShaderWatch(watcher, {1, 1}, 0, 120);
    const bool earlyReload = updateShaderWatch(watcher, {1, 2}, 40, 120);
    const bool stillEarlyReload = updateShaderWatch(watcher, {1, 2}, 159, 120);
    const bool debouncedReload = updateShaderWatch(watcher, {1, 2}, 160, 120);
    report.watcherDebounces = !initialReload && !earlyReload && !stillEarlyReload && debouncedReload;
    return report;
}
#endif

} // namespace lab
