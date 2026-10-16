"use client";
import { useEffect, useRef } from "react";
import type { Experiment } from "@/lib/labs/photon-rain";
import { setupCanvas, useCanvasSize } from "../lab-shared";

export function ConvergencePlot({
  samples,
  expected,
}: {
  samples: Experiment["convergence"];
  expected: number;
}) {
  const canvas = useRef<HTMLCanvasElement>(null),
    size = useCanvasSize(canvas);
  useEffect(() => {
    const ctx = canvas.current?.getContext("2d");
    if (!ctx) return;
    setupCanvas(ctx, size);
    const left = 46,
      top = 30,
      width = size.width - 66,
      height = size.height - 70;
    const x = (n: number) => left + (Math.log2(n) / 13) * width;
    const y = (p: number) => top + (1 - p) * height;
    ctx.font = "12px system-ui";
    ctx.fillStyle = "#d8e2f5";
    ctx.fillText("Ước lượng ballistic và Wilson 95%", left, 17);
    ctx.strokeStyle = "#718cae";
    ctx.strokeRect(left, top, width, height);
    for (const p of [0, 0.5, 1]) ctx.fillText(String(p), 8, y(p) + 4);
    for (const n of [1, 16, 256, 8192]) ctx.fillText(String(n), x(n) - 12, top + height + 19);
    ctx.fillText("N (trục log₂)", left, size.height - 4);
    ctx.setLineDash([5, 4]);
    ctx.strokeStyle = "#ff7088";
    ctx.beginPath();
    ctx.moveTo(left, y(expected));
    ctx.lineTo(left + width, y(expected));
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.strokeStyle = "#f7cb71";
    ctx.beginPath();
    samples.forEach((s, i) => {
      const sx = x(s.count),
        sy = y(s.ballistic / s.count);
      if (i === 0) ctx.moveTo(sx, sy);
      else ctx.lineTo(sx, sy);
    });
    ctx.stroke();
    for (const s of samples) {
      const sx = x(s.count);
      ctx.strokeStyle = "#59ddbd";
      ctx.beginPath();
      ctx.moveTo(sx, y(s.low));
      ctx.lineTo(sx, y(s.high));
      ctx.moveTo(sx - 4, y(s.low));
      ctx.lineTo(sx + 4, y(s.low));
      ctx.moveTo(sx - 4, y(s.high));
      ctx.lineTo(sx + 4, y(s.high));
      ctx.stroke();
      ctx.fillStyle = "#f7cb71";
      ctx.beginPath();
      ctx.arc(sx, y(s.ballistic / s.count), 3, 0, 2 * Math.PI);
      ctx.fill();
    }
  }, [size, samples, expected, samples.length]);
  return (
    <section aria-label="Đọc độ bất định theo số photon">
      <canvas
        ref={canvas}
        style={{ width: "100%", height: 280 }}
        role="img"
        aria-label="Đồ thị: điểm vàng là ballistic/N, vạch xanh là Wilson 95%, đường hồng đứt là lý thuyết"
      />
      <p>
        Điểm vàng: ballistic/N. Vạch xanh: Wilson 95%. Đường hồng đứt: xác suất không tương tác lý
        thuyết. Tối đa 15 mốc N; đọc lại dữ liệu đã tally, không phát thêm photon. Các khoảng ở N
        khác nhau dùng mẫu lồng nhau, không phải các thí nghiệm độc lập và không phải một confidence
        band đồng thời.
      </p>
      <details>
        <summary>Xem số liệu của đồ thị</summary>
        <table>
          <thead>
            <tr>
              <th>N</th>
              <th>Ballistic/N</th>
              <th>Wilson 95%</th>
            </tr>
          </thead>
          <tbody>
            {samples.map((s) => (
              <tr key={s.count}>
                <th scope="row">{s.count}</th>
                <td>{(s.ballistic / s.count).toFixed(5)}</td>
                <td>
                  [{s.low.toFixed(5)}; {s.high.toFixed(5)}]
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {samples.length === 0 && <p>Chưa có mẫu. Thêm photon để tạo mốc đầu tiên.</p>}
      </details>
    </section>
  );
}
