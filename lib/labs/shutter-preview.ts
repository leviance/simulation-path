/** Mặt cắt dọc song song nắng. Z từ cửa vào phòng; Y hướng lên, đơn vị mét. */
export interface CutPoint {
  z: number;
  y: number;
}
export interface ShutterConfig {
  tilt: number;
  sun: number;
  boxX: number;
  sliceX: number;
}
export const defaultElevation = (Math.atan2(0.78, 0.86) * 180) / Math.PI;
export const sunHorizontalSlope = 0.32 / 0.86;
export const lightPlaneOffset = 12; // Trước cả điểm cao nhất của bức tường native (10 m).
export const presets = { open: 42, half: 23, closed: -38 } as const;
export const room = { depth: 8, height: 4.65, sill: 1.1, lintel: 3.85 } as const;
export function initialShutter(): ShutterConfig {
  return { tilt: presets.half, sun: 0, boxX: 0.35, sliceX: -0.35 };
}
type Kind = "blade" | "wall" | "crate" | "floor" | "end";
type Edge = { a: CutPoint; b: CutPoint; kind: Kind; index: number };
export type Blocker = { kind: Kind; index: number; t: number; p: CutPoint };
export type Probe = { surface: "floor" | "top" | "near" | "far"; t: number };
const eps = 1e-7;
const point = (z: number, y: number): CutPoint => ({ z, y });
const minus = (a: CutPoint, b: CutPoint) => point(a.z - b.z, a.y - b.y);
const cross = (a: CutPoint, b: CutPoint) => a.z * b.y - a.y * b.z;
const dot = (a: CutPoint, b: CutPoint) => a.z * b.z + a.y * b.y;
const along = (o: CutPoint, d: CutPoint, t: number) => point(o.z + t * d.z, o.y + t * d.y);
const clamp = (x: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, x));

/** Giao của tia với đoạn thẳng, kể cả khi chạm đầu đoạn. */
export function raySegment(origin: CutPoint, dir: CutPoint, a: CutPoint, b: CutPoint) {
  const axis = minus(b, a),
    offset = minus(a, origin),
    det = cross(dir, axis);
  if (Math.abs(det) < eps) return null;
  const t = cross(offset, axis) / det,
    u = cross(offset, dir) / det;
  return t >= eps && u >= -eps && u <= 1 + eps ? t : null;
}

export function makeSection(scene: ShutterConfig, withBlades = true) {
  const rad = Math.PI / 180,
    a = scene.tilt * rad,
    yaw = clamp(scene.sun, -30, 30) * rad;
  const intoX = 0.32 * Math.cos(yaw) + 0.86 * Math.sin(yaw),
    intoZ = 0.86 * Math.cos(yaw) - 0.32 * Math.sin(yaw);
  const slopeX = intoX / intoZ,
    h = Math.atan2(0.78, intoZ);
  const long = point(Math.cos(a), -Math.sin(a)),
    short = point(Math.sin(a), Math.cos(a));
  const direction = point(Math.cos(h), -Math.sin(h)),
    transverse = point(Math.sin(h), Math.cos(h));
  const surfaces: Edge[] = [],
    endpoints: CutPoint[] = [];
  const edge = (a: CutPoint, b: CutPoint, kind: Kind, index = 0) => {
    surfaces.push({ a, b, kind, index });
    endpoints.push(a, b);
  };
  const polygon = (corners: CutPoint[], kind: Kind, index = 0) =>
    corners.forEach((p, i) => edge(p, corners[(i + 1) % corners.length], kind, index));
  const slats: CutPoint[][] = [];
  // Lát cắt song song với tia thực; tỉ lệ trôi theo X thay đổi khi xoay nắng.
  const windowInSlice = Math.abs(scene.sliceX) < 2.45;
  if (windowInSlice) {
    edge(point(0, 0), point(0, room.sill), "wall");
    edge(point(0, room.lintel), point(0, 10), "wall");
    for (let i = 0; withBlades && i < 8; i++) {
      const center = point(0, 1.27 + 0.345 * i);
      const corners = [
        [1, 1],
        [-1, 1],
        [-1, -1],
        [1, -1],
      ].map(([u, v]) => along(along(center, long, u * 0.155), short, v * 0.021));
      slats.push(corners);
      polygon(corners, "blade", i + 1);
    }
  } else edge(point(0, 0), point(0, 10), "wall");
  edge(point(0, 0), point(room.depth, 0), "floor");
  edge(point(room.depth, 0), point(room.depth, room.height), "end");
  const crossing =
    Math.abs(slopeX) > eps
      ? [
          (scene.boxX - 0.5 - scene.sliceX) / slopeX,
          (scene.boxX + 0.5 - scene.sliceX) / slopeX,
        ].sort((u, v) => u - v)
      : Math.abs(scene.boxX - scene.sliceX) <= 0.5
        ? [-Infinity, Infinity]
        : [Infinity, -Infinity];
  const near = Math.max(1.7, crossing[0]),
    far = Math.min(2.7, crossing[1]);
  const crate = far - near > eps ? { near, far, height: 1 } : null;
  if (crate) polygon([point(near, 0), point(near, 1), point(far, 1), point(far, 0)], "crate");
  return {
    scene,
    direction,
    transverse,
    surfaces,
    endpoints,
    slats,
    crate,
    windowInSlice,
    slopeX,
    elevation: h / rad,
    sunY: 0.78 / Math.hypot(intoX, 0.78, intoZ),
  };
}
export type Section = ReturnType<typeof makeSection>;

