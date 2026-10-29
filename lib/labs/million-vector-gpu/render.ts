import {
  DESKTOP_LIMITS,
  WEAK_LIMITS,
  makeDispatchPlan,
  std430ByteOffset,
  validateCapabilities,
  type ComputeLimits,
} from "../million-vector-gpu.ts";
import { labView, probeData, workgroupGrid, type VectorLabState } from "./controller.ts";
import { includedSteps, PIPELINE_STEPS } from "./scopes.ts";

const font = "12px ui-monospace, SFMono-Regular, Consolas, monospace";
const colors = ["#61afef", "#e5c07b", "#98c379", "#e06c75"];
export const CAPABILITY_LABELS = [
  "OpenGL 4.3",
  "Local size / invocations",
  "Workgroup count X",
  "SSBO bytes (gồm padding)",
  "3 binding / storage block",
  "Budget ứng dụng",
] as const;

export function selectedLimits(state: Readonly<VectorLabState>): ComputeLimits {
  if (state.limitsPreset === "weak") return WEAK_LIMITS;
  if (state.limitsPreset === "bindings") return { ...DESKTOP_LIMITS, maximumStorageBindings: 2 };
  if (state.limitsPreset === "capacity")
    return { ...DESKTOP_LIMITS, maximumShaderStorageBlockBytes: 4096 };
  return DESKTOP_LIMITS;
}

function title(ctx: CanvasRenderingContext2D, text: string) {
  ctx.fillStyle = "#d7deec";
  ctx.font = font;
  ctx.fillText(text, 20, 24, ctx.canvas.width);
}

function wrapped(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, width: number) {
  let line = "";
  let row = 0;
  for (const word of text.split(" ")) {
    if (line && ctx.measureText(line + " " + word).width > width) {
      ctx.fillText(line, x, y + row * 14);
      line = word;
      row += 1;
    } else line += (line ? " " : "") + word;
  }
  ctx.fillText(line, x, y + row * 14);
}

function vectors(ctx: CanvasRenderingContext2D, state: Readonly<VectorLabState>) {
  const { a, b, expected, actual } = probeData(state);
  const values = [a, b, expected, actual];
  const keys = ["x", "y", "z", "w"] as const;
  const { viewportWidth: width, viewportHeight: height } = state;
  title(ctx, `Vec4 tại index ${state.selectedIndex} · ${state.operation}`);
  ctx.font = "11px ui-monospace, monospace";
  ["A", "B", "CPU", "mẫu thử"].forEach((text, index) => {
    const x = 20 + (index * (width - 40)) / 4;
    ctx.fillStyle = colors[index];
    ctx.fillText(text, x, 48);
  });
  const maximum = Math.max(
    1,
    ...values.flatMap((v) => keys.map((key) => (Number.isFinite(v[key]) ? Math.abs(v[key]) : 0))),
  );
  const baseline = 70 + (height - 120) / 2;
  const scale = (height - 145) / (2 * maximum);
  const column = (width - 60) / 4;
  ctx.strokeStyle = "#45546e";
  ctx.beginPath();
  ctx.moveTo(25, baseline);
  ctx.lineTo(width - 20, baseline);
  ctx.stroke();
  ctx.fillStyle = "#9baac3";
  ctx.fillText("0", 10, baseline + 4);
  keys.forEach((key, channel) => {
    const left = 30 + channel * column;
    if (channel === state.component) {
      ctx.fillStyle = "#182b42";
      ctx.fillRect(left, 62, column - 5, height - 102);
    }
    values.forEach((value, series) => {
      const x = left + 3 + (series * (column - 12)) / 4;
      const number = value[key];
      ctx.fillStyle = colors[series];
      if (!Number.isFinite(number)) {
        ctx.fillText("!", x, baseline - 10);
        return;
      }
      const bar = number * scale;
      ctx.fillRect(
        x,
        Math.min(baseline, baseline - bar),
        Math.max(2, (column - 16) / 4),
        Math.max(1, Math.abs(bar)),
      );
    });
    ctx.fillStyle = "#d7deec";
    ctx.fillText(key, left + column / 2 - 4, height - 28);
  });
  ctx.fillStyle = "#9baac3";
  ctx.fillText("Mẫu thử do JavaScript tạo, không phải GPU readback.", 20, height - 9, width - 40);
}

function layout(ctx: CanvasRenderingContext2D, state: Readonly<VectorLabState>) {
  const { viewportWidth: width, viewportHeight: height } = state;
  const count = width < 480 ? 3 : 5;
  const start = Math.min(
    Math.max(0, state.selectedIndex - Math.floor(count / 2)),
    state.elementCount - count,
  );
  const cell = (width - 40) / count;
  const gap = (height - 70) / 3;
  title(ctx, "std430: một Vec4 = 16 byte, bốn float");
  ["binding 0: A", "binding 1: B", "binding 2: output"].forEach((label, row) => {
    const y = 58 + row * gap;
    ctx.fillStyle = colors[row];
    ctx.fillText(label, 20, y - 7);
    for (let offset = 0; offset < count; offset += 1) {
      const index = start + offset;
      const x = 20 + offset * cell;
      for (let component = 0; component < 4; component += 1) {
        ctx.globalAlpha = index === state.selectedIndex && component === state.component ? 1 : 0.35;
        ctx.fillStyle = colors[row];
        ctx.fillRect(x + (component * (cell - 6)) / 4, y, (cell - 6) / 4 - 1, 25);
      }
      ctx.globalAlpha = 1;
      ctx.fillStyle = "#c2cfe4";
      ctx.font = "10px ui-monospace, monospace";
      ctx.fillText(`i=${index}`, x + 2, y + 39, cell - 6);
      ctx.fillText(`${std430ByteOffset(index)}B`, x + 2, y + 52, cell - 6);
      if (index === state.selectedIndex) {
        ctx.strokeStyle = "#ffffff";
        ctx.strokeRect(x - 1, y - 1, cell - 5, 28);
      }
    }
  });
}

