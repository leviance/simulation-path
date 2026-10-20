import {
  inspectorResults,
  inspectorViewport,
  type InspectorScene,
} from "@/lib/labs/pipeline-inspector";
import { setupCanvas, drawLine, type CanvasSize } from "./lab-shared";
function layout(size: CanvasSize, scene: InspectorScene) {
  const v = inspectorViewport(scene);
  const scale = Math.min(size.width / v.width, size.height / v.height);
  return {
    scale,
    x: (size.width - v.width * scale) / 2,
    y: (size.height - v.height * scale) / 2,
    ...v,
  };
}
export function inspectorPointFromEvent(
  event: { clientX: number; clientY: number; currentTarget: HTMLCanvasElement },
  size: CanvasSize,
  scene: InspectorScene,
  outside = false,
) {
  const rect = event.currentTarget.getBoundingClientRect(),
    b = layout(size, scene);
  if (rect.width <= 0 || rect.height <= 0 || b.scale <= 0) return null;
  const x = (((event.clientX - rect.left) * size.width) / rect.width - b.x) / b.scale;
  const y = (((event.clientY - rect.top) * size.height) / rect.height - b.y) / b.scale;
  if (
    ![x, y].every(Number.isFinite) ||
    (!outside && (x < 0 || y < 0 || x >= b.width || y >= b.height))
  )
    return null;
  return { x, y, cssX: event.clientX, cssY: event.clientY };
}
export function drawInspector(
  ctx: CanvasRenderingContext2D,
  size: CanvasSize,
  scene: InspectorScene,
  stage: number,
) {
  setupCanvas(ctx, size);
  const b = layout(size, scene),
    r = inspectorResults(scene, stage);
  ctx.save();
  ctx.translate(b.x, b.y);
  ctx.scale(b.scale, b.scale);
  ctx.beginPath();
  ctx.rect(0, 0, b.width, b.height);
  ctx.clip();
  for (const line of r.lines) drawLine(ctx, line.from, line.to, line.color, 1.6);
  for (const p of r.points) {
    const selected = p.index === scene.selectedVertex;
    ctx.beginPath();
    ctx.arc(p.x, p.y, selected ? 7 : 3, 0, 2 * Math.PI);
    ctx.fillStyle = selected ? "#ffe26c" : "#53f0ae";
    ctx.fill();
    if (scene.debug) {
      ctx.fillStyle = "#e1e8fa";
      ctx.font = "16px ui-monospace";
      ctx.fillText(String(p.index), p.x + 9, p.y - 9);
    }
  }
  if (scene.debug) {
    ctx.fillStyle = "#e1e8fa";
    ctx.font = "17px ui-monospace";
    ctx.fillText(
      stage < 6
        ? "Ảnh tham chiếu P11 · các stage chưa viết hiện —"
        : "Ảnh CPU · Mat4 M → V → P → chia w → screen",
      16,
      25,
    );
  }
  ctx.restore();
}
