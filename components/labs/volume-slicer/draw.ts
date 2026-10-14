import {
  axesFor,
  fitSlice,
  lower,
  panelRect,
  viewNames,
  type Grid,
  type Point,
} from "@/lib/labs/volume-slicer";
import { setupCanvas, type CanvasSize } from "../lab-shared";

export function drawSlices(
  ctx: CanvasRenderingContext2D,
  size: CanvasSize,
  grid: Grid,
  cursor: Point,
  activeView: number,
  stage: number,
  images: Uint8ClampedArray[],
) {
  setupCanvas(ctx, size);
  const threeViews = stage >= 6,
    views = threeViews ? [0, 1, 2] : [activeView];
  ctx.font = "12px sans-serif";
  for (const [index, view] of views.entries()) {
    const panel = panelRect(view, size.width, size.height, threeViews),
      rect = fitSlice(grid, view, panel),
      image = images[index],
      side = Math.sqrt(image.length / 4);
    const offscreen = document.createElement("canvas");
    offscreen.width = side;
    offscreen.height = side;
    offscreen
      .getContext("2d")
      ?.putImageData(new ImageData(new Uint8ClampedArray(image), side, side), 0, 0);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(offscreen, rect.x, rect.y, rect.width, rect.height);
    ctx.strokeStyle = activeView === view ? "#64e1b4" : "#5a647d";
    ctx.strokeRect(rect.x, rect.y, rect.width, rect.height);
    ctx.fillStyle = "#d4dfef";
    ctx.fillText(viewNames[view], panel.x, 22);
    if (!threeViews) continue;
    const axes = axesFor(view),
      u =
        (cursor[axes.horizontal] - lower(grid, axes.horizontal)) /
        (grid.count[axes.horizontal] * grid.spacing[axes.horizontal]),
      v =
        1 -
        (cursor[axes.vertical] - lower(grid, axes.vertical)) /
          (grid.count[axes.vertical] * grid.spacing[axes.vertical]);
    ctx.strokeStyle = "#64e1b4";
    ctx.beginPath();
    ctx.moveTo(rect.x + u * rect.width, rect.y);
    ctx.lineTo(rect.x + u * rect.width, rect.y + rect.height);
    ctx.moveTo(rect.x, rect.y + v * rect.height);
    ctx.lineTo(rect.x + rect.width, rect.y + v * rect.height);
    ctx.stroke();
  }
  ctx.fillStyle = "#aebbd0";
  ctx.fillText("Scalar tổng hợp [0,1] — không phải CT/HU", 12, size.height - 10);
}
