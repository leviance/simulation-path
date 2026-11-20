import { cameraBasis, dot, subtract, type Camera, type Point } from "./model.ts";

// Same deterministic synthetic density as include/cloud.hpp, not a fluid solver.
const smoothRange = (first: number, last: number, value: number) => {
  const t = Math.max(0, Math.min(1, (value - first) / (last - first)));
  return t * t * (3 - 2 * t);
};
export function cloudHash(x: number, y: number, z: number) {
  let hash = Math.imul(x, 0x8da6b343) ^ Math.imul(y, 0xd8163841) ^ Math.imul(z, 0xcb1ab31f);
  hash ^= hash >>> 13;
  hash = Math.imul(hash, 0x85ebca6b);
  hash ^= hash >>> 16;
  return (hash & 0x00ffffff) / 16777215;
}
export function cloudNoise(x: number, y: number, z: number) {
  const ix = Math.floor(x),
    iy = Math.floor(y),
    iz = Math.floor(z);
  const blend = [smoothRange(0, 1, x - ix), smoothRange(0, 1, y - iy), smoothRange(0, 1, z - iz)];
  let result = 0;
  for (let dz = 0; dz < 2; dz++) {
    for (let dy = 0; dy < 2; dy++) {
      for (let dx = 0; dx < 2; dx++) {
        let weight = 1;
        const corner = [dx, dy, dz];
        for (let axis = 0; axis < 3; axis++)
          weight *= corner[axis] === 0 ? 1 - blend[axis] : blend[axis];
        result += weight * cloudHash(ix + dx, iy + dy, iz + dz);
      }
    }
  }
  return result;
}
const lobes = [
  [-0.33, 0.02, 0.02, 0.43, 0.37, 0.44],
  [0.08, 0.02, -0.06, 0.44, 0.4, 0.45],
  [0.47, -0.04, 0.04, 0.36, 0.29, 0.37],
  [-0.23, 0.28, 0, 0.3, 0.36, 0.33],
  [0.12, 0.39, -0.06, 0.31, 0.34, 0.35],
  [0.32, 0.18, -0.26, 0.28, 0.3, 0.32],
  [-0.61, -0.05, 0.03, 0.27, 0.24, 0.28],
  [0, -0.18, 0.26, 0.5, 0.25, 0.29],
];
const axisLength = Math.sqrt(0.3385 ** 2 + 0.1593 ** 2 + 0.9274 ** 2);
const channelAxis = [0.3385 / axisLength, 0.1593 / axisLength, 0.9274 / axisLength];
export function cloudDensity(x: number, y: number, z: number) {
  let shape = -1;
  for (const lobe of lobes) {
    const dx = (x - lobe[0]) / lobe[3],
      dy = (y - lobe[1]) / lobe[4],
      dz = (z - lobe[2]) / lobe[5];
    const lobeShape = 1 - (dx * dx + dy * dy + dz * dz);
    const blend = Math.max(0, Math.min(1, 0.5 + (0.5 * (shape - lobeShape)) / 0.18));
    shape = shape * blend + lobeShape * (1 - blend) + 0.18 * blend * (1 - blend);
  }
  if (shape < -0.15) return 0;
  const coarse = cloudNoise(x * 3.5 + 7, y * 3.5 + 11, z * 3.5 + 3);
  const medium = cloudNoise(x * 7 + 19, y * 7 + 5, z * 7 + 13);
  const fine = cloudNoise(x * 14 + 2, y * 14 + 17, z * 14 + 23);
  const noise = 0.57 * coarse + 0.29 * medium + 0.14 * fine;
  const boundary = smoothRange(0.02, 0.4, shape + 0.24 * (noise - 0.5));
  const base = smoothRange(-0.48, -0.33, y);
  const core = Math.exp(-((x + 0.2) ** 2 + (y - 0.25) ** 2 + z * z) / 0.14);
  const relative = [x - 0.32, y + 0.2, z - 0.07];
  const axial = relative.reduce((sum, value, i) => sum + value * channelAxis[i], 0);
  const rx = relative[0] - channelAxis[0] * axial + 0.065 * (medium - 0.5);
  const ry = relative[1] - channelAxis[1] * axial + 0.045 * (coarse - 0.5);
  const rz = relative[2] - channelAxis[2] * axial;
  const radiusSquared = (rx * rx + rz * rz) / (0.18 * 0.18) + (ry * ry) / (0.13 * 0.13);
  return Math.max(
    0,
    Math.min(
      1,
      boundary *
        base *
        (0.45 + 0.55 * noise) *
        (0.65 + 0.35 * core) *
        smoothRange(0.4, 2.1, radiusSquared),
    ),
  );
}

export const cloudLandmarks: { point: Point; label: string }[] = [
  { point: [-0.2, 0.25, 0], label: "Vùng đậm" },
  { point: [-0.85, -0.03, 0.04], label: "Rìa loãng" },
  { point: [0.32, -0.2, 0.07], label: "Khe mật độ thấp" },
];

export function projectLandmark(point: Point, camera: Camera, width: number, height: number) {
  const basis = cameraBasis(camera),
    relative = subtract(point, basis.origin);
  const depth = dot(relative, basis.forward);
  if (depth <= 0.05) return null;
  const tangent = Math.tan((50 * Math.PI) / 360),
    aspect = width / height;
  return {
    x: (0.5 + dot(relative, basis.right) / (2 * depth * tangent * aspect)) * width,
    y: (0.5 - dot(relative, basis.up) / (2 * depth * tangent)) * height,
  };
}
