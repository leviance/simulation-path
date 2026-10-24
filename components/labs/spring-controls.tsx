"use client";
import { SPRING_STEPS, type SpringScene, type SpringSetting } from "@/lib/labs/spring-scene";
interface Props {
  scene: SpringScene;
  reducedMotion: boolean;
  edit: (key: SpringSetting, value: number) => void;
  reset: () => void;
  preset: (value: number) => void;
  togglePause: () => void;
  step: () => void;
  fast: () => void;
  stop: () => void;
  toggleDebug: () => void;
}
export function SpringControls({
  scene: s,
  reducedMotion,
  edit,
  reset,
  preset,
  togglePause,
  step,
  fast,
  stop,
  toggleDebug,
}: Props) {
  return (
    <div className="lab-controls">
      <label>
        Preset
        <select
          aria-label="Preset chuỗi lò xo"
          value=""
          onChange={(e) => (e.target.value === "reset" ? reset() : preset(Number(e.target.value)))}
        >
          <option value="" disabled>
            Chọn thí nghiệm
          </option>
          <option value="reset">Chuỗi treo mặc định</option>
          {s.stage >= 7 && (
            <>
              <option value="1">Không damping — đo drift</option>
              <option value="2">Có damping — tắt dần</option>
              <option value="3">Cố ý mất ổn định</option>
            </>
          )}
        </select>
      </label>
      {s.stage === 2 && (
        <>
          <label>
            Khoảng cách (m)
            <input
              aria-label="Khoảng cách hai đầu"
              type="range"
              min=".1"
              max="1.8"
              step=".01"
              value={s.pairDistance}
              onChange={(e) => edit("pairDistance", Number(e.target.value))}
            />
            <output>{s.pairDistance.toFixed(2)}</output>
          </label>
          <label>
            Góc (rad)
            <input
              aria-label="Góc của lò xo"
              type="range"
              min={-Math.PI}
              max={Math.PI}
              step=".01"
              value={s.pairAngle}
              onChange={(e) => edit("pairAngle", Number(e.target.value))}
            />
            <output>{s.pairAngle.toFixed(2)}</output>
          </label>
        </>
      )}
      {s.stage >= 3 && (
        <label>
          <input
            aria-label="Gravity"
            type="checkbox"
            checked={s.gravityEnabled}
            onChange={(e) => edit("gravityEnabled", Number(e.target.checked))}
          />
          Gravity
        </label>
      )}
      {s.stage >= 5 && (
        <>
          <label>
            <input
              aria-label="Axial damping"
              type="checkbox"
              checked={s.dampingEnabled}
              onChange={(e) => edit("dampingEnabled", Number(e.target.checked))}
            />
            Damping dọc trục
          </label>
          <label>
            c (kg/s)
            <input
              aria-label="Hệ số damping"
              type="range"
              min="0"
              max="1.6"
              step=".02"
              value={s.damping}
              onChange={(e) => edit("damping", Number(e.target.value))}
            />
            <output>{s.damping.toFixed(2)}</output>
          </label>
        </>
      )}
      {s.stage >= 6 && (
        <label>
          Khối được chọn
          <select
            aria-label="Khối được chọn"
            value={s.selected}
            onChange={(e) => edit("selected", Number(e.target.value))}
          >
            {s.chain.particles.slice(1).map((_, i) => (
              <option key={i + 1} value={i + 1}>
                node {i + 1}
              </option>
            ))}
          </select>
        </label>
      )}
      {s.stage >= 7 && (
        <>
          <label>
            Số mass
            <select
              aria-label="Số mass"
              value={s.count}
              onChange={(e) => edit("count", Number(e.target.value))}
            >
              {[20, 32, 64, 100].map((n) => (
                <option key={n}>{n}</option>
              ))}
            </select>
          </label>
          <label>
            k (N/m)
            <input
              aria-label="Độ cứng lò xo"
              type="range"
              min="60"
              max="1200"
              step="20"
              value={s.stiffness}
              onChange={(e) => edit("stiffness", Number(e.target.value))}
            />
            <output>{s.stiffness}</output>
          </label>
          <label>
            m (kg)
            <select
              aria-label="Khối lượng mỗi mass"
              value={s.mass}
              onChange={(e) => edit("mass", Number(e.target.value))}
            >
              {[0.02, 0.04, 0.08, 0.16].map((m) => (
                <option key={m}>{m}</option>
              ))}
            </select>
          </label>
          <label>
            Fixed dt
            <select
              aria-label="Fixed dt"
              value={s.dtIndex}
              onChange={(e) => edit("dtIndex", Number(e.target.value))}
            >
              {SPRING_STEPS.map((dt, i) => (
                <option key={dt} value={i}>
                  {["1/960 s", "1/480 s", "1/240 s", "1/120 s", "1/30 s"][i]}
                </option>
              ))}
            </select>
          </label>
        </>
      )}
      {s.stage >= 4 && (
        <>
          <button onClick={togglePause} disabled={reducedMotion || s.fastRemaining > 0}>
            {s.paused ? "Tiếp tục" : "Tạm dừng"}
          </button>
          <button onClick={step}>Tiến một bước</button>
        </>
      )}
      {s.stage >= 8 && (
        <button onClick={fast} disabled={s.fastRemaining > 0 || !!s.drag?.active}>
          Chạy nhanh 20 giây
        </button>
      )}
      {s.fastRemaining > 0 && <button onClick={stop}>Dừng job</button>}
      <button onClick={toggleDebug} aria-pressed={s.debug}>
        {s.debug ? "Ẩn debug" : "Hiện debug"}
      </button>
      <button onClick={reset}>Đặt lại</button>
    </div>
  );
}
