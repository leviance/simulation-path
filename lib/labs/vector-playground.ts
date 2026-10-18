import {
  add,
  subtract,
  scale,
  length,
  lerp,
  clamp,
  type Point,
  type ViewportSize,
} from "./geometry.ts";

export type VectorScene = {
  vectorA: Point;
  vectorB: Point;
  selected: 0 | 1;
  dragged: -1 | 0 | 1;
  grabOffset: Point;
  scalar: number;
  interpolation: number;
  viewMode: "arithmetic" | "scalar" | "unit" | "lerp" | "all";
};
export const vectorPresets: Record<string, [Point, Point]> = {
  basic: [
    { x: 3, y: 1.5 },
    { x: -1, y: 2.5 },
  ],
  perpendicular: [
    { x: 3, y: 0 },
    { x: 0, y: 2 },
  ],
  opposite: [
    { x: 3, y: 1 },
    { x: -3, y: -1 },
  ],
  zero: [
    { x: 0, y: 0 },
    { x: 2, y: 2 },
  ],
  bothZero: [
    { x: 0, y: 0 },
    { x: 0, y: 0 },
  ],
};

export function vectorScene(preset = "basic", selected: 0 | 1 = 0): VectorScene {
  const [a, b] = vectorPresets[preset] ?? vectorPresets.basic;
  return {
    vectorA: { ...a },
    vectorB: { ...b },
    selected,
    dragged: -1,
    grabOffset: { x: 0, y: 0 },
    scalar: 0.5,
    interpolation: 0.5,
    viewMode: "arithmetic",
  };
}

export function vectorNormalize(vector: Point): Point {
  if (!Number.isFinite(vector.x) || !Number.isFinite(vector.y)) return { x: 0, y: 0 };
  const largest = Math.max(Math.abs(vector.x), Math.abs(vector.y));
  if (largest === 0) return { x: 0, y: 0 };
  const scaled = { x: vector.x / largest, y: vector.y / largest };
  const magnitude = length(scaled);
  return { x: scaled.x / magnitude, y: scaled.y / magnitude };
}

export function vectorArrowHead(start: Point, end: Point) {
  const delta = subtract(end, start);
  const screenLength = length(delta);
  if (!Number.isFinite(screenLength) || screenLength < 1e-6) return null;
  const direction = vectorNormalize(delta);
  const perpendicular = { x: -direction.y, y: direction.x };
  const headLength = Math.min(14, screenLength * 0.6);
  const halfWidth = headLength * (6 / 14);
  const base = subtract(end, scale(direction, headLength));
  return {
    leftWing: add(base, scale(perpendicular, halfWidth)),
    rightWing: subtract(base, scale(perpendicular, halfWidth)),
  };
}

export function vectorWorldToScreen(world: Point): Point {
  return { x: 550 + world.x * 45, y: 420 - world.y * 45 };
}

export function vectorScreenToWorld(screen: Point): Point {
  return { x: (screen.x - 550) / 45, y: (420 - screen.y) / 45 };
}

export function vectorBoard(size: ViewportSize) {
  const scale = Math.min(size.width / 1100, size.height / 760);
  return { scale, x: (size.width - 1100 * scale) / 2, y: (size.height - 760 * scale) / 2 };
}

export function boundedEndpoint(point: Point): Point {
  return { x: clamp(point.x, -4, 4), y: clamp(point.y, -3, 3) };
}

export function hitVectorTarget(scene: VectorScene, screen: Point): -1 | 0 | 1 {
  const a = subtract(vectorWorldToScreen(scene.vectorA), screen);
  const b = subtract(vectorWorldToScreen(scene.vectorB), screen);
  const distanceA = length(a),
    distanceB = length(b);
  if (
    !Number.isFinite(distanceA) ||
    !Number.isFinite(distanceB) ||
    Math.min(distanceA, distanceB) > 14
  )
    return -1;
  if (Math.abs(distanceA - distanceB) < 1e-9) return scene.selected;
  return distanceA < distanceB ? 0 : 1;
}

export function beginVectorDrag(scene: VectorScene, screen: Point): VectorScene {
  const dragged = hitVectorTarget(scene, screen);
  if (dragged < 0) return { ...scene, dragged: -1 };
  const endpoint = dragged === 0 ? scene.vectorA : scene.vectorB;
  return {
    ...scene,
    selected: dragged as 0 | 1,
    dragged,
    grabOffset: subtract(endpoint, vectorScreenToWorld(screen)),
  };
}

export function moveVectorEndpoint(scene: VectorScene, screen: Point): VectorScene {
  if (scene.dragged < 0 || !Number.isFinite(screen.x) || !Number.isFinite(screen.y)) return scene;
  const endpoint = boundedEndpoint(add(vectorScreenToWorld(screen), scene.grabOffset));
  return scene.dragged === 0 ? { ...scene, vectorA: endpoint } : { ...scene, vectorB: endpoint };
}

export function nudgeVector(scene: VectorScene, deltaWorld: Point): VectorScene {
  const next = { ...scene, dragged: -1 as const };
  if (!Number.isFinite(deltaWorld.x) || !Number.isFinite(deltaWorld.y)) return next;
  if (scene.selected === 0)
    return { ...next, vectorA: boundedEndpoint(add(scene.vectorA, deltaWorld)) };
  return { ...next, vectorB: boundedEndpoint(add(scene.vectorB, deltaWorld)) };
}

export function vectorResults(scene: VectorScene) {
  const vectorSum = add(scene.vectorA, scene.vectorB);
  const vectorDifference = subtract(scene.vectorA, scene.vectorB);
  return {
    vectorSum,
    vectorDifference,
    scaledA: scale(scene.vectorA, scene.scalar),
    unitA: vectorNormalize(scene.vectorA),
    point: lerp(scene.vectorA, scene.vectorB, scene.interpolation),
    distanceAB: length(vectorDifference),
  };
}

export function vectorLayers(mode?: string, overlay: VectorScene["viewMode"] = "arithmetic") {
  const full = mode === undefined || mode === "vector-full";
  return {
    canDrag: full || (mode !== "vector-spaces" && mode !== "vector-magnitude"),
    heads: mode !== "vector-spaces",
    addition: full || mode === "vector-addition" || mode === "vector-subtraction",
    subtraction: full || mode === "vector-subtraction",
    scalar: mode === "vector-scalar-distance" || (full && ["scalar", "all"].includes(overlay)),
    unit: mode === "vector-normalize" || (full && ["unit", "all"].includes(overlay)),
    interpolation: full && ["lerp", "all"].includes(overlay),
    dragDetails: mode === "vector-drag",
    full,
  };
}
