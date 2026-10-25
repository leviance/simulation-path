import { add, scale, contains, type Region } from "./geometry.ts";
import { region } from "./geometry.ts";
import { cameraFrustum } from "./camera.ts";
import { brute, sameIndices, type CloudOctree } from "./octree.ts";
import type { CloudScene } from "./scene.ts";

export interface CloudJob {
  tree: CloudOctree;
  active: boolean;
  paused: boolean;
  benchmark: boolean;
  useTree: boolean;
  regions: Region[];
  queryIndex: number;
  iteration: number;
  errors: number;
  checksum: bigint;
  batchMilliseconds: number;
  samples: number[];
  report: string;
}
export function topologyErrors(tree: CloudOctree) {
  let errors = 0;
  const reached = new Set<number>(),
    counts = new Uint32Array(tree.points.length),
    pending = [0];
  while (pending.length) {
    const index = pending.pop()!;
    if (!tree.nodes[index] || reached.has(index)) {
      errors++;
      continue;
    }
    reached.add(index);
    const node = tree.nodes[index];
    if (node.depth > tree.maximumDepth) errors++;
    if (node.children) {
      if (node.indices.length || node.children.length !== 8) errors++;
      for (const child of node.children) {
        if (tree.nodes[child]?.depth !== node.depth + 1) errors++;
        pending.push(child);
      }
    }
    for (const i of node.indices) {
      if (!tree.points[i]) {
        errors++;
        continue;
      }
      counts[i]++;
      if (!contains(node.bounds, tree.points[i].position)) errors++;
    }
  }
  for (const count of counts) if (count !== 1) errors++;
  return errors + tree.nodes.length - reached.size;
}
export function validationRegions(tree: CloudOctree) {
  const b = tree.nodes[0].bounds,
    center = scale(add(b.minimum, b.maximum), 0.5),
    half = scale(
      { x: b.maximum.x - b.minimum.x, y: b.maximum.y - b.minimum.y, z: b.maximum.z - b.minimum.z },
      0.5,
    ),
    regions: Region[] = [];
  let seed = 3009;
  const next = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  for (let i = 0; i < 32; i++) {
    const r = region();
    r.center = add(center, {
      x: (next() - 0.5) * half.x * 2,
      y: (next() - 0.5) * half.y * 2,
      z: (next() - 0.5) * half.z * 2,
    });
    r.half = scale(half, 0.2);
    r.radius = half.x * 0.3;
    if (i % 2) r.shape = "sphere";
    if (i % 3 === 0) r.minimumHeight = center.y;
    regions.push(r);
  }
  const whole = region();
  whole.center = center;
  whole.half = half;
  regions.push(whole);
  regions.push({ ...whole, center: add(b.maximum, { x: 100, y: 100, z: 100 }) });
  return regions;
}
export function startJob(scene: CloudScene, benchmark = false): CloudJob {
  let regions = validationRegions(scene.tree);
  if (benchmark) regions = regions.slice(0, 16);
  else
    regions = [scene.region, ...regions, cameraFrustum(scene.camera, scene.width / scene.height)];
  const errors = topologyErrors(scene.tree);
  return {
    tree: scene.tree,
    active: errors === 0,
    paused: false,
    benchmark,
    useTree: true,
    regions,
    queryIndex: 0,
    iteration: 0,
    errors,
    checksum: BigInt(0),
    batchMilliseconds: 0,
    samples: [],
    report: errors === 0 ? "" : `Topology: ${errors} lỗi; không bắt đầu query.`,
  };
}
export function tickJob(job: CloudJob, scene: CloudScene) {
  if (!job.active || job.paused) return;
  if (job.tree !== scene.tree) {
    job.active = false;
    job.report = "Dataset đã đổi; hủy kết quả cũ.";
    return;
  }
  const start = performance.now();
  do {
    const r = job.regions[job.queryIndex];
    if (!job.benchmark) {
      if (!sameIndices(scene.tree.query(r), brute(scene.points, r))) job.errors++;
      if (++job.queryIndex === job.regions.length) {
        job.active = false;
        job.report = `Reference: ${job.queryIndex} query · ${job.errors} lỗi · hoàn tất`;
      }
    } else {
      const result = job.useTree ? scene.tree.query(r) : brute(scene.points, r);
      job.batchMilliseconds += result.milliseconds;
      for (const index of result.indices) {
        job.checksum += BigInt(scene.points[index].id) + BigInt(1);
      }
      if (++job.queryIndex === job.regions.length) {
        if (job.iteration >= 2) job.samples.push(job.batchMilliseconds);
        job.queryIndex = 0;
        job.batchMilliseconds = 0;
        if (++job.iteration === 7) {
          const sorted = [...job.samples].sort((a, b) => a - b);
          job.report += `${job.useTree ? "Tree" : "Brute"}: median/min/max ${sorted[2].toFixed(3)}/${sorted[0].toFixed(3)}/${sorted[4].toFixed(3)} ms/16 query; checksum ${job.checksum}. `;
          if (!job.useTree) job.active = false;
          job.useTree = false;
          job.iteration = 0;
          job.samples = [];
          job.checksum = BigInt(0);
        }
      }
    }
  } while (job.active && performance.now() - start < 6);
}
