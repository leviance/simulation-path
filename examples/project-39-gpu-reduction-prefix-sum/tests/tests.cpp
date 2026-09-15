#include "reduction_math.hpp"

#include <cmath>
#include <cstdlib>
#include <iostream>
#include <limits>
#include <string_view>
#include <vector>

namespace {

int failures = 0;

// Test runner không dùng assert để mọi phép kiểm vẫn chạy trong Release build.
void check(bool condition, std::string_view label) {
    if (!condition) {
        std::cerr << "FAIL: " << label << '\n';
        ++failures;
    }
}

void testCpuContracts() {
    const std::vector<float> input{3.0F, 1.0F, 4.0F, 2.0F};
    check(lab::cpuReduction(input) == 10.0, "reduction returns one total");
    const std::vector<double> scan = lab::cpuExclusiveScan(input);
    check(scan == std::vector<double>({0.0, 3.0, 4.0, 8.0}), "exclusive scan excludes current input");
}

void testDeterministicInput() {
    const auto first = lab::makeDeterministicInput(4096U, 39U);
    const auto second = lab::makeDeterministicInput(4096U, 39U);
    const auto other = lab::makeDeterministicInput(4096U, 40U);
    check(first == second, "same count and seed reproduce input");
    check(first[777] != other[777], "another seed changes the workload");
    check(first[0] > 0.0F && first[0] < 0.01F, "input range stays bounded");
}

void testHierarchyAndTail() {
    const auto levels = lab::makeHierarchy(1'000'003U);
    check(levels.size() == 3U, "one million and three values need three hierarchy levels");
    check(levels[0].blockCount == 1'954U, "first level emits 1954 block sums");
    check(levels[1].blockCount == 4U, "second level emits four block sums");
    check(levels[2].blockCount == 1U, "third level emits one scalar");
    check(levels[0].zeroPadding == 445U, "tail loads 445 zero padding values");
    check(levels[0].launchedValues == 1'000'448U, "first level covers complete 512-value blocks");
    check(lab::reductionDispatchCount(1'000'003U) == 3U, "reduction uses three dispatches");
    check(lab::scanDispatchCount(1'000'003U) == 5U, "scan uses three scan and two uniform-add dispatches");
    check(lab::kBlockSpan * sizeof(float) == 2'048U, "shared array occupies 2048 bytes");
}

void testCapabilities() {
    lab::ComputeLimits limits{};
    limits.majorVersion = 4;
    limits.minorVersion = 3;
    limits.maximumWorkgroupCountX = 65'535;
    limits.maximumWorkgroupSizeX = 1'024;
    limits.maximumInvocations = 1'024;
    limits.maximumShaderStorageBlockBytes = 128LL * 1024LL * 1024LL;
    limits.maximumSharedMemoryBytes = 32LL * 1024LL;
    check(lab::validateCapabilities(limits, 1'000'003U).allPassed(), "valid OpenGL limits pass");
    limits.maximumSharedMemoryBytes = 1'024;
    check(!lab::validateCapabilities(limits, 1'000'003U).allPassed(), "small shared-memory limit fails");
}

void testValidationReports() {
    const std::vector<float> input{3.0F, 1.0F, 4.0F, 2.0F};
    const std::vector<float> correct{0.0F, 3.0F, 4.0F, 8.0F};
    check(lab::validateExclusiveScan(input, correct).passed(), "correct exclusive scan passes");
    check(lab::validateReduction(input, 10.0F).passed(), "correct reduction passes");

    std::vector<float> wrong = correct;
    wrong[2] += 0.25F;
    const lab::ValidationReport mismatch = lab::validateExclusiveScan(input, wrong);
    check(!mismatch.passed(), "wrong block offset fails validation");
    check(mismatch.firstMismatch == 2U, "validation records first mismatch");
    check(mismatch.maximumAbsoluteError > 0.24, "validation records maximum error");

    wrong = correct;
    wrong[1] = std::numeric_limits<float>::quiet_NaN();
    const lab::ValidationReport nonFinite = lab::validateExclusiveScan(input, wrong);
    check(!nonFinite.allFinite && !nonFinite.passed(), "NaN cannot pass scan validation");
}

void testFiniteMedian() {
    check(lab::medianMilliseconds({9.0, 1.0, 5.0}) == 5.0, "odd median selects middle sample");
    check(lab::medianMilliseconds({8.0, 2.0, 4.0, 6.0}) == 5.0, "even median averages middle pair");
}

} // namespace

int main() {
    testCpuContracts();
    testDeterministicInput();
    testHierarchyAndTail();
    testCapabilities();
    testValidationReports();
    testFiniteMedian();

    if (failures != 0) {
        std::cerr << failures << " Project 39 checks failed\n";
        return EXIT_FAILURE;
    }
    std::cout << "Project 39 validation passed\n";
    return EXIT_SUCCESS;
}
