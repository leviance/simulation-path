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
        // Vị trí cũ của bông là tọa độ world, không cộng thêm bước ngang của mắt.
        Snow snow;
        for (int f = 0; f < 480; ++f)
            snow.update({3, 30, 5}, 1.0 / 60, 1, {0, 1}, f / 60.0);
        const auto isAlive = [](const Flake& flake) {
            return flake.alive;
        };
        const int living = int(std::count_if(snow.pool.begin(), snow.pool.end(), isAlive));
        check(living > 100 && living <= 768, "bounded snow field");
        auto before = snow.pool;
        snow.update({4, 30, 5}, 0, 0, {0, 1}, 8);
        for (std::size_t j = 0; j < before.size(); ++j)
            if (before[j].alive && snow.pool[j].alive)
                check(before[j].point.x == snow.pool[j].point.x, "snow not parented to eye");
        for (int n = 0; n < 850; ++n)
            snow.update({4, 30, 5}, 1.0 / 60, 0, {0, 1}, 8 + n / 60.0);
        check(std::none_of(snow.pool.begin(), snow.pool.end(), isAlive), "snow ends off mountain");
        check(skyAtHour(7).direction.x > 0 && skyAtHour(17).direction.x < 0 && skyAtHour(12).direction.y > skyAtHour(7).direction.y, "sun travels east to west");
        check(skyAtHour(12).daylight > skyAtHour(0).daylight, "sky follows sun");
        Scene scene;
        scene.preset = 2;
        scene.region = Region{};
        scene.camera.eye = {3.5, 2.65, 3.5};
        scene.grounded = true;
        Column slab;
        for (int z = 0; z < 16; ++z)
            for (int x = 0; x < 16; ++x)
                slab.put(x, 0, z, Block::Stone);
        for (int y = 1; y <= 4; ++y)
            slab.put(4, y, 3, Block::Stone);
        slab.put(3, 1, 4, Block::Stone);
        scene.region.put(slab);
        check(!scene.moveAxis(0.45, 0), "wall stops body");
        check(scene.moveAxis(0, 0.45) && std::abs(scene.camera.eye.y - 3.65) < 1e-8, "one block step");
        scene.camera.eye = {0.24, 2.65, 3.5};
        check(!scene.moveAxis(-0.12, 0), "unknown edge closed");
        scene.paused = true;
        const double time = scene.seconds;
        scene.update(0.025);
        check(scene.seconds == time, "pause freezes environment");
        if (failures != 0)
            return EXIT_FAILURE;
        std::cout << "Project 64: PASS\n";
        return EXIT_SUCCESS;
    } catch (const std::exception& e) {
        std::cerr << e.what() << '\n';
        return EXIT_FAILURE;
    }
}
