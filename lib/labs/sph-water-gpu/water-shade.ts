import { waterCameraFrame, type WaterCamera } from "./lens.ts";
import type { WaterDepth } from "./water-depth.ts";

const absorption = [4.5, 1.45, 0.55];
const scatter = [9, 148, 199];
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
      const sky = Math.max(0, Math.min(1, 0.5 + 0.5 * (-vy + 2 * cosine * ny)));
      const nsx = nx * b.right[0] + ny * b.right[1] + nz * b.right[2];
      const nsy = nx * b.up[0] + ny * b.up[1] + nz * b.up[2];
      const opticalDepth = Math.max(0.012, thickness[i]);
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
      const specular = Math.max(0, (nx * hx + ny * hy + nz * hz) / hl) ** 100;
      const diffuse = 0.45 + 0.55 * Math.max(0, -0.36 * nx + 0.85 * ny + 0.38 * nz);
      const coverage = 1 - Math.exp(-65 * thickness[i]);
      for (let channel = 0; channel < 3; channel++) {
        const transmission = Math.exp(-absorption[channel] * opticalDepth);
        let reflection = 77 + 158 * sky;
        if (channel === 1) reflection = 125 + 125 * sky;
        if (channel === 2) reflection = 166 + 89 * sky;
        const transmitted =
          bg[refracted + channel] * transmission + scatter[channel] * (1 - transmission) * diffuse;
        const water = (1 - fresnel) * transmitted + fresnel * reflection + 89 * specular;
        rgba[4 * i + channel] =
          bg[4 * i + channel] * (1 - coverage) + Math.min(255, water) * coverage;
      }
    }
  return rgba;
}
