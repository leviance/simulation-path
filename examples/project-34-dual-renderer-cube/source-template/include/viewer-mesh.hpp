#pragma once
#include "obj21/normalize.hpp"
#include "obj21/obj-parser.hpp"
#include "pipeline.hpp"
#include <map>
#include <stdexcept>
#include <type_traits>

namespace lab {
#if LAB_CHECKPOINT >= 2
// Position and a flat normal are shared by both renderers. An OBJ position can
// require several GPU vertices where adjacent faces have different normals.
struct MeshVertex {
    float positionX{}, positionY{}, positionZ{};
    float normalX{}, normalY{}, normalZ{};
};

static_assert(std::is_standard_layout_v<MeshVertex>);
static_assert(sizeof(MeshVertex) == 6 * sizeof(float));
static_assert(offsetof(MeshVertex, normalX) == 3 * sizeof(float));

struct ViewerMesh {
    obj21::ObjMesh source{};
    std::vector<MeshVertex> vertices{};
    std::vector<std::uint32_t> indices{};
    std::string name{};

    std::size_t triangleCount() const {
        return indices.size() / 3;
    }
};

inline bool validViewerMesh(const ViewerMesh& mesh) {
    if (mesh.vertices.empty() || mesh.indices.empty() || mesh.indices.size() % 3 != 0)
        return false;
    for (std::uint32_t index : mesh.indices) {
        if (index >= mesh.vertices.size())
            return false;
    }
    for (const auto& vertex : mesh.vertices) {
        const std::array<float, 6> fields{vertex.positionX, vertex.positionY, vertex.positionZ, vertex.normalX, vertex.normalY, vertex.normalZ};
        for (float field : fields) {
            if (!std::isfinite(field))
                return false;
        }
        const float squaredNormal = vertex.normalX * vertex.normalX + vertex.normalY * vertex.normalY + vertex.normalZ * vertex.normalZ;
        if (std::abs(squaredNormal - 1) > 1e-5F)
            return false;
    }
    return true;
}

inline ViewerMesh prepareViewerMesh(obj21::ObjMesh source, const std::string& name) {
    if (source.triangles.size() > 400'000 || !obj21::normalizeMesh(source)) {
        throw std::invalid_argument("Invalid mesh bounds or triangle budget");
    }
    ViewerMesh result{};
    result.name = name;
    std::map<std::array<float, 6>, std::uint32_t> uniqueVertices;
    for (const auto& triangle : source.triangles) {
        for (std::size_t index : triangle.indices) {
            if (index >= source.positions.size())
                throw std::invalid_argument("OBJ index outside positions");
        }
        const auto a = source.positions[triangle.indices[0]];
        const auto b = source.positions[triangle.indices[1]];
        const auto c = source.positions[triangle.indices[2]];
        const auto normal = obj21::normalized(obj21::cross(b - a, c - a));
        if (!normal)
            continue;
        for (std::size_t index : triangle.indices) {
            const auto point = source.positions[index];
            const std::array<float, 6> key{float(point.x), float(point.y), float(point.z), float(normal->x), float(normal->y), float(normal->z)};
            const auto found = uniqueVertices.find(key);
            if (found != uniqueVertices.end()) {
                result.indices.push_back(found->second);
            } else {
                const auto vertexIndex = static_cast<std::uint32_t>(result.vertices.size());
                result.vertices.push_back({key[0], key[1], key[2], key[3], key[4], key[5]});
                result.indices.push_back(vertexIndex);
                uniqueVertices.emplace(key, vertexIndex);
            }
        }
    }
    result.source = std::move(source);
    if (!validViewerMesh(result))
        throw std::invalid_argument("Mesh has no valid drawable triangles");
    return result;
}

// Parse/normalize into temporary data. The caller replaces its current mesh
// only after success, so a bad file cannot destroy the model on screen.
inline std::optional<ViewerMesh> loadViewerMesh(const std::string& path, std::string& diagnostics) {
    obj21::ObjLoadResult loaded = obj21::loadObjFile(path);
    if (!loaded.hasRenderableMesh()) {
        diagnostics = path + ": ";
        for (const auto& error : loaded.diagnostics) {
            diagnostics += "line " + std::to_string(error.line) + ": " + error.message + "; ";
        }
        if (loaded.diagnostics.empty())
            diagnostics += "no supported faces";
        return std::nullopt;
    }
    try {
        const auto nativePath = std::filesystem::path(std::u8string(path.begin(), path.end()));
        const auto utf8Name = nativePath.stem().u8string();
        auto result = prepareViewerMesh(std::move(loaded.mesh), std::string(utf8Name.begin(), utf8Name.end()));
        diagnostics.clear();
        return result;
    } catch (const std::exception& error) {
        diagnostics = path + ": " + error.what();
        return std::nullopt;
    }
}
#endif
} // namespace lab
