export interface Vec3 {
  x: number;
  y: number;
  z: number;
}
export interface Plane extends Vec3 {
  w: number;
}
export interface CityObject {
  id: number;
  center: Vec3;
  half: Vec3;
  radius: number;
  mesh: number;
  color: [number, number, number];
}
export interface Camera {
  eye: Vec3;
  yaw: number;
  pitch: number;
  fov: number;
  near: number;
  far: number;
}
export type Counts = [number, number, number, number];
export interface Command {
  count: number;
  instanceCount: number;
  firstIndex: number;
  baseVertex: number;
  baseInstance: number;
}
export const add = (a: Vec3, b: Vec3): Vec3 => ({ x: a.x + b.x, y: a.y + b.y, z: a.z + b.z });
export const sub = (a: Vec3, b: Vec3): Vec3 => ({ x: a.x - b.x, y: a.y - b.y, z: a.z - b.z });
export const mul = (a: Vec3, s: number): Vec3 => ({ x: a.x * s, y: a.y * s, z: a.z * s });
export const dot = (a: Vec3, b: Vec3) => a.x * b.x + a.y * b.y + a.z * b.z;
export const cross = (a: Vec3, b: Vec3): Vec3 => ({
  x: a.y * b.z - a.z * b.y,
  y: a.z * b.x - a.x * b.z,
  z: a.x * b.y - a.y * b.x,
});
export const length = (a: Vec3) => Math.sqrt(dot(a, a));
export const normalized = (a: Vec3) => mul(a, 1 / Math.max(length(a), 1e-12));

export function hash(value: number): number {
  let result = value >>> 0;
  result = Math.imul(result ^ (result >>> 16), 0x7feb352d);
  result = Math.imul(result ^ (result >>> 15), 0x846ca68b);
  return (result ^ (result >>> 16)) >>> 0;
}

// Pure deterministic scene generation: a record belongs to an ID, not to a frame.
export function makeCity(count: number, seed: number): CityObject[] {
  if (!Number.isSafeInteger(count) || count < 0 || count > 4096)
    throw new RangeError("Canvas chỉ nhận từ 0 đến 4.096 record CPU.");
  if (!Number.isSafeInteger(seed) || seed < 0 || seed > 0xffffffff)
    throw new RangeError("Seed phải là uint32.");
  const side = Math.max(1, Math.ceil(Math.sqrt(count)));
  const palette: [number, number, number][] = [
    [105, 165, 181],
    [207, 168, 116],
    [151, 173, 204],
    [125, 151, 145],
  ];
  return Array.from({ length: count }, (_, id) => {
    const bits = hash(id ^ seed);
    const row = Math.floor(id / side),
      column = id % side;
    const x = (column - (side - 1) / 2) * 12 + Math.floor(column / 6) * 9;
    const z = (row - (side - 1) / 2) * 12 + Math.floor(row / 6) * 9;
    const district = Math.exp(-(x * x + z * z) / (side * side * 35));
    let height = 4 + ((bits >>> 4) % 12) + district * ((bits >>> 12) % 45);
    if (id % 97 === 0) height += 38;
    const plaza = Math.abs(column - (side - 1) / 2) < 2 && Math.abs(row - (side - 1) / 2) < 2;
    if (plaza) height = 1.0 + (bits % 4) * 0.5;
    const half = { x: 2.3 + (bits % 16) / 12, y: height / 2, z: 2.4 + ((bits >>> 8) % 16) / 12 };
    return {
      id,
      center: { x, y: half.y, z },
      half,
      radius: length(half),
      mesh: bits % 3,
      color: plaza
        ? ([117, 160, 122] as [number, number, number])
        : palette[(bits >>> 20) % palette.length],
    };
  });
}

export function defaultCamera(kind: "street" | "overview" = "overview", count = 1024): Camera {
  const span = Math.sqrt(count) * 7;
  if (kind === "street")
    return {
      eye: { x: 5.5, y: 3.8, z: span * 0.6 },
      yaw: -2.98,
      pitch: 0.05,
      fov: 64,
      near: 0.5,
      far: 1100,
    };
  return {
    eye: { x: span * 0.9, y: span * 0.72, z: span * 1.12 },
    yaw: -2.48,
    pitch: -0.4,
    fov: 62,
    near: 0.5,
    far: 1500,
  };
}

export function basis(camera: Camera) {
  const forward = {
    x: Math.sin(camera.yaw) * Math.cos(camera.pitch),
    y: Math.sin(camera.pitch),
    z: Math.cos(camera.yaw) * Math.cos(camera.pitch),
  };
  const right = normalized(cross(forward, { x: 0, y: 1, z: 0 }));
  return { forward, right, up: cross(right, forward) };
}

export function frustum(camera: Camera, aspect: number): Plane[] {
  const { forward, right, up } = basis(camera);
  const tanY = Math.tan((camera.fov * Math.PI) / 360),
    tanX = tanY * aspect;
  const plane = (normal: Vec3, point: Vec3): Plane => {
    const n = normalized(normal);
    return { ...n, w: -dot(n, point) };
  };
  return [
    plane(add(mul(forward, tanX), right), camera.eye),
    plane(sub(mul(forward, tanX), right), camera.eye),
    plane(add(mul(forward, tanY), up), camera.eye),
    plane(sub(mul(forward, tanY), up), camera.eye),
    plane(forward, add(camera.eye, mul(forward, camera.near))),
    plane(mul(forward, -1), add(camera.eye, mul(forward, camera.far))),
  ];
}
export const PLANE_NAMES = ["left", "right", "bottom", "top", "near", "far"];

