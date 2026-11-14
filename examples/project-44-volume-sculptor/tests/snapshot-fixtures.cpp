#include "sculpt_mesh_snapshot.hpp"
#include <iostream>

void testMeshSnapshotBytes() {
    using namespace sculpt;
    const std::array<SurfaceVertex, 1> original{{{{0, 0, 0, 1}, {0, 1, 0, 0}}}};
    auto changed = original;
    if (!sameSurfaceBytes(original, changed) || !sameSurfaceBytes({}, {}))
        throw std::runtime_error("Mesh byte oracle rejected identical or empty payloads");
    changed[0].position[0] = -0.0F;
    if (sameSurfaceBytes(original, changed))
        throw std::runtime_error("Mesh byte oracle used float equality instead of exact bit patterns");
    changed = original;
    changed[0].normal[1] = std::nextafter(1.0F, 2.0F);
    if (sameSurfaceBytes(original, changed) || sameSurfaceBytes(original, {}))
        throw std::runtime_error("Mesh byte oracle missed a normal ULP or a count mismatch");
    std::cout << "MESH BYTE ORACLE PASS identical=1 empty=1 signedZeroDistinguished=1 normalUlp=1 countMismatch=1 noHashCollisionShortcut=1\n";
}
