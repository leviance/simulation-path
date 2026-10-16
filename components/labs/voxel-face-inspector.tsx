"use client";
import { useEffect, useId, useRef, useState } from "react";
import { inspectQuad } from "@/lib/labs/voxel-face-inspector";
import { defaultCamera, project } from "@/lib/labs/voxel-chunk/raster";
import { faces, type Vec3 } from "@/lib/labs/voxel-chunk/model";
import { setupCanvas, useCanvasSize } from "./lab-shared";

const names = ["+X", "−X", "+Y", "−Y", "+Z", "−Z"];
export function VoxelFaceInspector() {
  const canvas = useRef<HTMLCanvasElement>(null),
    size = useCanvasSize(canvas),
    help = useId();
  const [face, setFace] = useState(0),
    [reverse, setReverse] = useState(false);
  const data = inspectQuad(face, reverse);
  useEffect(() => {
    const ctx = canvas.current?.getContext("2d");
    if (!ctx) return;
    setupCanvas(ctx, size);
    const scale = Math.min(size.width / 320, size.height / 260);
    const camera = { ...defaultCamera, center: 7.5, scale: 85 };
    const screen = (p: Vec3) => {
      const q = project(p.map((v) => v + 7) as Vec3, camera);
      return [size.width / 2 + (q.x - 160) * scale, size.height / 2 + (q.y - 120) * scale] as const;
    };
    for (const quad of faces) {
      ctx.beginPath();
      quad.forEach((p, i) => {
        const q = screen(p);
        if (i === 0) ctx.moveTo(...q);
        else ctx.lineTo(...q);
      });
      ctx.closePath();
      ctx.strokeStyle = "#52627c";
      ctx.stroke();
    }
    data.triangles.forEach((triangle, i) => {
      const color = i === 0 ? "#f7cb71" : "#59ddbd";
      ctx.beginPath();
      triangle.indices.forEach((index, n) => {
        const p = screen(data.vertices[index]);
        if (n === 0) ctx.moveTo(...p);
        else ctx.lineTo(...p);
      });
      ctx.closePath();
      ctx.fillStyle = i === 0 ? "#f7cb7144" : "#59ddbd44";
      ctx.fill();
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.stroke();
      const a = screen(triangle.centre),
        b = screen(triangle.centre.map((v, j) => v + triangle.normal[j] * 0.4) as Vec3);
      ctx.beginPath();
      ctx.moveTo(...a);
      ctx.lineTo(...b);
      const angle = Math.atan2(b[1] - a[1], b[0] - a[0]);
      for (const side of [-1, 1]) {
        ctx.moveTo(...b);
        ctx.lineTo(
          b[0] - 8 * Math.cos(angle + side * 0.4),
          b[1] - 8 * Math.sin(angle + side * 0.4),
        );
      }
      ctx.stroke();
    });
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 14px monospace";
    data.vertices.forEach((p, i) => {
      const q = screen(p);
      ctx.fillText("v" + i, q[0] + 5, q[1] - 5);
    });
  }, [size, face, reverse]);
  return (
    <section aria-label="Phòng thực hành từng mặt cube">
      <h3>Đọc một mặt: bốn đỉnh, hai tam giác</h3>
      <div className="lab-controls">
        <label>
          Mặt đang xem{" "}
          <select
            aria-label="Mặt cube trong thí nghiệm"
            value={face}
            onChange={(e) => setFace(Number(e.target.value))}
          >
            {names.map((n, i) => (
              <option value={i} key={n}>
                {n}
              </option>
            ))}
          </select>
        </label>
        <label>
          <input type="checkbox" checked={reverse} onChange={(e) => setReverse(e.target.checked)} />
          Đảo winding tam giác 2 (thí nghiệm)
        </label>
        <button
          onClick={() => {
            setFace(0);
            setReverse(false);
          }}
        >
          Đặt lại mặt cube
        </button>
      </div>
      <canvas
        ref={canvas}
        style={{ width: "100%", height: 300 }}
        role="img"
        aria-describedby={help}
        aria-label="Một quad của cube, hai tam giác màu vàng và xanh với mũi tên normal"
      />
      <p id={help}>
        Tam giác 1 màu vàng, tam giác 2 màu xanh. Mũi tên là cross product của hai cạnh theo thứ tự
        vertex. Cube có origin (7,7,7). Đảo winding chỉ đổi thí nghiệm này, không sửa chunk, mesh
        hoặc bộ đếm ở hình chính.
      </p>
      <table>
        <caption>Normal hướng ra mong đợi: ({data.expected.join(", ")})</caption>
        <thead>
          <tr>
            <th>Tam giác</th>
            <th>Thứ tự đỉnh</th>
            <th>Normal tính được</th>
          </tr>
        </thead>
        <tbody>
          {data.triangles.map((t, i) => (
            <tr key={i}>
              <th scope="row">{i + 1}</th>
              <td>{t.indices.map((n) => "v" + n).join(" → ")}</td>
              <td>({t.normal.join(", ")})</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p aria-live="polite">
        {reverse
          ? "Tam giác 2 đã đảo normal; hình vẫn có thể kín khi chưa bật back-face culling."
          : "Cả hai tam giác có normal hướng ra."}
      </p>
      <details>
        <summary>Tọa độ bốn đỉnh</summary>
        <ul>
          {data.vertices.map((p, i) => (
            <li key={i}>
              v{i}: local ({p.join(", ")}), world ({p.map((v) => v + 7).join(", ")})
            </li>
          ))}
        </ul>
      </details>
    </section>
  );
}
