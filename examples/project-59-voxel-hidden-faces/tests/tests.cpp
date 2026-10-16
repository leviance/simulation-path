#include "audit.hpp"
#include "inspection.hpp"
#include <cstdlib>
#include <iostream>
#include <string_view>

namespace {
int failures = 0;

// Runner tường minh để CTest vẫn phát hiện lỗi ở Release/NDEBUG.
void check(bool condition, std::string_view label) {
    if (!condition) {
        ++failures;
        std::cerr << "FAIL: " << label << '\n';
    }
}

std::set<voxel::FaceKey> planeOracle(const voxel::Chunk& chunk, int top) {
    std::set<voxel::FaceKey> result;
    // Quét từng mặt phẳng giữa hai ô, không dùng offsets/keepFace của mesher.
    for (int axis = 0; axis < 3; ++axis) {
        for (int plane = 0; plane <= 16; ++plane) {
            for (int u = 0; u < 16; ++u) {
                for (int v = 0; v < 16; ++v) {
                    std::array<int, 3> positive{};
                    positive[axis] = plane;
                    positive[(axis + 1) % 3] = u;
                    positive[(axis + 2) % 3] = v;
                    auto negative = positive;
                    --negative[axis];
                    const auto occupied = [&](const auto& p) {
                        if (!voxel::inside(p[0], p[1], p[2]) || p[1] > top) {
                            return false;
                        }
                        return voxel::get(chunk, p[0], p[1], p[2]) != voxel::Block::Air;
                    };
                    const bool a = occupied(negative);
                    const bool b = occupied(positive);
                    if (a == b) {
                        continue;
                    }
                    auto source = positive;
                    int face = axis * 2 + 1;
                    if (a) {
                        source = negative;
                        face = axis * 2;
                    }
                    result.insert({source[0], source[1], source[2], face});
                }
            }
        }
    }
    return result;
}
} // namespace

int main() {
    using namespace voxel;
    try {
        audit();
        for (int preset = 0; preset < 7; ++preset) {
            const auto chunk = makeChunk(preset);
            for (int slice : {0, 7, 15}) {
                const auto result = buildMesh(chunk, true, slice);
                check(std::set<FaceKey>(result.keys.begin(), result.keys.end()) == planeOracle(chunk, slice), "oriented faces match plane oracle");
            }
        }
        for (int seed = 0; seed < 5; ++seed) {
            Chunk pattern{};
            for (int y = 0; y < 16; ++y) {
                for (int z = 0; z < 16; ++z) {
                    for (int x = 0; x < 16; ++x) {
                        if ((x * 73 + y * 151 + z * 199 + seed * 101) % 17 < 5) {
                            set(pattern, x, y, z, Block::Dirt);
                        }
                    }
                }
            }
            const auto result = buildMesh(pattern, true, 9);
            check(std::set<FaceKey>(result.keys.begin(), result.keys.end()) == planeOracle(pattern, 9), "sparse patterned chunk face set");
        }

        // Cả hai phía vật liệu opaque che nhau, cạnh/góc chạm không che mặt.
        const auto pair = buildMesh(makeChunk(1), true, 15);
        const std::set<FaceKey> pairKeys(pair.keys.begin(), pair.keys.end());
        check(!pairKeys.contains({7, 7, 7, 0}) && !pairKeys.contains({8, 7, 7, 1}), "both shared faces removed across materials");
        Chunk diagonal{};
        set(diagonal, 0, 0, 0, Block::Stone);
        set(diagonal, 1, 1, 0, Block::Grass);
        check(buildMesh(diagonal, true, 15).keys.size() == 12, "diagonal is not face adjacency");
        for (int face = 0; face < 6; ++face) {
            const auto q = faces.at(face);
            const Vec3 a{q[1].x - q[0].x, q[1].y - q[0].y, q[1].z - q[0].z};
            const Vec3 b{q[2].x - q[0].x, q[2].y - q[0].y, q[2].z - q[0].z};
            const Vec3 n{a.y * b.z - a.z * b.y, a.z * b.x - a.x * b.z, a.x * b.y - a.y * b.x};
            const auto d = offsets.at(face);
            check(n.x == d[0] && n.y == d[1] && n.z == d[2], "winding agrees with neighbor direction");
        }
        const auto full = makeChunk(2);
        const auto bottom = buildMesh(full, true, 0);
        check(bottom.solid == 256 && bottom.keys.size() == 576 && bottom.mesh.size() == 1152, "slab dimensions 16x1x16");
        check(inspectFace(full, {8, 0, 8}, 2, 0).find("above display cut") != std::string::npos, "cut cap reason");
        check(inspectFace(full, {15, 7, 7}, 0, 15).find("outside isolated chunk") != std::string::npos, "outside boundary reason");
        check(pickCell(660, 60, 7).value() == std::array<int, 3>{0, 7, 0}, "grid logical origin");
        check(!pickCell(916, 60, 7).has_value() && !pickCell(660, 316, 7).has_value(), "half-open grid boundaries");

        // Camera thay đổi không được dựng lại mesh; geometry change phải tạo ảnh mới.
        SceneCache cache;
        Camera camera;
        update(cache, full, true, 15, camera);
        check(cache.rebuilds == 1 && cache.rasterizations == 1, "initial cache build");
        check(!update(cache, full, true, 15, camera), "idle does no work");
        orbit(camera, 8, 0);
        cache.frameDirty = true;
        update(cache, full, true, 15, camera);
        check(cache.rebuilds == 1 && cache.rasterizations == 2, "camera only rasterizes");
        cache.meshDirty = true;
        update(cache, full, true, 0, camera);
        check(cache.rebuilds == 2 && cache.rasterizations == 3, "mesh rebuild invalidates frame");

        for (int preset : {2, 3, 6}) {
            const auto chunk = makeChunk(preset);
            const auto before = chunk;
            for (double yaw : {-0.8, 0.7}) {
                camera.yaw = yaw;
                Frame baseline;
                Frame culled;
                render(baseline, buildMesh(chunk, false, 7).mesh, camera);
                render(culled, buildMesh(chunk, true, 7).mesh, camera);
                bool same = true;
                int coverage = 0;
                for (std::size_t i = 0; i < baseline.depth.size(); ++i) {
                    if (std::isfinite(baseline.depth[i])) {
                        ++coverage;
                        if (!std::isfinite(culled.depth[i]) || std::abs(baseline.depth[i] - culled.depth[i]) > 1e-8) {
                            same = false;
                        }
                    } else if (std::isfinite(culled.depth[i])) {
                        same = false;
                    }
                }
                check(same && coverage > 1000, "surface coverage/depth matches baseline");
            }
            check(chunk == before, "render does not edit chunk");
        }
    } catch (const std::exception& error) {
        check(false, error.what());
    }
    if (failures != 0) {
        return EXIT_FAILURE;
    }
    std::cout << "Project59 PASS: fixtures, planes, winding, cuts, cache, depth\n";
    return EXIT_SUCCESS;
}
