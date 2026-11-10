#pragma once

#include "surface_settings.hpp"

#if LAB_CHECKPOINT >= 8
#include "parametric_mesh.hpp"

#include <charconv>
#include <iomanip>
#include <limits>
#include <locale>
#include <ostream>
#include <string_view>

namespace geometry {

inline constexpr std::size_t maxObjVertices = (maxSegments + 1) * (maxSegments + 1);
inline constexpr std::size_t maxObjIndices = 6 * maxSegments * maxSegments;
inline constexpr std::size_t maxObjBytes = 32 * 1024 * 1024;

template <std::size_t Count>
bool finiteComponents(const std::array<float, Count>& values) {
    for (const float value : values) {
        if (!std::isfinite(value))
            return false;
    }
    return true;
}

inline void validateObjIndices(std::size_t vertices, const std::vector<std::uint32_t>& indices) {
    if (vertices == 0 || vertices > maxObjVertices || indices.empty() ||
        indices.size() > maxObjIndices || indices.size() % 3 != 0) {
        throw std::invalid_argument("OBJ mesh counts are outside workshop limits");
    }
    for (std::size_t face = 0; face < indices.size(); face += 3) {
        const auto a = indices[face];
        const auto b = indices[face + 1];
        const auto c = indices[face + 2];
        if (a >= vertices || b >= vertices || c >= vertices || a == b || b == c || a == c) {
            throw std::invalid_argument("OBJ triangle has invalid indices");
        }
    }
}

inline void writeObj(std::ostream& output, const Mesh& mesh) {
    validateObjIndices(mesh.vertices.size(), mesh.indices);
    for (const Vertex& vertex : mesh.vertices) {
        if (!finiteComponents(vertex.position) || !finiteComponents(vertex.uv) ||
            !finiteComponents(vertex.normal)) {
            throw std::invalid_argument("OBJ cannot represent non-finite vertex attributes");
        }
    }

    output.imbue(std::locale::classic());
    output << std::defaultfloat << std::setprecision(std::numeric_limits<float>::max_digits10);
    output << "# Simulation Path Geometry Workshop\n";
    for (const Vertex& vertex : mesh.vertices) {
        output << "v " << vertex.position[0] << ' ' << vertex.position[1] << ' ' << vertex.position[2] << '\n';
    }
    for (const Vertex& vertex : mesh.vertices) {
        output << "vt " << vertex.uv[0] << ' ' << vertex.uv[1] << '\n';
    }
    for (const Vertex& vertex : mesh.vertices) {
        output << "vn " << vertex.normal[0] << ' ' << vertex.normal[1] << ' ' << vertex.normal[2] << '\n';
    }
    // OBJ has separate attribute indices. Our duplicated seams give each vertex one full attribute tuple.
    for (std::size_t face = 0; face < mesh.indices.size(); face += 3) {
        output << 'f';
        for (std::size_t corner = 0; corner < 3; ++corner) {
            const std::uint32_t index = mesh.indices[face + corner] + 1;
            output << ' ' << index << '/' << index << '/' << index;
        }
        output << '\n';
    }
    if (!output)
        throw std::runtime_error("Could not finish writing OBJ");
}

struct ObjMesh {
    std::vector<std::array<float, 3>> positions;
    std::vector<std::array<float, 2>> uv;
    std::vector<std::array<float, 3>> normals;
    std::vector<std::uint32_t> indices;
};

// Tokens are views into one bounded line, so a large mesh does not allocate a stream per record.
struct ObjLine {
    std::string_view remaining;

