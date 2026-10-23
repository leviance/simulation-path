import type { ZScreenVertex, ZVec3 } from "./z-buffer.ts";
import { projectZVertex } from "./z-buffer.ts";
import type { ObjLabMesh, ObjSceneTriangle } from "./obj-types.ts";
import {
  rotateObjPoint,
  objNormalize,
  objCross,
  objDot,
  objSubtract,
  objAdd,
  objScale,
  objShade,
  objWorldToCamera,
  type ObjCamera,
} from "./obj-geometry.ts";
export * from "./obj-types.ts";
export * from "./obj-parser.ts";
export * from "./obj-presets.ts";
export * from "./obj-geometry.ts";

export function objStage(mode?: string) {
  return (
    {
      "obj-vertices": 1,
      "obj-faces": 2,
      "obj-indices": 3,
      "obj-triangulation": 4,
      "obj-normalize": 5,
      "obj-shading": 6,
      "obj-render": 7,
      "obj-validation": 8,
    }[mode ?? "obj-validation"] ?? 8
  );
}

export function clipObjPolygon(input: ZVec3[], nearPlane = 0.7): ZVec3[] {
  const output: ZVec3[] = [];
  if (!input.length) return output;
  let previous = input[input.length - 1];
  for (const current of input) {
    const before = previous.z >= nearPlane;
    const after = current.z >= nearPlane;
    if (before !== after) {
      let start = previous,
        end = current;
      if (start.z > end.z) [start, end] = [end, start];
      const t = (nearPlane - start.z) / (end.z - start.z);
      const hit = objAdd(start, objScale(objSubtract(end, start), t));
      output.push({ ...hit, z: nearPlane });
    }
    if (after) output.push(current);
    previous = current;
  }
  return output;
}

export function objScreenLine(
  a: ZVec3,
  b: ZVec3,
  width: number,
  height: number,
): [ZScreenVertex, ZScreenVertex] | null {
  if (a.z < 0.7 && b.z < 0.7) return null;
  if (a.z < 0.7 || b.z < 0.7) {
    const hit = clipObjPolygon([a, b])[0];
    if (a.z < 0.7) a = hit;
    else b = hit;
  }
  const first = projectZVertex(a, width, height, 0.7, 20);
  const last = projectZVertex(b, width, height, 0.7, 20);
  if (![first.x, first.y, last.x, last.y].every(Number.isFinite)) return null;
  return [first, last];
}

export function buildObjScene(
  mesh: ObjLabMesh,
  width: number,
  height: number,
  angleX: number,
  angleY: number,
  cullBackfaces: boolean,
  camera: ObjCamera = { yaw: 0, pitch: 0, distance: 4.2 },
  stage = 8,
) {
  const cameraPositions = mesh.positions.map((position) => {
    const rotated = rotateObjPoint(position, angleX, angleY);
    return objWorldToCamera(rotated, camera);
  });
  const projectedPositions: ZScreenVertex[] = cameraPositions.map((position) =>
    projectZVertex(position, width, height, 0.7, 20),
  );
  const light = objNormalize(
    objSubtract(
      objWorldToCamera({ x: -0.45, y: -0.75, z: -1 }, camera),
      objWorldToCamera({ x: 0, y: 0, z: 0 }, camera),
    ),
  ) ?? { x: 0, y: 0, z: -1 };
  const base = { red: 92, green: 190, blue: 246 };
  const triangles: ObjSceneTriangle[] = [];
  const edges: [ZScreenVertex, ZScreenVertex][] = [];
  const normalLines: [ZScreenVertex, ZScreenVertex][] = [];
  let clippedCount = 0;

  for (const [sourceTriangle, triangle] of mesh.triangles.entries()) {
    const a = cameraPositions[triangle.indices[0]];
    const b = cameraPositions[triangle.indices[1]];
    const c = cameraPositions[triangle.indices[2]];
    const normal = objNormalize(objCross(objSubtract(b, a), objSubtract(c, a)));
    if (!normal) continue;
    const centroid = objScale(objAdd(objAdd(a, b), c), 1 / 3);
    const frontFacing = objDot(normal, centroid) < 0;
    const intensity = Math.max(0.18, 0.18 + 0.82 * Math.max(0, objDot(normal, light)));
    for (const [start, end] of [
      [a, b],
      [b, c],
      [c, a],
    ]) {
      const line = objScreenLine(start, end, width, height);
      if (line) edges.push(line);
    }
    if (frontFacing) {
      const line = objScreenLine(centroid, objAdd(centroid, objScale(normal, 0.12)), width, height);
      if (line) normalLines.push(line);
    }
    if (stage >= 6 && cullBackfaces && !frontFacing) continue;
    let polygon = [a, b, c];
    if (stage >= 7) {
      if (polygon.some((point) => point.z < 0.7)) clippedCount++;
      polygon = clipObjPolygon(polygon);
    } else if (polygon.some((point) => point.z < 0.7)) continue;
    for (let i = 1; i + 1 < polygon.length; i++) {
      const [screenA, screenB, screenC] = [polygon[0], polygon[i], polygon[i + 1]].map((point) =>
        projectZVertex(point, width, height, 0.7, 20),
      );
      if (![screenA.x, screenB.x, screenC.x].every(Number.isFinite)) continue;
      triangles.push({
        a: screenA,
        b: screenB,
        c: screenC,
        color: objShade(base, intensity),
        face: `face ${triangle.sourceFace}`,
        sourceFace: triangle.sourceFace,
        sourceTriangle,
        normal,
        intensity,
        frontFacing,
      });
    }
  }
  return { cameraPositions, projectedPositions, triangles, edges, normalLines, clippedCount };
}
