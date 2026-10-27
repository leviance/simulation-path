import type { GalaxyScene } from "@/lib/labs/galaxy/scene";
import type { Bounds3D } from "@/lib/labs/barnes-hut-nbody";
import type { selectedForce } from "@/lib/labs/galaxy/scene";
import { projectGalaxy } from "../../lib/labs/galaxy/projection.ts";
import { createGalaxyRaster, type GalaxyRaster } from "../../lib/labs/galaxy/appearance.ts";
import { renderGalaxyRaster } from "../../lib/labs/galaxy/render.ts";
export { projectGalaxy } from "../../lib/labs/galaxy/projection.ts";

interface CanvasRaster {
  frame: GalaxyRaster;
  canvas: HTMLCanvasElement;
  context: CanvasRenderingContext2D;
  image: ImageData;
  bodies: GalaxyScene["bodies"] | null;
  cameraKey: string;
  drawn: number;
}
const rasters = new WeakMap<CanvasRenderingContext2D, CanvasRaster>();

function drawStars(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  scene: GalaxyScene,
) {
  const pixelWidth = Math.max(1, Math.round(width));
  const pixelHeight = Math.max(1, Math.round(height));
  let raster = rasters.get(context);
  if (!raster || raster.frame.width !== pixelWidth || raster.frame.height !== pixelHeight) {
    const canvas = document.createElement("canvas");
    canvas.width = pixelWidth;
    canvas.height = pixelHeight;
    const offscreen = canvas.getContext("2d");
    if (!offscreen) throw Error("Canvas 2D is unavailable");
    raster = {
      frame: createGalaxyRaster(pixelWidth, pixelHeight),
      canvas,
      context: offscreen,
      image: offscreen.createImageData(pixelWidth, pixelHeight),
      bodies: null,
      cameraKey: "",
      drawn: 0,
    };
    rasters.set(context, raster);
  }
  const cameraKey = [
    scene.camera.x,
    scene.camera.y,
    scene.camera.yaw,
    scene.camera.pitch,
    scene.camera.distance,
  ].join(",");
  if (raster.bodies !== scene.bodies || raster.cameraKey !== cameraKey) {
    raster.drawn = renderGalaxyRaster(raster.frame, scene.bodies, scene.camera).drawn;
    raster.image.data.set(raster.frame.pixels);
    raster.context.putImageData(raster.image, 0, 0);
    raster.bodies = scene.bodies;
    raster.cameraKey = cameraKey;
  }
  // Respect the caller's DPR transform rather than placing unscaled ImageData.
  context.drawImage(raster.canvas, 0, 0, width, height);
  return raster.drawn;
}
function line(
  context: CanvasRenderingContext2D,
  a: ReturnType<typeof projectGalaxy>,
  b: ReturnType<typeof projectGalaxy>,
  color: string,
  width: number,
  height: number,
) {
  if (
    !a.visible ||
    !b.visible ||
    Math.max(Math.abs(a.x), Math.abs(b.x)) > width * 4 ||
    Math.max(Math.abs(a.y), Math.abs(b.y)) > height * 4
  )
    return;
  context.strokeStyle = color;
  context.beginPath();
  context.moveTo(a.x, a.y);
  context.lineTo(b.x, b.y);
  context.stroke();
}
function box(
  context: CanvasRenderingContext2D,
  bounds: Bounds3D,
  scene: GalaxyScene,
  width: number,
  height: number,
  color: string,
) {
  const corners = Array.from({ length: 8 }, (_, i) =>
    projectGalaxy(
      {
        x: i & 1 ? bounds.maximum.x : bounds.minimum.x,
        y: i & 2 ? bounds.maximum.y : bounds.minimum.y,
        z: i & 4 ? bounds.maximum.z : bounds.minimum.z,
      },
      scene.camera,
      width,
      height,
    ),
  );
  for (let i = 0; i < 8; i++)
    for (const bit of [1, 2, 4])
      if ((i & bit) === 0) line(context, corners[i], corners[i | bit], color, width, height);
}
export function drawGalaxy(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  scene: GalaxyScene,
  force: ReturnType<typeof selectedForce>,
) {
  const drawn = drawStars(context, width, height, scene);
  for (let frame = 1; frame < scene.trails.length; frame++)
    for (let body = 0; body < scene.trails[frame].length; body++)
      line(
        context,
        projectGalaxy(scene.trails[frame - 1][body], scene.camera, width, height),
        projectGalaxy(scene.trails[frame][body], scene.camera, width, height),
        "#28445b",
        width,
        height,
      );
  if (scene.debug && scene.stage >= 6) {
    for (const i of force.trace.opened.slice(0, 512))
      box(context, scene.tree.nodes[i].bounds, scene, width, height, "#34536e");
    for (const i of force.trace.accepted.slice(0, 512))
      box(context, scene.tree.nodes[i].bounds, scene, width, height, "#a89251");
  } else if (scene.debug && scene.stage >= 5) {
    for (const node of scene.tree.nodes
      .filter((node) => node.totalMass > 0 && node.children === null)
      .slice(0, 512))
      box(context, node.bounds, scene, width, height, "#34536e");
  }
  if (scene.stage >= 2) {
    const p = projectGalaxy(scene.bodies[scene.selected].position, scene.camera, width, height);
    if (p.visible) {
      context.strokeStyle = "#e5c07b";
      context.beginPath();
      context.arc(p.x, p.y, 7, 0, Math.PI * 2);
      context.stroke();
    }
  }
  if (scene.stage >= 2 && (scene.debug || scene.stage < 6)) {
    const body = scene.bodies[scene.selected],
      a =
        scene.stage >= 6
          ? force.approximate.acceleration
          : scene.stage >= 3
            ? force.exact.acceleration
            : force.pair,
      length = Math.hypot(a.x, a.y, a.z);
    if (length > 1e-12) {
      const end = {
        x: body.position.x + (a.x * 0.1) / length,
        y: body.position.y + (a.y * 0.1) / length,
        z: body.position.z + (a.z * 0.1) / length,
      };
      line(
        context,
        projectGalaxy(body.position, scene.camera, width, height),
        projectGalaxy(end, scene.camera, width, height),
        "#e5c07b",
        width,
        height,
      );
    }
  }
  return drawn;
}
export function pickGalaxy(
  scene: GalaxyScene,
  x: number,
  y: number,
  width: number,
  height: number,
) {
  let selected = scene.selected,
    nearest = 100;
  for (let i = 0; i < scene.bodies.length; i++) {
    const p = projectGalaxy(scene.bodies[i].position, scene.camera, width, height),
      distance = (p.x - x) ** 2 + (p.y - y) ** 2;
    if (p.visible && distance < nearest) {
      selected = i;
      nearest = distance;
    }
  }
  return selected;
}
