import { waterCameraFrame, type WaterCamera } from "./lens.ts";
import { tank, type FluidState } from "./state.ts";
import { reconstructWaterSurface } from "./water-surface.ts";

export class WaterDepth {
  readonly depth: Float32Array;
  readonly thickness: Float32Array;
  readonly opaque: Float32Array;
  readonly entry: Float32Array;
  readonly exit: Float32Array;
  readonly rays: Float32Array;
  readonly background: Uint8ClampedArray;
  readonly scratch: Float32Array;
  readonly scratchThickness: Float32Array;
  readonly rgba: Uint8ClampedArray;
  submitted = 0;
  readonly width: number;
  readonly height: number;
  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
    if (
      !Number.isInteger(width) ||
      !Number.isInteger(height) ||
      width < 80 ||
      width > 800 ||
      height < 80 ||
      height > 700
    )
      throw new RangeError("Bounded Canvas render size required");
    const pixels = width * height;
    this.depth = new Float32Array(pixels);
    this.thickness = new Float32Array(pixels);
    this.opaque = new Float32Array(pixels);
    this.entry = new Float32Array(pixels);
    this.exit = new Float32Array(pixels);
    this.rays = new Float32Array(pixels * 3);
    this.background = new Uint8ClampedArray(pixels * 4);
    this.rgba = new Uint8ClampedArray(pixels * 4);
    this.scratch = new Float32Array(pixels);
    this.scratchThickness = new Float32Array(pixels);
  }
  scene(state: FluidState, camera: WaterCamera, dark: boolean) {
    const { width: w, height: h, background: bg, opaque, rays } = this;
    const b = waterCameraFrame(camera, h);
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++) {
        const index = x + y * w,
          sx = (x + 0.5 - w / 2) / b.focal,
          sy = (h / 2 - y - 0.5) / b.focal;
        const dx = b.forward[0] + sx * b.right[0] + sy * b.up[0],
          dy = b.forward[1] + sx * b.right[1] + sy * b.up[1],
          dz = b.forward[2] + sx * b.right[2] + sy * b.up[2];
        rays[3 * index] = dx;
        rays[3 * index + 1] = dy;
        rays[3 * index + 2] = dz;
        let entry = 0,
          exit = Infinity;
        const direction = [dx, dy, dz];
        for (let axis = 0; axis < 3; axis++) {
          const a = -b.eye[axis] / direction[axis],
            c = (tank[axis] - b.eye[axis]) / direction[axis];
          entry = Math.max(entry, Math.min(a, c));
          exit = Math.min(exit, Math.max(a, c));
        }
        this.entry[index] = entry;
        this.exit[index] = exit;
        let red = 235 - (14 * y) / h,
          green = 243 - (12 * y) / h,
          blue = 247 - (7 * y) / h;
        if (dark) {
          red = 8 + (8 * y) / h;
          green = 19 + (10 * y) / h;
          blue = 30 + (12 * y) / h;
        }
        let nearest = Infinity;
        const t = -b.eye[1] / dy;
        if (t > 0 && Number.isFinite(t)) {
          const px = b.eye[0] + t * dx,
            pz = b.eye[2] + t * dz;
          if (px >= -0.012 && px <= tank[0] + 0.012 && pz >= -0.012 && pz <= tank[2] + 0.012) {
            nearest = t;
            const edge = px < 0 || px > tank[0] || pz < 0 || pz > tank[2];
            const distance =
              0.11 *
              Math.min(
                Math.abs(px / 0.11 - Math.round(px / 0.11)),
                Math.abs(pz / 0.11 - Math.round(pz / 0.11)),
              );
            const footprint = (0.6 * t) / b.focal / Math.max(0.25, Math.abs(dy));
            const line = Math.max(0, 1 - distance / footprint);
            const shadow = 14 * Math.exp(-((px - 0.5) ** 2 / 0.3 + (pz - 0.55) ** 2 / 0.22));
            red = 212 - shadow;
            green = 224 - shadow;
            blue = 231 - shadow;
            if (dark) {
              red = 21 - shadow * 0.3;
              green = 39 - shadow * 0.3;
              blue = 53 - shadow * 0.2;
            }
            red += line * (dark ? 16 : -19);
            green += line * (dark ? 19 : -20);
            blue += line * (dark ? 20 : -20);
            if (edge) {
              red = 71;
              green = 102;
              blue = 119;
            }
          }
        }
        const paddle = state.paddle;
        if (paddle.enabled) {
          const cx = paddle.position[0] - b.eye[0],
            cy = paddle.position[1] - b.eye[1],
            cz = paddle.position[2] - b.eye[2];
          const a = dx * dx + dy * dy + dz * dz,
            projection = dx * cx + dy * cy + dz * cz;
          const disc =
            projection * projection - a * (cx * cx + cy * cy + cz * cz - paddle.radius ** 2);
          if (disc > 0) {
            const hit = (projection - Math.sqrt(disc)) / a;
            if (hit > 0 && hit < nearest) {
              nearest = hit;
              const nx = (hit * dx - cx) / paddle.radius,
                ny = (hit * dy - cy) / paddle.radius,
                nz = (hit * dz - cz) / paddle.radius;
              const light = 0.35 + 0.65 * Math.max(0, -0.4 * nx + 0.8 * ny + 0.35 * nz);
              red = 171 * light;
              green = 183 * light;
              blue = 194 * light;
            }
          }
        }
        opaque[index] = nearest;
        bg[4 * index] = red;
        bg[4 * index + 1] = green;
        bg[4 * index + 2] = blue;
        bg[4 * index + 3] = 255;
      }
  }
  particles(state: FluidState, camera: WaterCamera) {
    const { width: w, height: h, depth, thickness, opaque } = this;
    const b = waterCameraFrame(camera, h),
      radius = 1.15 * state.spacing;
    const volumeWeight = state.spacing ** 3 / ((4 * Math.PI * radius ** 3) / 3);
    depth.fill(0);
    thickness.fill(0);
    this.submitted = state.count;
    for (let i = 0; i < state.count; i++) {
      const px = state.position[3 * i] - b.eye[0],
        py = state.position[3 * i + 1] - b.eye[1],
        pz = state.position[3 * i + 2] - b.eye[2];
      const cx = px * b.right[0] + py * b.right[1] + pz * b.right[2],
        cy = px * b.up[0] + py * b.up[1] + pz * b.up[2],
        cz = px * b.forward[0] + py * b.forward[1] + pz * b.forward[2];
      if (cz <= radius + 0.02) continue;
      const centerX = w / 2 + (b.focal * cx) / cz,
        centerY = h / 2 - (b.focal * cy) / cz,
        rp = (b.focal * radius) / (cz - radius);
      const x0 = Math.max(0, Math.floor(centerX - rp)),
        x1 = Math.min(w - 1, Math.ceil(centerX + rp));
      const y0 = Math.max(0, Math.floor(centerY - rp)),
        y1 = Math.min(h - 1, Math.ceil(centerY + rp));
      const c = cx * cx + cy * cy + cz * cz - radius * radius;
      for (let y = y0; y <= y1; y++)
        for (let x = x0; x <= x1; x++) {
          const sx = (x + 0.5 - w / 2) / b.focal,
            sy = (h / 2 - y - 0.5) / b.focal;
          const a = 1 + sx * sx + sy * sy,
            projection = sx * cx + sy * cy + cz,
            disc = projection * projection - a * c;
          if (disc <= 0) continue;
          const root = Math.sqrt(disc),
            index = x + y * w;
          const front = Math.max(0.02, (projection - root) / a, this.entry[index]);
          const back = Math.min((projection + root) / a, this.exit[index], opaque[index]);
          if (back <= front) continue;
          if (depth[index] === 0 || front < depth[index]) depth[index] = front;
          thickness[index] += (back - front) * Math.sqrt(a) * volumeWeight;
        }
    }
  }
  smooth(spacing: number) {
    reconstructWaterSurface(this, spacing);
  }
}
