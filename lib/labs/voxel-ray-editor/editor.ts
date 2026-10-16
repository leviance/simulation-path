import { buildMesh } from "../voxel-hidden-faces/mesh.ts";
import { raster } from "../voxel-chunk/raster.ts";
import {
  makeChunk,
  defaultCamera,
  cameraRay,
  clipBox,
  type Camera,
  type Preset,
  type Ray,
} from "./ray.ts";
import { traverse, type Trace } from "./traversal.ts";
import { breakBlock, placeBlock } from "./editing.ts";
export type Editor = {
  chunk: Uint8Array;
  preset: Preset;
  camera: Camera;
  pixelX: number;
  pixelY: number;
  reach: number;
  material: number;
  ray: Ray | null;
  trace: Trace;
  shown: number;
  paused: boolean;
  meshDirty: boolean;
  frameDirty: boolean;
  pickDirty: boolean;
  rebuilds: number;
  rasterizations: number;
  queries: number;
  mesh: ReturnType<typeof buildMesh>;
  frame: ReturnType<typeof raster> | null;
  message: string;
};
export function createEditor(stage = 9): Editor {
  const editor: Editor = {
    chunk: makeChunk(6),
    preset: 6,
    camera: { ...defaultCamera },
    pixelX: 160,
    pixelY: 120,
    reach: 64,
    material: 3,
    ray: null,
    trace: { interval: null, visits: [], hit: null },
    shown: 1,
    paused: true,
    meshDirty: true,
    frameDirty: true,
    pickDirty: true,
    rebuilds: 0,
    rasterizations: 0,
    queries: 0,
    mesh: { mesh: [], keys: [], solid: 0, neighborChecks: 0 },
    frame: null,
    message: "Chưa chỉnh sửa dữ liệu",
  };
  refreshEditor(editor, stage);
  return editor;
}
export function refreshEditor(e: Editor, stage = 9) {
  if (e.meshDirty) {
    e.mesh = buildMesh(e.chunk, true);
    e.meshDirty = false;
    e.frameDirty = true;
    e.rebuilds++;
  }
  if (e.frameDirty) {
    e.frame = raster(e.mesh.mesh, e.camera);
    e.frameDirty = false;
    e.rasterizations++;
  }
  if (stage < 2) return;
  if (stage >= 8 && !e.pickDirty) return;
  const changed = e.pickDirty;
  e.ray = cameraRay(e.camera, e.pixelX + 0.5, e.pixelY + 0.5);
  e.trace = { interval: null, visits: [], hit: null };
  if (stage >= 3) e.trace.interval = clipBox(e.ray, [0, 0, 0], [16, 16, 16], e.reach);
  if (stage >= 4) e.trace = traverse(e.chunk, e.ray, e.reach, true, stage);
  e.pickDirty = false;
  e.queries++;
  if (changed) e.shown = 1;
}
export function changeGeometry(e: Editor) {
  e.meshDirty = true;
  e.frameDirty = true;
  e.pickDirty = true;
  e.paused = true;
}
export function changeCamera(e: Editor, camera: Camera) {
  e.camera = camera;
  e.frameDirty = true;
  e.pickDirty = true;
  e.paused = true;
}
export function setAim(e: Editor, x: number, y: number) {
  if (!Number.isInteger(x) || !Number.isInteger(y) || x < 0 || x >= 320 || y < 0 || y >= 240)
    throw new RangeError("aim pixel");
  e.pixelX = x;
  e.pixelY = y;
  e.pickDirty = true;
  e.paused = true;
}
export function edit(e: Editor, place: boolean) {
  // Luôn re-query từ state hiện tại, không tin vào preview có thể đã cũ.
  const ray = cameraRay(e.camera, e.pixelX + 0.5, e.pixelY + 0.5);
  const result = place
    ? placeBlock(e.chunk, ray, e.reach, e.material)
    : breakBlock(e.chunk, ray, e.reach);
  e.message = result.message;
  if (result.changed) changeGeometry(e);
  return result;
}
