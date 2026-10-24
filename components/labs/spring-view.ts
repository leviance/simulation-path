import { drawLine, setupCanvas, type CanvasSize } from "./lab-shared";
import { type SpringScene } from "@/lib/labs/spring-scene";
import {
  springAdd,
  springSubtract,
  springScale,
  springLength,
  finiteSpringVector,
  sampleElasticSpring,
  type SpringVec2,
} from "@/lib/labs/spring-chain";

export function springWorldView(s: SpringScene) {
  if (s.stage === 2) return { scale: 200, originX: 240, originY: 350 };
  const links = Math.max(2, s.count) - 1;
  const expectedExtension =
    s.gravityEnabled && s.stiffness > 0
      ? (s.mass * 9.81 * links * (links + 1)) / (2 * s.stiffness)
      : 0;
  const height = Math.max(3, links * s.restLength + expectedExtension + 1.6);
  return { scale: Math.min(110, 500 / height), originX: 350, originY: 130 };
}
export function springWorldToScreen(p: SpringVec2, view: ReturnType<typeof springWorldView>) {
  return { x: view.originX + view.scale * p.x, y: view.originY - view.scale * p.y };
}
export function springScreenToWorld(p: SpringVec2, view: ReturnType<typeof springWorldView>) {
  return { x: (p.x - view.originX) / view.scale, y: (view.originY - p.y) / view.scale };
}
export function springBoardLayout(size: CanvasSize) {
  const scale = Math.min(size.width / 1100, size.height / 820);
  return { scale, x: (size.width - 1100 * scale) / 2, y: (size.height - 820 * scale) / 2 };
}
export function springEventPoint(
  event: { clientX: number; clientY: number; currentTarget: HTMLCanvasElement },
  size: CanvasSize,
) {
  const rect = event.currentTarget.getBoundingClientRect(),
    board = springBoardLayout(size);
  if (rect.width <= 0 || rect.height <= 0 || board.scale <= 0) return null;
  const point = {
    x: (((event.clientX - rect.left) * size.width) / rect.width - board.x) / board.scale,
    y: (((event.clientY - rect.top) * size.height) / rect.height - board.y) / board.scale,
  };
  return finiteSpringVector(point) ? point : null;
}
export function springInsideViewport(p: SpringVec2) {
  return p.x >= 40 && p.x <= 690 && p.y >= 100 && p.y <= 650;
}
export function springBoundedPointer(p: SpringVec2, s: SpringScene) {
  return springScreenToWorld(
    { x: Math.max(40, Math.min(690, p.x)), y: Math.max(100, Math.min(650, p.y)) },
    springWorldView(s),
  );
}
function arrow(ctx: CanvasRenderingContext2D, a: SpringVec2, b: SpringVec2, color: string) {
  const distance = springLength(springSubtract(b, a));
  if (!Number.isFinite(distance) || distance <= 1e-9) return;
  if (distance > 80) b = springAdd(a, springScale(springSubtract(b, a), 80 / distance));
  drawLine(ctx, a, b, color, 1.5);
  const angle = Math.atan2(b.y - a.y, b.x - a.x);
  for (const sign of [-1, 1])
    drawLine(
      ctx,
      b,
      { x: b.x - 6 * Math.cos(angle + sign * 0.4), y: b.y - 6 * Math.sin(angle + sign * 0.4) },
      color,
      1.5,
    );
}
function coil(ctx: CanvasRenderingContext2D, a: SpringVec2, b: SpringVec2, color: string) {
  const delta = springSubtract(b, a),
    distance = springLength(delta);
  if (!Number.isFinite(distance) || distance <= 1e-12) return;
  const normal = { x: -delta.y / distance, y: delta.x / distance };
  let previous = a;
  for (let i = 1; i <= 12; i++) {
    const offset = i === 12 ? 0 : (i % 2 === 0 ? -1 : 1) * Math.min(4, distance * 0.12);
    const current = springAdd(
      springAdd(a, springScale(delta, i / 12)),
      springScale(normal, offset),
    );
    drawLine(ctx, previous, current, color, 1.5);
    previous = current;
  }
}
export function drawSpringEnergy(ctx: CanvasRenderingContext2D, s: SpringScene) {
  const data = s.history;
  if (!data.length) return;
  let low = 0,
    high = 0;
  for (const v of data) {
    low = Math.min(low, v.total, v.kinetic, v.elastic, v.gravity);
    high = Math.max(high, v.total, v.kinetic, v.elastic, v.gravity);
  }
  const range = Math.max(1e-6, high - low),
    first = data[0].time,
    span = Math.max(0.001, data[data.length - 1].time - first);
  const point = (time: number, value: number) => ({
    x: 735 + (325 * (time - first)) / span,
    y: 610 - (150 * (value - low)) / range,
  });
  ctx.strokeStyle = "#24324d";
  ctx.strokeRect(735, 460, 325, 150);
  drawLine(ctx, { x: 735, y: point(first, 0).y }, { x: 1060, y: point(first, 0).y }, "#66738c");
  const keys = ["total", "kinetic", "elastic", "gravity"] as const,
    colors = ["#ffffff", "#53f0ae", "#e5c07b", "#c792ea"];
  for (let i = 1; i < data.length; i++)
    for (let j = 0; j < keys.length; j++)
      drawLine(
        ctx,
        point(data[i - 1].time, data[i - 1][keys[j]]),
        point(data[i].time, data[i][keys[j]]),
        colors[j],
        1.5,
      );
  ctx.fillStyle = "#aabbcf";
  ctx.fillText(high.toFixed(3) + " J", 735, 454);
  ctx.fillText(low.toFixed(3) + " J", 735, 626);
  ctx.fillText(first.toFixed(3) + " → " + data[data.length - 1].time.toFixed(3) + " s", 835, 626);
}
export function drawSpringCanvas(ctx: CanvasRenderingContext2D, size: CanvasSize, s: SpringScene) {
  setupCanvas(ctx, size);
  const board = springBoardLayout(size),
    view = springWorldView(s);
  ctx.save();
  ctx.translate(board.x, board.y);
  ctx.scale(board.scale, board.scale);
  ctx.font = "15px ui-monospace, monospace";
  ctx.fillStyle = "#d7e3f4";
  ctx.fillText(
    "CHUỖI LÒ XO · " + s.chain.particles.length + " mass / " + s.chain.springs.length + " spring",
    40,
    34,
  );
  ctx.fillText("t = " + s.elapsed.toFixed(3) + " s · Y hướng lên · m / s / N / J", 40, 59);
  ctx.strokeStyle = "#66738c";
  ctx.strokeRect(40, 100, 650, 550);
  ctx.save();
  ctx.beginPath();
  ctx.rect(40, 100, 650, 550);
  ctx.clip();
  if (s.debug)
    for (let row = 1; row <= 10; row++)
      drawLine(ctx, { x: 40, y: 100 + 50 * row }, { x: 690, y: 100 + 50 * row }, "#24324d");
  for (const link of s.chain.springs) {
    const a = s.chain.particles[link.first],
      b = s.chain.particles[link.second];
    const stretch = springLength(springSubtract(b.position, a.position)) - link.restLength;
    coil(
      ctx,
      springWorldToScreen(a.position, view),
      springWorldToScreen(b.position, view),
      s.stage < 2
        ? "#66738c"
        : stretch > 0.002
          ? "#e5c07b"
          : stretch < -0.002
            ? "#56b6c2"
            : "#66738c",
    );
  }
  s.chain.particles.forEach((particle, index) => {
    const center = springWorldToScreen(particle.position, view);
    if (!finiteSpringVector(center)) return;
    const radius = Math.max(2, Math.min(9, particle.radius * view.scale));
    if (index === s.selected) {
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(center.x, center.y, radius + 3, 0, 2 * Math.PI);
      ctx.stroke();
    }
    const gradient = ctx.createRadialGradient(
      center.x - radius * 0.3,
      center.y - radius * 0.3,
      0,
      center.x,
      center.y,
      radius,
    );
    gradient.addColorStop(0, index === 0 ? "#e7c2ff" : "#c5ffed");
    gradient.addColorStop(0.45, index === 0 ? "#c678dd" : "#53f0ae");
    gradient.addColorStop(1, "#173c46");
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(center.x, center.y, radius, 0, 2 * Math.PI);
    ctx.fill();
    if (s.debug && index === s.selected) {
      ctx.fillStyle = "#ffffff";
      ctx.fillText("node " + index, center.x + radius + 9, center.y - 7);
    }
    if (s.debug && s.stage >= 3)
      arrow(
        ctx,
        center,
        springWorldToScreen(springAdd(particle.position, springScale(particle.force, 0.08)), view),
        "#ff7b72",
      );
  });
  ctx.restore();
  ctx.fillStyle = "#c678dd";
  const anchor = springWorldToScreen(s.chain.anchorPosition, view);
  ctx.fillRect(anchor.x - 20, anchor.y - 25, 40, 15);
  drawLine(ctx, { x: anchor.x, y: anchor.y - 10 }, anchor, "#c678dd", 2);
  if (s.stage === 2) {
    const pair = sampleElasticSpring(s.chain, s.chain.springs[0]);
    const a = s.chain.particles[0].position,
      b = s.chain.particles[1].position;
    arrow(
      ctx,
      springWorldToScreen(a, view),
      springWorldToScreen(springAdd(a, springScale(pair.forceOnFirst, 0.08)), view),
      "#ff7b72",
    );
    arrow(
      ctx,
      springWorldToScreen(b, view),
      springWorldToScreen(springSubtract(b, springScale(pair.forceOnFirst, 0.08)), view),
      "#ff7b72",
    );
  }
  if (s.stage >= 6) {
    ctx.fillStyle = "#d7e3f4";
    ctx.fillText("Độ lệch x (m) theo index", 735, 126);
    ctx.strokeStyle = "#24324d";
    ctx.strokeRect(735, 150, 325, 210);
    ctx.save();
    ctx.beginPath();
    ctx.rect(735, 150, 325, 210);
    ctx.clip();
    for (const x of [-1, 0, 1])
      drawLine(ctx, { x: 735, y: 260 - 60 * x }, { x: 1060, y: 260 - 60 * x }, "#24324d");
    let previous: SpringVec2 | null = null;
    s.chain.particles.forEach((p, i) => {
      const point = {
        x: 735 + (325 * i) / (s.chain.particles.length - 1),
        y: 260 - 60 * p.position.x,
      };
      if (previous) drawLine(ctx, previous, point, "#53f0ae", 2);
      previous = point;
    });
    ctx.restore();
    ctx.fillStyle = "#aabbcf";
    ctx.fillText("1 m", 700, 204);
    ctx.fillText("0", 709, 264);
    ctx.fillText("−1 m", 694, 324);
    ctx.fillText("0", 735, 378);
    ctx.fillText(String(s.chain.particles.length - 1), 1032, 378);
  }
  if (s.stage >= 8) {
    ctx.fillStyle = "#d7e3f4";
    ctx.fillText("Năng lượng: E / K / Us / Ug", 735, 418);
    drawSpringEnergy(ctx, s);
  }
  ctx.fillStyle = "#aabbcf";
  ctx.fillText(
    s.debug
      ? "Vàng: giãn · xanh lam: nén · đỏ: F của bước gần nhất"
      : "Chế độ trình diễn · chuỗi và đồ thị",
    40,
    680,
  );
  if (s.stage >= 8) ctx.fillText("1201 mẫu gần nhất · định kỳ ≤60 Hz + bước đơn/cuối job", 40, 715);
  ctx.restore();
}
