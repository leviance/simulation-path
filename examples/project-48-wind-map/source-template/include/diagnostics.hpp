#pragma once
#include "scenes.hpp"

namespace wind {
#if LAB_CHECKPOINT >= 6
struct GradientError {
    double interior = 0;
    double boundary = 0;
};

inline GradientError gradientError(const Field& field, Potential potential) {
    GradientError report;
    for (int y = 0; y < field.height; ++y) {
        for (int x = 0; x < field.width; ++x) {
            const auto i = field.index(x, y);
            const Vec2 exact = exactGradient(world(field, x, y), potential);
            const double error = std::hypot(field.vx[i] - exact.x, field.vy[i] - exact.y);
            if (x == 0 || y == 0 || x == field.width - 1 || y == field.height - 1) {
                report.boundary = std::max(report.boundary, error);
            } else {
                report.interior = std::max(report.interior, error);
            }
        }
    }
    return report;
}
#endif

#if LAB_CHECKPOINT >= 9
struct ValidationReport {
    double derivativeError = 0;
    double gradientCurl = 0;
    GradientError coarse;
    GradientError refined;
    bool passed = false;
};

inline ValidationReport validateMap() {
    // Kiểm trên field riêng; không sửa thí nghiệm đang chạy của người học.
    ValidationReport report;
    Field field;
    const Preset presets[] = {Preset::Uniform, Preset::Source, Preset::Sink, Preset::Rotation, Preset::Shear};
    const double expectedDiv[] = {0, 2, -2, 0, 0};
    const double expectedCurl[] = {0, 0, 0, 2, -1};
    for (int fixture = 0; fixture < 5; ++fixture) {
        Scene scene;
        scene.preset = presets[fixture];
        populate(field, scene);
        for (int y = 0; y < field.height; ++y) {
            for (int x = 0; x < field.width; ++x) {
                report.derivativeError = std::max(report.derivativeError, std::abs(divergence(field, x, y) - expectedDiv[fixture]));
                report.derivativeError = std::max(report.derivativeError, std::abs(curl(field, x, y) - expectedCurl[fixture]));
            }
        }
    }
    Scene scene;
    scene.preset = Preset::Gradient;
    scene.potential = Potential::Hill;
    populate(field, scene);
    for (int y = 0; y < field.height; ++y) {
        for (int x = 0; x < field.width; ++x) {
            report.gradientCurl = std::max(report.gradientCurl, std::abs(curl(field, x, y)));
        }
    }
    report.coarse = gradientError(field, scene.potential);
    Field fine(65, 49);
    populate(fine, scene);
    report.refined = gradientError(fine, scene.potential);
    report.passed = report.derivativeError < 1e-10 && report.gradientCurl < 1e-10 && report.refined.interior < report.coarse.interior / 3 && report.refined.boundary < report.coarse.boundary / 3;
    return report;
}
#endif
} // namespace wind