function firstHit(
  section: Section,
  origin: CutPoint,
  direction: CutPoint,
  clipViewport = false,
): Blocker | null {
  let nearest: Blocker | null = null;
  for (const face of section.surfaces) {
    if (face.kind === "end" && !clipViewport) continue;
    const t = raySegment(origin, direction, face.a, face.b);
    if (t !== null && (!nearest || t < nearest.t))
      nearest = { kind: face.kind, index: face.index, t, p: along(origin, direction, t) };
  }
  return nearest;
}

export function probePoint(section: Section, probe: Probe): CutPoint {
  const q = clamp(probe.t, 0, 1),
    crate = section.crate;
  if (probe.surface === "floor" || !crate) {
    let z = q * room.depth;
    if (crate && z >= crate.near && z <= crate.far)
      z = z < (crate.near + crate.far) / 2 ? crate.near - 0.0001 : crate.far + 0.0001;
    return point(z, 0);
  }
  if (probe.surface === "top") return point(crate.near + q * (crate.far - crate.near), 1);
  return point(probe.surface === "near" ? crate.near : crate.far, q);
}

export function nearestProbe(section: Section, p: CutPoint): Probe {
  const c = section.crate;
  const candidates: Probe[] = [{ surface: "floor", t: clamp(p.z / room.depth, 0, 1) }];
  if (c)
    candidates.push(
      { surface: "top", t: clamp((p.z - c.near) / (c.far - c.near), 0, 1) },
      { surface: "near", t: clamp(p.y, 0, 1) },
      { surface: "far", t: clamp(p.y, 0, 1) },
    );
  let best = candidates[0],
    distance = Infinity;
  for (const candidate of candidates) {
    const delta = minus(probePoint(section, candidate), p),
      square = dot(delta, delta);
    if (square < distance) {
      best = candidate;
      distance = square;
    }
  }
  return best;
}

export function traceProbe(section: Section, p: CutPoint) {
  const toward = point(-section.direction.z, -section.direction.y);
  const next = along(p, toward, 1e-5),
    crate = section.crate;
  const entersBox = crate && next.z > crate.near && next.z < crate.far && next.y > 0 && next.y < 1;
  const startsInWall = Math.abs(p.z) < eps && (p.y < room.sill || p.y > room.lintel);
  const hit: Blocker | null =
    entersBox || startsInWall
      ? { kind: entersBox ? "crate" : "wall", index: 0, t: 0, p }
      : firstHit(section, p, toward);
  const outside = along(p, toward, (p.z + 0.62) / -toward.z);
  return {
    lit: !hit,
    hit,
    end: hit?.p ?? outside,
    u: dot(p, section.transverse),
    depth: lightPlaneOffset + dot(p, section.direction),
  };
}

