import {
  forTrianglePanel,
  identityTriangleTransform,
  ndcToCpuScreen,
  project16Position,
  transformPosition,
  type Vec2,
} from "../../lib/labs/cpu-gpu-triangle";

// Tạo nền một lần khi đổi kích thước. Cả hai khung chỉ dùng lại nền, không
// dùng chung ảnh tam giác. Mảng màu cũng cho biết probe ngoài hình đọc được gì.
export function makeTriangleFloor(width: number, height: number) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  const pixels = ctx.createImageData(width, height);
  const rgb = pixels.data;
  const sky = [17, 24, 43, 255];
  const grid = [40, 51, 77, 255];
  for (let i = 0; i < rgb.length; i += 4) {
    rgb.set(sky, i);
  }
  const fit = forTrianglePanel(identityTriangleTransform, width, height);
  function screen(x: number, z: number) {
    return ndcToCpuScreen(transformPosition(project16Position(x, -1.5, z), fit), width, height);
  }
  function line(a: Vec2, b: Vec2) {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const steps = Math.max(1, Math.ceil(Math.max(Math.abs(dx), Math.abs(dy))));
    for (let i = 0; i <= steps; i++) {
      const x = Math.round(a.x + (i / steps) * dx);
      const y = Math.round(a.y + (i / steps) * dy);
      if (x >= 0 && x < width && y >= 0 && y < height) rgb.set(grid, 4 * (y * width + x));
    }
  }
  for (let x = -6; x <= 6; x++) line(screen(x, 2), screen(x, 16));
  for (let z = 2; z <= 16; z++) line(screen(-6, z), screen(6, z));
  ctx.putImageData(pixels, 0, 0);
  return {
    canvas,
    colorAt(x: number, y: number) {
      const i = (y * width + x) * 4;
      return { r: rgb[i] / 255, g: rgb[i + 1] / 255, b: rgb[i + 2] / 255 };
    },
  };
}
