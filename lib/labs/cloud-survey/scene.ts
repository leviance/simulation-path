import { makeRoom } from "./data.ts";
import { readCsv, writeCsv } from "./csv.ts";
import { add, scale, region, type Box, type Vec3, type CloudPoint } from "./geometry.ts";
import { CloudOctree, brute, emptyResult, type CloudResult } from "./octree.ts";
import { resetCamera, cameraFrustum, type Camera } from "./camera.ts";

export const cloudModes = [
  "cloud-csv",
  "cloud-camera",
  "cloud-regions",
  "cloud-build",
  "cloud-query",
  "cloud-frustum",
  "cloud-statistics",
  "cloud-export",
  "cloud-validation",
  "cloud-performance",
  "cloud-final",
] as const;
export interface Statistics {
  count: number;
  bounds: Box | null;
  centroid: Vec3 | null;
}
export interface CloudScene {
  stage: number;
  points: CloudPoint[];
  tree: CloudOctree;
  camera: Camera;
  region: ReturnType<typeof region>;
  selected: CloudResult;
  visible: CloudResult;
  summary: Statistics;
  selectionEnabled: boolean;
  useTree: boolean;
  culling: boolean;
  debug: boolean;
  width: number;
  height: number;
  count: number;
  uniform: boolean;
  origin: "room" | "uniform" | "csv";
  notice: string;
  renderMilliseconds: number;
  drawn: number;
}
export function statistics(points: readonly CloudPoint[], indices: readonly number[]): Statistics {
  if (!indices.length) return { count: 0, bounds: null, centroid: null };
  const first = points[indices[0]].position,
    minimum = { ...first },
    maximum = { ...first };
  let sum = { x: 0, y: 0, z: 0 };
  for (const index of indices) {
    const p = points[index].position;
    sum = add(sum, p);
    for (const axis of ["x", "y", "z"] as const) {
      minimum[axis] = Math.min(minimum[axis], p[axis]);
      maximum[axis] = Math.max(maximum[axis], p[axis]);
    }
  }
  return {
    count: indices.length,
    bounds: { minimum, maximum },
    centroid: scale(sum, 1 / indices.length),
  };
}
export function createCloudScene(
  stage = 11,
  count = 100000,
  uniform = false,
  input?: string,
): CloudScene {
  const points = readCsv(input ?? writeCsv(makeRoom(count, 30, uniform)));
  const tree = new CloudOctree(points, 32, stage >= 4);
  const scene: CloudScene = {
    stage,
    points,
    tree,
    camera: resetCamera(tree.nodes[0].bounds),
    region: region(),
    selected: emptyResult(),
    visible: emptyResult(),
    summary: { count: 0, bounds: null, centroid: null },
    selectionEnabled: false,
    useTree: stage >= 5,
    culling: stage >= 6,
    debug: false,
    width: 760,
    height: 420,
    count: points.length,
    uniform,
    origin: input !== undefined ? "csv" : uniform ? "uniform" : "room",
    notice: `Đã mở ${points.length.toLocaleString("vi-VN")} điểm; đơn vị mét.`,
    renderMilliseconds: 0,
    drawn: 0,
  };
  refreshCloud(scene);
  return scene;
}
export function refreshCloud(scene: CloudScene) {
  scene.selected = emptyResult();
  if (scene.stage >= 3 && scene.selectionEnabled)
    scene.selected = scene.useTree
      ? scene.tree.query(scene.region)
      : brute(scene.points, scene.region);
  scene.summary = statistics(scene.points, scene.selected.indices);
  const frustum = cameraFrustum(scene.camera, scene.width / scene.height);
  frustum.minimumHeight = scene.region.minimumHeight;
  frustum.maximumHeight = scene.region.maximumHeight;
  scene.visible = scene.culling ? scene.tree.query(frustum) : brute(scene.points, frustum);
}
export function selectedPoints(scene: CloudScene) {
  return scene.selected.indices.map((index) => scene.points[index]).sort((a, b) => a.id - b.id);
}
export function exportCloud(scene: CloudScene) {
  const points = selectedPoints(scene),
    csv = writeCsv(points),
    restored = readCsv(csv);
  const matches =
    restored.length === points.length &&
    restored.every(
      (p, i) =>
        p.id === points[i].id &&
        ["x", "y", "z"].every(
          (axis) => p.position[axis as keyof Vec3] === points[i].position[axis as keyof Vec3],
        ),
    );
  return { csv, matches, count: restored.length };
}
