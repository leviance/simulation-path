#include "compute_benchmark.hpp"
#include "vector_compute_math.hpp"

#include <cmath>
#include <cstdlib>
#include <iostream>
#include <limits>
#include <string_view>

namespace {

int failures = 0;
int checks = 0;

// Test runner không dùng assert để các phép kiểm vẫn hoạt động trong Release build.
void check(bool condition, std::string_view label) {
    ++checks;
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
    limits.maximumStorageBindings = 8;
    limits.maximumComputeStorageBlocks = 8;
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

template <typename Operation>
bool rejects(Operation operation) {
    try {
        operation();
        return false;
    } catch (const std::exception&) {
        return true;
    }
}

void testInvalidInputs() {
    const auto mismatched = [] {
        lab::VectorInputs inputs{{lab::Vec4{}}, {}};
        (void)lab::computeCpu(inputs, lab::VectorOperation::add, 1.0F);
    };
    check(rejects(mismatched), "mismatched A/B is rejected, never silently truncated");
    const auto tooLarge = [] {
        (void)lab::makeVectorInputs(std::numeric_limits<std::size_t>::max());
    };
    check(rejects(tooLarge), "over-budget N is rejected before allocation");
    const auto zeroLocal = [] {
        (void)lab::makeDispatchPlan(257U, 0U);
    };
    check(rejects(zeroLocal), "zero local size cannot underflow unused invocation count");
    const auto overflowingGroups = [] {
        (void)lab::ceilDiv(std::numeric_limits<std::size_t>::max(), 1U);
    };
    check(rejects(overflowingGroups), "oversized group count cannot silently narrow to GLuint");
    const auto unknownOperation = [] {
        (void)lab::computeCpu({}, static_cast<lab::VectorOperation>(99), 1.0F);
    };
    check(rejects(unknownOperation), "unknown operation is rejected even for empty arrays");
    const auto nanScalar = [] {
        (void)lab::computeCpu({}, lab::VectorOperation::axpy, std::numeric_limits<float>::quiet_NaN());
    };
    check(rejects(nanScalar), "non-finite scalar is rejected even for empty arrays");
}

void testIndependentAnswersAndEveryChannel() {
    const lab::VectorInputs inputs{{{0.0F, -2.0F, 3.0F, -4.0F}}, {{0.0F, 1.5F, -2.0F, 4.0F}}};
    const std::array<lab::VectorOperation, 3> operations{lab::VectorOperation::add, lab::VectorOperation::axpy, lab::VectorOperation::difference};
    const std::array<lab::Vec4, 3> answers{{{0.0F, -0.5F, 1.0F, 0.0F}, {0.0F, -2.5F, 4.0F, -4.0F}, {0.0F, -3.5F, 5.0F, -8.0F}}};
    for (std::size_t index = 0; index < operations.size(); ++index) {
        const auto actual = lab::computeCpu(inputs, operations[index], 2.0F);
        check(lab::validateOutput({answers[index]}, actual).allPassed(), "independent fixture checks zero, negatives and all four components");
        for (std::size_t component = 0; component < 4; ++component) {
            auto corrupt = actual;
            const std::array<float*, 4> channels{&corrupt[0].x, &corrupt[0].y, &corrupt[0].z, &corrupt[0].w};
            *channels[component] += 0.1F;
            const auto report = lab::validateOutput(actual, corrupt);
            check(!report.allPassed() && report.firstMismatchComponent == component, "validator catches corruption in each individual component");
        }
    }
    const std::vector<lab::Vec4> expected{{}};
    const float nan = std::numeric_limits<float>::quiet_NaN();
    check(!lab::validateOutput(expected, expected, nan, 0.0F).allPassed(), "NaN tolerance cannot approve incorrect data");
    check(!lab::validateOutput(expected, expected, 0.0F, -1.0F).allPassed(), "negative tolerance is rejected");
    check(!lab::validateOutput(expected, {}, 0.0F, 0.0F).allPassed(), "missing output is not a successful empty comparison");
    check(!lab::validateOutput(expected, {{0.0F, 0.0F, std::numeric_limits<float>::infinity(), 0.0F}}).allPassed(), "Infinity is not accepted as roundoff");
}

void testBenchmarkStatisticsAndIdentity() {
    const auto spread = lab::summarizeSamples({9.0, 1.0, 5.0});
    check(spread.minimum == 1.0 && spread.median == 5.0 && spread.maximum == 9.0, "spread preserves min/median/max");
    const auto emptySamples = [] {
        (void)lab::summarizeSamples({});
    };
    check(rejects(emptySamples), "missing samples cannot produce a successful timing row");
    const auto invalidSample = [] {
        (void)lab::summarizeSamples({1.0, std::numeric_limits<double>::quiet_NaN()});
    };
    check(rejects(invalidSample), "NaN timing is rejected");
    lab::WorkloadConfig frozen{};
    frozen.elementCount = 1'000'003U;
    lab::WorkloadConfig selected = frozen;
    selected.operation = lab::VectorOperation::difference;
    check(frozen.operation == lab::VectorOperation::add && frozen != selected, "job configuration is a value snapshot, not a mutable UI reference");
}

} // namespace

int main() {
    testLayoutAndOperations();
    testDeterministicInputsAndOracle();
    testDispatchTailAndCapabilities();
    testMixedToleranceAndNonFiniteGuard();
    testMedian();
    testInvalidInputs();
    testIndependentAnswersAndEveryChannel();
    testBenchmarkStatisticsAndIdentity();

    if (failures != 0) {
        std::cerr << failures << " Project 37 checks failed\n";
        return EXIT_FAILURE;
    }
    std::cout << "Project 37 CPU: " << checks << " checks, 0 failures\n";
    return EXIT_SUCCESS;
}
