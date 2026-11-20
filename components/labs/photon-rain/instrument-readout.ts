import type { Experiment } from "@/lib/labs/photon-rain";
import { ink, text, tint, type Rect } from "./chamber";

const mapCache = new WeakMap<
  Uint32Array,
  { surface: HTMLCanvasElement; completed: number; peak: number }
>();
function events(
  ctx: CanvasRenderingContext2D,
  rect: Rect,
  cells: Uint32Array,
  peak: number,
  completed: number,
  highlight: number[],
) {
  let cache = mapCache.get(cells);
  if (!cache) {
    const surface = document.createElement("canvas");
    surface.width = 48;
    surface.height = 32;
    cache = { surface, completed: -1, peak: -1 };
    mapCache.set(cells, cache);
  }
  if (cache.completed !== completed || cache.peak !== peak) {
    const tile = cache.surface.getContext("2d");
    if (!tile) return;
    const image = tile.createImageData(48, 32);
    const palette = Array.from({ length: 16 }, (_, i) => tint([10, 24, 35], highlight, i / 15));
    for (let y = 0; y < 32; y++)
      for (let x = 0; x < 48; x++) {
        const n = cells[x + 48 * y],
          index = 4 * (x + 48 * (31 - y));
        const level = n > 0 && peak > 0 ? Math.max(1, Math.round(15 * Math.sqrt(n / peak))) : 0;
        const color = palette[level];
        image.data[index] = color[0];
        image.data[index + 1] = color[1];
        image.data[index + 2] = color[2];
        image.data[index + 3] = 255;
      }
    tile.putImageData(image, 0, 0);
    cache.completed = completed;
    cache.peak = peak;
  }
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(cache.surface, rect.x, rect.y, rect.w, rect.h);
  ctx.restore();
}
function bars(ctx: CanvasRenderingContext2D, rect: Rect, counts: Uint32Array, peak: number) {
  ctx.fillStyle = "#0a1823";
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  const step = rect.w / 24;
  for (let i = 0; i < 24; i++) {
    if (!counts[i] || !peak) continue;
    const v = counts[i] / peak;
    ctx.fillStyle = `rgb(${tint([43, 80, 84], [78, 226, 194], v).join(",")})`;
    ctx.fillRect(rect.x + i * step, rect.y + rect.h * (1 - v), Math.max(1, step - 1), rect.h * v);
  }
}
export function readout(
  ctx: CanvasRenderingContext2D,
  panel: Rect,
  tank: Rect,
  experiment: Experiment,
  stage: number,
  compact: boolean,
) {
  const { x, y, w, h } = panel;
  ctx.fillStyle = "#12232e";
  ctx.fillRect(x, y, w, h);
  if (stage < 6) {
    text(ctx, "Đọc đường của một photon", x + 8, y + 17, ink.paper, 12, true);
    if (!compact) text(ctx, "Từ bài 6: đo cả đợt phát.", x + 8, y + 37, ink.muted, 11);
    return;
  }
  const c = experiment.counts,
    peak = Math.max(0, ...c.detectorBins);
  const mapPeak = Math.max(0, ...c.absorptionMap, ...c.scatterMap);
  const hits = c.detectorBins.reduce((a, b) => a + b, 0);
  const unit = tank.h / 24;
  for (let i = 0; i < 24; i++)
    if (c.detectorBins[i] && peak) {
      ctx.fillStyle = `rgb(${tint([43, 80, 84], [78, 226, 194], c.detectorBins[i] / peak).join(",")})`;
      ctx.fillRect(
        tank.x + tank.w + 1,
        tank.y + (23 - i) * unit + 0.5,
        Math.max(2, Math.min(5, tank.w * 0.017)),
        Math.max(1, unit - 1),
      );
    }
  if (compact) {
    const cw = (w - 24) / 3,
      chartH = Math.max(13, Math.min(h - 39, (cw * 2) / 3));
    text(ctx, `Màn thu · ${hits}`, x + 5, y + 12, ink.teal, 9, true);
    text(ctx, "Hấp thụ", x + cw + 10, y + 12, ink.coral, 9, true);
    text(ctx, "Tán xạ", x + 2 * cw + 16, y + 12, ink.teal, 9, true);
    bars(ctx, { x: x + 5, y: y + 17, w: cw, h: chartH }, c.detectorBins, peak);
    events(
      ctx,
      { x: x + cw + 10, y: y + 17, w: cw, h: chartH },
      c.absorptionMap,
      mapPeak,
      c.completed,
      [255, 131, 135],
    );
    events(
      ctx,
      { x: x + 2 * cw + 16, y: y + 17, w: cw, h: chartH },
      c.scatterMap,
      mapPeak,
      c.completed,
      [78, 226, 194],
    );
    text(
      ctx,
      `Màn: đỉnh ${peak}   ·   Bản đồ: √(n/đỉnh); đỉnh ${mapPeak} sự kiện`,
      x + 5,
      y + chartH + 29,
      ink.muted,
      9,
    );
    return;
  }
  const pad = 11,
    inner = w - 2 * pad;
  text(ctx, "MÀN THU · MẶT PHẢI", x + pad, y + 18, ink.teal, 11, true);
  const histH = Math.max(24, Math.min(51, h * 0.14));
  bars(ctx, { x: x + pad, y: y + 26, w: inner, h: histH }, c.detectorBins, peak);
  const caption = y + 39 + histH;
  text(ctx, `−1 ≤ y ≤ +1  ·  ${hits} lượt đến  ·  đỉnh ${peak}`, x + pad, caption, ink.muted, 10);
  const mw = (inner - 12) / 2,
    mh = Math.min((mw * 2) / 3, h * 0.19),
    my = caption + 24;
  text(ctx, "Hấp thụ · XY", x + pad, my - 4, ink.coral, 10, true);
  text(ctx, "Tán xạ · XY", x + pad + mw + 12, my - 4, ink.teal, 10, true);
  events(
    ctx,
    { x: x + pad, y: my, w: mw, h: mh },
    c.absorptionMap,
    mapPeak,
    c.completed,
    [255, 131, 135],
  );
  events(
    ctx,
    { x: x + pad + mw + 12, y: my, w: mw, h: mh },
    c.scatterMap,
    mapPeak,
    c.completed,
    [78, 226, 194],
  );
  text(ctx, `Cùng thang √(n/đỉnh) · đỉnh ${mapPeak} sự kiện`, x + pad, my + mh + 13, ink.muted, 10);
  const values = [
    ["Hấp thụ", c.absorbed, ink.coral],
    ["Thoát (mọi mặt)", c.escaped, ink.teal],
    ["Chạm giới hạn", c.censored, ink.lilac],
    ["Không va chạm ⊂ thoát", c.ballistic, ink.gold],
  ] as const;
  const start = my + mh + 30,
    step = Math.max(13, Math.min(29, (y + h - start) / 4));
  values.forEach(([name, count, color], i) => {
    const pos = start + i * step;
    text(ctx, name, x + pad, pos, ink.paper, 10);
    ctx.save();
    ctx.textAlign = "right";
    text(ctx, `${count}/${c.completed}`, x + w - pad, pos, color, 10);
    ctx.restore();
    ctx.fillStyle = ink.divider;
    ctx.fillRect(x + pad, pos + 3, inner, 2);
    if (c.completed) {
      ctx.fillStyle = color;
      ctx.fillRect(x + pad, pos + 3, (inner * count) / c.completed, 2);
    }
  });
}
