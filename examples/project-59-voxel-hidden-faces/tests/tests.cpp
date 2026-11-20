#include "trail/field-scene.hpp"
#include <cstdlib>
#include <iostream>
#include <set>
#include <string_view>
#include <tuple>

using namespace trail;
int failures = 0;

void check(bool condition, std::string_view message) {
    if (!condition) {
        ++failures;
        std::cerr << message << '\n';
    }
}

int main() {
    try {
        // Hốc kín tạo thêm sáu mặt bên trong, dù đứng ngoài không nhìn thấy.
        Column full = solidCube();
        auto sample = [&](int x, int y, int z) {
            return full.get(x, y, z);
        };
        check(naiveMesh(full).size() == 24576 && visibleMesh(full, sample).size() == 1536, "solid surface");
        full.put(6, 7, 8, Block::Air);
        check(visibleMesh(full, sample).size() == 1542, "six inside faces");
        check(exposedFace(Block::Sand, Block::Water) && !exposedFace(Block::Water, Block::Sand) && !exposedFace(Block::Water, Block::Water), "shore ownership");
        for (bool reversed : {false, true}) {
            Region region;
            Column left = solidCube(), right = solidCube();
            right.cx = 1;
            if (reversed) {
                region.put(right);
                region.put(left);
            } else {
                region.put(left);
                region.put(right);
            }
            region.buildSome(8, Mesher::Visible);
            std::set<std::tuple<int, int, int, int>> actual;
            for (const auto& [key, tile] : region.tiles)
                for (const auto& face : tile.mesh) {
                    auto origin = face.origin - faceStarts[face.direction];
                    check(actual.emplace(int(origin.x), int(origin.y), int(origin.z), face.direction).second, "duplicate face");
                }
            std::set<std::tuple<int, int, int, int>> expected;
            for (int y = 0; y < 16; ++y)
                for (int z = 0; z < 16; ++z)
                    for (int x = 0; x < 32; ++x) {
                        if (x == 31)
                            expected.emplace(x, y, z, 0);
                        if (x == 0)
                            expected.emplace(x, y, z, 1);
                        if (y == 15)
                            expected.emplace(x, y, z, 2);
                        if (y == 0)
                            expected.emplace(x, y, z, 3);
                        if (z == 15)
                            expected.emplace(x, y, z, 4);
                        if (z == 0)
                            expected.emplace(x, y, z, 5);
                    }
            check(actual == expected && actual.size() == 2560, "two chunks exact face set");
        }
        Scene scene;
        auto data = scene.region.tiles.at({0, 0}).data.sections;
        scene.toggleMesher();
        const auto count = scene.buildCount();
        travel(scene, 1, 0, 0, 0.03);
        check(scene.buildCount() == count && scene.region.tiles.at({0, 0}).data.sections == data, "walk leaves mesh and data alone");
        if (failures != 0)
            return EXIT_FAILURE;
        std::cout << "Project 59: PASS\n";
        return EXIT_SUCCESS;
    } catch (const std::exception& e) {
        std::cerr << e.what() << '\n';
        return EXIT_FAILURE;
    }
}
