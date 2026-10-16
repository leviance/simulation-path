import {
  faces,
  faceColor,
  project,
  activeSolid,
  type Camera,
  type Vec3,
  type Cache,
} from "@/lib/labs/voxel-hidden-faces";
import { setupCanvas, type CanvasSize } from "../lab-shared";
export function layout(size: CanvasSize) {
  return {
    left: 12,
    top: 10,
    scale: Math.max(0.25, Math.min((size.width - 24) / 320, (size.height - 310) / 240)),
    gridX: Math.max(12, (size.width - 256) / 2),
    gridY: size.height - 276,
  };
}
export function draw(
  ctx: CanvasRenderingContext2D,
  size: CanvasSize,
  cache: Cache,
  chunk: Uint8Array,
  camera: Camera,
  stage: number,
  selected: Vec3,
  face: number,
  slice: number,
) {
  setupCanvas(ctx, size);
  const box = layout(size);
  if (cache.frame) {
    const buffer = document.createElement("canvas");
    buffer.width = 320;
    buffer.height = 240;
    buffer
      .getContext("2d")
      ?.putImageData(new ImageData(new Uint8ClampedArray(cache.frame.pixels), 320, 240), 0, 0);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(buffer, box.left, box.top, 320 * box.scale, 240 * box.scale);
  }
  if (stage >= 6) {
    for (let z = 0; z < 16; z++)
      for (let x = 0; x < 16; x++) {
        const block = chunk[x + 16 * (z + 16 * selected[1])],
          c = faceColor(block, 2);
        ctx.fillStyle = block === 0 ? "#192030" : `rgb(${c[0]},${c[1]},${c[2]})`;
        ctx.fillRect(box.gridX + x * 16, box.gridY + z * 16, 15, 15);
      }
    ctx.strokeStyle = "#ffdc50";
    ctx.strokeRect(box.gridX + selected[0] * 16, box.gridY + selected[2] * 16, 16, 16);
    ctx.fillStyle = "#ccd6e8";
    ctx.font = "12px monospace";
    ctx.fillText(`Bảng đọc lớp y=${selected[1]}, không sửa block`, 12, box.gridY - 10);
    if (activeSolid(chunk, ...selected, slice)) {
      ctx.beginPath();
      faces[face].forEach((v, i) => {
        const p = project(v.map((a, j) => a + selected[j]) as Vec3, camera),
          x = box.left + p.x * box.scale,
          y = box.top + p.y * box.scale;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.closePath();
      ctx.strokeStyle = "#ffb65b";
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  }
}
