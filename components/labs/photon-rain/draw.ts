import {
  firstFlight,
  sampleFirst,
  type Experiment,
  type Point,
  type Settings,
  type Trace,
} from "@/lib/labs/photon-rain";
import { setupCanvas, type CanvasSize } from "../lab-shared";

export function timelineVertex(x: number, y: number, size: CanvasSize, vertices: number) {
  const width = size.width * 0.62 - 32;
  if (x < 16 || x > width + 16 || y < size.height - 44 || y > size.height - 8) return null;
  return Math.round(((x - 16) / width) * (vertices - 1));
}
const eventColor = {
  emission: "#f7cb71",
  candidate: "#f7cb71",
  absorption: "#ff7088",
  scatter: "#f7cb71",
  escape: "#59ddbd",
};
export function draw(
  ctx: CanvasRenderingContext2D,
  size: CanvasSize,
  settings: Settings,
  experiment: Experiment,
  trace: Trace,
  id: number,
  visible: number,
  stage: number,
) {
  setupCanvas(ctx, size);
  ctx.font = "12px system-ui";
  ctx.fillStyle = "#dae3f5";
  ctx.fillText("Môi trường đồng nhất — XY", 16, 22);
  const scale = Math.min((size.width * 0.62 - 40) / 3, (size.height - 150) / 2);
  const cx = size.width * 0.31,
    cy = 45 + scale;
  const screen = (p: Point): [number, number] => [cx + p[0] * scale, cy - p[1] * scale];
  ctx.fillStyle = "#192a42";
  ctx.fillRect(cx - 1.5 * scale, cy - scale, 3 * scale, 2 * scale);
  ctx.strokeStyle = "#7ca0c8";
  ctx.strokeRect(cx - 1.5 * scale, cy - scale, 3 * scale, 2 * scale);
  const path = (record: Trace, through: number, ghost: boolean) => {
    ctx.beginPath();
    ctx.moveTo(...screen(record.vertices[0].position));
    for (let i = 1; i <= through; i++) ctx.lineTo(...screen(record.vertices[i].position));
    ctx.strokeStyle = ghost ? "#40556b" : "#f7cb71";
    ctx.lineWidth = ghost ? 1 : 2;
    ctx.stroke();
    if (ghost) return;
    const vertex = record.vertices[through];
    ctx.beginPath();
    ctx.arc(...screen(vertex.position), 4, 0, 2 * Math.PI);
    ctx.fillStyle =
      through === record.vertices.length - 1 && record.status === "censored"
        ? "#c492fa"
        : eventColor[vertex.event];
    ctx.fill();
    if (record.vertices.length === 1) {
      const p = screen(vertex.position);
      ctx.beginPath();
      ctx.moveTo(...p);
      ctx.lineTo(p[0] + 25, p[1]);
      ctx.stroke();
    }
  };
  if (stage >= 6)
    for (const recent of experiment.recent)
      path(recent.trace, recent.trace.vertices.length - 1, true);
  path(trace, visible, false);
  if (stage >= 2) {
    const sample = sampleFirst(settings, id);
    const width = size.width * 0.62 - 32;
    const y = size.height - 66;
    ctx.fillStyle = "#cad6ed";
    ctx.fillText("S lấy mẫu: trục 0–6, không phải đường đi", 16, y - 12);
    ctx.strokeStyle = "#718cae";
    ctx.beginPath();
    ctx.moveTo(16, y);
    ctx.lineTo(16 + width, y);
    ctx.stroke();
    const x = 16 + (Math.min(6, sample.distance) / 6) * width;
    ctx.fillStyle = "#f7cb71";
    ctx.fillRect(x - 2, y - 6, 4, 12);
    if (stage >= 3) {
      ctx.fillStyle = "#cad6ed";
      const flight = firstFlight(settings, id);
      ctx.fillText(
        "S=" +
          (Number.isFinite(flight.sampled) ? flight.sampled.toFixed(3) : "∞") +
          "; biên=" +
          flight.boundary.toFixed(3),
        16,
        cy + scale + 19,
      );
    }
  }
  if (stage >= 5) {
    const width = size.width * 0.62 - 32,
      y = size.height - 26;
    ctx.strokeStyle = "#718cae";
    ctx.beginPath();
    ctx.moveTo(16, y);
    ctx.lineTo(16 + width, y);
    ctx.stroke();
    const x = 16 + (visible / Math.max(1, trace.vertices.length - 1)) * width;
    ctx.fillStyle = "#dae3f5";
    ctx.fillRect(x - 3, y - 7, 6, 14);
  }
  const x = size.width * 0.68;
  ctx.fillStyle = "#dae3f5";
  if (stage < 6) {
    ctx.fillText("Đếm nhiều photon từ Bài 06", x, 45);
    return;
  }
  const c = experiment.counts;
  const bars = [
    ["Hấp thụ", c.absorbed, "#ff7088"],
    ["Thoát mọi phía", c.escaped, "#59ddbd"],
    ["Chưa biết (chạm giới hạn)", c.censored, "#c492fa"],
    ["Thoát không tương tác", c.ballistic, "#f7cb71"],
  ] as const;
  bars.forEach(([label, count, color], i) => {
    const y = 50 + i * 57;
    ctx.fillStyle = "#dae3f5";
    ctx.fillText(label, x, y);
    ctx.fillStyle = color;
    ctx.fillRect(x, y + 8, c.completed > 0 ? (size.width * 0.28 * count) / c.completed : 0, 12);
    ctx.fillText(count + " / " + c.completed, x, y + 34);
  });
}
