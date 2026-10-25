// Oracle và các fixture độc lập vẫn chạy đầy đủ ở cả Debug lẫn Release.
#include "editor/scene.hpp"
#include <cstdlib>
#include <iostream>
#include <string_view>

namespace {
int failures = 0;
int checks = 0;

void check(bool condition, std::string_view message) {
    ++checks;
    if (!condition) {
        ++failures;
        std::cerr << "FAIL: " << message << '\n';
    }
}

std::vector<std::uint32_t> oracle(const maplab::Quadtree& tree, const maplab::Box& query) {
    std::vector<std::uint32_t> ids;
    for (const auto& [id, object] : tree.objects) {
        const auto& box = object.box;
        const double gapX = std::max(box.x, query.x) - std::min(box.x + box.width, query.x + query.width);
        const double gapY = std::max(box.y, query.y) - std::min(box.y + box.height, query.y + query.height);
        if (gapX <= 0 && gapY <= 0) {
            ids.push_back(id);
        }
    }
    std::sort(ids.begin(), ids.end());
    return ids;
}

void matches(const maplab::Quadtree& tree, const maplab::Box& region) {
    auto query = tree.query(region);
    std::sort(query.ids.begin(), query.ids.end());
    check(query.ids == oracle(tree, region), "AABB IDs match independent interval-gap oracle");
    check(std::adjacent_find(query.ids.begin(), query.ids.end()) == query.ids.end(), "query IDs unique");
}

void topology(const maplab::Quadtree& tree) {
    std::unordered_map<std::uint32_t, int> counts;
    for (std::size_t index = 0; index < tree.nodes.size(); ++index) {
        const auto& node = tree.nodes[index];
        check(node.depth <= tree.config.maximumDepth, "depth bound");
        for (std::uint32_t id : node.ids) {
            ++counts[id];
            check(tree.location.at(id) == static_cast<int>(index), "ID location map");
            check(maplab::contains(node.box, tree.objects.at(id).box), "object contained in storage node");
            if (!node.leaf()) {
                check(tree.childSlot(tree.objects.at(id).box, node) == -1, "parent stores only split-spanning objects");
            }
        }
        if (!node.leaf()) {
            for (int child : node.children) {
                check(child >= 0 && static_cast<std::size_t>(child) < tree.nodes.size(), "valid child index");
            }
        }
    }
    check(counts.size() == tree.objects.size() && tree.location.size() == tree.objects.size(), "no old deleted IDs");
    for (const auto& [id, object] : tree.objects) {
        static_cast<void>(object);
        check(counts[id] == 1, "each ID stored exactly once");
    }
}

void fixtures() {
    const std::vector<maplab::Object> objects{
        {50, maplab::Kind::House, {-10, -10, 20, 20}},
        {3, maplab::Kind::Tree, {-80, -80, 20, 20}},
        {9, maplab::Kind::House, {0, -60, 10, 20}},
        {7, maplab::Kind::Park, {-30, -50, 30, 10}},
        {99, maplab::Kind::House, {90, 90, 10, 10}},
        {51, maplab::Kind::House, {-10, -10, 20, 20}}};
    maplab::Config config{};
    config.root = {-100, -100, 200, 200};
    config.capacity = 1;
    config.minimumSize = 1;
    maplab::Quadtree tree(objects, config);
    check(tree.nodes[0].ids.contains(50) && tree.nodes[0].ids.contains(51), "large AABBs stay in parent");
    auto contact = tree.query({0, -50, 0, 0}).ids;
    std::sort(contact.begin(), contact.end());
    check(contact == std::vector<std::uint32_t>{7, 9}, "both sides of split contact included");
    check(tree.query({100, 100, 0, 0}).ids == std::vector<std::uint32_t>{99}, "root maximum edge inclusive");
    check(tree.query({101, 101, 0, 0}).ids.empty(), "outside root query empty");
    matches(tree, {-11, -11, 1, 1});
    matches(tree, config.root);
    const auto before = tree.objects.at(3).box;
    const auto revision = tree.revision;
    check(!tree.translateGroup({3, 9}, {1000, 0}), "invalid whole-group move rejected");
    check(tree.objects.at(3).box.x == before.x && tree.revision == revision, "rollback leaves data and revision unchanged");
    check(tree.translateGroup({3, 9}, {4, 2}), "valid group move");
    check(tree.remove(9) && !tree.remove(9), "remove once by ID");
    matches(tree, config.root);
    topology(tree);
    for (std::size_t maximumNodes : {std::size_t{1}, std::size_t{5}, std::size_t{262145}}) {
        config.maximumNodes = maximumNodes;
        config.maximumDepth = 8;
        std::vector<maplab::Object> coincident;
        for (std::uint32_t id = 0; id < 1000; ++id) {
            coincident.push_back({id, maplab::Kind::House, {10, 10, 1, 1}});
        }
        maplab::Quadtree dense(coincident, config);
        check(dense.nodes.size() <= maximumNodes, "node budget bounds coincident insertion");
        check(dense.query({10, 10, 0, 0}).ids.size() == 1000, "coincident objects not dropped");
        topology(dense);
    }
}

void camera() {
    maplab::Camera camera{-500, 1200, 0.3};
    const maplab::Point size{960, 600};
    const maplab::Point point{-700, 1500};
    const auto screen = maplab::worldToScreen(point, camera, size);
    const auto restored = maplab::screenToWorld(screen, camera, size);
    check(std::hypot(restored.x - point.x, restored.y - point.y) < 1e-9, "camera round trip");
    const maplab::Point anchor{250, 170};
    const auto before = maplab::screenToWorld(anchor, camera, size);
    maplab::zoomAt(camera, anchor, size, 1.5);
    const auto after = maplab::screenToWorld(anchor, camera, size);
    check(std::hypot(after.x - before.x, after.y - before.y) < 1e-9, "cursor anchored zoom");
}

void workflow() {
    maplab::Quadtree tree(maplab::makeObjects(100000, 1, maplab::Layout::Districts));
    check(tree.objects.size() == 100000, "100000 real area-bearing objects");
    const maplab::Box region{-12000, -12000, 1200, 1000};
    const auto selected = tree.query(region);
    check(!selected.ids.empty() && selected.candidates < 100000, "tree finds map region with pruned work");
    matches(tree, region);
    const std::unordered_set<std::uint32_t> ids(selected.ids.begin(), selected.ids.end());
    check(tree.translateGroup(ids, {128, 64}), "move selected group in 100000 map");
    tree.insert({100000, maplab::Kind::House, {-11500, -11500, 48, 32}});
    check(tree.remove(100000), "delete inserted object");
    check(tree.objects.size() == 100000, "workload retained after edit cycle");
    matches(tree, region);
    matches(tree, maplab::viewport({-11500, -11500, 0.5}, {960, 600}));
    topology(tree);
}

void gesturesAndJobs() {
    maplab::Scene scene;
    scene.document.tree.insert({0, maplab::Kind::House, {-10, -10, 20, 20}});
    scene.document.tree.insert({1, maplab::Kind::Park, {-10, -10, 20, 20}});
    scene.document.nextId = 2;
    scene.camera = {0, 0, 1};
    scene.document.pick({0, 0});
    check(scene.document.selection == std::unordered_set<std::uint32_t>{1}, "click follows ascending paint order");
    scene.tool = maplab::Tool::Move;
    const maplab::Point center{480, 300};
    maplab::beginGesture(scene, center, false);
    maplab::moveGesture(scene, {490, 300});
    check(scene.document.tree.objects.at(1).box.x == -10, "drag preview does not change source data");
    maplab::endGesture(scene, {500, 300});
    check(scene.document.tree.objects.at(1).box.x == 10, "pointer-up position commits even without final move event");
    const auto revision = scene.document.tree.revision;
    maplab::beginGesture(scene, {500, 300}, false);
    maplab::moveGesture(scene, {510, 300});
    maplab::cancelGesture(scene);
    check(scene.document.tree.revision == revision && scene.document.tree.objects.at(1).box.x == 10, "cancel keeps committed data unchanged");
    maplab::beginGesture(scene, {500, 300}, false);
    maplab::endGesture(scene, {100000, 300});
    check(scene.document.tree.revision == revision, "root violation rolls back whole gesture");

    auto validation = maplab::createValidation(scene.document.tree, maplab::viewport(scene.camera, scene.size));
    for (int tick = 0; tick < 100 && validation.active; ++tick) {
        maplab::tickValidation(validation);
    }
    check(!validation.active && validation.failures == 0 && validation.checked == validation.boxes.size(), "finite validation checks every query");
    auto benchmark = maplab::createBenchmark(scene.document.tree, maplab::viewport(scene.camera, scene.size));
    for (int tick = 0; tick < 100 && benchmark.active; ++tick) {
        maplab::tickBenchmark(benchmark);
    }
    check(!benchmark.active && benchmark.rows.size() == 2, "finite benchmark completes both methods");
    if (benchmark.rows.size() == 2) {
        check(benchmark.rows[0].samples == 5 && benchmark.rows[1].samples == 5, "warm-up excluded from five samples");
        check(benchmark.rows[0].checksum == benchmark.rows[1].checksum, "Tree and Brute checksum agreement");
    }
    validation = maplab::createValidation(scene.document.tree, maplab::worldRoot);
    scene.document.addObject({100, 100}, maplab::Kind::Tree);
    maplab::tickValidation(validation);
    check(validation.stale && !validation.active, "revision change invalidates running validation");
    scene.document.tree.location[1] = -1;
    check(maplab::inspectTopology(scene.document.tree) != 0, "topology detects broken ID location");
}
} // namespace

int main() {
    fixtures();
    camera();
    workflow();
    gesturesAndJobs();
    std::cout << "P29 Map Editor: " << checks << " checks, " << failures << " failures\n";
    if (failures != 0) {
        return EXIT_FAILURE;
    }
    return EXIT_SUCCESS;
}
