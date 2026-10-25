import { MapDocument } from "./map-document.ts";
import {
  containsBox,
  mapScreenToWorld,
  normalizedBox,
  translatedBox,
  viewportBox,
  zoomMapAt,
  type MapBox,
  type MapCamera,
  type MapPoint,
  type MapSize,
} from "./map-geometry.ts";
import type { MapKind, MapLayout } from "./map-data.ts";
import { defaultMapTreeConfig, queryMapBrute, type MapQuery } from "./map-quadtree.ts";
import type { MapValidation } from "./map-validation.ts";
import type { MapBenchmark } from "./map-benchmark.ts";

export type MapTool = "select" | "pan" | "move" | "add";
export interface MapGesture {
  tool: MapTool;
  startScreen: MapPoint;
  startWorld: MapPoint;
  currentWorld: MapPoint;
  camera: MapCamera;
  offset: MapPoint;
  bounds: MapBox | null;
  previousSelection: Set<number>;
  additive: boolean;
}
export interface MapScene {
  stage: number;
  document: MapDocument;
  count: number;
  seed: number;
  layout: MapLayout;
  camera: MapCamera;
  size: MapSize;
  tool: MapTool;
  kind: MapKind;
  debug: boolean;
  gesture: MapGesture | null;
  visible: MapQuery;
  visibleKey: string;
  preview: MapQuery | null;
  version: number;
  validation: MapValidation | null;
  benchmark: MapBenchmark | null;
}
export const mapModes = [
  "map-objects",
  "map-camera",
  "map-selection",
  "map-insert",
  "map-query",
  "map-culling",
  "map-mutations",
  "map-group-drag",
  "map-validation",
  "map-performance",
  "map-final",
] as const;

export function initialMapCamera(count: number, layout: MapLayout): MapCamera {
  if (layout === "clustered") return { x: -5100, y: -5100, zoom: 0.5 };
  return { x: 0, y: -12000 + Math.ceil(Math.max(1, count) / 400) * 32, zoom: 0.5 };
}

export function createMapScene(
  stage = 11,
  count = 100000,
  seed = 1,
  layout: MapLayout = "districts",
): MapScene {
  if (!Number.isInteger(stage) || stage < 1 || stage > 11)
    throw new RangeError("Invalid lesson stage");
  const document = new MapDocument(count, seed, layout, {
    ...defaultMapTreeConfig,
    maximumDepth: stage >= 4 ? 12 : 0,
  });
  document.useTree = stage >= 5;
  const scene: MapScene = {
    stage,
    document,
    count,
    seed,
    layout,
    camera: initialMapCamera(count, layout),
    size: { width: 760, height: 520 },
    tool: stage >= 3 ? "select" : "pan",
    kind: "house",
    debug: false,
    gesture: null,
    visible: { ids: [], visited: [], pruned: [], candidates: 0, milliseconds: 0 },
    visibleKey: "",
    preview: null,
    version: 0,
    validation: null,
    benchmark: null,
  };
  refreshMapScene(scene);
  return scene;
}

export function refreshMapScene(scene: MapScene) {
  const document = scene.document;
  const camera = scene.camera;
  const key = `${document.tree.revision}/${document.useTree}/${camera.x}/${camera.y}/${camera.zoom}/${scene.size.width}/${scene.size.height}`;
  const box = viewportBox(camera, scene.size);
  if (key !== scene.visibleKey) {
    // Kết quả reference/timing của revision cũ không còn mô tả map hiện tại.
    if (
      scene.validation &&
      (scene.validation.tree !== document.tree ||
        scene.validation.revision !== document.tree.revision)
    )
      scene.validation = null;
    if (
      scene.benchmark &&
      (scene.benchmark.tree !== document.tree ||
        scene.benchmark.revision !== document.tree.revision)
    )
      scene.benchmark = null;
    scene.visible =
      scene.stage >= 6 ? document.query(box) : queryMapBrute(document.tree.objects.values(), box);
    // Thứ tự vẽ độc lập với lượt duyệt cây; ID lớn nhất nằm trên cùng.
    scene.visible.ids.sort((a, b) => a - b);
    scene.visibleKey = key;
  }
  if (scene.gesture?.tool === "move") {
    const inverse = { x: -scene.gesture.offset.x, y: -scene.gesture.offset.y };
    const query = document.query(translatedBox(box, inverse));
    query.ids = query.ids.filter((id) => document.selection.has(id)).sort((a, b) => a - b);
    scene.preview = query;
  } else scene.preview = null;
  scene.version++;
}

