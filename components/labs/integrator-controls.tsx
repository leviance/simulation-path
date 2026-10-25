"use client";
import {
  INTEGRATOR_KINDS,
  INTEGRATOR_NAMES,
  type IntegratorKind,
} from "@/lib/labs/integrator-race";
import {
  INTEGRATOR_STEP_SIZES,
  type IntegratorScene,
  type IntegratorSetting,
  type IntegratorGraph,
} from "@/lib/labs/integrator-scene";

interface Props {
  scene: IntegratorScene;
  reducedMotion: boolean;
  edit: (key: IntegratorSetting, value: number) => void;
  editLane: (index: number, kind: IntegratorKind) => void;
  preset: (index: number) => void;
  setGraph: (value: IntegratorGraph) => void;
  togglePause: () => void;
  toggleDebug: () => void;
  step: () => void;
  fast: () => void;
  benchmark: () => void;
  stop: () => void;
}
export default function IntegratorControls({
  scene,
  reducedMotion,
  edit,
  editLane,
  preset,
  setGraph,
  togglePause,
  toggleDebug,
  step,
  fast,
  benchmark,
  stop,
}: Props) {
  const fields: [IntegratorSetting, string, number, number, number, number][] = [
    ["position", "Vị trí đầu x₀ (m)", -3.2, 3.2, 0.1, scene.initial.position],
    ["velocity", "Vận tốc đầu v₀ (m/s)", -8, 8, 0.25, scene.initial.velocity],
    ["mass", "Khối lượng m (kg)", 0.5, 4, 0.5, scene.parameters.mass],
    ["stiffness", "Độ cứng k (N/m)", 0, 64, 1, scene.parameters.stiffness],
  ];
  const busy = scene.fastRemaining > 0 || !!scene.benchmark?.running;
  return (
    <div className="lab-controls">
      <label>
        Preset
        <select
          aria-label="Preset oscillator"
          value=""
          onChange={(e) => preset(Number(e.target.value))}
        >
          <option value="" disabled>
            Chọn thí nghiệm
          </option>
          <option value="0">Mặc định</option>
          <option value="1">Nhìn rõ một bước</option>
          <option value="2">Stress: k=16, dt=0.25</option>
        </select>
      </label>
      {fields.map(([key, label, min, max, stepSize, value]) => (
        <label key={key}>
          {label}
          <input
            aria-label={label}
            type="range"
            min={min}
            max={max}
            step={stepSize}
            value={value}
            onChange={(event) => edit(key, Number(event.target.value))}
          />
          <output>{value.toFixed(2)}</output>
        </label>
      ))}
      {scene.stage >= 2 && (
        <label>
          Fixed dt
          <select
            aria-label="Fixed dt"
            value={scene.dtIndex}
            onChange={(e) => edit("dtIndex", Number(e.target.value))}
          >
            {INTEGRATOR_STEP_SIZES.map((dt, index) => (
              <option value={index} key={dt}>
                {["0.25 s", "0.1 s", "1/15 s", "1/30 s", "1/60 s", "1/120 s", "1/240 s"][index]}
              </option>
            ))}
          </select>
        </label>
      )}
      {scene.stage >= 5 &&
        scene.kinds.map((kind, index) => (
          <label key={index}>
            Làn {index + 1}
            <select
              aria-label={`Integrator làn ${index + 1}`}
              value={kind}
              onChange={(e) => editLane(index, e.target.value as IntegratorKind)}
            >
              {INTEGRATOR_KINDS.map((value) => (
                <option value={value} key={value}>
                  {INTEGRATOR_NAMES[value]}
                </option>
              ))}
            </select>
          </label>
        ))}
      {scene.stage >= 6 && (
        <label>
          Đồ thị
          <select
            aria-label="Graph"
            value={scene.graph}
            onChange={(e) => setGraph(e.target.value as IntegratorGraph)}
          >
            <option value="position">Vị trí</option>
            <option value="error">Sai số trạng thái</option>
            <option value="energy">Độ lệch năng lượng</option>
          </select>
        </label>
      )}
      <button onClick={togglePause} disabled={reducedMotion || !!scene.warning || busy}>
        {scene.paused ? "Tiếp tục" : "Tạm dừng"}
      </button>
      <button onClick={step} disabled={!!scene.warning}>
        Tiến một bước
      </button>
      {scene.stage >= 6 && (
        <button onClick={fast} disabled={!!scene.warning || busy}>
          Chạy nhanh 20 giây
        </button>
      )}
      {scene.stage >= 8 && (
        <button onClick={benchmark} disabled={busy}>
          Đo runtime
        </button>
      )}
      {busy && <button onClick={stop}>Dừng job</button>}
      {scene.stage >= 8 && (
        <button onClick={toggleDebug} aria-pressed={scene.debug}>
          {scene.debug ? "Ẩn debug" : "Hiện debug"}
        </button>
      )}
      <button onClick={() => preset(0)}>Đặt lại</button>
    </div>
  );
}
