import type { GalaxyScene } from "@/lib/labs/galaxy/scene";
import type { GalaxyJob } from "@/lib/labs/galaxy/jobs";
export type GalaxyAction =
  | "validate"
  | "preset"
  | "reset"
  | "run"
  | "step"
  | "cancel"
  | "theta"
  | "epsilon"
  | "dt"
  | "direct"
  | "selected"
  | "debug"
  | "camera"
  | "zoomIn"
  | "zoomOut"
  | "sweep"
  | "energy"
  | "runtime"
  | "dtStudy";
export interface GalaxyControlsProps {
  loading?: boolean;
  scene: GalaxyScene;
  job: GalaxyJob | null;
  reduced: boolean;
  tool: "orbit" | "pan";
  setTool: (tool: "orbit" | "pan") => void;
  act: (action: GalaxyAction, value?: number) => void;
}

export default function GalaxyControls({
  scene,
  job,
  loading,
  reduced,
  tool,
  setTool,
  act,
}: GalaxyControlsProps) {
  return (
    <div className="lab-controls">
      <label>
        Thí nghiệm
        <select
          aria-label="Preset thiên hà"
          value={scene.preset}
          onChange={(event) => act("preset", Number(event.target.value))}
        >
          <option value={0}>Thiên hà xoắn · {scene.stage >= 6 ? "4.096" : "256"} vật thể</option>
          <option value={1}>Hai thiên hà gặp nhau</option>
          <option value={2}>Hai vật quay tròn</option>
          <option value={3}>Reference · 256 vật thể</option>
          <option value={4}>Reference · 3 vật thể</option>
        </select>
      </label>
      <label>
        Kéo chuột
        <select
          aria-label="Thao tác camera"
          value={tool}
          onChange={(event) => setTool(event.target.value as "orbit" | "pan")}
        >
          <option value="orbit">Xoay góc nhìn</option>
          <option value="pan">Dịch góc nhìn</option>
        </select>
      </label>
      <button onClick={() => act("camera")}>Đặt lại camera</button>
      <button onClick={() => act("zoomIn")}>Tiến vào thiên hà</button>
      <button onClick={() => act("zoomOut")}>Lùi ra xa</button>
      {scene.stage >= 2 && (
        <label>
          Body theo dõi
          <input
            type="number"
            aria-label="Body theo dõi"
            min={0}
            max={scene.bodies.length - 1}
            value={scene.selected}
            onChange={(event) => act("selected", Number(event.target.value))}
          />
        </label>
      )}
      {scene.stage >= 4 && (
        <>
          <label>
            Fixed dt
            <select
              aria-label="Fixed dt"
              value={scene.dt}
              onChange={(event) => act("dt", Number(event.target.value))}
            >
              {[1 / 60, 1 / 120, 1 / 240].map((dt, i) => (
                <option key={dt} value={dt}>
                  {["1/60", "1/120", "1/240"][i]} time unit
                </option>
              ))}
            </select>
          </label>
          <button disabled={reduced && !job?.active} onClick={() => act("run")}>
            {job?.active
              ? job.paused
                ? "Tiếp tục phép đo"
                : "Tạm dừng phép đo"
              : scene.paused
                ? "Chạy mô phỏng"
                : "Tạm dừng"}
          </button>
          <button onClick={() => act("step")}>Tiến một bước</button>
        </>
      )}
      {scene.stage >= 2 && (
        <label>
          Softening
          <input
            type="range"
            aria-label="Softening"
            min={0.005}
            max={0.08}
            step={0.005}
            value={scene.epsilon}
            onChange={(event) => act("epsilon", Number(event.target.value))}
          />
          <output>{scene.epsilon.toFixed(3)}</output>
        </label>
      )}
      {scene.stage >= 6 && (
        <>
          <label>
            Theta
            <input
              type="range"
              aria-label="Theta"
              min={0.05}
              max={1.2}
              step={0.05}
              value={scene.theta}
              onChange={(event) => act("theta", Number(event.target.value))}
            />
            <output>{scene.theta.toFixed(2)}</output>
          </label>
          <label>
            Solver
            <select
              aria-label="Gravity solver"
              value={scene.direct ? "direct" : "tree"}
              onChange={(event) => act("direct", event.target.value === "direct" ? 1 : 0)}
            >
              <option value="tree">Barnes–Hut</option>
              <option value="direct" disabled={scene.bodies.length > 256}>
                Direct (N≤256)
              </option>
            </select>
          </label>
        </>
      )}
      {scene.stage >= 5 && (
        <button aria-pressed={scene.debug} onClick={() => act("debug")}>
          {scene.debug ? "Ẩn node debug" : "Hiện node debug"}
        </button>
      )}
      {scene.stage >= 8 && <button onClick={() => act("sweep")}>Đo sai số theo theta</button>}
      {scene.stage >= 7 && <button onClick={() => act("validate")}>Kiểm cây và self-force</button>}
      {scene.stage >= 9 && <button onClick={() => act("runtime")}>Chạy scaling study</button>}
      {scene.stage >= 10 && (
        <>
          <button onClick={() => act("energy")}>Đo năng lượng toàn hệ</button>
          <button onClick={() => act("dtStudy")}>Thử giảm dt</button>
        </>
      )}
      {(loading || job?.active || scene.physics) && (
        <button onClick={() => act("cancel")}>Hủy tác vụ</button>
      )}
      <button onClick={() => act("reset")}>Đặt lại preset</button>
    </div>
  );
}
