"use client";

import {
  cloneSettings,
  type Vec3,
  type Preset,
  type Settings,
} from "@/lib/labs/charged-particle-chamber/math";
import type {
  ChamberController,
  ChamberView,
} from "@/lib/labs/charged-particle-chamber/controller";

export default function ChamberSettings({
  controller,
  state,
}: {
  controller: ChamberController;
  state: ChamberView;
}) {
  const stage = (edit: (s: Settings) => void) => {
    const next = cloneSettings(state.staged);
    edit(next);
    controller.stage(next);
  };
  const vector = (
    name: string,
    value: Vec3,
    update: (s: Settings, axis: keyof Vec3, value: number) => void,
  ) => (
    <fieldset
      style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap", border: 0, padding: "0.4rem 0" }}
    >
      <legend>{name} — STAGED</legend>
      {(["x", "y", "z"] as const).map((axis) => (
        <label key={axis}>
          {axis.toUpperCase()}
          <input
            aria-label={`${name} ${axis}`}
            type="number"
            step="0.1"
            value={value[axis]}
            onChange={(e) => stage((s) => update(s, axis, Number(e.target.value)))}
            style={{ width: "6rem" }}
          />
        </label>
      ))}
    </fieldset>
  );
  return (
    <>
      <div className="lab-controls">
        <label>
          Preset
          <select
            aria-label="Preset chuyển động"
            value={state.staged.preset}
            onChange={(e) => controller.preset(e.target.value as Preset)}
          >
            <option value="straight">Không có trường: thẳng</option>
            <option value="circle">Chỉ B: tròn</option>
            <option value="helix">Chỉ B: xoắn 3D</option>
            <option value="electric">Chỉ E: gia tốc</option>
          </select>
        </label>
        <label>
          N yêu cầu cho C++
          <select
            aria-label="N yêu cầu cho C++"
            value={state.staged.count}
            onChange={(e) =>
              stage((s) => {
                s.count = Number(e.target.value);
              })
            }
          >
            {[1, 257, 1_000_000, 1_000_003, 5_000_000].map((n) => (
              <option key={n} value={n}>
                {n.toLocaleString("vi-VN")}
              </option>
            ))}
          </select>
        </label>
        <label>
          Seed uint32
          <input
            aria-label="Seed uint32"
            type="number"
            min="0"
            max="4294967295"
            step="1"
            value={state.staged.seed}
            onChange={(e) =>
              stage((s) => {
                s.seed = Number(e.target.value);
              })
            }
          />
        </label>
        <label>
          dt (giây)
          <select
            aria-label="Bước thời gian dt"
            value={state.staged.dt}
            onChange={(e) =>
              stage((s) => {
                s.dt = Number(e.target.value);
              })
            }
          >
            {[30, 60, 120, 240, 480].map((fps) => (
              <option key={fps} value={1 / fps}>
                1/{fps} s
              </option>
            ))}
          </select>
        </label>
        <label>
          Hệ số điện tích
          <input
            aria-label="Hệ số điện tích"
            type="number"
            min="-4"
            max="4"
            step="0.25"
            value={state.staged.fields.chargeScale}
            onChange={(e) =>
              stage((s) => {
                s.fields.chargeScale = Number(e.target.value);
              })
            }
          />
        </label>
        <label>
          Trải pha ban đầu
          <select
            aria-label="Trải pha ban đầu"
            value={state.staged.phaseSpan}
            onChange={(e) =>
              stage((s) => {
                s.phaseSpan = Number(e.target.value);
              })
            }
          >
            <option value="0">0 s: cùng thời điểm xuất phát</option>
            <option value="6">6 s: nhiều vị trí trên quỹ đạo B</option>
            <option value="12">12 s</option>
          </select>
        </label>
      </div>
      <div className="lab-controls" style={{ alignItems: "start" }}>
        {vector("Điện trường E", state.staged.fields.electric, (s, axis, value) => {
          s.fields.electric[axis] = value;
        })}
        {vector("Từ trường B", state.staged.fields.magnetic, (s, axis, value) => {
          s.fields.magnetic[axis] = value;
        })}
        {vector("Vận tốc ban đầu", state.staged.initialVelocity, (s, axis, value) => {
          s.initialVelocity[axis] = value;
        })}
      </div>
      <div className="lab-controls">
        <button type="button" onClick={() => controller.apply()}>
          Áp dụng và Reset
        </button>
        <span>
          {state.stagedChanged
            ? "Có thay đổi chưa áp dụng; ACTIVE chưa đổi."
            : "STAGED trùng ACTIVE."}
        </span>
      </div>
      <p className="lab-hint">
        Trải pha chỉ chuẩn bị snapshot khi E = 0 và B, q khác 0. ID 0/1 luôn bắt đầu cùng gốc; từ
        tick đầu, mọi hạt đều được integrator cập nhật. Đổi preset chưa làm đổi cảnh cho tới khi áp
        dụng.
      </p>
    </>
  );
}
