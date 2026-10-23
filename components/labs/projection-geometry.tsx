"use client";

import { useEffect, useRef, useState } from "react";
import { worldToCamera } from "@/lib/labs/projection-point";
import type { PointScene } from "@/lib/labs/projection-scene";
import { drawLine, setupCanvas, useCanvasSize } from "./lab-shared";

// Mặt cắt dùng cùng camera point với viewport, không lấy tọa độ world để chia.
export function ProjectionGeometry({ scene }: { scene: PointScene }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const size = useCanvasSize(canvasRef);
  const [axis, setAxis] = useState<"x" | "y">("x");
  const point = worldToCamera(scene.point, scene.camera);
  const coordinate = point[axis];
  const ratio = point.z > 0 ? coordinate / point.z : null;
  const axisName = axis.toUpperCase();

  useEffect(() => {
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    setupCanvas(ctx, size);
    const origin = { x: 42, y: size.height / 2 };
    // Cùng một tỉ lệ cho cả hai trục để hai tam giác thực sự đồng dạng.
    const scale = Math.min(
      (size.width - 112) / Math.max(2, point.z),
      (size.height / 2 - 38) / Math.max(1, Math.abs(coordinate), Math.abs(ratio ?? 0)),
    );
    const at = (z: number, value: number) => ({
      x: origin.x + z * scale,
      y: origin.y - value * scale,
    });
    drawLine(ctx, { x: 24, y: origin.y }, { x: size.width - 25, y: origin.y }, "#74839f");
    drawLine(ctx, { x: origin.x, y: 22 }, { x: origin.x, y: size.height - 22 }, "#74839f");
    ctx.font = "14px ui-monospace";
    ctx.fillStyle = "#e1e8fa";
    ctx.fillText("+Z", size.width - 35, origin.y + 22);
    ctx.fillText("+" + axisName, origin.x + 8, 24);
    ctx.fillText("C", origin.x - 20, origin.y + 20);
    if (ratio === null) {
      ctx.fillText("Z ≤ 0: không chiếu điểm sau camera.", 64, origin.y - 30);
      return;
    }
    const triangle = (z: number, value: number, color: string) => {
      ctx.beginPath();
      ctx.moveTo(origin.x, origin.y);
      ctx.lineTo(at(z, 0).x, at(z, 0).y);
      ctx.lineTo(at(z, value).x, at(z, value).y);
      ctx.closePath();
      ctx.fillStyle = color;
      ctx.fill();
    };
    triangle(point.z, coordinate, "#74839f55");
    triangle(1, ratio, "#53f0ae88");
    drawLine(ctx, origin, at(Math.max(1, point.z), ratio * Math.max(1, point.z)), "#ffe26c", 2);
    drawLine(ctx, at(point.z, 0), at(point.z, coordinate), "#84a9ff", 2);
    ctx.setLineDash([5, 5]);
    drawLine(ctx, { x: at(1, 0).x, y: 18 }, { x: at(1, 0).x, y: size.height - 18 }, "#53f0ae");
    ctx.setLineDash([]);
    for (const [position, color] of [
      [at(point.z, coordinate), "#84a9ff"],
      [at(1, ratio), "#53f0ae"],
    ] as const) {
      ctx.beginPath();
      ctx.arc(position.x, position.y, 4, 0, 2 * Math.PI);
      ctx.fillStyle = color;
      ctx.fill();
    }
    ctx.fillStyle = "#e1e8fa";
    ctx.fillText("P", at(point.z, coordinate).x + 8, at(point.z, coordinate).y - 8);
    ctx.fillText("Z = 1", at(1, 0).x + 6, size.height - 12);
  }, [size, axisName, coordinate, point.z, ratio]);

  return (
    <figure>
      <figcaption>Nhìn ngang để hiểu phép chia cho Z</figcaption>
      <div className="lab-controls">
        <label>
          Mặt cắt
          <select
            aria-label="Mặt cắt"
            value={axis}
            onChange={(event) => setAxis(event.target.value as "x" | "y")}
          >
            <option value="x">XZ — độ lệch ngang</option>
            <option value="y">YZ — độ lệch dọc</option>
          </select>
        </label>
      </div>
      <canvas
        ref={canvasRef}
        style={{ height: 260 }}
        role="img"
        aria-label={`Mặt cắt ${axisName}Z: tia từ camera C qua P cắt mặt phẳng Z bằng 1`}
      />
      <p>
        Camera ở C. Tam giác lớn tới P màu xanh lam; tam giác xanh lá tới mặt phẳng ảnh tưởng tượng
        Z = 1. Thay Point.Z ở trên, giữ nguyên Point.{axisName} và camera rồi so hai tam giác. Đây
        là hình nhìn ngang, không phải một camera thứ hai trong ứng dụng.
      </p>
      <p>
        {ratio === null
          ? "Z không dương nên không thực hiện phép chia."
          : `${axisName} camera = ${coordinate.toFixed(3)}, Z camera = ${point.z.toFixed(3)} ⇒ ${axisName}′ = ${coordinate.toFixed(3)} / ${point.z.toFixed(3)} = ${ratio.toFixed(4)}.`}{" "}
        Mặt phẳng Z = 1 chỉ giúp suy ra {axis}/z; đây chưa phải NDC hay pixel. Near/far vẫn quyết
        định điểm có được vẽ trong viewport chính hay không.
      </p>
    </figure>
  );
}
