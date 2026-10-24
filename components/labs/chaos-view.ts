import { setupCanvas, drawLine, type CanvasSize } from "./lab-shared";
import { doublePendulumGeometry } from "@/lib/labs/double-pendulum-chaos";
import { CHAOS_STEPS, type ChaosScene, type ChaosPoint } from "@/lib/labs/chaos-scene";

export const CHAOS_COLORS = {
  a: "#61afef",
  b: "#e06c75",
  reference: "#98c379",
  physical: "#c678dd",
  numerical: "#e5c07b",
  grid: "#24324d",
  text: "#aebbd2",
};
export function chaosBoardLayout(size: CanvasSize) {
  const scale = Math.min(size.width / 1100, size.height / 820);
  return { scale, x: (size.width - 1100 * scale) / 2, y: (size.height - 820 * scale) / 2 };
}
export function chaosWorldView(s: ChaosScene, lane = 0) {
  return {
    scale: 180 / (s.parameters.length1 + s.parameters.length2),
    pivotX: lane === 0 ? 285 : 815,
    pivotY: 315,
  };
}
export function chaosWorldToScreen(p: ChaosPoint, v: ReturnType<typeof chaosWorldView>) {
  return { x: v.pivotX + p.x * v.scale, y: v.pivotY - p.y * v.scale };
}
export function chaosScreenToWorld(p: ChaosPoint, v: ReturnType<typeof chaosWorldView>) {
  return { x: (p.x - v.pivotX) / v.scale, y: (v.pivotY - p.y) / v.scale };
}
export function chaosEventPoint(
  event: { clientX: number; clientY: number; currentTarget: HTMLCanvasElement },
  size: CanvasSize,
): ChaosPoint | null {
  const rect = event.currentTarget.getBoundingClientRect(),
    board = chaosBoardLayout(size);
  if (rect.width <= 0 || rect.height <= 0 || board.scale <= 0) return null;
  const x = (((event.clientX - rect.left) * size.width) / rect.width - board.x) / board.scale;
  const y = (((event.clientY - rect.top) * size.height) / rect.height - board.y) / board.scale;
  return Number.isFinite(x) && Number.isFinite(y) ? { x, y } : null;
}
export function chaosInPrimaryPane(p: ChaosPoint) {
  return p.x >= 40 && p.x <= 530 && p.y >= 100 && p.y <= 530;
}
function bob(ctx: CanvasRenderingContext2D, p: ChaosPoint, radius: number, color: string) {
  const g = ctx.createRadialGradient(p.x - radius * 0.3, p.y - radius * 0.3, 0, p.x, p.y, radius);
  g.addColorStop(0, "#fff");
  g.addColorStop(0.45, color);
  g.addColorStop(1, "#192338");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
  ctx.fill();
}
function pendulum(ctx: CanvasRenderingContext2D, s: ChaosScene, lane: number, reference = false) {
  const state = reference
    ? s.race.halfStepReference
    : lane === 0
      ? s.race.primary
      : s.race.perturbed;
  const geo = doublePendulumGeometry(state, s.parameters),
    view = chaosWorldView(s, lane);
  const pivot = chaosWorldToScreen(geo.pivot, view),
    p1 = chaosWorldToScreen(geo.bob1, view),
    p2 = chaosWorldToScreen(geo.bob2, view);
  const color = reference ? CHAOS_COLORS.reference : lane === 0 ? CHAOS_COLORS.a : CHAOS_COLORS.b;
  ctx.save();
  if (reference) ctx.globalAlpha = 0.45;
  drawLine(ctx, pivot, p1, color, 3);
  drawLine(ctx, p1, p2, color, 3);
  bob(ctx, p1, 8, color);
  bob(ctx, p2, 11, color);
  bob(ctx, pivot, 4, "#fff");
  ctx.restore();
}
function trail(ctx: CanvasRenderingContext2D, s: ChaosScene, lane: number) {
  const data = lane === 0 ? s.trailA : s.trailB,
    view = chaosWorldView(s, lane),
    color = lane === 0 ? CHAOS_COLORS.a : CHAOS_COLORS.b;
  ctx.save();
  ctx.globalAlpha = 0.4;
  for (let i = 1; i < data.length; i++)
    drawLine(
      ctx,
      chaosWorldToScreen(data[i - 1], view),
      chaosWorldToScreen(data[i], view),
      color,
      1,
    );
  ctx.restore();
}
export function chaosLogY(value: number) {
  return 730 - 140 * Math.max(0, Math.min(1, (Math.log10(Math.max(value, 1e-12)) + 12) / 14));
}
export function chaosEnergyBound(s: ChaosScene) {
  let bound = 1e-12;
  const lanes = s.stage >= 6 && s.debug ? 3 : s.stage >= 4 ? 2 : 1;
  for (const sample of s.history)
    for (let lane = 0; lane < lanes; lane++)
      bound = Math.max(bound, Math.abs(sample.energyErrors[lane]));
  return bound;
}
export function drawChaosEnergy(ctx: CanvasRenderingContext2D, s: ChaosScene) {
  ctx.strokeStyle = CHAOS_COLORS.grid;
  ctx.strokeRect(570, 590, 490, 140);
  drawLine(ctx, { x: 570, y: 660 }, { x: 1060, y: 660 }, "#66738c");
  if (!s.history.length) return;
  const first = s.history[0].time,
    span = Math.max(CHAOS_STEPS[s.dtIndex], s.history.at(-1)!.time - first),
    bound = chaosEnergyBound(s);
  const lanes = s.stage >= 6 && s.debug ? 3 : s.stage >= 4 ? 2 : 1,
    colors = [CHAOS_COLORS.a, CHAOS_COLORS.b, CHAOS_COLORS.reference];
  for (let i = 1; i < s.history.length; i++)
    for (let lane = 0; lane < lanes; lane++) {
      const a = s.history[i - 1],
        b = s.history[i];
      drawLine(
        ctx,
        { x: 570 + (490 * (a.time - first)) / span, y: 660 - (70 * a.energyErrors[lane]) / bound },
        { x: 570 + (490 * (b.time - first)) / span, y: 660 - (70 * b.energyErrors[lane]) / bound },
        colors[lane],
        1.5,
      );
    }
}
export function drawChaosSeparation(ctx: CanvasRenderingContext2D, s: ChaosScene) {
  ctx.strokeStyle = CHAOS_COLORS.grid;
  ctx.strokeRect(40, 590, 490, 140);
  if (!s.history.length) return;
  const first = s.history[0].time,
    span = Math.max(CHAOS_STEPS[s.dtIndex], s.history.at(-1)!.time - first);
  for (let i = 1; i < s.history.length; i++) {
    const a = s.history[i - 1],
      b = s.history[i];
    const x0 = 40 + (490 * (a.time - first)) / span,
      x1 = 40 + (490 * (b.time - first)) / span;
    drawLine(
      ctx,
      { x: x0, y: chaosLogY(a.physical) },
      { x: x1, y: chaosLogY(b.physical) },
      CHAOS_COLORS.physical,
      1.5,
    );
    if (s.stage >= 6)
      drawLine(
        ctx,
        { x: x0, y: chaosLogY(a.numerical) },
        { x: x1, y: chaosLogY(b.numerical) },
        CHAOS_COLORS.numerical,
        1.5,
      );
  }
}
export function drawChaosCanvas(ctx: CanvasRenderingContext2D, size: CanvasSize, s: ChaosScene) {
  setupCanvas(ctx, size);
  const board = chaosBoardLayout(size);
  ctx.save();
  ctx.translate(board.x, board.y);
  ctx.scale(board.scale, board.scale);
  ctx.font = "15px ui-monospace, monospace";
  ctx.fillStyle = "#d7e3f4";
  ctx.fillText("HAI CON LẮC KÉP · cùng mô hình, khác điều kiện đầu", 40, 34);
  ctx.fillText(
    "t = " +
      s.race.primary.elapsed.toFixed(3) +
      " s · " +
      (s.paused ? "Tạm dừng" : "Đang chạy") +
      (s.fastRemaining > 0 ? " · job +30 s" : ""),
    40,
    60,
  );
  for (let lane = 0; lane < 2; lane++) {
    const left = lane === 0 ? 40 : 570,
      view = chaosWorldView(s, lane);
    ctx.strokeStyle = CHAOS_COLORS.grid;
    ctx.strokeRect(left, 100, 490, 430);
    ctx.fillStyle = lane === 0 ? CHAOS_COLORS.a : CHAOS_COLORS.b;
    ctx.fillText(lane === 0 ? "A · trạng thái ban đầu" : "B · theta2 + epsilon", left + 12, 124);
    if (lane === 1 && s.stage < 4) {
      ctx.fillStyle = CHAOS_COLORS.text;
      ctx.fillText("Thêm con lắc B ở bài 4", left + 80, 310);
      continue;
    }
    if (s.debug)
      drawLine(
        ctx,
        { x: view.pivotX, y: view.pivotY },
        { x: view.pivotX, y: view.pivotY + 180 },
        CHAOS_COLORS.grid,
      );
    if (s.stage >= 4) trail(ctx, s, lane);
    if (s.stage >= 6 && s.debug && lane === 0) pendulum(ctx, s, 0, true);
    pendulum(ctx, s, lane);
  }
  ctx.fillStyle = CHAOS_COLORS.text;
  if (s.stage >= 3) {
    ctx.fillText("ΔE (J): xanh A, đỏ B" + (s.stage >= 6 && s.debug ? ", lục h/2" : ""), 570, 570);
    drawChaosEnergy(ctx, s);
    ctx.fillText("±" + chaosEnergyBound(s).toExponential(2) + " J", 578, 584);
  }
  if (s.stage >= 5) {
    ctx.fillText("d(t), log: tím A–B" + (s.stage >= 6 ? ", vàng h–h/2" : ""), 40, 570);
    drawChaosSeparation(ctx, s);
    ctx.fillText("1e2", 40, 584);
    ctx.fillText("1e-12 (sàn hiển thị; d=0 vẫn là 0)", 40, 750);
  }
  if (s.history.length) {
    const first = s.history[0].time,
      last = s.history.at(-1)!.time;
    ctx.fillText(first.toFixed(3) + " → " + last.toFixed(3) + " s", 790, 750);
  }
  if (s.stage < 3)
    ctx.fillText(
      "Góc tính từ phương thẳng đứng hướng xuống · Y hướng lên · L1 = L2 = 1 m",
      40,
      570,
    );
  if (s.stage >= 4)
    ctx.fillText(
      "epsilon = " + s.epsilon.toExponential(1) + " rad · hai khung dùng cùng đơn vị m",
      40,
      788,
    );
  if (s.stage >= 7)
    ctx.fillText("Kéo quả thứ hai của A để đặt lại góc ban đầu; không phải tác động lực.", 40, 810);
  ctx.restore();
}
