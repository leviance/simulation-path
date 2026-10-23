#pragma once
#include "geometry.hpp"

namespace lab {
#if LAB_CHECKPOINT >= 1
// Index nội bộ luôn 0-based; nguồn của triangle được giữ để chẩn đoán.
struct ObjTriangle {
    std::array<std::size_t, 3> indices{};
    std::size_t sourceFace{};
    std::size_t sourceLine{};
};

struct ObjMesh {
    std::vector<Vec3> positions{};
    std::vector<ObjTriangle> triangles{};
};

struct ObjDiagnostic {
    std::size_t line{};
    std::string message{};
};

struct ObjLoadResult {
    ObjMesh mesh{};
    std::vector<ObjDiagnostic> diagnostics{};
    std::size_t sourceFaceCount{};
    std::size_t ignoredRecordCount{};
    bool opened{true};

    [[nodiscard]] bool hasErrors() const {
        return !diagnostics.empty();
    }

    [[nodiscard]] bool hasRenderableMesh() const {
        return opened && !hasErrors() && !mesh.positions.empty() && !mesh.triangles.empty();
    }
};

inline void addDiagnostic(ObjLoadResult& result, std::size_t line, std::string message) {
    result.diagnostics.push_back({line, std::move(message)});
}

#endif

} // namespace lab
