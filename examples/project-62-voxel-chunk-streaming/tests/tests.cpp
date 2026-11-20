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
        Region region;
        Stream stream;
        auto settle = [&](Key center) {
            stream.plan(region, center);
            for (int n = 0; n < 180 && (!stream.wanted.empty() || !region.dirty.empty()); ++n)
                stream.tick(region, Mesher::Greedy);
            check(stream.wanted.empty() && region.dirty.empty(), "finite queue");
            for (int x = -2; x <= 2; ++x)
                for (int z = -2; z <= 2; ++z)
                    check(region.tiles.contains({center.first + x, center.second + z}), "5 by 5 ready");
            check(region.tiles.size() <= 49, "bounded resident");
        };
        settle({0, 0});
        const auto ground = region.tiles.at({0, 0}).data.sections;
        for (int cycle = 0; cycle < 3; ++cycle) {
            stream.plan(region, {14, 0});
            stream.tick(region, Mesher::Greedy);
            settle({-15, 1});
            settle({0, 0});
        }
        check(region.unloads > 100 && region.tiles.at({0, 0}).data.sections == ground, "return same data after reversed queue");
        // Hai camera nhìn cùng một tọa độ trên tầng mây ở cùng giờ.
        const Vec3 a{1, 7, 2}, b{17, 7, 2}, target{12, 96, 21}, drift{0.7, 0, 0.3};
        check(std::abs(cloudCover(a, normalized(target - a), 6, drift, 73) - cloudCover(b, normalized(target - b), 6, drift, 73)) < 1e-9, "world cloud projection");
        double shift = 0;
        for (int n = -10; n < 11; ++n) {
            const Vec3 dir = normalized({0.1 * n, 0.6, 1});
            shift += std::abs(cloudCover(a, dir, 0, drift, 73) - cloudCover(a, dir, 21, drift, 73));
        }
        check(shift > 0.1 && cloudCover(a, {0, -1, 0}, 1, drift, 73) == 0, "clouds move without camera");
        if (failures != 0)
            return EXIT_FAILURE;
        std::cout << "Project 62: PASS\n";
        return EXIT_SUCCESS;
    } catch (const std::exception& e) {
        std::cerr << e.what() << '\n';
        return EXIT_FAILURE;
    }
}
