import { draw as drawTree } from "../widget-tree/draw";
import { contentBox, locate, type Lab, type Model, type Ui } from "@/lib/labs/box-layout";
import type { CanvasSize } from "../lab-shared";
export function draw(
  ctx: CanvasRenderingContext2D,
  size: CanvasSize,
  lab: Lab,
  model: Model,
  ui: Ui,
  selected: number,
  boxes: boolean,
) {
  drawTree(ctx, size, lab.tree, model, ui, 8);
  if (lab.stage < 2 || !boxes) return;
  const view = locate(lab.tree, selected),
    style = lab.styles.get(selected);
  if (!view || !style) return;
  const r = view.bounds,
    content = contentBox(r, style);
  ctx.save();
  ctx.lineWidth = 2;
  ctx.strokeStyle = "#ffbe68";
  ctx.setLineDash([5, 4]);
  ctx.strokeRect(
    r.x - style.margin.left,
    r.y - style.margin.top,
    r.width + style.margin.left + style.margin.right,
    r.height + style.margin.top + style.margin.bottom,
  );
  ctx.setLineDash([]);
  ctx.strokeStyle = "#8fbaff";
  ctx.strokeRect(r.x, r.y, r.width, r.height);
  ctx.strokeStyle = "#59e1be";
  ctx.strokeRect(content.x, content.y, content.width, content.height);
  ctx.restore();
}
