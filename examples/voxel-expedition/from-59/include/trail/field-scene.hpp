#pragma once
#if LAB_CHECKPOINT >= 5901
#include "field-render.hpp"
#include <sstream>
#if LAB_CHECKPOINT >= 6001
#include "probe.hpp"
#endif
#if LAB_CHECKPOINT >= 6201
#include "stream.hpp"
#endif
#if LAB_CHECKPOINT >= 6401
#include "flakes.hpp"
#endif

namespace trail {
// Giữ camera, các cột đất và đồng hồ cảnh riêng để quay đầu không làm đất sinh lại.
struct Scene {
    Camera camera;
    Region region;
    WeatherView weather;
    Mesher mode = Mesher::Visible;
    int preset = 2, sliceY = 4, landmark = 0;
    bool debug = false, showSlice = false, paused = false;
    double seconds = 0;
    std::string auditResult;
#if LAB_CHECKPOINT >= 6001
    bool showProbe = true;
    Hit hit;
    Vec3 shotOrigin, shotDirection;
#endif
#if LAB_CHECKPOINT >= 6003
    bool holdHit = false;
#endif
#if LAB_CHECKPOINT >= 6201
    Stream stream;
#endif
#if LAB_CHECKPOINT >= 6401
    Snow snow;
    bool snowEnabled = true;
#endif
#if LAB_CHECKPOINT >= 6402
    double startHour = 9;
#endif
#if LAB_CHECKPOINT >= 6403
    bool flying = false, grounded = false;
    double rise = 0;
#endif

    Scene() {
#if LAB_CHECKPOINT >= 6101
        mode = Mesher::Greedy;
#endif
#if LAB_CHECKPOINT >= 6101
        showProbe = false;
#endif
        generate();
    }

    Key positionKey() const {
        return {splitCoordinate(int(std::floor(camera.eye.x))).chunk, splitCoordinate(int(std::floor(camera.eye.z))).chunk};
    }

    void resetPose() {
        camera = {};
#if LAB_CHECKPOINT >= 5903
        if (preset == 4) {
            camera.eye = {8.0, 6.6, -3.5};
            camera.yaw = 0;
            camera.pitch = -0.03;
        }
#endif
        if (preset == 1) {
            camera.eye = {23, 21, -9};
            camera.yaw = -0.71;
            camera.pitch = -0.50;
        }
        if (preset == 2) {
            camera.eye = {7.0, 5.75, 0.8};
            camera.yaw = 0.12;
            camera.pitch = 0.015;
        }
#if LAB_CHECKPOINT >= 6301
        if (preset == 2) {
            // [snippet route-poses]
            constexpr std::array<int, 5> routes{4, 39, 96, 170, 147};
            int z = routes.at(landmark);
            const Site base = siteAt(0, z, region.seed);
            int x = int(std::floor(base.riverX + 7));
            if (landmark == 3)
                x = int(std::floor(base.riverX + 18));
            if (landmark == 4) {
                x = campX(region.seed) + 3;
                z -= 4;
            }
            const Site at = siteAt(x, z, region.seed);
            camera.eye = {x + 0.5, at.ground + 2.65, z + 0.5};
            camera.yaw = -0.52;
            camera.pitch = -0.07;
            // [/snippet route-poses]
            if (landmark == 0) {
                camera.yaw = -2.43;
                camera.pitch = -0.08;
            }
            if (landmark == 4) {
                camera.yaw = -0.65;
                camera.pitch = -0.23;
            }
            if (landmark == 3) {
                camera.yaw = -1.75;
                camera.pitch = -0.04;
            }
        }
#endif
#if LAB_CHECKPOINT >= 6403
        rise = 0;
        grounded = false;
#endif
    }

    void generate() {
        const auto seed = region.seed;
        region = Region{};
        region.seed = seed;
        weather.seed = seed;
        resetPose();
#if LAB_CHECKPOINT >= 6201
        stream = Stream{};
#endif
        if (preset != 2) {
            if (preset == 0)
                region.put(singleStone());
            else if (preset == 1)
                region.put(solidCube());
#if LAB_CHECKPOINT >= 5903
            else if (preset == 4)
                region.put(stoneShelter());
#endif
            else
                region.put(Column{});
        } else {
#if LAB_CHECKPOINT >= 6201
            const Key start = positionKey();
            region.load(start);
            stream.plan(region, start);
#else
            region.load({0, 0});
#if LAB_CHECKPOINT >= 5902
            // [snippet neighbor-load]
            region.load({0, 1});
            // [/snippet neighbor-load]
#endif
#if LAB_CHECKPOINT >= 6001
            for (int z = 0; z <= 2; ++z)
                for (int x = -1; x <= 1; ++x)
                    if (!region.tiles.contains({x, z}))
                        region.load({x, z});
#endif
#endif
        }
        region.buildSome(16, mode);
    }

