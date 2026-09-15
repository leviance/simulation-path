#include "particle_math.hpp"

#include <cmath>
#include <cstddef>
#include <cstdlib>
#include <iostream>
#include <limits>
#include <string>
#include <string_view>
#include <vector>

namespace {

int failures = 0;

void check(bool condition, std::string_view label) {
    if (!condition) {
        std::cerr << "FAIL: " << label << '\n';
        ++failures;
    }
}

bool near(float left, float right, float tolerance = 1.0e-5F) {
    return std::abs(left - right) <= tolerance;
}

} // namespace

int main() {
    // CPU và GLSL phải cùng nhìn thấy hai vec4 liên tiếp trong mỗi Particle.
    check(sizeof(lab::Particle) == 32U, "Particle occupies 32 bytes");
    check(alignof(lab::Particle) == 16U, "Particle begins at a 16-byte boundary");
    check(offsetof(lab::Particle, velocityLife) == 16U, "velocityLife begins at byte 16");

    // Deterministic initialization giúp reset, shader probe và bug report tái lập được.
    const lab::Particle first = lab::makeInitialParticle(3817U, lab::kParticleSeed);
    const lab::Particle repeated = lab::makeInitialParticle(3817U, lab::kParticleSeed);
    const lab::Particle different = lab::makeInitialParticle(3818U, lab::kParticleSeed);
    check(near(first.positionAge.x, repeated.positionAge.x), "same index and seed repeat x");
    check(near(first.velocityLife.w, repeated.velocityLife.w), "same index and seed repeat life");
    check(!near(first.velocityLife.x, different.velocityLife.x), "different index changes velocity");

    // Năm triệu không chia hết cho 256: bounds guard phải loại đúng 192 lane cuối.
    const lab::DispatchPlan fiveMillion = lab::makeDispatchPlan(5'000'000U, 256U);
    check(fiveMillion.workgroupCount == 19'532U, "five million uses 19,532 groups");
    check(fiveMillion.launchedInvocations == 5'000'192U, "dispatch launches 5,000,192 lanes");
    check(fiveMillion.unusedInvocations == 192U, "bounds guard rejects 192 tail invocations");
    check(lab::particleStorageBytes(5'000'000U) == 160'000'000U, "five million need 160 MB");

    // Capability selection xảy ra trước allocation và chọn preset nhỏ hơn khi SSBO thiếu chỗ.
    const std::vector<std::size_t> presets = {100'000U, 500'000U, 1'000'000U, 5'000'000U};
    lab::ComputeLimits largeGpu{};
    largeGpu.majorVersion = 4;
    largeGpu.minorVersion = 6;
    largeGpu.maximumWorkgroupCountX = 65'535;
    largeGpu.maximumWorkgroupSizeX = 1024;
    largeGpu.maximumInvocations = 1024;
    largeGpu.maximumShaderStorageBlockBytes = 256LL * 1024LL * 1024LL;
    check(
        lab::chooseLargestSupportedCount(largeGpu, presets) == 5'000'000U,
        "large SSBO accepts five million"
    );
    lab::ComputeLimits limitedGpu = largeGpu;
    limitedGpu.maximumShaderStorageBlockBytes = 64LL * 1024LL * 1024LL;
    check(
        lab::chooseLargestSupportedCount(limitedGpu, presets) == 1'000'000U,
        "64 MiB SSBO falls back to one million"
    );

    // Semi-implicit Euler cập nhật velocity trước rồi mới dùng velocity mới cho position.
    lab::Particle moving{};
    moving.positionAge = {1.0F, 2.0F, 0.0F, 0.25F};
    moving.velocityLife = {3.0F, 10.0F, 0.0F, 4.0F};
    const lab::Particle stepped = lab::stepParticleCpu(moving, 7U, 0.1F, -10.0F, 1U);
    check(near(stepped.velocityLife.y, 9.0F), "gravity updates velocity first");
    check(near(stepped.positionAge.x, 1.3F), "x uses velocity times dt");
    check(near(stepped.positionAge.y, 2.9F), "y uses the updated velocity");
    check(near(stepped.positionAge.w, 0.35F), "age advances by dt");

    // Hết lifetime tạo một spawn state mới có age zero và lifetime dương.
    lab::Particle expired = moving;
    expired.positionAge.w = expired.velocityLife.w;
    const lab::Particle respawned = lab::stepParticleCpu(expired, 7U, 0.01F, -10.0F, 19U);
    check(near(respawned.positionAge.w, 0.0F), "expired particle respawns at age zero");
    check(respawned.velocityLife.w > 0.0F, "respawned particle has positive lifetime");
    check(respawned.velocityLife.y > 0.0F, "respawned particle points upward");

    // Frame-time control không biến pause hoặc frame spike thành bước nhảy lớn.
    check(near(lab::selectSimulationDt(1.0F, false, false), lab::kMaximumFrameDt), "dt is clamped");
    check(near(lab::selectSimulationDt(0.01F, true, false), 0.0F), "pause produces no step");
    check(
        near(lab::selectSimulationDt(1.0F, true, true), lab::kSingleStepDt),
        "single-step overrides pause with a fixed dt"
    );

    // Validation phải bắt sai số lớn và NaN thay vì chỉ so vài particle bằng mắt.
    std::vector<lab::Particle> expected = {stepped};
    std::vector<lab::Particle> actual = expected;
    check(lab::validateParticles(expected, actual).passed(), "matching probe passes");
    actual[0].positionAge.x += 0.1F;
    check(!lab::validateParticles(expected, actual).passed(), "large error fails probe");
    actual = expected;
    actual[0].velocityLife.y = std::numeric_limits<float>::quiet_NaN();
    const lab::ParticleValidationReport nanReport = lab::validateParticles(expected, actual);
    check(!nanReport.allFinite, "NaN is reported as non-finite");

    // Median có kết quả hữu hạn, không phụ thuộc thứ tự query samples đến CPU.
    check(
        std::abs(lab::medianMilliseconds({9.0, 1.0, 5.0, 3.0}) - 4.0) < 1.0e-12,
        "median sorts four timing samples"
    );

    if (failures != 0) {
        std::cerr << failures << " Project 38 checks failed\n";
        return EXIT_FAILURE;
    }
    std::cout << "Project 38 validation passed\n";
    return EXIT_SUCCESS;
}
