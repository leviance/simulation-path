"use client";
import { TANK_STEPS, type TankScene, type TankSetting } from "@/lib/labs/collision-scene";
interface Props {
  scene: TankScene;
  reducedMotion: boolean;
  edit: (key: TankSetting, value: number) => void;
  reset: () => void;
  step: () => void;
  togglePause: () => void;
  fast: () => void;
  spawn: () => void;
  stop: () => void;
  toggleDebug: () => void;
  orbit: (yaw: number, pitch: number, distance?: number) => void;
}
export function CollisionControls({
  scene: s,
  reducedMotion,
  edit,
  reset,
  step,
  togglePause,
  fast,
  spawn,
  stop,
  toggleDebug,
  orbit,
}: Props) {
  return (
    <div className="lab-controls">
      <label>
        Preset
        <select
          aria-label="Preset bể bóng"
          value=""
          onChange={(e) => {
            if (e.target.value === "reset") reset();
            else edit("elastic", e.target.value === "elastic" ? 1 : 0);
          }}
        >
          <option value="" disabled>
            Chọn thí nghiệm
          </option>
          <option value="reset">Cảnh mặc định</option>
          {s.stage >= 8 && <option value="elastic">Đàn hồi: mọi vật liệu e=1</option>}
          {s.stage >= 8 && <option value="mixed">Vật liệu khác nhau</option>}
        </select>
      </label>
      {s.stage >= 10 && (
        <label>
          Không gian
          <select
            aria-label="Không gian mô phỏng"
            value={s.spatial ? 3 : 2}
            onChange={(e) => edit("dimension", Number(e.target.value))}
          >
            <option value="2">2D — circle</option>
            <option value="3">3D — sphere</option>
          </select>
        </label>
      )}
      {s.stage >= 7 && (
        <label>
          Số bóng (khi reset)
          <select
            aria-label="Số bóng"
            value={s.count}
            onChange={(e) => edit("count", Number(e.target.value))}
          >
            <option value="64">64 — đối chiếu chi phí</option>
            <option value="256">256 — cảnh chính</option>
          </select>
        </label>
      )}
      {s.stage >= 2 && (
        <label>
          Fixed dt
          <select
            aria-label="Fixed dt"
            value={s.dtIndex}
            onChange={(e) => edit("dtIndex", Number(e.target.value))}
          >
            {TANK_STEPS.map((v, i) => (
              <option key={v} value={i}>
                {["1/60 s", "1/120 s", "1/240 s"][i]}
              </option>
            ))}
          </select>
        </label>
      )}
      {s.stage >= 3 && (
        <label>
          Nhân restitution
          <input
            aria-label="Nhân restitution"
            type="range"
            min="0"
            max="1"
            step=".05"
            value={s.restitution}
            onChange={(e) => edit("restitution", Number(e.target.value))}
          />
          <output>{s.restitution.toFixed(2)}</output>
        </label>
      )}
      {s.stage >= 7 && (
        <label>
          Solver iterations
          <select
            aria-label="Solver iterations"
            value={s.iterations}
            onChange={(e) => edit("iterations", Number(e.target.value))}
          >
            {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
              <option key={n}>{n}</option>
            ))}
          </select>
        </label>
      )}
      {s.stage >= 6 && (
        <label>
          <input
            aria-label="Positional correction"
            type="checkbox"
            checked={s.correction}
            onChange={(e) => edit("correction", Number(e.target.checked))}
          />
          Sửa chồng lấn
        </label>
      )}
      {s.spatial && (
        <>
          <label>
            Yaw
            <input
              aria-label="Góc camera yaw"
              type="range"
              min={-Math.PI}
              max={Math.PI}
              step=".01"
              value={s.camera.yaw}
              onChange={(e) => orbit(Number(e.target.value), s.camera.pitch)}
            />
          </label>
          <label>
            Pitch
            <input
              aria-label="Góc camera pitch"
              type="range"
              min="-1.2"
              max="1.2"
              step=".01"
              value={s.camera.pitch}
              onChange={(e) => orbit(s.camera.yaw, Number(e.target.value))}
            />
          </label>
          <label>
            Khoảng cách camera
            <input
              aria-label="Khoảng cách camera"
              type="range"
              min="22"
              max="38"
              step=".5"
              value={s.camera.distance}
              onChange={(e) => orbit(s.camera.yaw, s.camera.pitch, Number(e.target.value))}
            />
          </label>
        </>
      )}
      <button onClick={togglePause} disabled={s.stage < 2 || reducedMotion || s.fastRemaining > 0}>
        {s.paused ? "Tiếp tục" : "Tạm dừng"}
      </button>
      <button onClick={step} disabled={s.stage < 2}>
        Tiến một bước
      </button>
      {s.stage >= 8 && (
        <button onClick={fast} disabled={s.fastRemaining > 0}>
          Chạy nhanh 2 giây
        </button>
      )}
      {s.fastRemaining > 0 && <button onClick={stop}>Dừng job</button>}
      {s.stage >= 11 && <button onClick={spawn}>Thêm tối đa 16 bóng</button>}
      <button onClick={toggleDebug} aria-pressed={s.debug}>
        {s.debug ? "Ẩn debug" : "Hiện debug"}
      </button>
      <button onClick={reset}>Đặt lại</button>
    </div>
  );
}
