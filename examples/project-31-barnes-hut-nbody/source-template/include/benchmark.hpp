#pragma once
#include "experiments.hpp"

namespace lab {
#if LAB_CHECKPOINT >= 9
// [snippet:RuntimeRow]
struct RuntimeRow {
    std::size_t count{};
    double directMedian{};
    double directMinimum{};
    double directMaximum{};
    double treeMedian{};
    double treeMinimum{};
    double treeMaximum{};
    double buildMicroseconds{};
    double checksum{};
    std::size_t directWork{};
    std::size_t treeWork{};
};

// [/snippet:RuntimeRow]

// [snippet:RuntimeJob]
struct RuntimeJob {
    std::vector<Body> bodies{};
    BarnesHutTree tree{};
    std::vector<RuntimeRow> rows{};
    std::array<double, 5> directTimes{};
    std::array<double, 5> treeTimes{};
    std::size_t target{};
    int sizeIndex{};
    int sample{};
    int method{};
    double elapsedMicroseconds{};
    double checksum{};
    std::size_t work{};
    std::size_t directWork{};
    double theta{0.5};
    double epsilon{0.02};
    bool active{};
    bool timedOut{};
    std::chrono::steady_clock::time_point deadline{};

    void prepareSize() {
        constexpr std::array<std::size_t, 3> counts{256, 1024, 4096};
        bodies = makeGalaxyBodies(counts[std::size_t(sizeIndex)], galaxySeed);
        tree = buildMassOctree(bodies);
        sample = 0;
        method = 0;
        target = 0;
        checksum = 0;
        work = 0;
        elapsedMicroseconds = 0;
    }

    void start(double selectedTheta, double selectedEpsilon) {
        *this = {};
        theta = selectedTheta;
        epsilon = selectedEpsilon;
        active = true;
        deadline = std::chrono::steady_clock::now() + std::chrono::seconds(30);
        prepareSize();
    }

    void tick() {
        const auto until = std::chrono::steady_clock::now() + std::chrono::milliseconds(6);
        while (active && std::chrono::steady_clock::now() < until) {
            if (std::chrono::steady_clock::now() >= deadline) {
                active = false;
                timedOut = true;
                return;
            }
            const auto started = std::chrono::steady_clock::now();
            AccelerationResult force{};
            if (method == 0) {
                force = directAcceleration(bodies, target, gravity, epsilon);
            } else {
                force = barnesHutAcceleration(tree, bodies, target, theta, gravity, epsilon);
            }
            elapsedMicroseconds += std::chrono::duration<double, std::micro>(std::chrono::steady_clock::now() - started).count();
            checksum += force.acceleration.x + force.acceleration.y + force.acceleration.z;
            work += force.metrics.exactInteractions + force.metrics.approximatedNodes;
            ++target;
            if (target < bodies.size()) {
                continue;
            }
            if (sample > 0) {
                if (method == 0) {
                    directTimes[std::size_t(sample - 1)] = elapsedMicroseconds;
                } else {
                    treeTimes[std::size_t(sample - 1)] = elapsedMicroseconds;
                }
            }
            if (method == 0) {
                directWork = work;
            }
            ++method;
            if (method == 2) {
                method = 0;
                ++sample;
            }
            if (sample == 6) {
                std::sort(directTimes.begin(), directTimes.end());
                std::sort(treeTimes.begin(), treeTimes.end());
                RuntimeRow row{};
                row.count = bodies.size();
                row.directMedian = directTimes[2];
                row.directMinimum = directTimes[0];
                row.directMaximum = directTimes[4];
                row.treeMedian = treeTimes[2];
                row.treeMinimum = treeTimes[0];
                row.treeMaximum = treeTimes[4];
                row.buildMicroseconds = tree.rebuildMicroseconds;
                row.checksum = checksum;
                row.directWork = directWork;
                row.treeWork = work;
                rows.push_back(row);
                ++sizeIndex;
                if (sizeIndex == 3) {
                    active = false;
                    return;
                }
                prepareSize();
            }
            target = 0;
            elapsedMicroseconds = 0;
            checksum = 0;
            work = 0;
        }
    }
};

// [/snippet:RuntimeJob]
#endif
} // namespace lab
