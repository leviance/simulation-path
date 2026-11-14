#include "sculpt_mesh_file.hpp"
#include "sculpt_mesh_snapshot.hpp"
#include <iostream>
#include <sstream>

namespace {

void tinyMeshFileTriangles() {
    using namespace sculpt;
    // These are valid float positions, including a face whose float area squared underflows.
    for (const float side : {0.0000001F, 0.000000000001F, 1e-20F}) {
        const std::array<SurfaceVertex, 3> expected{{
            {{0, 0, 0, 1}, {0, 0, 1, 0}},
            {{side, 0, 0, 1}, {0, 0, 1, 0}},
            {{0, side, 0, 1}, {0, 0, 1, 0}},
        }};
        std::ostringstream output;
        MeshWriter writer(output);
        writer.append(expected);
        std::istringstream input(output.str());
        std::size_t compared = 0;
        MeshReader reader(input, [&](std::span<const SurfaceVertex> actual) {
            if (actual.size() != expected.size() || !sameSurfaceBytes(actual, expected))
                throw std::runtime_error("Tiny OBJ face lost exact position/normal bytes");
            compared += actual.size();
        });
        while (!reader.complete())
            reader.readBatch(1);
        if (compared != expected.size() || reader.summary().triangles != 1)
            throw std::runtime_error("Tiny valid OBJ face was lost during streaming");

        auto collinear = expected;
        collinear[2].position = {2 * side, 0, 0, 1};
        std::ostringstream invalidOutput;
        MeshWriter invalidWriter(invalidOutput);
        bool rejected = false;
        try {
            invalidWriter.append(collinear);
        } catch (const std::invalid_argument&) {
            rejected = true;
        }
        if (!rejected || invalidWriter.summary().vertices != 0)
            throw std::runtime_error("OBJ writer accepted a collinear triangle");
    }

    std::istringstream collinearInput("v 0 0 0\nvn 0 0 1\nv 1e-7 0 0\nvn 0 0 1\nv 2e-7 0 0\nvn 0 0 1\nf 1//1 2//2 3//3\n");
    std::size_t visits = 0;
    MeshReader invalidReader(collinearInput, [&](std::span<const SurfaceVertex>) {
        ++visits;
    });
    bool rejected = false;
    try {
        while (!invalidReader.complete())
            invalidReader.readBatch(1);
    } catch (const std::invalid_argument&) {
        rejected = true;
    }
    if (!rejected || visits != 0)
        throw std::runtime_error("A collinear OBJ face reached the visitor");
    std::cout << "MESH TINY FACE PASS scales=3 minimumSide=1e-20 floatAreaUnderflow=1 exactBytes=1 zeroAreaRejected=1\n";
}

} // namespace

void testMeshReaderTriangles() {
    using namespace sculpt;
    tinyMeshFileTriangles();
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
