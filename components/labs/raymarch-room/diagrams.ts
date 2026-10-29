import {
  add,
  scale,
  makeCameraRay,
  cameraForward,
  type Vec3,
} from "@/lib/labs/raymarch-room/geometry";
import { SPHERE_CENTER, SPHERE_ONLY, sdSphere } from "@/lib/labs/raymarch-room/scene";
import { traceRay } from "@/lib/labs/raymarch-room/tracing";
import { inspectionRay, type RoomSession } from "@/lib/labs/raymarch-room/session";
type Context = CanvasRenderingContext2D;
function line(c: Context, x: number, y: number, x2: number, y2: number, color: string) {
  c.strokeStyle = color;
  c.beginPath();
  c.moveTo(x, y);
  c.lineTo(x2, y2);
  c.stroke();
}
export function crosshair(c: Context, x: number, y: number) {
  c.lineWidth = 1.5;
  line(c, x - 9, y, x + 9, y, "#ffffff");
  line(c, x, y - 9, x, y + 9, "#ffffff");
}
function background(c: Context, w: number, h: number, title: string) {
  c.fillStyle = "#0b1020";
  c.fillRect(0, 0, w, h);
  c.fillStyle = "#dbe7f3";
  c.font = "13px monospace";
  c.fillText(title, 14, 22);
}
export function drawTraceDiagram(c: Context, w: number, h: number, s: RoomSession, all = false) {
  background(c, w, h, "Lát cắt XZ tại y = -0.18m");
  const unit = Math.min((w - 50) / 6, (h - 55) / 6);
  const point = (p: Vec3) => ({
    x: w / 2 + (p.x - SPHERE_CENTER.x) * unit,
    y: 35 + (4.5 - p.z) * unit,
  });
  const sphere = point(SPHERE_CENTER);
  c.fillStyle = "#17385b";
  c.strokeStyle = "#61afef";
  c.lineWidth = 2;
  c.beginPath();
  c.arc(sphere.x, sphere.y, s.scene.sphereRadius * unit, 0, 2 * Math.PI);
  c.fill();
  c.stroke();
  const ray = inspectionRay(s),
    start = point(ray.origin),
    end = point(add(ray.origin, scale(ray.direction, 6)));
  line(c, start.x, start.y, end.x, end.y, "#5f6d86");
  const trace = traceRay(ray, s.settings, {
    ...SPHERE_ONLY,
    sphereRadius: s.scene.sphereRadius,
  }).trace;
  const shown = all ? trace : trace.slice(0, s.traceVisible);
  for (const sample of shown) {
    const p = point(sample.position);
    c.strokeStyle = "rgba(229,192,123,0.45)";
    c.lineWidth = 1;
    c.beginPath();
    c.arc(p.x, p.y, Math.min(100, Math.abs(sample.distance)) * unit, 0, 2 * Math.PI);
    c.stroke();
    c.fillStyle = "#e5c07b";
    c.fillRect(p.x - 2, p.y - 2, 4, 4);
  }
  c.fillStyle = "#98c379";
  c.beginPath();
  c.arc(start.x, start.y, 4, 0, 2 * Math.PI);
  c.fill();
  c.fillStyle = "#dbe7f3";
  c.fillText(`${shown.length}/${trace.length} mẫu · vòng tròn: |SDF|`, 14, h - 12);
}
export function drawDiagram(c: Context, w: number, h: number, dpr: number, s: RoomSession) {
  if (s.stage === 1) {
    c.fillStyle = "#000038";
    c.fillRect(0, 0, w, h);
    c.globalCompositeOperation = "lighter";
    const red = c.createLinearGradient(0, 0, w, 0);
    red.addColorStop(0, "#000000");
    red.addColorStop(1, "#ff0000");
    c.fillStyle = red;
    c.fillRect(0, 0, w, h);
    const green = c.createLinearGradient(0, 0, 0, h);
    green.addColorStop(0, "#00ff00");
    green.addColorStop(1, "#000000");
    c.fillStyle = green;
    c.fillRect(0, 0, w, h);
    c.globalCompositeOperation = "source-over";
    c.lineWidth = 1;
    c.strokeStyle = "rgba(225,235,245,0.45)";
    c.beginPath();
    const spacing = 32 / dpr;
    for (let x = 0; x < w; x += spacing) {
      c.moveTo(x, 0);
      c.lineTo(x, h);
    }
    for (let y = 0; y < h; y += spacing) {
      c.moveTo(0, y);
      c.lineTo(w, y);
    }
    c.stroke();
    crosshair(c, s.selectedPixel.x * w, s.selectedPixel.y * h);
    return true;
  }
  if (s.stage === 2) {
    background(c, w, h, "Nhìn từ trên xuống XZ · các thành phần Y đọc ở bảng số");
    const unit = Math.min(w / 12, h / 12),
      point = (p: Vec3) => ({ x: w / 2 + p.x * unit, y: h / 2 + (2 - p.z) * unit });
    c.lineWidth = 1;
    for (const [x, y] of [
      [0, 0],
      [w - 1, 0],
      [0, h - 1],
      [w - 1, h - 1],
      [w / 2 - 0.5, h / 2 - 0.5],
    ]) {
      const ray = makeCameraRay(s.camera, x, y, w, h),
        a = point(ray.origin),
        b = point(add(ray.origin, scale(ray.direction, 8)));
      line(c, a.x, a.y, b.x, b.y, x === w / 2 - 0.5 ? "#e5c07b" : "#61afef");
    }
    const a = point(s.camera.position),
      b = point(add(s.camera.position, scale(cameraForward(s.camera), 2)));
    c.lineWidth = 3;
    line(c, a.x, a.y, b.x, b.y, "#98c379");
    c.fillStyle = "#e06c75";
    c.beginPath();
    c.arc(a.x, a.y, 5, 0, 2 * Math.PI);
    c.fill();
    return true;
  }
  if (s.stage === 3) {
    background(c, w, h, "Lát cắt phẳng z = 0.15m · xanh ngoài / đỏ trong");
    const unit = h / 3.4,
      center = { x: w / 2, y: h / 2 };
    c.fillStyle = "#17385b";
    c.fillRect(0, 30, w, h - 30);
    c.fillStyle = "#9f3f3f";
    c.beginPath();
    c.arc(center.x, center.y, s.scene.sphereRadius * unit, 0, 2 * Math.PI);
    c.fill();
    c.strokeStyle = "#ffffff";
    c.lineWidth = 2;
    c.stroke();
    const x = center.x + (s.samplePoint.x - SPHERE_CENTER.x) * unit,
      y = center.y - (s.samplePoint.y - SPHERE_CENTER.y) * unit;
    line(c, center.x, center.y, x, y, "#e5c07b");
    crosshair(c, x, y);
    const d = sdSphere(s.samplePoint, SPHERE_CENTER, s.scene.sphereRadius);
    c.fillStyle = "#ffffff";
    c.fillText(`d = ${d.toFixed(5)}m`, 14, h - 14);
    return true;
  }
  if (s.stage === 4) {
    drawTraceDiagram(c, w, h, s);
    return true;
  }
  return false;
}
