"use client";

import { lazy, Suspense } from "react";
import { LabReadout } from "../lab-shared";
import { selectedError, type ChamberView } from "@/lib/labs/charged-particle-chamber/controller";
import { position, preparedPhaseSpan, velocity } from "@/lib/labs/charged-particle-chamber/math";
import { error, vector } from "./format";

const LessonPanels = lazy(() => import("./lesson-panels"));
const panelModes = new Set([
  "particle-state",
  "lorentz-force",
  "boris-step",
  "chamber-budget",
  "chamber-compute",
  "chamber-clock",
  "chamber-reference",
  "chamber-validation",
  "chamber-measurement",
  "charged-chamber",
]);

export default function ChamberReadout({ state }: { state: ChamberView }) {
  const p = state.particles[state.selected];
  const e = selectedError(state);
  return (
    <>
      <p role="status" className="lab-hint">
        {state.message}
      </p>
      <LabReadout
        items={[
          {
            label: "Trạng thái",
            value: `${state.paused ? "Tạm dừng" : "Đang chạy"} · tick ${state.clock.tick} · t=${state.clock.simulatedSeconds.toFixed(4)} s · generation ${state.generation}`,
          },
          {
            label: "Quy mô thực trên Canvas",
            value: `${state.particles.length} hạt CPU; không phải ${state.active.count.toLocaleString("vi-VN")} hạt GPU. Không đo GPU time ở đây.`,
          },
          {
            label: "Hạt đang đọc",
            value: `ID ${state.selected} · q=${(p.positionCharge.w * state.active.fields.chargeScale).toFixed(2)} · m=${p.velocityMass.w.toFixed(4)}`,
          },
          {
            label: "Position / velocity",
            value: `${vector(position(p))} / ${vector(velocity(p))}`,
          },
          {
            label: "Sai số so nghiệm độc lập",
            value: `|Δx|=${error(e.position)} · |Δv|=${error(e.velocity)} · cùng t=${state.clock.simulatedSeconds.toFixed(4)} s`,
          },
          {
            label: "Trường ACTIVE",
            value: `E=${vector(state.active.fields.electric)} · B=${vector(state.active.fields.magnetic)} · pha khởi tạo ${preparedPhaseSpan(state.active)} s`,
          },
          {
            label: "Vệt và thời gian",
            value: `Tối đa 17×256 điểm; lấy theo thời gian mô phỏng, không theo FPS. Wall time bỏ qua: ${state.clock.discardedSeconds.toFixed(3)} s.`,
          },
          {
            label: "Trạng thái tương tác",
            value:
              state.pointer === null ? "đã nhả pointer" : `đang capture pointer ${state.pointer}`,
          },
        ]}
      />
      {panelModes.has(state.mode) && (
        <Suspense fallback={null}>
          <LessonPanels state={state} />
        </Suspense>
      )}
      <p className="lab-hint">
        JavaScript dùng Number (double), còn state native dùng float32; sai số trên Canvas không
        phải số đo sai số GPU. Đọc cảnh mà không cần hình: E = B = 0 cho chuyển động thẳng; chỉ B
        làm v quay quanh hướng B; thành phần song song B tạo đường xoắn; chỉ E làm vận tốc thay đổi
        đều. Hai dấu điện tích cong theo hai phía. Đây là các hạt độc lập trong trường ngoài, không
        phải plasma tự nhất quán.
      </p>
    </>
  );
}
