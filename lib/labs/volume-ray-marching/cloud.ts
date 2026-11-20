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
// Centre and three radii, in the same world coordinates as cloud.hpp.
const lobes = [
  [-0.15, -0.36, 0.02, 0.73, 0.24, 0.53],
  [-0.38, -0.22, 0.17, 0.36, 0.32, 0.4],
  [-0.31, 0.03, 0.18, 0.31, 0.36, 0.38],
  [-0.24, 0.28, 0.1, 0.26, 0.3, 0.29],
  [-0.43, 0.28, 0.04, 0.19, 0.25, 0.25],
  [0.08, -0.14, -0.29, 0.38, 0.33, 0.3],
  [0.19, 0.11, -0.3, 0.28, 0.33, 0.26],
  [0.26, 0.3, -0.32, 0.2, 0.22, 0.2],
  [-0.01, -0.08, 0.34, 0.24, 0.26, 0.23],
  [-0.56, -0.24, -0.06, 0.3, 0.24, 0.31],
  [0.37, -0.34, -0.1, 0.26, 0.18, 0.32],
  [-0.46, 0.14, 0.23, 0.2, 0.16, 0.21],
  [-0.19, 0.3, 0.27, 0.16, 0.17, 0.16],
  [0.48, -0.35, 0.0, 0.21, 0.12, 0.24],
];

function joinBillows(a: number, b: number) {
  const seam = Math.max(0, 0.22 - Math.abs(a - b));
  return Math.max(a, b) + (seam * seam) / 0.88;
}

export function cloudDensity(x: number, y: number, z: number) {
  if (y < -0.62 || y > 0.66 || Math.abs(z) > 0.69) return 0;
  let towers = -2;
  for (const lobe of lobes) {
    const dx = (x - lobe[0]) / lobe[3];
    const dy = (y - lobe[1]) / lobe[4];
    const dz = (z - lobe[2]) / lobe[5];
    towers = joinBillows(towers, 1 - (dx * dx + dy * dy + dz * dz));
  }
  const downwind = smoothRange(-0.35, 0.92, x);
  const capHeight = 0.42 + 0.13 * downwind;
  const capThickness = 0.22 - 0.12 * downwind;
  const anvil =
    1 -
    (((x - 0.13) / 0.83) ** 2 + ((y - capHeight) / capThickness) ** 2 + ((z + 0.04) / 0.43) ** 2);
  const envelope = joinBillows(anvil, towers);
  if (envelope < -1.12) return 0;

  const coarse = cloudNoise(x * 3.7 + 7, y * 3.7 + 11, z * 3.7 + 3);
  const medium = cloudNoise(x * 9 + 19, y * 9 + 5, z * 9 + 13);
  const fine = cloudNoise(x * 21 + 2, y * 21 + 17, z * 21 + 23);
  const texture = 0.49 * coarse + 0.33 * medium + 0.18 * fine;
  let erosion = 1.03 * (coarse - 0.5) + 0.52 * (medium - 0.5) + 0.25 * (fine - 0.5);
  if (downwind > 0 && y > 0.32) {
    const fibres = cloudNoise(3 * x + 9, 28 * y + 11, 11 * z + 8);
    erosion += 0.36 * downwind * smoothRange(0.32, 0.48, y) * (fibres - 0.5);
  }
  const boundary = smoothRange(-0.04, 0.35, envelope + erosion);
  const flatTop = 1 - smoothRange(0.57, 0.65, y + 0.034 * (texture - 0.5));
  const anvilTip = 1 - smoothRange(0.88, 0.98, x);
  const base = smoothRange(-0.59, -0.43, y + 0.08 * (coarse - 0.5));

  const dy = (y + 0.075 + 0.32 * x + 0.044 * (medium - 0.5)) / 0.17;
  const dz = (z - 0.022 - 0.085 * x + 0.045 * (coarse - 0.5)) / 0.19;
  const passage = smoothRange(0.61, 1.5, dy * dy + dz * dz);
  const ax = (x - 0.365 * z - 0.035 + 0.06 * (medium - 0.5)) / 0.12;
  const ay = (y - 0.172 * z - 0.18 + 0.04 * (coarse - 0.5)) / 0.125;
  const arch = smoothRange(0.56, 1.6, ax * ax + ay * ay);
  const body = 0.29 + 0.59 * smoothRange(0.26, 0.72, texture) + 0.1 * smoothRange(-0.2, 0.5, y);
  return Math.max(0, Math.min(1, boundary * base * flatTop * anvilTip * passage * arch * body));
}

export const cloudLandmarks: { point: Point; label: string }[] = [
  { point: [-0.25, 0.26, 0.12], label: "Lõi tháp mây gần" },
  { point: [0.96, 0.55, -0.04], label: "Mép tán mây cuối gió" },
  { point: [0, 0, 0], label: "Khoảng trống giữa hai lớp" },
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
