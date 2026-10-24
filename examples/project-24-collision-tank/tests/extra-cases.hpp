#pragma once

void checkExtra2D() {
    auto scene = lab::makeScene();
    scene.elastic = true;
    lab::rebuildScene(scene);
    check(scene.balls.size() == 256, "main 2D preset has 256 moving bodies");
    check(scene.balls[0].inverseMass != scene.balls[1].inverseMass && scene.balls[0].radius != scene.balls[1].radius, "default bodies differ in mass and size");
    const auto initial = scene.metrics;
    for (int i = 0; i < 240; ++i)
        lab::stepScene(scene);
    check(scene.metrics.finite, "256-body state remains finite");
    check(scene.stats.pairChecks == 3U * 256U * 255U / 2U, "actual solver checks, excluding independent audit pass");
    check(closeEnough(scene.metrics.kineticEnergy, initial.kineticEnergy, 1e-7), "elastic 256-body energy, independent of wall momentum exchange");
    check(lab::momentumResidual(scene) < 1e-8, "P-P0 equals sum of external wall impulses");
    check(scene.metrics.maximumPenetration < 0.05, "remaining overlap is bounded after final wall solve");
    check(scene.history.size() == 241 && closeEnough(scene.history.back().time, 2.0), "history includes t=0 and every physics step");
    for (const auto& ball : scene.balls) {
        check(ball.position.x >= -10 + ball.radius - 1e-9 && ball.position.x <= 10 - ball.radius + 1e-9 && ball.position.y >= -6 + ball.radius - 1e-9 && ball.position.y <= 6 - ball.radius + 1e-9, "256 bodies inside radius-aware bounds");
    }
    scene.elastic = false;
    lab::rebuildScene(scene);
    const double energy = scene.initialEnergy;
    for (int i = 0; i < 120; ++i)
        lab::stepScene(scene);
    check(scene.metrics.kineticEnergy < energy, "inelastic heterogeneous materials dissipate kinetic energy");
    const auto unchanged = scene.balls[0].position;
    scene.balls.back().velocity.x = NAN;
    const auto bad = lab::stepCollisionWorld(scene.balls, lab::kTankBounds, {1.0 / 120, 1, 3, .8, .001});
    check(!bad.valid && scene.balls[0].position.x == unchanged.x, "invalid last body is rejected before first body moves");
    check(lab::makeBallLattice(100000, 100000, lab::kTankBounds, .1, 1, 1).empty(), "allocation dimensions are bounded before multiplication");
    check(lab::planFixedSteps(0, 1, 1e-300, 4, .05).steps == 0, "tiny dt cannot cause undefined integer cast or huge loop");
    lab::Ball a{{0, 0}, {1, 0}, .5, 1}, b{{.8, 0}, {-1, 0}, .5, .5};
    const auto c = lab::findCircleContact(a, b);
    check(closeEnough(lab::applyCollisionImpulse(a, b, c, 1), 8.0 / 3.0), "unequal masses hand-derived impulse");
    check(closeEnough(a.velocity.x, -5.0 / 3.0) && closeEnough(b.velocity.x, 1.0 / 3.0), "unequal mass velocities are not wall reflections");
    const auto va = a.velocity;
    auto invalid = c;
    invalid.normal.x = NAN;
    check(lab::applyCollisionImpulse(a, b, invalid, 1) == 0 && a.velocity.x == va.x, "malformed normal is not committed");
    lab::Framebuffer image;
    scene = lab::makeScene();
    scene.debug = false;
#ifdef COURSE_HAS_3D_RENDERER
    lab::DepthBuffer renderDepth;
#endif
#ifdef COURSE_HAS_3D_RENDERER
    lab::renderScene(image, scene, renderDepth);
#else
    lab::renderScene(image, scene);
#endif
    check(std::count(image.pixels.begin(), image.pixels.end(), lab::kBackground) < 1100 * 820 - 10000, "clean 2D mode retains hundreds of shaded circles and graph");
    std::cout << "P24: 2D groups tested\n";
}

