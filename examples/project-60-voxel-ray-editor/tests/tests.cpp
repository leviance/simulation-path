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
        // Đối chiếu độc lập: cắt tia với từng cặp mặt phẳng của hộp đá.
        auto box = [](Vec3 p, Vec3 d) {
            const double o[]{p.x, p.y, p.z}, v[]{d.x, d.y, d.z};
            double t0 = 0, t1 = 56;
            for (int a = 0; a < 3; ++a) {
                if (std::abs(v[a]) < 1e-12) {
                    if (o[a] < 4 || o[a] >= 5)
                        return -1.0;
                    continue;
                }
                const double t = (4 - o[a]) / v[a], s = (5 - o[a]) / v[a];
                t0 = std::max(t0, std::min(t, s));
                t1 = std::min(t1, std::max(t, s));
            }
            if (t0 >= t1)
                return -1.0;
            return t0;
        };
        auto fixture = [](Cell c) {
            Block m = Block::Air;
            if (c == Cell{4, 4, 4})
                m = Block::Stone;
            return Sample{true, m};
        };
        for (Vec3 o : std::array<Vec3, 5>{{{0.5, 4.5, 4.5}, {-2.5, 1.5, 1.5}, {4.5, 8.5, 4.5}, {4.5, 4.5, 4.5}, {9.5, 9.5, 9.5}}}) {
            for (Vec3 vec : std::array<Vec3, 6>{{{1, 0, 0}, {1, 1, 1}, {1, 0.4, 0.4}, {0, -1, 0}, {-1, -1, -1}, {0, 0, 1}}}) {
                const auto d = normalized(vec);
                const auto h = probe(o, d, 56, fixture);
                const double t = box(o, d);
                check(h.found == (t >= 0), "independent ray/box hit");
                if (h.found)
                    check(std::abs(h.distance - t) < 1e-8, "first intersection distance");
            }
        }
        const auto edge = probe({0, 0.5, 0.5}, {-1, 0, 0}, 5, [](Cell c) {
            return Sample{true, Block::Stone};
        });
        check(edge.cell == Cell{-1, 0, 0} && edge.distance == 0, "negative wall ownership");
        check(!probe({0, 4.5, 4.5}, {1, 0, 0}, 4, fixture).found, "exclusive reach");
        const auto unloadedColumn = [](Cell) {
            return Sample{false, Block::Air};
        };
        const auto outside = probe({0, 0, 0}, {1, 0, 0}, 12, unloadedColumn);
        check(outside.unknown, "unknown is not sky");
        check(probe({NAN, 0, 0}, {1, 0, 0}, 12, fixture).visited == 0, "invalid input before conversion");

        // Tia từ trên cao phải vào hộp trước khi DDA bắt đầu đếm các ô.
        const Vec3 low{0, 0, 0}, high{16, 16, 16};
        const auto downward = clipVolume({7.5, 20, 7.5}, {0, -1, 0}, low, high, 56);
        check(downward.crosses && downward.enter == 4 && downward.leave == 20, "vertical interval");
        check(!clipVolume({16, 8, 8}, {0, 0, 1}, low, high, 56).crosses, "upper wall is half open");
        check(!clipVolume({7.5, 20, 7.5}, {0, -1, 0}, low, high, 4).crosses, "entry beyond reach");
        Scene scene;
        const auto original = scene.region.tiles.at({0, 0}).data.sections;
        const auto n = scene.buildCount();
        for (int i = 0; i < 180; ++i) {
            scene.camera.yaw = i * 0.034;
            scene.update(0.016);
        }
        check(original == scene.region.tiles.at({0, 0}).data.sections && n == scene.buildCount(), "read only inspection");
        scene.preset = 3;
        scene.generate();
        scene.camera.eye = {8, 8, 8};
        scene.camera.pitch = 0;
        scene.camera.yaw = 0;
        check(scene.reading().unknown, "exiting horizontally into an unloaded column is unknown");
        scene.camera.pitch = pi / 2;
        const Hit sky = scene.reading();
        check(!sky.found && !sky.unknown, "exiting vertically sees real sky");
        if (failures != 0)
            return EXIT_FAILURE;
        std::cout << "Project 60: PASS\n";
        return EXIT_SUCCESS;
    } catch (const std::exception& e) {
        std::cerr << e.what() << '\n';
        return EXIT_FAILURE;
    }
}
