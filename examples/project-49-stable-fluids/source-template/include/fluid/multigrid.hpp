#pragma once
#include "poisson.hpp"

namespace fluid {
#if LAB_CHECKPOINT >= 14
// [snippet multigrid-smooth]
inline void smooth(MultigridLevel& level, bool reverse) {
    const int n = level.n;
    for (int pass = 0; pass < 2; ++pass) {
        int color = pass;
        if (reverse) {
            color = 1 - pass;
        }
        for (int y = 0; y < n; ++y) {
            for (int x = (y + color) % 2; x < n; x += 2) {
                const int i = y * n + x;
                double sum = 0;
                int count = 0;
                if (x > 0) {
                    sum += level.value[i - 1];
                    ++count;
                }
                if (x + 1 < n) {
                    sum += level.value[i + 1];
                    ++count;
                }
                if (y > 0) {
                    sum += level.value[i - n];
                    ++count;
                }
                if (y + 1 < n) {
                    sum += level.value[i + n];
                    ++count;
                }
                level.value[i] = (level.rhs[i] + sum) / count;
            }
        }
    }
}

// [/snippet multigrid-smooth]

inline void levelResidual(MultigridLevel& level) {
    const int n = level.n;
    for (int y = 0; y < n; ++y) {
        for (int x = 0; x < n; ++x) {
            const int i = y * n + x;
            double sum = 0;
            int count = 0;
            if (x > 0) {
                sum += level.value[i - 1];
                ++count;
            }
            if (x + 1 < n) {
                sum += level.value[i + 1];
                ++count;
            }
            if (y > 0) {
                sum += level.value[i - n];
                ++count;
            }
            if (y + 1 < n) {
                sum += level.value[i + n];
                ++count;
            }
            level.residual[i] = level.rhs[i] - (count * level.value[i] - sum);
        }
    }
}

// [snippet multigrid-cycle]
inline void vCycle(std::vector<MultigridLevel>& levels, std::size_t index) {
    auto& fine = levels[index];
    if (index + 1 == levels.size()) {
        for (int i = 0; i < 8; ++i) {
            smooth(fine, false);
        }
        for (int i = 0; i < 8; ++i) {
            smooth(fine, true);
        }
        removeMean(fine.value);
        return;
    }
    smooth(fine, false);
    levelResidual(fine);
    auto& coarse = levels[index + 1];
    std::fill(coarse.value.begin(), coarse.value.end(), 0);
    for (int y = 0; y < coarse.n; ++y) {
        for (int x = 0; x < coarse.n; ++x) {
            const int i = 2 * y * fine.n + 2 * x;
            // P chép một giá trị vào 2×2 ô. R=0.5 P^T để R B P vẫn là stencil B.
            coarse.rhs[y * coarse.n + x] = 0.5 * (fine.residual[i] + fine.residual[i + 1] + fine.residual[i + fine.n] + fine.residual[i + fine.n + 1]);
        }
    }
    removeMean(coarse.rhs);
    vCycle(levels, index + 1);
    for (int y = 0; y < fine.n; ++y) {
        for (int x = 0; x < fine.n; ++x) {
            fine.value[y * fine.n + x] += coarse.value[(y / 2) * coarse.n + x / 2];
        }
    }
    // Đảo thứ tự màu ở hậu làm mượt để preconditioner đối xứng.
    smooth(fine, true);
    removeMean(fine.value);
}

// [/snippet multigrid-cycle]

// [snippet precondition]
inline void precondition(Grid& grid) {
    auto& fine = grid.hierarchy.front();
    fine.rhs = grid.residualWork;
    removeMean(fine.rhs);
    std::fill(fine.value.begin(), fine.value.end(), 0);
    vCycle(grid.hierarchy, 0);
    grid.preconditioned = fine.value;
}

// [/snippet precondition]
#endif
} // namespace fluid