#ifdef COURSE_HAS_3D
void checkExtra3D() {
    lab::Sphere a{{0, 0, 0}, {1, 2, 3}, .5, 1}, b{{.3, .6, .6}, {-1, 1, -2}, .5, .5};
    const auto contact = lab::findSphereContact(a, b);
    check(closeEnough(contact.normal.x, 1.0 / 3.0) && closeEnough(contact.normal.z, 2.0 / 3.0), "independent 3-6-6 sphere normal, not an XY circle");
    check(closeEnough(lab::applySphereImpulse(a, b, contact, 1), 56.0 / 9.0), "3D oblique unequal-mass impulse hand oracle");
    check(closeEnough(a.velocity.x, -29.0 / 27.0) && closeEnough(a.velocity.y, -58.0 / 27.0) && closeEnough(a.velocity.z, -31.0 / 27.0), "all three velocity components match independent numeric oracle");
    check(closeEnough(b.velocity.x, 1.0 / 27.0) && closeEnough(b.velocity.y, 83.0 / 27.0) && closeEnough(b.velocity.z, 2.0 / 27.0), "mass weighting in all axes");
    check(lab::applySphereImpulse(a, b, contact, 1) == 0, "separating spheres have no repeated impulse");
    const auto before = a.velocity;
    lab::correctSpherePenetration(a, b, contact, 1, 0);
    check(a.velocity.z == before.z, "sphere positional correction is not a velocity impulse");
    auto bodies = lab::makeSpheres(lab::kSceneSeed, true);
    const auto initial = lab::measureSpheres(bodies);
    check(bodies.size() == 256 && initial.overlaps == 0, "256 spheres start nonoverlapping");
    check(bodies[0].position.z != bodies[128].position.z && bodies[0].velocity.z != 0, "3D has actual depth positions and velocities");
    lab::Vec3 walls{};
    for (int i = 0; i < 240; ++i) {
        const auto stats = lab::stepSpheres(bodies, {1.0 / 120, 1, 3, .8, .001});
        check(stats.valid && stats.pairChecks == 3U * 256U * 255U / 2U, "3D brute-force pair count is exact");
        walls = lab::add3(walls, stats.wallImpulse);
    }
    const auto final = lab::measureSpheres(bodies);
    check(final.finite && closeEnough(final.energy, initial.energy, 1e-7), "3D elastic kinetic energy");
    const auto residual = lab::sub3(lab::sub3(final.momentum, initial.momentum), walls);
    check(std::sqrt(lab::dot3(residual, residual)) < 1e-8, "3D momentum ledger includes wall impulse");
    check(final.penetration < .05, "3D remaining overlap bounded");
    for (const auto& body : bodies)
        check(std::abs(body.position.x) + body.radius <= 8 + 1e-9 && std::abs(body.position.y) + body.radius <= 5 + 1e-9 && std::abs(body.position.z) + body.radius <= 6 + 1e-9, "six walls contain spheres");
    auto inelastic = lab::makeSpheres(lab::kSceneSeed, false);
    const double start = lab::measureSpheres(inelastic).energy;
    for (int i = 0; i < 120; ++i)
        lab::stepSpheres(inelastic, {1.0 / 120, .5, 3, .8, .001});
    check(lab::measureSpheres(inelastic).energy < start, "3D inelastic energy decreases");
    std::cout << "P24: 3D physics groups tested\n";
}
#endif

#ifdef COURSE_HAS_3D_RENDERER
void checkRenderer3D() {
    check(closeEnough(lab::sphereDepth(0, 0, {0, 0, 5}, 1), 4), "center ray hits front surface at z=4");
    check(!std::isfinite(lab::sphereDepth(1, 1, {0, 0, 5}, 1)), "ray miss has no finite depth");
    lab::Framebuffer first, second;
    lab::DepthBuffer da, db;
    const auto camera = lab::makeCamera({0, 0, 26});
    lab::Sphere a{{0, 0, 2}, {}, 1, 1, 0xff0000ffU}, b{{0, 0, -2}, {}, 1, 1, 0x00ff00ffU};
    lab::drawSphere(first, da, a, camera);
    lab::drawSphere(first, da, b, camera);
    lab::drawSphere(second, db, b, camera);
    lab::drawSphere(second, db, a, camera);
    check(first.pixels == second.pixels, "analytic sphere Z-buffer is draw-order independent");
    auto scene = lab::makeScene();
    scene.spatial = true;
    scene.elastic = true;
    lab::rebuildScene(scene);
    const auto old = scene.spheres[0].position;
    scene.camera.yaw += .5;
    lab::renderScene(first, scene, da);
    check(scene.spheres[0].position.z == old.z && scene.elapsed == 0, "orbit changes camera, never physics state");
#ifdef COURSE_HAS_SPAWN
    const int spawned = lab::spawnBodies(scene);
    check(spawned == 16 && scene.spheres.size() == 272 && scene.sphereMetrics.overlaps == 0, "3D bounded spawn avoids occupied space");
    scene.spatial = false;
    lab::rebuildScene(scene);
    check(lab::spawnBodies(scene) == 16 && scene.balls.size() == 272 && scene.metrics.overlapCount == 0, "2D spawn works immediately, without interpenetration");
    std::cout << "P24: spawn groups tested\n";
#endif
    std::cout << "P24: 3D renderer groups tested\n";
}
#endif
