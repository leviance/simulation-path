import { waterCameraFrame, type WaterCamera } from "./lens.ts";
import type { WaterDepth } from "./water-depth.ts";

const absorption = [0.45, 0.12, 0.06];
const scatter = [0.015, 0.08, 0.12];
const environmentLow = [0.35, 0.4, 0.45];
const environmentHigh = [1.5, 1.7, 1.9];
const windowColor = [4, 4, 3.8];
const linear = Float64Array.from({ length: 256 }, (_, i) => (i / 255) ** 2.2);
const encoded = Uint8ClampedArray.from({ length: 4096 }, (_, i) => 255 * (i / 4095) ** (1 / 2.2));
function smoothstep(low: number, high: number, value: number) {
  const t = Math.max(0, Math.min(1, (value - low) / (high - low)));
  return t * t * (3 - 2 * t);
}
// These screen-space optics affect display only, never SPH forces or density.
export function shadeWater(surface: WaterDepth, camera: WaterCamera) {
  const { width: w, height: h, depth, thickness, rays, background: bg, rgba } = surface;
  const b = waterCameraFrame(camera, h);
  rgba.set(bg);
  for (let y = 1; y < h - 1; y++)
    for (let x = 1; x < w - 1; x++) {
      const i = x + y * w,
        z = depth[i];
      if (z === 0) continue;
      const il = i - 1,
        ir = i + 1,
        it = i - w,
        ib = i + w;
      let xa = il,
        xb = ir,
        ya = it,
        yb = ib;
      if (depth[il] === 0 || Math.abs(z - depth[ir]) < Math.abs(z - depth[il])) xa = i;
      if (depth[ir] === 0 || Math.abs(z - depth[il]) < Math.abs(z - depth[ir])) xb = i;
      if (depth[it] === 0 || Math.abs(z - depth[ib]) < Math.abs(z - depth[it])) ya = i;
      if (depth[ib] === 0 || Math.abs(z - depth[it]) < Math.abs(z - depth[ib])) yb = i;
      if (xa === xb || ya === yb) continue;
      const dx0 = rays[3 * xb] * depth[xb] - rays[3 * xa] * depth[xa];
      const dx1 = rays[3 * xb + 1] * depth[xb] - rays[3 * xa + 1] * depth[xa];
      const dx2 = rays[3 * xb + 2] * depth[xb] - rays[3 * xa + 2] * depth[xa];
      const dy0 = rays[3 * yb] * depth[yb] - rays[3 * ya] * depth[ya];
      const dy1 = rays[3 * yb + 1] * depth[yb] - rays[3 * ya + 1] * depth[ya];
      const dy2 = rays[3 * yb + 2] * depth[yb] - rays[3 * ya + 2] * depth[ya];
      let nx = dx1 * dy2 - dx2 * dy1,
        ny = dx2 * dy0 - dx0 * dy2,
        nz = dx0 * dy1 - dx1 * dy0;
      const nl = Math.hypot(nx, ny, nz);
      if (nl < 1e-12) continue;
      nx /= nl;
      ny /= nl;
      nz /= nl;
      const invViewLength = 1 / Math.hypot(rays[3 * i], rays[3 * i + 1], rays[3 * i + 2]);
      const vx = -rays[3 * i] * invViewLength,
        vy = -rays[3 * i + 1] * invViewLength,
        vz = -rays[3 * i + 2] * invViewLength;
      if (nx * vx + ny * vy + nz * vz < 0) {
        nx = -nx;
        ny = -ny;
        nz = -nz;
      }
      const cosine = Math.max(0, nx * vx + ny * vy + nz * vz);
      const fresnel = 0.0204 + 0.9796 * (1 - cosine) ** 5;
      const rx = -vx + 2 * cosine * nx;
      const ry = -vy + 2 * cosine * ny;
      const rz = -vz + 2 * cosine * nz;
      const sky = smoothstep(-0.15, 0.85, ry);
      const windowLight =
        0.92 * Math.exp(-12 * (rx + 0.45) ** 2 - 18 * (rz + 0.6) ** 2) * smoothstep(0.1, 0.65, ry);
      const nsx = nx * b.right[0] + ny * b.right[1] + nz * b.right[2];
      const nsy = nx * b.up[0] + ny * b.up[1] + nz * b.up[2];
      const opticalDepth = Math.max(0, thickness[i]);
      const xx = Math.max(
        0,
        Math.min(w - 1, Math.round(x - (nsx * opticalDepth * b.focal * 0.32) / z)),
      );
      const yy = Math.max(
        0,
        Math.min(h - 1, Math.round(y + (nsy * opticalDepth * b.focal * 0.32) / z)),
      );
      const refracted = 4 * (xx + yy * w);
      const hx = vx - 0.36,
        hy = vy + 0.85,
        hz = vz + 0.38,
        hl = Math.hypot(hx, hy, hz);
      const specular = Math.max(0, (nx * hx + ny * hy + nz * hz) / hl) ** 128;
      const coverage = 1 - Math.exp(-65 * thickness[i]);
      for (let channel = 0; channel < 3; channel++) {
        const transmission = Math.exp(-absorption[channel] * opticalDepth);
        const skyColor =
          environmentLow[channel] + sky * (environmentHigh[channel] - environmentLow[channel]);
        const reflection = skyColor * (1 - windowLight) + windowColor[channel] * windowLight;
        const transmitted =
          linear[bg[refracted + channel]] * transmission + scatter[channel] * (1 - transmission);
        const water = (1 - fresnel) * transmitted + fresnel * reflection + 0.045 * specular;
        const color = linear[bg[4 * i + channel]] * (1 - coverage) + water * coverage;
        rgba[4 * i + channel] = encoded[Math.max(0, Math.min(4095, Math.round(color * 4095)))];
      }
    }
  return rgba;
}
