import {
  faceColor,
  imageWidth,
  imageHeight,
  raster,
  type Camera,
  type Triangle,
} from "@/lib/labs/voxel-chunk";
import { setupCanvas, type CanvasSize } from "../lab-shared";
export function layout(size: CanvasSize) {
  const scale = Math.min((size.width - 24) / 320, (size.height - 306) / 240);
  return {
    scale: Math.max(0.25, scale),
    left: 12,
    top: 10,
    gridX: Math.max(12, (size.width - 256) / 2),
    gridY: size.height - 276,
  };
}
export function draw(
  ctx: CanvasRenderingContext2D,
  size: CanvasSize,
  frame: ReturnType<typeof raster>,
  chunk: Uint8Array,
  stage: number,
  slice: number,
  selected: [number, number, number],
) {
  setupCanvas(ctx, size);
  const box = layout(size);
  const buffer = document.createElement("canvas");
  buffer.width = imageWidth;
  buffer.height = imageHeight;
  buffer
    .getContext("2d")
    ?.putImageData(
      new ImageData(new Uint8ClampedArray(frame.pixels), imageWidth, imageHeight),
      0,
      0,
    );
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(buffer, box.left, box.top, 320 * box.scale, 240 * box.scale);
  if (stage >= 2) {
    for (let z = 0; z < 16; z++)
      for (let x = 0; x < 16; x++) {
        const block = chunk[x + 16 * (z + 16 * slice)];
        const c = faceColor(block || 3, 2, stage);
        ctx.fillStyle = block === 0 ? "#192030" : `rgb(${c[0]},${c[1]},${c[2]})`;
        ctx.fillRect(box.gridX + x * 16, box.gridY + z * 16, 15, 15);
      }
    ctx.strokeStyle = "#ffdc50";
    ctx.strokeRect(box.gridX + selected[0] * 16, box.gridY + selected[2] * 16, 16, 16);
    ctx.fillStyle = "#ccd6e8";
    ctx.font = "12px monospace";
    const hint = stage >= 6 ? "Chọn ô để đọc, không sửa block." : "Bảng dữ liệu; chưa chọn ô.";
    ctx.fillText(`Lớp y=${slice}; x →, z ↓. ${hint}`, 12, box.gridY - 10);
  }
}
// Để dependency render được tách khỏi component và có thể kiểm thuần bằng Node.
export function renderScene(mesh: Triangle[], camera: Camera, useDepth: boolean) {
  return raster(mesh, camera, useDepth);
}
