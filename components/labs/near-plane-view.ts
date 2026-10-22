import { nearTriangleVertices, type NearColor, type NearVertex } from "@/lib/labs/near-plane";
import {
  nearGridLines,
  nearLogicalHeight,
  type NearScene,
  type nearFrame,
} from "@/lib/labs/near-plane-scene";
import { drawLine, setupCanvas, type CanvasSize } from "./lab-shared";

function layout(size: CanvasSize) {
  const scale = Math.min(size.width / 1100, size.height / 800);
  return { scale, x: (size.width - 1100 * scale) / 2, y: (size.height - 800 * scale) / 2 };
}
export function nearPointFromEvent(
  event: { clientX: number; clientY: number; currentTarget: HTMLCanvasElement },
  size: CanvasSize,
  scene: NearScene,
  outside = false,
) {
  const rect = event.currentTarget.getBoundingClientRect();
  const b = layout(size);
  if (rect.width <= 0 || rect.height <= 0 || b.scale <= 0) return null;
  const x = (((event.clientX - rect.left) * size.width) / rect.width - b.x) / b.scale;
  const y = (((event.clientY - rect.top) * size.height) / rect.height - b.y) / b.scale;
  if (
    ![x, y].every(Number.isFinite) ||
    (!outside && (x < 0 || x >= 1100 || y < 0 || y >= nearLogicalHeight(scene)))
  )
    return null;
  return { x, y };
}
export const nearCssColor = (c: NearColor) =>
  `rgb(${Math.round(Math.max(0, Math.min(255, c.red)))} ${Math.round(Math.max(0, Math.min(255, c.green)))} ${Math.round(Math.max(0, Math.min(255, c.blue)))})`;

// One reusable low-resolution image per mounted Canvas, not thousands of fillRect calls per frame.
const rasterCanvases = new WeakMap<HTMLCanvasElement, HTMLCanvasElement>();
export function drawNearLab(
  ctx: CanvasRenderingContext2D,
  size: CanvasSize,
  scene: NearScene,
  stage: number,
  frame: ReturnType<typeof nearFrame>,
) {
  setupCanvas(ctx, size);
  const b = layout(size),
    height = nearLogicalHeight(scene);
  ctx.save();
  ctx.translate(b.x, b.y);
  ctx.scale(b.scale, b.scale);
  ctx.fillStyle = "#11182b";
  ctx.fillRect(0, 0, 1100, 800);
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, 1100, height);
  ctx.clip();
  if (stage >= 8) {
    for (const line of nearGridLines(scene)) drawLine(ctx, line.a, line.b, "#28334d", 1);
  }
  let raster = rasterCanvases.get(ctx.canvas);
  if (!raster) {
    raster = ctx.canvas.ownerDocument.createElement("canvas");
    rasterCanvases.set(ctx.canvas, raster);
  }
  if (raster.width !== frame.width) raster.width = frame.width;
  if (raster.height !== frame.height) raster.height = frame.height;
  const rasterContext = raster.getContext("2d");
  if (rasterContext) {
    const image = rasterContext.createImageData(frame.width, frame.height);
    for (const pixel of frame.fragments) {
      const index = (pixel.y * frame.width + pixel.x) * 4;
      image.data[index] = Math.round(pixel.color.red);
      image.data[index + 1] = Math.round(pixel.color.green);
      image.data[index + 2] = Math.round(pixel.color.blue);
      image.data[index + 3] = 255;
    }
    rasterContext.putImageData(image, 0, 0);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(raster, 0, 0, 1100, height);
  }
  ctx.restore();
  if (scene.debug) {
    ctx.fillStyle = "#e1e8fa";
    ctx.font = "19px ui-monospace";
    const rows = [
      "A/D: tiến/lùi · W/S: near · 1–5: preset · R: reset",
      stage >= 6
        ? `V: clip/discard · policy=${scene.policy}`
        : "Chưa nối clipper: đang bỏ cả tam giác nếu có đỉnh ngoài",
      stage >= 2
        ? `Inside/outside/on: ${frame.counts.inside}/${frame.counts.outside}/${frame.counts.onPlane}`
        : "Kéo ngang để đổi độ sâu, không xoay hệ tọa độ",
      stage >= 4
        ? `Polygon: ${frame.polygon.length} · triangle: ${stage >= 5 ? frame.batch.length : "chưa viết fan"}`
        : "",
      stage >= 7
        ? `Pixels=${frame.covered} · violation=${frame.violation.toExponential(1)}`
        : `Pixels=${frame.covered}`,
      stage >= 8 ? "F: clean/debug · J/L: camera X · I/K: camera Z" : "",
    ];
    rows.forEach((row, i) => ctx.fillText(row, 16, 620 + i * 28));
    ctx.fillText("Mặt cắt ZX (camera space)", 770, 620);
    ctx.strokeStyle = "#74839f";
    ctx.strokeRect(770, 644, 300, 140);
    ctx.save();
    ctx.beginPath();
    ctx.rect(770, 644, 300, 140);
    ctx.clip();
    const profile = (v: NearVertex) => ({
      x: 770 + ((v.position.z + 5) * 300) / 13,
      y: 784 - ((v.position.x + 2.5) * 140) / 5,
    });
    const nearX = 770 + ((scene.nearPlane + 5) * 300) / 13;
    drawLine(ctx, { x: nearX, y: 644 }, { x: nearX, y: 784 }, "#ffe26c", 2);
    const input = nearTriangleVertices(frame.source);
    input.forEach((v, i) => {
      drawLine(ctx, profile(v), profile(input[(i + 1) % 3]), "#74839f", 2);
      const p = profile(v);
      ctx.beginPath();
      ctx.arc(p.x, p.y, 4, 0, 2 * Math.PI);
      ctx.fillStyle = nearCssColor(v.color);
      ctx.fill();
    });
    for (const hit of frame.intersections) {
      const p = profile(hit.vertex);
      ctx.beginPath();
      ctx.arc(p.x, p.y, 3, 0, 2 * Math.PI);
      ctx.fillStyle = "#ffffff";
      ctx.fill();
    }
    frame.visiblePolygon.forEach((v, i, polygon) =>
      drawLine(ctx, profile(v), profile(polygon[(i + 1) % polygon.length]), "#53f0ae", 2),
    );
    if (stage >= 5 && frame.polygon.length === 4)
      drawLine(ctx, profile(frame.polygon[0]), profile(frame.polygon[2]), "#936cdc", 2);
    ctx.restore();
  }
  ctx.restore();
}
