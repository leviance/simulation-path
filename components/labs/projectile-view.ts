import {
  analyticProjectilePosition,
  projectileWorldToScreen,
  sampleAnalyticProjectile,
  solveProjectileGroundImpactTime,
  type ProjectileLaunch,
  type ProjectileVec2,
  type ProjectileWorldView,
} from "@/lib/labs/projectile";
import type { ProjectileFlight } from "@/lib/labs/projectile-flight";
import { drawLine, setupCanvas, type CanvasSize } from "./lab-shared";

function arrow(
  context: CanvasRenderingContext2D,
  a: ProjectileVec2,
  b: ProjectileVec2,
  color: string,
) {
  drawLine(context, a, b, color, 2);
  const angle = Math.atan2(b.y - a.y, b.x - a.x);
  for (const offset of [-0.45, 0.45])
    drawLine(
      context,
      b,
      { x: b.x - 10 * Math.cos(angle + offset), y: b.y - 10 * Math.sin(angle + offset) },
      color,
      2,
    );
}
export function drawProjectileView(
  context: CanvasRenderingContext2D,
  size: CanvasSize,
  view: ProjectileWorldView,
  preview: ProjectileLaunch,
  flight: ProjectileFlight,
  history: ProjectileFlight[],
  stage: number,
  debug: boolean,
) {
  setupCanvas(context, size);
  const screen = (p: ProjectileVec2) => projectileWorldToScreen(p, view);
  const circle = (p: ProjectileVec2, radius: number, color: string) => {
    context.beginPath();
    context.arc(p.x, p.y, radius, 0, 2 * Math.PI);
    context.fillStyle = color;
    context.fill();
  };
  const polyline = (points: ProjectileVec2[], color: string) => {
    context.beginPath();
    points.forEach((p, i) => {
      const s = screen(p);
      if (i === 0) context.moveTo(s.x, s.y);
      else context.lineTo(s.x, s.y);
    });
    context.strokeStyle = color;
    context.lineWidth = 2;
    context.stroke();
  };
  if (debug) {
    const spacing = view.pixelsPerMeter < 3 ? 50 : 10;
    context.font = "11px ui-monospace";
    context.fillStyle = "#91a3bc";
    for (let x = 0; x * view.pixelsPerMeter < size.width - 50; x += spacing) {
      const bottom = screen({ x, y: 0 });
      drawLine(context, bottom, { x: bottom.x, y: 36 }, "#1d2940");
      context.fillText(`${x} m`, bottom.x + 2, bottom.y + 17);
    }
    for (let y = spacing; y * view.pixelsPerMeter < size.height - 80; y += spacing) {
      const a = screen({ x: 0, y });
      drawLine(context, a, { x: size.width, y: a.y }, "#1d2940");
      context.fillText(`${y}`, 6, a.y);
    }
  }
  drawLine(
    context,
    { x: 0, y: view.screenOrigin.y },
    { x: size.width, y: view.screenOrigin.y },
    "#6f8f72",
    2,
  );
  for (const old of history)
    polyline(
      old.samples.map((s) => s.position),
      "#536782",
    );
  const reference = flight.exists ? flight.launch : preview;
  if (stage >= 3) {
    const duration = solveProjectileGroundImpactTime(reference, 0) ?? 6;
    polyline(sampleAnalyticProjectile(reference, duration, 160), "#ffd166");
    circle(screen(analyticProjectilePosition(reference, duration)), 4, "#ffd166");
    const apex = reference.velocity.y / -reference.acceleration.y;
    circle(screen(analyticProjectilePosition(reference, apex)), 4, "#ffd166");
  }
  polyline(
    flight.samples.map((s) => s.position),
    "#53f0ae",
  );
  if (flight.exists) {
    const exact = screen(analyticProjectilePosition(flight.launch, flight.projectile.elapsed));
    const numerical = screen(flight.projectile.position);
    drawLine(context, exact, numerical, "#ff7b86", 2);
    circle(exact, 4, "#ff7b86");
    circle(numerical, 6, "#53f0ae");
  }
  if (stage >= 6 && debug && flight.impact?.impacted) {
    const raw = screen(flight.impact.uncorrectedPosition);
    drawLine(context, { x: raw.x - 4, y: raw.y - 4 }, { x: raw.x + 4, y: raw.y + 4 }, "#ff7b86", 2);
    drawLine(context, { x: raw.x - 4, y: raw.y + 4 }, { x: raw.x + 4, y: raw.y - 4 }, "#ff7b86", 2);
  }
  const muzzle = screen(preview.position);
  const angle = Math.atan2(preview.velocity.y, preview.velocity.x);
  const base = { x: muzzle.x - 24 * Math.cos(angle), y: muzzle.y + 24 * Math.sin(angle) };
  circle(base, 12, "#344564");
  drawLine(context, base, muzzle, "#d5deef", 5);
  const end = { x: muzzle.x + preview.velocity.x * 5, y: muzzle.y - preview.velocity.y * 5 };
  arrow(context, muzzle, end, "#70d6ff");
  circle(end, 5, "#70d6ff");
  if (stage >= 2 && debug) {
    const horizontal = { x: end.x, y: muzzle.y };
    arrow(context, muzzle, horizontal, "#ffb454");
    arrow(context, horizontal, end, "#c792ea");
  }
  context.font = "11px ui-monospace";
  context.fillStyle = "#ffd166";
  context.fillText("ANALYTIC", 12, 20);
  if (stage >= 4) {
    context.fillStyle = "#53f0ae";
    context.fillText("EXPLICIT EULER", 110, 20);
  }
}
