import type { Vec3 } from "@/lib/labs/normal";
import {
  worldToCamera,
  projectPerspective,
  clipPointDepth,
  clipPointScreen,
  verticalFocalScale,
} from "@/lib/labs/projection-point";
import { viewportFor, pointDisplay, type PointScene } from "@/lib/labs/projection-scene";
import { drawLine, setupCanvas, type CanvasSize } from "./lab-shared";
function layout(size: CanvasSize) {
  const scale = Math.min(size.width / 1100, size.height / 800);
  return { scale, x: (size.width - 1100 * scale) / 2, y: (size.height - 800 * scale) / 2 };
}
export function projectionPointFromEvent(
  event: { clientX: number; clientY: number; currentTarget: HTMLCanvasElement },
  size: CanvasSize,
) {
  const rect = event.currentTarget.getBoundingClientRect(),
    v = layout(size);
  if (rect.width <= 0 || rect.height <= 0 || v.scale <= 0) return null;
  const x = (((event.clientX - rect.left) * size.width) / rect.width - v.x) / v.scale,
    y = (((event.clientY - rect.top) * size.height) / rect.height - v.y) / v.scale;
  return Number.isFinite(x) && Number.isFinite(y) ? { x, y } : null;
}
export function drawProjectionLab(
  ctx: CanvasRenderingContext2D,
  size: CanvasSize,
  scene: PointScene,
  stage: number,
) {
  setupCanvas(ctx, size);
  const board = layout(size),
    v = viewportFor(scene),
    debug = stage < 8 || scene.debug;
  ctx.save();
  ctx.translate(board.x, board.y);
  ctx.scale(board.scale, board.scale);
  ctx.fillStyle = "#11182b";
  ctx.fillRect(0, 0, 1100, 800);
  if (debug) {
    ctx.fillStyle = "#e1e8fa";
    ctx.font = "18px ui-monospace";
    ctx.fillText(
      stage < 3
        ? "XY PREVIEW · chưa dùng depth để chiếu"
        : "PERSPECTIVE · camera nhìn +Z · Y lên trên",
      30,
      40,
    );
    ctx.fillText("WASD: XY · Q/E: Z · kéo marker từ bài 7 · F: debug ở bài cuối", 30, 72);
  }
  ctx.save();
  ctx.beginPath();
  ctx.rect(v.x, v.y, v.width, v.height);
  ctx.clip();
  const line = (a: Vec3, b: Vec3, color: string) => {
    const depth = clipPointDepth(
      worldToCamera(a, scene.camera),
      worldToCamera(b, scene.camera),
      scene.lens,
    );
    if (!depth) return;
    const origin = { position: { x: 0, y: 0, z: 0 } },
      pa = projectPerspective(depth[0], origin, scene.lens, v, stage),
      pb = projectPerspective(depth[1], origin, scene.lens, v, stage);
    if (!pa.screen || !pb.screen) return;
    const clipped = clipPointScreen(pa.screen, pb.screen, v);
    if (clipped) drawLine(ctx, clipped[0], clipped[1], color, 1.5);
  };
  if (stage >= 3) {
    for (let x = -4; x <= 4; x++) line({ x, y: -1.5, z: 1 }, { x, y: -1.5, z: 16 }, "#28334d");
    for (let z = 1; z <= 16; z++) line({ x: -4, y: -1.5, z }, { x: 4, y: -1.5, z }, "#28334d");
    for (const z of [2, 4, 8, 12]) {
      line({ x: -3, y: -1.5, z }, { x: -3, y: 2, z }, "#74839f");
      line({ x: -3, y: 2, z }, { x: 3, y: 2, z }, "#74839f");
      line({ x: 3, y: 2, z }, { x: 3, y: -1.5, z }, "#74839f");
    }
    if (debug) {
      line({ x: -2, y: 0, z: 4 }, { x: 2, y: 0, z: 4 }, "#ff6b6b");
      line({ x: 0, y: -1.5, z: 4 }, { x: 0, y: 2, z: 4 }, "#53f0ae");
      line({ x: 0, y: 0, z: 1 }, { x: 0, y: 0, z: 16 }, "#84a9ff");
    }
  } else {
    for (let d = -280; d <= 280; d += 70) {
      drawLine(ctx, { x: 550 + d, y: 120 }, { x: 550 + d, y: 680 }, "#28334d");
      drawLine(ctx, { x: 30, y: 400 + d }, { x: 1070, y: 400 + d }, "#28334d");
    }
  }
  const r = pointDisplay(scene, stage);
  if (r.status === "visible" && r.screen) {
    const focalPixels = v.height * 0.5 * (stage >= 4 ? verticalFocalScale(scene.lens) : 1);
    const radius =
      stage >= 3
        ? Math.max(3, Math.min(30, Math.round((0.12 * focalPixels) / r.cameraPoint.z)))
        : 10;
    ctx.beginPath();
    ctx.arc(r.screen.x, r.screen.y, radius, 0, 2 * Math.PI);
    ctx.fillStyle = "#53f0ae";
    ctx.fill();
    ctx.beginPath();
    ctx.arc(r.screen.x, r.screen.y, radius * 0.5, 0, 2 * Math.PI);
    ctx.fillStyle = "#ffffff";
    ctx.fill();
    if (debug) {
      drawLine(
        ctx,
        { x: r.screen.x - radius, y: r.screen.y },
        { x: r.screen.x + radius, y: r.screen.y },
        "#ffe26c",
      );
      drawLine(
        ctx,
        { x: r.screen.x, y: r.screen.y - radius },
        { x: r.screen.x, y: r.screen.y + radius },
        "#ffe26c",
      );
    }
  }
  ctx.restore();
  if (debug) {
    ctx.fillStyle = "#e1e8fa";
    ctx.font = "18px ui-monospace";
    ctx.fillText("Các khung world có cùng kích thước ở depth 2 / 4 / 8 / 12.", 30, 738);
    ctx.fillText(
      "Resize giữ bảng logic; đổi Aspect để kiểm khung nhìn, không kéo dãn ảnh.",
      30,
      770,
    );
  }
  ctx.restore();
}
