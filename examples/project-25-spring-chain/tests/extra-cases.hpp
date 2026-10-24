void testProductContract() {
    for (const int count : {20, 32, 64, 100}) {
        auto scene = lab::makeScene();
        scene.count = count;
        lab::rebuildScene(scene);
        check(scene.chain.particles.size() == std::size_t(count), "product count covers 20 through 100 masses");
        check(scene.chain.springs.size() == std::size_t(count - 1), "product topology is N-1 local springs");
        lab::requestFastRun(scene);
        int frames = 0;
        while (scene.fastRemaining > 0 && frames++ < 1000) {
            lab::advanceFrame(scene, 0.016);
            check(scene.substeps <= 32, "bounded fast job does at most 32 steps per frame");
        }
        check(scene.fastRemaining == 0 && scene.steps == 9600, "20-second job completes exactly");
        check(nearlyEqual(scene.elapsed, 20.0), "actual accepted step count determines elapsed");
        check(scene.metrics.finite && scene.metrics.anchorError == 0.0, "all product sizes stay finite and anchored");
        check(scene.history.size() == 1201, "60-Hz bounded history includes the complete 20-second job");
        check(scene.history.front().time == 0.0 && nearlyEqual(scene.history.back().time, 20.0), "history keeps t0 and the final physics sample");
    }
    check(lab::makeVerticalChain(101, {}, 0.2, 1.0, 0.1, 120.0, 0.24).particles.empty(), "oversized constructor refuses allocation");
    check(lab::makeVerticalChain(std::numeric_limits<std::size_t>::max(), {}, 0.2, 1.0, 0.1, 120.0, 0.24).particles.empty(), "size overflow cannot allocate");
    auto invalid = lab::makeVerticalChain(4, {}, 0.2, 1.0, 0.1, 120.0, 0.24);
    invalid.springs[1] = invalid.springs[0];
    check(!lab::validChain(invalid), "duplicate topology cannot masquerade as a chain");
    auto scene = lab::makeScene();
    const auto position = scene.chain.particles[1].position;
    check(!lab::stepDampedChain(scene.chain, std::numeric_limits<double>::quiet_NaN(), {0.0, -9.81}, true), "invalid dt rejects the whole step");
    check(scene.chain.particles[1].position.x == position.x && scene.chain.particles[1].position.y == position.y, "rejected step does not partly mutate state");
    const auto plan = lab::planFixedSteps(1.0, 0.1, 1e-300, 32, 0.05);
    check(plan.steps == 0, "tiny dt cannot overflow a step-count cast");
}

void testIndependentPhysics() {
    auto chain = lab::makeVerticalChain(2, {}, 1.0, 1.0, 0.1, 100.0, 4.0);
    chain.particles[1].position = {1.2, 0.0};
    chain.particles[1].velocity = {2.0, 3.0};
    const auto elastic = lab::sampleElasticSpring(chain, chain.springs[0]);
    const auto damped = lab::sampleDampedSpring(chain, chain.springs[0]);
    const auto dampingForce = lab::subtract(damped.forceOnFirst, elastic.forceOnFirst);
    const double power = lab::dot(dampingForce, lab::subtract(chain.particles[0].velocity, chain.particles[1].velocity));
    check(nearlyEqual(power, -16.0), "independent damping power is -c times axial relative speed squared");
    chain.particles[1].velocity = {};
    for (int i = 0; i < 960; ++i) {
        check(lab::stepElasticChain(chain, 1.0 / 1920.0, {}, false), "analytic oscillator step accepted");
    }
    check(std::abs(chain.particles[1].position.x - (1.0 + 0.2 * std::cos(5.0))) < 0.001, "single oscillator position matches cos analytic oracle");
    check(std::abs(chain.particles[1].velocity.x - (-2.0 * std::sin(5.0))) < 0.005, "single oscillator velocity matches sin analytic oracle");

    auto equilibrium = lab::makeVerticalChain(4, {}, 0.5, 0.25, 0.1, 120.0, 0.24);
    for (std::size_t i = 1; i < equilibrium.particles.size(); ++i) {
        const double supportedMass = 0.25 * double(equilibrium.particles.size() - i);
        const double extension = supportedMass * 9.81 / 120.0;
        equilibrium.particles[i].position.y = equilibrium.particles[i - 1].position.y - 0.5 - extension;
    }
    check(lab::accumulateDampedForces(equilibrium, {0.0, -9.81}, true), "hanging equilibrium accepts force accumulation");
    for (std::size_t i = 1; i < equilibrium.particles.size(); ++i) {
        check(lab::length(equilibrium.particles[i].force) < 1e-11, "each hanging spring carries all downstream mass");
    }
    check(nearlyEqual(equilibrium.particles[0].force.y, -3.0 * 0.25 * 9.81), "anchor spring reaction equals total weight");
}

