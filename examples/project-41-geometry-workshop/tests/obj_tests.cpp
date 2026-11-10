#include "obj_mesh.hpp"
#include "test_support.hpp"

#include <limits>
#include <sstream>
#include <string>

namespace {

using geometry_tests::buildMesh;
using geometry_tests::require;

void checkRoundTrip(const geometry::Mesh& mesh) {
    std::ostringstream text;
    geometry::writeObj(text, mesh);
    const auto imported = geometry::readWorkshopObj(text.str());
    require(imported.positions.size() == mesh.vertices.size(), "OBJ preserves the number of vertex records");
    require(imported.indices == mesh.indices, "OBJ preserves triangles and their winding");
    for (std::size_t index = 0; index < mesh.vertices.size(); ++index) {
        const auto& vertex = mesh.vertices[index];
        require(imported.positions[index] == vertex.position && imported.uv[index] == vertex.uv && imported.normals[index] == vertex.normal, "OBJ round-trip preserves every exported attribute");
    }
}

void requireInvalidObj(const std::string& text) {
    try {
        geometry::readWorkshopObj(text);
    } catch (const std::invalid_argument&) {
        return;
    }
    throw std::runtime_error("Invalid OBJ must be rejected");
}

} // namespace

void runObjTests() {
    using geometry::SurfaceKind;
    for (const auto kind : {SurfaceKind::torus, SurfaceKind::shell, SurfaceKind::mobius, SurfaceKind::knot}) {
        auto settings = geometry::presetSettings(kind);
        settings.uSegments = 64;
        settings.vSegments = 16;
        checkRoundTrip(buildMesh(settings));
    }
    auto high = geometry::presetSettings(SurfaceKind::knot);
    high.uSegments = 256;
    high.vSegments = 256;
    checkRoundTrip(buildMesh(high));

    const std::string attributes =
        "v 0 0 0\nv 1 0 0\nv 0 1 0\n"
        "vt 0 0\nvt 1 0\nvt 0 1\n"
        "vn 0 0 1\nvn 0 0 1\nvn 0 0 1\n";
    const auto triangle = geometry::readWorkshopObj(attributes + "f 1/1/1 2/2/2 3/3/3\n");
    require(triangle.indices == std::vector<std::uint32_t>{0, 1, 2}, "Read an independent one-based OBJ fixture");
    requireInvalidObj(attributes + "f 0/0/0 2/2/2 3/3/3\n");
    requireInvalidObj(attributes + "f 1/1/1 2/2/2 4/4/4\n");
    requireInvalidObj(attributes + "f 1/1/1 2/1/2 3/3/3\n");
    requireInvalidObj(attributes + "f 1/1/1 1/1/1 3/3/3\n");
    requireInvalidObj(attributes + "f 1/1/1 2/2/2 3/3/3 1/1/1\n");
    requireInvalidObj("v 1e500 0 0\n" + attributes);
    requireInvalidObj(std::string(257, '#'));

    auto invalid = buildMesh({});
    invalid.vertices.front().position[0] = std::numeric_limits<float>::infinity();
    std::ostringstream output;
    try {
        geometry::writeObj(output, invalid);
    } catch (const std::invalid_argument&) {
        require(output.str().empty(), "Validate geometry before writing any OBJ bytes");
        return;
    }
    throw std::runtime_error("OBJ export must reject invalid input before writing");
}
