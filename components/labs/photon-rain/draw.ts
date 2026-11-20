import {
  firstFlight,
  sampleFirst,
  type Experiment,
  type Settings,
  type Trace,
} from "@/lib/labs/photon-rain";
import { setupCanvas, type CanvasSize } from "../lab-shared";
import { chamber, ink, layout, line, screen, text, type Rect } from "./chamber";
import { readout } from "./instrument-readout";

export function timelineVertex(x: number, y: number, size: CanvasSize, vertices: number) {
  const { track } = layout(size);
  if (
    vertices < 1 ||
    x < track.x ||
    x > track.x + track.w ||
    y < size.height - 44 ||
    y > size.height - 8
  )
    return null;
  return Math.round(((x - track.x) / track.w) * (vertices - 1));
}
const eventColor = {
  emission: ink.gold,
  candidate: ink.gold,
  absorption: ink.coral,
  scatter: ink.gold,
  escape: ink.teal,
};

function path(
  ctx: CanvasRenderingContext2D,
  tank: Rect,
  record: Trace,
  through: number,
  ghost: boolean,
) {
  if (!record.vertices.length) return;
  const last = Math.min(record.vertices.length - 1, Math.max(0, through));
  ctx.beginPath();
  ctx.moveTo(...screen(tank, record.vertices[0].position));
  for (let i = 1; i <= last; i++) ctx.lineTo(...screen(tank, record.vertices[i].position));
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  ctx.strokeStyle = ghost ? "#56818b" : "#917146";
  ctx.lineWidth = ghost ? 0.85 : 3.7;
  ctx.stroke();
  if (ghost) return;
  ctx.strokeStyle = ink.gold;
  ctx.lineWidth = 1.6;
  ctx.stroke();
  for (let i = 1; i <= last; i++)
    if (record.vertices[i].event === "scatter") {
      const [x, y] = screen(tank, record.vertices[i].position);
      ctx.fillStyle = "#ecf2c2";
      ctx.fillRect(x - 1.5, y - 1.5, 3, 3);
    }
  const vertex = record.vertices[last],
    [x, y] = screen(tank, vertex.position);
  const color =
    last === record.vertices.length - 1 && record.status === "censored"
      ? ink.lilac
      : eventColor[vertex.event];
  if (vertex.event === "absorption") {
    line(ctx, x - 4, y - 4, x + 4, y + 4, color);
    line(ctx, x - 4, y + 4, x + 4, y - 4, color);
  }
  ctx.beginPath();
  ctx.moveTo(x, y - 4.5);
  ctx.lineTo(x + 4.5, y);
  ctx.lineTo(x, y + 4.5);
  ctx.lineTo(x - 4.5, y);
  ctx.closePath();
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.6;
  ctx.stroke();
  ctx.fillStyle = ink.paper;
  ctx.fillRect(x - 1, y - 1, 2, 2);
}
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
  const geometry = layout(size),
    { tank, track } = geometry;
  chamber(ctx, size, tank, settings);
  if (stage >= 6)
    for (const recent of experiment.recent)
      path(ctx, tank, recent.trace, recent.trace.vertices.length - 1, true);
  path(ctx, tank, trace, visible, false);
  readout(ctx, geometry.readout, tank, experiment, stage, geometry.compact);
  if (stage >= 2) {
    const sample = sampleFirst(settings, id),
      y = size.height - 56;
    const free = Number.isFinite(sample.distance) ? sample.distance.toFixed(2) : "∞";
    let note = "Quãng tự do S = " + free + "  ·  thước 0–6";
    if (stage >= 3) note += "  ·  biên " + firstFlight(settings, id).boundary.toFixed(2);
    text(ctx, note, track.x, y - 6, ink.muted, 10);
    line(ctx, track.x, y, track.x + track.w, y, ink.divider, 2);
    const x = track.x + (Math.min(6, sample.distance) * track.w) / 6;
    ctx.fillStyle = ink.gold;
    ctx.fillRect(x - 2, y - 4, 4, 8);
  }
  if (stage >= 5) {
    const y = size.height - 26;
    text(
      ctx,
      `Sự kiện ${visible}/${Math.max(0, trace.vertices.length - 1)}  ·  kéo để xem đường đã ghi`,
      track.x,
      y - 5,
      ink.muted,
      10,
    );
    line(ctx, track.x, y, track.x + track.w, y, ink.divider, 2);
    const x = track.x + (visible / Math.max(1, trace.vertices.length - 1)) * track.w;
    ctx.fillStyle = ink.teal;
    ctx.fillRect(x - 2, y - 4, 4, 9);
  }
}
