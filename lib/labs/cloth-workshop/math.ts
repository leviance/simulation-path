export type Vec3 = { x: number; y: number; z: number };
export const add = (a: Vec3, b: Vec3): Vec3 => ({ x: a.x + b.x, y: a.y + b.y, z: a.z + b.z });
export const sub = (a: Vec3, b: Vec3): Vec3 => ({ x: a.x - b.x, y: a.y - b.y, z: a.z - b.z });
export const mul = (a: Vec3, s: number): Vec3 => ({ x: a.x * s, y: a.y * s, z: a.z * s });
export const dot = (a: Vec3, b: Vec3) => a.x * b.x + a.y * b.y + a.z * b.z;
export const cross = (a: Vec3, b: Vec3): Vec3 => ({
  x: a.y * b.z - a.z * b.y,
  y: a.z * b.x - a.x * b.z,
  z: a.x * b.y - a.y * b.x,
});
export const length = (a: Vec3) => Math.hypot(a.x, a.y, a.z);
export const normalize = (a: Vec3) => mul(a, 1 / (length(a) || 1));
export const finite = (a: Vec3) => [a.x, a.y, a.z].every(Number.isFinite);
export const clamp = (x: number, low: number, high: number) => Math.max(low, Math.min(high, x));
export const FRAME_DT = 1 / 60;
export const SUBSTEPS = 2;
export const MAX_CANDIDATES = 400_000;
export type Preset = "hanging" | "drape" | "drop";
export type Kind = "stretch" | "shear" | "bend";
export interface Vertex {
  p: Vec3;
  previous: Vec3;
  predicted: Vec3;
  rest: Vec3;
  v: Vec3;
  normal: Vec3;
  w: number;
}
export interface Constraint {
  a: number;
  b: number;
  rest: number;
  lambda: number;
  kind: Kind;
  color: number;
}
export interface Mesh {
  side: number;
  vertices: Vertex[];
  triangles: number[][];
  constraints: Constraint[];
  colors: number[][];
}
export interface Settings {
  compliance: number;
  damping: number;
  gravity: number;
  wind: number;
  thickness: number;
  iterations: number;
  obstacleX: number;
  selfContact: boolean;
}
export const defaultSettings = (): Settings => ({
  compliance: 0.000002,
  damping: 0.7,
  gravity: 9.81,
  wind: 2.4,
  thickness: 0.025,
  iterations: 6,
  obstacleX: 0,
  selfContact: true,
});
export function validSettings(s: Settings) {
  return (
    Object.values(s)
      .filter((v) => typeof v === "number")
      .every(Number.isFinite) &&
    s.compliance >= 0 &&
    s.compliance <= 0.002 &&
    s.damping >= 0 &&
    s.damping <= 8 &&
    s.gravity >= 0 &&
    s.gravity <= 15 &&
    Math.abs(s.wind) <= 8 &&
    s.thickness >= 0.005 &&
    s.thickness <= 0.045 &&
    Number.isInteger(s.iterations) &&
    s.iterations >= 2 &&
    s.iterations <= 12 &&
    Math.abs(s.obstacleX) <= 1.2
  );
}
export function makeMesh(side = 17, preset: Preset = "hanging"): Mesh {
  if (!Number.isInteger(side) || side < 3 || side > 25)
    throw Error("CPU sample requires 3–25 vertices per edge.");
  const vertices: Vertex[] = [],
    triangles: number[][] = [],
    constraints: Constraint[] = [];
  for (let row = 0; row < side; row++)
    for (let col = 0; col < side; col++) {
      const u = col / (side - 1),
        v = row / (side - 1);
      const rest =
        preset === "hanging"
          ? { x: (u - 0.5) * 3.4, y: 4.4 - 3.2 * v, z: -0.55 }
          : { x: (u - 0.5) * 4.3, y: preset === "drape" ? 3.55 : 4.8, z: (v - 0.5) * 4.3 };
      // A tiny initial perturbation seeds folds; rest lengths remain planar. No time-driven deformation.
      const p = { ...rest, z: rest.z + (preset === "hanging" ? 0.025 * Math.sin(u * 19) * v : 0) };
      const pinned = preset === "hanging" && row === 0 && (col === 0 || col === side - 1);
      vertices.push({
        p,
        previous: { ...p },
        predicted: { ...p },
        rest,
        v: { x: 0, y: 0, z: 0 },
        normal: { x: 0, y: 0, z: 1 },
        w: pinned ? 0 : 1,
      });
    }
  const edge = (a: number, b: number, kind: Kind) =>
    constraints.push({
      a,
      b,
      rest: length(sub(vertices[a].rest, vertices[b].rest)),
      lambda: 0,
      kind,
      color: -1,
    });
  for (let r = 0; r < side; r++)
    for (let c = 0; c < side; c++) {
      const a = r * side + c;
      if (c + 1 < side) edge(a, a + 1, "stretch");
      if (r + 1 < side) edge(a, a + side, "stretch");
      if (r + 1 < side && c + 1 < side) {
        edge(a, a + side + 1, "shear");
        edge(a + 1, a + side, "shear");
        triangles.push([a, a + side, a + 1], [a + 1, a + side, a + side + 1]);
      }
      if (c + 2 < side) edge(a, a + 2, "bend");
      if (r + 2 < side) edge(a, a + 2 * side, "bend");
    }
  // Greedy edge coloring: each color owns disjoint endpoint IDs.
  const used = vertices.map(() => new Set<number>()),
    colors: number[][] = [];
  constraints.forEach((constraint, id) => {
    let color = 0;
    while (used[constraint.a].has(color) || used[constraint.b].has(color)) color++;
    constraint.color = color;
    used[constraint.a].add(color);
    used[constraint.b].add(color);
    (colors[color] ??= []).push(id);
  });
  const mesh = { side, vertices, triangles, constraints, colors };
  updateNormals(mesh);
  return mesh;
}
export function solveDistance(a: Vertex, b: Vertex, c: Constraint, compliance: number, h: number) {
  if (
    ![compliance, h, c.rest, c.lambda, a.w, b.w].every(Number.isFinite) ||
    compliance < 0 ||
    h <= 0 ||
    c.rest < 0 ||
    a.w < 0 ||
    b.w < 0 ||
    !finite(a.p) ||
    !finite(b.p)
  )
    return false;
  const delta = sub(a.p, b.p),
    distance = length(delta),
    sum = a.w + b.w;
  if (sum === 0) return true;
  const n = distance > 1e-10 ? mul(delta, 1 / distance) : { x: 1, y: 0, z: 0 };
  const alpha = compliance / (h * h),
    dlambda = (-(distance - c.rest) - alpha * c.lambda) / (sum + alpha);
  a.p = add(a.p, mul(n, a.w * dlambda));
  b.p = sub(b.p, mul(n, b.w * dlambda));
  c.lambda += dlambda;
  return true;
}
export interface Contact {
  normal: Vec3;
  penetration: number;
}
export function sphereContact(p: Vec3, center: Vec3, radius: number, thickness: number): Contact {
  const delta = sub(p, center),
    d = length(delta);
  return {
    normal: d > 1e-10 ? mul(delta, 1 / d) : { x: 0, y: 1, z: 0 },
    penetration: Math.max(0, radius + thickness - d),
  };
}
export function capsuleContact(
  p: Vec3,
  a: Vec3,
  b: Vec3,
  radius: number,
  thickness: number,
): Contact {
  const ab = sub(b, a),
    d2 = dot(ab, ab),
    t = d2 > 1e-16 ? clamp(dot(sub(p, a), ab) / d2, 0, 1) : 0;
  return sphereContact(p, add(a, mul(ab, t)), radius, thickness);
}
export function obstacleContacts(p: Vec3, s: Settings, preset: Preset): Contact[] {
  const contacts: Contact[] = [
    { normal: { x: 0, y: 1, z: 0 }, penetration: Math.max(0, s.thickness - p.y) },
  ];
  if (preset !== "hanging")
    contacts.push(sphereContact(p, { x: s.obstacleX, y: 1.75, z: 0 }, 1.35, s.thickness));
  if (preset === "drop")
    contacts.push(
      capsuleContact(
        p,
        { x: -1 + s.obstacleX, y: 0.9, z: -1.75 },
        { x: 1 + s.obstacleX, y: 0.9, z: -1.75 },
        0.45,
        s.thickness,
      ),
    );
  return contacts;
}
export interface Grid {
  cellSize: number;
  keys: string[];
  counts: number[];
  offsets: number[];
  ids: number[];
  coordinates: number[][];
  lookup: Map<string, number>;
  vertexCells: number[];
}
const keyOf = (x: number, y: number, z: number) => `${x},${y},${z}`;
export function buildGrid(positions: Vec3[], cellSize: number): Grid {
  if (
    !Number.isFinite(cellSize) ||
    cellSize <= 0 ||
    positions.length > 625 ||
    positions.some((p) => !finite(p))
  )
    throw Error("Invalid bounded CPU grid input.");
  const keys: string[] = [],
    counts: number[] = [],
    coordinates: number[][] = [],
    lookup = new Map<string, number>();
  const vertexCells = positions.map((p) => {
    const xyz = [
      Math.floor(p.x / cellSize),
      Math.floor(p.y / cellSize),
      Math.floor(p.z / cellSize),
    ];
    const key = keyOf(xyz[0], xyz[1], xyz[2]);
    let cell = lookup.get(key);
    if (cell === undefined) {
      cell = keys.length;
      keys.push(key);
      counts.push(0);
      coordinates.push(xyz);
      lookup.set(key, cell);
    }
    counts[cell]++;
    return cell;
  });
  const offsets = [0];
  for (const count of counts) offsets.push(offsets.at(-1)! + count);
  const cursor = offsets.slice(),
    ids = new Array<number>(positions.length);
  vertexCells.forEach((cell, id) => {
    ids[cursor[cell]++] = id;
  });
  return { cellSize, keys, counts, offsets, ids, coordinates, lookup, vertexCells };
}
export function excludedByTopology(a: number, b: number, side: number) {
  return (
    Math.max(
      Math.abs((a % side) - (b % side)),
      Math.abs(Math.floor(a / side) - Math.floor(b / side)),
    ) <= 2
  );
}
export function candidatePairs(grid: Grid, side: number) {
  const pairs: number[][] = [];
  grid.vertexCells.forEach((cell, a) => {
    const [cx, cy, cz] = grid.coordinates[cell];
    for (let z = -1; z <= 1; z++)
      for (let y = -1; y <= 1; y++)
        for (let x = -1; x <= 1; x++) {
          const other = grid.lookup.get(keyOf(cx + x, cy + y, cz + z));
          if (other === undefined) continue;
          for (let slot = grid.offsets[other]; slot < grid.offsets[other + 1]; slot++) {
            const b = grid.ids[slot];
            if (b <= a || excludedByTopology(a, b, side)) continue;
            if (pairs.length >= MAX_CANDIDATES)
              throw Error(
                "Candidate budget exceeded: step rejected, no silent contact truncation.",
              );
            pairs.push([a, b]);
          }
        }
  });
  return pairs;
}
export function contactPairs(positions: Vec3[], pairs: number[][], thickness: number) {
  const diameter2 = (2 * thickness) ** 2;
  return pairs.filter(
    ([a, b]) => dot(sub(positions[a], positions[b]), sub(positions[a], positions[b])) < diameter2,
  );
}
export function updateNormals(mesh: Mesh) {
  for (const vertex of mesh.vertices) vertex.normal = { x: 0, y: 0, z: 0 };
  for (const [a, b, c] of mesh.triangles) {
    const n = cross(
      sub(mesh.vertices[b].p, mesh.vertices[a].p),
      sub(mesh.vertices[c].p, mesh.vertices[a].p),
    );
    for (const id of [a, b, c]) mesh.vertices[id].normal = add(mesh.vertices[id].normal, n);
  }
  for (const vertex of mesh.vertices)
    vertex.normal = length(vertex.normal) > 1e-10 ? normalize(vertex.normal) : { x: 0, y: 1, z: 0 };
}
export interface Drag {
  ids: number[];
  anchor: Vec3;
  target: Vec3;
}
export interface Diagnostics {
  residual: number;
  strain: number;
  penetration: number;
  candidates: number;
  contacts: number;
  grid: Grid;
  pairs: number[][];
}
export function diagnose(mesh: Mesh, s: Settings, preset: Preset): Diagnostics {
  let residual = 0,
    strain = 0,
    penetration = 0;
  for (const c of mesh.constraints) {
    const error = Math.abs(length(sub(mesh.vertices[c.a].p, mesh.vertices[c.b].p)) - c.rest);
    residual = Math.max(residual, error);
    if (c.kind === "stretch") strain = Math.max(strain, error / c.rest);
  }
  for (const v of mesh.vertices)
    if (v.w > 0)
      for (const contact of obstacleContacts(v.p, s, preset))
        penetration = Math.max(penetration, contact.penetration);
  const positions = mesh.vertices.map((v) => v.p),
    grid = buildGrid(positions, 2 * s.thickness),
    candidates = candidatePairs(grid, mesh.side),
    pairs = contactPairs(positions, candidates, s.thickness);
  return {
    residual,
    strain,
    penetration,
    candidates: candidates.length,
    contacts: pairs.length,
    grid,
    pairs,
  };
}
export function stepMesh(
  mesh: Mesh,
  s: Settings,
  preset: Preset,
  drag: Drag | null = null,
  frameDt = FRAME_DT,
) {
  if (!validSettings(s) || !Number.isFinite(frameDt) || frameDt <= 0 || frameDt > 1 / 30)
    throw Error("Invalid solver settings or timestep.");
  const h = frameDt / SUBSTEPS;
  for (let substep = 0; substep < SUBSTEPS; substep++) {
    for (const v of mesh.vertices) {
      v.previous = { ...v.p };
      if (v.w === 0) {
        v.v = { x: 0, y: 0, z: 0 };
        v.predicted = { ...v.p };
        continue;
      }
      v.v = mul(
        add(v.v, { x: s.wind * 0.12 * h, y: -s.gravity * h, z: s.wind * h }),
        Math.exp(-s.damping * h),
      );
      v.p = add(v.p, mul(v.v, h));
      v.predicted = { ...v.p };
    }
    // XPBD multipliers have substep scope, not iteration scope.
    for (const c of mesh.constraints) c.lambda = 0;
    for (let iteration = 0; iteration < s.iterations; iteration++) {
      for (const color of mesh.colors)
        for (const id of color) {
          const c = mesh.constraints[id],
            compliance = s.compliance * (c.kind === "bend" ? 40 : c.kind === "shear" ? 2 : 1);
          solveDistance(mesh.vertices[c.a], mesh.vertices[c.b], c, compliance, h);
        }
      if (s.selfContact) {
        const positions = mesh.vertices.map((v) => v.p),
          grid = buildGrid(positions, 2 * s.thickness);
        for (const [a, b] of contactPairs(
          positions,
          candidatePairs(grid, mesh.side),
          s.thickness,
        )) {
          const va = mesh.vertices[a],
            vb = mesh.vertices[b],
            delta = sub(va.p, vb.p),
            distance = length(delta),
            sum = va.w + vb.w;
          if (!sum) continue;
          const n = distance > 1e-10 ? mul(delta, 1 / distance) : { x: 0, y: 0, z: 1 },
            correction = (2 * s.thickness - distance) / sum;
          va.p = add(va.p, mul(n, correction * va.w));
          vb.p = sub(vb.p, mul(n, correction * vb.w));
        }
      }
      if (drag) {
        const delta = sub(drag.target, drag.anchor),
          movement = mul(delta, Math.min(1, (6 * h) / (length(delta) || 1)));
        for (const id of drag.ids)
          if (mesh.vertices[id]?.w > 0)
            mesh.vertices[id].p = add(mesh.vertices[id].p, mul(movement, 1 / s.iterations));
      }
      // Contacts last: the current output is outside analytic obstacles; vertex model is not CCD.
      for (const v of mesh.vertices)
        if (v.w > 0)
          for (const contact of obstacleContacts(v.p, s, preset))
            if (contact.penetration > 0) v.p = add(v.p, mul(contact.normal, contact.penetration));
    }
    if (drag)
      drag.anchor = add(
        drag.anchor,
        mul(
          sub(drag.target, drag.anchor),
          Math.min(1, (6 * h) / (length(sub(drag.target, drag.anchor)) || 1)),
        ),
      );
    for (const v of mesh.vertices)
      if (v.w > 0) {
        v.p = { x: clamp(v.p.x, -5, 5), y: clamp(v.p.y, s.thickness, 8), z: clamp(v.p.z, -5, 5) };
        v.v = mul(sub(v.p, v.previous), 1 / h);
        // Coulomb-like tangent attenuation at analytic contact: 12 s^-1; distinct from bulk damping.
        for (const contact of obstacleContacts(
          v.p,
          { ...s, thickness: s.thickness + 1e-6 },
          preset,
        ))
          if (contact.penetration > 0 && dot(v.v, contact.normal) < 0)
            v.v = mul(sub(v.v, mul(contact.normal, dot(v.v, contact.normal))), Math.exp(-12 * h));
      }
  }
  updateNormals(mesh);
  if (mesh.vertices.some((v) => !finite(v.p) || !finite(v.v)))
    throw Error("Nonfinite solver state; reset required.");
  return diagnose(mesh, s, preset);
}
