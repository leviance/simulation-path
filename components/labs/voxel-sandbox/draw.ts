import { setupCanvas, type CanvasSize } from "../lab-shared";
import {
  project,
  type Camera,
  type World,
  centerOf,
  keyOf,
} from "@/lib/labs/voxel-chunk-streaming";
import type { Cell, Trace } from "@/lib/labs/voxel-sandbox";
export function imageRect(size: CanvasSize) {
  const width = Math.min(640, size.width - 24);
  return { x: 12, y: 28, width, height: width * 0.75 };
}
export function pixelAt(size: CanvasSize, x: number, y: number) {
  const r = imageRect(size);
  if (x < r.x || x >= r.x + r.width || y < r.y || y >= r.y + r.height) return null;
  return {
    x: Math.floor(((x - r.x) * 320) / r.width),
    y: Math.floor(((y - r.y) * 240) / r.height),
  };
}
export function draw(
  ctx: CanvasRenderingContext2D,
  size: CanvasSize,
  pixels: Uint8ClampedArray,
  world: World,
  camera: Camera,
  aim: { x: number; y: number },
  trace: Trace,
  stage: number,
) {
  setupCanvas(ctx, size);
  const r = imageRect(size),
    scale = r.width / 320;
  const image = document.createElement("canvas");
  image.width = 320;
  image.height = 240;
  image
    .getContext("2d")!
    .putImageData(new ImageData(new Uint8ClampedArray(pixels), 320, 240), 0, 0);
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(image, r.x, r.y, r.width, r.height);
  ctx.font = "13px system-ui";
  ctx.fillStyle = "#cbd5e1";
  ctx.fillText("Terrain resident — chuột giữa để xoay; overlay không dùng để chọn block", 12, 18);
  const point = (x: number, y: number, z: number) => {
    const p = project([x - world.player.x + 8, y, z - world.player.z + 8], camera);
    return { x: r.x + p.x * scale, y: r.y + p.y * scale };
  };
  const outline = (cell: Cell, color: string) => {
    const points = Array.from({ length: 8 }, (_, i) =>
      point(cell[0] + (i & 1), cell[1] + ((i >> 1) & 1), cell[2] + ((i >> 2) & 1)),
    );
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    for (let i = 0; i < 8; i++)
      for (const bit of [1, 2, 4])
        if (!(i & bit)) {
          const a = points[i],
            b = points[i | bit];
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
        }
  };
  ctx.save();
  ctx.beginPath();
  ctx.rect(r.x, r.y, r.width, r.height);
  ctx.clip();
  if (stage >= 3) {
    ctx.strokeStyle = "#61afef";
    ctx.beginPath();
    trace.path.forEach((c, i) => {
      const p = point(c[0] + 0.5, c[1] + 0.5, c[2] + 0.5);
      if (i) ctx.lineTo(p.x, p.y);
      else ctx.moveTo(p.x, p.y);
    });
    ctx.stroke();
    if (trace.hit) {
      outline(trace.hit.cell, "#e5c07b");
      const ghost = trace.hit.cell.map((v, i) => v + trace.hit!.normal[i]) as Cell;
      const cx = Math.floor(ghost[0] / 16),
        cz = Math.floor(ghost[2] / 16),
        entry = world.chunks.get(`${cx},${cz}`);
      if (
        trace.hit.normal.some((v) => v !== 0) &&
        ghost[1] >= 0 &&
        ghost[1] < 16 &&
        entry &&
        entry.blocks[ghost[0] - cx * 16 + 16 * (ghost[2] - cz * 16 + 16 * ghost[1])] === 0
      )
        outline(ghost, "#98c379");
    }
  }
  if (stage >= 1) {
    const x = r.x + (aim.x + 0.5) * scale,
      y = r.y + (aim.y + 0.5) * scale;
    ctx.strokeStyle = "#ffe6a6";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x - 6, y);
    ctx.lineTo(x + 6, y);
    ctx.moveTo(x, y - 6);
    ctx.lineTo(x, y + 6);
    ctx.stroke();
  }
  ctx.restore();
  ctx.fillStyle = "#cbd5e1";
  ctx.fillText("Bản đồ chunk: xanh resident; xanh lam đang chờ tải", 12, 535);
  const center = centerOf(world.player),
    pending = new Set(world.pending.filter((j) => j.kind === "load").map((j) => keyOf(j.key)));
  for (let z = -3; z <= 3; z++)
    for (let x = -3; x <= 3; x++) {
      const key = keyOf({ x: center.x + x, z: center.z + z });
      ctx.fillStyle = world.chunks.has(key) ? "#3a8066" : pending.has(key) ? "#3e5d9b" : "#202c41";
      ctx.fillRect(12 + (x + 3) * 18, 550 + (z + 3) * 18, 16, 16);
    }
  ctx.fillStyle = "#e5c07b";
  ctx.fillRect(12 + 3 * 18 + 5, 550 + 3 * 18 + 5, 6, 6);
  ctx.fillStyle = "#cbd5e1";
  ctx.fillText(`World (${world.player.x.toFixed(1)}, ${world.player.z.toFixed(1)})`, 165, 570);
  ctx.fillText(
    trace.blocked
      ? "Tia gặp vùng chưa tải — hãy N/Chạy tải chunk"
      : "Vàng: hit; xanh lá: ô đặt; xanh lam: đường qua tâm cell",
    165,
    595,
  );
  ctx.fillText("Camera trực giao; chưa FPS, collision, crafting hoặc multiplayer", 12, 698);
}
