import {
  add3,
  subtract3,
  scale3,
  cross3,
  magnitude3,
  normalize3,
  type Vec3,
} from "@/lib/labs/normal";
import {
  worldToCamera,
  projectPerspective,
  clipPointDepth,
  clipPointScreen,
} from "@/lib/labs/projection-point";
import { rotationResults, rotationViewport, type RotationScene } from "@/lib/labs/rotation3d-scene";
import { translateTriangle3 } from "@/lib/labs/rotation3d";
import { drawLine, setupCanvas, type CanvasSize } from "./lab-shared";
function layout(size: CanvasSize) {
  const scale = Math.min(size.width / 1100, size.height / 800);
  return { scale, x: (size.width - 1100 * scale) / 2, y: (size.height - 800 * scale) / 2 };
}
export function rotationPointFromEvent(
  event: { clientX: number; clientY: number; currentTarget: HTMLCanvasElement },
  size: CanvasSize,
  outside = false,
) {
  const rect = event.currentTarget.getBoundingClientRect(),
    b = layout(size),
    v = rotationViewport();
  if (rect.width <= 0 || rect.height <= 0 || b.scale <= 0) return null;
  const x = (((event.clientX - rect.left) * size.width) / rect.width - b.x) / b.scale,
    y = (((event.clientY - rect.top) * size.height) / rect.height - b.y) / b.scale;
  if (
    !Number.isFinite(x) ||
    !Number.isFinite(y) ||
    (!outside && (x < v.x || x > v.x + v.width || y < v.y || y > v.y + v.height))
  )
    return null;
  return { x, y };
}
export function drawRotationLab(
  ctx: CanvasRenderingContext2D,
  size: CanvasSize,
  scene: RotationScene,
  stage: number,
) {
  setupCanvas(ctx, size);
  const board = layout(size),
    v = rotationViewport(),
    r = rotationResults(scene, stage),
    debug = stage < 7 || scene.debug;
  ctx.save();
  ctx.translate(board.x, board.y);
  ctx.scale(board.scale, board.scale);
  ctx.fillStyle = "#11182b";
  ctx.fillRect(0, 0, 1100, 800);
  if (debug) {
    ctx.fillStyle = "#e1e8fa";
    ctx.font = "18px ui-monospace";
    ctx.fillText("TRIANGLE 3D · world Y lên, camera nhìn +Z · không dùng matrix", 30, 35);
    ctx.fillText(
      "W/S pitch · A/D yaw · Q/E roll · O order · mũi tên / PageUp/Down: vị trí",
      30,
      70,
    );
  }
  ctx.save();
  ctx.beginPath();
  ctx.rect(v.x, v.y, v.width, v.height);
  ctx.clip();
  const line = (a: Vec3, b: Vec3, color: string, width = 2) => {
    const clipped = clipPointDepth(
      worldToCamera(a, scene.camera),
      worldToCamera(b, scene.camera),
      scene.lens,
    );
    if (!clipped) return;
    const camera = { position: { x: 0, y: 0, z: 0 } },
      pa = projectPerspective(clipped[0], camera, scene.lens, v),
      pb = projectPerspective(clipped[1], camera, scene.lens, v);
    if (!pa.screen || !pb.screen) return;
    const screen = clipPointScreen(pa.screen, pb.screen, v);
    if (screen) drawLine(ctx, screen[0], screen[1], color, width);
  };
  for (let x = -4; x <= 4; x++) line({ x, y: -2, z: 1 }, { x, y: -2, z: 14 }, "#28334d", 1);
  for (let z = 1; z <= 14; z++) line({ x: -4, y: -2, z }, { x: 4, y: -2, z }, "#28334d", 1);
  for (const z of [4, 8, 12]) {
    line({ x: -3, y: -2, z }, { x: -3, y: 2, z }, "#74839f", 1);
    line({ x: -3, y: 2, z }, { x: 3, y: 2, z }, "#74839f", 1);
    line({ x: 3, y: 2, z }, { x: 3, y: -2, z }, "#74839f", 1);
  }
  if (stage >= 3 && debug) {
    const ghost = translateTriangle3(r.local, scene.position);
    line(ghost.a, ghost.b, "#74839f", 1);
    line(ghost.b, ghost.c, "#74839f", 1);
    line(ghost.c, ghost.a, "#74839f", 1);
  }
  line(r.world.a, r.world.b, "#ffb454", 3);
  line(r.world.b, r.world.c, "#53f0ae", 3);
  line(r.world.c, r.world.a, "#84a9ff", 3);
  const marker = (p: Vec3, label: string, color: string) => {
    const point = projectPerspective(p, scene.camera, scene.lens, v);
    if (point.status !== "visible" || !point.screen) return;
    ctx.beginPath();
    ctx.arc(point.screen.x, point.screen.y, 5, 0, 2 * Math.PI);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.fillStyle = "#e1e8fa";
    ctx.font = "18px ui-monospace";
    ctx.fillText(label, point.screen.x + 10, point.screen.y - 10);
  };
  if (debug) {
    marker(r.world.a, "A", "#ffffff");
    marker(r.world.b, "B", "#ffffff");
    marker(r.world.c, "C", "#ffffff");
    if (stage >= 2) marker(scene.position, "pivot", "#ff6b6b");
    if (stage >= 4) {
      const origin = { x: -3, y: -1.8, z: 5 };
      line(origin, add3(origin, { x: 1.2, y: 0, z: 0 }), "#ff6b6b");
      line(origin, add3(origin, { x: 0, y: 1.2, z: 0 }), "#53f0ae");
      line(origin, add3(origin, { x: 0, y: 0, z: 1.2 }), "#84a9ff");
    }
  }
  if (stage >= 5 && debug && magnitude3(r.normal) > 0.5) {
    const direction = r.normal;
    let side = cross3(direction, { x: 0, y: 1, z: 0 });
    if (magnitude3(side) < 0.1) side = cross3(direction, { x: 1, y: 0, z: 0 });
    side = normalize3(side);
    const head = 0.2,
      back = subtract3(r.normalTip, scale3(direction, head));
    line(r.center, r.normalTip, "#ffe26c", 3);
    line(r.normalTip, add3(back, scale3(side, head * 0.5)), "#ffe26c", 3);
    line(r.normalTip, subtract3(back, scale3(side, head * 0.5)), "#ffe26c", 3);
    marker(r.normalTip, "N × 1.2", "#ffe26c");
  }
  ctx.restore();
  if (debug) {
    ctx.fillStyle = "#e1e8fa";
    ctx.font = "18px ui-monospace";
    ctx.fillText(
      "AB cam / BC xanh lá / CA xanh lam · ghost: chưa quay · normal vàng từ centroid",
      30,
      739,
    );
    ctx.fillText(
      "Order là các phép quay theo TRỤC WORLD cố định; mỗi frame dùng local gốc.",
      30,
      773,
    );
  }
  ctx.restore();
}