// Độ sâu tính từ mặt phẳng nguồn, theo mét trong hình chiếu Z/Y, không phải NDC.
function incoming(section: Section, u: number, clipViewport = false) {
  const d = section.direction,
    origin = along(point(-lightPlaneOffset * d.z, -lightPlaneOffset * d.y), section.transverse, u);
  return firstHit(section, origin, d, clipViewport);
}
const isReceiver = (hit: Blocker | null) =>
  hit && (hit.kind === "floor" || hit.kind === "crate" || hit.kind === "end");

/** Các dải tia thật đi qua khe; mỗi dải dừng ở mặt đất hoặc mặt thùng gặp đầu tiên. */
export function sunlightBands(section: Section) {
  if (!section.windowInSlice) return [];
  const lo = room.sill * section.transverse.y,
    hi = room.lintel * section.transverse.y;
  const breaks = [
    lo,
    hi,
    ...section.endpoints.map((p) => dot(p, section.transverse)).filter((u) => u > lo && u < hi),
  ].sort((a, b) => a - b);
  const bands: {
    polygon: CutPoint[];
    from: CutPoint;
    to: CutPoint;
    receiver: Kind;
    width: number;
  }[] = [];
  for (let i = 1; i < breaks.length; i++) {
    const a = breaks[i - 1],
      b = breaks[i],
      width = b - a;
    if (width < 1e-5 || !isReceiver(incoming(section, (a + b) / 2, true))) continue;
    const inset = Math.min(width * 0.001, 0.00001),
      h1 = incoming(section, a + inset, true),
      h2 = incoming(section, b - inset, true);
    if (!h1 || !h2 || h1.kind !== h2.kind) continue;
    bands.push({
      polygon: [point(0, a / section.transverse.y), point(0, b / section.transverse.y), h2.p, h1.p],
      from: h1.p,
      to: h2.p,
      receiver: h1.kind,
      width,
    });
  }
  return bands;
}

export function makeDepthStrip(section: Section, count = 96) {
  const low = -0.05,
    high = room.depth * section.transverse.z + room.height * section.transverse.y + 0.05;
  const bins = Math.max(8, Math.min(1024, Math.round(count)));
  const values = Array.from(
    { length: bins },
    (_, i) => incoming(section, low + ((i + 0.5) * (high - low)) / bins)?.t ?? null,
  );
  return { low, high, bins, values };
}
export type DepthStrip = ReturnType<typeof makeDepthStrip>;
export function compareDepth(section: Section, strip: DepthStrip, p: CutPoint, bias: number) {
  const reading = traceProbe(section, p);
  const bin = Math.floor(((reading.u - strip.low) / (strip.high - strip.low)) * strip.bins);
  // Giống shader: ngoài bản đồ coi như sáng, không mượn giá trị ô biên.
  if (bin < 0 || bin >= strip.bins)
    return { ...reading, bin: -1, nearest: null, mapLit: true, filtered: 1 };
  const nearest = strip.values[bin];
  const compare = (i: number) => {
    if (i < 0 || i >= strip.bins) return 1;
    const depth = strip.values[i];
    return Number(depth === null || reading.depth <= depth + bias);
  };
  return {
    ...reading,
    bin,
    nearest,
    mapLit: compare(bin) === 1,
    filtered: (compare(bin - 1) + compare(bin) + compare(bin + 1)) / 3,
  };
}

export type ReferenceSpot = "slat" | "gap" | "crate";
export function referenceSpot(which: ReferenceSpot) {
  const z = ((which === "slat" ? 2.305 : 2.4775) * 0.86) / 0.78,
    x = which === "crate" ? 1.03 : -0.8;
  return {
    scene: { ...initialShutter(), sliceX: x - sunHorizontalSlope * z },
    probe: { surface: "floor" as const, t: z / room.depth },
  };
}
