#include "morph_preparation.hpp"

#include <cstdlib>
#include <iostream>
#include <limits>
#include <numeric>
#include <set>

namespace {

using namespace morph;

void require(bool condition, const char *message) {
    if (!condition)
        throw std::runtime_error(message);
}
void near(double actual, double expected, double tolerance, const char *message) {
    require(std::isfinite(actual) && std::abs(actual - expected) <= tolerance, message);
}
template <typename Action>
void rejects(Action action) {
    bool rejected = false;
    try {
        action();
    } catch (const std::exception &) {
        rejected = true;
    }
    require(rejected, "Invalid operation was not rejected");
}

void samplingFixtures() {
    Random known(42);
    require(known.next() == 1083814273U && known.next() == 378494188U && known.next() == 2479403867U, "Random sequence must be reproducible");
    const auto weights = barycentric(0.25, 0.5);
    near(weights[0], 0.5, 1e-14, "Barycentric fixture");
    near(weights[1], 0.25, 1e-14, "Barycentric fixture");
    near(weights[2], 0.25, 1e-14, "Barycentric fixture");
    rejects([] { barycentric(-0.1, 0.5); });
    rejects([] { barycentric(0.1, std::numeric_limits<double>::quiet_NaN()); });

    Mesh fixture;
    fixture.vertices = {{0, 0, 0}, {2, 0, 0}, {0, 1, 0}, {10, 0, 0}, {14, 0, 0}, {10, 2, 0}};
    fixture.triangles = {{0, 1, 2}, {3, 4, 5}, {0, 0, 0}};
    const AreaDistribution distribution(fixture);
    near(distribution.totalArea(), 5.0, 1e-12, "Independent triangle areas are one and four");
    for (std::uint32_t seed = 1; seed <= 8; ++seed) {
        Random random(seed * 7919U);
        constexpr int count = 40000;
        int first = 0;
        double centroidX = 0.0;
        double centroidY = 0.0;
        for (int id = 0; id < count; ++id) {
            const auto sample = distribution.sample(fixture, random, Sampling::area);
            require(sample.triangle < 2, "Degenerate triangles cannot receive samples");
            if (sample.triangle == 0)
                ++first;
            // Check the barycentric centroid separately, not with the sampler as its own oracle.
            const double u = random.uniform();
            const double v = random.uniform();
            const auto w = barycentric(u, v);
            centroidX += 2.0 * w[1];
            centroidY += w[2];
            require(w[0] >= 0.0 && w[1] >= 0.0 && w[2] >= 0.0, "Samples remain inside the triangle");
            near(w[0] + w[1] + w[2], 1.0, 1e-12, "Barycentric sum");
        }
        const double expected = count * 0.2;
        const double uncertainty = 6.0 * std::sqrt(count * 0.2 * 0.8) + 1.0;
        near(first, expected, uncertainty, "Area frequency must agree within six binomial standard deviations");
        near(centroidX / count, 2.0 / 3.0, 0.012, "Triangle centroid x");
        near(centroidY / count, 1.0 / 3.0, 0.006, "Triangle centroid y");
    }
    Random biased(7);
    int firstBiased = 0;
    for (int id = 0; id < 40000; ++id) {
        if (distribution.sample(fixture, biased, Sampling::triangleBiased).triangle == 0)
            ++firstBiased;
    }
    near(firstBiased, 20000, 700, "Wrong comparison samples triangles uniformly, not by area");
    rejects([&] { distribution.choose(1.0, Sampling::area); });
    fixture.triangles.push_back({100, 0, 0});
    rejects([&] { AreaDistribution invalid(fixture); });
}

void matchingFixtures() {
    std::vector<Vec4> source;
    std::vector<Vec4> target;
    for (int id = 0; id < 1021; ++id) {
        source.push_back(pack({-3.0 + id * 0.0057, std::sin(id * 0.019), std::cos(id * 0.017)}));
    }
    target.assign(source.rbegin(), source.rend());
    SpatialOrder sourceOrder;
    SpatialOrder targetOrder;
    sourceOrder.begin(source.size());
    targetOrder.begin(target.size());
    int batches = 0;
    while (!sourceOrder.advance(source, 19))
        require(++batches < 10000, "Counting sort must finish");
    batches = 0;
    while (!targetOrder.advance(target, 19))
        require(++batches < 10000, "Counting sort must finish");
    std::set<std::uint32_t> seen;
    double orderedDistance = 0.0;
    double reversedDistance = 0.0;
    std::uint32_t previousKey = 0;
    for (std::size_t rank = 0; rank < source.size(); ++rank) {
        const auto a = sourceOrder.order()[rank];
        const auto b = targetOrder.order()[rank];
        const auto key = spatialKey(xyz(source[a]));
        require(rank == 0 || previousKey <= key, "Morton keys must be sorted");
        previousKey = key;
        seen.insert(a);
        orderedDistance += length(xyz(source[a]) - xyz(target[b]));
        reversedDistance += length(xyz(source[rank]) - xyz(target[rank]));
    }
    require(seen.size() == source.size(), "Sort must retain each ID once");
    require(orderedDistance < reversedDistance * 0.1, "Spatial matching must visibly improve this known correspondence fixture");
    require(spatialKey({-99, -99, -99}) == 0 && spatialKey({99, 99, 99}) == spatialCellCount - 1, "Quantizer clamps within its declared grid");
}

void timelineFixtures() {
    const Vec3 a{1, 2, 3};
    const Vec3 b{-3, -2, -1};
    const Vec3 offset{0.2, 1.5, -0.3};
    for (const Easing easing : {Easing::linear, Easing::smooth}) {
        for (const Path path : {Path::straight, Path::arc, Path::flow}) {
            near(length(morphPosition(a, b, offset, 0.0, easing, path) - a), 0, 0, "Source endpoint is exact");
            near(length(morphPosition(a, b, offset, 1.0, easing, path) - b), 0, 0, "Target endpoint is exact");
        }
    }
    const auto firstFlow = morphPosition(a, b, offset, 0.5, Easing::smooth, Path::flow, 7);
    const auto secondFlow = morphPosition(a, b, offset, 0.5, Easing::smooth, Path::flow, 8);
    require(length(firstFlow - secondFlow) > 0.1, "Flow gives different IDs independent trajectories, not one moving tile");
    near(length(firstFlow - morphPosition(a, b, offset, 0.5, Easing::smooth, Path::flow, 7)), 0, 0, "Flow is a deterministic function of ID and time");
    for (std::uint32_t id = 0; id < 64; ++id) {
        double previous = -1.0;
        for (int step = 0; step <= 100; ++step) {
            const double phase = flowPhase(step / 100.0, id);
            require(phase >= previous && phase >= 0.0 && phase <= 1.0, "Per-ID phase stays monotonic within the common duration");
            previous = phase;
        }
    }
    Timeline sixty;
    Timeline irregular;
    sixty.loop = irregular.loop = false;
    sixty.paused = irregular.paused = false;
    for (int step = 0; step < 120; ++step)
        sixty.advance(1.0 / 60.0);
    for (int step = 0; step < 10; ++step) {
        irregular.advance(0.011);
        irregular.advance(0.037);
        irregular.advance(0.152);
    }
    near(sixty.time, irregular.time, 1e-12, "Time is a sum of dt, not a frame counter");
    near(length(morphPosition(a, b, offset, sixty.normalized(), Easing::smooth, Path::arc) - morphPosition(a, b, offset, irregular.normalized(), Easing::smooth, Path::arc)), 0, 1e-12, "Equal model times give equal positions");
    sixty.paused = true;
    const double frozen = sixty.time;
    sixty.advance(0.4);
    near(sixty.time, frozen, 0, "Pause freezes model time");
    sixty.scrub(1.0);
    require(sixty.paused && sixty.normalized() == 1.0, "Scrub can reach the exact target");
    sixty.reverse = true;
    sixty.paused = false;
    sixty.advance(0.5);
    near(sixty.time, 4.5, 1e-12, "Reverse decreases model time");
    sixty.reset();
    require(sixty.time == 0.0 && sixty.paused, "Reset returns to the source");
    rejects([&] { sixty.advance(-0.1); });
    sixty.duration = 0.0;
    rejects([&] { sixty.normalized(); });
}

std::shared_ptr<Prepared> finish(Preparation &job) {
    int batches = 0;
    while (!job.advance(127))
        require(++batches < 10000, "Preparation must be bounded");
    return job.take();
}

void preparationFixtures() {
    Settings settings;
    settings.count = 4097;
    settings.seed = 19;
    Preparation first(settings, 1);
    Preparation second(settings, 2);
    const auto a = finish(first);
    const auto b = finish(second);
    require(a->source == b->source && a->target == b->target && a->path == b->path, "Seed reproduces source, target and path");
    std::set<std::uint32_t> randomIds;
    std::set<std::uint32_t> spatialIds;
    std::uint64_t observed = 0;
    for (const auto count : a->observed)
        observed += count;
    require(observed == settings.count, "Histogram accounts for every source ID");
    for (std::size_t id = 0; id < a->source.size(); ++id) {
        require(a->mapping[id].random == b->mapping[id].random && a->mapping[id].spatial == b->mapping[id].spatial, "Matching is reproducible");
        randomIds.insert(a->mapping[id].random);
        spatialIds.insert(a->mapping[id].spatial);
    }
    require(randomIds.size() == settings.count && spatialIds.size() == settings.count, "Both correspondences are permutations");
    PreparationSession session;
    require(session.request(settings), "Accept initial settings");
    for (int frame = 0; !session.ready(); ++frame) {
        require(frame < 10000, "Initial preparation deadline");
        session.advance();
    }
    session.accept();
    const auto retained = session.active();
    settings.seed = 100;
    require(session.request(settings), "Start a candidate");
    session.advance();
    session.cancel();
    require(session.active() == retained && !session.busy(), "Cancel keeps ACTIVE unchanged");
    settings.count = 0;
    require(!session.request(settings) && session.active() == retained, "Invalid input keeps last-good");
    require(!session.error().empty(), "Invalid input reports a reason");
    const auto plan = planMemory(1000003, 1000003);
    require(plan.sourceBytes == 16000048 && plan.mappingBytes == 8000024 && plan.currentBytes == 16000064, "Payload counts include the current tail canary");
    rejects([] { planMemory(std::numeric_limits<std::uint32_t>::max()); });
}

} // namespace

int main() {
    try {
        samplingFixtures();
        matchingFixtures();
        timelineFixtures();
        preparationFixtures();
        std::cout << "P42 CORE PASS: area uncertainty/centroid, bijections, dt, endpoints, finite jobs and last-good\n";
        return EXIT_SUCCESS;
    } catch (const std::exception &error) {
        std::cerr << "P42 CORE FAIL: " << error.what() << '\n';
        return EXIT_FAILURE;
    }
}
