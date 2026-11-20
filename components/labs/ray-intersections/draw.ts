import {
  measuredChord,
  type Camera,
  type Scene,
  type Ray,
  type Hit,
} from "@/lib/labs/ray-intersections";
import { setupCanvas, type CanvasSize } from "../lab-shared";
import { drawScene } from "./mesh";
import { Raster } from "./raster";
import { drawBeam, drawCollimator, type Chord } from "./beam";
import { observerOverlay, sourceOverlay, sourceRect } from "./hud";
export { sourceRect as aimRect } from "./hud";

interface DrawingCache {
  raster: Raster;
  aim: Raster;
  buffer: HTMLCanvasElement;
  bufferContext: CanvasRenderingContext2D;
  image: ImageData;
  aimBuffer: HTMLCanvasElement;
  aimContext: CanvasRenderingContext2D;
  aimImage: ImageData;
}
const cache = new WeakMap<CanvasRenderingContext2D, DrawingCache>();
interface SceneLayer {
  geometry: Scene;
  pose: number[];
  selected: number;
  debug: boolean;
  pixels: Uint8ClampedArray;
  depth: Float64Array;
}
const layers = new WeakMap<Raster, SceneLayer>();

function populate(
  raster: Raster,
  camera: Camera,
  geometry: Scene,
  ray: Ray,
  hits: (Hit | null)[],
  best: Hit | null,
  stage: number,
  selected: number,
  debug: boolean,
  chord: Chord,
  observerView: boolean,
) {
  // Scanning changes the ray, not the whole optical bench. Restore the
  // independent mesh's depth too: the collimator moves with the live query.
  const previous = layers.get(raster);
  const pose = [
    camera.origin.x,
    camera.origin.y,
    camera.origin.z,
    camera.target.x,
    camera.target.y,
    camera.target.z,
    camera.tanHalfFov,
  ];
  if (
    previous &&
    previous.geometry === geometry &&
    previous.selected === selected &&
    previous.debug === debug &&
    pose.every((n, i) => n === previous.pose[i])
  ) {
    raster.pixels.set(previous.pixels);
    raster.inverseDepth.set(previous.depth);
  } else {
    raster.begin(camera);
    drawScene(raster, geometry, selected, debug);
    if (previous) {
      previous.pixels.set(raster.pixels);
      previous.depth.set(raster.inverseDepth);
      Object.assign(previous, { geometry, pose, selected, debug });
    } else {
      layers.set(raster, {
        geometry,
        pose,
        selected,
        debug,
        pixels: raster.pixels.slice(),
        depth: raster.inverseDepth.slice(),
      });
    }
  }
  if (stage < 2) return;
  if (observerView) drawCollimator(raster, ray);
  drawBeam(raster, ray, hits, best, chord, selected, debug);
}

export function drawPicking(
  ctx: CanvasRenderingContext2D,
  size: CanvasSize,
  observer: Camera,
  emitter: Camera,
  ray: Ray,
  hits: (Hit | null)[],
  best: Hit | null,
  stage: number,
  u: number,
  v: number,
  geometry: Scene,
  selected: number,
  debug: boolean,
) {
  setupCanvas(ctx, size);
  // Bound CPU work separately from DPR. Vector labels/crosshair still use DPR.
  if (size.width < 1 || size.height < 1) return;
  const scale = Math.min(size.dpr, 1000 / size.width, 900 / size.height);
  const width = Math.max(1, Math.round(size.width * scale));
  const height = Math.max(1, Math.round(size.height * scale));
  let drawing = cache.get(ctx);
  if (!drawing || drawing.raster.width !== width || drawing.raster.height !== height) {
    const buffer = document.createElement("canvas");
    buffer.width = width;
    buffer.height = height;
    const aimBuffer = document.createElement("canvas");
    aimBuffer.width = 280;
    aimBuffer.height = 190;
    const bufferContext = buffer.getContext("2d"),
      aimContext = aimBuffer.getContext("2d");
    if (!bufferContext || !aimContext) return;
    drawing = {
      raster: new Raster(width, height, observer),
      aim: new Raster(280, 190, emitter),
      buffer,
      bufferContext,
      image: bufferContext.createImageData(width, height),
      aimBuffer,
      aimContext,
      aimImage: aimContext.createImageData(280, 190),
    };
    cache.set(ctx, drawing);
  }
  const { raster, buffer, bufferContext, image, aim, aimBuffer, aimContext, aimImage } = drawing;
  const chord = measuredChord(ray, geometry, selected, stage);
  populate(raster, observer, geometry, ray, hits, best, stage, selected, debug, chord, true);
  image.data.set(raster.pixels);
  bufferContext.putImageData(image, 0, 0);
  ctx.drawImage(buffer, 0, 0, size.width, size.height);
  observerOverlay(ctx, size, observer, geometry, ray, stage, best ?? hits[selected], chord, debug);
  if (stage < 2) return;
  const rect = sourceRect(size);
  populate(aim, emitter, geometry, ray, hits, best, stage, selected, debug, chord, false);
  aimImage.data.set(aim.pixels);
  aimContext.putImageData(aimImage, 0, 0);
  ctx.drawImage(aimBuffer, rect.x, rect.y, rect.width, rect.height);
  sourceOverlay(ctx, rect, u, v);
}
