import { objWorldToCamera } from "@/lib/labs/obj-geometry";
import { objScreenLine, type buildObjScene } from "@/lib/labs/obj-viewer";
import type { ObjViewerState } from "@/lib/labs/obj-controls";
import type { ZFrame, ZScreenVertex } from "@/lib/labs/z-buffer";
import { drawLine, setupCanvas, type CanvasSize } from "./lab-shared";

export const OBJ_WIDTH = 256,
  OBJ_HEIGHT = 160;
export function drawObjViewer(
  ctx: CanvasRenderingContext2D,
  size: CanvasSize,
  scene: ReturnType<typeof buildObjScene>,
  frame: ZFrame,
  state: ObjViewerState,
  stage: number,
  selected: number,
  error: string,
) {
  setupCanvas(ctx, size);
  const scale = Math.min((size.width - 24) / OBJ_WIDTH, (size.height - 24) / OBJ_HEIGHT);
  const left = (size.width - OBJ_WIDTH * scale) / 2,
    top = (size.height - OBJ_HEIGHT * scale) / 2;
  const point = (p: ZScreenVertex) => ({ x: left + p.x * scale, y: top + p.y * scale });
  ctx.save();
  ctx.beginPath();
  ctx.rect(left, top, OBJ_WIDTH * scale, OBJ_HEIGHT * scale);
  ctx.clip();
  if (state.grid) {
    const camera = { yaw: state.cameraYaw, pitch: state.cameraPitch, distance: state.distance };
    for (let i = -6; i <= 6; i++) {
      for (const [a, b] of [
        [
          { x: i * 0.5, y: -1.1, z: -3 },
          { x: i * 0.5, y: -1.1, z: 3 },
        ],
        [
          { x: -3, y: -1.1, z: i * 0.5 },
          { x: 3, y: -1.1, z: i * 0.5 },
        ],
      ]) {
        const line = objScreenLine(
          objWorldToCamera(a, camera),
          objWorldToCamera(b, camera),
          OBJ_WIDTH,
          OBJ_HEIGHT,
        );
        if (line) drawLine(ctx, point(line[0]), point(line[1]), "#283a54", 1);
      }
    }
    const origin = { x: 0, y: -1.1, z: 0 };
    for (const [end, color] of [
      [{ x: 1.4, y: -1.1, z: 0 }, "#ef657a"],
      [{ x: 0, y: 0.3, z: 0 }, "#55d9a3"],
      [{ x: 0, y: -1.1, z: 1.4 }, "#6eabff"],
    ] as const) {
      const line = objScreenLine(
        objWorldToCamera(origin, camera),
        objWorldToCamera(end, camera),
        OBJ_WIDTH,
        OBJ_HEIGHT,
      );
      if (line) drawLine(ctx, point(line[0]), point(line[1]), color, 2);
    }
  }
  if (state.solid && stage >= 6) {
    // Bitmap riêng giữ pixel sắc nét; không dùng Canvas fill để thay rasterizer.
    const bitmap = document.createElement("canvas");
    bitmap.width = OBJ_WIDTH;
    bitmap.height = OBJ_HEIGHT;
    const bitmapContext = bitmap.getContext("2d");
    if (bitmapContext) {
      const image = bitmapContext.createImageData(OBJ_WIDTH, OBJ_HEIGHT);
      frame.colors.forEach((color, i) => {
        if (frame.depths[i] >= 1) return;
        image.data.set([color.red, color.green, color.blue, 255], i * 4);
      });
      bitmapContext.putImageData(image, 0, 0);
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(bitmap, left, top, OBJ_WIDTH * scale, OBJ_HEIGHT * scale);
    }
  } else if (stage >= 2) {
    for (const edge of scene.edges) drawLine(ctx, point(edge[0]), point(edge[1]), "#70d6ff", 1);
  }
  if (stage === 1 || (state.debug && stage <= 3)) {
    scene.projectedPositions.forEach((p, index) => {
      if (![p.x, p.y].every(Number.isFinite)) return;
      const screen = point(p);
      ctx.fillStyle = "#ffd166";
      ctx.fillRect(screen.x - 2, screen.y - 2, 4, 4);
      if (state.debug && index < 100) {
        ctx.font = "11px ui-monospace";
        ctx.fillText(String(index + 1), screen.x + 4, screen.y - 4);
      }
    });
  }
  if (state.debug && stage >= 2) {
    for (const triangle of scene.triangles.filter((t) => t.sourceTriangle === selected)) {
      for (const [a, b] of [
        [triangle.a, triangle.b],
        [triangle.b, triangle.c],
        [triangle.c, triangle.a],
      ])
        drawLine(ctx, point(a), point(b), "#ffc96b", 2);
    }
  }
  if (state.normals && stage >= 6) {
    for (const line of scene.normalLines)
      drawLine(ctx, point(line[0]), point(line[1]), "#ffc96b", 1);
  }
  ctx.restore();
  if (error) {
    ctx.fillStyle = "#ff9ba5";
    ctx.font = "13px ui-monospace";
    ctx.fillText("Input lỗi — xem thông báo bên dưới", 16, 28);
  }
}
