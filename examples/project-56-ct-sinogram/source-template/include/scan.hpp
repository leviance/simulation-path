#pragma once
#include "projection.hpp"

namespace ct {
#if LAB_CHECKPOINT >= 5
inline double viewAngle(int row, int views) {
    if ((views != 30 && views != 60 && views != 120) || row < 0 || row >= views) {
        throw std::invalid_argument("Invalid view index");
    }
    return 2 * pi * row / views;
}

struct Scan {
    Settings settings;
    Scene scene;
    std::vector<double> values;
    int acquired = 0;
};

// NaN denotes an unmeasured cell; zero is a valid air measurement.
inline Scan makeScan(Settings settings) {
    validate(settings);
    const int count = detectorCount * settings.views;
    return {settings, makeScene(settings.preset), std::vector<double>(count, std::numeric_limits<double>::quiet_NaN()), 0};
}

inline bool acquireOne(Scan& scan) {
    if (scan.acquired >= scan.settings.views) {
        return false;
    }
    const double angle = viewAngle(scan.acquired, scan.settings.views);
    const auto row = project(angle, scan.scene, scan.settings.strength);
    for (int column = 0; column < detectorCount; ++column) {
        const int index = column + detectorCount * scan.acquired;
        scan.values[index] = row[column].projection;
    }
    ++scan.acquired;
    return true;
}

#if LAB_CHECKPOINT >= 6
// Never catch up an unbounded number of views after a slow frame.
inline int advance(Scan& scan, int budget) {
    if (budget < 0 || budget > 2) {
        throw std::invalid_argument("At most two views per frame");
    }
    int completed = 0;
    while (completed < budget && acquireOne(scan)) {
        ++completed;
    }
    return completed;
}
#endif

#if LAB_CHECKPOINT >= 8
// Compare matched physical angles, not equal row indices of different grids.
inline double samplingAngle(int coarseRow) {
    return viewAngle(coarseRow * 4, 120) - viewAngle(coarseRow, 30);
}
#endif
#endif
} // namespace ct
