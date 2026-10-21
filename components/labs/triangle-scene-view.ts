import type { CanvasSize } from "./lab-shared";
import { setupCanvas, drawLine } from "./lab-shared";
import { projectPerspective, clipPointScreen } from "@/lib/labs/projection-point";
import { rasterizeTriangleCoverage } from "@/lib/labs/triangle-raster";
import {
  rasterSceneViewport,
  rasterSceneLens,
  rasterSceneTriangle,
  rasterSceneRgb,
  type RasterScene,
  type ScenePoint,
} from "@/lib/labs/triangle-scene";
function layout(size: CanvasSize, s: RasterScene) {
  const v = rasterSceneViewport(s),
    scale = Math.min(size.width / v.width, size.height / v.height);
  return { x: (size.width - v.width * scale) / 2, y: (size.height - v.height * scale) / 2, scale };
}
export function scenePointer(
  e: { clientX: number; clientY: number; currentTarget: HTMLCanvasElement },
  size: CanvasSize,
  s: RasterScene,
) {
  const rect = e.currentTarget.getBoundingClientRect(),
    l = layout(size, s);
  if (rect.width <= 0 || rect.height <= 0 || l.scale <= 0) return null;
  const x = (((e.clientX - rect.left) * size.width) / rect.width - l.x) / l.scale;
  const y = (((e.clientY - rect.top) * size.height) / rect.height - l.y) / l.scale;
  return Number.isFinite(x) && Number.isFinite(y) ? { x, y } : null;
}
export function sceneRaster(s: RasterScene) {
  const triangle = rasterSceneTriangle(s),
    v = rasterSceneViewport(s);
  return triangle
    ? rasterizeTriangleCoverage(triangle, v.width, v.height, "top-left", s.limit)
    : null;
}
export function drawRasterScene(ctx: CanvasRenderingContext2D, size: CanvasSize, s: RasterScene) {
  setupCanvas(ctx, size);
  const l = layout(size, s),
    v = rasterSceneViewport(s);
  ctx.save();
  ctx.translate(l.x, l.y);
  ctx.scale(l.scale, l.scale);
  ctx.beginPath();
  ctx.rect(0, 0, v.width, v.height);
  ctx.clip();
  const line = (a: ScenePoint, b: ScenePoint) => {
    const p = projectPerspective(a, s.camera, rasterSceneLens(s), v).screen;
    const q = projectPerspective(b, s.camera, rasterSceneLens(s), v).screen;
    if (!p || !q) return;
    const clipped = clipPointScreen(p, q, v);
    if (clipped) drawLine(ctx, clipped[0], clipped[1], "#28334d", 0.5);
  };
  for (let x = -6; x <= 6; x++) line({ x, y: -1.5, z: 2 }, { x, y: -1.5, z: 16 });
  for (let z = 2; z <= 16; z++) line({ x: -6, y: -1.5, z }, { x: 6, y: -1.5, z });
  const raster = sceneRaster(s),
    triangle = rasterSceneTriangle(s);
  for (const p of raster?.fragments ?? []) {
    const rgb = rasterSceneRgb(s, p.sample.barycentric);
    ctx.fillStyle = "rgb(" + rgb.join(",") + ")";
    ctx.fillRect(p.x, p.y, 1, 1);
  }
  if (s.debug && triangle) {
    const points = [triangle.a, triangle.b, triangle.c];
    for (let i = 0; i < 3; i++) {
      drawLine(ctx, points[i], points[(i + 1) % 3], "#e1e8fa", 0.5);
      ctx.beginPath();
      ctx.arc(points[i].x, points[i].y, 2, 0, Math.PI * 2);
      ctx.fillStyle = i === s.selected ? "#ffe26c" : "#e1e8fa";
      ctx.fill();
    }
  }
  ctx.restore();
}
