import {
  add,
  subtract,
  multiply,
  dot,
  cameraBasis,
  type Camera,
  type Vec3,
} from "../../../lib/labs/ray-intersections.ts";

export type Color = [number, number, number];
export interface Vertex {
  point: Vec3;
  color: Color;
}
export const mixInk = (a: Color, b: Color, t: number): Color => [
  a[0] + t * (b[0] - a[0]),
  a[1] + t * (b[1] - a[1]),
  a[2] + t * (b[2] - a[2]),
];
interface ScreenVertex {
  x: number;
  y: number;
  inverseDepth: number;
}

// Canvas presentation uses triangle rasterization, independently of the ray queries.
export class Raster {
  pixels: Uint8ClampedArray;
  inverseDepth: Float64Array;
  background: Uint8ClampedArray;
  basis: ReturnType<typeof cameraBasis>;
  width: number;
  height: number;
  camera: Camera;
  constructor(width: number, height: number, camera: Camera) {
    this.width = width;
    this.height = height;
    this.camera = camera;
    this.pixels = new Uint8ClampedArray(width * height * 4);
    this.inverseDepth = new Float64Array(width * height);
    this.basis = cameraBasis(camera);
    for (let y = 0; y < height; y++) {
      const sky = 1 - Math.abs((2 * y) / height - 0.85);
      const color: Color = [17 + 12 * sky, 26 + 20 * sky, 36 + 22 * sky];
      for (let x = 0; x < width; x++) this.write(y * width + x, color);
    }
    this.background = this.pixels.slice();
  }
  begin(camera: Camera) {
    this.camera = camera;
    this.basis = cameraBasis(camera);
    this.inverseDepth.fill(0);
    this.pixels.set(this.background);
  }
  write(index: number, color: Color, light = 1) {
    this.pixels[index * 4] = color[0] * light;
    this.pixels[index * 4 + 1] = color[1] * light;
    this.pixels[index * 4 + 2] = color[2] * light;
    this.pixels[index * 4 + 3] = 255;
  }
  toCamera(point: Vec3): Vec3 {
    const relative = subtract(point, this.camera.origin);
    return {
      x: dot(relative, this.basis.right),
      y: dot(relative, this.basis.up),
      z: dot(relative, this.basis.forward),
    };
  }
  toScreen(point: Vec3): ScreenVertex {
    const scale = this.height / (2 * this.camera.tanHalfFov * point.z);
    return {
      x: this.width / 2 + point.x * scale,
      y: this.height / 2 - point.y * scale,
      inverseDepth: 1 / point.z,
    };
  }
  edge(a: ScreenVertex, b: ScreenVertex, x: number, y: number) {
    return (b.x - a.x) * (y - a.y) - (b.y - a.y) * (x - a.x);
  }
  rasterTriangle(a: Vertex, b: Vertex, c: Vertex, opacity: number, smooth: boolean) {
    const p = this.toScreen(a.point),
      q = this.toScreen(b.point),
      r = this.toScreen(c.point);
    const area = this.edge(p, q, r.x, r.y);
    if (!Number.isFinite(area) || Math.abs(area) < 1e-9) return;
    const x0 = Math.max(0, Math.floor(Math.min(p.x, q.x, r.x))),
      x1 = Math.min(this.width - 1, Math.ceil(Math.max(p.x, q.x, r.x)));
    const y0 = Math.max(0, Math.floor(Math.min(p.y, q.y, r.y))),
      y1 = Math.min(this.height - 1, Math.ceil(Math.max(p.y, q.y, r.y)));
    for (let y = y0; y <= y1; y++)
      for (let x = x0; x <= x1; x++) {
        const wa = this.edge(q, r, x + 0.5, y + 0.5) / area;
        const wb = this.edge(r, p, x + 0.5, y + 0.5) / area,
          wc = 1 - wa - wb;
        if (wa < -1e-10 || wb < -1e-10 || wc < -1e-10) continue;
        const depth = wa * p.inverseDepth + wb * q.inverseDepth + wc * r.inverseDepth;
        const index = y * this.width + x;
        const base = index * 4;
        if (opacity < 1) {
          if (
            this.inverseDepth[index] > 0 &&
            Math.abs(depth - this.inverseDepth[index]) <= depth * 0.0001
          ) {
            for (let channel = 0; channel < 3; channel++)
              this.pixels[base + channel] +=
                (a.color[channel] - this.pixels[base + channel]) * opacity;
          }
        } else if (depth > this.inverseDepth[index]) {
          this.inverseDepth[index] = depth;
          if (smooth) {
            const u = (wa * p.inverseDepth) / depth;
            const v = (wb * q.inverseDepth) / depth;
            const w = 1 - u - v;
            for (let channel = 0; channel < 3; channel++)
              this.pixels[base + channel] =
                u * a.color[channel] + v * b.color[channel] + w * c.color[channel];
          } else {
            this.write(index, a.color);
          }
        }
      }
  }
  paint(a: Vertex, b: Vertex, c: Vertex, opacity = 1, smooth = true) {
    const input = [a, b, c].map(({ point, color }) => ({ point: this.toCamera(point), color }));
    if (input.every((vertex) => vertex.point.z >= 0.06)) {
      this.rasterTriangle(input[0], input[1], input[2], opacity, smooth);
      return;
    }
    const output: Vertex[] = [];
    for (let i = 0; i < 3; i++) {
      const start = input[i],
        end = input[(i + 1) % 3];
      const insideStart = start.point.z >= 0.06,
        insideEnd = end.point.z >= 0.06;
      if (insideStart) output.push(start);
      if (insideStart !== insideEnd) {
        const t = (0.06 - start.point.z) / (end.point.z - start.point.z);
        output.push({
          point: add(start.point, multiply(subtract(end.point, start.point), t)),
          color: mixInk(start.color, end.color, t),
        });
      }
    }
    for (let i = 1; i + 1 < output.length; i++)
      this.rasterTriangle(output[0], output[i], output[i + 1], opacity, smooth);
  }
  triangle(a: Vec3, b: Vec3, c: Vec3, color: Color, opacity = 1) {
    this.paint({ point: a, color }, { point: b, color }, { point: c, color }, opacity, false);
  }
  line(start: Vec3, end: Vec3, color: Color, xray = false, radius = 0, hiddenLight = 0.4) {
    let a = this.toCamera(start),
      b = this.toCamera(end);
    if (a.z < 0.061 && b.z < 0.061) return;
    if (a.z < 0.061) a = add(a, multiply(subtract(b, a), (0.061 - a.z) / (b.z - a.z)));
    else if (b.z < 0.061) b = add(b, multiply(subtract(a, b), (0.061 - b.z) / (a.z - b.z)));
    const p = this.toScreen(a),
      q = this.toScreen(b);
    let lo = 0,
      hi = 1;
    for (const [value, delta, bound] of [
      [p.x, q.x - p.x, this.width - 1],
      [p.y, q.y - p.y, this.height - 1],
    ]) {
      if (delta === 0) {
        if (value < 0 || value > bound) return;
      } else {
        let entry = -value / delta,
          exit = (bound - value) / delta;
        if (entry > exit) [entry, exit] = [exit, entry];
        lo = Math.max(lo, entry);
        hi = Math.min(hi, exit);
      }
    }
    if (lo > hi) return;
    const steps = Math.max(
      1,
      Math.ceil(Math.max(Math.abs(q.x - p.x), Math.abs(q.y - p.y)) * (hi - lo)),
    );
    for (let i = 0; i <= steps; i++) {
      const t = lo + ((hi - lo) * i) / steps;
      const x = Math.round(p.x + (q.x - p.x) * t),
        y = Math.round(p.y + (q.y - p.y) * t);
      const depth = p.inverseDepth + (q.inverseDepth - p.inverseDepth) * t;
      for (let oy = -radius; oy <= radius; oy++)
        for (let ox = -radius; ox <= radius; ox++) {
          if (x + ox < 0 || x + ox >= this.width || y + oy < 0 || y + oy >= this.height) continue;
          const index = (y + oy) * this.width + x + ox;
          if (depth >= this.inverseDepth[index] * 0.998) this.write(index, color);
          else if (xray && i % 10 < 4) this.write(index, color, hiddenLight);
        }
    }
  }
  marker(point: Vec3, color: Color, size = 4, shape: "disc" | "ring" | "diamond" = "disc") {
    const p = this.toCamera(point);
    if (p.z <= 0.061) return;
    const screen = this.toScreen(p),
      px = Math.round(screen.x),
      py = Math.round(screen.y);
    for (let y = -size; y <= size; y++)
      for (let x = -size; x <= size; x++) {
        const r2 = x * x + y * y;
        const inside =
          shape === "diamond"
            ? Math.abs(x) + Math.abs(y) === size
            : r2 <= size * size && (shape === "disc" || r2 > (size - 1) ** 2);
        if (inside && px + x >= 0 && px + x < this.width && py + y >= 0 && py + y < this.height)
          this.write((py + y) * this.width + px + x, color);
      }
  }
}