    void toggleMesher() {
#if LAB_CHECKPOINT >= 6101
        if (mode == Mesher::Greedy)
            mode = Mesher::Visible;
        else
            mode = Mesher::Greedy;
#else
        if (mode == Mesher::Visible)
            mode = Mesher::Naive;
        else
            mode = Mesher::Visible;
#endif
        for (const auto& tile : region.tiles)
            region.dirty.insert(tile.first);
#if LAB_CHECKPOINT < 6201
        region.buildSome(16, mode);
#endif
    }

    std::size_t faceCount() const {
        return region.faces();
    }
    int solidCount() const {
        int sum = 0;
        for (const auto& item : region.tiles)
            sum += item.second.solids;
        return sum;
    }
    int buildCount() const {
        return region.builds;
    }

    Block inspectedBlock(int x, int y, int z) const {
        const Key k = positionKey();
        return region.read(k.first * side + x, y, k.second * side + z);
    }

    void inspectFixtures() {
        Column full = solidCube();
        const auto get = [&](int x, int y, int z) { return full.get(x, y, z); };
        if (naiveMesh(full).size() != 24576 || visibleMesh(full, get).size() != 1536)
            throw std::runtime_error("surface reference differs");
#if LAB_CHECKPOINT >= 6101
        if (greedyMesh(full, get).size() != 6)
            throw std::runtime_error("greedy surface differs");
#endif
        auditResult = "PASS: opaque cube surface covers 1536 unit faces";
    }

#if LAB_CHECKPOINT >= 6002
    Hit reading() const {
        // [snippet read-cell]
        const auto sample = [&](Cell c) {
            const Key k{splitCoordinate(c.x).chunk, splitCoordinate(c.z).chunk};
            return Sample{region.tiles.contains(k), region.read(c.x, c.y, c.z)};
        };
        const Vec3 dir = eyeRay(camera, 1, 1, 2, 2);
        const Key start = positionKey();
        if (!region.tiles.contains(start)) {
            Hit unknown{};
            unknown.unknown = true;
            return unknown;
        }
        Vec3 low{double(start.first * side), 0, double(start.second * side)};
        Vec3 high{low.x + side, 0, low.z + side};
        for (const auto& [k, tile] : region.tiles) {
            low.x = std::min(low.x, double(k.first * side));
            low.z = std::min(low.z, double(k.second * side));
            high.x = std::max(high.x, double((k.first + 1) * side));
            high.z = std::max(high.z, double((k.second + 1) * side));
            high.y = std::max(high.y, double(tile.data.height()));
        }
        const auto cut = clipVolume(camera.eye, dir, low, high, 56);
        if (!cut.crosses)
            return {};
        Hit result = probe(camera.eye + dir * cut.enter, dir, cut.leave - cut.enter, sample);
        result.distance += cut.enter;
        if (!result.found && !result.unknown && cut.leave < 56) {
            const Vec3 beyond = camera.eye + dir * (cut.leave + 1e-7);
            if (beyond.y >= 0 && beyond.y < high.y)
                result.unknown = true;
        }
        return result;
        // [/snippet read-cell]
    }
#endif

