"use client";

import { useState } from "react";
import { LabReadout } from "../lab-shared";
import {
  forceParts,
  selectedError,
  type ChamberView,
} from "@/lib/labs/charged-particle-chamber/controller";
import {
  dot,
  cross,
  mul,
  add,
  velocity,
  position,
  preparedPhaseSpan,
  makeBudget,
  type Vec3,
} from "@/lib/labs/charged-particle-chamber/math";

const vector = (v: Vec3) => `[${v.x.toFixed(4)}, ${v.y.toFixed(4)}, ${v.z.toFixed(4)}]`;
const error = (value: number | null) => (value === null ? "chưa có" : value.toExponential(3));

export default function ChamberReadout({ state }: { state: ChamberView }) {
  const [blockMiB, setBlockMiB] = useState(256);
  const [consumer, setConsumer] = useState("shader");
  const p = state.particles[state.selected],
    e = selectedError(state),
    force = forceParts(state);
  const comparison = state.comparison;
  const budget = makeBudget(state.staged, {
    major: 4,
    minor: 3,
    maximumBlockBytes: blockMiB * 1024 ** 2,
    maximumGroupsX: 65535,
    maximumLocalX: 1024,
    maximumInvocations: 1024,
    storageBindings: 8,
    computeStorageBlocks: 8,
  });
  const half = 0.5 * state.active.dt * force.qOverM;
  const vMinus = add(velocity(p), mul(state.active.fields.electric, half));
  const t = mul(state.active.fields.magnetic, half),
    s = mul(t, 2 / (1 + dot(t, t)));
  const vPrime = add(vMinus, cross(vMinus, t));
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
      {state.mode === "particle-state" && (
        <LabReadout
          items={[
            {
              label: "Layout C++/GLSL (không phải heap JS)",
              value: "Particle 32 byte; align 16; positionCharge offset 0; velocityMass offset 16.",
            },
            {
              label: "Địa chỉ ID trong SSBO",
              value: `${state.selected} × 32 = ${state.selected * 32} byte; điện tích ở +12, khối lượng ở +28.`,
            },
          ]}
        />
      )}
      {state.mode === "lorentz-force" && (
        <LabReadout
          items={[
            { label: "Gia tốc do E", value: vector(force.electric) },
            { label: "Gia tốc do v × B", value: vector(force.magnetic) },
            { label: "Gia tốc tổng", value: vector(force.total) },
            {
              label: "Thử đổi dấu",
              value:
                "Chọn ID 0/1 hoặc đổi hệ số điện tích rồi Áp dụng: chiều quay phải đổi, không chỉ màu.",
            },
          ]}
        />
      )}
      {state.mode === "boris-step" && (
        <LabReadout
          items={[
            { label: "Bước kế tiếp: vMinus", value: vector(vMinus) },
            { label: "t / s", value: `${vector(t)} / ${vector(s)}` },
            { label: "vPrime", value: vector(vPrime) },
            {
              label: "Mốc thời gian",
              value:
                "x và v cùng ở t. Kick E/2 → xoay B → kick E/2; xNext = x + (vOld + vNext) dt/2.",
            },
          ]}
        />
      )}
      {["chamber-budget", "chamber-compute", "charged-chamber"].includes(state.mode) && (
        <>
          <label className="lab-hint">
            Giới hạn SSBO GIẢ ĐỊNH (không đọc GPU của bạn)
            <select
              aria-label="Giới hạn SSBO giả định"
              value={blockMiB}
              onChange={(event) => setBlockMiB(Number(event.target.value))}
            >
              {[16, 128, 256].map((value) => (
                <option value={value} key={value}>
                  {value} MiB
                </option>
              ))}
            </select>
          </label>
          <LabReadout
            items={[
              {
                label: "Kế hoạch theo STAGED",
                value: `N=${state.staged.count.toLocaleString("vi-VN")} · ${budget.groups} workgroups × 256 · ${budget.tailLanes} lane dư`,
              },
              {
                label: "Ngân sách C++ dự kiến",
                value: `State ${(budget.stateBytes / 1024 ** 2).toFixed(2)} MiB; tổng dự phòng ${(budget.reservedBytes / 1024 ** 2).toFixed(2)} MiB (3 state + probes/trails + render reserve). Không cấp phát trên Canvas.`,
              },
              {
                label: "Preflight giả định",
                value: `${budget.supported ? "Cho phép theo giới hạn nhập" : "Từ chối"}: ${budget.reason}`,
              },
            ]}
          />
        </>
      )}
      {state.mode === "chamber-compute" && (
        <>
          <label className="lab-hint">
            Bước tiếp theo đọc buffer bằng cách nào?
            <select
              aria-label="Consumer sau compute"
              value={consumer}
              onChange={(event) => setConsumer(event.target.value)}
            >
              <option value="shader">Compute/vertex shader đọc SSBO</option>
              <option value="readback">CPU dùng glGetBufferSubData</option>
              <option value="fence">Chỉ chờ fence?</option>
            </select>
          </label>
          <p className="lab-hint">
            {consumer === "shader"
              ? "GL_SHADER_STORAGE_BARRIER_BIT: consumer là shader đọc storage buffer."
              : consumer === "readback"
                ? "GL_BUFFER_UPDATE_BARRIER_BIT + kiểm completion bằng fence trước readback hữu hạn."
                : "Fence cho biết completion, không thay memory barrier về visibility. Canvas không giả lập GPU cache để tạo lỗi giả."}
          </p>
        </>
      )}
      {state.mode === "chamber-clock" && (
        <p className="lab-hint">
          Mỗi frame nhận tối đa 0,1 s wall time và chạy tối đa 8 bước. Thời gian dư được công bố là
          bỏ qua; t tham chiếu luôn bằng tick × dt. Pause không tích lũy thời gian chờ.
        </p>
      )}
      {["chamber-reference", "chamber-validation", "charged-chamber"].includes(state.mode) && (
        <LabReadout
          items={[
            {
              label: "Đối chiếu CPU hữu hạn",
              value: `${comparison.status}: ${comparison.message}`,
            },
            {
              label: "Snapshot đang kiểm",
              value: `ID ${comparison.selected} · generation ${comparison.generation} · ${comparison.completedSteps}/${comparison.totalSteps} bước · cùng T=${comparison.time.toFixed(4)} s`,
            },
            {
              label: "Sai số vị trí dt / dt/2",
              value: `${error(comparison.coarsePositionError)} / ${error(comparison.finePositionError)}`,
            },
            {
              label: "Sai số vận tốc dt / dt/2",
              value: `${error(comparison.coarseVelocityError)} / ${error(comparison.fineVelocityError)}`,
            },
          ]}
        />
      )}
      {state.mode === "chamber-measurement" && (
        <LabReadout
          items={[
            {
              label: "Update GPU",
              value:
                "TIME_ELAPSED quanh compute update. Đo trên executable; Canvas không có sample GPU.",
            },
            {
              label: "Draw GPU",
              value: "TIME_ELAPSED quanh particle core/halo draw; không gồm toàn bộ grid/HDR/HUD.",
            },
            {
              label: "Toàn frame",
              value:
                "CPU wall time tới sau SwapWindow, gồm presentation. Không đồng nhất với tổng GPU update + draw.",
            },
            {
              label: "Một job",
              value:
                "Khóa N, seed, fields, dt, camera và viewport; 4 warm-up + 20 mẫu. Hủy/hết hạn không báo hoàn tất.",
            },
          ]}
        />
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
