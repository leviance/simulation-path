#include "sculpt_mesh_file.hpp"
#include "sculpt_mesh_snapshot.hpp"
#include <iostream>
#include <sstream>

void testMeshReaderTriangles() {
    using namespace sculpt;
    // Include signed zero and a nontrivial binary32 value, not only integer coordinates.
    const std::array<SurfaceVertex, 6> expected{{
        {{-0.0F, 0.123456789F, 0, 1}, {0, 0, 1, 0}},
        {{1, 0, 0, 1}, {0, 0, 1, 0}},
        {{0, 1, 0, 1}, {0, 0, 1, 0}},
        {{0, 0, std::nextafter(1.0F, 2.0F), 1}, {0, 1, 0, 0}},
        {{1, 0, 1, 1}, {0, 1, 0, 0}},
        {{0, 1, 1, 1}, {0, 1, 0, 0}},
    }};
    std::ostringstream output;
    MeshWriter writer(output);
    writer.append(expected);
    for (const std::size_t lines : {1U, 2U, 7U, 2048U}) {
        std::istringstream input(output.str());
        std::size_t compared = 0, triangles = 0;
        MeshReader reader(input, [&](std::span<const SurfaceVertex> actual) {
            if (actual.size() != 3 || compared + actual.size() > expected.size() || !sameSurfaceBytes(actual, std::span(expected).subspan(compared, actual.size())))
                throw std::runtime_error("Streamed OBJ triangle did not preserve exact position/normal bytes");
            compared += actual.size();
            ++triangles;
        });
        while (!reader.complete())
            reader.readBatch(lines);
        if (compared != expected.size() || triangles != 2)
            throw std::runtime_error("OBJ visitor missed or repeated a triangle across line batches");
    }

    // A face with repeated indices must be rejected before it reaches the visitor.
    const auto face = output.str().find("f 1//1 2//2 3//3");
    if (face == std::string::npos)
        throw std::runtime_error("Cannot prepare the isolated invalid OBJ fixture");
    auto invalid = output.str();
    invalid.replace(face, 16, "f 1//1 2//2 2//2");
    std::istringstream badInput(invalid);
    std::size_t visits = 0;
    MeshReader badReader(badInput, [&](std::span<const SurfaceVertex>) {
        ++visits;
    });
    bool rejected = false;
    try {
        while (!badReader.complete())
            badReader.readBatch(1);
    } catch (const std::invalid_argument&) {
        rejected = true;
    }
    if (!rejected || visits != 0)
        throw std::runtime_error("An invalid triangle reached the OBJ visitor");
    std::cout << "MESH NUMERIC BYTES PASS triangles=2 batches=4 signedZero=1 binary32=1 noHashEqualityShortcut=1 invalidBeforeVisit=1\n";
}
