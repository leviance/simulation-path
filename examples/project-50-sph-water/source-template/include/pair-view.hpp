#pragma once
#include "pair.hpp"
#include "view.hpp"
#include <iostream>

namespace water {
// Force arrows use a common display scale; printed values retain their actual magnitude.
#if LAB_CHECKPOINT >= 5
inline bool drawPair(SDL_Renderer* renderer, const PairReport& report) {
    if (!SDL_SetRenderDrawColor(renderer, 11, 16, 32, 255) || !SDL_RenderClear(renderer)) {
        return false;
    }
    double largest = 1;
    for (std::size_t i = 0; i < 2; ++i) {
        largest = std::max({largest, length(report.pressureForce[i]), length(report.viscosityForce[i])});
    }
    const double scale = 100 / largest;
    for (std::size_t i = 0; i < 2; ++i) {
        const double x = 300 + 200 * static_cast<double>(i);
        if (!SDL_SetRenderDrawColor(renderer, 100, 210, 255, 255) || !drawDisk(renderer, {x, 330}, 10)) {
            return false;
        }
        const auto pressure = report.pressureForce[i];
        const auto viscosity = report.viscosityForce[i];
        if (!SDL_SetRenderDrawColor(renderer, 100, 170, 255, 255) || !SDL_RenderLine(renderer, static_cast<float>(x), 290, static_cast<float>(x + scale * pressure.x), static_cast<float>(290 - scale * pressure.y))) {
            return false;
        }
        if (!SDL_SetRenderDrawColor(renderer, 255, 180, 70, 255) || !SDL_RenderLine(renderer, static_cast<float>(x), 370, static_cast<float>(x + scale * viscosity.x), static_cast<float>(370 - scale * viscosity.y))) {
            return false;
        }
    }
    return SDL_RenderPresent(renderer);
}

inline void printPair(const PairReport& report) {
    for (std::size_t i = 0; i < 2; ++i) {
        const auto& p = report.state.particles[i];
        std::cout << "Pair " << i << " rho=" << p.density << " p=" << p.pressure << " pressureForce=" << report.pressureForce[i].x << ',' << report.pressureForce[i].y << " viscosityForce=" << report.viscosityForce[i].x << ',' << report.viscosityForce[i].y << '\n';
    }
    std::cout << "grad=" << report.grad.x << ',' << report.grad.y << " Pi=" << report.pi << " netForce=" << report.netForce.x << ',' << report.netForce.y << " viscosityPower=" << report.viscosityPower << '\n';
}
#endif
} // namespace water