    bool update([[maybe_unused]] double dt) {
        bool changed = false;
#if LAB_CHECKPOINT >= 6201
        if (preset == 2) {
            // [snippet advance-region]
            stream.plan(region, positionKey());
            changed = stream.tick(region, mode);
            // [/snippet advance-region]
        }
#endif
#if LAB_CHECKPOINT >= 6102
        if (!paused) {
            seconds += dt;
            changed = true;
        }
        weather.time = seconds;
#endif
#if LAB_CHECKPOINT >= 6402
        // [snippet world-hours]
        weather.hour = std::fmod(startHour + seconds / 25 + 48, 24.0);
        // [/snippet world-hours]
#endif
#if LAB_CHECKPOINT >= 6403
        if (!flying && preset == 2 && region.tiles.contains(positionKey())) {
            const double oldY = camera.eye.y;
            rise -= 19 * dt;
            // [snippet feet]
            const double foot = camera.eye.y - 1.65;
            const double next = foot + rise * dt;
            double support = -128;
            for (int y = int(std::floor(foot + 0.04)); y >= int(std::floor(next)) - 1; --y) {
                if (isSolid(camera.eye.x, y, camera.eye.z)) {
                    support = y + 1.0;
                    break;
                }
            }
            if (rise <= 0 && next <= support) {
                camera.eye.y = support + 1.65;
                rise = 0;
                grounded = true;
            } else {
                if (rise > 0 && isSolid(camera.eye.x, next + 1.6, camera.eye.z))
                    rise = 0;
                else
                    camera.eye.y = next + 1.65;
                grounded = false;
            }
            // [/snippet feet]
            changed = changed || std::abs(camera.eye.y - oldY) > 1e-7;
        }
#endif
#if LAB_CHECKPOINT >= 6401
        if (!paused) {
            const Site site = siteAt(int(std::floor(camera.eye.x)), int(std::floor(camera.eye.z)), region.seed);
            // [snippet snow-tick]
            double intensity = 0;
            if (snowEnabled && site.alpine)
                intensity = smooth(124, 161, site.inland);
            snow.update(camera.eye, dt, intensity, {weather.windAngle, weather.windSpeed}, seconds);
            // [/snippet snow-tick]
        }
#endif
#if LAB_CHECKPOINT >= 6002
#if LAB_CHECKPOINT >= 6003
        if (!holdHit)
#endif
            if (showProbe) {
                // [snippet record-ray]
                shotOrigin = camera.eye;
                shotDirection = basis(camera).forward;
                hit = reading();
                // [/snippet record-ray]
            }
#endif
        return changed;
    }

#if LAB_CHECKPOINT >= 6403
    bool isSolid(double wx, double y, double wz) const {
        const Block b = region.read(int(std::floor(wx)), int(std::floor(y)), int(std::floor(wz)));
        return b != Block::Air && b != Block::Water;
    }

    bool moveAxis(double dx, double dz) {
        const double x = camera.eye.x + dx, z = camera.eye.z + dz, foot = camera.eye.y - 1.65;
        // [snippet solid-step]
        for (double a : {-0.20, 0.20})
            for (double b : {-0.20, 0.20}) {
                if (!region.tiles.contains({splitCoordinate(int(std::floor(x + a))).chunk, splitCoordinate(int(std::floor(z + b))).chunk}))
                    return false;
                if (isSolid(x + a, foot + 1.09, z + b) || isSolid(x + a, foot + 1.62, z + b))
                    return false;
            }
        // [/snippet solid-step]
        bool step = false;
        for (double a : {-0.20, 0.20})
            for (double b : {-0.20, 0.20})
                step = step || isSolid(x + a, foot + 0.10, z + b);
        if (step) {
            if (!grounded)
                return false;
            for (double a : {-0.20, 0.20})
                for (double b : {-0.20, 0.20})
                    if (isSolid(x + a, foot + 2.66, z + b))
                        return false;
            camera.eye.y = std::floor(foot + 0.1) + 1 + 1.65;
        }
        camera.eye.x = x;
        camera.eye.z = z;
        return true;
    }
#endif

    std::string readout() const {
        std::ostringstream out;
        out << "chunks " << region.tiles.size() << " | quads " << faceCount() << " | builds " << buildCount();
#if LAB_CHECKPOINT >= 6002
        if (showProbe)
            out << " | " << probeLabel();
#endif
#if LAB_CHECKPOINT >= 6201
        out << " | queue " << stream.wanted.size() << " | dirty " << region.dirty.size() << " | out " << region.unloads;
#endif
#if LAB_CHECKPOINT >= 6104
        // [snippet mesh-readout]
        out << " | mesh " << std::round(region.lastBuildMs * 100) / 100 << " ms";
        // [/snippet mesh-readout]
#endif
#if LAB_CHECKPOINT >= 6405
        // [snippet walk-readout]
        out << " | hour " << int(weather.hour) << " | flakes " << std::count_if(snow.pool.begin(), snow.pool.end(), [](const auto& f) { return f.alive; });
        // [/snippet walk-readout]
#endif
        return out.str();
    }
#if LAB_CHECKPOINT >= 6002
    std::string probeLabel() const {
        std::ostringstream out;
        if (hit.found)
            out << " | " << materialName(hit.material) << " " << hit.cell.x << "," << hit.cell.y << "," << hit.cell.z << " @ " << std::round(hit.distance * 10) / 10 << " blocks";
        else if (hit.unknown)
            out << " | outside loaded terrain";
        else
            out << " | sky / no hit";
        if (hit.found)
            out << " normal " << hit.normal.x << "," << hit.normal.y << "," << hit.normal.z;
        out << " | visited " << hit.visited;
        return out.str();
    }
#endif

