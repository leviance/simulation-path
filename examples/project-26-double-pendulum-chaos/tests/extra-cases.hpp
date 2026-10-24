// Các đáp án dưới đây độc lập với cách giải hệ 2x2 trong solver.
void runExtraCases() {
    const lab::DoublePendulumParameters p{1.7, 0.6, 0.9, 1.3, 9.81};
    for (double theta1 : {-2.0, -0.5, 0.2, 1.4}) {
        for (double theta2 : {-1.7, 0.4, 2.8}) {
            const lab::DoublePendulumState s{theta1, 0.7, theta2, -1.1, 1.0};
            const auto d = lab::pendulumDerivative(s, p);
            check(d.valid, "unequal masses/lengths derivative is valid");
            const lab::Vec2 n1{std::sin(theta1), -std::cos(theta1)};
            const lab::Vec2 n2{std::sin(theta2), -std::cos(theta2)};
            const lab::Vec2 tangent1{std::cos(theta1), std::sin(theta1)};
            const lab::Vec2 tangent2{std::cos(theta2), std::sin(theta2)};
            const auto a1 = lab::scale(lab::subtract(lab::scale(tangent1, d.omega1Rate), lab::scale(n1, s.omega1 * s.omega1)), p.length1);
            const auto a2 = lab::add(a1, lab::scale(lab::subtract(lab::scale(tangent2, d.omega2Rate), lab::scale(n2, s.omega2 * s.omega2)), p.length2));
            // Tension of rod2 is parallel to rod2; total external tension parallel to rod1.
            const lab::Vec2 lower{p.mass2 * a2.x, p.mass2 * (a2.y + p.gravity)};
            const lab::Vec2 total{p.mass1 * a1.x + p.mass2 * a2.x, p.mass1 * (a1.y + p.gravity) + p.mass2 * (a2.y + p.gravity)};
            check(std::abs(lower.x * tangent2.x + lower.y * tangent2.y) < 1e-10, "Newton residual: lower tension has no tangential component");
            check(std::abs(total.x * tangent1.x + total.y * tangent1.y) < 1e-10, "Newton residual: total support tension follows rod1");
            const double h = 1e-7;
            const auto plus = lab::addDerivative(s, d, h);
            const auto minus = lab::addDerivative(s, d, -h);
            check(std::abs((lab::pendulumEnergy(plus, p) - lab::pendulumEnergy(minus, p)) / (2.0 * h)) < 2e-6, "continuous energy derivative is zero");
        }
    }
    const lab::DoublePendulumParameters parameters{};
    const auto initial = lab::presetState(lab::ChaosPreset::chaotic);
    const auto integrate = [&](double dt, double duration) {
        auto s = initial;
        const int steps = static_cast<int>(std::lround(duration / dt));
        for (int i = 0; i < steps; ++i) {
            s = lab::stepRk4(s, parameters, dt);
        }
        return s;
    };
    const auto reference = integrate(1.0 / 7680.0, 1.0);
    const double e30 = lab::phaseSpaceSeparation(integrate(1.0 / 30.0, 1.0), reference, parameters);
    const double e60 = lab::phaseSpaceSeparation(integrate(1.0 / 60.0, 1.0), reference, parameters);
    const double e120 = lab::phaseSpaceSeparation(integrate(1.0 / 120.0, 1.0), reference, parameters);
    check(e30 / e60 > 10.0 && e30 / e60 < 20.0 && e60 / e120 > 10.0 && e60 / e120 < 20.0, "short-horizon RK4 fourth-order convergence");

    double previousNumerical = 1.0;
    double previousDrift = 1.0;
    for (double dt : {1.0 / 240.0, 1.0 / 480.0, 1.0 / 960.0}) {
        auto experiment = lab::makeChaosExperiment(initial, 1e-4);
        const double initialEnergy = lab::pendulumEnergy(initial, parameters);
        double maximumDrift = 0.0;
        const int steps = static_cast<int>(std::lround(10.0 / dt));
        for (int i = 0; i < steps; ++i) {
            check(lab::stepChaosExperiment(experiment, parameters, dt), "accepted convergence step");
            const auto m = lab::measureChaos(experiment, parameters);
            maximumDrift = std::max({maximumDrift, std::abs(m.twins.relativeEnergyDrift), std::abs(m.twins.perturbedRelativeEnergyDrift)});
            check(experiment.twins.primary.elapsed == experiment.halfStepReference.elapsed, "three trajectories share one canonical clock tag");
        }
        const auto m = lab::measureChaos(experiment, parameters);
        check(m.twins.phaseSeparation > 0.20 && m.twins.phaseSeparation < 0.23, "divergence persists when dt is reduced");
        check(m.numericalSeparation < 0.001 * m.twins.phaseSeparation && m.numericalSeparation < 0.3 * previousNumerical, "numerical shadow decreases below intentional sensitivity");
        check(maximumDrift < 1e-6 && maximumDrift < 0.1 * previousDrift && initialEnergy > 0.0, "both energy monitors converge across all accepted steps");
        previousNumerical = m.numericalSeparation;
        previousDrift = maximumDrift;
    }

    auto bad = lab::makeChaosExperiment(initial, 1e-4);
    bad.halfStepReference.omega1 = std::numeric_limits<double>::infinity();
    check(!lab::stepChaosExperiment(bad, parameters, 1.0 / 240.0), "bad reference rejects entire atomic step");
    check(bad.twins.stepCount == 0 && bad.twins.primary.elapsed == 0.0 && bad.twins.primary.theta1 == initial.theta1, "rejected reference cannot partly advance twins");
    const auto oversized = lab::runChaosExperiment(lab::ChaosPreset::chaotic, parameters, 1e-4, 1e300, 1e-200);
    check(!oversized.completed && oversized.steps == 0, "headless budget rejects overflow before casting");
    check(lab::planFixedSteps(1e308, 1e308, 1e-300, 32, 0.1).steps == 0, "planner rejects unbounded quotient");

    for (const auto preset : {lab::ChaosPreset::calm, lab::ChaosPreset::chaotic, lab::ChaosPreset::nearUpright}) {
        auto scene = lab::makeScene();
        lab::choosePreset(scene, preset);
        lab::requestFast(scene, 30.0);
        for (int frame = 0; frame < 1000 && scene.fastRemaining > 0; ++frame) {
            lab::advanceFrame(scene, 0.0);
            check(scene.substeps <= 32, "fast job respects per-frame budget");
        }
        check(scene.fastRemaining == 0 && scene.steps == 7200 && lab::sameTime(lab::primaryState(scene).elapsed, 30.0), "all presets finish bounded 30-second jobs");
        check(lab::measureChaos(scene.experiment, scene.parameters).finite, "all presets stay finite for 30 seconds");
        check(scene.history.size() <= 751 && scene.history.front().time == 0.0 && lab::sameTime(scene.history.back().time, 30.0), "history includes initial/final sample inside a bounded rolling window");
    }

    auto scene = lab::makeScene();
    auto invalidIndex = scene;
    invalidIndex.dtIndex = 99;
    check(!lab::stepScene(invalidIndex) && invalidIndex.steps == 0, "invalid dt index is rejected before array access");
    const auto bob = lab::pendulumGeometry(lab::primaryState(scene), scene.parameters).bob2;
    const auto grabbed = lab::add(bob, {0.02, 0.01});
    const double before = scene.initial.theta2;
    check(lab::beginAngleDrag(scene, grabbed, 0.1), "grab a real second bob");
    check(closeEnough(scene.initial.theta2, before, 1e-12), "grab offset does not jump orientation");
    lab::moveAngleDrag(scene, {grabbed.x + 0.2, grabbed.y});
    check(!closeEnough(scene.initial.theta2, before) && scene.steps == 0 && scene.initial.omega2 == 0.0, "drag edits new initial state rather than applying an impulse");

    lab::Framebuffer image{};
    scene = lab::makeScene();
    lab::HistorySample a{};
    a.time = 0.0;
    a.physical = 1e-8;
    a.numerical = 1e-12;
    auto b = a;
    b.time = 1.0;
    b.physical = 1e-4;
    auto c = a;
    c.time = 4.0;
    c.energyErrorA = 1.0;
    scene.history = {a, b, c};
    lab::drawEnergyGraph(image, scene);
    check(image.pixels[590 * 1100 + 1060] == lab::kPrimary, "actual energy renderer uses Joule axis");
    lab::drawSeparationGraph(image, scene);
    check(image.pixels[650 * 1100 + 163] == lab::kPhysicalGraph, "actual graph uses nonuniform sample time, not sample index");
    std::cout << "Newton, convergence, chaos, atomic clock, bounded jobs, input and renderer groups tested\n";
}
