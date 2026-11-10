#include "mesh_session.hpp"
#include "test_support.hpp"

namespace {

using geometry::MeshPass;
using geometry::MeshSession;
using geometry::SurfaceKind;
using geometry::SurfaceSettings;
using geometry_tests::require;

void advanceUntilReady(MeshSession& session) {
    constexpr int maxBatches = (geometry::maxSegments + 1 + geometry::maxRowsPerBatch - 1) / geometry::maxRowsPerBatch;
    for (int batch = 0; batch < maxBatches && !session.readyMesh(); ++batch)
        session.advance();
    require(session.readyMesh(), "A valid candidate must finish in a bounded number of batches");
}

} // namespace

void runMeshSessionTests() {
    MeshSession session;
    SurfaceSettings torus;
    torus.uSegments = 32;
    torus.vSegments = 16;
    require(session.request(torus), "Initial torus is valid");
    advanceUntilReady(session);
    require(session.readyPass() == MeshPass::final, "Small meshes do not need a duplicate preview");
    require(!session.displayedMesh(), "Ready mesh is not visible before upload");
    require(session.acceptReady() && session.lastGood(), "Viewer accepts the fully uploaded torus");
    const auto* retained = session.lastGood()->vertices.data();

    const auto shell = geometry::presetSettings(SurfaceKind::shell);
    require(session.request(shell), "Request the shell");
    session.advance();
    require(session.displayedMesh()->settings.kind == SurfaceKind::torus, "Old mesh keeps its real preset label");
    require(session.readyPass() == MeshPass::preview, "Build a small shell preview before the full mesh");
    require(session.readyMesh() && session.readyMesh()->vertices.size() <= 65 * 17, "One bounded preview per frame");
    require(session.acceptReady(), "Preview can be uploaded and shown");
    require(session.showingPreview() && session.displayedMesh()->settings.uSegments == geometry::minSweepSegments, "Preview resolution remains explicit");
    require(session.lastGood()->vertices.data() == retained, "Preview cannot overwrite the last complete mesh");
    session.advance();
    require(session.completedRows() == geometry::maxRowsPerBatch, "Full refinement advances only eight rows per frame");

    session.cancel();
    require(!session.requested() && !session.readyMesh() && !session.showingPreview(), "Cancel removes all candidate work");
    require(session.displayedMesh()->vertices.data() == retained, "Cancel restores the retained torus");

    require(session.request(shell), "Restart the shell");
    advanceUntilReady(session);
    auto knot = geometry::presetSettings(SurfaceKind::knot);
    require(session.request(knot), "A newer request replaces a ready old candidate before upload");
    require(!session.acceptReady(), "Old shell cannot publish under the knot label");
    advanceUntilReady(session);
    require(session.readyMesh()->settings.kind == SurfaceKind::knot, "Only the newest candidate is ready");
    session.reject("GPU upload refused");
    require(session.lastGood()->vertices.data() == retained && !session.requested(), "Upload failure keeps the last-good mesh");

    require(session.request(knot), "Retry the knot");
    advanceUntilReady(session);
    session.acceptReady();
    knot.sectionTurns = 0.5;
    require(!session.request(knot), "A fractional twist cannot close the knot's elliptical section");
    require(!session.showingPreview() && session.lastGood()->vertices.data() == retained, "Invalid settings discard preview");

    knot.sectionTurns = 1;
    knot.uSegments = 256;
    knot.vSegments = 256;
    require(session.request(knot), "A valid high-resolution knot is accepted");
    advanceUntilReady(session);
    session.acceptReady();
    advanceUntilReady(session);
    require(session.readyPass() == MeshPass::final, "Refinement must follow the preview");
    require(session.readyMesh()->vertices.size() == 66049, "The full knot is not substituted with its preview");
    session.acceptReady();
    require(session.publicationCount() == 2 && session.lastGood()->settings == knot, "Only completed full meshes publish");
    const auto count = session.buildCount();
    require(session.request(knot), "Unchanged settings are allowed");
    for (int frame = 0; frame < 100; ++frame)
        session.advance();
    require(session.buildCount() == count && !session.requested(), "Idle frames and unchanged settings never rebuild");

    const auto* lastFullKnot = session.lastGood()->vertices.data();
    auto dragged = knot;
    for (const double radius : {1.7, 2.0, 2.4}) {
        dragged.radius = radius;
        require(session.request(dragged, true), "Slider accepts the latest request");
        session.advance();
        require(session.readyMesh() && session.readyPass() == MeshPass::preview, "Slider responds before release");
        require(session.readyMesh()->settings.radius == radius, "Only the latest slider value becomes visible");
        session.acceptReady();
        require(session.waitingForRelease(), "Held slider postpones full refinement");
        const auto previewCount = session.buildCount();
        for (int frame = 0; frame < 4; ++frame)
            session.advance();
        require(session.buildCount() == previewCount && session.lastGood()->vertices.data() == lastFullKnot, "Held preview does not rebuild the full mesh or replace last-good");
    }
    session.finishInteraction();
    session.advance();
    require(session.completedRows() == geometry::maxRowsPerBatch, "Release starts refinement at a bounded rate");
    advanceUntilReady(session);
    require(session.readyMesh()->settings == dragged, "Release refines the final requested parameters");
    session.acceptReady();
    require(session.publicationCount() == 3 && !session.showingPreview(), "Only the final release publishes");
}
