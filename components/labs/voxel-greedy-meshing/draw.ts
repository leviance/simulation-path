import { type Rectangle, type RectangleDecision, faceColor } from "@/lib/labs/voxel-greedy-meshing";
import { setupCanvas } from "../lab-shared";
type Size = { width: number; height: number; dpr: number };
export function layout(size: Size) {
  const scale = Math.min(1.7, (size.width - 24) / 320);
  return {
    scale,
    left: (size.width - 320 * scale) / 2,
    top: 28,
    gridX: (size.width - 256) / 2,
    gridY: 60 + 240 * scale,
  };
}
export function draw(
  ctx: CanvasRenderingContext2D,
  size: Size,
  pixels: Uint8ClampedArray,
  mask: Uint8Array,
  rects: Rectangle[],
  shown: number,
  stage: number,
  face: number,
  decision: RectangleDecision | null = null,
) {
  setupCanvas(ctx, size);
  const b = layout(size),
    buffer = document.createElement("canvas");
  buffer.width = 320;
  buffer.height = 240;
  const image = buffer.getContext("2d");
  if (!image) return;
  image.putImageData(new ImageData(new Uint8ClampedArray(pixels), 320, 240), 0, 0);
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(buffer, b.left, b.top, 320 * b.scale, 240 * b.scale);
  ctx.font = "13px monospace";
  ctx.fillStyle = "#cbd5e1";
  ctx.fillText("Chunk 3D — kéo để xoay", 12, 18);
  if (stage < 2) return;
  ctx.fillText("Mask: u →, v ↓; ô tối = không có mặt", b.gridX, b.gridY - 12);
  for (let v = 0; v < 16; v++)
    for (let u = 0; u < 16; u++) {
      const m = mask[v * 16 + u],
        color = faceColor(m, face);
      ctx.fillStyle = m ? `rgb(${color[0]},${color[1]},${color[2]})` : "#182235";
      ctx.fillRect(b.gridX + u * 16, b.gridY + v * 16, 15, 15);
    }
  if (stage >= 4)
    rects.slice(0, shown).forEach((r, i) => {
      ctx.strokeStyle = i === (decision?.index ?? shown - 1) ? "#fff" : "#fbbf24";
      ctx.lineWidth = 2;
      ctx.strokeRect(
        b.gridX + r.u * 16 + 1,
        b.gridY + r.v * 16 + 1,
        r.width * 16 - 2,
        r.height * 16 - 2,
      );
    });
  if (decision) {
    for (const cell of [decision.width.cell, decision.height.cell]) {
      if (!cell) continue;
      ctx.strokeStyle = "#f07178";
      ctx.strokeRect(b.gridX + cell.u * 16 + 2, b.gridY + cell.v * 16 + 2, 12, 12);
    }
    ctx.strokeStyle = "#70d6ff";
    ctx.strokeRect(b.gridX + decision.seed.u * 16 + 3, b.gridY + decision.seed.v * 16 + 3, 10, 10);
  }
}
