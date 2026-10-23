import {
  INTEGRATOR_NAMES,
  analyticIntegratorState,
  integratorAcceleration,
  traceExplicitEulerStep,
  traceVelocityVerletStep,
  traceRungeKutta4Step,
} from "@/lib/labs/integrator-race";
import {
  integratorFixedDelta,
  type IntegratorScene,
  type IntegratorHistorySample,
} from "@/lib/labs/integrator-scene";
import { drawPhaseInspector, type PhasePoint } from "./integrator-phase-view";
import { drawLine, setupCanvas, type CanvasSize } from "./lab-shared";

const COLORS = ["#ff7b72", "#53f0ae", "#c792ea"];
const GRID = "#24324d",
  EXACT = "#f5f7ff";
export const integratorPositionToScreen = (position: number) => 560 + 100 * position;
export const integratorScreenToPosition = (x: number) => (x - 560) / 100;
export const integratorLaneY = (index: number) => 140 + 110 * index;
function layout(size: CanvasSize) {
  const scale = Math.min(size.width / 1100, size.height / 820);
  return { scale, x: (size.width - 1100 * scale) / 2, y: (size.height - 820 * scale) / 2 };
}
export function integratorPointFromEvent(
  event: { clientX: number; clientY: number; currentTarget: HTMLCanvasElement },
  size: CanvasSize,
) {
  const rect = event.currentTarget.getBoundingClientRect(),
    board = layout(size);
  if (rect.width <= 0 || rect.height <= 0 || board.scale <= 0) return null;
  const x = (((event.clientX - rect.left) * size.width) / rect.width - board.x) / board.scale;
  const y = (((event.clientY - rect.top) * size.height) / rect.height - board.y) / board.scale;
  return Number.isFinite(x) && Number.isFinite(y) ? { x, y } : null;
}
export function integratorDisplayedPosition(scene: IntegratorScene, index: number) {
  return index < Math.min(3, scene.stage - 1)
    ? scene.race.lanes[index].state.position
    : analyticIntegratorState(scene.initial, scene.parameters, scene.elapsed).position;
}
export function integratorHitMass(scene: IntegratorScene, point: { x: number; y: number }) {
  for (let lane = 0; lane < 3; lane++) {
    const x = integratorPositionToScreen(integratorDisplayedPosition(scene, lane));
    if (
      x >= 25 &&
      x <= 1075 &&
      Math.abs(point.x - x) <= 24 &&
      Math.abs(point.y - integratorLaneY(lane)) <= 24
    )
      return x;
  }
  return null;
}
function spring(ctx: CanvasRenderingContext2D, massX: number, y: number, color: string) {
  ctx.beginPath();
  ctx.moveTo(55, y);
  for (let segment = 1; segment <= 12; segment++) {
    const x = 55 + ((massX - 16 - 55) * segment) / 12;
    ctx.lineTo(x, y + (segment < 12 ? (segment % 2 === 0 ? -8 : 8) : 0));
  }
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.stroke();
}
function historyValue(sample: IntegratorHistorySample, scene: IntegratorScene, lane: number) {
  if (scene.graph === "error") return sample.errors[lane];
  if (scene.graph === "energy") return sample.energies[lane];
  return sample.positions[lane];
}
export function integratorGraphScale(scene: IntegratorScene) {
  let extent = 1e-6;
  for (const sample of scene.history) {
    if (scene.graph === "position") extent = Math.max(extent, Math.abs(sample.exactPosition));
    for (let lane = 0; lane < 3; lane++) {
      const value = historyValue(sample, scene, lane);
      if (Number.isFinite(value)) extent = Math.max(extent, Math.abs(value));
    }
  }
  const first = scene.history[0]?.time ?? 0;
  const last = Math.max(first + integratorFixedDelta(scene), scene.history.at(-1)?.time ?? 0);
  return { extent: extent * 1.1, first, last };
}
function drawHistory(ctx: CanvasRenderingContext2D, scene: IntegratorScene) {
  const scale = integratorGraphScale(scene);
  const yOf = (value: number) =>
    scene.graph === "error"
      ? 650 - (value / scale.extent) * 210
      : 545 - (value / scale.extent) * 105;
  ctx.font = "13px ui-monospace, Consolas, monospace";
  ctx.fillStyle = "#aebbd2";
  for (const t of [0, 0.5, 1]) {
    const y = 440 + t * 210;
    if (scene.debug) drawLine(ctx, { x: 40, y }, { x: 1060, y }, GRID);
    const value = scene.graph === "error" ? scale.extent * (1 - t) : scale.extent * (1 - 2 * t);
    ctx.fillText(value.toExponential(1), 42, y + 15);
  }
  const plot = (lane: number, color: string) => {
    let previous: { x: number; y: number } | null = null;
    for (const sample of scene.history) {
      const value = lane < 0 ? sample.exactPosition : historyValue(sample, scene, lane);
      if (!Number.isFinite(value)) {
        previous = null;
        continue;
      }
      const point = {
        x: 40 + (1020 * (sample.time - scale.first)) / (scale.last - scale.first),
        y: yOf(value),
      };
      if (previous) drawLine(ctx, previous, point, color, 2);
      previous = point;
    }
  };
  if (scene.graph === "position") plot(-1, EXACT);
  for (let lane = 0; lane < 3; lane++) plot(lane, COLORS[lane]);
  ctx.fillStyle = EXACT;
  const labels = {
    position: "Vị trí x(t), m — trắng: nghiệm chính xác",
    error: "Sai số trạng thái, m — không phải sai số góc pha",
    energy: "(E − E₀) / E₀ — tỉ số có dấu, không phải %",
  };
  ctx.fillText(labels[scene.graph], 40, 420);
  ctx.fillText(
    `${scale.first.toFixed(2)} → ${scale.last.toFixed(2)} s · ${scene.history.length} mẫu physics gần nhất`,
    40,
    680,
  );
}
export function drawIntegratorRace(
  ctx: CanvasRenderingContext2D,
  size: CanvasSize,
  scene: IntegratorScene,
) {
  setupCanvas(ctx, size);
  const board = layout(size);
  ctx.save();
  ctx.translate(board.x, board.y);
  ctx.scale(board.scale, board.scale);
  ctx.beginPath();
  ctx.rect(0, 0, 1100, 820);
  ctx.clip();
  ctx.font = "16px ui-monospace, Consolas, monospace";
  ctx.fillStyle = EXACT;
  ctx.fillText(
    `CÙNG MỘT LÒ XO · t = ${scene.elapsed.toFixed(3)} s · dt = ${integratorFixedDelta(scene).toFixed(5)} s`,
    30,
    35,
  );
  ctx.fillText("Khung trắng: nghiệm chính xác cùng thời điểm. Màu luôn đi theo làn.", 30, 65);
  const exact = analyticIntegratorState(scene.initial, scene.parameters, scene.elapsed);
  for (let lane = 0; lane < 3; lane++) {
    const y = integratorLaneY(lane),
      color = COLORS[lane];
    drawLine(ctx, { x: 30, y: y + 25 }, { x: 1070, y: y + 25 }, "#66738c");
    if (scene.debug) drawLine(ctx, { x: 560, y: y - 32 }, { x: 560, y: y + 25 }, GRID);
    ctx.fillStyle = "#66738c";
    ctx.fillRect(40, y - 32, 10, 57);
    const rawX = integratorPositionToScreen(integratorDisplayedPosition(scene, lane));
    const x = Math.max(25, Math.min(1075, rawX));
    const available = lane < Math.min(3, scene.stage - 1);
    spring(ctx, x, y, color);
    ctx.fillStyle = color;
    if (available) ctx.fillRect(x - 15, y - 15, 30, 30);
    else {
      ctx.strokeStyle = color;
      ctx.strokeRect(x - 15, y - 15, 30, 30);
    }
    const ghost = integratorPositionToScreen(exact.position);
    if (ghost >= 20 && ghost <= 1080) {
      ctx.strokeStyle = EXACT;
      ctx.strokeRect(ghost - 19, y - 19, 38, 38);
    }
    ctx.fillStyle = color;
    ctx.fillText(
      `Làn ${lane + 1}: ${available ? INTEGRATOR_NAMES[scene.kinds[lane]] : "nghiệm chính xác, chưa có solver"}`,
      60,
      y - 38,
    );
    if (rawX < 25 || rawX > 1075)
      ctx.fillText(
        "↑ ngoài khung; state không bị clamp",
        Math.max(60, Math.min(690, x - 100)),
        y + 45,
      );
  }
  if (scene.stage >= 2 && scene.stage <= 4) {
    const lane = scene.stage - 2,
      previous = scene.beforeLast ?? scene.race;
    const current = previous.lanes[lane].state,
      dt = integratorFixedDelta(scene);
    let points: PhasePoint[] = [];
    if (scene.stage === 2) {
      const trace = traceExplicitEulerStep(current, scene.parameters, dt);
      if (trace)
        points = [
          { label: "đầu bước", state: trace.current },
          { label: "cuối bước", state: trace.next },
        ];
    }
    if (scene.stage === 3) {
      const trace = traceVelocityVerletStep(current, scene.parameters, dt);
      if (trace)
        points = [
          { label: "đầu bước", state: trace.current },
          { label: "cuối bước", state: trace.next },
        ];
    }
    if (scene.stage === 4) {
      const trace = traceRungeKutta4Step(current, scene.parameters, dt);
      if (trace)
        points = [
          { label: "yₙ", state: trace.current },
          { label: "k₂", state: trace.stage2State },
          { label: "k₃", state: trace.stage3State },
          { label: "k₄", state: trace.stage4State },
          { label: "yₙ₊₁", state: trace.next },
        ];
    }
    drawPhaseInspector(
      ctx,
      { left: 60, top: 450, width: 980, height: 250 },
      points,
      scene.initial,
      scene.parameters,
      COLORS[lane],
    );
    ctx.fillStyle = EXACT;
    ctx.fillText(
      "Mặt phẳng (x, v/ω): vòng trắng là quỹ đạo đúng, không phải đường chuyển động ngoài đời.",
      30,
      735,
    );
  } else if (scene.stage >= 6) drawHistory(ctx, scene);
  else {
    ctx.fillStyle = EXACT;
    ctx.fillText(
      `a(x₀) = −(k/m)x₀ = ${integratorAcceleration(scene.initial.position, scene.parameters).toFixed(3)} m/s²`,
      40,
      460,
    );
    ctx.fillText(
      scene.stage === 1
        ? "Thử x₀ ở hai phía gốc rồi quan sát chiều của gia tốc."
        : "Bài 6 sẽ ghi mẫu sau mỗi bước physics để vẽ đồ thị, không ghi theo frame.",
      40,
      495,
    );
  }
  ctx.fillStyle = "#ffe26c";
  ctx.font = "15px ui-monospace, Consolas, monospace";
  if (scene.warning) ctx.fillText(scene.warning, 30, 785);
  ctx.restore();
}
