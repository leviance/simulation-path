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
        // Cả hai chunk sinh độc lập và theo thứ tự ngược phải nhận cùng dữ liệu.
        for (Key k : std::array<Key, 5>{{{-3, -2}, {-1, 0}, {0, 3}, {2, 7}, {0, 11}}}) {
            auto first = naturalColumn(k.first, k.second, 73);
            auto neighbor = naturalColumn(k.first + 1, k.second, 73);
            auto again = naturalColumn(k.first, k.second, 73);
            check(first.height() == 64 && first.sections == again.sections, "stable multisection columns");
            for (int z = 0; z < 16; ++z)
                for (int x : {0, 15}) {
                    const auto s = siteAt(k.first * 16 + x, k.second * 16 + z, 73);
                    check(first.get(x, s.ground, z) != Block::Air, "soil agrees with world sample");
                }
            check(neighbor.sections == naturalColumn(k.first + 1, k.second, 73).sections, "independent neighbor order");
        }
        bool ocean = false, river = false, snow = false;
        for (int z = -24; z <= 190; ++z) {
            const auto s = siteAt(0, z, 73);
            const auto mid = siteAt(int(std::round(s.riverX)), z, 73);
            ocean |= mid.ocean;
            river |= mid.river;
            snow |= siteAt(10, z, 73).snow;
            // Không chỉ tìm một ô nước: lòng sông liền qua cửa biển, kể cả ở biên chunk.
            if (z >= -4 && z <= 170)
                check(mid.ocean || mid.river, "dry cell along the main watercourse");
        }
        check(ocean && river && snow, "continuous route has sea river snow");
        check(naturalColumn(1, 4, 73).sections != naturalColumn(1, 4, 74).sections, "seed changes geology or flora");
        for (double x : {-16.0, 0.0, 16.0})
            for (double t : {0.0, 2.0, 7.25}) {
                const auto w = oceanAt(x, -7, t);
                const double e = 1e-4;
                const double dx = (oceanAt(x + e, -7, t).height - oceanAt(x - e, -7, t).height) / (2 * e);
                const double dz = (oceanAt(x, -7 + e, t).height - oceanAt(x, -7 - e, t).height) / (2 * e);
                check(std::abs(dx + w.normal.x / w.normal.y) < 1e-7 && std::abs(dz + w.normal.z / w.normal.y) < 1e-7, "normal agrees with displaced surface");
            }
        check(std::abs(flowPhase(-9, 2, 0.72, 4) - flowPhase(-9 + 0.72, 3, 0.72, 4)) < 1e-9, "tracer downstream");
        check(std::abs(oceanAt(0, -8, 0).height - oceanAt(0, -8, 1).height) > 0.03, "crest moves");
        if (failures != 0)
            return EXIT_FAILURE;
        std::cout << "Project 63: PASS\n";
        return EXIT_SUCCESS;
    } catch (const std::exception& e) {
        std::cerr << e.what() << '\n';
        return EXIT_FAILURE;
    }
}
