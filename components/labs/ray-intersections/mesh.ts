import type { Scene } from "../../../lib/labs/ray-intersections.ts";
import { drawMat, drawShadows } from "./bench.ts";
import { drawBox, drawSheet, drawSphere } from "./specimens.ts";
import { mixInk, type Color, type Raster } from "./raster.ts";

const pigments: Color[] = [
  [65, 89, 96],
  [41, 169, 178],
  [215, 137, 70],
  [160, 126, 216],
];

// Render the real scene surfaces independently of the four picking routines.
export function drawScene(raster: Raster, scene: Scene, selected: number, debug: boolean) {
  const color = (index: number) =>
    index === selected ? mixInk(pigments[index], [231, 235, 225], 0.09) : pigments[index];
  drawMat(raster, scene.plane, selected === 0, debug);
  drawShadows(raster, scene);
  drawSphere(raster, scene.sphere, color(1));
  drawBox(raster, scene.box, color(2));
  drawSheet(raster, scene.triangle, color(3));
}
