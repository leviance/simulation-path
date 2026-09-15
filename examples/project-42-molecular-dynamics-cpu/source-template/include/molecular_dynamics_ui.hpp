#pragma once

#include "framebuffer.hpp"
#include "molecular_dynamics.hpp"

#include <algorithm>
#include <cmath>
#include <cstdint>
#include <cstdio>
#include <iostream>
#include <vector>

namespace md_ui {

constexpr std::uint32_t kBackground = 0x0b1020ffU;
constexpr std::uint32_t kPanel = 0x111827ffU;
constexpr std::uint32_t kGrid = 0x3e4451ffU;
constexpr std::uint32_t kCold = 0x61afefffU;
constexpr std::uint32_t kHot = 0xe06c75ffU;
constexpr std::uint32_t kSelected = 0xffffffffU;
constexpr std::uint32_t kPotential = 0xc678ddffU;
constexpr std::uint32_t kKinetic = 0xe5c07bffU;
constexpr std::uint32_t kTotal = 0x98c379ffU;

#if LAB_CHECKPOINT >= 1
struct WorldView {
    int left{};
    int top{};
    int right{};
    int bottom{};
};

inline WorldView makeWorldView(int width, int height, bool reservePanel) {
    int right = width - 26;
    if (reservePanel) {
        right = std::max(420, int(std::lround(double(width) * 0.62)));
    }
    int bottom = height - 30;
#if LAB_CHECKPOINT >= 6
    // Để trống phần dưới hộp cho bảng số liệu, không vẽ đè lên các hạt.
    bottom = std::max(120, height - 230);
#endif
    return {28, 34, right, bottom};
}

inline md::Vec2 worldToScreen(
    md::Vec2 point,
    const md::SimulationBox& box,
    const WorldView& view
) {
    const double viewWidth = double(view.right - view.left);
    const double viewHeight = double(view.bottom - view.top);
    return {
        double(view.left) + point.x / box.width * viewWidth,
        double(view.top) + point.y / box.height * viewHeight,
    };
}

inline std::uint32_t speedColor(double speed) {
    const double blend = std::clamp(speed / 2.5, 0.0, 1.0);
    const std::uint32_t red = std::uint32_t(std::lround(97.0 + 127.0 * blend));
    const std::uint32_t green = 175U;
    const std::uint32_t blue = std::uint32_t(std::lround(239.0 - 100.0 * blend));
    return (red << 24U) | (green << 16U) | (blue << 8U) | 0xffU;
}

inline void drawSystem(
    std::vector<std::uint32_t>& pixels,
    int width,
    int height,
    const md::MolecularSystem& system,
    const WorldView& view,
    std::size_t selectedIndex,
    bool drawVelocities
) {
    framebuffer::drawRectangle(
        pixels,
        width,
        height,
        view.left,
        view.top,
        view.right,
        view.bottom,
        kGrid
    );
    int radius = 3;
    if (system.particles.size() >= 512U) {
        radius = 2;
    }
    for (std::size_t index = 0; index < system.particles.size(); ++index) {
        const md::Particle& particle = system.particles[index];
        const md::Vec2 screen = worldToScreen(particle.position, system.box, view);
        std::uint32_t color = speedColor(md::length(particle.velocity));
        if (index == selectedIndex) {
            color = kSelected;
        }
        framebuffer::fillCircle(
            pixels,
            width,
            height,
            int(std::lround(screen.x)),
            int(std::lround(screen.y)),
            radius,
            color
        );
#if LAB_CHECKPOINT >= 2
        if (drawVelocities && index < 96U) {
            framebuffer::drawArrow(
                pixels,
                width,
                height,
                int(std::lround(screen.x)),
                int(std::lround(screen.y)),
                int(std::lround(screen.x + particle.velocity.x * 7.0)),
                int(std::lround(screen.y + particle.velocity.y * 7.0)),
                kKinetic
            );
        }
#else
        static_cast<void>(drawVelocities);
#endif
    }
}
#endif

#if LAB_CHECKPOINT >= 3
inline int graphY(
    double value,
    double minimum,
    double maximum,
    int top,
    int bottom
) {
    const double ratio = (value - minimum) / (maximum - minimum);
    return bottom - int(std::lround(ratio * double(bottom - top)));
}

inline void drawCutoffGraph(
    std::vector<std::uint32_t>& pixels,
    int width,
    int height,
    const md::MolecularParameters& parameters
) {
    const int left = int(std::lround(double(width) * 0.66));
    const int right = width - 28;
    const int top = 42;
    const int bottom = int(std::lround(double(height) * 0.42));
    framebuffer::drawRectangle(pixels, width, height, left, top, right, bottom, kGrid);
    const double minimumDistance = 0.9 * parameters.sigma;
    const double maximumDistance = 1.08 * parameters.cutoff;
    const double minimumValue = -2.0 * parameters.epsilon;
    const double maximumValue = 3.0 * parameters.epsilon;
    const int zeroY = graphY(0.0, minimumValue, maximumValue, top, bottom);
    framebuffer::drawLine(pixels, width, height, left, zeroY, right, zeroY, kGrid);

    bool previousValid = false;
    int previousX = 0;
    int previousPotentialY = 0;
    int previousSlopeY = 0;
    for (int x = left + 1; x < right; ++x) {
        const double fraction = double(x - left) / double(right - left);
        const double distance = minimumDistance + fraction * (maximumDistance - minimumDistance);
        const md::PairSample sample = md::sampleForceShiftedPair(distance, parameters);
        if (!sample.valid) {
            previousValid = false;
            continue;
        }
        const double clippedPotential = std::clamp(
            sample.potential,
            minimumValue,
            maximumValue
        );
        const double clippedSlope = std::clamp(
            sample.potentialSlope,
            minimumValue,
            maximumValue
        );
        const int potentialY = graphY(
            clippedPotential,
            minimumValue,
            maximumValue,
            top,
            bottom
        );
        const int slopeY = graphY(clippedSlope, minimumValue, maximumValue, top, bottom);
        if (previousValid) {
            framebuffer::drawLine(
                pixels,
                width,
                height,
                previousX,
                previousPotentialY,
                x,
                potentialY,
                kPotential
            );
            framebuffer::drawLine(
                pixels,
                width,
                height,
                previousX,
                previousSlopeY,
                x,
                slopeY,
                0x56b6c2ffU
            );
        }
        previousValid = true;
        previousX = x;
        previousPotentialY = potentialY;
        previousSlopeY = slopeY;
    }

    const double cutoffFraction =
        (parameters.cutoff - minimumDistance) / (maximumDistance - minimumDistance);
    const int cutoffX = left + int(std::lround(cutoffFraction * double(right - left)));
    framebuffer::drawLine(pixels, width, height, cutoffX, top, cutoffX, bottom, kKinetic);
}
#endif

#if LAB_CHECKPOINT >= 6
struct HistorySample {
    double elapsed{};
    double kinetic{};
    double potential{};
    double total{};
    double temperature{};
};

inline void appendHistory(
    std::vector<HistorySample>& history,
    const md::MolecularSystem& system,
    const md::SystemMetrics& metrics,
    std::size_t limit = 180U
) {
    history.push_back({
        system.elapsed,
        metrics.kinetic,
        metrics.potential,
        metrics.totalEnergy,
        metrics.temperature,
    });
    if (history.size() > limit) {
        history.erase(history.begin(), history.begin() + std::ptrdiff_t(history.size() - limit));
    }
}

inline void drawEnergyHistory(
    std::vector<std::uint32_t>& pixels,
    int width,
    int height,
    const std::vector<HistorySample>& history
) {
    const int left = int(std::lround(double(width) * 0.66));
    const int right = width - 28;
    const int top = int(std::lround(double(height) * 0.49));
    const int bottom = height - 34;
    framebuffer::drawRectangle(pixels, width, height, left, top, right, bottom, kGrid);
    if (history.size() < 2U) {
        return;
    }

    double minimum = std::numeric_limits<double>::infinity();
    double maximum = -std::numeric_limits<double>::infinity();
    for (const HistorySample& sample : history) {
        minimum = std::min({minimum, sample.kinetic, sample.potential, sample.total});
        maximum = std::max({maximum, sample.kinetic, sample.potential, sample.total});
    }
    if (maximum - minimum < 1.0e-12) {
        maximum = minimum + 1.0;
    }

    // Khoảng lấy mẫu khi nhấn N khác lúc chạy liên tục; trục X phải dùng thời gian thật của mẫu.
    const double timeSpan = std::max(1.0e-12, history.back().elapsed - history.front().elapsed);
    const auto drawField = [&](auto field, std::uint32_t color) {
        for (std::size_t index = 1; index < history.size(); ++index) {
            const double firstRatio = (history[index - 1U].elapsed - history.front().elapsed) / timeSpan;
            const double secondRatio = (history[index].elapsed - history.front().elapsed) / timeSpan;
            const int x0 = left + int(std::lround(firstRatio * double(right - left)));
            const int x1 = left + int(std::lround(secondRatio * double(right - left)));
            const int y0 = graphY(history[index - 1U].*field, minimum, maximum, top, bottom);
            const int y1 = graphY(history[index].*field, minimum, maximum, top, bottom);
            framebuffer::drawLine(pixels, width, height, x0, y0, x1, y1, color);
        }
    };
    drawField(&HistorySample::potential, kPotential);
    drawField(&HistorySample::kinetic, kKinetic);
    drawField(&HistorySample::total, kTotal);
}
#endif

#if LAB_CHECKPOINT >= 7
inline void drawScalingBars(
    std::vector<std::uint32_t>& pixels,
    int width,
    int height
) {
    const int left = int(std::lround(double(width) * 0.66));
    const int right = width - 28;
    const int top = int(std::lround(double(height) * 0.49));
    const int bottom = height - 34;
    framebuffer::drawRectangle(pixels, width, height, left, top, right, bottom, kGrid);
    constexpr std::array<std::size_t, 4> counts{64U, 144U, 256U, 1000U};
    const double maximumPairs = double(md::unorderedPairCount(1000U));
    for (std::size_t index = 0; index < counts.size(); ++index) {
        const double ratio = double(md::unorderedPairCount(counts[index])) / maximumPairs;
        const int y = top + 24 + int(index) * std::max(18, (bottom - top - 32) / 4);
        const int barRight = left + int(std::lround(ratio * double(right - left - 8)));
        for (int row = 0; row < 10; ++row) {
            framebuffer::drawLine(pixels, width, height, left + 4, y + row, barRight, y + row, kCold);
        }
    }
}
#endif

#if LAB_CHECKPOINT >= 8
enum class ValidationState {
    notRun,
    passed,
    failed,
};

inline const char* validationLabel(ValidationState state) {
    if (state == ValidationState::passed) {
        return "PASS";
    }
    if (state == ValidationState::failed) {
        return "FAIL";
    }
    return "NOT RUN";
}

inline void printValidationReport(const md::ValidationReport& report) {
    std::cout << "Project 42 reference-model validation (not the selected experiment)\n";
    const auto print = [](const char* label, bool passed) {
        const char* state = "FAIL";
        if (passed) {
            state = "PASS";
        }
        std::cout << "  [" << state << "] " << label << '\n';
    };
    print("deterministic initialization", report.deterministicInitialization);
    print("particles inside box", report.particlesInsideBox);
    print("center-of-mass momentum removed", report.momentumRemoved);
    print("exact unordered pair count", report.exactPairCount);
    print("internal force sum", report.forceSumZero);
    print("force-shifted cutoff", report.cutoffContinuous);
    print("reflective boundary", report.wallReflection);
    print("finite bounded run", report.finiteRun);
    print("energy drift", report.energyStable);
    std::cout << "  max energy drift=" << 100.0 * report.maximumEnergyDrift << "%\n"
                << "  wall events=" << report.wallEvents
                << ", max wall energy drift=" << 100.0 * report.wallEnergyDrift << "%\n";
}
#endif

} // namespace md_ui
