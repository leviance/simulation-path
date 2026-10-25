import { rootFor } from "./data.ts";
import {
  add,
  scale,
  accepts,
  mayOverlap,
  type Box,
  type CloudPoint,
  type Region,
  type Vec3,
} from "./geometry.ts";
export interface CloudResult {
  indices: number[];
  visited: number[];
  pruned: number[];
  candidates: number;
  milliseconds: number;
}
export interface Node {
  bounds: Box;
  depth: number;
  children: number[] | null;
  indices: number[];
}
export const emptyResult = (): CloudResult => ({
  indices: [],
  visited: [],
  pruned: [],
  candidates: 0,
  milliseconds: 0,
});
export function brute(points: readonly CloudPoint[], r: Region) {
  const start = performance.now(),
    result = emptyResult();
  for (let i = 0; i < points.length; i++) {
    result.candidates++;
    if (accepts(r, points[i].position)) result.indices.push(i);
  }
  result.milliseconds = performance.now() - start;
  return result;
}
export class CloudOctree {
  nodes: Node[];
  buildMilliseconds: number;
  readonly points: readonly CloudPoint[];
  readonly capacity: number;
  readonly maximumDepth = 14;
  readonly maximumNodes = 262145;
  constructor(points: readonly CloudPoint[], capacity = 32, split = true) {
    if (!Number.isInteger(capacity) || capacity < 4 || capacity > 128)
      throw Error("Capacity phải nằm trong 4–128");
    const start = performance.now();
    this.points = points;
    this.capacity = capacity;
    this.nodes = [
      { bounds: rootFor(points), depth: 0, children: null, indices: points.map((_, i) => i) },
    ];
    if (split) this.split(0);
    this.buildMilliseconds = performance.now() - start;
  }
  static octant(p: Vec3, m: Vec3) {
    let slot = 0;
    if (p.x >= m.x) slot |= 1;
    if (p.y >= m.y) slot |= 2;
    if (p.z >= m.z) slot |= 4;
    return slot;
  }
  split(index: number) {
    const node = this.nodes[index],
      box = node.bounds,
      middle = scale(add(box.minimum, box.maximum), 0.5);
    if (
      node.indices.length <= this.capacity ||
      node.depth >= this.maximumDepth ||
      (box.maximum.x - box.minimum.x) / 4 < 0.0001 ||
      this.nodes.length + 8 > this.maximumNodes
    )
      return;
    const old = node.indices;
    node.indices = [];
    node.children = [];
    for (let slot = 0; slot < 8; slot++) {
      const child = { minimum: { ...box.minimum }, maximum: { ...box.maximum } };
      if (slot & 1) child.minimum.x = middle.x;
      else child.maximum.x = middle.x;
      if (slot & 2) child.minimum.y = middle.y;
      else child.maximum.y = middle.y;
      if (slot & 4) child.minimum.z = middle.z;
      else child.maximum.z = middle.z;
      node.children.push(this.nodes.length);
      this.nodes.push({ bounds: child, depth: node.depth + 1, children: null, indices: [] });
    }
    for (const i of old)
      this.nodes[node.children[CloudOctree.octant(this.points[i].position, middle)]].indices.push(
        i,
      );
    for (const child of node.children) this.split(child);
  }
  query(r: Region) {
    const start = performance.now(),
      result = emptyResult(),
      pending = [0];
    while (pending.length) {
      const index = pending.pop()!,
        node = this.nodes[index];
      if (!mayOverlap(r, node.bounds)) {
        result.pruned.push(index);
        continue;
      }
      result.visited.push(index);
      if (node.children) pending.push(...node.children);
      else
        for (const i of node.indices) {
          result.candidates++;
          if (accepts(r, this.points[i].position)) result.indices.push(i);
        }
    }
    result.milliseconds = performance.now() - start;
    return result;
  }
}
export function sameIndices(a: CloudResult, b: CloudResult) {
  const first = [...a.indices].sort((a, b) => a - b),
    second = [...b.indices].sort((a, b) => a - b);
  return (
    first.length === second.length &&
    first.every((value, i) => value === second[i] && (i === 0 || value !== first[i - 1]))
  );
}
