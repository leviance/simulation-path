#include "benchmark.hpp"

#include <array>
#include <cmath>
#include <cstddef>
#include <cstdlib>
#include <iostream>
#include <string_view>
#include <vector>

namespace {

// Bộ test chỉ gọi code thuần; không khởi tạo SDL hoặc mở window.
int failures = 0;

void check(bool condition, std::string_view label) {
    if (!condition) {
        std::cerr << "FAIL: " << label << '\n';
        ++failures;
    }
}

void testDeterministicAoS() {
    const std::vector<lab::ParticleAoS> first = lab::makeParticlesAoS(4'096, 0x32c0ffeeU);
    const std::vector<lab::ParticleAoS> second = lab::makeParticlesAoS(4'096, 0x32c0ffeeU);
    check(first.size() == 4'096U, "AoS contains the requested particle count");
    check(sizeof(lab::ParticleAoS) == 24U, "AoS particle contains exactly six floats");
    bool identical = first.size() == second.size();
    for (std::size_t index = 0; identical && index < first.size(); ++index) {
        identical = first[index].positionX == second[index].positionX &&
            first[index].positionY == second[index].positionY &&
            first[index].positionZ == second[index].positionZ &&
            first[index].velocityX == second[index].velocityX &&
            first[index].velocityY == second[index].velocityY &&
            first[index].velocityZ == second[index].velocityZ;
    }
    check(identical, "same seed recreates every AoS field");
}

void testAoSIntegration() {
    std::vector<lab::ParticleAoS> particles = lab::makeParticlesAoS(2'048, 0x32c0ffeeU);
    for (int step = 0; step < 400; ++step) {
        lab::integrateAoS(particles, 1.0F / 120.0F);
    }
    check(lab::allFinite(particles), "AoS integration remains finite");
    bool inside = true;
    for (const lab::ParticleAoS& particle : particles) {
        inside = inside && particle.positionX >= -1.0F && particle.positionX <= 1.0F;
        inside = inside && particle.positionY >= -1.0F && particle.positionY <= 1.0F;
        inside = inside && particle.positionZ >= -1.0F && particle.positionZ <= 1.0F;
    }
    check(inside, "periodic wrapping keeps every position in world bounds");
}

void testAoSBaseline() {
    const std::vector<lab::ParticleAoS> source = lab::makeParticlesAoS(8'192, 0x32c0ffeeU);
    const lab::AoSBaseline first = lab::benchmarkAoSBaseline(
        source,
        lab::MemoryWorkload::positionX,
        3
    );
    const lab::AoSBaseline second = lab::benchmarkAoSBaseline(
        source,
        lab::MemoryWorkload::positionX,
        3
    );
    check(first.particleCount == source.size(), "AoS baseline reports its workload size");
    check(first.repetitions == 3, "AoS baseline reports bounded repetitions");
    check(first.checksum == second.checksum, "AoS checksum is deterministic");
    check(std::isfinite(first.elapsedMilliseconds), "AoS baseline timing is finite");
}

void testSoAConversion() {
    const std::vector<lab::ParticleAoS> aos = lab::makeParticlesAoS(4'096, 0x32c0ffeeU);
    const lab::ParticlesSoA soa = lab::makeParticlesSoA(aos);
    check(lab::validSoA(soa), "all six SoA vectors have the same size");
    check(soa.size() == aos.size(), "SoA preserves particle count");
    check(lab::maximumLayoutDifference(aos, soa) == 0.0F, "conversion preserves every field");
}

void testEquivalentKernels() {
    const std::vector<lab::ParticleAoS> source = lab::makeParticlesAoS(3'000, 0x32c0ffeeU);
    const std::array<lab::MemoryWorkload, 3> workloads{lab::MemoryWorkload::positionX, lab::MemoryWorkload::velocityOnly, lab::MemoryWorkload::integrate};
    for (const lab::MemoryWorkload workload : workloads) {
        std::vector<lab::ParticleAoS> aos = source;
        lab::ParticlesSoA soa = lab::makeParticlesSoA(source);
        const double aosChecksum = lab::runAoSWorkload(aos, workload);
        const double soaChecksum = lab::runSoAWorkload(soa, workload);
        check(aosChecksum == soaChecksum, "AoS and SoA workload checksums agree");
        check(lab::maximumLayoutDifference(aos, soa) == 0.0F, "AoS and SoA states agree");
    }
}

void testMemoryTrafficModel() {
    const lab::MemoryTrafficEstimate aosSingle = lab::estimateMemoryTraffic(
        lab::MemoryLayout::aos,
        lab::MemoryWorkload::positionX,
        1'000'000
    );
    const lab::MemoryTrafficEstimate soaSingle = lab::estimateMemoryTraffic(
        lab::MemoryLayout::soa,
        lab::MemoryWorkload::positionX,
        1'000'000
    );
    check(aosSingle.usefulBytes == 4'000'000U, "one float per particle is four useful MB");
    check(soaSingle.cacheLines < aosSingle.cacheLines, "SoA loads fewer lines for one field");
    check(soaSingle.efficiency > aosSingle.efficiency, "SoA wastes fewer loaded bytes");

    const lab::MemoryTrafficEstimate aosFull = lab::estimateMemoryTraffic(
        lab::MemoryLayout::aos,
        lab::MemoryWorkload::integrate,
        16'384
    );
    const lab::MemoryTrafficEstimate soaFull = lab::estimateMemoryTraffic(
        lab::MemoryLayout::soa,
        lab::MemoryWorkload::integrate,
        16'384
    );
    check(aosFull.cacheLines == soaFull.cacheLines, "full workload loads comparable cache lines");
    check(aosFull.efficiency == 1.0, "full AoS workload uses every loaded field");
    check(soaFull.efficiency == 1.0, "full SoA workload uses every loaded field");
}

void testBoundedLayoutBenchmark() {
    const std::vector<lab::ParticleAoS> source = lab::makeParticlesAoS(12'000, 0x32c0ffeeU);
    const lab::LayoutBenchmark result = lab::benchmarkLayoutRace(
        source,
        lab::MemoryWorkload::velocityOnly,
        3
    );
    check(result.repetitions == 3, "layout benchmark uses bounded repetitions");
    check(result.aosChecksum == result.soaChecksum, "layout benchmark observes equal outputs");
    check(result.maximumDifference == 0.0F, "layout benchmark finishes with equal states");
    check(std::isfinite(result.aosMilliseconds), "AoS median timing is finite");
    check(std::isfinite(result.soaMilliseconds), "SoA median timing is finite");
}

void testFinalValidation() {
    const lab::MemoryLayoutValidationReport report =
        lab::validateMemoryLayoutExperiment(0x32c0ffeeU);
    check(report.deterministic, "final validation accepts deterministic generation");
    check(report.conversionExact, "final validation accepts exact conversion");
    check(report.kernelsAgree, "final validation accepts equivalent kernels");
    check(report.singleFieldReducesTraffic, "final validation sees the single-field advantage");
    check(report.fullWorkloadUsesAllBytes, "final validation sees full-field efficiency");
    check(report.benchmarkObservable, "final validation observes finite benchmark output");
}

} // namespace

int main() {
    testDeterministicAoS();
    testAoSIntegration();
    testAoSBaseline();
    testSoAConversion();
    testEquivalentKernels();
    testMemoryTrafficModel();
    testBoundedLayoutBenchmark();
    testFinalValidation();
    if (failures != 0) {
        std::cerr << failures << " validation checks failed\n";
        return EXIT_FAILURE;
    }
    std::cout << "Project 32 validation passed\n";
    return EXIT_SUCCESS;
}
