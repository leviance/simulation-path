#pragma once

#ifndef LAB_CHECKPOINT
#define LAB_CHECKPOINT 7
#endif

#include "framebuffer.hpp"
#include "lennard_jones.hpp"

#include <algorithm>
#include <cmath>
#include <cstdint>
#include <iostream>
#include <vector>

namespace lj_ui {

#if LAB_CHECKPOINT >= 3

namespace detail {

constexpr std::uint32_t kGrid = 0x26344fffU;
constexpr std::uint32_t kText = 0xd7deecffU;
constexpr std::uint32_t kTotal = 0x98c379ffU;
constexpr std::uint32_t kForce = 0x56b6c2ffU;

struct GraphRect {
    int left{};
    int top{};
    int right{};
    int bottom{};
};

inline int graphX(double ratio, double minimumRatio, double maximumRatio, const GraphRect& graph) {
    const double t = (ratio - minimumRatio) / (maximumRatio - minimumRatio);
    return graph.left + int(std::lround(t * double(graph.right - graph.left)));
}

inline int graphY(double value, double minimumValue, double maximumValue, const GraphRect& graph) {
    const double t = (value - minimumValue) / (maximumValue - minimumValue);
    return graph.bottom - int(std::lround(t * double(graph.bottom - graph.top)));
}

} // namespace detail

// Vẽ dU/dr để người học nhìn thấy trực tiếp nơi lực đổi chiều.
inline void drawPotentialSlopeGraph(
    std::vector<std::uint32_t>& pixels,
    int width,
    int height,
    const lj::PairState& state,
    const lj::LennardJonesParameters& parameters
) {
    const detail::GraphRect graph{
        int(std::lround(double(width) * 0.61)),
        int(std::lround(double(height) * 0.33)),
        width - 34,
        int(std::lround(double(height) * 0.48)),
    };

    framebuffer::drawRectangle(
        pixels,
        width,
        height,
        graph.left,
        graph.top,
        graph.right,
        graph.bottom,
        detail::kGrid
    );

    constexpr double minimumRatio = 0.78;
    constexpr double maximumRatio = 2.60;
    const double slopeScale = parameters.epsilon / parameters.sigma;
    const double minimumSlope = -6.0 * slopeScale;
    const double maximumSlope = 3.0 * slopeScale;
    const int zeroY = detail::graphY(0.0, minimumSlope, maximumSlope, graph);

    framebuffer::drawLine(
        pixels,
        width,
        height,
        graph.left,
        zeroY,
        graph.right,
        zeroY,
        detail::kGrid
    );

    const double equilibriumRatio = std::pow(2.0, 1.0 / 6.0);
    const int equilibriumX = detail::graphX(
        equilibriumRatio,
        minimumRatio,
        maximumRatio,
        graph
    );
    framebuffer::drawLine(
        pixels,
        width,
        height,
        equilibriumX,
        graph.top,
        equilibriumX,
        graph.bottom,
        detail::kTotal
    );

    bool hasPrevious = false;
    int previousX = 0;
    int previousY = 0;
    for (int pixelX = graph.left; pixelX <= graph.right; ++pixelX) {
        const double t = double(pixelX - graph.left) / double(graph.right - graph.left);
        const double ratio = minimumRatio + t * (maximumRatio - minimumRatio);
        const lj::PairInteraction interaction = lj::evaluatePair(
            lj::makeSymmetricPair(ratio * parameters.sigma, state.atomA.mass),
            parameters
        );
        if (!interaction.valid) {
            hasPrevious = false;
            continue;
        }

        const double clipped = std::clamp(
            interaction.potentialSlope,
            minimumSlope,
            maximumSlope
        );
        const int pixelY = detail::graphY(clipped, minimumSlope, maximumSlope, graph);
        if (hasPrevious) {
            framebuffer::drawLine(
                pixels,
                width,
                height,
                previousX,
                previousY,
                pixelX,
                pixelY,
                detail::kForce
            );
        }

        hasPrevious = true;
        previousX = pixelX;
        previousY = pixelY;
    }

    const lj::PairInteraction current = lj::evaluatePair(state, parameters);
    const double currentRatio = current.distance / parameters.sigma;
    if (current.valid && currentRatio >= minimumRatio && currentRatio <= maximumRatio) {
        const int markerX = detail::graphX(currentRatio, minimumRatio, maximumRatio, graph);
        const int markerY = detail::graphY(
            std::clamp(current.potentialSlope, minimumSlope, maximumSlope),
            minimumSlope,
            maximumSlope,
            graph
        );
        framebuffer::fillCircle(pixels, width, height, markerX, markerY, 5, detail::kText);
    }
}

#endif

#if LAB_CHECKPOINT >= 7

enum class ValidationState {
    notRun,
    passed,
    failed,
};

inline const char* validationStatusText(
    ValidationState state,
    const lj::ValidationReport& report
) {
    if (state == ValidationState::notRun) {
        return "not validated";
    }
    if (state == ValidationState::passed) {
        return "VALID";
    }
    if (!report.landmarks) {
        return "INVALID: landmarks";
    }
    if (!report.forceDirections) {
        return "INVALID: force directions";
    }
    if (!report.newtonThirdLaw) {
        return "INVALID: Newton III";
    }
    if (!report.finiteRun) {
        return "INVALID: finite run";
    }
    if (!report.momentumConserved) {
        return "INVALID: momentum";
    }
    if (!report.centerOfMassStable) {
        return "INVALID: center of mass";
    }
    return "INVALID: energy";
}

inline void printValidationReport(const lj::ValidationReport& report) {
    const auto status = [](bool passed) {
        if (passed) {
            return "PASS";
        }
        return "FAIL";
    };
    std::cout << "Validation report\n"
                << "  landmarks: " << status(report.landmarks) << '\n'
                << "  force directions: " << status(report.forceDirections) << '\n'
                << "  Newton III: " << status(report.newtonThirdLaw) << '\n'
                << "  finite run: " << status(report.finiteRun) << '\n'
                << "  momentum: " << status(report.momentumConserved) << '\n'
                << "  center of mass: " << status(report.centerOfMassStable) << '\n'
                << "  energy: " << status(report.energyStable) << '\n';
}

#endif

} // namespace lj_ui
