#include "diagnostics.hpp"
#include "options.hpp"
#include "particles.hpp"
#include <cstdlib>
#include <iostream>
#include <limits>
#include <string_view>

int failures = 0;

void check(bool condition, std::string_view label) {
    // Kiểm tra vẫn hoạt động khi Release định nghĩa NDEBUG.
    if (!condition) {
        ++failures;
        std::cerr << "FAIL: " << label << '\n';
    }
}

bool near(double actual, double expected, double tolerance = 1e-10) {
    return std::isfinite(actual) && std::abs(actual - expected) <= tolerance;
}

bool acceptsOptions(std::vector<std::string> arguments) {
    arguments.insert(arguments.begin(), "wind-map");
    std::vector<char*> argv;
    for (auto& argument : arguments) {
        argv.push_back(argument.data());
    }
    try {
        wind::parseOptions(static_cast<int>(argv.size()), argv.data());
        return true;
    } catch (const std::exception&) {
        return false;
    }
}

int main() {
    check(acceptsOptions({"--hidden", "--seconds=0.05"}), "finite hidden CLI accepted");
    check(acceptsOptions({"--seconds=60"}), "native UI has a finite upper duration");
    for (const std::string bad : {"0", "0.049", "61", "nan", "inf", "1oops"}) {
        check(!acceptsOptions({"--seconds=" + bad}), "invalid or unbounded CLI duration rejected");
    }
    check(!acceptsOptions({"--hidden"}) && !acceptsOptions({"--capture=frame.bmp"}), "automation cannot launch unbounded hidden or capture run");
    check(!acceptsOptions({"--verify", "--run"}), "CPU validation does not silently ignore rendering flags");
    bool invalidSize = false;
    try {
        wind::Field invalid(2, 25);
    } catch (const std::invalid_argument&) {
        invalidSize = true;
    }
    check(invalidSize, "small grid rejected");
    wind::Field field;
    check(field.index(3, 2) == 69, "row-major index");
    const auto high = wind::world(field, 32, 24);
    check(near(high.x, 2) && near(high.y, 1.5), "grid includes domain endpoints");

    // Các hệ số được suy ra trực tiếp từ công thức giải tích, không từ solver.
    const wind::Preset presets[] = {wind::Preset::Uniform, wind::Preset::Source, wind::Preset::Sink, wind::Preset::Rotation, wind::Preset::Shear};
    const double div[] = {0, 2, -2, 0, 0};
    const double spin[] = {0, 0, 0, 2, -1};
    for (int fixture = 0; fixture < 5; ++fixture) {
        wind::Scene scene;
        scene.preset = presets[fixture];
        wind::populate(field, scene);
        for (int y = 0; y < field.height; ++y) {
            for (int x = 0; x < field.width; ++x) {
                check(near(wind::divergence(field, x, y), div[fixture]), "affine divergence including edges");
                check(near(wind::curl(field, x, y), spin[fixture]), "affine curl including edges");
            }
        }
    }

    wind::Scene scene;
    scene.preset = wind::Preset::Gradient;
    wind::populate(field, scene);
    const auto bowl = wind::gradientError(field, scene.potential);
    check(near(bowl.interior, 0) && near(bowl.boundary, 0), "quadratic potential has exact gradient");
    scene.potential = wind::Potential::Hill;
    wind::populate(field, scene);
    for (int y = 0; y < field.height; ++y) {
        for (int x = 0; x < field.width; ++x) {
            check(near(wind::curl(field, x, y), 0), "curl of discrete gradient is zero");
        }
    }
    const auto coarse = wind::gradientError(field, scene.potential);
    wind::Field fine(65, 49);
    wind::populate(fine, scene);
    const auto refined = wind::gradientError(fine, scene.potential);
    check(refined.interior < coarse.interior / 3 && refined.boundary < coarse.boundary / 3, "Gaussian gradient converges at both interior and boundary");

    // NaN must fail diagnostics even when the other samples have zero error.
    const double invalidValues[] = {std::numeric_limits<double>::quiet_NaN(), std::numeric_limits<double>::infinity(), -std::numeric_limits<double>::infinity()};
    for (const double value : invalidValues) {
        for (const int x : {0, 3}) {
            wind::Field invalid;
            wind::Scene bowlScene;
            bowlScene.preset = wind::Preset::Gradient;
            wind::populate(invalid, bowlScene);
            invalid.vx[invalid.index(x, 3)] = value;
            const auto error = wind::gradientError(invalid, bowlScene.potential);
            double regionError = error.interior;
            if (x == 0) {
                regionError = error.boundary;
            }
            check(!error.finite && std::isinf(regionError) && !(regionError < 1e-10), "nonfinite gradient is never reported as zero");
            check(std::isinf(wind::maximumError(0, std::abs(wind::divergence(invalid, x + 1, 3)))), "nonfinite divergence fails aggregation");
            check(std::isinf(wind::maximumError(0, std::abs(wind::curl(invalid, x, 4)))), "nonfinite curl fails aggregation");
        }
        check(std::isinf(wind::maximumError(wind::maximumError(0, value), 0)), "invalid error cannot be overwritten by later valid samples");
    }

    // Bilinear phải tái tạo một trường affine ở giữa nút và ở hai đầu miền.
    for (int y = 0; y < field.height; ++y) {
        for (int x = 0; x < field.width; ++x) {
            const auto p = wind::world(field, x, y);
            const auto i = field.index(x, y);
            field.vx[i] = 2 * p.x - 3 * p.y + 1;
            field.vy[i] = -p.x + 4 * p.y;
        }
    }
    const wind::Vec2 probes[] = {{-2, -1.5}, {2, 1.5}, {0.13, -0.27}};
    for (const auto p : probes) {
        wind::Vec2 velocity;
        check(wind::sampleVelocity(field, p, velocity), "bilinear accepts point in domain");
        check(near(velocity.x, 2 * p.x - 3 * p.y + 1) && near(velocity.y, -p.x + 4 * p.y), "bilinear reproduces affine velocity");
    }
    wind::Vec2 result;
    check(!wind::sampleVelocity(field, {2.001, 0}, result), "outside sample rejected");
    check(!wind::sampleVelocity(field, {std::numeric_limits<double>::quiet_NaN(), 0}, result), "non-finite sample rejected");

    scene = wind::Scene{};
    wind::populate(field, scene);
    check(wind::midpointStep(field, {0, 0}, wind::dt, result), "constant velocity step accepted");
    check(near(result.x, wind::dt) && near(result.y, wind::dt * 0.25), "constant velocity trajectory exact");
    check(!wind::midpointStep(field, {2, 0}, wind::dt, result), "trajectory leaving domain rejected");

    scene.preset = wind::Preset::Rotation;
    wind::populate(field, scene);
    double trajectoryErrors[2]{};
    for (int fixture = 0; fixture < 2; ++fixture) {
        const int steps = 60 * (fixture + 1);
        wind::Vec2 p{0.5, 0};
        for (int i = 0; i < steps; ++i) {
            check(wind::midpointStep(field, p, 1.0 / steps, result), "rotation trajectory remains inside");
            p = result;
        }
        trajectoryErrors[fixture] = std::hypot(p.x - 0.5 * std::cos(1.0), p.y - 0.5 * std::sin(1.0));
    }
    check(trajectoryErrors[0] < 0.00003 && trajectoryErrors[1] < trajectoryErrors[0] / 3.8, "midpoint converges against analytic rotation");

    auto reference = wind::makeParticles();
    for (int i = 0; i < 120; ++i) {
        wind::advanceParticles(field, reference);
    }
    for (const int fps : {15, 30, 120}) {
        auto particles = wind::makeParticles();
        double accumulator = 0;
        int ticks = 0;
        for (int frame = 0; frame < fps * 2; ++frame) {
            const auto plan = wind::planSteps(accumulator, 1.0 / fps);
            accumulator = plan.remainder;
            for (int step = 0; step < plan.steps; ++step) {
                wind::advanceParticles(field, particles);
                ++ticks;
            }
        }
        check(ticks == 120, "frame rate does not change tick count");
        for (std::size_t i = 0; i < particles.size(); ++i) {
            check(near(particles[i].position.x, reference[i].position.x) && near(particles[i].position.y, reference[i].position.y), "frame rate does not change particle path");
        }
    }
    const auto hitch = wind::planSteps(0, 10);
    check(hitch.steps == 8 && hitch.dropped > 9.8, "stalled frame has bounded work");

    scene = wind::Scene{};
    scene.vortex = true;
    wind::populate(field, scene);
    const auto first = field.vy;
    wind::populate(field, scene);
    check(field.vy == first, "vortex placement does not accumulate per event");
    check(near(wind::curl(field, 16, 12), 4 * std::exp(-field.dx * field.dx / (0.55 * 0.55))), "vortex center matches independent stencil answer");
    check(wind::validateMap().passed, "bounded reference validation passes");

    // Kiểm mẫu thật ở hai lưới dùng trong ứng dụng cuối, không nhầm với số glyph.
    for (const int columns : {65, 129}) {
        wind::Field full(columns, 1 + (columns - 1) * 3 / 4);
        wind::Scene sourceScene;
        sourceScene.preset = wind::Preset::Source;
        wind::populate(full, sourceScene);
        check(full.width >= 32 && full.height >= 32, "final grid satisfies both minimum dimensions");
        check(full.vx.size() == static_cast<std::size_t>(full.width * full.height), "all final field samples allocated");
        for (int y = 0; y < full.height; ++y) {
            for (int x = 0; x < full.width; ++x) {
                check(near(wind::divergence(full, x, y), 2), "every final node participates in numerical operators");
            }
        }
    }

    // Curl Gaussian có đáp án liên tục; không dùng chính stencil làm oracle hội tụ.
    double vortexErrors[3]{};
    int resolutionIndex = 0;
    for (const int columns : {33, 65, 129}) {
        wind::Field grid(columns, 1 + (columns - 1) * 3 / 4);
        wind::Scene vortexScene;
        vortexScene.vortex = true;
        vortexScene.center = {0.25, -0.25};
        wind::populate(grid, vortexScene);
        double error = 0;
        for (int y = 0; y < grid.height; ++y) {
            for (int x = 0; x < grid.width; ++x) {
                const auto p = wind::world(grid, x, y);
                const double qx = p.x - 0.25;
                const double qy = p.y + 0.25;
                const double r2 = qx * qx + qy * qy;
                const double expected = 2 * std::exp(-r2 / (0.55 * 0.55)) * (2 - 2 * r2 / (0.55 * 0.55));
                error = wind::maximumError(error, std::abs(wind::curl(grid, x, y) - expected));
                error = wind::maximumError(error, std::abs(wind::divergence(grid, x, y)));
            }
        }
        vortexErrors[resolutionIndex++] = error;
    }
    check(vortexErrors[1] < vortexErrors[0] / 3.5 && vortexErrors[2] < vortexErrors[1] / 3.5, "Gaussian vortex converges to continuum derivatives");
    auto traced = wind::makeParticles();
    for (int i = 0; i < 200; ++i)
        wind::advanceParticles(field, traced);
    for (const auto& particle : traced) {
        check(particle.trail.size() == 24 && particle.trailSize <= 24 && particle.trailHead < 24, "trail memory bounded after wrap");
    }
    field.vx.assign(field.vx.size(), std::numeric_limits<double>::quiet_NaN());
    check(!wind::sampleVelocity(field, {0, 0}, result), "nonfinite field sample rejected before integration");
    wind::advanceParticles(field, traced);
    check(traced[0].trailSize == 0 && traced[0].age == 0, "respawn clears trail instead of drawing a discontinuity");

    std::cout << "Wind map tests: " << failures << " failure(s)\n";
    // [snippet test-result]
    if (failures != 0) {
        return EXIT_FAILURE;
    }
    return EXIT_SUCCESS;
    // [/snippet test-result]
}
