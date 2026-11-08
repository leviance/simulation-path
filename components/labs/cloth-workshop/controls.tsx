"use client";
import type { ClothController, ClothView, Tool } from "@/lib/labs/cloth-workshop/controller";
import type { Preset, Settings } from "@/lib/labs/cloth-workshop/math";
export default function Controls({
  controller,
  state,
  reducedMotion,
  release,
}: {
  controller: ClothController;
  state: ClothView;
  reducedMotion: boolean;
  release: () => void;
}) {
  const numeric: { key: keyof Settings; title: string; min: number; max: number; step: number }[] =
    [
      { key: "compliance", title: "Stretch compliance (m/N)", min: 0, max: 0.002, step: 0.000002 },
      { key: "damping", title: "Damping (s⁻¹)", min: 0, max: 8, step: 0.1 },
      { key: "gravity", title: "Gravity (m/s²)", min: 0, max: 15, step: 0.1 },
      { key: "wind", title: "Gió — gia tốc Z (m/s²)", min: -8, max: 8, step: 0.2 },
      { key: "thickness", title: "Thickness mỗi đỉnh (m)", min: 0.005, max: 0.045, step: 0.005 },
      { key: "iterations", title: "Iterations mỗi substep", min: 2, max: 12, step: 1 },
    ];
  return (
    <fieldset
      disabled={!state.ready}
      aria-label="Điều khiển xưởng vải 3D"
      style={{ border: 0, padding: 0, margin: "1rem 0" }}
    >
      <div className="lab-controls">
        <button
          type="button"
          onClick={() => controller.toggle()}
          disabled={(state.paused && reducedMotion) || state.validation.status === "running"}
        >
          {state.paused ? "Chạy vải" : "Tạm dừng"}
        </button>
        <button
          type="button"
          onClick={() => controller.step()}
          disabled={state.validation.status === "running"}
        >
          Một bước
        </button>
        <button
          type="button"
          onClick={() => {
            release();
            controller.reset();
          }}
        >
          Reset
        </button>
        <button type="button" onClick={() => controller.resetCamera()}>
          Góc nhìn ban đầu
        </button>
        <label>
          Preset vải
          <select
            aria-label="Preset vải"
            value={state.preset}
            onChange={(e) => {
              release();
              controller.reset(e.target.value as Preset);
            }}
          >
            <option value="hanging">Treo hai góc</option>
            <option value="drape">Phủ quả cầu</option>
            <option value="drop">Rơi lên bàn và capsule</option>
          </select>
        </label>
        <label>
          Lưới CPU mẫu
          <select
            aria-label="Lưới CPU mẫu"
            value={state.mesh.side}
            onChange={(e) => {
              release();
              controller.reset(state.preset, Number(e.target.value));
            }}
          >
            <option value="17">17 × 17 — 289 đỉnh</option>
            <option value="25">25 × 25 — 625 đỉnh</option>
          </select>
        </label>
      </div>
      <div className="lab-controls" role="group" aria-label="Công cụ tương tác vải">
        {(
          [
            ["camera", "Camera"],
            ["drag", "Kéo vùng vải"],
            ["pin", "Ghim bằng click"],
          ] as [Tool, string][]
        ).map(([tool, label]) => (
          <button
            type="button"
            key={tool}
            aria-pressed={state.tool === tool}
            onClick={() => {
              release();
              controller.setTool(tool);
            }}
          >
            {label}
          </button>
        ))}
        <label>
          Đỉnh đang chọn
          <input
            type="number"
            aria-label="Đỉnh đang chọn"
            min="0"
            max={state.mesh.vertices.length - 1}
            value={state.selected}
            onChange={(e) => controller.select(Number(e.target.value))}
            style={{ width: "6rem" }}
          />
        </label>
        <button
          type="button"
          onClick={() => controller.togglePin()}
          aria-pressed={state.mesh.vertices[state.selected].w === 0}
        >
          Ghim/bỏ ghim ID
        </button>
        <button
          type="button"
          disabled={state.mesh.vertices[state.selected].w === 0}
          onClick={() => controller.nudgeSelected(0, 0.1, 0)}
        >
          Đích kéo ID +Y 0,1 m và bước
        </button>
        <button
          type="button"
          disabled={state.mesh.vertices[state.selected].w === 0}
          onClick={() => controller.nudgeSelected(0, 0, 0.1)}
        >
          Đích kéo ID +Z 0,1 m và bước
        </button>
      </div>
      <details open={!["surface", "showcase"].includes(state.mode)}>
        <summary>Vật liệu, lực và lớp kiểm tra</summary>
        <div className="lab-controls">
          {numeric.map(({ key, title, min, max, step }) => (
            <label key={key}>
              {title}
              <input
                type="number"
                aria-label={title}
                value={Number(state.settings[key])}
                min={min}
                max={max}
                step={step}
                onChange={(e) => controller.setSetting(key, Number(e.target.value))}
                style={{ width: "7rem" }}
              />
            </label>
          ))}
          <label>
            Đích vật cản X (m)
            <input
              type="range"
              aria-label="Đích vật cản X (m)"
              min="-1.2"
              max="1.2"
              step="0.1"
              value={controller.obstacleTarget}
              onChange={(e) => controller.setSetting("obstacleX", Number(e.target.value))}
            />
          </label>
          <label>
            <input
              type="checkbox"
              checked={state.settings.selfContact}
              onChange={(e) => controller.setSetting("selfContact", e.target.checked)}
            />
            Self-contact theo đỉnh
          </label>
        </div>
        <div className="lab-controls">
          {(
            [
              ["wireframe", "Wireframe"],
              ["strain", "Strain"],
              ["debug", "Cell/contact debug — subset"],
              ["normals", "Normals — subset"],
            ] as const
          ).map(([key, label]) => (
            <label key={key}>
              <input
                type="checkbox"
                checked={state[key]}
                onChange={(e) => controller.setOverlay(key, e.target.checked)}
              />
              {label}
            </label>
          ))}
        </div>
      </details>
      <div className="lab-controls">
        <button
          type="button"
          onClick={() => {
            release();
            controller.startValidation(performance.now());
          }}
          disabled={state.validation.status === "running"}
        >
          Kiểm CPU 12 fixture
        </button>
        <button
          type="button"
          onClick={() => controller.cancelValidation()}
          disabled={state.validation.status !== "running"}
        >
          Hủy kiểm CPU
        </button>
      </div>
    </fieldset>
  );
}
