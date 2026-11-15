import type { Snapshot } from "@/lib/labs/stable-fluids";
import { LabReadout } from "../lab-shared";
const num = (v: number) => (Number.isFinite(v) ? v.toExponential(3) : "không hữu hạn");
export function FluidReadout({ snapshot: s, stage }: { snapshot: Snapshot; stage: number }) {
  const items = [
    {
      label: "Quy mô thực",
      value: `${s.n}×${s.n} · cấp phát ${s.allocated} · cập nhật ${s.updated} · vẽ ${s.drawn} ô`,
    },
    { label: "Thời gian mô phỏng", value: `${s.modelTime.toFixed(3)} s · tick ${s.tick}` },
  ];
  if (stage >= 10)
    items.push({
      label: "Thời gian bỏ qua / kernel gần nhất",
      value: `${s.dropped.toFixed(3)} s / ${s.kernelMs.toFixed(1)} ms (không gồm vẽ)`,
    });
  if (!s.clean) {
    items.push(
      {
        label: "Ô đang chọn / concentration",
        value: `(${s.cell.x}; ${s.cell.y}) / ${num(s.cell.density)}`,
      },
      {
        label: "Min / max / tích phân scalar",
        value: `${num(s.diagnostics.min)} / ${num(s.diagnostics.max)} / ${num(s.diagnostics.mass)}`,
      },
    );
    if (stage >= 4)
      items.push(
        {
          label: "Bốn cạnh: u trái / phải; v dưới / trên",
          value: `${num(s.cell.uL)} / ${num(s.cell.uR)}; ${num(s.cell.vB)} / ${num(s.cell.vT)}`,
        },
        { label: "Divergence ô / RMS", value: `${num(s.cell.divergence)} / ${num(s.divRms)}` },
        {
          label: "Số cạnh velocity / Courant",
          value: `${s.faces} / ${num(s.diagnostics.courant)}`,
        },
      );
    if (stage >= 5)
      items.push({
        label: "Pressure ô / bài toán Jacobi đang mở",
        value: `${num(s.cell.pressure)} / ${s.residual === null ? "chưa chuẩn bị RHS" : `residual ${num(s.residual)} · ${s.iterations}/160 vòng`}`,
      });
    if (s.projection) {
      const p = s.projection;
      items.push(
        {
          label: "Lần projection gần nhất: div trước → sau",
          value: `${num(p.before)} → ${num(p.after)}`,
        },
        {
          label: "Solver / residual / ngưỡng / vòng",
          value: `${p.method.toUpperCase()} · ${num(p.residual)} / ${num(p.target)} · ${p.iterations}/${p.budget} · ${p.converged ? "đạt ngưỡng" : "chưa đạt ngưỡng"}`,
        },
      );
    }
    if (stage >= 9)
      items.push({ label: "Chỉ số năng lượng vận tốc", value: num(s.diagnostics.energy) });
  }
  return (
    <>
      <LabReadout items={items} />
      {!s.clean && s.jacobi && (
        <p className="lab-note">
          Jacobi tại ô chọn: p cũ {num(s.jacobi.oldValue)}; b {num(s.jacobi.rhs)}; tổng{" "}
          {s.jacobi.count} hàng xóm {num(s.jacobi.sum)}; candidate {num(s.jacobi.candidate)}; trước
          khi trừ mean: {num(s.jacobi.weighted)}.
        </p>
      )}
      {s.reference && (
        <p role="status">
          Ca chuẩn riêng: {s.reference.pass ? "PASS" : "FAIL"} · N=16 Jacobi: div{" "}
          {num(s.reference.small.before)} → {num(s.reference.small.after)}; N=128 PCG:{" "}
          {num(s.reference.large.after)}; sai số scalar hằng: {num(s.reference.constantError)}.
          Không thay dữ liệu cảnh đang xem.
        </p>
      )}
      {s.error && <p role="alert">{s.error}</p>}
    </>
  );
}