    void draw(Frame& frame, const Atlas& atlas) const {
        frame.clear();
        Drawing drawing(frame, atlas, camera);
        // [snippet draw-region]
        fieldSky(drawing, weather);
        drawRegion(drawing, region, weather);
        // [/snippet draw-region]
#if LAB_CHECKPOINT >= 6002
        if (showProbe && hit.found) {
            if (debug) {
                meshEdge(drawing, shotOrigin, shotOrigin + shotDirection * hit.distance);
            }
            const Vec3 cell{double(hit.cell.x), double(hit.cell.y), double(hit.cell.z)};
            for (int i = 0; i < 8; ++i)
                for (int bit : {1, 2, 4})
                    if (!(i & bit)) {
                        const int j = i | bit;
                        meshEdge(drawing, cell + Vec3{double(i & 1), double((i >> 1) & 1), double((i >> 2) & 1)}, cell + Vec3{double(j & 1), double((j >> 1) & 1), double((j >> 2) & 1)});
                    }
        }
#endif
#if LAB_CHECKPOINT >= 6401
        // [snippet snow-draw]
        for (const auto& f : snow.pool)
            if (f.alive)
                depthDot(drawing, f.point, {226, 239, 248}, 0.025, true);
        // [/snippet snow-draw]
#endif
#if LAB_CHECKPOINT >= 6404
        // [snippet fire-site]
        const int z = 147;
        const int x = campX(region.seed);
        const Vec3 hearth{x + 0.5, siteAt(x, z, region.seed).ground + 1.06, z + 0.5};
        // [/snippet fire-site]
        if (dot(hearth - camera.eye, hearth - camera.eye) < 28 * 28) {
            for (int j = 0; j < 10; ++j) {
                const double angle = j * 2 * pi / 10;
                depthDot(drawing, hearth + Vec3{0.6 * std::cos(angle), 0, 0.6 * std::sin(angle)}, {85, 82, 77}, 0.13);
            }
            // [snippet embers]
            for (int i = 0; i < 46; ++i) {
                const double age = std::fmod(seconds * (0.80 + 0.035 * (i % 5)) + i * 0.618, 1.0);
                const double angle = i * 2.4 + age;
                const double radius = (1 - age) * 0.24;
                const Vec3 ember = hearth + Vec3{radius * std::cos(angle) + age * 0.27, 0.05 + age * 0.99, radius * std::sin(angle)};
                depthDot(drawing, ember, blend({255, 217, 95}, {230, 73, 34}, age), 0.10 * (1 - age) + 0.012, true);
            }
            // [/snippet embers]
        }
#endif
    }
};

inline void travel(Scene& scene, double forward, double right, double up, double dt) {
    const Vec3 dir = walkDirection(scene.camera.yaw, forward, right);
    const double step = 5.6 * std::clamp(dt, 0.0, 0.05);
#if LAB_CHECKPOINT >= 6403
    if (!scene.flying && scene.preset == 2) {
        scene.moveAxis(dir.x * step, 0);
        scene.moveAxis(0, dir.z * step);
        return;
    }
#endif
    scene.camera.eye = scene.camera.eye + dir * step;
    scene.camera.eye.y = std::clamp(scene.camera.eye.y + up * step, -4.0, 89.0);
    scene.camera.eye.x = std::clamp(scene.camera.eye.x, -65000.0, 65000.0);
    scene.camera.eye.z = std::clamp(scene.camera.eye.z, -65000.0, 65000.0);
}
} // namespace trail
#endif
