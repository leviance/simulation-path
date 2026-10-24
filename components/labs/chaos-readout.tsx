"use client";
import {
  doublePendulumGeometry,
  doublePendulumDerivative,
  wrapPendulumAngle,
} from "@/lib/labs/double-pendulum-chaos";
import { CHAOS_STEPS, type ChaosScene } from "@/lib/labs/chaos-scene";
import { LabReadout } from "./lab-shared";
const vector = (p: { x: number; y: number }) => "(" + p.x.toFixed(4) + ", " + p.y.toFixed(4) + ")";
export function ChaosReadout({ scene: s }: { scene: ChaosScene }) {
  const m = s.metrics,
    a = s.race.primary,
    b = s.race.perturbed,
    r = s.race.halfStepReference;
  const items = [
    {
      label: "Điều kiện đầu",
      value:
        "θ₁=" +
        s.initial.theta1.toFixed(5) +
        " · θ₂=" +
        s.initial.theta2.toFixed(5) +
        " rad · ω₁=" +
        s.initial.omega1.toFixed(3) +
        " · ω₂=" +
        s.initial.omega2.toFixed(3) +
        " rad/s",
    },
  ];
  if (s.stage === 1) {
    const geo = doublePendulumGeometry(a, s.parameters);
    items.push(
      { label: "Vị trí hai quả nặng", value: vector(geo.bob1) + " / " + vector(geo.bob2) + " m" },
      {
        label: "Chiều dài hai thanh",
        value:
          Math.hypot(geo.bob1.x, geo.bob1.y).toFixed(5) +
          " / " +
          Math.hypot(geo.bob2.x - geo.bob1.x, geo.bob2.y - geo.bob1.y).toFixed(5) +
          " m",
      },
    );
  }
  if (s.stage === 2) {
    const d = doublePendulumDerivative(s.initial, s.parameters);
    items.push({
      label: "Gia tốc góc α₁ / α₂",
      value: d
        ? d.omega1Rate.toFixed(6) + " / " + d.omega2Rate.toFixed(6) + " rad/s²"
        : "Không hợp lệ",
    });
  }
  if (s.stage >= 3)
    items.push(
      { label: "Elapsed / bước physics", value: a.elapsed.toFixed(3) + " s / " + s.race.stepCount },
      { label: "Cơ năng A", value: m.energyA.toFixed(9) + " J" },
      {
        label: "Max |ΔE| từ đầu run",
        value: s.maximumEnergyErrors
          .slice(0, s.stage >= 6 ? 3 : s.stage >= 4 ? 2 : 1)
          .map((e, i) => ["A", "B", "h/2"][i] + ": " + e.toExponential(4) + " J")
          .join(" · "),
      },
      {
        label: "Substep / frame guard",
        value: s.substeps + " / " + s.droppedTime.toFixed(4) + " s đã bỏ",
      },
      { label: "Fixed dt", value: CHAOS_STEPS[s.dtIndex]?.toFixed(7) + " s" },
    );
  if (s.stage >= 4)
    items.push(
      { label: "Cơ năng B", value: m.energyB.toFixed(9) + " J · mỗi con lắc có E₀ riêng" },
      {
        label: "Thời gian A / B",
        value: a.elapsed.toFixed(6) + " / " + b.elapsed.toFixed(6) + " s",
      },
      { label: "Nhiễu ban đầu epsilon", value: s.epsilon.toExponential(1) + " rad" },
    );
  if (s.stage >= 5)
    items.push(
      { label: "Độ tách phase space d", value: m.phase.toExponential(6) + " · không đơn vị" },
      { label: "Khoảng cách hai quả cuối", value: m.bobDistance.toExponential(6) + " m" },
      {
        label: "Hiệu theta2: raw / wrapped",
        value:
          (b.theta2 - a.theta2).toFixed(5) +
          " / " +
          wrapPendulumAngle(b.theta2 - a.theta2).toFixed(5) +
          " rad",
      },
      {
        label: "Tăng trưởng hữu hạn log(d/d₀)/t",
        value: Number.isFinite(m.exponent)
          ? m.exponent.toFixed(6) + " 1/s · chưa phải Lyapunov exponent hội tụ"
          : "Chưa xác định khi t=0, d₀=0 hoặc d=0",
      },
    );
  if (s.stage >= 6)
    items.push(
      {
        label: "Numerical shadow separation",
        value: m.numerical.toExponential(6) + " · h so với hai bước h/2",
      },
      { label: "Thời gian h/2 reference", value: r.elapsed.toFixed(6) + " s" },
      {
        label: "Cách đọc hai đường",
        value:
          s.epsilon === 0
            ? "Hai điều kiện đầu giống nhau: A/B phải trùng, dù h và h/2 vẫn có sai khác."
            : m.numerical < m.phase
              ? "Sai khác h/h2 nhỏ hơn độ tách A/B trong run này; vẫn cần giảm h để kiểm tra."
              : "Sai khác h/h2 đang bằng/lớn hơn độ tách A/B. Giảm h hoặc rút ngắn khoảng quan sát; chưa kết luận chaos từ hình.",
      },
    );
  if (s.stage >= 3)
    items.push({
      label: "History / fast job",
      value: s.history.length + " mẫu · còn " + s.fastRemaining + " bước",
    });
  items.push({
    label: "Finite / pointer",
    value:
      (m.finite ? "hữu hạn" : "KHÔNG hợp lệ") +
      " / " +
      (s.dragOffset !== null ? "đang kéo" : "đã nhả"),
  });
  return (
    <>
      {s.debug && <LabReadout items={items} />}
      {s.message && (
        <p className="lab-hint" role="status">
          {s.message}
        </p>
      )}
      <p className="lab-hint">
        Hai thanh cứng không có khối lượng; hai quả nặng là point mass. Mô hình không có ma sát hay
        lực cản không khí.
        {s.stage >= 3 && (
          <>
            {" "}
            Đồ thị ΔE dùng Joule và tự đổi thang dọc; hãy đọc số thay vì so chiều cao giữa hai run.
          </>
        )}
        {s.stage >= 5 && (
          <>
            {" "}
            Trục X là thời gian physics, trục log dùng sàn 1e-12 chỉ để vẽ; d=0 không bị sửa thành
            số dương. History giữ 751 mẫu gần nhất, lấy định kỳ tối đa 25 Hz và thêm điểm bước
            đơn/cuối job.
          </>
        )}
        {s.stage >= 6 && (
          <>
            {" "}
            Quỹ đạo h/2 là phép đối chiếu số, không phải nghiệm chính xác. Một run ngắn và một tốc
            độ tăng trưởng dương chưa phải chứng minh chaos.
          </>
        )}
      </p>
    </>
  );
}
