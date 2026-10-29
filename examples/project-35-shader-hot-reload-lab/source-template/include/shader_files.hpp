#pragma once
#include "pipeline.hpp"
#include <filesystem>
#include <fstream>
#include <limits>
#include <system_error>

namespace lab {
// Đọc đủ nội dung và kiểm giới hạn trước khi thay ShaderSources đang dùng.
#if LAB_CHECKPOINT >= 1
inline std::string shaderPathText(const std::filesystem::path& path) {
    const auto bytes = path.u8string();
    return {bytes.begin(), bytes.end()};
}

inline bool readTextFile(const std::filesystem::path& path, std::string& result, std::string& diagnostics, std::size_t maximumBytes = 1024 * 1024) {
    std::ifstream input(path, std::ios::binary | std::ios::ate);
    if (!input) {
        diagnostics = "Cannot open shader file: " + shaderPathText(path);
        return false;
    }
    const auto length = input.tellg();
    if (length <= 0 || std::uintmax_t(length) > maximumBytes) {
        diagnostics = "Empty, unreadable or oversized shader file: " + shaderPathText(path);
        return false;
    }
    std::string temporary(std::size_t(length), '\0');
    input.seekg(0);
    input.read(temporary.data(), std::streamsize(temporary.size()));
    if (!input || std::size_t(input.gcount()) != temporary.size() || temporary.find('\0') != std::string::npos) {
        diagnostics = "Incomplete read or embedded NUL in shader: " + shaderPathText(path);
        return false;
    }
    if (temporary.starts_with("\xEF\xBB\xBF"))
        temporary.erase(0, 3);
    result = std::move(temporary);
    diagnostics.clear();
    return true;
}

inline bool readShaderFiles(const std::filesystem::path& directory, std::size_t effect, ShaderSources& result, std::string& diagnostics) {
    if (effect >= kEffects.size()) {
        diagnostics = "Invalid gallery index";
        return false;
    }
    ShaderSources temporary{};
    const auto vertex = directory / "lab.vert";
    const auto fragment = directory / kEffects[effect].filename;
    temporary.vertexLabel = shaderPathText(vertex);
    temporary.fragmentLabel = shaderPathText(fragment);
    if (!readTextFile(vertex, temporary.vertex, diagnostics) || !readTextFile(fragment, temporary.fragment, diagnostics))
        return false;
    result = std::move(temporary);
    return true;
}
#endif

#if LAB_CHECKPOINT >= 5
struct ShaderFileStamp {
    enum class Status {
        ready,
        missing,
        inaccessible
    };
    Status status{Status::missing};
    std::uintmax_t size{};
    std::filesystem::file_time_type modified{};
    bool operator==(const ShaderFileStamp&) const = default;
};

struct ShaderFileStamps {
    ShaderFileStamp vertex{}, fragment{};
    bool operator==(const ShaderFileStamps&) const = default;
};

inline ShaderFileStamp shaderFileStamp(const std::filesystem::path& path) {
    ShaderFileStamp stamp{};
    std::error_code error;
    const bool exists = std::filesystem::exists(path, error);
    if (error) {
        stamp.status = ShaderFileStamp::Status::inaccessible;
        return stamp;
    }
    if (!exists)
        return stamp;
    stamp.size = std::filesystem::file_size(path, error);
    if (error) {
        stamp.status = ShaderFileStamp::Status::inaccessible;
        return stamp;
    }
    stamp.modified = std::filesystem::last_write_time(path, error);
    if (error) {
        stamp.status = ShaderFileStamp::Status::inaccessible;
    } else {
        stamp.status = ShaderFileStamp::Status::ready;
    }
    return stamp;
}

inline ShaderFileStamps readShaderFileStamps(const std::filesystem::path& directory, std::size_t effect) {
    if (effect >= kEffects.size())
        throw std::invalid_argument("Invalid watched effect");
    return {shaderFileStamp(directory / "lab.vert"), shaderFileStamp(directory / kEffects[effect].filename)};
}

struct ShaderWatchState {
    bool initialized{}, pending{};
    ShaderFileStamps observed{};
    std::uint64_t changedAtMilliseconds{};
};

inline bool updateShaderWatch(ShaderWatchState& state, const ShaderFileStamps& stamps, std::uint64_t now, std::uint64_t debounce = 140) {
    if (!state.initialized) {
        state = {true, false, stamps, now};
        return false;
    }
    if (stamps != state.observed || now < state.changedAtMilliseconds) {
        state.observed = stamps;
        state.pending = true;
        state.changedAtMilliseconds = now;
        return false;
    }
    if (!state.pending || now - state.changedAtMilliseconds < debounce)
        return false;
    state.pending = false;
    return true;
}
#endif
} // namespace lab
