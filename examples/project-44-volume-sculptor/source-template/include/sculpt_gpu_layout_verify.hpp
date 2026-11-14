#pragma once

#include "sculpt_gpu_mesh.hpp"
#include "sculpt_topology.hpp"
#include <bit>
#include <iostream>
#include <map>

namespace sculpt {

using PositionKey = std::array<std::uint32_t, 3>;

inline PositionKey positionKey(Vec3 point) {
    PositionKey result;
    const std::array<float, 3> values{point.x, point.y, point.z};
    for (int axis = 0; axis < 3; ++axis) {
        float value = values[axis];
        if (value == 0)
            value = 0;
        result[axis] = std::bit_cast<std::uint32_t>(value);
    }
    return result;
}

// Deliberately small independent CPU extraction oracle, never used by runtime remeshing.
inline void verifyGpuLayout(const GpuMeshBuilder& model) {
    if (!model.ready() || model.settings().grid.samples > 64)
        throw std::invalid_argument("The CPU/GPU topology oracle is limited to at most 64 samples");
    ScalarGrid reference(model.settings().grid);
    std::vector<float> values;
    for (std::size_t first = 0; first < reference.spec().sampleCount(); first += 65536) {
        const auto part = model.readField(first, std::min<std::size_t>(65536, reference.spec().sampleCount() - first));
        values.insert(values.end(), part.begin(), part.end());
    }
    reference.replaceValues(values);
    const int side = chunksPerAxis(reference.spec());
    std::map<std::array<PositionKey, 2>, unsigned> edgeOwners;
    std::uint64_t checkedCells = 0, checkedVertices = 0;
    for (std::size_t chunk = 0; chunk < model.active().size(); ++chunk) {
        const auto layout = model.readChunkLayout(chunk);
        const auto emitted = model.readChunk(chunk);
        std::uint32_t prefix = 0;
        const int chunkX = static_cast<int>(chunk % side) * 16;
        const int chunkY = static_cast<int>((chunk / side) % side) * 16;
        const int chunkZ = static_cast<int>(chunk / (side * side)) * 16;
        for (std::size_t local = 0; local < cellsPerChunk; ++local) {
            const int x = chunkX + static_cast<int>(local % 16);
            const int y = chunkY + static_cast<int>((local / 16) % 16);
            const int z = chunkZ + static_cast<int>(local / 256);
            CellTriangles expected;
            if (x < reference.spec().samples - 1 && y < reference.spec().samples - 1 && z < reference.spec().samples - 1) {
                expected = polygonizeCell(reference, x, y, z, model.settings().isovalue);
                ++checkedCells;
            }
            if (layout[0][local] != expected.count * 3 || layout[1][local] != prefix)
                throw std::runtime_error("GPU per-cell count or exclusive prefix differs from CPU topology oracle");
            for (std::uint32_t triangle = 0; triangle < expected.count; ++triangle) {
                for (unsigned vertex = 0; vertex < 3; ++vertex) {
                    const auto& actual = emitted.at(prefix + triangle * 3 + vertex);
                    const auto point = expected.triangles[triangle].vertices[vertex].point;
                    if (length(positionOf(actual) - point) > 0.000002F)
                        throw std::runtime_error("GPU emit order/position differs from independently executed CPU topology");
                }
            }
            prefix += expected.count * 3;
        }
        if (prefix != emitted.size())
            throw std::runtime_error("GPU prefix does not cover the exact allocated mesh");
        checkedVertices += prefix;
        for (std::size_t first = 0; first < emitted.size(); first += 3) {
            for (unsigned edge = 0; edge < 3; ++edge) {
                std::array<PositionKey, 2> key{positionKey(positionOf(emitted[first + edge])), positionKey(positionOf(emitted[first + (edge + 1) % 3]))};
                if (key[1] < key[0])
                    std::swap(key[0], key[1]);
                ++edgeOwners[key];
            }
        }
    }
    // This fixture uses an interior sphere; unlike an intentionally clipped plane, it must be closed.
    for (const auto& [edge, owners] : edgeOwners)
        if (owners != 2)
            throw std::runtime_error("GPU closed-sphere mesh has a crack or a nonmanifold edge");
    std::cout << "GPU LAYOUT PASS oracleCells=" << checkedCells << " emittedVertices=" << checkedVertices << " exactPrefixes=1 closedEdges=" << edgeOwners.size() << " canonicalCoordinates=bitExact\n";
}

} // namespace sculpt
