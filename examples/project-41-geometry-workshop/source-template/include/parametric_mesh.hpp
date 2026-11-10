#pragma once

#include "parametric_surfaces.hpp"
#include "surface_settings.hpp"
#if LAB_CHECKPOINT >= 5
#include "sweep_frames.hpp"
#endif

#include <algorithm>
#include <array>
#include <cstddef>
#include <cstdint>
#include <utility>
#include <vector>

namespace geometry {

enum class BuildState { building,
                        ready,
                        cancelled,
                        taken };

inline constexpr int maxRowsPerBatch = 8;

struct Vertex {
    std::array<float, 3> position;
    std::array<float, 3> normal;
    std::array<float, 3> tangent;
    std::array<float, 2> uv;
};

struct Mesh {
    SurfaceSettings settings;
    std::vector<Vertex> vertices;
    std::vector<std::uint32_t> indices;

    std::size_t payloadBytes() const {
        return vertices.size() * sizeof(Vertex) + indices.size() * sizeof(std::uint32_t);
    }
};

inline std::array<float, 3> vertexVector(Vec3 v) {
    return {static_cast<float>(v.x), static_cast<float>(v.y), static_cast<float>(v.z)};
}

#if LAB_CHECKPOINT >= 2
inline void appendGridCell(std::vector<std::uint32_t>& indices, std::uint32_t a, std::uint32_t b, std::uint32_t c, std::uint32_t d) {
    // Go along v, then u. Both triangles agree with cross(tangentV, tangentU).
    indices.push_back(a);
    indices.push_back(b);
    indices.push_back(c);

    indices.push_back(b);
    indices.push_back(d);
    indices.push_back(c);
}
#endif

class MeshBuild {
    public:
    explicit MeshBuild(const SurfaceSettings& settings) {
        validateSettings(settings);
        mesh_.settings = settings;
#if LAB_CHECKPOINT >= 5
        if (usesSweep(settings.kind))
            frames_ = buildSweepFrames(settings);
#endif

        // Validate subdivision bounds before multiplying sizes or reserving buffers.
        const auto uCount = static_cast<std::size_t>(settings.uSegments);
        const auto vCount = static_cast<std::size_t>(settings.vSegments);
        mesh_.vertices.reserve((uCount + 1) * (vCount + 1));
        mesh_.indices.reserve(6 * uCount * vCount);
    }

    BuildState state() const {
        return state_;
    }

    int completedRows() const {
        return nextRow_;
    }

    void advance(int requestedRows = maxRowsPerBatch) {
        if (state_ != BuildState::building)
            return;
        const int rows = std::clamp(requestedRows, 0, maxRowsPerBatch);
        const int end = std::min(nextRow_ + rows, mesh_.settings.uSegments + 1);
        while (nextRow_ < end) {
            appendRow(nextRow_);
            ++nextRow_;
        }
        if (nextRow_ == mesh_.settings.uSegments + 1)
            state_ = BuildState::ready;
    }

    void cancel() {
        if (state_ == BuildState::taken || state_ == BuildState::cancelled)
            return;
        mesh_ = {};
#if LAB_CHECKPOINT >= 5
        frames_.clear();
#endif
        state_ = BuildState::cancelled;
    }

    Mesh takeMesh() {
        if (state_ != BuildState::ready) {
            throw std::logic_error("Only a complete candidate mesh can replace the current mesh");
        }
        state_ = BuildState::taken;
        return std::move(mesh_);
    }

    private:
    Mesh mesh_;
#if LAB_CHECKPOINT >= 5
    std::vector<SweepFrame> frames_;
#endif
    BuildState state_{BuildState::building};
    int nextRow_{};

    SurfaceSample sampleVertex(int row, int column, double u, double v) const {
#if LAB_CHECKPOINT < 3
        (void)row;
        (void)column;
#endif
#if LAB_CHECKPOINT >= 1
        const SurfaceSettings& settings = mesh_.settings;
        if (settings.kind == SurfaceKind::patch)
            return samplePatch(u, v, settings.patchHeight);
#else
        (void)u;
        (void)v;
#endif
#if LAB_CHECKPOINT >= 3
        double angleV = fullTurn * v;
        if (column == settings.vSegments)
            angleV = 0.0;
#if LAB_CHECKPOINT >= 5
        if (usesSweep(settings.kind)) {
            return sampleSweep(frames_, row, angleV, settings.kind == SurfaceKind::knot);
        }
#endif
        const bool lastRow = row == settings.uSegments;
        double angleU = fullTurn * u;
        if (lastRow)
            angleU = 0.0;

        if (settings.kind == SurfaceKind::torus) {
            return sampleTorus(angleU, angleV, settings.radius, settings.thickness);
        }
#endif

#if LAB_CHECKPOINT >= 4
        // Duplicate the seam for UVs. The last strip row meets the first in reverse order.
        if (settings.kind == SurfaceKind::mobius) {
            double stripV = v;
            if (lastRow)
                stripV = static_cast<double>(settings.vSegments - column) / settings.vSegments;
            const double offset = settings.thickness * (2.0 * stripV - 1.0);
            SurfaceSample sample = sampleMobius(angleU, offset, settings.radius, settings.halfTwists);
            if (lastRow)
                sample.tangentV = sample.tangentV * -1.0;
            return sample;
        }
#endif
        throw std::logic_error("No evaluator for this checkpoint");
    }

    void appendRow(int row) {
        const SurfaceSettings& settings = mesh_.settings;
        const double u = static_cast<double>(row) / settings.uSegments;
        for (int column = 0; column <= settings.vSegments; ++column) {
            const double v = static_cast<double>(column) / settings.vSegments;
            const SurfaceSample sample = sampleVertex(row, column, u, v);
            mesh_.vertices.push_back({
                vertexVector(sample.position),
                vertexVector(surfaceNormal(sample)),
                vertexVector(unit(sample.tangentU)),
                {static_cast<float>(u), static_cast<float>(v)},
            });
        }
        if (row == 0)
            return;

        // Both rows now exist. Each grid cell emits two triangles without indexing beyond them.
        const auto columns = static_cast<std::uint32_t>(settings.vSegments + 1);
        const auto previousRow = static_cast<std::uint32_t>(row - 1) * columns;
        for (std::uint32_t column = 0; column + 1 < columns; ++column) {
            const std::uint32_t a = previousRow + column;
            const std::uint32_t b = a + 1;
            const std::uint32_t c = a + columns;
            const std::uint32_t d = c + 1;
#if LAB_CHECKPOINT >= 2
            appendGridCell(mesh_.indices, a, b, c, d);
#else
            mesh_.indices.insert(mesh_.indices.end(), {a, b, c, b, d, c});
#endif
        }
    }
};

} // namespace geometry
