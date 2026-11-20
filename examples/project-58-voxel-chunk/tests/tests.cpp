#include "trail/scene.hpp"
#include <cstdlib>
#include <iostream>
#include <set>
#include <stdexcept>
#include <string_view>

namespace {
int failures = 0;

void check(bool condition, std::string_view message) {
    if (!condition) {
        ++failures;
        std::cerr << message << '\n';
    }
}

void testStorage() {
    std::set<int> indices;
    for (int y = 0; y < 16; ++y) {
        for (int z = 0; z < 16; ++z) {
            for (int x = 0; x < 16; ++x)
                indices.insert(trail::localIndex(x, y, z));
        }
    }
    check(indices.size() == 4096 && *indices.rbegin() == 4095, "indices must be unique");
    check(trail::localIndex(1, 0, 0) == 1 && trail::localIndex(0, 0, 1) == 16 && trail::localIndex(0, 1, 0) == 256, "axis strides");
    for (const auto c : std::array<trail::Cell, 6>{{{-1, 0, 0}, {16, 0, 0}, {0, -1, 0}, {0, 16, 0}, {0, 0, -1}, {0, 0, 16}}}) {
        bool rejected = false;
        try {
            trail::localIndex(c.x, c.y, c.z);
        } catch (const std::out_of_range&) {
            rejected = true;
        }
        check(rejected, "reject local coordinates outside section");
    }
    for (int x = -49; x <= 49; ++x) {
        const auto [chunk, local] = trail::splitCoordinate(x);
        if (local < 0 || local >= 16 || chunk * 16 + local != x) {
            throw std::runtime_error("world=" + std::to_string(x) + " chunk=" + std::to_string(chunk) + " local=" + std::to_string(local));
        }
    }
}

void testCameraAndDepth() {
    trail::Camera eye;
    eye.eye = {0, 0, 0};
    eye.yaw = 0;
    eye.pitch = 0;
    trail::Frame frame(160, 90);
    const trail::Atlas atlas;
    trail::Drawing draw(frame, atlas, eye);
    const auto near = draw.project({{1, 0, 2}, 0, 0});
    const auto far = draw.project({{1, 0, 4}, 0, 0});
    check(std::abs((near.x - 80) - 2 * (far.x - 80)) < 1e-9, "perspective halves apparent width");
    check(std::abs(trail::dot(trail::walkDirection(0, 1, 1), trail::walkDirection(0, 1, 1)) - 1) < 1e-9, "normalize diagonal input");
    const trail::Face front{{-1, -1, 3}, 5, 2, 2, trail::Block::Grass};
    const trail::Face back{{-1, -1, 5}, 5, 2, 2, trail::Block::Stone};
    frame.clear();
    draw.drawFace(front);
    draw.drawFace(back);
    const int middle = 45 * 160 + 80;
    const trail::Color first = frame.pixels[middle];
    check(std::abs(frame.depth[middle] - 1.0f / 3) < 1e-5, "near surface depth");
    frame.clear();
    draw.drawFace(back);
    draw.drawFace(front);
    check(frame.pixels[middle].g == first.g && frame.pixels[middle].r == first.r, "draw order independence");
    frame.clear();
    draw.quad({trail::Vec3{-1, -1, -1}, {1, -1, -1}, {1, 1, -1}, {-1, 1, -1}}, 1, 1, trail::Block::Stone, 0, 1);
    const auto untouched = [](float z) {
        return z == 0;
    };
    const auto drawn = [](float z) {
        return z > 0;
    };
    const auto withinClip = [](float z) {
        return std::isfinite(z) && z <= 10.0001f;
    };
    check(std::all_of(frame.depth.begin(), frame.depth.end(), untouched), "face behind eye");
    draw.quad({trail::Vec3{-0.4, -0.2, -1}, {0.4, -0.2, 1}, {0.4, 0.2, 1}, {-0.4, 0.2, -1}}, 1, 1, trail::Block::Stone, 0, 1);
    check(std::all_of(frame.depth.begin(), frame.depth.end(), untouched), "plane through the eye projects to a line");
    draw.quad({trail::Vec3{-0.4, -0.2, -1}, {0.1, -0.2, 1}, {0.1, 0.2, 1}, {-0.4, 0.2, -1}}, 1, 1, trail::Block::Stone, 0, 1);
    check(std::any_of(frame.depth.begin(), frame.depth.end(), drawn), "near-plane crossing draws");
    check(std::all_of(frame.depth.begin(), frame.depth.end(), withinClip), "bounded clipped depth");
}

void testBank() {
    auto pair = trail::singleStone();
    pair.put(8, 7, 7, trail::Block::Stone);
    check(trail::naiveMesh(pair).size() == 12, "pair keeps shared face twice");
    trail::Scene scene;
    scene.inspectFixtures();
    const auto before = scene.column.sections;
    for (int z = 0; z < trail::side; ++z) {
        bool hasWater = false;
        for (int x = 0; x < trail::side; ++x) {
            if (scene.column.get(x, 3, z) == trail::Block::Water)
                hasWater = true;
        }
        check(hasWater, "creek has a wet channel along all sixteen rows");
    }
    const int builds = scene.rebuilds;
    trail::travel(scene, 1, 0, 0, 0.05);
    check(scene.rebuilds == builds && scene.column.sections == before, "view cannot change world");
    std::array<int, trail::materialCount> counts{};
    for (auto block : scene.column.sections.front())
        ++counts[static_cast<int>(block)];
    for (auto block : {trail::Block::Air, trail::Block::Wood, trail::Block::Leaves, trail::Block::Sand, trail::Block::Grass, trail::Block::Water})
        check(counts[static_cast<int>(block)] > 0, "bank requires distinct materials");
    check(scene.solids + counts[0] == 4096 && scene.mesh.size() == static_cast<std::size_t>(scene.solids) * 6, "real geometry count");
    const auto a = trail::paintTexel(trail::Block::Grass, 0, 0, 0);
    const auto b = trail::paintTexel(trail::Block::Grass, 0, 0, 15);
    check(a.r > a.g && b.g > b.r, "grass fringe has soil below grass");
}
} // namespace

int main() {
    try {
        // Test thuần: không mở SDL window, assertion vẫn hoạt động ở Release.
        testStorage();
        testCameraAndDepth();
        testBank();
        if (failures != 0)
            return EXIT_FAILURE;
        std::cout << "PASS: signed cells, all boundaries, naive mesh, bank, perspective, near clip and Z-buffer\n";
    } catch (const std::exception& error) {
        std::cerr << error.what() << '\n';
        return EXIT_FAILURE;
    }
    return EXIT_SUCCESS;
}
