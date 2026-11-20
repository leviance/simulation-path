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
        // Bung mỗi quad thành mặt theo ô/hướng/vật liệu; số lượng bằng nhau chưa đủ.
        using FaceKey = std::tuple<int, int, int, int, int>;
        auto expand = [](const Mesh& mesh) {
            std::set<FaceKey> keys;
            for (const auto& f : mesh)
                for (int j = 0; j < f.height; ++j)
                    for (int i = 0; i < f.width; ++i) {
                        const auto p = f.origin - faceStarts[f.direction] + faceU[f.direction] * i + faceV[f.direction] * j;
                        check(keys.emplace(int(p.x), int(p.y), int(p.z), f.direction, int(f.block)).second, "overlap");
                    }
            return keys;
        };
        for (int kind = 0; kind < 4; ++kind) {
            Column c = solidCube();
            c.cx = -1;
            if (kind == 1)
                c.put(4, 9, 3, Block::Air);
            if (kind == 2)
                for (int z = 0; z < 16; ++z)
                    for (int x = 0; x < 16; ++x)
                        if ((x + z) % 2)
                            c.put(x, 15, z, Block::Grass);
            if (kind == 3)
                for (int z = 0; z < 16; ++z)
                    c.put(5, 15, z, Block::Water);
            auto read = [&](int wx, int y, int z) {
                if (wx == 0 && y >= 0 && y < 16 && z >= 0 && z < 16 && kind == 1)
                    return Block::Stone;
                return c.get(wx + 16, y, z);
            };
            const auto m = greedyMesh(c, read);
            check(expand(m) == expand(visibleMesh(c, read)), "same exposed surface");
            if (kind == 0)
                check(m.size() == 6, "solid greedy six");
        }
        const Vec3 root{3, 5, 7}, tip{3, 7, 7};
        auto a = sway(root, root, 2, 0.8, 7, {0, 1});
        check(dot(a - root, a - root) < 1e-12, "fixed root");
        auto b = sway(tip, root, 2, 0.8, 7, {0, 0});
        check(dot(b - tip, b - tip) < 1e-12, "calm");
        check(std::abs(windAt(root, 1, {0, 1}).x - windAt(root + Vec3{3, 0, 0}, 1, {0, 1}).x) > 0.01, "traveling gust");
        Scene scene;
        const int builds = scene.buildCount();
        scene.update(0.05);
        scene.paused = true;
        const double t = scene.seconds;
        scene.update(0.05);
        check(scene.buildCount() == builds && scene.seconds == t, "wind does not remesh");
        if (failures != 0)
            return EXIT_FAILURE;
        std::cout << "Project 61: PASS\n";
        return EXIT_SUCCESS;
    } catch (const std::exception& e) {
        std::cerr << e.what() << '\n';
        return EXIT_FAILURE;
    }
}
