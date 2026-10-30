import {
  add3,
  subtract3,
  scale3,
  dot3,
  normalize3,
  magnitude3,
  type Vec3,
} from "@/lib/labs/normal";
import {
  worldToCompassCamera,
  projectCompassPoint,
  clipCompassDepth,
} from "@/lib/labs/normal-camera";
import { compassResults, type CompassScene } from "@/lib/labs/normal-scene";
import { drawLine, setupCanvas, type CanvasSize } from "./lab-shared";
function layout(size: CanvasSize) {
  const scale = Math.min(size.width / 1100, size.height / 800);
  return { scale, x: (size.width - 1100 * scale) / 2, y: (size.height - 800 * scale) / 2 };
}
export function compassPointFromEvent(
  event: { clientX: number; clientY: number; currentTarget: HTMLCanvasElement },
  size: CanvasSize,
  outside = false,
) {
  const rect = event.currentTarget.getBoundingClientRect(),
    view = layout(size);
  if (rect.width <= 0 || rect.height <= 0 || view.scale <= 0) return null;
  const x = (((event.clientX - rect.left) * size.width) / rect.width - view.x) / view.scale,
    y = (((event.clientY - rect.top) * size.height) / rect.height - view.y) / view.scale;
  if (
    !Number.isFinite(x) ||
    !Number.isFinite(y) ||
    (!outside && (x < 20 || x > 1080 || y < 140 || y > 680))
  )
    return null;
  return { x, y };
}
export function drawCompassLab(
  ctx: CanvasRenderingContext2D,
  size: CanvasSize,
  scene: CompassScene,
  stage: number,
) {
  setupCanvas(ctx, size);
  const view = layout(size),
    r = compassResults(scene);
  ctx.save();
  ctx.translate(view.x, view.y);
  ctx.scale(view.scale, view.scale);
  ctx.font = "18px ui-monospace";
  ctx.fillStyle = "#e1e8fa";
  ctx.fillText("PERSPECTIVE · world Y lên trên · X đỏ / Y xanh lá / Z xanh lam", 20, 40);
  ctx.fillText("Cam: A/D yaw, W/S pitch · đỉnh: mũi tên XY, PageUp/Down Z", 20, 72);
  ctx.save();
  ctx.beginPath();
  ctx.rect(20, 140, 1060, 540);
  ctx.clip();
  const project = (p: Vec3) => projectCompassPoint(worldToCompassCamera(p, scene.camera));
  const line = (a: Vec3, b: Vec3, color: string, width = 2) => {
    const clipped = clipCompassDepth(
      worldToCompassCamera(a, scene.camera),
      worldToCompassCamera(b, scene.camera),
    );
    if (!clipped) return;
    const pa = projectCompassPoint(clipped[0]),
      pb = projectCompassPoint(clipped[1]);
    if (pa && pb) drawLine(ctx, pa, pb, color, width);
  };
  const arrow = (a: Vec3, b: Vec3, color: string) => {
    const diff = subtract3(b, a),
      length = magnitude3(diff);
    if (length <= 1e-12) return;
    const direction = normalize3(diff);
    let reference = { x: Math.cos(scene.camera.yaw), y: 0, z: -Math.sin(scene.camera.yaw) };
    if (Math.abs(dot3(direction, reference)) > 0.9) reference = { x: 0, y: 1, z: 0 };
    const side = normalize3(subtract3(reference, scale3(direction, dot3(direction, reference)))),
      head = Math.min(0.22, length * 0.25),
      back = subtract3(b, scale3(direction, head));
    line(a, b, color, 3);
    line(b, add3(back, scale3(side, head * 0.5)), color, 3);
    line(b, subtract3(back, scale3(side, head * 0.5)), color, 3);
  };
  const label = (p: Vec3, name: string, color: string) => {
    const point = project(p);
    if (!point) return;
    ctx.beginPath();
    ctx.arc(point.x, point.y, 5, 0, 2 * Math.PI);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.fillText(name, point.x + 8, point.y - 8);
  };
  for (let i = -3; i <= 3; i++) {
    line({ x: i, y: -2, z: -3 }, { x: i, y: -2, z: 3 }, "#28334d", 1);
    line({ x: -3, y: -2, z: i }, { x: 3, y: -2, z: i }, "#28334d", 1);
  }
  const zero = { x: 0, y: 0, z: 0 };
  for (const [point, name, color] of [
    [{ x: 3, y: 0, z: 0 }, "X", "#ff6b6b"],
    [{ x: 0, y: 3, z: 0 }, "Y", "#53f0ae"],
    [{ x: 0, y: 0, z: 3 }, "Z", "#84a9ff"],
  ] as const) {
    arrow(zero, point, color);
    label(point, name, color);
  }
  if (stage === 1) label({ x: 1, y: 1, z: 1 }, "(1,1,1)", "#ffffff");
  if (stage >= 2) {
    const { a, b, c } = scene.triangle;
    line(a, b, "#ffffff");
    line(b, c, "#ffffff");
    line(c, a, "#ffffff");
    arrow(a, b, "#ffb454");
    arrow(a, c, "#53dfef");
    for (const [key, p, name] of [
      ["a", a, "P0"],
      ["b", b, "P1 / A"],
      ["c", c, "P2 / B"],
    ] as const)
      label(p, name, key === scene.selected ? "#ffe26c" : "#ffffff");
  }
  if (stage >= 3 && r.valid) {
    arrow(scene.triangle.a, r.rawTip, "#ffe26c");
    label(r.rawTip, "cross: 0.2 × |N|, tối đa 2.2", "#ffe26c");
  }
  if (stage >= 4 && r.valid) {
    arrow(r.centroid, r.unitTip, "#e6a0ff");
    label(r.unitTip, "unit normal × 1.4", "#e6a0ff");
  }
  ctx.restore();
  ctx.fillStyle = "#e1e8fa";
  ctx.fillText(
    "Xoay camera không sửa tọa độ đỉnh. Đây là wireframe, chưa xử lý che khuất.",
    20,
    728,
  );
  if (stage >= 3 && !r.valid)
    ctx.fillText("Suy biến/gần thẳng hàng: không có hướng normal/facing tin cậy.", 20, 760);
  ctx.restore();
}
