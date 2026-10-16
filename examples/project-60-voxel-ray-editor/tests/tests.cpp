#include "audit.hpp"
#include <cstdlib>
#include <iostream>
#include <string_view>

namespace {
int failures = 0;

// Không dùng assert: CTest cần exit code lỗi ở cả Release/NDEBUG.
void check(bool condition, std::string_view label) {
    if (!condition) {
        ++failures;
        std::cerr << "FAIL: " << label << '\n';
    }
}

bool close(double a, double b) {
    return std::isfinite(a) && std::isfinite(b) && std::abs(a - b) < 1e-8;
}
} // namespace

int main() {
    using namespace voxel;
    try {
        audit();
        for (double yaw : {-1.0, 0.7, 2.0}) {
            for (double scale : {0.5, 1.0, 1.5}) {
                Camera camera;
                camera.yaw = yaw;
                camera.zoom = scale;
                for (auto pixel : std::array<std::array<double, 2>, 3>{{{0.5, 0.5}, {160.5, 120.5}, {319.5, 239.5}}}) {
                    const Ray ray = cameraRay(camera, pixel[0], pixel[1]);
                    for (double t : {0, 16, 32, 50}) {
                        const auto p = project(pointAt(ray, t), camera);
                        check(close(p.x, pixel[0]) && close(p.y, pixel[1]), "ray projects back to pixel");
                    }
                }
            }
        }
        const Ray axis = makeRay({-1, 8.5, 8.5}, {1, 0, 0});
        const auto span = clipBox(axis, {0, 0, 0}, {16, 16, 16}, 64);
        check(span.has_value() && close(span->enter, 1) && close(span->exit, 17), "axis slab fixture");
        check(!clipBox(axis, {0, 0, 0}, {16, 16, 16}, 1).has_value(), "reach endpoint has no positive interior segment");
        check(!clipBox(makeRay({-1, 16, 8}, {1, -0.0, 0}), {0, 0, 0}, {16, 16, 16}, 64).has_value(), "parallel upper boundary excluded");
        check(!clipBox(makeRay({-1, 1, 8}, {1, -1, 0}), {0, 0, 0}, {16, 16, 16}, 64).has_value(), "tangent has zero length");
        const auto chained = makeRay({-1, -1 - 0.4e-9, -1 - 0.8e-9}, {1, 1, 1});
        check(clipBox(chained, {0, 0, 0}, {16, 16, 16}, 64)->normal == Cell{0, -1, 0}, "entry tie uses final near, not chained temporary values");

        // Sáu mặt phải có đủ dấu normal; oracle so cell/t không thay được fixture này.
        Chunk single{};
        set(single, 8, 8, 8, Block::Stone);
        for (int axisIndex = 0; axisIndex < 3; ++axisIndex) {
            for (int sign : {-1, 1}) {
                std::array<double, 3> origin{8.5, 8.5, 8.5};
                std::array<double, 3> direction{};
                Cell expected{};
                origin[axisIndex] += sign * 4;
                direction[axisIndex] = -sign;
                expected[axisIndex] = sign;
                const auto faceRay = makeRay({origin[0], origin[1], origin[2]}, {direction[0], direction[1], direction[2]});
                const auto faceHit = traverse(single, faceRay).hit;
                check(faceHit.has_value() && faceHit->cell == Cell{8, 8, 8} && faceHit->normal == expected && close(faceHit->distance, 3.5), "six outward normals");
            }
        }
        Chunk empty{};
        const auto negative = traverse(empty, makeRay({16, 8, 8}, {-1, 0, 0}), 64, false);
        check(negative.visits.size() == 16 && negative.visits.front().cell == Cell{15, 8, 8} && negative.visits.back().cell == Cell{0, 8, 8}, "negative entry forward cell");
        const auto diagonal = traverse(empty, makeRay({-1, -1, -1}, {1, 1, 1}), 64, false);
        check(diagonal.visits.size() == 16 && diagonal.visits[1].cell == Cell{1, 1, 1}, "ties advance all axes");
        check(diagonal.visits[1].normal == Cell{-1, 0, 0}, "tie normal priority X");
        for (const auto& visit : diagonal.visits) {
            check(visit.exit - visit.enter > tolerance, "no zero-length visited cell");
        }
        Chunk data{};
        set(data, 2, 8, 8, Block::Stone);
        set(data, 4, 8, 8, Block::Grass);
        const auto hit = traverse(data, axis).hit;
        check(hit.has_value() && hit->cell == Cell{2, 8, 8} && hit->normal == Cell{-1, 0, 0} && close(hit->distance, 3), "nearest axis hit fixture");
        const auto insideHit = traverse(data, makeRay({2.5, 8.5, 8.5}, {1, 0, 0})).hit;
        check(insideHit.has_value() && insideHit->normal == Cell{0, 0, 0} && close(insideHit->distance, 0), "inside hit has no entry face");
        check(!placementCell(data, insideHit).has_value(), "inside hit cannot place");
        const auto before = data;
        check(breakBlock(data, axis, 64).changed, "break changed");
        int differences = 0;
        for (std::size_t i = 0; i < data.size(); ++i) {
            if (data[i] != before[i]) {
                ++differences;
            }
        }
        check(differences == 1 && traverse(data, axis).hit->cell == Cell{4, 8, 8}, "exactly one cell removed and next revealed");
        data = before;
        check(placementCell(data, hit).value() == Cell{1, 8, 8}, "placement is hit plus outward normal");
        check(placeBlock(data, axis, 64, Block::Dirt).changed && get(data, 1, 8, 8) == Block::Dirt, "place material in empty adjacent cell");
        check(placeBlock(data, axis, 64, Block::Stone).changed, "place next layer at x=0");
        const auto blocked = data;
        check(!placeBlock(data, axis, 64, Block::Stone).changed && data == blocked, "outside placement rejected without write");
        Chunk corner{};
        set(corner, 1, 1, 1, Block::Stone);
        set(corner, 0, 1, 1, Block::Dirt);
        const auto occupied = corner;
        check(!placeBlock(corner, makeRay({-1, -1, -1}, {1, 1, 1}), 64, Block::Grass).changed && corner == occupied, "occupied tie neighbor never overwritten");

        // Hai action liên tiếp phải re-query, kể cả preview chưa refresh giữa chúng.
        Editor state;
        refresh(state);
        check(state.trace.hit.has_value() && state.cache.rebuilds == 1 && state.queries == 1, "initial editor hit/cache");
        refresh(state);
        check(state.queries == 1, "idle does not query");
        ++state.pixelX;
        state.pickDirty = true;
        refresh(state);
        check(state.cache.rebuilds == 1 && state.cache.rasterizations == 1 && state.queries == 2, "aim only queries");
        orbit(state.camera, 8, 0);
        cameraChanged(state);
        refresh(state);
        check(state.cache.rebuilds == 1 && state.cache.rasterizations == 2, "camera only raster/query");
        const int solid = state.cache.built.solid;
        check(edit(state, false).changed && edit(state, false).changed, "fresh query for consecutive edits");
        refresh(state);
        check(state.cache.built.solid == solid - 2 && state.cache.rebuilds == 2, "two edits coalesce into one mesh rebuild");
        bool rejected = false;
        try {
            makeRay({0, 0, 0}, {0, 0, 0});
        } catch (const std::invalid_argument&) {
            rejected = true;
        }
        check(rejected, "invalid zero direction rejected");
    } catch (const std::exception& error) {
        check(false, error.what());
    }
    if (failures != 0) {
        return EXIT_FAILURE;
    }
    std::cout << "Project60 PASS: camera, slab, DDA, normals, mutation, cache\n";
    return EXIT_SUCCESS;
}
