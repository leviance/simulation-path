import { type Vec3, magnitude3 } from "./normal.ts";
import { type EulerAngles } from "./rotation3d.ts";
import { applyMouseDrag, advanceRotation, wrapRotationAngle } from "./rotation3d-scene.ts";
import {
  type PointProjection,
  type PointViewport,
  projectPerspective,
  worldToCamera,
  validLens,
  finitePoint,
  ndcToPointScreen,
  clipPointDepth,
  clipPointScreen,
} from "./projection-point.ts";
import {
  CUBE_EDGES,
  makeCubeVertices,
  rotateCubeVertices,
  translateCubeVertices,
  maximumCubeEdgeLengthError,
  cubeRotationRoundTripError,
} from "./wireframe-cube.ts";
import { type RotationScene, initialRotationScene } from "./rotation3d-scene.ts";

export interface CubeScene extends RotationScene {
  halfExtent: number;
  zoom: number;
  projection: "perspective" | "orthographic";
  depthCue: boolean;
}
export const cubeViewport = (): PointViewport => ({ x: 0, y: 0, width: 1100, height: 800 });
export const initialCubeScene = (): CubeScene => ({
  ...initialRotationScene(),
  angles: { pitch: 0.3, yaw: 0.5, roll: 0 },
  halfExtent: 1.2,
  zoom: 1,
  projection: "perspective",
  depthCue: true,
});
export const cubeStage = (mode?: string): number =>
  ({
    "cube-vertices": 1,
    "cube-edges": 2,
    "cube-transform": 3,
    "cube-projection": 4,
    "cube-input": 5,
    "cube-depth": 6,
    "cube-validation": 7,
  })[mode ?? "cube-validation"] ?? 7;
