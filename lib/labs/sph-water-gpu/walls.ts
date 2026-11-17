import { tank, type FluidState } from "./state.ts";

export class WallNeighborhood {
  readonly positions = new Float64Array(3 * 343);
  readonly velocities = new Float64Array(3 * 343);
  collect(state: FluidState, i: number) {
    const p = state.position,
      s = state.spacing,
      h2 = 4 * state.h * state.h;
    const x = p[3 * i],
      y = p[3 * i + 1],
      z = p[3 * i + 2];
    const paddle = state.paddle;
    const nearSphere =
      paddle.enabled &&
      Math.hypot(x - paddle.position[0], y - paddle.position[1], z - paddle.position[2]) <
        paddle.radius + 2 * state.h;
    if (
      !nearSphere &&
      x >= 2 * state.h &&
      x <= tank[0] - 2 * state.h &&
      y >= 2 * state.h &&
      y <= tank[1] - 2 * state.h &&
      z >= 2 * state.h &&
      z <= tank[2] - 2 * state.h
    )
      return 0;
    const side = Math.round(0.55 / s),
      nx = 3 * side,
      ny = 1.5 * side,
      nz = 2 * side;
    const cx = Math.floor(x / s),
      cy = Math.floor(y / s),
      cz = Math.floor(z / s);
    let count = 0;
    for (let zz = cz - 3; zz <= cz + 3; zz++)
      for (let yy = cy - 3; yy <= cy + 3; yy++)
        for (let xx = cx - 3; xx <= cx + 3; xx++) {
          const bx = (xx + 0.5) * s,
            by = (yy + 0.5) * s,
            bz = (zz + 0.5) * s;
          const outside = xx < 0 || xx >= nx || yy < 0 || yy >= ny || zz < 0 || zz >= nz;
          const insideSphere =
            paddle.enabled &&
            (bx - paddle.position[0]) ** 2 +
              (by - paddle.position[1]) ** 2 +
              (bz - paddle.position[2]) ** 2 <
              paddle.radius ** 2;
          if (!outside && !insideSphere) continue;
          const dx = x - bx,
            dy = y - by,
            dz = z - bz;
          if (dx * dx + dy * dy + dz * dz >= h2) continue;
          this.positions[3 * count] = bx;
          this.positions[3 * count + 1] = by;
          this.positions[3 * count + 2] = bz;
          for (let a = 0; a < 3; a++)
            this.velocities[3 * count + a] = insideSphere && !outside ? paddle.velocity[a] : 0;
          count++;
        }
    return count;
  }
}
