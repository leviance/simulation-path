import { setupCanvas, drawLine, type CanvasSize } from "./lab-shared";
import { projectZVertex } from "@/lib/labs/z-buffer";
import { depthFrame, depthViewport, type DepthScene } from "@/lib/labs/z-buffer-scene";
export function depthLayout(size: CanvasSize, stage: number, s: DepthScene) {
  const v = depthViewport(stage, s),
    cell = Math.min(size.width / v.width, size.height / v.height);
  return {
    ...v,
    cell,
    left: (size.width - cell * v.width) / 2,
    top: (size.height - cell * v.height) / 2,
  };
}
export function depthPointer(
  e: { clientX: number; clientY: number; currentTarget: HTMLCanvasElement },
  size: CanvasSize,
  stage: number,
  s: DepthScene,
) {
  const r = e.currentTarget.getBoundingClientRect(),
    l = depthLayout(size, stage, s);
  if (r.width <= 0 || r.height <= 0 || l.cell <= 0) return null;
  return {
    x: (((e.clientX - r.left) * size.width) / r.width - l.left) / l.cell,
    y: (((e.clientY - r.top) * size.height) / r.height - l.top) / l.cell,
  };
}
export function drawDepthScene(
  ctx: CanvasRenderingContext2D,
  size: CanvasSize,
  stage: number,
  s: DepthScene,
) {
  setupCanvas(ctx, size);
  const l = depthLayout(size, stage, s),
    frame = depthFrame(stage, s);
  ctx.save();
  ctx.translate(l.left, l.top);
  ctx.scale(l.cell, l.cell);
  ctx.beginPath();
  ctx.rect(0, 0, l.width, l.height);
  ctx.clip();
  if (stage === 9) {
    const line = (
      a: { x: number; y: number; z: number },
      b: { x: number; y: number; z: number },
    ) => {
      const p = projectZVertex({ ...a, x: a.x - s.cameraX, z: a.z - s.cameraZ }, l.width, l.height);
      const q = projectZVertex({ ...b, x: b.x - s.cameraX, z: b.z - s.cameraZ }, l.width, l.height);
      if ([p.x, p.y, q.x, q.y].every(Number.isFinite)) drawLine(ctx, p, q, "#28334d", 0.25);
    };
    for (let x = -6; x <= 6; x++) line({ x, y: -1.9, z: 2 }, { x, y: -1.9, z: 9 });
    for (let z = 2; z <= 9; z++) line({ x: -6, y: -1.9, z }, { x: 6, y: -1.9, z });
  }
  for (let y = 0; y < l.height; y++)
    for (let x = 0; x < l.width; x++) {
      const i = y * l.width + x,
        c = frame.colors[i],
        d = frame.depths[i];
      if (s.debug && s.depthView) {
        const v = d >= 1 ? 12 : Math.round((1 - d) * 235 + 20);
        ctx.fillStyle = "rgb(" + v + "," + v + "," + v + ")";
      } else {
        if (c.red === 9 && c.green === 15 && c.blue === 29) continue;
        ctx.fillStyle = "rgb(" + c.red + "," + c.green + "," + c.blue + ")";
      }
      ctx.fillRect(x, y, 1, 1);
    }
  if (s.debug && stage >= 3) {
    ctx.strokeStyle = "#ffbe52";
    ctx.lineWidth = 0.35;
    ctx.strokeRect(s.inspect.x, s.inspect.y, 1, 1);
  }
  ctx.restore();
}
