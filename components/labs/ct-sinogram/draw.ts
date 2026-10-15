import {
  at,
  detectorRay,
  chordLength,
  pointOffset,
  viewAngle,
  detectorCount,
  detectorWidth,
  type Scan,
  type Point,
  type Disk,
} from "@/lib/labs/ct-sinogram";
import { setupCanvas, type CanvasSize } from "../lab-shared";

export function sinogramRect(size: CanvasSize) {
  return { x: size.width * 0.53, y: 42, w: size.width * 0.44, h: size.height - 85 };
}
export function pickCell(x: number, y: number, size: CanvasSize, views: number) {
  const r = sinogramRect(size);
  if (x < r.x || y < r.y || x >= r.x + r.w || y >= r.y + r.h) return null;
  return {
    column: Math.floor(((x - r.x) / r.w) * detectorCount),
    row: Math.floor(((y - r.y) / r.h) * views),
  };
}
export function draw(
  ctx: CanvasRenderingContext2D,
  size: CanvasSize,
  scan: Scan,
  scene: Disk[],
  selection: { row: number; column: number },
  preview: { ratio: number; projection: number }[],
  stage: number,
  displayRange: number,
  invert: boolean,
  trace: boolean,
) {
  setupCanvas(ctx, size);
  ctx.font = "12px system-ui";
  ctx.fillStyle = "#d8e2f5";
  ctx.fillText("Lát cắt XY — nguồn và detector quay", 12, 22);
  const scale = Math.min((size.width * 0.49 - 24) / 12, (size.height - 100) / 12);
  const toScreen = (p: Point): [number, number] => [
    size.width * 0.245 + p[0] * scale,
    (size.height - 40) / 2 - p[1] * scale,
  ];
  const line = (a: Point, b: Point, color: string) => {
    ctx.beginPath();
    ctx.moveTo(...toScreen(a));
    ctx.lineTo(...toScreen(b));
    ctx.strokeStyle = color;
    ctx.stroke();
  };
  for (const disk of scene) {
    ctx.beginPath();
    ctx.arc(...toScreen(disk.centre), disk.radius * scale, 0, 2 * Math.PI);
    ctx.fillStyle = "#7384ab";
    ctx.fill();
    ctx.strokeStyle = "#b5c7f2";
    ctx.stroke();
  }
  const angle = viewAngle(selection.row, scan.settings.views);
  const beam = detectorRay(angle, (selection.column + 0.5) / detectorCount);
  if (stage >= 2) {
    for (const u of [0, 0.25, 0.5, 0.75, 1]) {
      const ray = detectorRay(angle, u);
      line(ray.origin, at(ray, ray.maximum), "#344666");
    }
    const first = detectorRay(angle, 0),
      last = detectorRay(angle, 1);
    line(at(first, first.maximum), at(last, last.maximum), "#56ddd0");
    line(beam.origin, at(beam, beam.maximum), "#f8c667");
    ctx.beginPath();
    ctx.arc(...toScreen(beam.origin), 4, 0, 2 * Math.PI);
    ctx.fillStyle = "#f8c667";
    ctx.fill();
    ctx.fillText("S", toScreen(beam.origin)[0] + 6, toScreen(beam.origin)[1]);
  }
  if (stage >= 3) {
    ctx.fillStyle = "#d8e2f5";
    ctx.fillText(
      "L từng đĩa: " + scene.map((d) => chordLength(beam, d).toFixed(3)).join(" / "),
      12,
      size.height - 66,
    );
  }
  if (stage >= 4) {
    const width = (size.width * 0.47) / detectorCount;
    for (let c = 0; c < detectorCount; c++) {
      const gray = Math.round(preview[c].ratio * 255);
      ctx.fillStyle = `rgb(${gray},${gray},${gray})`;
      ctx.fillRect(12 + c * width, size.height - 50, width + 0.5, 20);
    }
    ctx.fillStyle = "#f8c667";
    ctx.fillRect(12 + selection.column * width, size.height - 52, 2, 24);
    ctx.fillText("Detector hiện tại: T = I/I0", 12, size.height - 10);
  }
  const r = sinogramRect(size);
  ctx.fillStyle = "#d8e2f5";
  ctx.fillText(
    stage >= 5 ? "Sinogram p — detector →; góc ↓" : "Sinogram xuất hiện từ Bài 05",
    r.x,
    22,
  );
  ctx.fillStyle = "#1c2a41";
  ctx.fillRect(r.x, r.y, r.w, r.h);
  if (stage < 5) return;
  // Draw only acquired rows. A palette change never overwrites raw values.
  const cellW = r.w / detectorCount,
    cellH = r.h / scan.settings.views;
  for (let row = 0; row < scan.acquired; row++)
    for (let column = 0; column < detectorCount; column++) {
      const value = scan.values[column + detectorCount * row];
      let gray = Math.max(0, Math.min(1, value / displayRange));
      if (invert) gray = 1 - gray;
      const byte = Math.round(255 * gray);
      ctx.fillStyle = `rgb(${byte},${byte},${byte})`;
      ctx.fillRect(r.x + column * cellW, r.y + row * cellH, cellW + 0.5, cellH + 0.5);
    }
  ctx.strokeStyle = "#f8c667";
  ctx.strokeRect(r.x, r.y + selection.row * cellH, r.w, Math.max(1, cellH));
  ctx.strokeRect(
    r.x + selection.column * cellW - 2,
    r.y + selection.row * cellH - 2,
    Math.max(5, cellW),
    Math.max(5, cellH),
  );
  if (stage >= 7 && trace) {
    ctx.strokeStyle = "#ff6e8a";
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    for (let row = 0; row < scan.settings.views; row++) {
      const s = pointOffset(viewAngle(row, scan.settings.views), [0.65, 0.3]);
      const x = r.x + (s / detectorWidth + 0.5) * r.w;
      const y = r.y + (row + 0.5) * cellH;
      if (row === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.setLineDash([]);
    const p = toScreen([0.65, 0.3]);
    ctx.fillStyle = "#ff6e8a";
    ctx.fillRect(p[0] - 3, p[1] - 3, 6, 6);
  }
  ctx.fillStyle = "#d8e2f5";
  ctx.fillText("0°", r.x - 24, r.y + 10);
  ctx.fillText((360 - 360 / scan.settings.views).toFixed(0) + "°", r.x - 28, r.y + r.h);
  ctx.fillText("Xanh: chưa đo; " + (invert ? "trắng" : "đen") + ": p=0", r.x, size.height - 12);
}
