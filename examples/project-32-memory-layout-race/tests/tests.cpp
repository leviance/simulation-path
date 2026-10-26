#include "benchmark.hpp"
#include "render.hpp"
#include <cstdlib>
#include <iostream>
#include <string_view>

namespace {
int failures = 0;

void check(bool condition, std::string_view label) {
    if (!condition) {
        std::cerr << "FAIL: " << label << '\n';
        ++failures;
    }
}

template <class Function>
bool rejects(Function function) {
    try {
        function();
    } catch (const std::exception&) {
        return true;
    }
    return false;
}

void testEmissionAndGravity() {
    lab::FountainConfig config{};
    config.emissionRate = 64;
    const auto plan = lab::planEmission(1, 20, 0.5, config, 1.0F / 32);
    check(plan.active == 3 && plan.remainder == 0.5, "emission uses fractional carry and stable prefix slots");
    check(lab::planEmission(4, 5, 0.5, config, 1.0F / 32).active == 5, "emission clamps to capacity");
    check(lab::randomUnit(0, 0, 0, 0) == 0, "known integer hash fixture");
    const auto born = lab::spawnParticle(17, 4, config);
    check(born.id == 17 && born.generation == 4 && born.age == 0 && born.positionX == config.emitterX, "birth initializes identity and emitter position");
    check(born.lifetime >= 0.75F * config.lifetime && born.lifetime <= 1.25F * config.lifetime, "lifetime jitter stays within declared bounds");
    lab::ParticleAoS particle{};
    particle.velocityX = 1;
    particle.velocityY = 2;
    particle.velocityZ = 3;
    particle.age = 0.25F;
    lab::integrateParticle(particle, 1.0F / 32, -8);
    // Hand calculation: vy=2-8/32=1.75, y=1.75/32.
    check(particle.velocityY == 1.75F && particle.positionY == 0.0546875F && particle.positionX == 0.03125F && particle.positionZ == 0.09375F && particle.age == 0.28125F, "independent symplectic Euler fixture");
    particle = lab::spawnParticle(17, 4, config);
    particle.age = particle.lifetime - 1.0F / 64;
    check(lab::advanceParticle(particle, config, 1.0F / 32), "expiry triggers respawn");
    check(particle.id == 17 && particle.generation == 5 && std::abs(particle.age - 1.0F / 64) < 1e-6F, "respawn preserves slot and consumes only leftover time");
    const auto repeat = lab::spawnParticle(17, 5, config);
    auto expected = repeat;
    lab::integrateParticle(expected, 1.0F / 64, config.gravity);
    check(lab::particleDifference(particle, expected) < 1e-5F, "respawn consumes the correct fractional interval");
}

void testLayoutsAndKernels() {
    lab::FountainConfig config{};
    const auto initial = lab::makeParticlesAoS(257, config);
    const auto repeated = lab::makeParticlesAoS(257, config);
    check(sizeof(lab::ParticleAoS) == 44, "payload is two uint32 and nine float32 fields");
    auto soa = lab::makeParticlesSoA(initial);
    check(soa.valid() && lab::maximumLayoutDifference(initial, soa) == 0, "all eleven fields convert without loss");
    for (std::size_t index = 0; index < initial.size(); ++index) {
        check(initial[index].id == index && lab::particleDifference(initial[index], repeated[index]) == 0, "seed and stable ID repeat every field");
    }
    soa.generation[3]++;
    check(!std::isfinite(lab::maximumLayoutDifference(initial, soa)), "identity mismatch is not hidden by float tolerance");
    soa.generation[3]--;
    soa.hue.pop_back();
    check(!soa.valid(), "unequal SoA lengths rejected");
    for (auto workload : {lab::MemoryWorkload::gravityOnly, lab::MemoryWorkload::fullLifecycle}) {
        auto aos = initial;
        soa = lab::makeParticlesSoA(initial);
        for (int step = 0; step < 400; ++step) {
            lab::updateAoSRange(aos, 0, aos.size(), config, lab::fixedDt, workload, aos.size());
            lab::updateSoARange(soa, 0, soa.size(), config, lab::fixedDt, workload, soa.size());
        }
        check(lab::maximumLayoutDifference(aos, soa) <= 1e-5F, "AoS/SoA agree after repeated kernel passes");
        check(std::abs(lab::checksum(aos, aos.size()) - lab::checksum(soa, soa.size())) < 1e-6, "both observable checksums agree");
        if (workload == lab::MemoryWorkload::fullLifecycle)
            check(aos[0].generation > 0, "agreement includes recycled particles, not only motion");
    }
}

void finishStep(lab::Simulation& simulation) {
    simulation.singleStep = true;
    simulation.beginStep();
    int ticks = 0;
    while (simulation.pending != lab::PendingWork::none) {
        simulation.tickStep(0);
        check(++ticks < 10000, "physics bounded by target count");
    }
}

void testAtomicStateAndConversion() {
    lab::Simulation simulation{};
    simulation.reset(9000);
    const auto initial = simulation.aos;
    simulation.singleStep = true;
    simulation.beginStep();
    simulation.tickStep(0);
    check(simulation.steps == 0 && simulation.cursor == 4096, "partial pass has not advanced simulation time");
    check(lab::checksum(simulation.aos, simulation.active) == lab::checksum(initial, initial.size()), "partial pass does not expose half-updated state");
    simulation.cancel();
    check(simulation.steps == 0 && simulation.pending == lab::PendingWork::none, "cancel preserves committed state");
    finishStep(simulation);
    check(simulation.active == 9000 && simulation.committedUpdated == 9000 && simulation.steps == 1, "every live slot updated before commit");
    const auto before = simulation.aos;
    const double time = simulation.time;
    simulation.beginConversion();
    simulation.tickConversion(0);
    check(simulation.layout == lab::Layout::aos, "partial conversion keeps source layout active");
    simulation.cancel();
    check(simulation.time == time, "canceled conversion does not advance time");
    simulation.beginConversion();
    while (simulation.pending != lab::PendingWork::none)
        simulation.tickConversion(0);
    check(simulation.layout == lab::Layout::soa && lab::maximumLayoutDifference(before, simulation.soa) == 0, "AoS to SoA preserves the complete state");
    finishStep(simulation);
    const auto afterSoA = simulation.soa;
    simulation.beginConversion();
    while (simulation.pending != lab::PendingWork::none)
        simulation.tickConversion(0);
    check(lab::maximumLayoutDifference(simulation.aos, afterSoA) == 0 && simulation.time == time + double(lab::fixedDt), "SoA to AoS round trip preserves every field and time");
    simulation.reset(32, true);
    std::size_t births = 0;
    for (int step = 0; step < 120; ++step) {
        finishStep(simulation);
        births += simulation.born;
    }
    check(simulation.active == 32 && births == 32, "cold emission fills each stable slot once; expiry reuses it");
    for (std::size_t index = 0; index < 32; ++index)
        check(simulation.aos[index].id == index && lab::finiteParticle(simulation.aos[index]), "no slot leak or invalid lifecycle state");
}

void testBenchmarkAndBounds() {
    lab::BenchmarkJob job{};
    job.start({}, {257}, {lab::MemoryWorkload::gravityOnly, lab::MemoryWorkload::fullLifecycle});
    job.paused = true;
    job.tick();
    check(job.target == 0, "benchmark pause preserves progress");
    job.paused = false;
    int ticks = 0;
    while (job.active) {
        job.tick(1);
        check(++ticks < 10000, "benchmark finite tick budget");
    }
    check(job.rows.size() == 2 && !job.timedOut, "both workloads measured");
    for (const auto& row : job.rows) {
        check(row.updated == 257 * 3 && row.paired, "benchmark records every target/pass");
        check(row.maximumDifference <= 1e-5F && std::isfinite(row.checksumAoS), "timing accompanies state verification");
        check(row.aos.minimum <= row.aos.median && row.aos.median <= row.aos.maximum && row.soa.minimum <= row.soa.median && row.soa.median <= row.soa.maximum, "median and spread, never assert a speed winner");
    }
    job.start({}, {257}, {lab::MemoryWorkload::fullLifecycle});
    job.deadline = lab::Clock::now() - std::chrono::seconds(1);
    job.tick();
    check(job.timedOut && !job.active, "deadline reports incomplete instead of hanging");
    job.start({}, {257}, {lab::MemoryWorkload::fullLifecycle});
    job.cancel();
    check(!job.active, "cancel stops a running benchmark");
    const auto aos = lab::modelTraffic(64, lab::Layout::aos, lab::MemoryWorkload::gravityOnly);
    const auto soa = lab::modelTraffic(64, lab::Layout::soa, lab::MemoryWorkload::gravityOnly);
    check(aos.usefulBytes == 256 && aos.uniqueLines == 44 && soa.uniqueLines == 4, "hand-counted 64B aligned-base model");
    check(lab::modelTraffic(64, lab::Layout::soa, lab::MemoryWorkload::fullLifecycle).upperBound, "all-field traffic is labeled upper bound");
    check(rejects([] {
              lab::makeParticlesAoS(1'000'001, {});
          }),
          "allocation budget enforced");
    check(rejects([] {
              auto config = lab::FountainConfig{};
              config.gravity = std::numeric_limits<float>::quiet_NaN();
              lab::validateConfig(config);
          }),
          "NaN rejected");
    check(rejects([] {
              lab::validateConfig({}, 1);
          }),
          "unsafe timestep rejected");
}

void testPresentation() {
    lab::Camera camera{};
    camera.yaw = camera.pitch = 0;
    camera.distance = 10;
    camera.target = {};
    const auto square = lab::projectPoint({1, 0, 0}, camera, 400, 400);
    const auto wide = lab::projectPoint({1, 0, 0}, camera, 800, 400);
    check(square.x - 200 == wide.x - 400 && square.y == 200, "aspect applied once in 3D camera");
    lab::Simulation simulation{};
    simulation.reset(257);
    lab::Framebuffer image{};
    const auto stats = lab::drawFountain(image, simulation, camera, 17);
    check(stats.sampled == 17 && stats.rendered <= 17 && simulation.active == 257, "render sampling does not reduce simulated N");
}
} // namespace

int main() {
    testEmissionAndGravity();
    testLayoutsAndKernels();
    testAtomicStateAndConversion();
    testBenchmarkAndBounds();
    testPresentation();
    if (failures != 0)
        return EXIT_FAILURE;
    std::cout << "P32 fountain lifecycle, layouts, bounded jobs and renderer tests passed\n";
    return EXIT_SUCCESS;
}