    std::string_view next() {
        const std::size_t first = remaining.find_first_not_of(" \t\r");
        if (first == std::string_view::npos) {
            remaining = {};
            return {};
        }
        remaining.remove_prefix(first);
        const std::size_t end = remaining.find_first_of(" \t\r");
        const std::string_view token = remaining.substr(0, end);
        remaining.remove_prefix(token.size());
        return token;
    }
};

template <std::size_t Count>
std::array<float, Count> readObjComponents(ObjLine& line) {
    std::array<float, Count> values{};
    for (float& value : values) {
        const std::string_view token = line.next();
        if (token.empty())
            throw std::invalid_argument("OBJ attribute is missing");
        const auto parsed = std::from_chars(token.data(), token.data() + token.size(), value);
        if (parsed.ec != std::errc{} || parsed.ptr != token.data() + token.size() || !std::isfinite(value)) {
            throw std::invalid_argument("OBJ attributes must be finite numbers");
        }
    }
    if (!line.next().empty())
        throw std::invalid_argument("OBJ attribute has extra components");
    return values;
}

inline std::uint32_t readObjIndex(std::string_view text) {
    if (text.empty())
        throw std::invalid_argument("OBJ index is missing");
    std::uint32_t index{};
    const auto result = std::from_chars(text.data(), text.data() + text.size(), index);
    if (result.ec != std::errc{} || result.ptr != text.data() + text.size() || index == 0) {
        throw std::invalid_argument("OBJ indices must be positive integers");
    }
    return index;
}

inline std::uint32_t readObjCorner(std::string_view text) {
    const std::size_t slash = text.find('/');
    if (slash == std::string_view::npos)
        throw std::invalid_argument("OBJ face is missing UV and normal");
    const std::size_t second = text.find('/', slash + 1);
    if (second == std::string_view::npos)
        throw std::invalid_argument("OBJ face is missing a normal");
    const std::uint32_t position = readObjIndex(text.substr(0, slash));
    const std::uint32_t uv = readObjIndex(text.substr(slash + 1, second - slash - 1));
    const std::uint32_t normal = readObjIndex(text.substr(second + 1));
    if (position != uv || position != normal) {
        throw std::invalid_argument("Expected the workshop OBJ subset with matching attribute indices");
    }
    return position - 1;
}

// An independent, bounded reader for our exported v/vt/vn triangle subset, not a general OBJ importer.
inline ObjMesh readWorkshopObj(std::string_view source) {
    if (source.size() > maxObjBytes)
        throw std::invalid_argument("OBJ text exceeds 32 MiB");
    ObjMesh mesh;
    while (!source.empty()) {
        const std::size_t end = source.find('\n');
        const std::string_view text = source.substr(0, end);
        if (end == std::string_view::npos)
            source = {};
        else
            source.remove_prefix(end + 1);
        if (text.size() > 256)
            throw std::invalid_argument("OBJ line exceeds workshop limit");
        ObjLine line{text};
        const std::string_view tag = line.next();
        if (tag.empty() || tag.starts_with('#'))
            continue;
        if (tag == "v") {
            if (mesh.positions.size() >= maxObjVertices)
                throw std::invalid_argument("Too many OBJ positions");
            mesh.positions.push_back(readObjComponents<3>(line));
        } else if (tag == "vt") {
            if (mesh.uv.size() >= maxObjVertices)
                throw std::invalid_argument("Too many OBJ UVs");
            mesh.uv.push_back(readObjComponents<2>(line));
        } else if (tag == "vn") {
            if (mesh.normals.size() >= maxObjVertices)
                throw std::invalid_argument("Too many OBJ normals");
            mesh.normals.push_back(readObjComponents<3>(line));
        } else if (tag == "f") {
            if (mesh.indices.size() >= maxObjIndices)
                throw std::invalid_argument("Too many OBJ triangles");
            for (int corner = 0; corner < 3; ++corner) {
                const std::string_view token = line.next();
                if (token.empty())
                    throw std::invalid_argument("OBJ face needs three corners");
                mesh.indices.push_back(readObjCorner(token));
            }
            if (!line.next().empty())
                throw std::invalid_argument("Only OBJ triangles are supported");
        } else {
            throw std::invalid_argument("Unsupported workshop OBJ line");
        }
    }
    if (mesh.positions.size() != mesh.uv.size() || mesh.positions.size() != mesh.normals.size()) {
        throw std::invalid_argument("OBJ positions, UVs and normals do not match");
    }
    validateObjIndices(mesh.positions.size(), mesh.indices);
    return mesh;
}

} // namespace geometry
#endif
