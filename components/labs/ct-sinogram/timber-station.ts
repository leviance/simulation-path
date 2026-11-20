import {
  at,
  detectorRay,
  detectorCount,
  detectorWidth,
  pointOffset,
  sliceRadius,
  viewAngle,
  type Point,
  type Scan,
} from "@/lib/labs/ct-sinogram";
import type { CanvasSize } from "../lab-shared";
import { estimateRaster, sinogramRaster, specimenRaster } from "./rasters";

type Rect = { x: number; y: number; w: number; h: number };
export function stationLayout({ width, height }: CanvasSize) {
  if (width < 590) {
    const tile = Math.min((width - 30) / 2, (height - 110) * 0.52);
    const margin = (width - 2 * tile) / 3;
    const bottom = 58 + tile;
    return {
      reference: { x: margin, y: 28, w: tile, h: tile },
      estimate: { x: 2 * margin + tile, y: 28, w: tile, h: tile },
      sino: { x: 16, y: bottom, w: width - 32, h: Math.max(25, height - bottom - 35) },
    };
  }
  const tile = Math.min((width - 56) / 3, height - 94);
  const gap = (width - 3 * tile) / 4;
  return {
    reference: { x: gap, y: 38, w: tile, h: tile },
    sino: { x: 2 * gap + tile, y: 38, w: tile, h: tile },
    estimate: { x: 3 * gap + 2 * tile, y: 38, w: tile, h: tile },
  };
}

function caption(ctx: CanvasRenderingContext2D, rect: Rect, text: string) {
  ctx.fillStyle = "#d1e5dc";
  ctx.fillText(text, rect.x, rect.y - 8, rect.w);
}

export function drawTimberStation(
  ctx: CanvasRenderingContext2D,
  size: CanvasSize,
  scan: Scan,
  selection: { row: number; column: number },
  preview: { ratio: number }[],
  displayRange: number,
  invert: boolean,
  trace: boolean,
  hideReference: boolean,
) {
  const { reference, sino, estimate } = stationLayout(size);
  const angle = viewAngle(selection.row, scan.settings.views);
  const beam = detectorRay(angle, (selection.column + 0.5) / detectorCount);
  caption(ctx, reference, "01  Vật mẫu · đối chiếu");
  caption(ctx, sino, "02  Sinogram · số đo p");
  caption(ctx, estimate, "03  Ảnh trải ngược");
  ctx.imageSmoothingEnabled = true;
  if (hideReference) {
    ctx.fillStyle = "#13252c";
    ctx.fillRect(reference.x, reference.y, reference.w, reference.h);
    ctx.fillStyle = "#a9c2c8";
    ctx.fillText(
      "Đã che vật mẫu",
      reference.x + 10,
      reference.y + reference.h / 2,
      reference.w - 20,
    );
  } else {
    ctx.drawImage(specimenRaster(scan), reference.x, reference.y, reference.w, reference.h);
    const toReference = (p: Point): [number, number] => [
      reference.x + (0.5 + p[0] / (2 * sliceRadius)) * reference.w,
      reference.y + (0.5 - p[1] / (2 * sliceRadius)) * reference.h,
    ];
    ctx.save();
    ctx.beginPath();
    ctx.rect(reference.x, reference.y, reference.w, reference.h);
    ctx.clip();
    ctx.beginPath();
    ctx.moveTo(...toReference(beam.origin));
    ctx.lineTo(...toReference(at(beam, beam.maximum)));
    ctx.strokeStyle = "#fbd389";
    ctx.stroke();
    ctx.restore();
  }
  ctx.drawImage(estimateRaster(scan), estimate.x, estimate.y, estimate.w, estimate.h);
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(sinogramRaster(scan, displayRange, invert), sino.x, sino.y, sino.w, sino.h);
  const dx = sino.w / detectorCount;
  const dy = sino.h / scan.settings.views;
  ctx.strokeStyle = "#fbd389";
  ctx.strokeRect(sino.x, sino.y + (selection.row + 0.5) * dy, sino.w, 1);
  ctx.strokeRect(
    sino.x + (selection.column + 0.5) * dx - 2,
    sino.y + (selection.row + 0.5) * dy - 2,
    4,
    4,
  );
  if (trace) {
    ctx.beginPath();
    for (let row = 0; row < scan.settings.views; row++) {
      const offset = pointOffset(viewAngle(row, scan.settings.views), [0.65, 0.3]);
      const x = sino.x + (0.5 + offset / detectorWidth) * sino.w;
      const y = sino.y + (row + 0.5) * dy;
      if (row === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.strokeStyle = "#ff839a";
    ctx.setLineDash([3, 3]);
    ctx.stroke();
    ctx.setLineDash([]);
  }
  const footer = sino.y + sino.h + 17;
  ctx.fillStyle = "#aac5be";
  ctx.fillText(`${scan.acquired}/${scan.settings.views} góc · 128 cột`, sino.x, footer, sino.w);
  if (size.width >= 590) {
    ctx.fillText(
      hideReference ? "Bật lại vật mẫu để so sánh." : "Vàng: đường của tia đang chọn.",
      reference.x,
      footer,
      reference.w,
    );
    ctx.fillText("112 × 112 · trải ngược không lọc", estimate.x, footer, estimate.w);
    const transmissionY = footer + 7;
    for (let i = 0; i < preview.length; i++) {
      const byte = Math.round(255 * preview[i].ratio);
      ctx.fillStyle = `rgb(${byte},${byte},${byte})`;
      ctx.fillRect(sino.x + i * dx, transmissionY, dx + 0.5, 8);
    }
    ctx.fillStyle = "#fbd389";
    ctx.fillRect(sino.x + (selection.column + 0.5) * dx - 1, transmissionY - 2, 2, 12);
    // The miniature shows the entire eight-unit gantry; the specimen above is a close-up.
    const scale = 3.4;
    const mini = (p: Point): [number, number] => [
      reference.x + 27 + p[0] * scale,
      footer + 20 - p[1] * scale,
    ];
    const segment = (a: Point, b: Point, color: string) => {
      ctx.beginPath();
      ctx.moveTo(...mini(a));
      ctx.lineTo(...mini(b));
      ctx.strokeStyle = color;
      ctx.stroke();
    };
    const first = detectorRay(angle, 0);
    const last = detectorRay(angle, 1);
    segment(first.origin, at(first, first.maximum), "#547375");
    segment(last.origin, at(last, last.maximum), "#547375");
    segment(at(first, first.maximum), at(last, last.maximum), "#55cdbe");
    segment(beam.origin, at(beam, beam.maximum), "#edc774");
    const source = mini(beam.origin);
    ctx.fillStyle = "#edc774";
    ctx.fillRect(source[0] - 1.5, source[1] - 1.5, 3, 3);
    ctx.fillStyle = "#aac5be";
    ctx.fillText("Nguồn → detector", reference.x + 52, footer + 24, Math.max(40, reference.w - 52));
  }
}
