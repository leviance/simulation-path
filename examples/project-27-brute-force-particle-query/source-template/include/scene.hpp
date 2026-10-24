#pragma once
#include "lab.hpp"
#include <array>

namespace lab {
// Các phép truy vấn và renderer đều đọc cùng scene; không có dữ liệu hạt giả để vẽ.
struct Scene {
    static constexpr Bounds2D bounds{{0, 0}, {1, 1}};
    std::uint32_t seed{0x00c0ffeeU};
    std::vector<Particle> particles{};
    std::size_t count{100'000};
    bool paused{true};
    bool debug{true};
    double phase{};
#if LAB_CHECKPOINT >= 2
    CircleQuery query{{0.5, 0.5}, 0.08};
#endif
#if LAB_CHECKPOINT >= 3
    BruteForceResult readable{};
    std::size_t scanLimit{100'000};
    double queryMicroseconds{};
#endif
#if LAB_CHECKPOINT >= 4
    QueryWorkspace workspace{};
    bool referenceMatches{true};
#endif
#if LAB_CHECKPOINT >= 5
    struct Job {
        bool active{};
        bool scaling{};
        std::size_t row{};
        std::size_t cursor{};
        std::size_t warmup{};
        BatchMetrics metrics{};
        QueryWorkspace workspace{};
        std::vector<CircleQuery> probes{};
    } job{};

    BatchMetrics benchmark{};
#endif
#if LAB_CHECKPOINT >= 6
    std::vector<ScalingRow> rows{};
#endif
};

inline void stopScene(Scene& scene) {
    scene.paused = true;
#if LAB_CHECKPOINT >= 5
    scene.job.active = false;
#endif
}

inline void resetScene(Scene& scene) {
    const bool debug = scene.debug;
    scene = {};
    scene.debug = debug;
#if LAB_CHECKPOINT >= 1
    scene.particles = makeParticleCloud(100'000, Scene::bounds, scene.seed);
#else
    scene.count = 0;
#endif
#if LAB_CHECKPOINT >= 4
    reserveQueryWorkspace(scene.workspace, scene.particles.size());
#endif
}

inline void invalidateMeasurement(Scene& scene) {
    stopScene(scene);
#if LAB_CHECKPOINT >= 5
    scene.benchmark = {};
#endif
#if LAB_CHECKPOINT >= 6
    scene.rows.clear();
#endif
}

#if LAB_CHECKPOINT >= 3
inline void refreshQuery(Scene& scene) {
    const auto active = std::span<const Particle>(scene.particles).first(std::min(scene.count, scene.scanLimit));
#if LAB_CHECKPOINT >= 4
    const auto started = std::chrono::steady_clock::now();
    queryBruteForceSquared(active, scene.query, scene.workspace);
    const auto finished = std::chrono::steady_clock::now();
    scene.queryMicroseconds = std::chrono::duration<double, std::micro>(finished - started).count();
#if LAB_CHECKPOINT == 4
    // Chỉ bài đối chiếu mới chạy cả hai phiên bản. Reference không nằm trong vùng đo.
    scene.readable = queryBruteForce(active, scene.query);
    scene.referenceMatches = scene.readable.hitIndices == scene.workspace.hitIndices && scene.readable.nearestIndex == scene.workspace.nearestIndex;
#endif
#else
    const auto started = std::chrono::steady_clock::now();
    scene.readable = queryBruteForce(active, scene.query);
    const auto finished = std::chrono::steady_clock::now();
    scene.queryMicroseconds = std::chrono::duration<double, std::micro>(finished - started).count();
#endif
}
#endif

#if LAB_CHECKPOINT >= 5
inline constexpr std::array<std::size_t, 3> kStudyCounts{1'000, 10'000, 100'000};
inline constexpr std::size_t kProbeCount = 24;
inline constexpr std::size_t kRepetitions = 2;

inline void requestBenchmark(Scene& scene, bool scaling) {
    invalidateMeasurement(scene);
    scene.job = {};
    scene.job.active = true;
#if LAB_CHECKPOINT >= 6
    scene.job.scaling = scaling;
#else
    (void)scaling;
#endif
    scene.job.probes = makeProbeQueries(kProbeCount, Scene::bounds, scene.query.radius, scene.seed ^ 0x9e3779b9U);
    reserveQueryWorkspace(scene.job.workspace, scene.particles.size());
}

inline void advanceJob(Scene& scene) {
    if (!scene.job.active) {
        return;
    }
    auto& job = scene.job;
    std::size_t count = scene.count;
    if (job.scaling) {
        count = kStudyCounts[job.row];
    }
    const auto active = std::span<const Particle>(scene.particles).first(count);
    // Tối đa một query mỗi frame. SDL vẫn xử lý input giữa hai lần gọi.
    if (job.warmup < job.probes.size()) {
        queryBruteForceSquared(active, job.probes[job.warmup], job.workspace);
        ++job.warmup;
        return;
    }
    const auto started = std::chrono::steady_clock::now();
    queryBruteForceSquared(active, job.probes[job.cursor % job.probes.size()], job.workspace);
    const auto finished = std::chrono::steady_clock::now();
    job.metrics.elapsedMicroseconds += std::chrono::duration<double, std::micro>(finished - started).count();
    ++job.metrics.queryCount;
    job.metrics.totalScanned += job.workspace.scanned;
    job.metrics.totalHits += job.workspace.hitIndices.size();
    job.metrics.checksum = updateChecksum(job.metrics.checksum, job.workspace);
    ++job.cursor;
    if (job.cursor != job.probes.size() * kRepetitions) {
        return;
    }
#if LAB_CHECKPOINT >= 6
    if (job.scaling) {
        scene.rows.push_back({count, job.metrics});
        ++job.row;
        if (job.row < kStudyCounts.size()) {
            job.cursor = 0;
            job.warmup = 0;
            job.metrics = {};
            return;
        }
    } else {
        scene.benchmark = job.metrics;
    }
#else
    scene.benchmark = job.metrics;
#endif
    job.active = false;
}
#endif
} // namespace lab
