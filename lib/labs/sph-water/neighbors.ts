import { dot, subtract, support, type State, type Vec2 } from "./model.ts";
export type Neighborhood = { positions: Vec2[]; lists: number[][]; candidates: number };

export function buildNeighbors(state: State, useGrid: boolean): Neighborhood {
  const positions = [...state.particles.map((p) => p.position), ...state.walls];
  const buckets = new Map<string, number[]>();
  const key = (x: number, y: number) => `${x},${y}`;
  if (useGrid)
    positions.forEach((p, j) => {
      const name = key(Math.floor(p.x / support), Math.floor(p.y / support));
      const bucket = buckets.get(name) ?? [];
      bucket.push(j);
      buckets.set(name, bucket);
    });
  let candidates = 0;
  const lists = state.particles.map((p) => {
    const nearby: number[] = [];
    if (useGrid) {
      const cx = Math.floor(p.position.x / support),
        cy = Math.floor(p.position.y / support);
      for (let y = cy - 1; y <= cy + 1; y++) {
        for (let x = cx - 1; x <= cx + 1; x++) nearby.push(...(buckets.get(key(x, y)) ?? []));
      }
    } else positions.forEach((_, j) => nearby.push(j));
    candidates += nearby.length;
    // Same reduction order as the oracle; the grid changes the search, not the equations.
    return nearby
      .filter((j) => {
        const displacement = subtract(p.position, positions[j]);
        return dot(displacement, displacement) < support * support;
      })
      .sort((a, b) => a - b);
  });
  return { positions, lists, candidates };
}
