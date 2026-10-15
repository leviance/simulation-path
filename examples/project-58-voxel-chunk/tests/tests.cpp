#include "audit.hpp"
#include "inspector.hpp"
#include <cstdlib>
#include <iostream>
#include <string_view>

namespace {
int failures = 0;

// CTest phải nhận exit code lỗi ở cả Debug lẫn Release.
void check(bool condition, std::string_view label) {
    if (!condition) {
        ++failures;
        std::cerr << "FAIL: " << label << '\n';
    }
}
} // namespace

int main() {
    try {
        // Duyệt toàn bộ miền để chứng minh ánh xạ không trùng và không vượt mảng.
        std::array<bool, voxel::capacity> visited{};
        for (int y = 0; y < 16; ++y) {
            for (int z = 0; z < 16; ++z) {
                for (int x = 0; x < 16; ++x) {
                    const int i = voxel::index(x, y, z);
                    voxel::check(!visited.at(i), "duplicate index");
                    visited.at(i) = true;
                }
            }
        }
        voxel::check(voxel::index(15, 15, 15) == 4095, "last index");
        voxel::check(voxel::index(1, 0, 0) == 1 && voxel::index(0, 0, 1) == 16 && voxel::index(0, 1, 0) == 256, "published axis strides");
        for (auto p : std::array<std::array<int, 3>, 6>{{{-1, 0, 0}, {16, 0, 0}, {0, -1, 0}, {0, 16, 0}, {0, 0, -1}, {0, 0, 16}}}) {
            bool rejected = false;
            try {
                voxel::index(p[0], p[1], p[2]);
            } catch (const std::out_of_range&) {
                rejected = true;
            }
            voxel::check(rejected, "bounds rejection");
        }

        // Hai cube kề nhau vẫn có 24 triangles, chưa loại mặt chung ở Project 58.
        voxel::Chunk pair{};
        voxel::set(pair, 0, 0, 0, voxel::Block::Stone);
        voxel::set(pair, 1, 0, 0, voxel::Block::Grass);
        voxel::check(voxel::buildMesh(pair).size() == 24, "no hidden face elimination yet");
        voxel::check(voxel::solidCount(voxel::makeChunk(2)) == 1408, "steps fixture");
        const auto steps = voxel::makeChunk(2);
        voxel::check(voxel::get(steps, 0, 0, 0) == voxel::Block::Stone, "bottom Stone");
        voxel::check(voxel::get(steps, 0, 2, 0) == voxel::Block::Dirt, "two Dirt layers under Grass");
        voxel::check(voxel::get(steps, 0, 3, 0) == voxel::Block::Grass, "top Grass");
        voxel::check(voxel::get(steps, 0, 4, 0) == voxel::Block::Air, "height is exclusive");
        for (const auto& triangle : voxel::buildMesh(voxel::makeChunk(1))) {
            for (const auto& vertex : triangle.points) {
                voxel::check(vertex.x >= 0 && vertex.x <= 16 && vertex.y >= 0 && vertex.y <= 16 && vertex.z >= 0 && vertex.z <= 16, "mesh world bounds");
            }
        }
        const auto before = pair;
        voxel::buildMesh(pair, 0);
        voxel::check(pair == before, "mesh must not mutate data");
        const std::array<voxel::Vec3, 6> normals{{{1, 0, 0}, {-1, 0, 0}, {0, 1, 0}, {0, -1, 0}, {0, 0, 1}, {0, 0, -1}}};
        for (int face = 0; face < 6; ++face) {
            const auto q = voxel::faces.at(face);
            const voxel::Vec3 a{q[1].x - q[0].x, q[1].y - q[0].y, q[1].z - q[0].z};
            const voxel::Vec3 b{q[2].x - q[0].x, q[2].y - q[0].y, q[2].z - q[0].z};
            const voxel::Vec3 n{a.y * b.z - a.z * b.y, a.z * b.x - a.x * b.z, a.x * b.y - a.y * b.x};
            const auto expected = normals.at(face);
            voxel::check(n.x == expected.x && n.y == expected.y && n.z == expected.z, "outward winding");
        }

        // Kiểm camera, picking half-open và depth mà không mở cửa sổ SDL.
        voxel::Camera camera;
        const auto center = voxel::project({8, 8, 8}, camera);
        voxel::check(center.x == 160 && center.y == 120 && center.depth == 0, "projection center");
        voxel::orbit(camera, 1e5, 1e5);
        voxel::zoom(camera, 100);
        voxel::check(camera.pitch == 1.2 && camera.zoom == 1.5, "camera bounds");
        voxel::check(voxel::pickCell(660, 60, 0).value() == std::array<int, 3>{0, 0, 0}, "grid origin");
        voxel::check(!voxel::pickCell(916, 60, 0).has_value(), "right edge exclusive");
        voxel::check(!voxel::pickCell(660, 316, 0).has_value(), "bottom edge exclusive");
        voxel::Mesh overlap;
        overlap.push_back({{{{7, 7, 9}, {9, 7, 9}, {8, 9, 9}}}, {0, 255, 0, 255}});
        overlap.push_back({{{{7, 7, 6}, {9, 7, 6}, {8, 9, 6}}}, {255, 0, 0, 255}});
        voxel::Camera front;
        front.yaw = 0;
        front.pitch = 0;
        front.scale = 30;
        voxel::Frame frame;
        voxel::render(frame, overlap, front);
        voxel::check(frame.pixels[120 * 320 + 160].g == 255, "near triangle wins over later far triangle");
        voxel::audit();
        check(true, "pure audit completed");
        std::cout << "Project58 PASS: storage, winding, counts, slices, camera, depth\n";
    } catch (const std::exception& error) {
        std::cerr << error.what() << '\n';
        check(false, error.what());
    }
    if (failures != 0) {
        return EXIT_FAILURE;
    }
    return EXIT_SUCCESS;
}