void testEnergyAndInteraction() {
    double errors[2]{};
    for (int resolution = 0; resolution < 2; ++resolution) {
        auto scene = lab::makeScene();
        lab::applyPreset(scene, 1);
        scene.dtIndex = resolution == 0 ? 1 : 0;
        lab::rebuildScene(scene);
        const double initial = lab::totalMechanicalEnergy(scene.metrics);
        const int steps = resolution == 0 ? 960 : 1920;
        for (int i = 0; i < steps; ++i) {
            check(lab::stepScene(scene), "undamped convergence step accepted");
            errors[resolution] = std::max(errors[resolution], std::abs(lab::totalMechanicalEnergy(scene.metrics) - initial));
        }
        check(errors[resolution] / initial < (resolution == 0 ? 0.09 : 0.05), "undamped drift is measured, not claimed zero");
    }
    check(errors[1] < 0.6 * errors[0], "halving dt reduces the measured maximum energy error");
    auto damped = lab::makeScene();
    lab::applyPreset(damped, 2);
    const double initial = lab::totalMechanicalEnergy(damped.metrics);
    for (int i = 0; i < 4800; ++i) {
        check(lab::stepScene(damped), "damped energy step accepted");
    }
    check(lab::totalMechanicalEnergy(damped.metrics) < 0.15 * initial, "damping lowers mechanical energy over the measurement window");
    auto unstable = lab::makeScene();
    lab::applyPreset(unstable, 3);
    int attempts = 0;
    while (unstable.message.empty() && attempts++ < 20) {
        lab::stepScene(unstable);
    }
    check(!unstable.message.empty() && unstable.paused && unstable.steps < 20, "unstable experiment stops rather than clipping physics or hanging");

    auto chain = lab::makeVerticalChain(5, {}, 0.22, 0.04, 0.1, 120, 0.24);
    lab::DragConstraint drag{};
    const auto original = chain.particles[3].position;
    check(lab::beginDrag(chain, drag, lab::add(original, {0.02, 0.01}), 0.1), "off-centre grab selects a dynamic mass");
    check(nearlyEqual(drag.target.x, original.x), "grab offset prevents snapping");
    lab::moveDrag(chain, drag, lab::add(original, {0.27, 0.01}), 0.02, 6);
    check(nearlyEqual(chain.particles[3].position.x, original.x + 0.25), "drag target preserves the grab offset");
    check(lab::length(drag.releaseVelocity) <= 6.0 + 1e-12, "release speed remains bounded");
    lab::moveDrag(chain, drag, lab::add(original, {0.27, 0.01}), 0.5, 6);
    check(lab::length(drag.releaseVelocity) == 0.0, "stationary final sample releases at zero speed");
    check(lab::endDrag(chain, drag), "drag ends exactly once");
    check(!lab::endDrag(chain, drag), "late up cannot apply release twice");

    auto drawing = lab::makeScene();
    drawing.history = {{0, 1, 0, 0, 1}, {1, 0, 3, -1, 2}};
    lab::Framebuffer image{};
    lab::drawEnergy(image, drawing);
    check(image.pixels[498 * 1100 + 1060] == 0xffffffffU, "actual energy renderer maps a known total-energy endpoint to its independent pixel");
    std::cout << "P25: canonical scale, analytic physics, energy, interaction and graph groups tested\n";
}
