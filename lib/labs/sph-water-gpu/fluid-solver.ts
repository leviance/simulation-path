import { rho0, tank, validateParameters, type FluidParameters, type FluidState } from "./state.ts";
import { FluidGrid } from "./csr.ts";
import { WallNeighborhood } from "./walls.ts";
import { spline3, splineGradientFactor } from "./spline.ts";

export class FluidSolver {
  readonly grid: FluidGrid;
  readonly walls = new WallNeighborhood();
  constructor(state: FluidState) {
    this.grid = new FluidGrid(state);
  }
  evaluate(state: FluidState, parameters: FluidParameters) {
    validateParameters(parameters);
    const {
      count,
      position: p,
      velocity: v,
      density: rho,
      pressure: pressure,
      acceleration: acc,
      h,
      mass,
    } = state;
    for (let k = 0; k < p.length; k++)
      if (!Number.isFinite(p[k]) || !Number.isFinite(v[k]))
        throw new Error("Nonfinite state; simulation paused");
    this.grid.build(state);
    state.compression = 0;
    state.maxSpeed = 0;
    state.maxAcceleration = 0;
    for (let i = 0; i < count; i++) {
      let density = 0;
      const fluidCount = this.grid.collect(state, i);
      for (let k = 0; k < fluidCount; k++) {
        const j = this.grid.neighbors[k];
        const dx = p[3 * i] - p[3 * j],
          dy = p[3 * i + 1] - p[3 * j + 1],
          dz = p[3 * i + 2] - p[3 * j + 2];
        density += mass * spline3(Math.sqrt(dx * dx + dy * dy + dz * dz), h);
      }
      const wallCount = this.walls.collect(state, i);
      for (let k = 0; k < wallCount; k++) {
        const dx = p[3 * i] - this.walls.positions[3 * k],
          dy = p[3 * i + 1] - this.walls.positions[3 * k + 1],
          dz = p[3 * i + 2] - this.walls.positions[3 * k + 2];
        density += mass * spline3(Math.sqrt(dx * dx + dy * dy + dz * dz), h);
      }
      if (!Number.isFinite(density) || density <= 0) throw new Error("Invalid summation density");
      rho[i] = density;
      pressure[i] = Math.max(0, parameters.soundSpeed ** 2 * (density - rho0));
      state.compression = Math.max(state.compression, density / rho0 - 1);
      state.maxSpeed = Math.max(state.maxSpeed, Math.hypot(v[3 * i], v[3 * i + 1], v[3 * i + 2]));
    }
    for (let i = 0; i < count; i++) {
      let ax = 0,
        ay = -parameters.gravity,
        az = 0;
      const x = p[3 * i],
        y = p[3 * i + 1],
        z = p[3 * i + 2],
        vx = v[3 * i],
        vy = v[3 * i + 1],
        vz = v[3 * i + 2];
      const fluidCount = this.grid.collect(state, i),
        wallCount = this.walls.collect(state, i);
      for (let k = 0; k < fluidCount + wallCount; k++) {
        let xj = 0,
          yj = 0,
          zj = 0,
          vjx = 0,
          vjy = 0,
          vjz = 0,
          rj = rho0,
          pj = pressure[i];
        if (k < fluidCount) {
          const j = this.grid.neighbors[k];
          if (j === i) continue;
          xj = p[3 * j];
          yj = p[3 * j + 1];
          zj = p[3 * j + 2];
          vjx = v[3 * j];
          vjy = v[3 * j + 1];
          vjz = v[3 * j + 2];
          rj = rho[j];
          pj = pressure[j];
        } else {
          const j = k - fluidCount,
            wp = this.walls.positions,
            wv = this.walls.velocities;
          xj = wp[3 * j];
          yj = wp[3 * j + 1];
          zj = wp[3 * j + 2];
          vjx = wv[3 * j];
          vjy = wv[3 * j + 1];
          vjz = wv[3 * j + 2];
        }
        const dx = x - xj,
          dy = y - yj,
          dz = z - zj,
          r2 = dx * dx + dy * dy + dz * dz;
        if (r2 < 1e-24 || r2 >= 4 * h * h) continue;
        const approach = (vx - vjx) * dx + (vy - vjy) * dy + (vz - vjz) * dz;
        let viscosity = 0;
        if (approach < 0)
          viscosity =
            (-parameters.alpha * parameters.soundSpeed * h * approach) /
            ((r2 + 0.01 * h * h) * 0.5 * (rho[i] + rj));
        const coefficient =
          -mass *
          (pressure[i] / (rho[i] * rho[i]) + pj / (rj * rj) + viscosity) *
          splineGradientFactor(Math.sqrt(r2), h);
        ax += coefficient * dx;
        ay += coefficient * dy;
        az += coefficient * dz;
      }
      acc[3 * i] = ax;
      acc[3 * i + 1] = ay;
      acc[3 * i + 2] = az;
      state.maxAcceleration = Math.max(state.maxAcceleration, Math.hypot(ax, ay, az));
    }
  }
  step(state: FluidState, parameters: FluidParameters) {
    const paddle = state.paddle;
    if (paddle.enabled) {
      const dx = paddle.target[0] - paddle.position[0],
        dy = paddle.target[1] - paddle.position[1],
        dz = paddle.target[2] - paddle.position[2];
      const distance = Math.hypot(dx, dy, dz),
        scale = Math.min(1, distance / 0.00075) / Math.max(1e-12, distance);
      paddle.velocity = [dx * scale, dy * scale, dz * scale];
    }
    this.evaluate(state, parameters);
    const dt = Math.min(
      0.00075,
      (0.25 * state.h) / (parameters.soundSpeed + state.maxSpeed + 1),
      0.25 * Math.sqrt(state.h / Math.max(1e-12, state.maxAcceleration)),
    );
    if (!Number.isFinite(dt) || dt < 1e-7)
      throw new Error("Timestep below safety limit; simulation paused");
    if (paddle.enabled) {
      for (let a = 0; a < 3; a++) paddle.position[a] += paddle.velocity[a] * dt;
    }
    const p = state.position,
      v = state.velocity,
      a = state.acceleration,
      margin = state.spacing / 2;
    state.leakage = 0;
    for (let i = 0; i < state.count; i++) {
      for (let axis = 0; axis < 3; axis++) {
        const k = 3 * i + axis;
        v[k] += a[k] * dt;
        p[k] += v[k] * dt;
        if (p[k] < margin) {
          p[k] = margin;
          if (v[k] < 0) v[k] *= -0.1;
        }
        if (p[k] > tank[axis] - margin) {
          p[k] = tank[axis] - margin;
          if (v[k] > 0) v[k] *= -0.1;
        }
      }
      if (paddle.enabled) {
        const dx = p[3 * i] - paddle.position[0],
          dy = p[3 * i + 1] - paddle.position[1],
          dz = p[3 * i + 2] - paddle.position[2];
        const distance = Math.hypot(dx, dy, dz),
          radius = paddle.radius + margin;
        if (distance < radius) {
          const n = [
            dx / Math.max(distance, 1e-12),
            dy / Math.max(distance, 1e-12),
            dz / Math.max(distance, 1e-12),
          ];
          if (distance < 1e-12) n[1] = 1;
          let normalSpeed = 0;
          for (let axis = 0; axis < 3; axis++) {
            p[3 * i + axis] = paddle.position[axis] + n[axis] * radius;
            normalSpeed += (v[3 * i + axis] - paddle.velocity[axis]) * n[axis];
          }
          if (normalSpeed < 0)
            for (let axis = 0; axis < 3; axis++) v[3 * i + axis] -= 1.1 * normalSpeed * n[axis];
        }
      }
      for (let axis = 0; axis < 3; axis++) {
        const k = 3 * i + axis;
        if (!Number.isFinite(p[k]) || !Number.isFinite(v[k]))
          throw new Error("Phát hiện NaN/Inf; mô phỏng đã dừng");
        if (p[k] < 0 || p[k] > tank[axis]) state.leakage++;
      }
    }
    if (state.leakage !== 0) throw new Error("Hạt thoát khỏi bể; mô phỏng đã dừng");
    state.time += dt;
    state.ticks++;
    state.dt = dt;
    state.updated = state.count;
    return dt;
  }
}
