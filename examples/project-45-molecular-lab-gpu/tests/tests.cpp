#include "molecular_math.hpp"
#include "reference_grid.hpp"

#include <bit>
#include <cstdlib>
#include <iostream>
#include <string_view>

namespace {

int failures = 0;

void check(bool condition, std::string_view label) {
    if (!condition) {
        ++failures;
        std::cerr << "FAIL: " << label << '\n';
    }
}

} // namespace

int main() {
    using namespace molecular;

    // Kiểm budget bằng số nguyên 64 bit; không cấp phát hàng triệu hạt trong tests.
    const Limits limits{128ULL * 1024 * 1024, 8, 8, 2, 1024, 1024, 65535, 32768};
    for (const auto count : {64U, 257U, 100000U, 500000U, 1000000U, 5000000U}) {
        const auto plan = makePlan(count);
        check(plan.largestBlock <= limits.maximumBlockBytes, "separate SSBO fits 128 MiB");
        check(rejectPlan(plan, limits).empty(), "preset within declared capabilities");
        check(plan.width / static_cast<float>(plan.cellsX) >= cutoff + skin, "cell width covers list radius");
        check(ceilDivide(count, groupSize) * groupSize >= count, "tail workgroup is included");
        const auto stride = std::max(1U, ceilDivide(count, 100000));
        check((ceilDivide(count, stride) - 1) * stride < count, "draw does not read beyond SSBO");
    }
    auto insufficient = limits;
    insufficient.maximumBlockBytes = 1;
    check(!rejectPlan(makePlan(64), insufficient).empty(), "reject insufficient SSBO size");
    check(!rejectPlan(makePlan(5000000), limits, peakBudget).empty(), "include old state in peak memory");
    bool rejected = false;
    try {
        (void)makePlan(5000001);
    } catch (const std::invalid_argument&) {
        rejected = true;
    }
    check(rejected, "reject count outside supported range");

    // Seed giữ tổng vận tốc ban đầu gần zero, cả khi N lẻ và workgroup có phần đuôi.
    const auto plan = makePlan(257);
    std::vector<Float4> positions{};
    double momentumX = 0;
    double momentumY = 0;
    for (std::uint32_t i = 0; i < plan.count; ++i) {
        positions.push_back(initialPosition(plan, i));
        const auto velocity = initialVelocity(plan.count, i);
        momentumX += velocity.x;
        momentumY += velocity.y;
    }
    check(momentumX == 0 && momentumY == 0, "paired seed momentum");
    check(shiftedPair(cutoff).potential == 0 && shiftedPair(cutoff).slope == 0, "force-shifted cutoff");
    check(std::abs(shiftedPair(cutoff - 1e-7).slope) < 1e-6, "force continuous at cutoff");
    const auto force = referenceForces(plan, positions);
    double forceX = 0;
    double forceY = 0;
    for (const auto& value : force) {
        forceX += value.x;
        forceY += value.y;
    }
    check(std::hypot(forceX, forceY) < 1e-5, "all-pairs net internal force");

    // Bucket chứa mọi ID đúng một lần; không dùng grid bị overflow.
    const auto grid = referenceGrid(plan, positions);
    check(grid.valid, "lattice fits 16 slots per cell");
    std::vector<std::uint32_t> occurrences(plan.count);
    for (std::uint32_t cell = 0; cell < plan.cells; ++cell) {
        for (std::uint32_t slot = 0; slot < grid.counts[cell]; ++slot) {
            ++occurrences[grid.indices[cell * cellCapacity + slot]];
        }
    }
    bool isPermutation = true;
    for (const auto count : occurrences) {
        if (count != 1) {
            isPermutation = false;
        }
    }
    check(isPermutation, "permutation of IDs");
    auto dense = positions;
    for (auto& position : dense) {
        position = {0.5F, 0.5F, 0, 0};
    }
    check(!referenceGrid(plan, dense).valid, "overflow rejects rather than truncates");
    auto twoCells = plan;
    twoCells.cellsX = 2;
    twoCells.cellsY = 2;
    twoCells.cells = 4;
    check(neighborCells(twoCells, 0).size() == 4, "wrapped cells are unique");

    // Đổi vị trí hiện tại dưới nửa skin; stencil vẫn lấy quanh mốc reference.
    auto moved = positions;
    for (std::uint32_t i = 0; i < plan.count; ++i) {
        float displacement = 0.19F;
        if (i % 2 != 0) {
            displacement = -displacement;
        }
        moved[i].x += displacement;
        moved[i].x -= plan.width * std::floor(moved[i].x / plan.width);
    }
    for (std::uint32_t i = 0; i < plan.count; ++i) {
        const auto near = candidates(plan, grid, positions[i]);
        for (std::uint32_t j = 0; j < plan.count; ++j) {
            const double dx = minimumImage(moved[j].x - moved[i].x, plan.width);
            const double dy = minimumImage(moved[j].y - moved[i].y, plan.height);
            if (std::hypot(dx, dy) < cutoff) {
                check(std::find(near.begin(), near.end(), j) != near.end(), "skin stencil has no missed neighbor");
            }
        }
    }
    check(std::bit_cast<std::uint32_t>(0.01F) < std::bit_cast<std::uint32_t>(0.04F), "positive float bit ordering");
    check(skin * skin * 0.25F <= 0.2F * 0.2F, "half-skin equality triggers rebuild");

    // Ở x=3500, bước 0.0001 nhỏ hơn một ULP. Không được đánh mất mãi phần lẻ.
    float position = 3500.0F;
    float residual = 0;
    float applied = 0;
    for (int step = 0; step < 1000; ++step) {
        const auto result = compensatedDrift(position, 0.0001F, residual, 4000.0F);
        position = result.position;
        residual = result.residual;
        applied += result.displacement;
    }
    check(std::abs(position - 3500.1F) < 0.0003F, "small float steps survive large coordinates");
    check(std::abs(applied - 0.1F) < 0.0003F, "skin sees applied displacement");
    const auto seam = compensatedDrift(0, -0.0001F, 0, 4000.0F);
    check(seam.position >= 0 && seam.position < 4000, "rounded wrap remains in half-open box");
    check(std::abs(seam.displacement + seam.residual + 0.0001F) < 1e-7F, "wrap retains sub-ULP residual");

    if (failures != 0) {
        return EXIT_FAILURE;
    }
    std::cout << "Project 45 pure CPU validation passed. No GPU context was opened.\n";
    return EXIT_SUCCESS;
}
