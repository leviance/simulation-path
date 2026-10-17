#include "cache.hpp"
#include "oracle.hpp"
#include "stepper.hpp"
#include <cmath>
#include <cstdlib>
#include <iostream>
#include <string_view>

int failures = 0;

void check(bool condition, std::string_view label) {
    if (!condition) {
        ++failures;
        std::cerr << "FAIL: " << label << '\n';
    }
}

int main() {
    using namespace voxel;
    // Đếm mặt là điều kiện cần; oracle còn kiểm vị trí, hướng và vật liệu.
    const Chunk full = makeChunk(2);
    const Built large = buildGreedy(full, 15);
    check(large.unitFaces == 1536 && large.quads.size() == 6 && large.mesh.size() == 12, "full chunk");
    check(large.samples == 26112, "bounded mask samples");
    check(buildGreedy(makeChunk(3), 15).quads.size() == 12, "closed cavity");
    check(buildGreedy(makeChunk(4), 15).quads.size() == 12288, "checker cannot merge");
    check(buildGreedy(makeChunk(5), 15).quads.empty(), "empty chunk");
    check(buildGreedy(full, 0).quads.size() == 6, "cut has new top face");
    check(buildGreedy(makeChunk(1), 15).unitFaces == 10, "opaque material boundary hidden");
    for (int preset = 0; preset < 9; ++preset) {
        for (int slice : {0, 7, 15}) {
            const Chunk chunk = makeChunk(preset);
            const Chunk copy = chunk;
            const Built greedy = buildGreedy(chunk, slice);
            const Built baseline = buildBaseline(chunk, slice);
            check(verify(chunk, greedy.quads, slice) == baseline.unitFaces, "oracle equality");
            check(chunk == copy, "mesher is read only");
            check(greedy.quads.size() <= baseline.quads.size(), "no extra quads");
        }
    }
    // Kiểm winding độc lập qua tích có hướng, không chỉ nhìn ảnh CPU hai mặt.
    for (std::size_t i = 0; i < large.mesh.size(); ++i) {
        const auto& p = large.mesh[i].points;
        const Vec3 ab{p[1].x - p[0].x, p[1].y - p[0].y, p[1].z - p[0].z};
        const Vec3 ac{p[2].x - p[0].x, p[2].y - p[0].y, p[2].z - p[0].z};
        const std::array<double, 3> n{{ab.y * ac.z - ab.z * ac.y, ab.z * ac.x - ab.x * ac.z, ab.x * ac.y - ab.y * ac.x}};
        const int face = large.quads[i / 2].face;
        double sign = -1;
        if (face % 2 == 0) {
            sign = 1;
        }
        check(n[face / 2] * sign > 0, "outward winding");
        for (const Vec3 vertex : p) {
            check(vertex.x >= 0 && vertex.x <= 16 && vertex.y >= 0 && vertex.y <= 16 && vertex.z >= 0 && vertex.z <= 16, "vertex bounds");
        }
    }
    Mask mask{};
    mask[0] = Block::Stone;
    mask[1] = Block::Stone;
    mask[2] = Block::Grass;
    mask[16] = Block::Stone;
    mask[17] = Block::Stone;
    mask[32] = Block::Stone;
    int comparisons = 0;
    const auto rectangles = extractRectangles(mask, 4, 9, comparisons);
    check(rectangles.size() == 3 && rectangles[0].width == 2 && rectangles[0].height == 2 && rectangles[1].material == Block::Grass, "L shape and material");
    // Cùng ví dụ 4×4 ở bài 04; những ô khác trong mask đều không có mặt.
    const Mask presetMask = makeMask(makeChunk(8), 2, 16, 15);
    Mask teaching{};
    const std::array<std::array<int, 4>, 4> rows{{{{3, 3, 1, 0}}, {{3, 3, 1, 0}}, {{3, 0, 1, 1}}, {{0, 0, 0, 1}}}};
    for (int v = 0; v < 4; ++v) {
        for (int u = 0; u < 4; ++u) {
            teaching[v * side + u] = static_cast<Block>(rows[v][u]);
        }
    }
    check(presetMask == teaching, "runnable preset matches the worked mask");
    const Mask original = teaching;
    const auto worked = extractRectangles(teaching, 2, 16, comparisons);
    const std::array<std::array<int, 5>, 4> expected{{{{0, 0, 2, 2, 3}}, {{2, 0, 1, 3, 1}}, {{0, 2, 1, 1, 3}}, {{3, 2, 1, 2, 1}}}};
    check(worked.size() == expected.size() && teaching == original, "worked mask count and immutable input");
    int area = 0;
    for (std::size_t i = 0; i < std::min(worked.size(), expected.size()); ++i) {
        const auto& r = worked[i];
        check(std::array<int, 5>{r.u, r.v, r.width, r.height, static_cast<int>(r.material)} == expected[i], "worked mask rectangle order");
        area += r.width * r.height;
    }
    check(area == 10, "worked mask covered area");

    bool rejected = false;
    auto duplicate = large.quads;
    duplicate.push_back(duplicate[0]);
    try {
        verify(full, duplicate, 15);
    } catch (const std::runtime_error&) {
        rejected = true;
    }
    check(rejected, "oracle rejects duplicate");
    // Các bộ đếm không tăng khi idle; camera chỉ raster, đổi chunk mới rebuild.
    Cache cache;
    Camera camera;
    refresh(cache, full, 15, true, camera);
    refresh(cache, full, 15, true, camera);
    check(cache.rebuilds == 1 && cache.rasterizations == 1, "idle cache");
    camera.yaw += 0.2;
    cache.frameDirty = true;
    refresh(cache, full, 15, true, camera);
    check(cache.rebuilds == 1 && cache.rasterizations == 2, "camera cache");
    cache.meshDirty = true;
    refresh(cache, full, 15, false, camera);
    check(cache.rebuilds == 2 && cache.rasterizations == 3, "mode cache");
    for (int preset : {2, 3, 6, 7}) {
        for (double yaw : {-1.1, 0.7}) {
            camera.yaw = yaw;
            Frame a, b;
            render(a, buildGreedy(makeChunk(preset), 15).mesh, camera);
            render(b, buildBaseline(makeChunk(preset), 15).mesh, camera);
            bool same = true;
            for (std::size_t i = 0; i < a.depth.size(); ++i) {
                if (std::isfinite(a.depth[i]) != std::isfinite(b.depth[i])) {
                    same = false;
                }
                if (std::isfinite(a.depth[i]) && std::abs(a.depth[i] - b.depth[i]) > 1e-8) {
                    same = false;
                }
            }
            check(same, "raster coverage and depth");
        }
    }
    Stepper stepper;
    stepper.paused = false;
    tick(stepper, 1000, 3);
    check(stepper.count == 0, "clamped playback delta");
    tick(stepper, 0.1, 3);
    check(stepper.count == 1, "one step not unbounded catch up");
    if (failures != 0) {
        return EXIT_FAILURE;
    }
    std::cout << "PASS greedy meshing: oracle, winding, fixtures, raster and cache\n";
    return EXIT_SUCCESS;
}
