import { width, height, spacing, type State } from "./model.ts";
export class WaterSurface {
  readonly w = 720;
  readonly hh = 432;
  coverage = new Float32Array(this.w * this.hh);
  rgba = new Uint8ClampedArray(this.w * this.hh * 4);
  drawn = 0;
  reconstruct(state: State) {
    this.coverage.fill(0);
    this.drawn = 0;
    const scale = this.w / width,
      pixels = 1.65 * spacing * scale,
      weight = 4 / (Math.PI * 1.65 * 1.65);
    for (const p of state.particles) {
      const cx = p.x * scale,
        cy = (height - p.y) * scale;
      const left = Math.max(0, Math.floor(cx - pixels)),
        right = Math.min(this.w - 1, Math.ceil(cx + pixels)),
        top = Math.max(0, Math.floor(cy - pixels)),
        bottom = Math.min(this.hh - 1, Math.ceil(cy + pixels));
      for (let y = top; y <= bottom; y++)
        for (let x = left; x <= right; x++) {
          const dx = (x + 0.5 - cx) / pixels,
            dy = (y + 0.5 - cy) / pixels,
            q2 = dx * dx + dy * dy;
          if (q2 < 1) {
            const t = 1 - q2;
            this.coverage[y * this.w + x] += weight * t * t * t;
          }
        }
      this.drawn++;
    }
  }
  shade() {
    const { w, hh, coverage, rgba } = this;
    for (let y = 0; y < hh; y++)
      for (let x = 0; x < w; x++) {
        const i = y * w + x,
          phi = coverage[i];
        const dx = coverage[y * w + Math.min(x + 1, w - 1)] - coverage[y * w + Math.max(x - 1, 0)],
          dy = coverage[Math.min(y + 1, hh - 1) * w + x] - coverage[Math.max(y - 1, 0) * w + x];
        const normal = Math.max(0, (0.35 * dx + 0.94 * dy) / Math.max(1e-9, Math.hypot(dx, dy))),
          edge = Math.exp(-70 * (phi - 0.65) * (phi - 0.65)) * (0.25 + 0.75 * normal),
          alpha = Math.max(0, Math.min(1, (phi - 0.3) * 5)),
          elevation = 1 - y / hh;
        let grid = 0;
        if (x % 36 === 0 || y % 36 === 0) grid = 4;
        rgba[4 * i] = (9 + grid) * (1 - alpha) + (14 + 12 * elevation + 128 * edge) * alpha;
        rgba[4 * i + 1] = (18 + grid) * (1 - alpha) + (102 + 40 * elevation + 105 * edge) * alpha;
        rgba[4 * i + 2] = (31 + grid) * (1 - alpha) + (190 + 25 * elevation + 38 * edge) * alpha;
        rgba[4 * i + 3] = 255;
      }
  }
}
