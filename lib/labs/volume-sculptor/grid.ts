import { add3, dot3, magnitude3, normalize3, scale3, subtract3, type Vec3 } from "../normal.ts";

export type Shape = "sphere" | "separatedSpheres" | "torus";
export const maxCanvasSamples = 32;
export const clamp = (value: number, low: number, high: number) =>
  Math.min(high, Math.max(low, value));
export const finitePoint = (point: Vec3) => [point.x, point.y, point.z].every(Number.isFinite);

// The stored values are binary32, as in C++. JavaScript evaluates arithmetic in
// binary64; this lab compares geometry with tolerances, not GPU byte equality.
export class GridSpec {
  readonly samples: number;
  readonly origin: Readonly<Vec3>;
  readonly extent: number;

  constructor(samples = 24, origin: Vec3 = { x: -1.5, y: -1.5, z: -1.5 }, extent = 3) {
    if (!Number.isInteger(samples) || samples < 3 || samples > maxCanvasSamples)
      throw new RangeError("Canvas chỉ trích mesh CPU ở lưới 3…32 samples mỗi trục.");
    if (
      !finitePoint(origin) ||
      Math.max(Math.abs(origin.x), Math.abs(origin.y), Math.abs(origin.z)) > 8 ||
      !Number.isFinite(extent) ||
      extent < 0.1 ||
      extent > 16
    )
      throw new RangeError("Grid cần domain hữu hạn.");
    this.samples = samples;
    this.origin = Object.freeze({ ...origin });
    this.extent = extent;
    Object.freeze(this);
  }

  spacing() {
    return this.extent / (this.samples - 1);
  }
  sampleCount() {
    return this.samples ** 3;
  }
  cellCount() {
    return (this.samples - 1) ** 3;
  }

  sampleIndex(x: number, y: number, z: number) {
    if (![x, y, z].every((value) => Number.isInteger(value) && value >= 0 && value < this.samples))
      throw new RangeError("Sample nằm ngoài grid.");
    return (z * this.samples + y) * this.samples + x;
  }

  worldFromGrid(coordinate: Vec3): Vec3 {
    return add3(this.origin, scale3(coordinate, this.spacing()));
  }

  gridFromWorld(world: Vec3): Vec3 {
    return scale3(subtract3(world, this.origin), 1 / this.spacing());
  }
}

export function initialField(point: Vec3, shape: Shape) {
  if (shape === "sphere") return magnitude3(point) - 0.82;
  if (shape === "separatedSpheres")
    return Math.min(
      magnitude3(subtract3(point, { x: -0.55, y: 0, z: 0 })) - 0.42,
      magnitude3(subtract3(point, { x: 0.55, y: 0, z: 0 })) - 0.42,
    );
  if (shape === "torus") return Math.hypot(Math.hypot(point.x, point.z) - 0.68, point.y) - 0.22;
  throw new RangeError("Preset field không hợp lệ.");
}

export class ScalarGrid {
  readonly spec: GridSpec;
  readonly values: Float32Array<ArrayBuffer>;

  constructor(spec = new GridSpec(), values?: ArrayLike<number>) {
    this.spec = spec;
    this.values = new Float32Array(spec.sampleCount());
    if (values) this.replaceValues(values);
    else this.values.fill(4);
  }

  at(x: number, y: number, z: number) {
    return this.values[this.spec.sampleIndex(x, y, z)];
  }

  set(x: number, y: number, z: number, value: number) {
    if (!Number.isFinite(value) || Math.abs(value) > 32)
      throw new RangeError("Scalar không hợp lệ.");
    this.values[this.spec.sampleIndex(x, y, z)] = value;
  }

  replaceValues(values: ArrayLike<number>) {
    if (values.length !== this.values.length) throw new RangeError("Snapshot khác grid.");
    for (let index = 0; index < values.length; ++index)
      if (!Number.isFinite(values[index]) || Math.abs(values[index]) > 32)
        throw new RangeError("Snapshot có scalar không hợp lệ.");
    this.values.set(values);
  }

  clone() {
    return new ScalarGrid(this.spec, this.values);
  }

  fill(shape: Shape) {
    this.fillFunction((point) => initialField(point, shape));
  }

  fillFunction(evaluate: (point: Vec3) => number) {
    for (let z = 0; z < this.spec.samples; ++z)
      for (let y = 0; y < this.spec.samples; ++y)
        for (let x = 0; x < this.spec.samples; ++x)
          this.set(x, y, z, evaluate(this.spec.worldFromGrid({ x, y, z })));
  }

  sample(point: Vec3) {
    if (!finitePoint(point)) throw new RangeError("Probe phải hữu hạn.");
    const coordinate = this.spec.gridFromWorld(point);
    const last = this.spec.samples - 1;
    const gx = clamp(coordinate.x, 0, last),
      gy = clamp(coordinate.y, 0, last),
      gz = clamp(coordinate.z, 0, last);
    const x = Math.min(Math.floor(gx), last - 1),
      y = Math.min(Math.floor(gy), last - 1),
      z = Math.min(Math.floor(gz), last - 1);
    const tx = gx - x,
      ty = gy - y,
      tz = gz - z;
    const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
    const low = lerp(
      lerp(this.at(x, y, z), this.at(x + 1, y, z), tx),
      lerp(this.at(x, y + 1, z), this.at(x + 1, y + 1, z), tx),
      ty,
    );
    const high = lerp(
      lerp(this.at(x, y, z + 1), this.at(x + 1, y, z + 1), tx),
      lerp(this.at(x, y + 1, z + 1), this.at(x + 1, y + 1, z + 1), tx),
      ty,
    );
    return lerp(low, high, tz);
  }

  gradient(point: Vec3): Vec3 {
    if (!finitePoint(point)) throw new RangeError("Gradient cần điểm hữu hạn.");
    const h = this.spec.spacing() * 0.5,
      low = this.spec.origin;
    const maximum = add3(low, { x: this.spec.extent, y: this.spec.extent, z: this.spec.extent });
    const x0 = clamp(point.x - h, low.x, maximum.x),
      x1 = clamp(point.x + h, low.x, maximum.x);
    const y0 = clamp(point.y - h, low.y, maximum.y),
      y1 = clamp(point.y + h, low.y, maximum.y);
    const z0 = clamp(point.z - h, low.z, maximum.z),
      z1 = clamp(point.z + h, low.z, maximum.z);
    if (x1 <= x0 || y1 <= y0 || z1 <= z0) throw new RangeError("Gradient nằm ngoài domain.");
    return {
      x: (this.sample({ ...point, x: x1 }) - this.sample({ ...point, x: x0 })) / (x1 - x0),
      y: (this.sample({ ...point, y: y1 }) - this.sample({ ...point, y: y0 })) / (y1 - y0),
      z: (this.sample({ ...point, z: z1 }) - this.sample({ ...point, z: z0 })) / (z1 - z0),
    };
  }

  resample(samples: number) {
    const target = new ScalarGrid(new GridSpec(samples, this.spec.origin, this.spec.extent));
    target.fillFunction((point) => this.sample(point));
    return target;
  }
}

export function planeField(normal: Vec3, offset = 0) {
  const direction = normalize3(normal);
  if (dot3(direction, direction) === 0 || !Number.isFinite(offset))
    throw new RangeError("Plane không hợp lệ.");
  return (point: Vec3) => dot3(point, direction) - offset;
}
