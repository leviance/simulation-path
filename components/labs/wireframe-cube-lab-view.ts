import { type Vec3 } from "@/lib/labs/normal";
import {
  cubeViewport,
  cubeResults,
  cubeSegment,
  projectCubeVertex,
  type CubeScene,
} from "@/lib/labs/wireframe-cube-scene";
import { drawLine, setupCanvas, type CanvasSize } from "./lab-shared";
function layout(size: CanvasSize) {
  const scale = Math.min(size.width / 1100, size.height / 800);
  return { scale, x: (size.width - 1100 * scale) / 2, y: (size.height - 800 * scale) / 2 };
}
export function cubePointFromEvent(
  event: { clientX: number; clientY: number; currentTarget: HTMLCanvasElement },
  size: CanvasSize,
  outside = false,
) {
  const rect = event.currentTarget.getBoundingClientRect(),
    b = layout(size),
    v = cubeViewport();
  if (rect.width <= 0 || rect.height <= 0 || b.scale <= 0) return null;
  const x = (((event.clientX - rect.left) * size.width) / rect.width - b.x) / b.scale;
  const y = (((event.clientY - rect.top) * size.height) / rect.height - b.y) / b.scale;
  if (
    !Number.isFinite(x) ||
    !Number.isFinite(y) ||
    (!outside && (x < v.x || x >= v.width || y < v.y || y >= v.height))
  )
    return null;
  return { x, y };
}
export function drawCubeLab(
  ctx: CanvasRenderingContext2D,
  size: CanvasSize,
  scene: CubeScene,
  stage: number,
) {
  setupCanvas(ctx, size);
  const b = layout(size),
    r = cubeResults(scene, stage),
    debug = stage < 6 || scene.debug;
  ctx.save();
  ctx.translate(b.x, b.y);
  ctx.scale(b.scale, b.scale);
  ctx.beginPath();
  ctx.rect(0, 0, 1100, 800);
  ctx.clip();
  const line = (a: Vec3, b: Vec3, color: string, width = 1) => {
    const s = cubeSegment(projectCubeVertex(a, r.active), projectCubeVertex(b, r.active), r.active);
    if (s) drawLine(ctx, s.from, s.to, color, width);
  };
  for (let x = -6; x <= 6; x++) line({ x, y: -2, z: 1 }, { x, y: -2, z: 15 }, "#28334d");
  for (let z = 1; z <= 15; z++) line({ x: -6, y: -2, z }, { x: 6, y: -2, z }, "#28334d");
  for (const z of [4, 8, 12]) {
    line({ x: -4, y: -2, z }, { x: -4, y: 2, z }, "#74839f");
    line({ x: 4, y: -2, z }, { x: 4, y: 2, z }, "#74839f");
  }
  if (debug) {
    const o = { x: -3, y: -1.8, z: 6 };
    line(o, { x: -1.5, y: -1.8, z: 6 }, "#ff6b6b", 2);
    line(o, { x: -3, y: -0.3, z: 6 }, "#53f0ae", 2);
    line(o, { x: -3, y: -1.8, z: 7.5 }, "#84a9ff", 2);
  }
  for (const edge of r.edges) {
    const t = stage >= 6 && scene.depthCue ? edge.depthFactor : 1;
    const color =
      stage >= 6 && scene.depthCue
        ? `rgb(${54 + 114 * t} ${72 + 164 * t} ${112 + 143 * t})`
        : "#84a9ff";
    drawLine(ctx, edge.from, edge.to, color, 2.5);
  }
  if (debug) {
    r.vertices.forEach((p, i) => {
      if (p.status !== "visible" || !p.screen) return;
      ctx.beginPath();
      ctx.arc(p.screen.x, p.screen.y, 5, 0, 2 * Math.PI);
      ctx.fillStyle = i < 4 ? "#ffbe5c" : "#5cecb9";
      ctx.fill();
      ctx.fillStyle = "#ffffff";
      ctx.font = "18px ui-monospace";
      ctx.fillText(String(i), p.screen.x + 9, p.screen.y - 9);
    });
    ctx.fillStyle = "#e1e8fa";
    ctx.font = "18px ui-monospace";
    ctx.fillText("CPU WIREFRAME · camera +Z · world Y lên · X đỏ / Y xanh lá / Z xanh lam", 16, 26);
    ctx.fillText(
      r.active.projection.toUpperCase() + " · vertex cache 8 · cạnh " + r.edges.length + "/12",
      16,
      52,
    );
  }
  ctx.restore();
}
