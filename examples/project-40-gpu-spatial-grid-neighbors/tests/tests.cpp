#include "grid_math.hpp"

#include <cmath>
#include <cstdlib>
#include <iostream>
#include <limits>
#include <string_view>
#include <vector>

namespace {

int failures = 0;

// Runner không dùng assert để mọi phép kiểm vẫn chạy trong Release build.
void check(bool condition, std::string_view label) {
    if (!condition) {
        std::cerr << "FAIL: " << label << '\n';
        ++failures;
    }
}

void testGridAddressContract() {
    const lab::GridSpec spec = lab::makeGridSpec(8.0F);
    check(spec.columns == 128U && spec.rows == 72U, "1024x576 with cell 8 creates 128x72 cells");
    check(lab::cellId(spec, {0.0F, 0.0F}) == 0U, "minimum corner maps to first cell");
    check(lab::cellId(spec, {1'024.0F, 576.0F}) == spec.cellCount() - 1U, "maximum corner clamps to last cell");
    check(lab::cellId(spec, {-20.0F, -10.0F}) == 0U, "negative point clamps intentionally");
    check(lab::cellId(spec, {2'000.0F, 900.0F}) == spec.cellCount() - 1U, "outside maximum clamps intentionally");
}

void testDeterministicPositions() {
    const auto first = lab::makeDeterministicPositions(4'096U, 40U);
    const auto second = lab::makeDeterministicPositions(4'096U, 40U);
    const auto other = lab::makeDeterministicPositions(4'096U, 41U);
    check(first == second, "same count and seed reproduce positions");
    check(first[777].x != other[777].x, "another seed changes positions");
    check(first[0].x >= 0.0F && first[0].x < lab::kWorldWidth, "x remains in half-open world bounds");
    check(first[0].y >= 0.0F && first[0].y < lab::kWorldHeight, "y remains in half-open world bounds");
}

void testCountAndScan() {
    const std::vector<std::uint32_t> counts{2U, 0U, 3U, 1U};
    const auto offsets = lab::exclusiveScanCpu(counts);
    check(offsets == std::vector<std::uint32_t>({0U, 2U, 2U, 5U}), "exclusive scan creates CSR begins");
    check(offsets.back() + counts.back() == 6U, "last offset plus last count recovers total");

    const auto positions = lab::makeDeterministicPositions(65'537U, 7U);
    const auto occupancy = lab::countCellsCpu(positions, lab::makeGridSpec(16.0F));
    std::uint64_t total = 0U;
    for (std::uint32_t count : occupancy) {
        total += count;
    }
    check(total == positions.size(), "every particle increments exactly one CPU cell");
}

void testCsrMembership() {
    const auto positions = lab::makeDeterministicPositions(8'193U, 12U);
    const lab::CpuCsrGrid grid = lab::buildCsrCpu(positions, lab::makeGridSpec(12.0F));
    const lab::GridValidationReport report = lab::validateCsr(
        positions.size(),
        grid.spec,
        grid.counts,
        grid.offsets,
        grid.sortedIndices
    );
    check(report.passed(), "CPU CSR contains every particle exactly once");

    std::vector<std::uint32_t> broken = grid.sortedIndices;
    broken[1] = broken[0];
    const lab::GridValidationReport duplicate = lab::validateCsr(
        positions.size(),
        grid.spec,
        grid.counts,
        grid.offsets,
        broken
    );
    check(!duplicate.particlePermutation, "duplicate index is detected structurally");
}

void testCandidateRange() {
    const lab::GridSpec spec = lab::makeGridSpec(8.0F);
    const lab::CellRange corner = lab::candidateCellRange(spec, {1.0F, 1.0F}, 6.0F);
    check(corner.minimumColumn == 0U && corner.minimumRow == 0U, "corner range clamps at minimum");
    check(corner.maximumColumn == 0U && corner.maximumRow == 0U, "small corner query stays in one cell");

    const lab::CellRange interior = lab::candidateCellRange(spec, {96.0F, 96.0F}, 10.0F);
    check(interior.visitedCellCount() == 16U, "radius larger than cell size is not hard-coded to 3x3");
}

void testExactNeighborsAndTieBreak() {
    const std::vector<lab::Vec2> positions = {
        {10.0F, 10.0F},
        {13.0F, 14.0F},
        {7.0F, 6.0F},
        {14.9F, 14.9F},
    };
    const lab::CpuCsrGrid grid = lab::buildCsrCpu(positions, lab::makeGridSpec(8.0F));
    const lab::NeighborSummary brute = lab::bruteForceNeighbor(positions, 0U, 5.0F);
    const lab::NeighborSummary csr = lab::queryCsrNeighbor(positions, grid, 0U, 5.0F);
    check(brute.neighborCount == 2U, "points exactly on radius are accepted and AABB-only point is rejected");
    check(brute.nearestIndex == 1U, "equal distance chooses smaller particle index");
    check(lab::summariesMatch(csr, brute), "CSR query matches brute-force oracle");
}

void testTailAndHierarchy() {
    const std::size_t groups = lab::ceilDiv(1'000'003U, lab::kWorkgroupSize);
    check(groups == 3'907U, "one million and three particles need 3907 workgroups");
    check(groups * lab::kWorkgroupSize - 1'000'003U == 189U, "bounds guard rejects 189 tail invocations");
    const auto hierarchy = lab::makeScanHierarchy(9'216U);
    check(hierarchy.size() == 2U, "9216 cells need two uint scan levels");
    check(hierarchy[0].blockCount == 18U && hierarchy[1].blockCount == 1U, "scan hierarchy is 9216 to 18 to one block");
}

void testCapabilitiesAndSamples() {
    const lab::ComputeLimits supported{4, 6, 65'535, 1'024, 1'024, 16, 1LL << 30, 64LL << 10};
    check(lab::validateCapabilities(supported, 1'000'003U, lab::makeGridSpec(8.0F)).allPassed(), "named capability report accepts supported limits");
    const lab::WorkloadEstimate safeWork = lab::estimateNeighborWork(1'000'003U, lab::makeGridSpec(8.0F), 6.0F);
    check(safeWork.withinBudget(), "default million-particle query stays inside the candidate budget");
    const lab::WorkloadEstimate dangerousWork = lab::estimateNeighborWork(1'000'003U, lab::makeGridSpec(8.0F), 48.0F);
    check(!dangerousWork.withinBudget(), "large radius is rejected before it can submit billions of candidate visits");
    check(!lab::validateCapabilities(supported, 1'000'003U, lab::makeGridSpec(8.0F), 48.0F).allPassed(), "capability report includes the workload budget");
    lab::ComputeLimits tooSmall = supported;
    tooSmall.maximumStorageBindings = 4;
    check(!lab::validateCapabilities(tooSmall, 1'000'003U, lab::makeGridSpec(8.0F)).allPassed(), "six SSBO bindings are required");

    const auto first = lab::validationSampleIndices(1'000'003U);
    const auto second = lab::validationSampleIndices(1'000'003U);
    check(first.size() == 32U && first == second, "large validation uses 32 deterministic samples");
    check(lab::validationSampleIndices(0U).empty(), "empty workload creates no modulo-by-zero sample");
}

} // namespace

int main() {
    testGridAddressContract();
    testDeterministicPositions();
    testCountAndScan();
    testCsrMembership();
    testCandidateRange();
    testExactNeighborsAndTieBreak();
    testTailAndHierarchy();
    testCapabilitiesAndSamples();

    if (failures != 0) {
        std::cerr << failures << " Project 40 checks failed.\n";
        return EXIT_FAILURE;
    }
    std::cout << "Project 40 pure CPU contracts passed.\n";
    return EXIT_SUCCESS;
}