export function cubePreset(index: number): CubeScene {
  const s = initialCubeScene();
  if (index === 1) s.angles = { pitch: 0, yaw: 0, roll: 0 };
  if (index === 2) s.position.z = 10;
  if (index === 3) s.position.z = 0.7;
  if (index === 4) s.position = { x: 5, y: 0, z: 3 };
  return s;
}
export function projectCubeVertex(world: Vec3, scene: CubeScene): PointProjection {
  const v = cubeViewport(),
    lens = scene.lens;
  const invalid: PointProjection = {
    status: "invalid",
    cameraPoint: { x: 0, y: 0, z: 0 },
    ndc: null,
    screen: null,
  };
  if (
    !finitePoint(world) ||
    !finitePoint(scene.camera.position) ||
    !validLens(lens, v) ||
    !Number.isFinite(scene.zoom) ||
    scene.zoom < 0.5 ||
    scene.zoom > 2
  )
    return invalid;
  if (scene.projection === "perspective") {
    return projectPerspective(
      world,
      scene.camera,
      {
        ...lens,
        verticalFovRadians: 2 * Math.atan(Math.tan(lens.verticalFovRadians * 0.5) / scene.zoom),
      },
      v,
    );
  }
  const p = worldToCamera(world, scene.camera);
  if (!finitePoint(p)) return invalid;
  const result: PointProjection = { ...invalid, cameraPoint: p };
  if (p.z <= 0) return { ...result, status: "behind" };
  if (p.z < lens.nearPlane) return { ...result, status: "before-near" };
  if (p.z > lens.farPlane) return { ...result, status: "beyond-far" };
  const halfHeight = (6 * Math.tan(lens.verticalFovRadians * 0.5)) / scene.zoom;
  const ndc = { x: p.x / ((halfHeight * v.width) / v.height), y: p.y / halfHeight };
  const screen = ndcToPointScreen(ndc, v);
  if (![ndc.x, ndc.y, screen.x, screen.y].every(Number.isFinite)) return result;
  return {
    status: Math.abs(ndc.x) <= 1 && Math.abs(ndc.y) <= 1 ? "visible" : "outside",
    cameraPoint: p,
    ndc,
    screen,
  };
}
export function cubeSegment(
  a: PointProjection,
  b: PointProjection,
  scene: CubeScene,
  stats?: { extraProjections: number },
) {
  if (a.status === "invalid" || b.status === "invalid") return null;
  const clipped = clipPointDepth(a.cameraPoint, b.cameraPoint, scene.lens);
  if (!clipped) return null;
  let from = a.screen,
    to = b.screen,
    extraProjections = 0;
  if (!from || !to) {
    const cameraScene = { ...scene, camera: { position: { x: 0, y: 0, z: 0 } } };
    from = projectCubeVertex(clipped[0], cameraScene).screen;
    to = projectCubeVertex(clipped[1], cameraScene).screen;
    extraProjections = 2;
    if (stats) stats.extraProjections += 2;
  }
  if (!from || !to) return null;
  const screen = clipPointScreen(from, to, cubeViewport());
  if (!screen) return null;
  return {
    from: screen[0],
    to: screen[1],
    averageDepth: (clipped[0].z + clipped[1].z) * 0.5,
    extraProjections,
  };
}
export function cubeResults(scene: CubeScene, stage: number) {
  const active = {
    ...scene,
    projection: stage >= 4 ? scene.projection : ("perspective" as const),
    zoom: stage >= 5 ? scene.zoom : 1,
  };
  const angles = stage >= 3 ? scene.angles : { pitch: 0, yaw: 0, roll: 0 };
  const local = makeCubeVertices(scene.halfExtent);
  const rotated = rotateCubeVertices(local, angles, scene.order);
  const world = translateCubeVertices(rotated, scene.position);
  const vertices = world.map((p) => projectCubeVertex(p, active));
  const stats = { extraProjections: 0 };
  const edges =
    stage < 2
      ? []
      : CUBE_EDGES.flatMap((edge, edgeIndex) => {
          const segment = cubeSegment(vertices[edge.from], vertices[edge.to], active, stats);
          if (!segment) return [];
          return [{ ...segment, edgeIndex, depthFactor: 1 }];
        });
  if (stage >= 6 && edges.length > 0) {
    edges.sort((a, b) => b.averageDepth - a.averageDepth);
    const far = edges[0].averageDepth,
      near = edges[edges.length - 1].averageDepth;
    for (const edge of edges)
      edge.depthFactor = far - near > 1e-12 ? (far - edge.averageDepth) / (far - near) : 1;
  }
  return {
    active,
    local,
    rotated,
    world,
    vertices,
    edges,
    projectionCount: vertices.length,
    extraProjections: stats.extraProjections,
    edgeError: maximumCubeEdgeLengthError(local, rotated),
    roundTrip: cubeRotationRoundTripError(local, angles, scene.order),
  };
}
export function changeCubeAngle(
  scene: CubeScene,
  axis: keyof EulerAngles,
  value: number,
): CubeScene {
  if (!Number.isFinite(value)) return scene;
  return { ...scene, paused: true, angles: { ...scene.angles, [axis]: wrapRotationAngle(value) } };
}
export function moveCube(scene: CubeScene, direction: Vec3, dt: number): CubeScene {
  const length = magnitude3(direction);
  if (!finitePoint(direction) || !Number.isFinite(dt) || dt <= 0 || length <= 0) return scene;
  const scale = (2 * Math.min(dt, 0.1)) / length;
  return {
    ...scene,
    paused: true,
    position: {
      x: Math.max(-6, Math.min(6, scene.position.x + direction.x * scale)),
      y: Math.max(-6, Math.min(6, scene.position.y + direction.y * scale)),
      z: Math.max(0.1, Math.min(15, scene.position.z + direction.z * scale)),
    },
  };
}
export function setCubePosition(scene: CubeScene, axis: keyof Vec3, value: number): CubeScene {
  if (!Number.isFinite(value)) return scene;
  const min = axis === "z" ? 0.1 : -6,
    max = axis === "z" ? 15 : 6;
  return {
    ...scene,
    paused: true,
    position: { ...scene.position, [axis]: Math.max(min, Math.min(max, value)) },
  };
}
export function zoomCube(scene: CubeScene, steps: number): CubeScene {
  if (!Number.isFinite(steps)) return scene;
  return {
    ...scene,
    paused: true,
    zoom: Math.max(
      0.5,
      Math.min(2, scene.zoom * Math.exp(Math.max(-20, Math.min(20, steps)) * 0.12)),
    ),
  };
}
export function dragCube(scene: CubeScene, dx: number, dy: number): CubeScene {
  return {
    ...scene,
    paused: true,
    angles: applyMouseDrag(scene.angles, dx, dy, scene.sensitivity),
  };
}
export function advanceCube(scene: CubeScene, dt: number): CubeScene {
  return { ...scene, angles: advanceRotation(scene, dt).angles };
}
export function cubeDirection(keys: ReadonlySet<string>): Vec3 {
  const direction = { x: 0, y: 0, z: 0 };
  if (keys.has("a")) direction.x -= 1;
  if (keys.has("d")) direction.x += 1;
  if (keys.has("q")) direction.y -= 1;
  if (keys.has("e")) direction.y += 1;
  if (keys.has("s")) direction.z -= 1;
  if (keys.has("w")) direction.z += 1;
  return direction;
}
