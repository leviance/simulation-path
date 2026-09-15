#include "vector_compute_math.hpp"

#include <cmath>
#include <cstdlib>
#include <iostream>
#include <limits>
#include <string_view>

namespace {

int failures = 0;

// Test runner không dùng assert để các phép kiểm vẫn hoạt động trong Release build.
void check(bool condition, std::string_view label) {
    if (!condition) {
        std::cerr << "FAIL: " << label << '\n';
        ++failures;
    }
}

bool near(float actual, float expected, float tolerance = 1.0e-6F) {
    return std::abs(actual - expected) <= tolerance;
}

void testLayoutAndOperations() {
    check(sizeof(lab::Vec4) == 16, "Vec4 size is 16 bytes");
    check(alignof(lab::Vec4) == 16, "Vec4 alignment is 16 bytes");
    const lab::Vec4 a{1.0F, -2.0F, 3.0F, -4.0F};
    const lab::Vec4 b{0.5F, 1.5F, -2.0F, 4.0F};
    const lab::Vec4 add = lab::applyOperation(a, b, lab::VectorOperation::add, 2.0F);
    const lab::Vec4 axpy = lab::applyOperation(a, b, lab::VectorOperation::axpy, 2.0F);
    const lab::Vec4 difference = lab::applyOperation(
        a,
        b,
        lab::VectorOperation::difference,
        2.0F
    );
    check(near(add.x, 1.5F) && near(add.w, 0.0F), "Add is component-wise");
    check(near(axpy.y, -2.5F) && near(axpy.z, 4.0F), "AXPY applies scalar to A");
    check(near(difference.x, 0.5F) && near(difference.w, -8.0F), "Difference is A minus B");
}

void testDeterministicInputsAndOracle() {
    const lab::VectorInputs first = lab::makeVectorInputs(4096U, 123U);
    const lab::VectorInputs second = lab::makeVectorInputs(4096U, 123U);
    const lab::VectorInputs other = lab::makeVectorInputs(4096U, 124U);
    check(first.a.size() == 4096U && first.b.size() == 4096U, "input count is exact");
    check(first.a[777].z == second.a[777].z, "same seed reproduces input");
    check(first.a[777].z != other.a[777].z, "different seed changes input");
    const auto output = lab::computeCpu(first, lab::VectorOperation::axpy, 1.25F);
    const lab::Vec4 expected = lab::applyOperation(
        first.a[777],
        first.b[777],
        lab::VectorOperation::axpy,
        1.25F
    );
    check(near(output[777].z, expected.z), "CPU oracle uses the same element contract");
    check(std::isfinite(lab::checksum(output)), "CPU oracle checksum is finite");
}

void testDispatchTailAndCapabilities() {
    const lab::DispatchPlan plan = lab::makeDispatchPlan(1'000'003U, 256U);
    check(plan.workgroupCount == 3907U, "one million and three elements need 3907 groups");
    check(plan.launchedInvocations == 1'000'192U, "dispatch launches full workgroups");
    check(plan.unusedInvocations == 189U, "bounds guard rejects 189 tail invocations");
    check(lab::ceilDiv(0U, 256U) == 0U, "empty workload dispatches no group");
    check(lab::ceilDiv(1U, 256U) == 1U, "non-empty short workload dispatches one group");

    lab::ComputeLimits limits{};
    limits.majorVersion = 4;
    limits.minorVersion = 3;
    limits.maximumWorkgroupCount = {65535, 65535, 65535};
    limits.maximumWorkgroupSize = {1024, 1024, 64};
    limits.maximumInvocations = 1024;
    limits.maximumShaderStorageBlockBytes = 128LL * 1024LL * 1024LL;
    check(lab::validateCapabilities(limits, plan).allPassed(), "valid capability preset passes");
    limits.maximumInvocations = 128;
    check(!lab::validateCapabilities(limits, plan).allPassed(), "small invocation limit fails");
}

void testMixedToleranceAndNonFiniteGuard() {
    const lab::VectorInputs inputs = lab::makeVectorInputs(1024U, 77U);
    const auto expected = lab::computeCpu(inputs, lab::VectorOperation::add, 1.0F);
    auto actual = expected;
    actual[31].x += 1.0e-7F;
    check(lab::validateOutput(expected, actual).allPassed(), "tiny roundoff stays within tolerance");

    actual[31].x += 0.01F;
    const lab::OutputValidationReport wrong = lab::validateOutput(expected, actual);
    check(!wrong.allPassed(), "material error fails validation");
    check(wrong.firstMismatch == 31U, "validation records first mismatch index");
    check(wrong.maximumAbsoluteError > 0.009F, "validation records maximum error");

    actual = expected;
    actual[8].y = std::numeric_limits<float>::quiet_NaN();
    const lab::OutputValidationReport nonFinite = lab::validateOutput(expected, actual);
    check(!nonFinite.allFinite && !nonFinite.allPassed(), "NaN cannot pass tolerance");
}

void testMedian() {
    check(near(float(lab::medianMilliseconds({9.0, 1.0, 5.0})), 5.0F), "odd median is middle sample");
    check(near(float(lab::medianMilliseconds({8.0, 2.0, 4.0, 6.0})), 5.0F), "even median averages middle samples");
}

} // namespace

int main() {
    testLayoutAndOperations();
    testDeterministicInputsAndOracle();
    testDispatchTailAndCapabilities();
    testMixedToleranceAndNonFiniteGuard();
    testMedian();

    if (failures != 0) {
        std::cerr << failures << " Project 37 checks failed\n";
        return EXIT_FAILURE;
    }
    std::cout << "Project 37 validation passed\n";
    return EXIT_SUCCESS;
}
