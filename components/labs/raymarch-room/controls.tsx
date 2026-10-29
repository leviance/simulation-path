import type { Dispatch } from "react";
import {
  presetsForStage,
  type RoomSession,
  type RoomAction,
  type Preset,
} from "@/lib/labs/raymarch-room/session";
function Range({
  label,
  value,
  min,
  max,
  step = 0.01,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (n: number) => void;
}) {
  return (
    <label>
      {label}: {Number(value.toPrecision(5))}
      <input
        type="range"
        aria-label={label}
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </label>
  );
}
export function RoomControls({
  state: s,
  dispatch: d,
  reducedMotion,
}: {
  state: RoomSession;
  dispatch: Dispatch<RoomAction>;
  reducedMotion: boolean;
}) {
  const moving = s.stage === 4 || s.stage >= 8;
  return (
    <div className="lab-controls">
      <label>
        Preset
        <select
          aria-label="Preset"
          value={s.preset}
          onChange={(e) => d({ type: "preset", preset: e.target.value as Preset })}
        >
          {presetsForStage(s.stage).map((p) => (
            <option key={p.value} value={p.value}>
              {p.label}
            </option>
          ))}
        </select>
      </label>
      {s.stage === 3 && (
        <>
          <Range
            label="Sample X"
            value={s.samplePoint.x}
            min={-3.5}
            max={1.5}
            onChange={(x) => d({ type: "sample", point: { ...s.samplePoint, x } })}
          />
          <Range
            label="Sample Y"
            value={s.samplePoint.y}
            min={-1.7}
            max={1.3}
            onChange={(y) => d({ type: "sample", point: { ...s.samplePoint, y } })}
          />
        </>
      )}
      {(s.stage === 4 || s.stage === 10) && (
        <Range
          label="Độ lệch tia (m)"
          value={s.rayOffset}
          min={-1.2}
          max={1.2}
          step={0.005}
          onChange={(offset) => d({ type: "ray", offset })}
        />
      )}
      {s.stage >= 3 && (
        <Range
          label="Sphere radius (m)"
          value={s.scene.sphereRadius}
          min={0.4}
          max={1.1}
          onChange={(sphereRadius) => d({ type: "scene", patch: { sphereRadius } })}
        />
      )}
      {s.stage >= 4 && (
        <>
          <Range
            label="Maximum steps"
            value={s.settings.maximumSteps}
            min={1}
            max={256}
            step={1}
            onChange={(maximumSteps) => d({ type: "settings", patch: { maximumSteps } })}
          />
          <Range
            label="Hit epsilon (m)"
            value={s.settings.hitEpsilon}
            min={0.00001}
            max={0.02}
            step={0.00001}
            onChange={(hitEpsilon) => d({ type: "settings", patch: { hitEpsilon } })}
          />
          <Range
            label="Maximum distance (m)"
            value={s.settings.maximumDistance}
            min={0.1}
            max={80}
            step={0.1}
            onChange={(maximumDistance) => d({ type: "settings", patch: { maximumDistance } })}
          />
        </>
      )}
      {s.stage >= 5 && (
        <Range
          label="Normal epsilon (m)"
          value={s.settings.normalEpsilon}
          min={0.00001}
          max={0.02}
          step={0.00001}
          onChange={(normalEpsilon) => d({ type: "settings", patch: { normalEpsilon } })}
        />
      )}
      {(s.stage === 2 || s.stage >= 9) && (
        <>
          <Range
            label="Vertical FOV (rad)"
            value={s.camera.verticalFieldOfViewRadians}
            min={0.45}
            max={1.65}
            onChange={(value) => d({ type: "fov", value })}
          />
          <button type="button" onClick={() => d({ type: "look", dx: -20, dy: 0 })}>
            Nhìn trái
          </button>
          <button type="button" onClick={() => d({ type: "look", dx: 20, dy: 0 })}>
            Nhìn phải
          </button>
        </>
      )}
      {s.stage >= 9 && (
        <>
          <button type="button" onClick={() => d({ type: "move", local: { x: 0, y: 0, z: 0.3 } })}>
            Tiến camera
          </button>
          <button type="button" onClick={() => d({ type: "move", local: { x: 0, y: 0, z: -0.3 } })}>
            Lùi camera
          </button>
        </>
      )}
      {s.stage >= 6 && (
        <>
          <Range
            label="Torus minor radius (m)"
            value={s.scene.torusMinorRadius}
            min={0.12}
            max={0.32}
            onChange={(torusMinorRadius) => d({ type: "scene", patch: { torusMinorRadius } })}
          />
          {(
            [
              "includeSphere",
              "includeBox",
              "includeTorus",
              ...(s.stage >= 7 ? ["includeRoom"] : []),
            ] as const
          ).map((key) => (
            <label key={key}>
              <input
                type="checkbox"
                checked={Boolean(s.scene[key as keyof typeof s.scene])}
                onChange={(e) => d({ type: "scene", patch: { [key]: e.target.checked } })}
              />
              {
                (
                  {
                    includeSphere: "Sphere SDF",
                    includeBox: "Box SDF",
                    includeTorus: "Torus SDF",
                    includeRoom: "Room slabs",
                  } as Record<string, string>
                )[key]
              }
            </label>
          ))}
        </>
      )}
      {s.stage >= 10 && (
        <label>
          Debug view
          <select
            aria-label="Debug view"
            value={s.debugView}
            onChange={(e) => d({ type: "view", value: Number(e.target.value) })}
          >
            <option value={0}>Beauty</option>
            <option value={1}>Steps</option>
            <option value={2}>Hit</option>
            <option value={3}>Normal</option>
          </select>
        </label>
      )}
      <button
        type="button"
        disabled={!moving || (reducedMotion && s.paused)}
        onClick={() => d({ type: s.paused ? "play" : "pause" })}
      >
        {!moving ? "Không có chuyển động tự động" : s.paused ? "Chạy" : "Tạm dừng"}
      </button>
      {moving && (
        <button type="button" onClick={() => d({ type: "step" })}>
          {s.stage === 4 ? "Một mẫu" : "Đèn +0,1 giây"}
        </button>
      )}
      <button type="button" onClick={() => d({ type: "reset" })}>
        Đặt lại preset
      </button>
    </div>
  );
}
