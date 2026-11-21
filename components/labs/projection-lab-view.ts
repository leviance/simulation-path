import type { Vec3 } from "@/lib/labs/normal";
import {
  worldToCamera,
  projectPerspective,
  clipPointDepth,
  clipPointScreen,
  measureDoubleDepth,
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
    let title = "ĐƯỜNG BĂNG ĐO ĐỘ SÂU";
    let hint = "Điểm sáng là đèn. Đường dóng cho biết nó nằm phía trên vạch nào của sàn.";
    if (stage < 3) {
      title = "XEM TRƯỚC TRÊN MẶT PHẲNG XY";
      hint = "Đổi riêng Z: tọa độ của đèn thay đổi nhưng ảnh chưa dịch chuyển.";
    } else if (stage < 5) {
      title = "CHIẾU ĐIỂM LÊN MÀN HÌNH";
      hint = "Giữ nguyên X và Y, rồi đưa đèn ra xa. Tâm đèn tiến về đâu?";
    }
    ctx.fillText(title, 30, 40);
    ctx.fillText(hint, 30, 72);
  }
  ctx.save();
  ctx.beginPath();
  ctx.rect(v.x, v.y, v.width, v.height);
  ctx.clip();
  const floorY = -1.5;
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
  if (stage >= 5) {
    // Vạch sơn, lề đường và khung đều dùng cùng phép chiếu với đèn.
    for (let x = -4; x <= 4; x++) {
      line({ x, y: floorY, z: 1 }, { x, y: floorY, z: 16 }, "#28334d");
    }
    for (let z = 1; z <= 16; z++) {
      line({ x: -4, y: floorY, z }, { x: 4, y: floorY, z }, "#28334d");
      if (z < 16) line({ x: 0, y: floorY, z }, { x: 0, y: floorY, z: z + 0.45 }, "#74839f");
    }
    for (const side of [-1, 1]) {
      const x = side * 1.9;
      line({ x, y: floorY, z: 1 }, { x, y: floorY, z: 16 }, "#426474");
    }
    for (const z of [2, 4, 8, 12]) {
      line({ x: -1.55, y: 1.1, z }, { x: 1.55, y: 1.1, z }, "#74839f");
      for (const side of [-1, 1]) {
        const post = side * 1.9;
        const shoulder = side * 1.55;
        line({ x: post, y: floorY, z }, { x: post, y: 0.75, z }, "#74839f");
        line({ x: post, y: 0.75, z }, { x: shoulder, y: 1.1, z }, "#75c9d1");
        line({ x: post, y: floorY, z }, { x: side * 1.63, y: floorY, z }, "#75c9d1");
      }
    }
    if (debug) {
      const foot = { x: -1.9, y: floorY, z: 4 };
      line(foot, { x: -1.35, y: floorY, z: 4 }, "#ff6b6b");
      line(foot, { x: -1.9, y: floorY + 0.55, z: 4 }, "#53f0ae");
      line(foot, { x: -1.9, y: floorY, z: 4.55 }, "#84a9ff");
    }
  } else if (stage < 3) {
    for (let d = -280; d <= 280; d += 70) {
      drawLine(ctx, { x: 550 + d, y: 120 }, { x: 550 + d, y: 680 }, "#28334d");
      drawLine(ctx, { x: 30, y: 400 + d }, { x: 1070, y: 400 + d }, "#28334d");
    }
  }
  const r = pointDisplay(scene, stage);
  if (r.status === "visible" && r.screen) {
    if (stage >= 5 && debug) {
      const foot = { x: scene.point.x, y: floorY, z: scene.point.z };
      line(scene.point, foot, "#967b55");
      line({ ...foot, x: foot.x - 0.1 }, { ...foot, x: foot.x + 0.1 }, "#967b55");
      line({ ...foot, z: foot.z - 0.1 }, { ...foot, z: foot.z + 0.1 }, "#967b55");
    }
    const focalPixels = v.height * 0.5 * (stage >= 4 ? verticalFocalScale(scene.lens) : 1);
    const radius =
      stage >= 3
        ? Math.max(3, Math.min(30, Math.round((0.12 * focalPixels) / r.cameraPoint.z)))
        : 10;
    ctx.beginPath();
    ctx.arc(r.screen.x, r.screen.y, radius, 0, 2 * Math.PI);
    ctx.fillStyle = "#ffac47";
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
  const wantsRuler = stage >= 8 && debug && scene.measureDepth;
  const measurement = wantsRuler
    ? measureDoubleDepth(scene.point, scene.camera, scene.lens, v)
    : null;
  if (measurement) {
    const center = { x: v.x + v.width / 2, y: v.y + v.height / 2 };
    drawLine(ctx, center, measurement.first, "#7099ad", 1);
    // B là vạch đo rỗng trên ảnh, không có thêm đèn nào trong không gian.
    ctx.beginPath();
    ctx.arc(measurement.second.x, measurement.second.y, 7, 0, 2 * Math.PI);
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = "#99e2e6";
    ctx.stroke();
  }
  ctx.restore();
  if (debug) {
    ctx.fillStyle = "#e1e8fa";
    ctx.font = "18px ui-monospace";
    ctx.fillText(
      stage >= 5
        ? "Bốn cổng đều rộng 3,8 đơn vị. Chỉ vị trí của chúng khác nhau: Z = 2, 4, 8 và 12."
        : "Mốc để so sánh là tâm khung nhìn, không phải góc trên bên trái màn hình.",
      30,
      738,
    );
    let axisHint = "Trục Y hướng lên, còn trục +Z hướng vào sâu trong cảnh.";
    if (wantsRuler) {
      axisHint = measurement
        ? "Vòng rỗng B là vị trí ảnh khi gấp đôi độ sâu của đèn trong hệ camera."
        : "Thước chỉ hiện khi cả đèn lẫn điểm so sánh đều nằm trong khung nhìn.";
    }
    ctx.fillText(axisHint, 30, 770);
  }
  ctx.restore();
}
