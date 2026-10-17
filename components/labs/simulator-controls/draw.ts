import {
  ballRadius,
  canvasHeight,
  canvasWidth,
  floorY,
  gravitySlider,
  panel,
  pauseButton,
  resetButton,
  scene,
  type Control,
  type Model,
  type Rect,
  type Ui,
} from "@/lib/labs/simulator-controls";
import { setupCanvas, type CanvasSize } from "../lab-shared";

export function draw(
  ctx: CanvasRenderingContext2D,
  size: CanvasSize,
  model: Model,
  ui: Ui,
  stage = 7,
) {
  setupCanvas(ctx, size);
  const scale = Math.min(size.width / canvasWidth, size.height / canvasHeight);
  ctx.translate((size.width - canvasWidth * scale) / 2, (size.height - canvasHeight * scale) / 2);
  ctx.scale(scale, scale);
  const fill = (rect: Rect, color: string) => {
    ctx.fillStyle = color;
    ctx.fillRect(rect.x, rect.y, rect.width, rect.height);
  };
  const text = (value: string, x: number, y: number, color = "#e5edf8") => {
    ctx.fillStyle = color;
    ctx.font = "16px system-ui";
    ctx.fillText(value, x, y);
  };
  fill(scene, "#141d2e");
  if (stage >= 2) fill(panel, "#192336");
  fill({ x: 48, y: floorY, width: 568, height: 2 }, "#648f89");
  ctx.beginPath();
  ctx.arc(320, model.y, ballRadius, 0, 2 * Math.PI);
  ctx.fillStyle = "#ffbe68";
  ctx.fill();
  if (stage >= 6) {
    text("Bấm trong cảnh để đặt lại vị trí bóng", 48, 54);
    text(`Click vào cảnh: ${model.scenePresses}`, 48, 80, "#9cacbf");
  }
  text(`y=${model.y.toFixed(2)} · v=${model.velocity.toFixed(2)}`, 48, 496);
  if (stage < 2) return;
  text("BẢNG ĐIỀU KHIỂN", 688, 56);
  const button = (id: Control, rect: Rect, label: string) => {
    let color = "#303f57";
    if (ui.hot === id) color = "#435776";
    if (ui.active === id && ui.hot === id) color = "#217068";
    fill(rect, color);
    text(label, rect.x + 16, rect.y + 28);
  };
  button("Pause", pauseButton, model.paused ? "Tiếp tục" : "Tạm dừng");
  button("Reset", resetButton, "Reset cảnh");
  if (stage >= 4) {
    text(`Trọng lực: ${model.gravity.toFixed(0)} px/s²`, 688, 216);
    fill(gravitySlider, "#263248");
    fill({ x: gravitySlider.x, y: 250, width: gravitySlider.width, height: 4 }, "#6f84a4");
    const knobX = gravitySlider.x + (model.gravity / 1200) * gravitySlider.width;
    fill({ x: knobX - 5, y: 238, width: 10, height: 28 }, "#59e1be");
    text("0", 688, 296);
    text("1200", 872, 296);
  }
  if (stage >= 5) {
    text("Tab: chọn control", 688, 356);
    text("Enter/Space: nhấn nút", 688, 384);
    text("← → / Home / End: slider", 688, 412);
  } else text("Space: chạy/dừng · N: bước", 688, 384);
  text("Esc: hủy thao tác kéo", 688, 440);
  text("Reset giữ gravity và Pause", 688, 484, "#9cacbf");
  let focused: Rect | null = null;
  if (ui.focus === "Pause") focused = pauseButton;
  if (ui.focus === "Reset") focused = resetButton;
  if (ui.focus === "Gravity") focused = gravitySlider;
  if (stage >= 5 && focused) {
    ctx.strokeStyle = "#ffd166";
    ctx.lineWidth = 2;
    ctx.strokeRect(focused.x - 3, focused.y - 3, focused.width + 6, focused.height + 6);
  }
}
