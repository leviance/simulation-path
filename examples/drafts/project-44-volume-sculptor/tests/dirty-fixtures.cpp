#include "sculpt_brush.hpp"
#include "sculpt_chunk_inspector.hpp"
#include <iostream>
#include <set>

namespace {
using namespace sculpt;

void requireDirty(bool condition, const char* message) {
    if (!condition)
        throw std::runtime_error(message);
}

// Independent dependency oracle: enumerate chunk cell windows, not sample->chunk division.
std::vector<std::uint32_t> referenceDirty(const GridSpec& grid, const SampleBox& changed) {
    std::vector<std::uint32_t> result;
    if (changed.empty)
        return result;
    const int side = chunksPerAxis(grid);
    for (std::uint32_t id = 0; id < chunkCount(grid); ++id) {
        const std::array<int, 3> coordinate{static_cast<int>(id % side), static_cast<int>((id / side) % side), static_cast<int>(id / (side * side))};
        bool intersects = true;
        for (int axis = 0; axis < 3; ++axis) {
            const int firstCell = coordinate[axis] * 16;
            const int lastCell = std::min(firstCell + 15, grid.samples - 2);
            // A vertex in cell c samples field on [c - 1, c + 2] for its gradient.
            if (changed.high[axis] < firstCell - 1 || changed.low[axis] > lastCell + 2)
                intersects = false;
        }
        if (intersects)
            result.push_back(id);
    }
    return result;
}

void checkDirtyCase(const GridSpec& grid, const SampleBox& changed) {
    requireDirty(dirtyChunks(grid, changed) == referenceDirty(grid, changed), "Dirty chunks omit a geometry/normal dependency or include a wrong chunk");
}
} // namespace

void testDirtyDependencies() {
    using namespace sculpt;
    const GridSpec small{32};
    for (int z = 0; z < 32; ++z)
        for (int y = 0; y < 32; ++y)
            for (int x = 0; x < 32; ++x) {
                SampleBox point;
                point.include(x, y, z);
                checkDirtyCase(small, point);
            }
    const GridSpec large{128};
    const std::array<int, 7> boundaries{0, 14, 15, 16, 17, 63, 127};
    for (int z : boundaries)
        for (int y : boundaries)
            for (int x : boundaries) {
                SampleBox point;
                point.include(x, y, z);
                checkDirtyCase(large, point);
            }
    SampleBox box;
    box.include(15, 30, 47);
    box.include(33, 65, 81);
    checkDirtyCase(large, box);
    checkDirtyCase(large, {});
    box.include(0, 0, 0);
    box.include(127, 127, 127);
    requireDirty(dirtyChunks(large, box).size() == 512, "Full dirty box does not cover all real chunk cells");
    box = {};
    box.include(std::numeric_limits<int>::min(), 0, 0);
    bool rejected = false;
    try {
        dirtyChunks(large, box);
    } catch (const std::invalid_argument&) {
        rejected = true;
    }
    requireDirty(rejected, "Invalid sample box reached halo arithmetic");

    const auto tail = chunkBoxLines(large, 511);
    std::set<std::array<float, 3>> corners;
    for (std::size_t index = 0; index < tail.size(); index += 2) {
        corners.insert(tail[index].position);
        corners.insert(tail[index + 1].position);
        int changingAxes = 0;
        for (int axis = 0; axis < 3; ++axis) {
            const float low = large.origin.x + 112 * large.spacing();
            const float a = tail[index].position[axis], b = tail[index + 1].position[axis];
            requireDirty(std::isfinite(a) && std::isfinite(b) && a >= low - 0.000002F && b >= low - 0.000002F && a <= 1.500002F && b <= 1.500002F, "Tail chunk guide exceeds real sample bounds");
            if (a != b)
                ++changingAxes;
        }
        requireDirty(changingAxes == 1, "Chunk wire box contains a diagonal or a zero-length edge");
    }
    requireDirty(corners.size() == 8, "Chunk inspector does not form a twelve-edge box");
    ChunkInspection inspection;
    const std::array<std::uint32_t, 3> work{0, 7, 511};
    requireDirty(!inspection.chunk(work), "Disabled inspector selected a chunk");
    inspection.enabled = true;
    inspection.selected = 5;
    requireDirty(inspection.chunk(work) == 511U && !inspection.chunk({}), "Inspector did not clamp selection to current work");
    std::cout << "DIRTY DEPENDENCY PASS singleSamples=32768 boundaryCases=343 boxAndEmpty=1 invalidBoundsRejected=1 gradientHalo=1 tailChunkBox=1 inspectorNoGpuMutation=byConstruction\n";
}
