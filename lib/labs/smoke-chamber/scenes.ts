import { amber, cyan, fixedDt, makeGrid, type Scene } from "./model.ts";
import { divergence, enforceWalls } from "./field.ts";
export function makeScene(n = 128, scene: Scene = "jets", stage = 15) {
  const grid = makeGrid(n);
  for (let y = 0; y < n; y++)
    for (let x = 0; x < n; x++) {
      const px = (x + 0.5) * grid.h;
      const py = (y + 0.5) * grid.h;
      let left = Math.exp(-((px - 0.34) ** 2 / 0.002 + (py - 0.18) ** 2 / 0.009));
      let right = Math.exp(-((px - 0.66) ** 2 / 0.002 + (py - 0.18) ** 2 / 0.009));
      if (scene === "empty" || scene === "jacobi") {
        left = 0;
        right = 0;
      }
      if (scene === "vortex") {
        left = Math.exp(-((px - 0.3) ** 2 + (py - 0.5) ** 2) / 0.003);
        right = Math.exp(-((px - 0.7) ** 2 + (py - 0.5) ** 2) / 0.003);
      }
      const i = y * n + x;
      grid.density[i] = left + right;
      if (stage >= 8) {
        grid.pigment[0][i] = left * cyan.r + right * amber.r;
        grid.pigment[1][i] = left * cyan.g + right * amber.g;
        grid.pigment[2][i] = left * cyan.b + right * amber.b;
      }
    }
  if (stage >= 4 && scene === "compression") {
    for (let y = 0; y < n; y++)
      for (let x = 0; x <= n; x++)
        grid.u[y * (n + 1) + x] = 0.3 * Math.sin(2 * Math.PI * x * grid.h);
    for (let y = 0; y <= n; y++)
      for (let x = 0; x < n; x++) grid.v[y * n + x] = 0.3 * Math.sin(2 * Math.PI * y * grid.h);
  }
  if (stage >= 4 && scene === "vortex") {
    const psi = (x: number, y: number) =>
      0.1 * Math.sin(Math.PI * x * grid.h) ** 2 * Math.sin(Math.PI * y * grid.h) ** 2;
    for (let y = 0; y < n; y++)
      for (let x = 0; x <= n; x++) grid.u[y * (n + 1) + x] = (psi(x, y + 1) - psi(x, y)) / grid.h;
    for (let y = 0; y <= n; y++)
      for (let x = 0; x < n; x++) grid.v[y * n + x] = -(psi(x + 1, y) - psi(x, y)) / grid.h;
  }
  if (stage >= 5 && scene === "jacobi")
    grid.u[(n / 2 - 1) * (n + 1) + n / 2] = -grid.h * fixedDt * 64;
  enforceWalls(grid);
  divergence(grid);
  return grid;
}
