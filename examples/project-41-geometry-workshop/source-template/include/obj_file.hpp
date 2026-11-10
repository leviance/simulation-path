#pragma once

#include "surface_settings.hpp"

#if LAB_CHECKPOINT >= 8
#include "obj_mesh.hpp"

#include <filesystem>
#include <fstream>
#include <string>

namespace geometry {

inline ObjMesh readWorkshopObjFile(const std::filesystem::path& path) {
    std::ifstream input(path, std::ios::binary | std::ios::ate);
    if (!input)
        throw std::runtime_error("Could not reopen OBJ");
    const auto end = input.tellg();
    if (end <= 0 || end > static_cast<std::streamoff>(maxObjBytes)) {
        throw std::invalid_argument("OBJ file size is outside workshop limits");
    }
    std::string contents(static_cast<std::size_t>(end), '\0');
    input.seekg(0);
    input.read(contents.data(), static_cast<std::streamsize>(contents.size()));
    if (!input)
        throw std::runtime_error("Could not read the complete OBJ file");
    return readWorkshopObj(contents);
}

inline void verifyObjCopy(const Mesh& mesh, const ObjMesh& imported) {
    if (mesh.vertices.size() != imported.positions.size() || mesh.vertices.size() != imported.uv.size() ||
        mesh.vertices.size() != imported.normals.size() || mesh.indices != imported.indices) {
        throw std::runtime_error("OBJ read-back did not preserve mesh topology");
    }
    for (std::size_t index = 0; index < mesh.vertices.size(); ++index) {
        const Vertex& vertex = mesh.vertices[index];
        if (vertex.position != imported.positions[index] || vertex.uv != imported.uv[index] ||
            vertex.normal != imported.normals[index]) {
            throw std::runtime_error("OBJ read-back did not preserve vertex attributes");
        }
    }
}

inline std::filesystem::path exportVerifiedObj(const Mesh& mesh, const std::filesystem::path& newDirectory) {
    // A fresh directory is an exclusive destination: never overwrite an earlier export.
    if (!std::filesystem::create_directory(newDirectory)) {
        throw std::runtime_error("Export needs a new, unused directory");
    }
    const auto temporary = newDirectory / "geometry.obj.part";
    const auto destination = newDirectory / "geometry.obj";
    {
        std::ofstream output(temporary, std::ios::binary);
        if (!output)
            throw std::runtime_error("Could not open OBJ destination");
        writeObj(output, mesh);
        output.close();
        if (!output)
            throw std::runtime_error("Could not close the complete OBJ file");
    }
    const ObjMesh imported = readWorkshopObjFile(temporary);
    verifyObjCopy(mesh, imported);
    std::filesystem::rename(temporary, destination);
    return destination;
}

} // namespace geometry
#endif
