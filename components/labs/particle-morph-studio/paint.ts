import {
  Random,
  barycentric,
  eased,
  clamp,
  flowPhase,
} from "@/lib/labs/particle-morph-studio/math";
import { positionAt, type Prepared } from "@/lib/labs/particle-morph-studio/session";
import { projector, type View, type MorphMode } from "@/lib/labs/particle-morph-studio/view";
import type { CanvasSize } from "../lab-shared";

export interface Probe {
  u: number;
  v: number;
}
function palette(t: number) {
  if (t < 0.5) return [10 + 140 * t * 2, 212 - 141 * t * 2, 255];
  return [150 + 105 * (t * 2 - 1), 71 + 87 * (t * 2 - 1), 255 - 214 * (t * 2 - 1)];
}
function triangleLab(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  seed: number,
  probe: Probe,
) {
  const unit = Math.min(width / 10, height / 5);
  const x = width * 0.08;
  const y = height * 0.8;
  const shapes = [
    { x, y, side: unit, area: 1 },
    { x: x + unit * 2.8, y, side: unit * 2, area: 4 },
  ];
  const random = new Random(seed);
  const counts = [0, 0];
  for (const [index, triangle] of shapes.entries()) {
    context.strokeStyle = index === 0 ? "#39d2da" : "#ffae5d";
    context.lineWidth = 2;
    context.beginPath();
    context.moveTo(triangle.x, triangle.y);
    context.lineTo(triangle.x + triangle.side, triangle.y);
    context.lineTo(triangle.x, triangle.y - triangle.side);
    context.closePath();
    context.stroke();
  }
  for (let id = 0; id < 1000; id++) {
    const index = random.uniform() < 0.2 ? 0 : 1;
    const triangle = shapes[index];
    const u = random.uniform();
    const v = random.uniform();
    const weights = barycentric(u, v);
    counts[index]++;
    context.fillStyle = index === 0 ? "#39d2da" : "#ffae5d";
    context.fillRect(
      triangle.x + weights[1] * triangle.side,
      triangle.y - weights[2] * triangle.side,
      1.8,
      1.8,
    );
  }
  const weights = barycentric(probe.u, probe.v);
  for (const triangle of shapes) {
    context.fillStyle = "#fff";
    context.beginPath();
    context.arc(
      triangle.x + weights[1] * triangle.side,
      triangle.y - weights[2] * triangle.side,
      5,
      0,
      Math.PI * 2,
    );
    context.fill();
  }
  context.fillStyle = "#d6e6f1";
  context.font = "13px system-ui";
  context.fillText("Diện tích 1: " + counts[0] + " / 1.000 mẫu", x, Math.max(50, y - unit - 18));
  context.fillText(
    "Diện tích 4: " + counts[1] + " / 1.000 mẫu",
    shapes[1].x,
    Math.max(50, y - unit * 2 - 18),
  );
  context.fillText(
    "Điểm trắng: cùng bộ trọng số barycentric, không phải cùng tọa độ 2D.",
    18,
    height - 18,
  );
}

