import type { Grid, Level } from "./model.ts";
import { removeMean } from "./field.ts";
export function smooth(level: Level, reverse: boolean) {
  const n = level.n;
  for (let pass = 0; pass < 2; pass++) {
    const color = reverse ? 1 - pass : pass;
    for (let y = 0; y < n; y++)
      for (let x = (y + color) % 2; x < n; x += 2) {
        const i = y * n + x;
        let sum = 0;
        let count = 0;
        if (x > 0) {
          sum += level.value[i - 1];
          count++;
        }
        if (x + 1 < n) {
          sum += level.value[i + 1];
          count++;
        }
        if (y > 0) {
          sum += level.value[i - n];
          count++;
        }
        if (y + 1 < n) {
          sum += level.value[i + n];
          count++;
        }
        level.value[i] = (level.rhs[i] + sum) / count;
      }
  }
}
export function levelResidual(level: Level) {
  const n = level.n;
  for (let y = 0; y < n; y++)
    for (let x = 0; x < n; x++) {
      const i = y * n + x;
      let sum = 0;
      let count = 0;
      if (x > 0) {
        sum += level.value[i - 1];
        count++;
      }
      if (x + 1 < n) {
        sum += level.value[i + 1];
        count++;
      }
      if (y > 0) {
        sum += level.value[i - n];
        count++;
      }
      if (y + 1 < n) {
        sum += level.value[i + n];
        count++;
      }
      level.residual[i] = level.rhs[i] - (count * level.value[i] - sum);
    }
}
export function vCycle(levels: Level[], index = 0) {
  const fine = levels[index];
  if (index + 1 === levels.length) {
    for (let i = 0; i < 8; i++) smooth(fine, false);
    for (let i = 0; i < 8; i++) smooth(fine, true);
    removeMean(fine.value);
    return;
  }
  smooth(fine, false);
  levelResidual(fine);
  const coarse = levels[index + 1];
  coarse.value.fill(0);
  for (let y = 0; y < coarse.n; y++)
    for (let x = 0; x < coarse.n; x++) {
      const i = 2 * y * fine.n + 2 * x;
      coarse.rhs[y * coarse.n + x] =
        0.5 *
        (fine.residual[i] +
          fine.residual[i + 1] +
          fine.residual[i + fine.n] +
          fine.residual[i + fine.n + 1]);
    }
  removeMean(coarse.rhs);
  vCycle(levels, index + 1);
  for (let y = 0; y < fine.n; y++)
    for (let x = 0; x < fine.n; x++)
      fine.value[y * fine.n + x] += coarse.value[Math.floor(y / 2) * coarse.n + Math.floor(x / 2)];
  smooth(fine, true);
  removeMean(fine.value);
}
export function precondition(grid: Grid) {
  const fine = grid.hierarchy[0];
  fine.rhs.set(grid.residualWork);
  removeMean(fine.rhs);
  fine.value.fill(0);
  vCycle(grid.hierarchy);
  grid.preconditioned.set(fine.value);
}
