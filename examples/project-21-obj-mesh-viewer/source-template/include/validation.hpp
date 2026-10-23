#pragma once
#include "render.hpp"

namespace lab {
#if LAB_CHECKPOINT >= 8
// Validation không phụ thuộc SDL nên có thể chạy cả trong CTest Release.
struct MeshValidation {
    std::size_t invalidIndexCount{};
    std::size_t degenerateTriangleCount{};

    [[nodiscard]] bool valid() const {
        return invalidIndexCount == 0 && degenerateTriangleCount == 0;
    }
};

inline MeshValidation validateMesh(const ObjMesh& mesh) {
    MeshValidation result{};
    for (const ObjTriangle& triangle : mesh.triangles) {
        bool indicesValid = true;
        for (const std::size_t index : triangle.indices) {
            if (index >= mesh.positions.size()) {
                ++result.invalidIndexCount;
                indicesValid = false;
            }
        }
        if (!indicesValid) {
            continue;
        }
        if (!faceNormal(
                mesh.positions[triangle.indices[0]],
                mesh.positions[triangle.indices[1]],
                mesh.positions[triangle.indices[2]]
            )) {
            ++result.degenerateTriangleCount;
        }
    }
    return result;
}
#endif

} // namespace lab
