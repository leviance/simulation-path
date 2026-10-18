import {
  cameraScale,
  gridSpacing,
  gridValues,
  screenToWorld,
  worldToScreen,
  type CoordinateScene,
} from "@/lib/labs/coordinate";
import { drawLine, setupCanvas, type CanvasSize } from "./lab-shared";
import { clamp, type Point } from "@/lib/labs/geometry";

export function coordinatePoint(
  event: { clientX: number; clientY: number; currentTarget: HTMLCanvasElement },
  size: CanvasSize,
): Point | null {
  const rect = event.currentTarget.getBoundingClientRect();
  if (!rect.width || !rect.height) return null;
  const x = ((event.clientX - rect.left) * size.width) / rect.width;
  const y = ((event.clientY - rect.top) * size.height) / rect.height;
  if (
    !Number.isFinite(x) ||
    !Number.isFinite(y) ||
    x < 0 ||
    y < 0 ||
    x >= size.width ||
    y >= size.height
  )
    return null;
  return { x, y };
}

export function drawCoordinateLab(
  ctx: CanvasRenderingContext2D,
  size: CanvasSize,
  scene: CoordinateScene,
  cursor: Point,
  grid: boolean,
) {
  setupCanvas(ctx, size);
  const { camera } = scene;
  const origin = worldToScreen({ x: 0, y: 0 }, camera, size);
  const spacing = gridSpacing(cameraScale(camera));
  const bottomLeft = screenToWorld({ x: 0, y: size.height }, camera, size);
  const topRight = screenToWorld({ x: size.width, y: 0 }, camera, size);
  ctx.font = "11px ui-monospace";
  if (grid) {
    for (const x of gridValues(bottomLeft.x, topRight.x, spacing)) {
      const screen = worldToScreen({ x, y: 0 }, camera, size);
      drawLine(ctx, { x: screen.x, y: 0 }, { x: screen.x, y: size.height }, "#28334d");
      ctx.fillStyle = "#9aa6c1";
      ctx.fillText(
        Number(x.toPrecision(4)).toString(),
        screen.x + 4,
        clamp(origin.y + 16, 18, size.height - 8),
      );
    }
    for (const y of gridValues(bottomLeft.y, topRight.y, spacing)) {
      const screen = worldToScreen({ x: 0, y }, camera, size);
      drawLine(ctx, { x: 0, y: screen.y }, { x: size.width, y: screen.y }, "#28334d");
      ctx.fillStyle = "#9aa6c1";
      if (Math.abs(y) > spacing * 1e-6)
        ctx.fillText(
          Number(y.toPrecision(4)).toString(),
          clamp(origin.x + 6, 6, size.width - 60),
          screen.y - 5,
        );
    }
  }
  drawLine(ctx, { x: 0, y: origin.y }, { x: size.width, y: origin.y }, "#ffb454", 2);
  drawLine(ctx, { x: origin.x, y: 0 }, { x: origin.x, y: size.height }, "#84a9ff", 2);
  ctx.fillStyle = "#ffb454";
  ctx.fillText("X →", size.width - 40, clamp(origin.y - 8, 16, size.height - 12));
  ctx.fillStyle = "#84a9ff";
  ctx.fillText("Y ↑", clamp(origin.x + 8, 8, size.width - 40), 16);
  scene.points.forEach((point, index) => {
    const screen = worldToScreen(point, camera, size);
    ctx.beginPath();
    ctx.arc(screen.x, screen.y, index === scene.selected ? 9 : 6, 0, Math.PI * 2);
    ctx.fillStyle = index === scene.selected ? "#ffffff" : "#53f0ae";
    ctx.fill();
    ctx.fillStyle = "#53f0ae";
    ctx.fillText(
      "P" + (index + 1) + " (" + point.x.toFixed(2) + ", " + point.y.toFixed(2) + ")",
      screen.x + 13,
      screen.y - 10,
    );
  });
  drawLine(ctx, { x: cursor.x - 6, y: cursor.y }, { x: cursor.x + 6, y: cursor.y }, "#ebefff");
  drawLine(ctx, { x: cursor.x, y: cursor.y - 6 }, { x: cursor.x, y: cursor.y + 6 }, "#ebefff");
}
