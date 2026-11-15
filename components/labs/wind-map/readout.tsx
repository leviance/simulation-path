import type { WindSession } from "@/lib/labs/wind-map/session";
import { curl, divergence, derivativeX, derivativeY } from "@/lib/labs/wind-map/operators";
import { gradientError } from "@/lib/labs/wind-map/reference";

export function WindReadout({ app }: { app: WindSession }) {
  const field = app.field;
  const x = Math.round((app.cursor.x + 2) / field.dx),
    y = Math.round((app.cursor.y + 1.5) / field.dy);
  const i = y * field.width + x;
  const rows = [
    { label: "Nút đang chọn", value: `(${x}; ${y}) · index ${i}` },
    { label: "World (x; y)", value: `${app.cursor.x.toFixed(3)}; ${app.cursor.y.toFixed(3)}` },
    { label: "Vector (vx; vy)", value: `${field.vx[i].toFixed(6)}; ${field.vy[i].toFixed(6)}` },
    {
      label: "Lưới / dx / dy",
      value: `${field.width} × ${field.height} / ${field.dx.toFixed(4)} / ${field.dy.toFixed(4)}`,
    },
    { label: "Mẫu trường / glyph hiển thị", value: `${field.vx.length} / 221` },
  ];
  if (app.stage >= 3)
    rows.push(
      { label: "Scalar φ", value: field.scalar[i].toFixed(6) },
      {
        label: "Gradient φ",
        value: `${derivativeX(field, field.scalar, x, y).toFixed(6)}; ${derivativeY(field, field.scalar, x, y).toFixed(6)}`,
      },
    );
  if (app.stage >= 4) rows.push({ label: "Divergence", value: divergence(field, x, y).toFixed(6) });
  if (app.stage >= 5) rows.push({ label: "Curl z", value: curl(field, x, y).toFixed(6) });
  if (app.stage >= 6 && app.scene.preset === "gradient" && !app.scene.vortex) {
    const error = gradientError(field, app.scene.potential);
    rows.push({
      label: "Sai số gradient trong miền / mép",
      value: `${error.interior.toExponential(3)} / ${error.boundary.toExponential(3)}`,
    });
  }
  if (app.stage >= 7)
    rows.push(
      { label: "Tick", value: String(app.tick) },
      { label: "Thời gian mô phỏng", value: `${app.modelTime.toFixed(3)} s` },
      { label: "Thời gian bỏ qua", value: `${app.dropped.toFixed(3)} s` },
      {
        label: "Tracer / bước gần nhất / đang vẽ",
        value: `128 / ${app.visitedLastStep} / ${app.tracers ? 128 : 0}`,
      },
    );
  if (app.stage >= 9) rows.push({ label: "Kiểm chứng", value: app.report });
  return (
    <dl className="lab-readout" aria-live={app.paused ? "polite" : "off"}>
      {rows.map((row) => (
        <div key={row.label}>
          <dt>{row.label}</dt>
          <dd>{row.value}</dd>
        </div>
      ))}
    </dl>
  );
}
