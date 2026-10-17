import { paintList, type Tree, type Ui, type Model, type Placed } from "@/lib/labs/widget-tree";
import { setupCanvas, type CanvasSize } from "../lab-shared";
export function draw(
  ctx: CanvasRenderingContext2D,
  size: CanvasSize,
  tree: Tree,
  model: Model,
  ui: Ui,
  stage: number,
) {
  setupCanvas(ctx, size);
  const scale = Math.min(size.width / 960, size.height / 540);
  ctx.translate((size.width - 960 * scale) / 2, (size.height - 540 * scale) / 2);
  ctx.scale(scale, scale);
  ctx.fillStyle = "#141d2e";
  ctx.fillRect(24, 24, 616, 492);
  ctx.strokeStyle = "#648f89";
  ctx.beginPath();
  ctx.moveTo(48, 460);
  ctx.lineTo(616, 460);
  ctx.stroke();
  ctx.fillStyle = "#ffbe68";
  ctx.beginPath();
  ctx.arc(320, model.y, 14, 0, Math.PI * 2);
  ctx.fill();
  ctx.font = "15px system-ui";
  ctx.fillStyle = "#a6b6cc";
  ctx.fillText("Cảnh bóng rơi — UI dùng một cây riêng", 48, 54);
  const text = (s: string, x: number, y: number) => {
    ctx.fillStyle = "#e5edf8";
    ctx.fillText(s, x, y);
  };
  const paint = (p: Placed) => {
    const { node, bounds: r } = p;
    ctx.save();
    ctx.beginPath();
    ctx.rect(p.clip.x, p.clip.y, p.clip.width, p.clip.height);
    ctx.clip();
    if (node.kind === "Panel") {
      ctx.fillStyle = node.id === 1 ? "#192336" : "#1e2a40";
      ctx.fillRect(r.x, r.y, r.width, r.height);
    }
    if (node.kind === "Button") {
      let color = "#303f57";
      if (ui.hot === node.id) color = "#435776";
      if (ui.active === node.id && ui.hot === node.id) color = "#217068";
      if (!p.enabled) color = "#2b2d31";
      ctx.fillStyle = color;
      ctx.fillRect(r.x, r.y, r.width, r.height);
    }
    let label = node.text;
    if (node.action === "Pause") label = model.paused ? "Tiếp tục" : "Tạm dừng";
    if (node.action === "Reset")
      label = node.text === "Reset on top" ? "Reset ở phía trên" : "Reset cảnh";
    if (node.binding === "Gravity") label = `g=${model.gravity.toFixed(0)} px/s²`;
    if (node.binding === "Time") label = `ticks=${model.ticks}`;
    if (node.kind !== "Panel" && node.kind !== "Slider") text(label, r.x + 4, r.y + 18);
    if (node.kind === "Slider" && stage >= 5) {
      ctx.fillStyle = "#263248";
      ctx.fillRect(r.x, r.y, r.width, r.height);
      ctx.fillStyle = "#6f84a4";
      ctx.fillRect(r.x, r.y + 18, r.width, 4);
      ctx.fillStyle = p.enabled ? "#59e1be" : "#596273";
      ctx.fillRect(r.x + (model.gravity / 1200) * r.width - 4, r.y + 6, 8, 28);
    }
    if (stage >= 6 && ui.focus === node.id) {
      ctx.strokeStyle = "#ffd166";
      ctx.lineWidth = 2;
      ctx.strokeRect(r.x + 2, r.y + 2, r.width - 4, r.height - 4);
    }
    ctx.restore();
  };
  for (const p of paintList(tree, stage)) paint(p);
  text(`hot=${ui.hot} · active=${ui.active} · focus=${ui.focus}`, 48, 500);
}
