import { fpsResults, type FpsScene } from "@/lib/labs/fps-camera-scene";
import { setupCanvas, drawLine, type CanvasSize } from "./lab-shared";
function layout(size: CanvasSize) {
  const scale = Math.min(size.width / 1100, size.height / 800);
  return { scale, x: (size.width - 1100 * scale) / 2, y: (size.height - 800 * scale) / 2 };
}
export function fpsPointFromEvent(
  e: { clientX: number; clientY: number; currentTarget: HTMLCanvasElement },
  size: CanvasSize,
  outside = false,
) {
  const rect = e.currentTarget.getBoundingClientRect(),
    b = layout(size);
  if (rect.width <= 0 || rect.height <= 0 || b.scale <= 0) return null;
  const x = (((e.clientX - rect.left) * size.width) / rect.width - b.x) / b.scale;
  const y = (((e.clientY - rect.top) * size.height) / rect.height - b.y) / b.scale;
  if (
    !Number.isFinite(x) ||
    !Number.isFinite(y) ||
    (!outside && (x < 0 || x >= 1100 || y < 0 || y >= 800))
  )
    return null;
  // Drag delta dùng CSS pixel, không nhân DPR hoặc tỉ lệ của bitmap.
  return { x: e.clientX, y: e.clientY };
}
export function drawFpsLab(
  ctx: CanvasRenderingContext2D,
  size: CanvasSize,
  scene: FpsScene,
  stage: number,
) {
  setupCanvas(ctx, size);
  const b = layout(size),
    r = fpsResults(scene, stage),
    debug = stage < 8 || scene.debug;
  ctx.save();
  ctx.translate(b.x, b.y);
  ctx.scale(b.scale, b.scale);
  ctx.beginPath();
  ctx.rect(0, 0, 1100, 800);
  ctx.clip();
  for (const line of r.segments) drawLine(ctx, line.from, line.to, line.color, 1.7);
  if (debug) {
    drawLine(ctx, { x: 542, y: 400 }, { x: 558, y: 400 }, "#ffffff", 1.5);
    drawLine(ctx, { x: 550, y: 392 }, { x: 550, y: 408 }, "#ffffff", 1.5);
    ctx.fillStyle = "#e1e8fa";
    ctx.font = "18px ui-monospace";
    ctx.fillText("FPS ROOM · world bất biến · camera nhìn +Z ở yaw=pitch=0", 16, 26);
    ctx.fillText("WASD đi · M Walk/Fly · Q/E world Y khi Fly · kéo để nhìn", 16, 52);
    if (stage >= 4) {
      const v = r.basis;
      ctx.fillText(
        "forward " + [v.forward.x, v.forward.y, v.forward.z].map((x) => x.toFixed(2)).join(" / "),
        16,
        752,
      );
      ctx.fillText("Các hộp là mốc quan sát, không có collision với hộp.", 16, 780);
    }
  }
  ctx.restore();
}
