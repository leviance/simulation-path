import type { Rect } from "@/lib/labs/volume-slicer";
import type { histogram } from "@/lib/labs/volume-slicer/statistics";

export function drawHistogram(
  ctx: CanvasRenderingContext2D,
  stats: ReturnType<typeof histogram>,
  level: number,
  width: number,
  area: Rect,
) {
  ctx.fillStyle = "#0d1625";
  ctx.fillRect(area.x, area.y, area.width, area.height);
  ctx.fillStyle = "#b4c7de";
  ctx.font = "12px sans-serif";
  ctx.fillText("Histogram scalar gốc · log1p(count)", area.x + 12, area.y + 20);
  const plot = { x: area.x + 16, y: area.y + 38, width: area.width - 32, height: area.height - 83 };
  const maximum = Math.max(...stats.bins);
  ctx.fillStyle = "#378ea0";
  stats.bins.forEach((count, i) => {
    const height = (plot.height * Math.log1p(count)) / Math.log1p(maximum);
    ctx.fillRect(
      plot.x + (i / 64) * plot.width,
      plot.y + plot.height - height,
      plot.width / 64 - 1,
      height,
    );
  });
  ctx.strokeStyle = "#ffda85";
  for (const value of [level - width / 2, level + width / 2]) {
    const x = plot.x + Math.max(0, Math.min(1, value)) * plot.width;
    ctx.beginPath();
    ctx.moveTo(x, plot.y);
    ctx.lineTo(x, plot.y + plot.height);
    ctx.stroke();
  }
  ctx.fillStyle = "#94a6be";
  ctx.fillText("0", plot.x, plot.y + plot.height + 18);
  ctx.fillText("scalar [0,1]", plot.x + plot.width / 2 - 30, plot.y + plot.height + 18);
  ctx.fillText("1", plot.x + plot.width - 8, plot.y + plot.height + 18);
  ctx.fillText(
    stats.samples.toLocaleString("en-US") + " mẫu thật",
    plot.x,
    area.y + area.height - 9,
  );
}
