import {
  centerOf,
  distance,
  keyOf,
  loadRadius,
  targetCenter,
  splitAxis,
  project,
  type Key,
  type World,
  type Camera,
} from "@/lib/labs/voxel-chunk-streaming";
import { setupCanvas, type CanvasSize } from "../lab-shared";
export function layout(size: CanvasSize) {
  const scale = Math.min(1.7, (size.width - 24) / 320);
  return {
    left: (size.width - 320 * scale) / 2,
    top: 26,
    scale,
    gridX: (size.width - 224) / 2,
    gridY: 70 + 240 * scale,
    cell: 32,
  };
}
export function picked(size: CanvasSize, world: World, x: number, y: number): Key | null {
  const b = layout(size),
    u = Math.floor((x - b.gridX) / 32),
    v = Math.floor((y - b.gridY) / 32);
  if (u < 0 || u >= 7 || v < 0 || v >= 7) return null;
  const c = centerOf(world.player);
  return { x: c.x + u - 3, z: c.z + v - 3 };
}
export function draw(
  ctx: CanvasRenderingContext2D,
  size: CanvasSize,
  world: World,
  camera: Camera,
  pixels: Uint8ClampedArray,
  selected: Key,
) {
  setupCanvas(ctx, size);
  const b = layout(size),
    buffer = document.createElement("canvas");
  buffer.width = 320;
  buffer.height = 240;
  const target = buffer.getContext("2d");
  if (!target) return;
  target.putImageData(new ImageData(new Uint8ClampedArray(pixels), 320, 240), 0, 0);
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(buffer, b.left, b.top, 320 * b.scale, 240 * b.scale);
  ctx.font = "13px monospace";
  ctx.fillStyle = "#dbeafe";
  ctx.fillText("Chunk 3D — camera đi theo nhân vật", 12, 18);
  if (world.stage >= 1) {
    const p = project([8, 4.2, 8], camera);
    ctx.fillStyle = "#fb7185";
    ctx.fillRect(b.left + p.x * b.scale - 3, b.top + p.y * b.scale - 3, 6, 6);
  }
  const center = centerOf(world.player),
    targetCenterKey = targetCenter(world);
  ctx.fillStyle = "#cbd5e1";
  ctx.fillText("Bản đồ 7×7 quanh chunk của nhân vật", b.gridX - 18, b.gridY - 15);
  for (let v = 0; v < 7; v++)
    for (let u = 0; u < 7; u++) {
      const key = { x: center.x + u - 3, z: center.z + v - 3 };
      let color = "#182234";
      if (world.chunks.has(keyOf(key)))
        color = distance(key, targetCenterKey) <= loadRadius(world) ? "#319a78" : "#bd8a35";
      if (
        world.stage >= 5 &&
        world.pending.some((j) => j.kind === "load" && keyOf(j.key) === keyOf(key))
      )
        color = "#466fc3";
      ctx.fillStyle = color;
      ctx.fillRect(b.gridX + u * 32, b.gridY + v * 32, 30, 30);
      if (keyOf(key) === keyOf(selected)) {
        ctx.strokeStyle = "#fff1a3";
        ctx.lineWidth = 2;
        ctx.strokeRect(b.gridX + u * 32 + 1, b.gridY + v * 32 + 1, 28, 28);
      }
    }
  if (world.stage >= 1) {
    ctx.fillStyle = "#fb7185";
    ctx.beginPath();
    ctx.arc(
      b.gridX + (3 + splitAxis(world.player.x).local / 16) * 32,
      b.gridY + (3 + splitAxis(world.player.z).local / 16) * 32,
      4,
      0,
      Math.PI * 2,
    );
    ctx.fill();
  }
}
