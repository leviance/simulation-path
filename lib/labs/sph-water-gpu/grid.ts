import {
  candidateBudget,
  finite,
  length,
  subtract,
  type Particle,
  type Plan,
  type Vec3,
} from "./model.ts";
export function cellCoordinates(plan: Plan, p: Vec3) {
  if (!finite(p) || [p.x, p.y, p.z].some((v) => v < 0 || v > 1))
    throw new RangeError("Particle outside grid");
  return [p.x, p.y, p.z].map((v) => Math.min(plan.cellsAxis - 1, Math.floor(v / plan.support)));
}
export function cellId(plan: Plan, p: Vec3) {
  const [x, y, z] = cellCoordinates(plan, p);
  return x + plan.cellsAxis * (y + plan.cellsAxis * z);
}
export function buildCsr(plan: Plan, particles: Particle[]) {
  const counts = new Uint32Array(plan.cells),
    offsets = new Uint32Array(plan.cells),
    cursors = new Uint32Array(plan.cells);
  for (const p of particles) counts[cellId(plan, p.position)]++;
  let total = 0;
  for (let cell = 0; cell < plan.cells; cell++) {
    offsets[cell] = total;
    total += counts[cell];
  }
  cursors.set(offsets);
  const indices = new Uint32Array(particles.length);
  particles.forEach((p, i) => {
    const cell = cellId(plan, p.position);
    indices[cursors[cell]++] = i;
  });
  return { counts, offsets, indices };
}
export function neighbors(plan: Plan, particles: Particle[], useGrid: boolean) {
  const csr = buildCsr(plan, particles);
  let candidates = 0;
  const lists = particles.map((p) => {
    const list: number[] = [];
    let visited = 0;
    const visit = (i: number) => {
      if (++visited > candidateBudget)
        throw new RangeError("Candidate budget exceeded; no truncated fluid step");
      candidates++;
      if (length(subtract(p.position, particles[i].position)) < plan.support) list.push(i);
    };
    if (!useGrid) particles.forEach((_, i) => visit(i));
    else {
      const [cx, cy, cz] = cellCoordinates(plan, p.position),
        n = plan.cellsAxis;
      for (let z = Math.max(0, cz - 1); z <= Math.min(n - 1, cz + 1); z++)
        for (let y = Math.max(0, cy - 1); y <= Math.min(n - 1, cy + 1); y++)
          for (let x = Math.max(0, cx - 1); x <= Math.min(n - 1, cx + 1); x++) {
            const cell = x + n * (y + n * z),
              end = csr.offsets[cell] + csr.counts[cell];
            for (let slot = csr.offsets[cell]; slot < end; slot++) visit(csr.indices[slot]);
          }
    }
    return list.sort((a, b) => a - b);
  });
  return { lists, candidates, csr };
}
