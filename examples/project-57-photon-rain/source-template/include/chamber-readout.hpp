#pragma once
#include "chamber.hpp"
#include "statistics.hpp"

namespace photon {
#if LAB_CHECKPOINT >= 6
inline void eventMap(SDL_Renderer* r, float x, float y, const std::array<int, 48 * 32>& cells, int peak, SDL_Color color) {
    constexpr float pixel = 3;
    const SDL_Color empty{10, 24, 35, 255};
    panel(r, x, y, 48 * pixel, 32 * pixel, empty);
    if (peak == 0)
        return;
    // Batch cells by color instead of issuing thousands of individual draw calls.
    std::array<std::vector<SDL_FRect>, 16> levels;
    for (int iy = 0; iy < 32; ++iy) {
        for (int ix = 0; ix < 48; ++ix) {
            const int count = cells[ix + 48 * iy];
            if (count <= 0)
                continue;
            const int level = std::max(1, static_cast<int>(std::lround(15 * std::sqrt(static_cast<double>(count) / peak))));
            levels[level].push_back({x + pixel * ix, y + pixel * (31 - iy), pixel, pixel});
        }
    }
    for (int i = 1; i < static_cast<int>(levels.size()); ++i) {
        if (levels[i].empty())
            continue;
        ink(r, tone(empty, color, static_cast<double>(i) / 15));
        require(SDL_RenderFillRects(r, levels[i].data(), static_cast<int>(levels[i].size())));
    }
}

// [snippet detector-strip]
inline void instrumentReadout(SDL_Renderer* r, const Counts& counts) {
    const int peak = *std::max_element(counts.detectorBins.begin(), counts.detectorBins.end());
    int hits = 0;
    panel(r, 694, 153, 333, 48, {9, 24, 34, 255});
    for (int i = 0; i < 24; ++i) {
        const int count = counts.detectorBins[i];
        hits += count;
        if (count == 0)
            continue;
        const double relative = static_cast<double>(count) / peak;
        const float height = 45 * static_cast<float>(relative);
        const SDL_Color intensity = tone({43, 80, 84, 255}, teal, relative);
        panel(r, 612, 150 + 15 * (23 - i) + 1.f, 6, 13, intensity);
        panel(r, 695 + 13.8f * i, 200 - height, 11.8f, height, intensity);
    }
    label(r, 693, 206, "y=-1", muted);
    label(r, 983, 206, "y=+1", muted);
    label(r, 693, 223, std::to_string(hits) + " right-wall hits / peak bin " + std::to_string(peak), paper);
    const int mapPeak = std::max(*std::max_element(counts.absorptionMap.begin(), counts.absorptionMap.end()), *std::max_element(counts.scatterMap.begin(), counts.scatterMap.end()));
    label(r, 693, 255, "ABSORPTIONS / XY", coral);
    label(r, 872, 255, "SCATTERS / XY", teal);
    eventMap(r, 693, 270, counts.absorptionMap, mapPeak, coral);
    eventMap(r, 872, 270, counts.scatterMap, mapPeak, teal);
    label(r, 693, 374, "Shared sqrt scale / peak " + std::to_string(mapPeak) + " events", muted);
}

// [/snippet detector-strip]
#endif
} // namespace photon
