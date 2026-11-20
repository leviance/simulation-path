import { cross, dot, sub, unit } from "./camera.ts";
import type { Vec3 } from "./model.ts";

// Millimetres and synthetic scalar values; deliberately the same recipe as geode.hpp.
export const geodeCentre: Vec3 = [-16, -9, -14];
const radii: Vec3 = [31, 34, 39];
const crystals = Array.from({ length: 32 }, (_, i) => {
  const y = 1 - (2 * i + 1) / 32;
  const ring = Math.sqrt(1 - y * y);
  const angle = 2.399963229728653 * i;
  const root: Vec3 = [
    geodeCentre[0] + radii[0] * ring * Math.cos(angle),
    geodeCentre[1] + radii[1] * y,
    geodeCentre[2] + radii[2] * ring * Math.sin(angle),
  ];
  const inward = unit(sub(geodeCentre, root));
  const reference: Vec3 = Math.abs(inward[1]) > 0.92 ? [1, 0, 0] : [0, 1, 0];
  const across = unit(cross(inward, reference));
  return {
    root,
    inward,
    across,
    up: cross(inward, across),
    radius: 4 + 0.6 * (i % 5),
    length: 9.5 + 1.7 * (i % 6),
  };
});

function crystalDensity(point: Vec3) {
  for (const crystal of crystals) {
    const offset = sub(point, crystal.root);
    const height = dot(offset, crystal.inward);
    if (height < -8 || height >= crystal.length) continue;
    const a = Math.abs(dot(offset, crystal.across));
    const b = Math.abs(dot(offset, crystal.up));
    const face = Math.max(a, 0.5 * a + 0.866025403784439 * b);
    const taper = Math.min(1, (crystal.length - height) / (0.53 * crystal.length));
    if (face < crystal.radius * taper)
      return 0.89 + 0.095 * Math.max(0, Math.min(1, height / crystal.length));
  }
  return 0.015;
}

export function geodeField(point: Vec3) {
  const [x, y, z] = point;
  const sx = (x - 3 + 0.09 * y) / 67,
    sy = (y - 3 - 0.07 * z) / 78,
    sz = (z - 5) / 91;
  const outer = Math.sqrt(sx * sx + sy * sy + sz * sz);
  if (outer > 1.14) return 0;
  const grain = Math.sin(0.19 * x + 0.14 * y) * Math.sin(0.16 * z - 0.09 * x);
  const relief =
    0.05 * Math.sin(0.077 * x + 0.032 * z) * Math.cos(0.063 * y) +
    0.032 * Math.sin(0.062 * z - 0.073 * y) +
    0.021 * grain;
  const skinDepth = (1 + relief - outer) * 68;
  if (skinDepth <= 0) return 0;
  if (skinDepth < 5.1 + 1.3 * grain) return 0.25 + 0.055 * grain + 0.018 * Math.sin(0.37 * z);

  const dx = x - geodeCentre[0],
    dy = y - geodeCentre[1],
    dz = z - geodeCentre[2];
  const ix = (dx + 0.1 * dy) / radii[0],
    iy = dy / radii[1],
    iz = (dz - 0.08 * dx) / radii[2];
  const ripple = 0.068 * Math.sin(dx * 0.082 + dz * 0.051) * Math.cos(dy * 0.081);
  const wallDepth = (Math.sqrt(ix * ix + iy * iy + iz * iz) - 1 - ripple) * 32;
  if (wallDepth < 0) return crystalDensity(point);
  if (wallDepth < 2.6) return 0.91 + 0.018 * grain;

  const position = wallDepth / (wallDepth + skinDepth);
  const phase = 2 * Math.PI * (5.2 * position + 0.12 * Math.sin(9 * position));
  const wave = 0.5 + 0.5 * Math.cos(phase);
  if (position > 0.74 && position < 0.8) return 0.32 + 0.06 * wave;
  return 0.45 + 0.19 * wave + 0.17 * wave ** 5 + 0.024 * Math.sin(phase * 2.7);
}