export function paintMorph(
  context: CanvasRenderingContext2D,
  size: CanvasSize,
  data: Prepared | null,
  view: View,
  time: number,
  mode: MorphMode,
  probe: Probe,
) {
  const { width, height, dpr } = size;
  context.setTransform(dpr, 0, 0, dpr, 0, 0);
  context.fillStyle = "#080e19";
  context.fillRect(0, 0, width, height);
  if (mode === "area") {
    triangleLab(context, width, height, data?.settings.seed ?? 42, probe);
    return;
  }
  const project = projector(view.camera, width, height);
  const line = (
    a: { x: number; y: number; z: number },
    b: { x: number; y: number; z: number },
    color: string,
  ) => {
    const p = project(a);
    const q = project(b);
    if (!p || !q) return;
    context.strokeStyle = color;
    context.beginPath();
    context.moveTo(p.x, p.y);
    context.lineTo(q.x, q.y);
    context.stroke();
  };
  context.lineWidth = 1;
  for (let index = -12; index <= 12; index++) {
    const color = index === 0 ? "#294356" : "#162536";
    line({ x: index * 0.4, y: -2.15, z: -4.8 }, { x: index * 0.4, y: -2.15, z: 4.8 }, color);
    line({ x: -4.8, y: -2.15, z: index * 0.4 }, { x: 4.8, y: -2.15, z: index * 0.4 }, color);
  }
  if (!data) {
    context.fillStyle = "#b4d3e3";
    context.font = "14px system-ui";
    context.fillText("Đang chuẩn bị mẫu đầu tiên…", 20, 35);
    return;
  }
  if (view.paths) {
    const subset = Math.min(24, data.settings.count);
    for (let item = 0; item < subset; item++) {
      const id = subset > 1 ? Math.floor((item * (data.settings.count - 1)) / (subset - 1)) : 0;
      for (let segment = 0; segment < 12; segment++)
        line(
          positionAt(data, id, segment / 12, view.matching, view.easing, view.path),
          positionAt(data, id, (segment + 1) / 12, view.matching, view.easing, view.path),
          "#3b596b",
        );
    }
  }
  const tint = palette(time);
  const points = [];
  for (let id = 0; id < data.settings.count; id++) {
    const screen = project(positionAt(data, id, time, view.matching, view.easing, view.path));
    if (screen) points.push({ ...screen, id });
  }
  points.sort((a, b) => b.z - a.z);
  for (const point of points) {
    let color = tint;
    if (view.heat) {
      const ratio = clamp((data.density[point.id] - 0.5) / 1.5, 0, 1);
      color = [30 + 225 * ratio, 170 - 106 * ratio, 232 - 191 * ratio];
    }
    const light = clamp((11 - point.z) / 6, 0.28, 1);
    context.fillStyle = "rgb(" + color.map((value) => Math.round(value * light)).join(",") + ")";
    const radius = clamp(12 / point.z, 1.2, 4);
    context.beginPath();
    context.arc(point.x, point.y, radius, 0, Math.PI * 2);
    context.fill();
  }
  context.fillStyle = "#d4e8f2";
  context.font = "12px system-ui";
  context.fillText(
    "CPU Canvas · " +
      data.settings.count.toLocaleString("vi-VN") +
      " mẫu · " +
      view.matching +
      " · t = " +
      time.toFixed(3),
    15,
    23,
  );
  if (mode === "timeline") {
    const left = 20;
    const top = height - 108;
    const w = 150;
    const h = 72;
    context.fillStyle = "#08101f";
    context.fillRect(left - 5, top - 12, w + 22, h + 40);
    const ids = view.path === "flow" ? [0, 7, 42] : [0];
    for (const [index, id] of ids.entries()) {
      const phase = (t: number) => eased(view.path === "flow" ? flowPhase(t, id) : t, view.easing);
      context.strokeStyle = ["#74e6db", "#ffcb75", "#ba9cff"][index];
      context.beginPath();
      for (let step = 0; step <= 50; step++) {
        const x = left + (w * step) / 50;
        const y = top + h * (1 - phase(step / 50));
        if (step === 0) context.moveTo(x, y);
        else context.lineTo(x, y);
      }
      context.stroke();
      context.fillStyle = context.strokeStyle;
      context.beginPath();
      context.arc(left + w * time, top + h * (1 - phase(time)), 3, 0, Math.PI * 2);
      context.fill();
    }
    context.fillStyle = "#d4e8f2";
    context.fillText(
      view.path === "flow" ? "t → s_i: ID 0 / 7 / 42" : "t → easing(t)",
      left,
      top + h + 21,
    );
  }
  if (mode === "compute") {
    const count = Math.min(data.settings.count, 257);
    const lanes = Math.ceil(count / 256) * 256;
    const cell = Math.min(8, (width - 36) / 64);
    const top = height - 90;
    context.fillStyle = "#08101f";
    context.fillRect(12, top - 21, width - 24, 92);
    for (let lane = 0; lane < lanes; lane++) {
      context.fillStyle = lane < count ? "#48d5cd" : "#344352";
      context.fillRect(
        18 + (lane % 64) * cell,
        top + Math.floor(lane / 64) * 7,
        Math.max(2, cell - 2),
        5,
      );
    }
    context.fillStyle = "#d4e8f2";
    context.fillText(
      "ID minh họa: " + count + " hợp lệ / " + lanes + " lanes; phần dư phải return.",
      18,
      top - 6,
    );
  }
}