function group(ctx: CanvasRenderingContext2D, state: Readonly<VectorLabState>) {
  const plan = makeDispatchPlan(state.elementCount, state.localSize);
  const groupId = state.mode === "dispatch-tail" ? plan.workgroupCount - 1 : 0;
  const grid = workgroupGrid(state);
  title(ctx, `Group ${groupId} · xanh: hợp lệ, đỏ: guard loại`);
  for (let lane = 0; lane < state.localSize; lane += 1) {
    const x = grid.left + (lane % grid.columns) * grid.cell;
    const y = grid.top + Math.floor(lane / grid.columns) * grid.cell;
    ctx.fillStyle = groupId * state.localSize + lane < state.elementCount ? colors[0] : colors[3];
    ctx.globalAlpha = lane === state.selectedLane ? 1 : 0.45;
    ctx.fillRect(x + 1, y + 1, grid.cell - 2, grid.cell - 2);
    if (lane === state.selectedLane) {
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 2;
      ctx.strokeRect(x, y, grid.cell, grid.cell);
    }
  }
  ctx.globalAlpha = 1;
  ctx.fillStyle = "#c2cfe4";
  ctx.fillText(
    `global = ${groupId} × ${state.localSize} + ${state.selectedLane} = ${groupId * state.localSize + state.selectedLane}`,
    20,
    state.viewportHeight - 16,
    state.viewportWidth - 40,
  );
}

function pipeline(ctx: CanvasRenderingContext2D, state: Readonly<VectorLabState>) {
  const width = state.viewportWidth;
  const columns = width < 600 ? 3 : 4;
  const boxWidth = (width - 48) / columns;
  const included = new Set(includedSteps(state.scope));
  title(ctx, "Phạm vi đo, không phải biểu đồ thời gian");
  PIPELINE_STEPS.forEach((label, index) => {
    const x = 20 + (index % columns) * boxWidth;
    const y = 48 + Math.floor(index / columns) * 66;
    ctx.fillStyle = included.has(index) ? "#244b5c" : "#1d283d";
    if (index === 2 && state.barrierMode !== "correct") ctx.fillStyle = "#60353f";
    ctx.fillRect(x, y, boxWidth - 8, 56);
    if (index === state.tourStep) {
      ctx.strokeStyle = "#e5c07b";
      ctx.strokeRect(x, y, boxWidth - 8, 56);
    }
    ctx.fillStyle = "#d7deec";
    ctx.font = "11px ui-monospace, monospace";
    wrapped(ctx, `${index + 1}. ${label}`, x + 6, y + 17, boxWidth - 20);
  });
  ctx.fillStyle = "#c2cfe4";
  wrapped(
    ctx,
    state.scope === "cpu"
      ? "CPU loop là nhánh riêng; không đo các bước GPU này."
      : "Ô xanh nằm trong vùng đo. Độ rộng ô không biểu diễn milliseconds.",
    20,
    state.viewportHeight - 40,
    width - 40,
  );
}

export function renderVectorLab(ctx: CanvasRenderingContext2D, state: Readonly<VectorLabState>) {
  const view = labView(state.mode);
  if (view === "vectors") vectors(ctx, state);
  else if (view === "layout") layout(ctx, state);
  else if (view === "group") group(ctx, state);
  else if (view === "barrier" || view === "timing") pipeline(ctx, state);
  else {
    title(ctx, "Giới hạn GIẢ ĐỊNH — không đọc phần cứng máy bạn");
    const report = validateCapabilities(
      selectedLimits(state),
      makeDispatchPlan(state.elementCount, state.localSize),
    );
    const rowHeight = (state.viewportHeight - 56) / 6;
    Object.values(report).forEach((passed, index) => {
      const y = 44 + rowHeight * index;
      ctx.fillStyle = passed ? "#1d4739" : "#572e3b";
      ctx.fillRect(20, y, state.viewportWidth - 40, rowHeight - 6);
      ctx.fillStyle = passed ? "#98c379" : "#e06c75";
      ctx.fillText(
        `${passed ? "PASS" : "FAIL"} · ${CAPABILITY_LABELS[index]}`,
        28,
        y + 20,
        state.viewportWidth - 60,
      );
      if (index === state.tourStep) {
        ctx.strokeStyle = "#e5c07b";
        ctx.strokeRect(20, y, state.viewportWidth - 40, rowHeight - 6);
      }
    });
  }
}
