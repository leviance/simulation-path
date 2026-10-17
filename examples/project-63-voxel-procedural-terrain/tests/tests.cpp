#include "controller.hpp"
#include "terrain-oracle.hpp"
#include <cstdlib>
#include <iostream>
#include <limits>
#include <string_view>

namespace {
int failures = 0;

void check(bool condition, std::string_view label) {
    if (!condition) {
        ++failures;
        std::cerr << "FAIL: " << label << '\n';
    }
}

bool near(double a, double b, double epsilon = 1e-12) {
    return std::abs(a - b) <= epsilon;
}
} // namespace

int main() {
    using namespace voxel;
    // Đột biến mesh không làm thay đổi cột hoặc quads: audit vẫn phải bắt được.
    World meshFixture = createWorld();
    const Mesh originalMesh = meshFixture.chunks.at({}).mesh;
    for (int mutation = 0; mutation < 5; ++mutation) {
        Mesh& mesh = meshFixture.chunks.at({}).mesh;
        mesh = originalMesh;
        if (mutation == 0)
            mesh.clear();
        if (mutation == 1)
            mesh[0] = mesh[1];
        if (mutation == 2)
            mesh[0].points[0].x += 1;
        if (mutation == 3)
            std::swap(mesh[0].points[0], mesh[0].points[2]);
        if (mutation == 4)
            ++mesh[0].color.r;
        check(verifySurface(meshFixture) == 874, "quad oracle deliberately cannot inspect triangles");
        bool rejectedMesh = false;
        try {
            verifyTerrain(meshFixture);
        } catch (const std::runtime_error&) {
            rejectedMesh = true;
        }
        check(rejectedMesh, "terrain audit rejects broken triangle buffer");
    }
    const TerrainConfig config;
    int addressErrors = 0;
    for (int worldPosition = -1024; worldPosition <= 1024; ++worldPosition) {
        const int chunk = floorDiv(worldPosition);
        const int local = worldPosition - chunk * side;
        if (local < 0 || local >= side) {
            ++addressErrors;
        }
    }
    check(addressErrors == 0, "all signed integer addresses reconstruct with local 0..15");
    // Fixture chung với TypeScript, gồm tọa độ âm và biên miền Key.
    check(latticeHash(0, 0, 42) == 388445122u, "hash origin");
    check(latticeHash(-1, 0, 42) == 4012630698u, "hash negative");
    check(latticeHash(17, -23, 65535) == 823775260u, "hash mixed axes");
    bool rejectedHash = false;
    try {
        latticeHash(std::numeric_limits<int>::min(), 0, 42);
    } catch (const std::out_of_range&) {
        rejectedHash = true;
    }
    check(rejectedHash, "reject INT_MIN without signed abs overflow");
    check(near(valueNoise(-0.25, 0.5, 42), -0.27946993972686357), "bilinear signed fixture");
    check(smooth(0) == 0 && smooth(1) == 1 && smooth(0.5) == 0.5, "smooth endpoints");
    for (int z = -3; z <= 3; ++z) {
        for (int x = -3; x <= 3; ++x) {
            check(near(valueNoise(x, z, 42), latticeValue(x, z, 42)), "lattice corner");
        }
    }
    for (const int boundary : {-32, -16, 0, 16, 32}) {
        const double a = terrainSignal((boundary / 16 - 1) * 16 + 16, 13, config);
        const double b = terrainSignal((boundary / 16) * 16, 13, config);
        check(a == b, "same sample through two halos");
        check(near(terrainSignal(boundary - 1e-6, 13, config), terrainSignal(boundary + 1e-6, 13, config), 1e-5), "continuous seam signal");
    }

    const std::array<Key, 4> keys{{{0, 0}, {-1, 0}, {1, -1}, {-64, 64}}};
    const std::array<std::uint32_t, 4> hashes{{4263195062u, 2291264103u, 2892146174u, 3054277751u}};
    for (std::size_t i = 0; i < keys.size(); ++i) {
        const Chunk data = generateTerrain(keys[i], config);
        check(hashChunk(data) == hashes[i], "chunk fixture");
        check(verifyColumns(keys[i], data, config) == 0, "column oracle");
        generateTerrain({11, -7}, {43, 16, 4});
        check(data == generateTerrain(keys[i], config), "order independent regeneration");
    }
    check(verifyColumns({-1, 1}, generateTerrain({}, config), config) > 0, "detect local coordinate reset");
    Chunk missingTop = generateTerrain({}, config);
    set(missingTop, 0, heightAt(0, 0, config) - 1, 0, Block::Air);
    check(verifyColumns({}, missingTop, config) > 0, "detect top off by one");
    for (const int scale : {16, 32, 64}) {
        for (int octaves = 1; octaves <= 4; ++octaves) {
            const TerrainConfig c{42, scale, octaves};
            for (int z = -64; z <= 64; z += 17) {
                for (int x = -64; x <= 64; x += 13) {
                    const double n = terrainSignal(x, z, c);
                    const int h = heightAt(x, z, c);
                    check(n >= -1 && n <= 1 && h >= 2 && h <= 14, "normalized octave bounds");
                }
            }
        }
    }
    for (const int h : {2, 4, 10, 11, 14}) {
        check(materialAt(0, h, config) == Block::Stone, "bottom stone");
        check(materialAt(h, h, config) == Block::Air, "height is count");
        for (int y = 0; y < h; ++y) {
            check(materialAt(y, h, config) != Block::Air, "solid column without holes");
        }
    }

    // Kiểm mesh sau từng batch nhỏ; không dùng vòng chạy tự do hoặc benchmark vô hạn.
    World world = createWorld();
    check(world.chunks.size() == 1 && world.pending.size() == 8, "one bootstrap chunk");
    verifyTerrain(world);
    const Rectangle duplicate = world.chunks.at({}).quads.front();
    world.chunks.at({}).quads.push_back(duplicate);
    bool rejectedSurface = false;
    try {
        verifySurface(world);
    } catch (const std::runtime_error&) {
        rejectedSurface = true;
    }
    check(rejectedSurface, "detect duplicate terrain quad");
    world.chunks.at({}).quads.pop_back();
    for (int i = 0; i < 8 && !world.pending.empty(); ++i) {
        pump(world);
        verifyTerrain(world);
    }
    check(world.chunks.size() == 9 && world.pending.empty(), "settled wanted");
    const Chunk original = world.chunks.at({}).blocks;
    const int rebuilds = world.rebuilds;
    pump(world);
    movePlayer(world, 9, 9);
    check(world.rebuilds == rebuilds, "idle and local movement do not remesh");
    // Monolithic world enumeration, with address decomposition separate from the generator.
    int worldErrors = 0;
    for (int z = -16; z < 32; ++z) {
        for (int x = -16; x < 32; ++x) {
            const int h = heightAt(x, z, config);
            for (int y = 0; y < side; ++y) {
                const Block actual = worldBlock(world, x, y, z);
                const Block expected = materialAt(y, h, config);
                if (actual != expected) {
                    if (worldErrors < 8) {
                        std::cerr << "cell " << x << ',' << y << ',' << z << " H=" << h << " actual=" << static_cast<int>(actual) << " expected=" << static_cast<int>(expected) << " key=" << floorDiv(x) << ',' << floorDiv(z) << '\n';
                    }
                    ++worldErrors;
                }
            }
        }
    }
    check(worldErrors == 0, "world region equals chunks");
    movePlayer(world, 200, -200);
    drain(world);
    check(!world.chunks.contains({}), "unloaded origin");
    movePlayer(world, 8, 8);
    drain(world);
    check(world.chunks.at({}).blocks == original, "return recovers exact data");
    movePlayer(world, -20, 40);
    applyConfig(world, {43, 16, 4});
    check(world.generation == 2 && world.chunks.size() == 1 && world.rebuilds == 1 && world.lastJobs == 0, "generation transaction bootstrap");
    check(world.chunks.contains({-2, 2}) && world.pending.size() == 8, "new center and queue");
    drain(world);
    verifyTerrain(world);
    for (const auto& [key, entry] : world.chunks) {
        check(entry.blocks == generateTerrain(key, {43, 16, 4}), "no old config chunks");
    }
    const auto oldSize = world.chunks.size();
    bool rejected = false;
    try {
        applyConfig(world, {42, 8, 4});
    } catch (const std::out_of_range&) {
        rejected = true;
    }
    check(rejected && world.chunks.size() == oldSize && world.generation == 2, "invalid config before mutation");
    rejected = false;
    try {
        heightAt(std::numeric_limits<double>::quiet_NaN(), 0, config);
    } catch (const std::out_of_range&) {
        rejected = true;
    }
    check(rejected, "reject NaN before integer cast");
    if (failures != 0) {
        return EXIT_FAILURE;
    }
    std::cout << "PASS procedural terrain and streaming invariants\n";
    return EXIT_SUCCESS;
}
