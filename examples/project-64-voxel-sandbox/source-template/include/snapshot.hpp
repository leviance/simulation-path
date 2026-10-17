#pragma once
#include "editing.hpp"
#include <charconv>
#include <sstream>
#include <string>

namespace voxel {
// VXL1 là snapshot có version: cấu hình terrain và delta, không chứa mesh cache.
#if LAB_CHECKPOINT >= 8
inline std::string serialize(const World& world) {
    std::ostringstream output;
    output << "VXL1 " << world.config.seed << ' ' << world.config.scale << ' ' << world.config.octaves << '\n';
    output << world.edits.size() << '\n';
    for (const auto& [cell, material] : world.edits) {
        output << cell[0] << ' ' << cell[1] << ' ' << cell[2] << ' ' << static_cast<int>(material) << '\n';
    }
    return output.str();
}

inline int decimalInteger(const std::string& token) {
    int value = 0;
    const auto result = std::from_chars(token.data(), token.data() + token.size(), value);
    if (result.ec != std::errc{} || result.ptr != token.data() + token.size()) {
        throw std::runtime_error("decimal integer/overflow");
    }
    return value;
}

inline World importSnapshot(const World& current, const std::string& text) {
    if (text.size() > 32768) {
        throw std::runtime_error("snapshot <=32768 bytes");
    }
    for (const unsigned char c : text) {
        if ((c < 32 && c != 9 && c != 10 && c != 13) || c > 126) {
            throw std::runtime_error("ASCII snapshot");
        }
    }
    std::istringstream input(text);
    std::vector<std::string> tokens;
    std::string token;
    while (input >> token) {
        tokens.push_back(token);
        if (tokens.size() > 2053) {
            throw std::runtime_error("too many tokens");
        }
    }
    if (tokens.size() < 5 || tokens[0] != "VXL1") {
        throw std::runtime_error("VXL1 header");
    }
    const int seed = decimalInteger(tokens[1]);
    if (seed < 0) {
        throw std::runtime_error("nonnegative seed");
    }
    const TerrainConfig config{static_cast<std::uint32_t>(seed), decimalInteger(tokens[2]), decimalInteger(tokens[3])};
    validateConfig(config);
    const int count = decimalInteger(tokens[4]);
    if (count < 0 || count > 512 || tokens.size() != static_cast<std::size_t>(5 + count * 4)) {
        throw std::runtime_error("delta count/trailing data");
    }
    World parsed;
    parsed.config = config;
    for (int i = 0; i < count; ++i) {
        const std::size_t offset = 5 + static_cast<std::size_t>(i) * 4;
        const Cell cell{decimalInteger(tokens[offset]), decimalInteger(tokens[offset + 1]), decimalInteger(tokens[offset + 2])};
        validateCell(cell);
        const int value = decimalInteger(tokens[offset + 3]);
        if (value < 0 || value > 3 || parsed.edits.contains(cell) || static_cast<Block>(value) == baseBlock(parsed, cell)) {
            throw std::runtime_error("invalid/redundant/duplicate delta");
        }
        parsed.edits.emplace(cell, static_cast<Block>(value));
    }
    // Chỉ trả state mới sau khi toàn bộ text hợp lệ. Caller mới thay world cũ.
    return createWorld(config, parsed.edits, current.player);
}
#endif

} // namespace voxel