export function cancelMapWork(scene: MapScene, restoreSelection = true) {
  if (scene.gesture?.tool === "move" && restoreSelection) {
    scene.document.selection.clear();
    for (const id of scene.gesture.previousSelection)
      if (scene.document.tree.objects.has(id)) scene.document.selection.add(id);
  }
  scene.gesture = null;
  scene.preview = null;
  if (scene.validation) scene.validation.active = false;
  if (scene.benchmark) scene.benchmark.active = false;
  scene.version++;
}

export function beginMapGesture(scene: MapScene, screen: MapPoint, additive = false) {
  if (scene.gesture) return;
  if (
    (scene.tool === "move" && scene.stage < 8) ||
    (scene.tool === "add" && scene.stage < 7) ||
    (scene.tool === "select" && scene.stage < 3) ||
    scene.stage < 2
  )
    return;
  cancelMapWork(scene);
  const world = mapScreenToWorld(screen, scene.camera, scene.size);
  const previousSelection =
    scene.tool === "move" ? new Set(scene.document.selection) : new Set<number>();
  if (scene.tool === "move") {
    const hit = scene.document.query({ ...world, width: 0, height: 0 });
    let top: number | null = null;
    for (const id of hit.ids) if (top === null || id > top) top = id;
    if (top === null) return;
    if (!scene.document.selection.has(top)) {
      scene.document.selection.clear();
      scene.document.selection.add(top);
    }
  }
  scene.gesture = {
    tool: scene.tool,
    startScreen: screen,
    startWorld: world,
    currentWorld: world,
    camera: { ...scene.camera },
    offset: { x: 0, y: 0 },
    bounds: scene.tool === "move" ? scene.document.selectionBounds() : null,
    previousSelection,
    additive,
  };
  refreshMapScene(scene);
}

export function moveMapGesture(scene: MapScene, screen: MapPoint) {
  const gesture = scene.gesture;
  if (!gesture) return;
  if (gesture.tool === "pan") {
    scene.camera = {
      ...gesture.camera,
      x: gesture.camera.x - (screen.x - gesture.startScreen.x) / gesture.camera.zoom,
      y: gesture.camera.y - (screen.y - gesture.startScreen.y) / gesture.camera.zoom,
    };
  }
  const world = mapScreenToWorld(screen, scene.camera, scene.size);
  gesture.currentWorld = world;
  gesture.offset = { x: world.x - gesture.startWorld.x, y: world.y - gesture.startWorld.y };
  refreshMapScene(scene);
}

export function endMapGesture(scene: MapScene, screen: MapPoint) {
  if (!scene.gesture) return;
  moveMapGesture(scene, screen);
  const gesture = scene.gesture;
  const document = scene.document;
  if (gesture.tool === "select") {
    const distance = Math.hypot(screen.x - gesture.startScreen.x, screen.y - gesture.startScreen.y);
    if (distance <= 3) document.pick(gesture.currentWorld, gesture.additive);
    else document.selectRegion(gesture.startWorld, gesture.currentWorld, gesture.additive);
  }
  if (gesture.tool === "move") document.moveSelection(gesture.offset);
  if (gesture.tool === "add") document.add(gesture.currentWorld, scene.kind);
  scene.gesture = null;
  scene.preview = null;
  refreshMapScene(scene);
}

export function zoomMapScene(scene: MapScene, anchor: MapPoint, zoom: number) {
  if (scene.stage < 2) return;
  cancelMapWork(scene);
  scene.camera = zoomMapAt(scene.camera, anchor, scene.size, zoom);
  refreshMapScene(scene);
}

export function mapPreviewValid(scene: MapScene) {
  const gesture = scene.gesture;
  return (
    !gesture ||
    !gesture.bounds ||
    containsBox(scene.document.tree.config.root, translatedBox(gesture.bounds, gesture.offset))
  );
}
export function mapSelectionPreview(scene: MapScene) {
  return scene.gesture?.tool === "select"
    ? normalizedBox(scene.gesture.startWorld, scene.gesture.currentWorld)
    : null;
}
