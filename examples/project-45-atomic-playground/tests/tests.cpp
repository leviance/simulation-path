#include "atom_config.hpp"
#include "atom_statistics.hpp"
#include <cstdlib>
#include <iostream>
#include <numeric>
#include <string>

namespace {

using namespace atom;

void check(bool condition, const std::string& message) {
    if (!condition)
        throw std::runtime_error(message);
}

void near(double actual, double expected, double tolerance, const std::string& message) {
    check(std::isfinite(actual) && std::isfinite(expected) && std::abs(actual - expected) <= tolerance, message);
}

template <class Function>
void rejects(Function action, const std::string& message) {
    bool rejected = false;
    try {
        action();
    } catch (const std::exception&) {
        rejected = true;
    }
    check(rejected, message);
}

SamplingConfig fixture(Orbital id, std::uint32_t seed = 12345, std::uint32_t count = 16381) {
    SamplingConfig result;
    result.orbital = id;
    result.radius = defaultRadius(id);
    result.seed = seed;
    result.count = count;
    return result;
}

// Eight-point Gauss-Legendre integrates every catalog angular polynomial
// squared exactly in mu. Uniform phi quadrature integrates its Fourier terms.
// This is independent of the sampler's midpoint angular table.
double angularIntegral(Orbital id) {
    constexpr std::array<double, 8> nodes{
        -0.9602898564975363,
        -0.7966664774136267,
        -0.5255324099163290,
        -0.1834346424956498,
        0.1834346424956498,
        0.5255324099163290,
        0.7966664774136267,
        0.9602898564975363,
    };
    constexpr std::array<double, 8> weights{
        0.1012285362903763,
        0.2223810344533745,
        0.3137066458778873,
        0.3626837833783620,
        0.3626837833783620,
        0.3137066458778873,
        0.2223810344533745,
        0.1012285362903763,
    };
    double integral = 0;
    for (std::size_t row = 0; row < nodes.size(); ++row) {
        const double mu = nodes[row];
        const double sine = std::sqrt(1 - mu * mu);
        for (int column = 0; column < 64; ++column) {
            const double phi = 2 * pi * (column + 0.5) / 64;
            const double value = angularAmplitude(id, sine * std::cos(phi), sine * std::sin(phi), mu);
            integral += weights[row] * value * value * 2 * pi / 64;
        }
    }
    return integral;
}

// Composite Simpson integration is a separate numeric oracle for the closed
// forms. Neither the sampler's table nor its CDF appears in this computation.
double radialIntegral(Orbital id, double radius) {
    constexpr int intervals = 8192;
    const double step = radius / intervals;
    double sum = 0;
    for (int index = 0; index <= intervals; ++index) {
        const double r = index * step;
        const double value = radialAmplitude(id, r);
        int weight = 2;
        if (index % 2 != 0)
            weight = 4;
        if (index == 0 || index == intervals)
            weight = 1;
        sum += weight * r * r * value * value;
    }
    return sum * step / 3;
}

void testSuppliedDensity() {
    near(evaluateDensity(Orbital::s1, {}).density, 1 / pi, 1e-14, "1s density at the origin");
    near(evaluateDensity(Orbital::s1, {1, 0, 0}).density, std::exp(-2.0) / pi, 1e-14, "1s closed-form density");
    near(evaluateDensity(Orbital::s2, {}).density, 1 / (8 * pi), 1e-14, "2s density at the origin");
    near(evaluateDensity(Orbital::s2, {2, 0, 0}).density, 0, 1e-20, "2s radial node at r=2");
    check(evaluateDensity(Orbital::s2, {1, 0, 0}).sign == 1, "2s inner sign");
    check(evaluateDensity(Orbital::s2, {3, 0, 0}).sign == -1, "2s outer sign");

    const double pzAt2 = std::exp(-2.0) / (8 * pi);
    near(evaluateDensity(Orbital::pz, {0, 0, 2}).density, pzAt2, 1e-14, "2pz independent coefficient");
    near(evaluateDensity(Orbital::px, {2, 0, 0}).density, pzAt2, 1e-14, "2px orientation");
    near(evaluateDensity(Orbital::py, {0, 2, 0}).density, pzAt2, 1e-14, "2py orientation");
    check(evaluateDensity(Orbital::pz, {0, 0, -2}).sign == -1, "2pz negative lobe sign");
    near(evaluateDensity(Orbital::pz, {2, 1, 0}).density, 0, 1e-20, "2pz plane node");
    near(evaluateDensity(Orbital::dxy, {0, 2, 3}).density, 0, 1e-20, "3dxy plane node");
    near(evaluateDensity(Orbital::dx2y2, {2, 2, 1}).density, 0, 1e-20, "3dx2-y2 diagonal node");
    near(evaluateDensity(Orbital::fxyz, {0, 2, 3}).density, 0, 1e-20, "4fxyz plane node");
    near(angularAmplitude(Orbital::dz2, std::sqrt(2.0 / 3), 0, 1 / std::sqrt(3.0)), 0, 1e-14, "3dz2 cone node");
    near(angularAmplitude(Orbital::fz3, std::sqrt(0.4), 0, std::sqrt(0.6)), 0, 1e-14, "4fz3 cone node");

    // These constants are written independently of the generalized n,l code.
    near(radialAmplitude(Orbital::dz2, 3), 4 * 9 * std::exp(-1.0) / (81 * std::sqrt(30.0)), 1e-15, "3d supplied normalization");
    near(radialAmplitude(Orbital::fz3, 4), 64 * std::exp(-1.0) / (768 * std::sqrt(35.0)), 1e-15, "4f supplied normalization");
    for (const auto& entry : catalog()) {
        near(angularIntegral(entry.id), 1, 1e-12, "angular normalization: " + std::string(entry.name));
        const auto positive = evaluateDensity(entry.id, {1, 2, 3});
        const auto negative = evaluateDensity(entry.id, {-1, -2, -3});
        check(positive.density >= 0 && std::isfinite(positive.density), "finite positive density");
        if (entry.id != Orbital::affineMu)
            near(positive.density, negative.density, 1e-14, "inversion symmetry: " + std::string(entry.name));
        if (entry.l > 0)
            near(evaluateDensity(entry.id, {}).density, 0, 0, "higher-l origin is not undefined");
    }
    rejects([] {
        evaluateDensity(Orbital::s1, {std::numeric_limits<float>::infinity(), 0, 0});
    },
        "nonfinite density input rejected");
    rejects([] {
        preset(static_cast<Orbital>(999));
    },
        "unknown catalog ID rejected");
    rejects([] {
        parseOrbital("missing");
    },
        "unknown catalog name rejected");
    near(radialAmplitude(Orbital::fz3, 1e200), 0, 0, "huge finite radius is stable");
}

void testRadialReference() {
    near(radialCdfExact(Orbital::s1, 1), 1 - 5 * std::exp(-2.0), 1e-14, "1s independent radial CDF");
    near(radialCdfExact(Orbital::s2, 2), 1 - 7 * std::exp(-2.0), 1e-14, "2s independent radial CDF");
    near(radialTailExact(Orbital::s1, 128), std::exp(-256.0) * (1 + 256 + 256.0 * 256 / 2), 1e-116, "small tail is not erased by subtracting from one");
    near(radialCdfExact(Orbital::fz3, 1e200), 1, 0, "CDF huge-radius limit");
    for (std::size_t index = 0; index < physicalPresetCount; ++index) {
        const auto& entry = catalog()[index];
        near(radialCdfExact(entry.id, 0), 0, 0, "radial CDF starts at zero");
        near(radialIntegral(entry.id, entry.rMax), radialCdfExact(entry.id, entry.rMax), 2e-9, "radial integral agrees with analytic oracle");
        near(radialIntegral(entry.id, 0.25), radialCdfExact(entry.id, 0.25), 2e-15, "small retained-domain CDF stays resolved");
        double previous = 0;
        for (int step = 0; step <= 100; ++step) {
            const double value = radialCdfExact(entry.id, step * entry.rMax / 100);
            check(value >= previous - 1e-14 && value >= 0 && value <= 1, "monotone bounded analytic CDF");
            previous = value;
        }
    }
    const auto config = fixture(Orbital::s1);
    near(referenceRadialProbability(config, 0), 0, 0, "empty origin sphere");
    near(referenceRadialProbability(config, 100), 1, 0, "region contains finite sampling domain");
    near(*expectedOriginSphere(config, {}, 1), radialCdfExact(Orbital::s1, 1) / radialCdfExact(Orbital::s1, 12), 1e-14, "retained-domain reference is explicit");
    check(!expectedOriginSphere(config, {1, 0, 0}, 1), "off-center sphere must not borrow origin oracle");
    const auto histogram = referenceRadialHistogram(config);
    near(std::accumulate(histogram.begin(), histogram.end(), 0.0), 1, 1e-14, "reference histogram sums to one");
    rejects([] {
        radialCdfExact(Orbital::uniformVolume, 1);
    },
        "testfield requires finite-volume reference");
}

void testTablesAndRandom() {
    std::vector<float> cdf;
    double rounding = 0;
    const std::array<double, 4> weights{0, 2, 0, 6};
    near(normalizedCdf(weights, cdf, rounding), 8, 0, "CDF reports original mass");
    check(cdf == std::vector<float>({0, 0, 0.25F, 0.25F, 1}), "exclusive-prefix CDF includes both endpoints");
    check(invertCdf(cdf, 0.1F) == 1 && invertCdf(cdf, 0.25F) == 3 && invertCdf(cdf, 0.9F) == 3, "CDF skips empty bins at a boundary");
    rejects([&] {
        invertCdf(cdf, 0);
    },
        "CDF rejects closed lower variate");
    rejects([&] {
        invertCdf(cdf, 1);
    },
        "CDF rejects closed upper variate");
    rejects([&] {
        normalizedCdf(std::array<double, 2>{0, 0}, cdf, rounding);
    },
        "zero total mass rejected");
    rejects([&] {
        normalizedCdf(std::array<double, 2>{1, -1}, cdf, rounding);
    },
        "negative mass rejected");
    rejects([&] {
        normalizedCdf(std::array<double, 1>{std::numeric_limits<double>::quiet_NaN()}, cdf, rounding);
    },
        "NaN mass rejected");

    check(mix32(0) == 0 && mix32(1) == 1753845952U && mix32(12345) == 2435775735U, "counter hash golden vectors");
    near(randomOpen(0, 12345, 0), 0.9600024819374084, 0, "random open golden vector 0");
    near(randomOpen(0, 12345, 4), 0.286332905292511, 0, "random open golden vector 4");
    near(randomOpen(123456, 7, 2), 0.420848548412323, 0, "random open golden vector late index");
    for (std::uint32_t index = 0; index < 16381; ++index) {
        for (std::uint32_t dimension = 0; dimension < 5; ++dimension) {
            const auto value = randomOpen(index, 12345, dimension);
            check(value > 0 && value < 1, "all finite RNG fixtures are strictly open");
        }
    }

    for (std::size_t index = 0; index < physicalPresetCount; ++index) {
        const auto& entry = catalog()[index];
        const auto tables = buildTables(fixture(entry.id, 12345, 257));
        check(tables.radialCdf.size() == 2049 && tables.angularCdf.size() == 8193, "table dimensions include zero endpoint");
        check(std::is_sorted(tables.radialCdf.begin(), tables.radialCdf.end()) && std::is_sorted(tables.angularCdf.begin(), tables.angularCdf.end()), "monotone normalized tables");
        near(tables.radialMass, radialCdfExact(entry.id, entry.rMax), 1e-6, "midpoint radial mass converges to independent reference");
        near(tables.tailMass, 1 - radialCdfExact(entry.id, entry.rMax), 1e-15, "tail reported separately");
        check(tables.radialRoundingError <= 3.1e-8 && tables.angularRoundingError <= 3.1e-8, "reported float CDF roundoff");
    }
    auto coarseConfig = fixture(Orbital::fz3);
    coarseConfig.muBins = 8;
    const auto coarse = buildTables(coarseConfig);
    coarseConfig.muBins = 64;
    const auto refined = buildTables(coarseConfig);
    check(std::abs(refined.angularMass - 1) < std::abs(coarse.angularMass - 1), "angular refinement reduces normalization error");
}

// Selecting a cell with its stored float CDF mass, then jittering uniformly
// inside that cell, gives this piecewise-linear radial probability. Looking
// only at CDF endpoints would miss the within-cell midpoint approximation.
double storedRadialProbability(const SamplingTables& tables, double radius) {
    const auto& config = tables.config;
    const double coordinate = std::clamp(radius / config.radius, 0.0, 1.0) * config.radialBins;
    if (coordinate >= config.radialBins)
        return tables.radialCdf.back();
    const auto bin = static_cast<std::size_t>(coordinate);
    const double fraction = coordinate - bin;
    const double low = tables.radialCdf[bin], high = tables.radialCdf[bin + 1];
    return low + fraction * (high - low);
}

void testDefaultTableApproximationAllowance() {
    // A deterministic finite fixture, not a rigorous supremum over all radii
    // or configurations. Its reference is analytic and independently checked
    // by Simpson integration above. Both sides condition on r <= default Rmax;
    // omitted tail and Monte Carlo uncertainty are not absorbed into this error.
    constexpr std::uint32_t probeIntervals = 32768;
    constexpr std::array<std::uint32_t, 3> resolutions{1024, 2048, 4096};
    constexpr double verifierTableAllowance = 0.0003;
    std::array<double, resolutions.size()> maximumCdfErrors{};
    std::array<const char*, resolutions.size()> worstPresets{};
    std::array<double, resolutions.size()> worstRadii{};
    double maximumHistogramError = 0, maximumRegionError = 0, maximumHemisphereError = 0;

    for (const auto& entry : catalog()) {
        auto config = fixture(entry.id, 12345, 257);
        std::vector<double> references(probeIntervals + 1);
        for (std::uint32_t probe = 0; probe <= probeIntervals; ++probe) {
            const double radius = static_cast<double>(config.radius) * probe / probeIntervals;
            references[probe] = referenceRadialProbability(config, radius);
        }
        for (std::size_t resolution = 0; resolution < resolutions.size(); ++resolution) {
            config.radialBins = resolutions[resolution];
            const auto tables = buildTables(config);
            double maximumPresetError = 0;
            for (std::uint32_t probe = 0; probe <= probeIntervals; ++probe) {
                const double radius = static_cast<double>(config.radius) * probe / probeIntervals;
                const double probability = storedRadialProbability(tables, radius);
                check(std::isfinite(probability) && probability >= 0 && probability <= 1, "interpolated stored CDF remains a finite probability");
                const double error = std::abs(probability - references[probe]);
                maximumPresetError = std::max(maximumPresetError, error);
                if (error > maximumCdfErrors[resolution]) {
                    maximumCdfErrors[resolution] = error;
                    worstPresets[resolution] = entry.name;
                    worstRadii[resolution] = radius;
                }
            }
            if (config.radialBins != 2048)
                continue;
            // Keep margin for two CDF endpoint errors in a bin probability;
            // additionally check every actual verifier bin directly below.
            check(maximumPresetError < verifierTableAllowance / 2, "default radial CDF fixture fits half of the separate table allowance: " + std::string(entry.name));
            const auto histogram = referenceRadialHistogram(config);
            for (std::size_t bin = 0; bin < histogram.size(); ++bin) {
                const double low = static_cast<double>(config.radius) * bin / histogram.size();
                const double high = static_cast<double>(config.radius) * (bin + 1) / histogram.size();
                const double probability = storedRadialProbability(tables, high) - storedRadialProbability(tables, low);
                const double error = std::abs(probability - histogram[bin]);
                maximumHistogramError = std::max(maximumHistogramError, error);
                check(error < verifierTableAllowance, "default verifier histogram table error: " + std::string(entry.name));
            }
            const bool testField = entry.id == Orbital::uniformVolume || entry.id == Orbital::affineMu;
            double regionRadius = config.radius / 8.0;
            if (testField)
                regionRadius = config.radius / 2.0;
            const double regionError = std::abs(storedRadialProbability(tables, regionRadius) - referenceRadialProbability(config, regionRadius));
            maximumRegionError = std::max(maximumRegionError, regionError);
            check(regionError < verifierTableAllowance, "default verifier origin-sphere table error: " + std::string(entry.name));

            // mu bins are ordered from -1 to +1; mu=0 is an exact default
            // grid boundary. Physical densities are inversion-symmetric;
            // integrating (1+0.6*mu)/2 over [-1,0] gives affine mass 0.35.
            const auto hemisphereBoundary = (config.muBins / 2) * config.phiBins;
            double expectedHemisphere = 0.5;
            if (entry.id == Orbital::affineMu)
                expectedHemisphere = 0.35;
            const double hemisphereError = std::abs(tables.angularCdf[hemisphereBoundary] - expectedHemisphere);
            maximumHemisphereError = std::max(maximumHemisphereError, hemisphereError);
            near(tables.angularCdf[hemisphereBoundary], expectedHemisphere, 3.1e-8, "default negative-mu hemisphere matches independent integral: " + std::string(entry.name));
        }
    }
    // This trend concerns this same finite probe fixture only. It is not a
    // promise of monotone error at every radius, seed, or float resolution.
    check(maximumCdfErrors[1] < maximumCdfErrors[0] && maximumCdfErrors[2] < maximumCdfErrors[1], "catalog fixture maximum decreases under radial refinement");
    for (std::size_t resolution = 0; resolution < resolutions.size(); ++resolution)
        std::cout << "Stored-CDF finite fixture: " << resolutions[resolution] << " radial bins, " << probeIntervals + 1 << " probes/preset, max absolute probability error=" << maximumCdfErrors[resolution] << " at " << worstPresets[resolution] << " r=" << worstRadii[resolution] << " a0 (not a global bound).\n";
    std::cout << "Default verifier table-only fixture maxima: histogram=" << maximumHistogramError << ", origin sphere=" << maximumRegionError << ", negative-mu hemisphere=" << maximumHemisphereError << "; separate allowance=" << verifierTableAllowance << ".\n";
}

struct Observations {
    std::uint64_t inner{}, positiveMu{};
    double muSum{}, muSquaredSum{};
    std::array<std::uint64_t, 16> radial{};
};

Observations observe(const SamplingTables& tables, SamplingMode mode) {
    Observations result;
    for (std::uint32_t index = 0; index < tables.config.count; ++index) {
        const auto record = sampleCpu(tables, index, mode);
        const auto point = pointOf(record);
        const double radius = std::hypot(static_cast<double>(point.x), static_cast<double>(point.y), static_cast<double>(point.z));
        check(finite(point) && std::isfinite(record.positionDensity[3]) && record.positionDensity[3] >= 0, "reference produces finite valid records");
        check(radius <= tables.config.radius * 1.000002, "sample stays in configured finite sphere");
        check(record.signPadding[1] == 0 && record.signPadding[2] == 0 && record.signPadding[3] == 0, "record padding initialized");
        if (radius <= tables.config.radius / 2)
            ++result.inner;
        if (point.z >= 0)
            ++result.positiveMu;
        double mu = 0;
        if (radius > 0)
            mu = point.z / radius;
        result.muSum += mu;
        result.muSquaredSum += mu * mu;
        const auto bin = std::min<std::size_t>(15, static_cast<std::size_t>(radius / tables.config.radius * 16));
        ++result.radial[bin];
    }
    return result;
}

void testReferenceSampling() {
    // Small CPU oracles only: the shipped million samples are generated by GPU.
    // Four fixed independent seeds prevent approving one lucky visual cloud.
    constexpr std::array<std::uint32_t, 4> seeds{1, 7, 12345, 987654321};
    for (const auto seed : seeds) {
        const auto uniform = buildTables(fixture(Orbital::uniformVolume, seed));
        const auto measured = observe(uniform, SamplingMode::weighted);
        const auto count = uniform.config.count;
        check(probabilityWithinTolerance(measured.inner, count, 0.125, 0.0002), "uniform volume: inner-half radius is 1/8, not 1/2");
        check(probabilityWithinTolerance(measured.positiveMu, count, 0.5, 0.0002), "uniform volume: hemispheres have equal probability");
        near(measured.muSum / count, 0, 0.025, "uniform volume mean mu");
        near(measured.muSquaredSum / count, 1.0 / 3, 0.025, "uniform volume second moment mu");
        const auto expected = referenceRadialHistogram(uniform.config);
        for (std::size_t bin = 0; bin < expected.size(); ++bin)
            check(probabilityWithinTolerance(measured.radial[bin], count, expected[bin], 0.0002), "independent volume histogram fixture");

        const auto anisotropic = buildTables(fixture(Orbital::affineMu, seed));
        const auto asymmetric = observe(anisotropic, SamplingMode::weighted);
        check(probabilityWithinTolerance(asymmetric.inner, count, 0.125, 0.0002), "anisotropic field retains volume-correct radius");
        check(probabilityWithinTolerance(asymmetric.positiveMu, count, 0.65, 0.0003), "nonuniform field: hemisphere integral is 0.65");
        near(asymmetric.muSum / count, 0.2, 0.025, "nonuniform field: independent mean mu is alpha/3");
    }

    const auto uniform = buildTables(fixture(Orbital::uniformVolume));
    const auto wrongRadius = observe(uniform, SamplingMode::uniformRadius);
    check(probabilityWithinTolerance(wrongRadius.inner, uniform.config.count, 0.5, 0), "uniform-radius sandbox demonstrates the expected bias");
    const auto wrongAngle = observe(uniform, SamplingMode::uniformAngle);
    near(wrongAngle.muSquaredSum / uniform.config.count, 0.5, 0.025, "uniform-angle sandbox overweights poles");

    auto config = fixture(Orbital::s1, 7);
    const auto hydrogen = buildTables(config);
    const auto measured = observe(hydrogen, SamplingMode::weighted);
    const auto expected = referenceRadialHistogram(config);
    for (std::size_t bin = 0; bin < expected.size(); ++bin)
        check(probabilityWithinTolerance(measured.radial[bin], config.count, expected[bin], 0.0002), "1s histogram against closed-form hydrogen CDF");

    // Same (seed,index) must not depend on dispatch-sized chunks.
    for (const auto index : std::array<std::uint32_t, 5>{0, 1, 255, 256, 16380}) {
        const auto first = sampleCpu(hydrogen, index);
        const auto second = sampleCpu(hydrogen, index);
        check(first.positionDensity == second.positionDensity && first.signPadding == second.signPadding, "counter samples are repeatable at odd batch boundaries");
    }
    config.seed = 8;
    const auto changedSeed = buildTables(config);
    check(sampleCpu(hydrogen, 255).positionDensity != sampleCpu(changedSeed, 255).positionDensity, "changing seed changes actual positions");
    rejects([&] {
        sampleCpu(hydrogen, config.count);
    },
        "sample index cannot exceed requested count");
}

std::string encoded(const PlaygroundConfig& config) {
    std::ostringstream output;
    writeConfig(output, config);
    return output.str();
}

PlaygroundConfig decoded(const std::string& bytes) {
    std::istringstream input(bytes);
    return readConfig(input);
}

void testConfigurationAndStatistics() {
    PlaygroundConfig config;
    config.primary = fixture(Orbital::fxyz, std::numeric_limits<std::uint32_t>::max(), 257);
    config.secondary = fixture(Orbital::s1, 0, 16381);
    config.comparison = true;
    config.densityBoost = true;
    config.autoFit = false;
    config.clipEnabled = true;
    config.clipAxis = 1;
    config.clipOffset = -1.25F;
    config.probeCenter = {1.5F, -2.75F, 3};
    config.probeRadius = 0.75F;
    config.palette = 2;
    config.opacity = 0.012345F;
    const auto bytes = encoded(config);
    const auto loaded = decoded(bytes);
    check(encoded(loaded) == bytes, "configuration round-trip preserves all parameters and exact float values");
    check(loaded.primary.seed == std::numeric_limits<std::uint32_t>::max() && loaded.secondary.seed == 0, "unsigned seed boundaries preserved");
    check(loaded.densityBoost && loaded.comparison && !loaded.autoFit, "configuration restores view modes, not only sample parameters");
    rejects([&] {
        decoded(bytes + "unexpected");
    },
        "trailing config token rejected");
    rejects([&] {
        decoded(bytes.substr(0, bytes.size() / 2));
    },
        "truncated config rejected");
    rejects([] {
        decoded(std::string(16385, ' '));
    },
        "config input budget is bounded");
    rejects([] {
        decoded("ATOMIC_PLAYGROUND 2\n");
    },
        "unknown configuration version rejected");
    rejects([] {
        decoded("ATOMIC_PLAYGROUND 1\n4 -1 257 2048 64 128 32\n");
    },
        "negative unsigned seed rejected");
    rejects([] {
        decoded("ATOMIC_PLAYGROUND 1\n4 4294967296 257 2048 64 128 32\n");
    },
        "unsigned seed overflow rejected");
    rejects([] {
        decoded("ATOMIC_PLAYGROUND 1\n4 1 257 2048 64 128 nan\n");
    },
        "nonfinite config radius rejected");
    rejects([] {
        auto bad = fixture(Orbital::s1);
        bad.count = 5000001;
        buildTables(bad);
    },
        "sample memory budget enforced before allocation");
    rejects([] {
        auto bad = fixture(Orbital::s1);
        bad.muBins = 257;
        buildTables(bad);
    },
        "angular allocation budget enforced");
    rejects([] {
        checkedProduct(std::numeric_limits<std::size_t>::max(), 2);
    },
        "allocation multiplication cannot wrap");

    const auto interval = binomialWilson(25, 100);
    near(interval.estimate, 0.25, 0, "Wilson interval reports measured probability");
    check(interval.low < 0.25 && interval.high > 0.25 && interval.low >= 0 && interval.high <= 1, "Wilson interval is bounded and nondegenerate");
    check(binomialWilson(0, 100).high > 0 && binomialWilson(100, 100).low < 1, "Wilson interval handles boundary counts");
    rejects([] {
        binomialWilson(1, 0);
    },
        "empty denominator cannot produce fake certainty");
    rejects([] {
        probabilityWithinTolerance(101, 100, 0.5, 0);
    },
        "invalid observed counts rejected");
    check(!probabilityWithinTolerance(90, 100, 0.1, 0), "large systematic bias cannot pass uncertainty guard");
}

} // namespace

int main() {
    try {
        testSuppliedDensity();
        testRadialReference();
        testTablesAndRandom();
        testDefaultTableApproximationAllowance();
        testReferenceSampling();
        testConfigurationAndStatistics();
        std::cout << "Atomic Playground CPU fixtures passed: supplied fields, independent integrals, CDF, seeds, volume, bias, histogram and config.\n";
        return EXIT_SUCCESS;
    } catch (const std::exception& error) {
        std::cerr << "Atomic Playground CPU fixture failed: " << error.what() << '\n';
        return EXIT_FAILURE;
    }
}
