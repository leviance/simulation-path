import { LabReadout } from "../lab-shared";
import type { Snapshot } from "@/lib/labs/sph-water";
export function WaterReadout({ s }: { s: Snapshot }) {
  const m = s.metrics;
  return (
    <>
      <LabReadout
        items={[
          { label: "Số hạt / khối lượng", value: `${s.count} / ${s.mass.toFixed(2)} kg` },
          { label: "Thời gian mô phỏng", value: `${s.time.toFixed(6)} s · tick ${s.tick}` },
          { label: "Cập nhật / vẽ", value: `${s.updated} / ${s.drawn}` },
          {
            label: "Dt / thời gian một bước",
            value: `${s.dt.toFixed(6)} s / ${s.stepMs.toFixed(2)} ms`,
          },
          { label: "Thời gian bỏ qua", value: `${s.dropped.toFixed(4)} s` },
          { label: "Đổ thành công / từ chối", value: `${s.emitted} / ${s.rejected}` },
          ...(s.debug
            ? [
                {
                  label: "Density min / median / max",
                  value: `${m.minimum.toFixed(4)} / ${m.median.toFixed(4)} / ${m.maximum.toFixed(4)} × ρ₀`,
                },
                {
                  label: "P95 độ nén / hạt lọt biên",
                  value: `${(100 * m.p95Compression).toFixed(2)}% / ${m.leaked}`,
                },
                { label: "Ứng viên tìm kiếm", value: s.candidates },
              ]
            : []),
          {
            label: "Hạt đang chọn",
            value: s.particle
              ? `${s.selected}: ρ=${s.particle.density.toFixed(3)} kg/m²; p=${s.particle.pressure.toFixed(3)} N/m`
              : "Bể trống",
          },
          ...(s.particle
            ? [
                {
                  label: "Velocity hiện tại / acceleration đầu bước cuối",
                  value: `(${s.particle.vx.toFixed(6)}; ${s.particle.vy.toFixed(6)}) m/s / (${s.particle.ax.toFixed(3)}; ${s.particle.ay.toFixed(3)}) m/s²`,
                },
              ]
            : []),
        ]}
      />
      {s.error && <p role="alert">{s.error}</p>}
      <p role="status">Ca chuẩn riêng: {s.report}</p>
    </>
  );
}
