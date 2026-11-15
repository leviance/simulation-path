#pragma once

#if LAB_CHECKPOINT >= 9
#include "reference.hpp"
#include <array>
#include <ostream>

namespace heat {

// Fixture hữu hạn riêng, không reset hoặc đo lén field đang quan sát.
inline bool validatePlate(std::ostream& output) {
    Settings settings;
    settings.diffusivity = 0.5;
    settings.dx = 1;
    settings.dy = 1;
    settings.dt = 0.2;
    bool passed = true;
    Field constant(16, 16);
    std::fill(constant.current.begin(), constant.current.end(), 0.4);
    for (int step = 0; step < 20; ++step) {
        passed = diffuse(constant, settings).advanced && passed;
    }
    double constantError = 0;
    for (double value : constant.current) {
        constantError = std::max(constantError, std::abs(value - 0.4));
    }
    passed = constantError <= 1e-14 && passed;

    Field impulse(17, 17);
    impulse.current[impulse.index(8, 8)] = 1;
    const double initialIntegral = measure(impulse, settings).integral;
    for (int step = 0; step < 40; ++step) {
        passed = diffuse(impulse, settings).advanced && passed;
    }
    const Stats stats = measure(impulse, settings);
    const double integralError = std::abs(stats.integral - initialIntegral);
    double symmetryError = 0;
    for (int y = 0; y < impulse.height; ++y) {
        for (int x = 0; x < impulse.width; ++x) {
            symmetryError = std::max(symmetryError, std::abs(sample(impulse, x, y) - sample(impulse, 16 - x, y)));
        }
    }
    passed = stats.finite && stats.minimum >= -1e-14 && stats.maximum <= 1 + 1e-14 && integralError <= 1e-10 && symmetryError <= 1e-12 && passed;
    output << "FIXTURES constant_error=" << constantError << " integral_error=" << integralError << " symmetry_error=" << symmetryError << '\n';

    Field cosine = cosineField(17, 13, 3, 2);
    settings.dx = 0.7;
    settings.dy = 0.9;
    settings.dt = 0.03;
    const double amplification = discreteAmplification(settings, 17, 13, 3, 2);
    for (int step = 0; step < 40; ++step) {
        passed = diffuse(cosine, settings).advanced && passed;
    }
    const double schemeError = maximumCosineError(cosine, 0.25 * std::pow(amplification, 40), 3, 2);
    passed = std::isfinite(schemeError) && schemeError <= 2e-13 && passed;
    output << "SCHEME cosine_max_error=" << schemeError << " theta (limit 2e-13)\n";

    std::array<double, 3> errors{};
    int row = 0;
    for (int size : {16, 32, 64}) {
        settings.dx = 16.0 / size;
        settings.dy = settings.dx;
        settings.dt = 0.2 * settings.dx * settings.dx / settings.diffusivity;
        const int steps = static_cast<int>(std::lround(0.4 / settings.dt));
        Field field = cosineField(size, size, 1, 1);
        for (int step = 0; step < steps; ++step) {
            passed = diffuse(field, settings).advanced && passed;
        }
        const double error = maximumCosineError(field, continuousAmplitude(settings, size, size, 1, 1, 0.4), 1, 1);
        errors[static_cast<std::size_t>(row++)] = error;
        output << "REFINEMENT N=" << size << " h=" << settings.dx << " dt=" << settings.dt << " t=" << field.time << " max_error=" << error << '\n';
        passed = std::isfinite(error) && std::abs(field.time - 0.4) <= 1e-14 && passed;
    }
    passed = errors[1] < errors[0] / 3 && errors[2] < errors[1] / 3 && passed;
    output << "CPU SMALL-FIXTURE VALIDATION ";
    if (passed) {
        output << "PASS\n";
    } else {
        output << "FAIL\n";
    }
    return passed;
}

} // namespace heat
#endif
