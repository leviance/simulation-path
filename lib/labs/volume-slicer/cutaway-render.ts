import { Volume, lower, type Point } from "./model.ts";
import { sliceCameraBasis, type SliceCamera } from "./camera.ts";
import { add, sub, mul, dot, normal, type Vertex, type Surface } from "./geometry.ts";
import { keepOutsideCorner } from "./cutaway-clip.ts";
export function renderCutaway(
  volume: Volume,
  mesh: Surface,
  cursor: Point,
  camera: SliceCamera,
  cut: boolean,
  width: number,
  height: number,
  raw: Float64Array[],
  images: Uint8ClampedArray[],
  dark = false,
) {
  if (
    !Number.isInteger(width) ||
    !Number.isInteger(height) ||
    width < 1 ||
    width > 1000 ||
    height < 1 ||
    height > 700
  )
    throw new RangeError("Bounded viewport required");
  if (raw.length !== 3 || images.length !== 3) throw new RangeError("Three slice images required");
  const sliceSide = Math.sqrt(raw[0].length);
  if (
    !Number.isInteger(sliceSide) ||
    sliceSide < 1 ||
    sliceSide > 256 ||
    raw.some((v) => v.length !== raw[0].length) ||
    images.some((v) => v.length !== raw[0].length * 4)
  )
    throw new RangeError("Consistent bounded slice buffers required");
  const basis = sliceCameraBasis(camera),
    eye = basis.eye;
  const rgba = new Uint8ClampedArray(width * height * 4),
    depth = new Float64Array(width * height);
  const iso = 0.18,
    side = Math.sqrt(raw[0].length),
    g = volume.grid;
  const ext = g.count.map((n, a) => n * g.spacing[a]),
    low = [0, 1, 2].map((a) => lower(g, a));
  const light = normal([-0.5, -0.7, 1]),
    half = normal(add(light, mul(basis.forward, -1)));
  const project = (v: Vertex) => {
    const relative = sub(v.p, eye),
      z = dot(relative, basis.forward),
      scale = height / (0.92 * z);
    return {
      x: width / 2 + dot(relative, basis.right) * scale,
      y: height / 2 - dot(relative, basis.up) * scale,
      iz: 1 / z,
      n: v.n,
    };
  };
  // Light studio floor with a subtle contact cue; it is not a physical light simulation.
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++) {
      const sx = ((((2 * (x + 0.5)) / width - 1) * width) / height) * 0.46,
        sy = (1 - (2 * (y + 0.5)) / height) * 0.46;
      const dx = basis.forward[0] + sx * basis.right[0] + sy * basis.up[0];
      const dy = basis.forward[1] + sx * basis.right[1] + sy * basis.up[1];
      const dz = basis.forward[2] + sx * basis.right[2] + sy * basis.up[2];
      let r = 238 - (10 * y) / height,
        green = 243 - (8 * y) / height,
        b = 246 - (5 * y) / height;
      if (dark) {
        r = 16 + (5 * y) / height;
        green = 27 + (7 * y) / height;
        b = 38 + (10 * y) / height;
      }
      const floorT = (low[2] - 0.12 - eye[2]) / dz;
      if (floorT > 0) {
        const px = eye[0] + floorT * dx,
          py = eye[1] + floorT * dy;
        if (Math.abs(px) < 5 && Math.abs(py) < 5) {
          const dist = Math.min(
            Math.abs(px * 2 - Math.round(px * 2)),
            Math.abs(py * 2 - Math.round(py * 2)),
          );
          const line = Math.max(0, 1 - dist / 0.018),
            shadow = 26 * Math.exp((-px * px) / 2.1 - (py * py) / 2.8);
          r = 226 - 18 * line - shadow;
          green = 234 - 18 * line - shadow;
          b = 239 - 17 * line - shadow;
          if (dark) {
            r = 19 + 14 * line - shadow * 0.25;
            green = 32 + 21 * line - shadow * 0.25;
            b = 45 + 26 * line - shadow * 0.25;
          }
        }
      }
      const at = 4 * (x + y * width);
      rgba[at] = r;
      rgba[at + 1] = green;
      rgba[at + 2] = b;
      rgba[at + 3] = 255;
    }
  const edge = (a: { x: number; y: number }, b: { x: number; y: number }, x: number, y: number) =>
    (b.x - a.x) * (y - a.y) - (b.y - a.y) * (x - a.x);
  for (const triangle of mesh) {
    const triangles = cut ? keepOutsideCorner(triangle, cursor) : [triangle];
    for (const piece of triangles) {
      if (dot(add(add(piece[0].n, piece[1].n), piece[2].n), sub(eye, piece[0].p)) <= 0) continue;
      const a = project(piece[0]),
        b = project(piece[1]),
        c = project(piece[2]);
      if (a.iz <= 0 || b.iz <= 0 || c.iz <= 0) continue;
      const area = edge(a, b, c.x, c.y);
      if (Math.abs(area) < 1e-9) continue;
      const x0 = Math.max(0, Math.floor(Math.min(a.x, b.x, c.x))),
        x1 = Math.min(width - 1, Math.ceil(Math.max(a.x, b.x, c.x)));
      const y0 = Math.max(0, Math.floor(Math.min(a.y, b.y, c.y))),
        y1 = Math.min(height - 1, Math.ceil(Math.max(a.y, b.y, c.y)));
      for (let y = y0; y <= y1; y++)
        for (let x = x0; x <= x1; x++) {
          const wa = edge(b, c, x + 0.5, y + 0.5) / area,
            wb = edge(c, a, x + 0.5, y + 0.5) / area,
            wc = 1 - wa - wb;
          if (wa < 0 || wb < 0 || wc < 0) continue;
          const iz = wa * a.iz + wb * b.iz + wc * c.iz,
            index = x + y * width;
          if (iz <= depth[index]) continue;
          let nx = (wa * a.iz * a.n[0] + wb * b.iz * b.n[0] + wc * c.iz * c.n[0]) / iz;
          let ny = (wa * a.iz * a.n[1] + wb * b.iz * b.n[1] + wc * c.iz * c.n[1]) / iz;
          let nz = (wa * a.iz * a.n[2] + wb * b.iz * b.n[2] + wc * c.iz * c.n[2]) / iz;
          const lengthSquared = nx * nx + ny * ny + nz * nz;
          if (lengthSquared > 1e-24) {
            const invN = 1 / Math.sqrt(lengthSquared);
            nx *= invN;
            ny *= invN;
            nz *= invN;
          } else {
            nx = 0;
            ny = 0;
            nz = 1;
          }
          const diffuse = Math.max(0, nx * light[0] + ny * light[1] + nz * light[2]);
          const specular = Math.pow(Math.max(0, nx * half[0] + ny * half[1] + nz * half[2]), 38);
          const intensity = 0.42 + 0.55 * diffuse + 0.24 * specular;
          depth[index] = iz;
          rgba[4 * index] = 215 * intensity;
          rgba[4 * index + 1] = 225 * intensity;
          rgba[4 * index + 2] = 233 * intensity;
        }
    }
  }
  if (cut)
    for (let y = 0; y < height; y++)
      for (let x = 0; x < width; x++) {
        const sx = ((((2 * (x + 0.5)) / width - 1) * width) / height) * 0.46,
          sy = (1 - (2 * (y + 0.5)) / height) * 0.46;
        const dx = basis.forward[0] + sx * basis.right[0] + sy * basis.up[0];
        const dy = basis.forward[1] + sx * basis.right[1] + sy * basis.up[1];
        const dz = basis.forward[2] + sx * basis.right[2] + sy * basis.up[2];
        for (let view = 0; view < 3; view++) {
          let axis = 2,
            direction = dz;
          if (view === 1) {
            axis = 1;
            direction = dy;
          }
          if (view === 2) {
            axis = 0;
            direction = dx;
          }
          if (Math.abs(direction) < 1e-10) continue;
          const t = (cursor[axis] - eye[axis]) / direction,
            index = x + y * width;
          if (t <= 0 || 1 / t <= depth[index] + 1e-8) continue;
          const px = eye[0] + t * dx,
            py = eye[1] + t * dy,
            pz = eye[2] + t * dz;
          if (
            (axis !== 0 && px < cursor[0] - 1e-8) ||
            (axis !== 1 && py > cursor[1] + 1e-8) ||
            (axis !== 2 && pz < cursor[2] - 1e-8)
          )
            continue;
          let u = (px - low[0]) / ext[0],
            v = 1 - (py - low[1]) / ext[1];
          if (view === 1) v = 1 - (pz - low[2]) / ext[2];
          if (view === 2) {
            u = (py - low[1]) / ext[1];
            v = 1 - (pz - low[2]) / ext[2];
          }
          if (u < 0 || u >= 1 || v < 0 || v >= 1) continue;
          const voxel = Math.floor(u * side) + Math.floor(v * side) * side;
          if (raw[view][voxel] < iso) continue;
          const image = images[view];
          depth[index] = 1 / t;
          rgba[4 * index] = image[4 * voxel];
          rgba[4 * index + 1] = image[4 * voxel + 1];
          rgba[4 * index + 2] = image[4 * voxel + 2];
        }
      }
  return rgba;
}
