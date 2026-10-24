"use client";
import {
  CHAOS_STEPS,
  type ChaosScene,
  type ChaosSetting,
  type ChaosPreset,
} from "@/lib/labs/chaos-scene";
interface Props {
  scene: ChaosScene;
  reducedMotion: boolean;
  edit: (key: ChaosSetting, value: number) => void;
  preset: (p: ChaosPreset) => void;
  reset: () => void;
  defaults: () => void;
  togglePause: () => void;
  step: () => void;
  fast: () => void;
  shortRun: () => void;
  stop: () => void;
  toggleDebug: () => void;
}
export function ChaosControls({
  scene: s,
  reducedMotion,
  edit,
  preset,
  reset,
  defaults,
  togglePause,
  step,
  fast,
  shortRun,
  stop,
  toggleDebug,
}: Props) {
  return (
    <div className="lab-controls">
      {s.stage >= 7 && (
        <label>
          Preset
          <select
            aria-label="Preset con lắc"
            value={s.preset}
            onChange={(e) => preset(e.target.value as ChaosPreset)}
          >
            <option value="calm">Calm — góc nhỏ</option>
            <option value="chaotic">Chaotic — năng lượng cao</option>
            <option value="near-upright">Near upright — gần đỉnh</option>
            <option value="custom" disabled>
              Tự chỉnh
            </option>
          </select>
        </label>
      )}
      {(["theta1", "theta2"] as const).map((key) => (
        <label key={key}>
          Góc ban đầu {key === "theta1" ? "θ₁" : "θ₂"} (rad)
          <input
            aria-label={key === "theta1" ? "Góc ban đầu theta1" : "Góc ban đầu theta2"}
            type="range"
            min={-Math.PI}
            max={Math.PI}
            step=".01"
            value={s.initial[key]}
            onChange={(e) => edit(key, Number(e.target.value))}
          />
          <output>{s.initial[key].toFixed(3)}</output>
        </label>
      ))}
      {s.stage === 2 &&
        (["omega1", "omega2"] as const).map((key) => (
          <label key={key}>
            {key} (rad/s)
            <input
              aria-label={key}
              type="range"
              min="-4"
              max="4"
              step=".05"
              value={s.initial[key]}
              onChange={(e) => edit(key, Number(e.target.value))}
            />
            <output>{s.initial[key].toFixed(2)}</output>
          </label>
        ))}
      {s.stage >= 3 && (
        <label>
          Fixed dt
          <select
            aria-label="Fixed dt"
            value={s.dtIndex}
            onChange={(e) => edit("dtIndex", Number(e.target.value))}
          >
            {CHAOS_STEPS.map((dt, i) => (
              <option key={dt} value={i}>
                {["1/30 s", "1/60 s", "1/120 s", "1/240 s", "1/480 s", "1/960 s"][i]}
              </option>
            ))}
          </select>
        </label>
      )}
      {s.stage >= 4 && (
        <label>
          Nhiễu ban đầu ε
          <select
            aria-label="Nhiễu góc ban đầu"
            value={s.epsilon}
            onChange={(e) => edit("epsilon", Number(e.target.value))}
          >
            {[0, 1e-8, 1e-7, 1e-6, 1e-5, 1e-4, 1e-3, 1e-2].map((v) => (
              <option key={v} value={v}>
                {v === 0 ? "0 — hai điều kiện đầu giống hệt" : v.toExponential(0) + " rad"}
              </option>
            ))}
          </select>
        </label>
      )}
      {s.stage >= 3 && (
        <>
          <button onClick={togglePause} disabled={reducedMotion || s.fastRemaining > 0}>
            {s.paused ? "Tiếp tục" : "Tạm dừng"}
          </button>
          <button onClick={step}>Tiến một bước</button>
        </>
      )}
      {s.stage >= 6 && (
        <button onClick={shortRun} disabled={s.fastRemaining > 0 || s.dragOffset !== null}>
          Chạy thử 10 giây
        </button>
      )}
      {s.stage >= 7 && (
        <button onClick={fast} disabled={s.fastRemaining > 0 || s.dragOffset !== null}>
          Chạy nhanh 30 giây
        </button>
      )}
      {s.fastRemaining > 0 && <button onClick={stop}>Dừng job</button>}
      <button onClick={toggleDebug} aria-pressed={s.debug}>
        {s.debug ? "Ẩn debug" : "Hiện debug"}
      </button>
      <button onClick={reset}>Đặt lại</button>
      <button onClick={defaults}>Khôi phục mặc định</button>
    </div>
  );
}