export function rejectedPlane(object: CityObject, planes: Plane[]): number {
  return planes.findIndex((plane) => dot(plane, object.center) + plane.w < -object.radius);
}

export function toView(point: Vec3, camera: Camera): Vec3 {
  const relative = sub(point, camera.eye),
    axes = basis(camera);
  return {
    x: dot(relative, axes.right),
    y: dot(relative, axes.up),
    z: dot(relative, axes.forward),
  };
}

export function projectView(point: Vec3, camera: Camera, width: number, height: number) {
  const focal = height / (2 * Math.tan((camera.fov * Math.PI) / 360));
  return {
    x: width / 2 + (point.x / point.z) * focal,
    y: height / 2 - (point.y / point.z) * focal,
    z: point.z,
  };
}
export const projectPoint = (point: Vec3, camera: Camera, width: number, height: number) =>
  projectView(toView(point, camera), camera, width, height);

export function screenRay(
  x: number,
  y: number,
  camera: Camera,
  width: number,
  height: number,
): Vec3 {
  const axes = basis(camera),
    focal = height / (2 * Math.tan((camera.fov * Math.PI) / 360));
  return normalized(
    add(
      axes.forward,
      add(mul(axes.right, (x - width / 2) / focal), mul(axes.up, (height / 2 - y) / focal)),
    ),
  );
}

export function rayBox(origin: Vec3, direction: Vec3, object: CityObject): number | null {
  let entry = 0,
    exit = Infinity;
  for (const axis of ["x", "y", "z"] as const) {
    const lo = object.center[axis] - object.half[axis],
      hi = object.center[axis] + object.half[axis];
    if (Math.abs(direction[axis]) < 1e-12) {
      if (origin[axis] < lo || origin[axis] > hi) return null;
      continue;
    }
    const a = (lo - origin[axis]) / direction[axis],
      b = (hi - origin[axis]) / direction[axis];
    entry = Math.max(entry, Math.min(a, b));
    exit = Math.min(exit, Math.max(a, b));
    if (entry > exit) return null;
  }
  return entry;
}

export function exclusiveScan(input: Counts[], blockSpan = 512): Counts[] {
  if (!Number.isSafeInteger(blockSpan) || blockSpan < 2) throw new RangeError("blockSpan >= 2");
  if (
    input.some((row) =>
      row.some((value) => !Number.isSafeInteger(value) || value < 0 || value > 0xffffffff),
    )
  ) {
    throw new RangeError("Scan chỉ nhận uint32 không âm.");
  }
  if (input.length === 0) return [];
  const output: Counts[] = [],
    sums: Counts[] = [];
  for (let first = 0; first < input.length; first += blockSpan) {
    let total: Counts = [0, 0, 0, 0];
    for (let i = first; i < Math.min(first + blockSpan, input.length); ++i) {
      output[i] = [...total];
      total = total.map((value, channel) => value + input[i][channel]) as Counts;
      if (total.some((value) => !Number.isSafeInteger(value) || value > 0xffffffff))
        throw new RangeError("uint32 offset overflow");
    }
    sums.push(total);
  }
  if (sums.length > 1) {
    const offsets = exclusiveScan(sums, blockSpan);
    for (let i = 0; i < output.length; ++i)
      output[i] = output[i].map(
        (value, c) => value + offsets[Math.floor(i / blockSpan)][c],
      ) as Counts;
  }
  return output;
}

export function pipeline(objects: CityObject[], planes: Plane[], eye: Vec3, culling: boolean) {
  const mask: Counts[] = objects.map((object) => {
    const channels: Counts = [0, 0, 0, 0];
    if (!culling || rejectedPlane(object, planes) < 0) {
      channels[object.mesh] = 1;
      channels[3] = 1;
    }
    return channels;
  });
  const prefix = exclusiveScan(mask);
  const counts: Counts = [0, 0, 0, 0];
  if (mask.length) for (let c = 0; c < 4; ++c) counts[c] = prefix.at(-1)![c] + mask.at(-1)![c];
  const offsets = [0, counts[0], counts[0] + counts[1]];
  const visibleIds = Array<number>(counts[3]);
  let minDistance = Infinity,
    maxDistance = -Infinity,
    minId = 0xffffffff,
    maxId = 0;
  objects.forEach((object, i) => {
    if (!mask[i][3]) return;
    visibleIds[offsets[object.mesh] + prefix[i][object.mesh]] = object.id;
    const distance = length(sub(object.center, eye));
    minDistance = Math.min(minDistance, distance);
    maxDistance = Math.max(maxDistance, distance);
    minId = Math.min(minId, object.id);
    maxId = Math.max(maxId, object.id);
  });
  const commands: Command[] = counts.slice(0, 3).map((count, mesh) => ({
    count: [36, 36, 18][mesh],
    instanceCount: count,
    firstIndex: [0, 36, 72][mesh],
    baseVertex: 0,
    baseInstance: offsets[mesh],
  }));
  return {
    mask,
    prefix,
    counts,
    offsets,
    visibleIds,
    commands,
    minDistance: counts[3] ? minDistance : null,
    maxDistance: counts[3] ? maxDistance : null,
    minId: counts[3] ? minId : null,
    maxId: counts[3] ? maxId : null,
  };
}

export function moveCamera(
  camera: Camera,
  forwardStep: number,
  rightStep: number,
  upStep: number,
): Camera {
  const axes = basis(camera);
  const movement = add(
    mul(axes.forward, forwardStep),
    add(mul(axes.right, rightStep), { x: 0, y: upStep, z: 0 }),
  );
  const eye = add(camera.eye, movement);
  eye.y = Math.max(1.4, Math.min(eye.y, 1600));
  return { ...camera, eye };
}
