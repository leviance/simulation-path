"use client";

import type { Vec3 } from "@/lib/labs/normal";
import type { PointLens } from "@/lib/labs/projection-point";
import type { PointScene } from "@/lib/labs/projection-scene";

interface ProjectionControlsProps {
  scene: PointScene;
  stage: number;
  reducedMotion: boolean;
  reset: (index?: number) => void;
  togglePause: () => void;
  step: () => void;
  toggleDebug: () => void;
  editPoint: (axis: keyof Vec3, value: number) => void;
  editCamera: (axis: keyof Vec3, value: number) => void;
  editLens: (key: keyof PointLens, value: number) => void;
  editAspect: (value: number) => void;
}

export function ProjectionControls({
  scene,
  stage,
  reducedMotion,
  reset,
  togglePause,
  step,
  toggleDebug,
  editPoint,
  editCamera,
  editLens,
  editAspect,
}: ProjectionControlsProps) {
  return (
    <div className="lab-controls">
      <label>
        Preset
        <select aria-label="Điểm mẫu" value="" onChange={(e) => reset(Number(e.target.value))}>
          <option value="" disabled>
            Chọn thí nghiệm
          </option>
          {["Mặc định", "Xa gấp đôi", "Trước near", "Sau camera", "Vượt far", "Ngoài khung"].map(
            (name, i) => (
              <option key={i} value={i}>
                {name}
              </option>
            ),
          )}
        </select>
      </label>
      {(["x", "y", "z"] as const).map((axis) => (
        <label key={axis}>
          Point.{axis.toUpperCase()}
          <input
            type="range"
            aria-label={`Point.${axis.toUpperCase()}`}
            min={axis === "z" ? -2 : -6}
            max={axis === "z" ? 20 : 6}
            step=".05"
            value={scene.point[axis]}
            onChange={(e) => editPoint(axis, Number(e.target.value))}
          />
          <output>{scene.point[axis].toFixed(3)}</output>
        </label>
      ))}
      {stage >= 2 &&
        (["x", "y", "z"] as const).map((axis) => (
          <label key={axis}>
            Camera.{axis.toUpperCase()}
            <input
              type="range"
              aria-label={`Camera.${axis.toUpperCase()}`}
              min="-2"
              max="2"
              step=".1"
              value={scene.camera.position[axis]}
              onChange={(e) => editCamera(axis, Number(e.target.value))}
            />
            <output>{scene.camera.position[axis].toFixed(2)}</output>
          </label>
        ))}
      {stage >= 4 && (
        <>
          <label>
            Vertical FOV
            <input
              type="range"
              aria-label="Vertical FOV"
              min="25"
              max="110"
              step="1"
              value={(scene.lens.verticalFovRadians * 180) / Math.PI}
              onChange={(e) =>
                editLens("verticalFovRadians", (Number(e.target.value) * Math.PI) / 180)
              }
            />
            <output>{((scene.lens.verticalFovRadians * 180) / Math.PI).toFixed(0)}°</output>
          </label>
          <label>
            Aspect
            <select
              aria-label="Aspect"
              value={scene.aspect}
              onChange={(event) => editAspect(Number(event.target.value))}
            >
              <option value="0">16:9</option>
              <option value="1">4:3</option>
              <option value="2">1:1</option>
            </select>
          </label>
        </>
      )}
      {stage >= 5 &&
        (["nearPlane", "farPlane"] as const).map((key) => (
          <label key={key}>
            {key === "nearPlane" ? "Near plane" : "Far plane"}
            <input
              type="range"
              aria-label={key === "nearPlane" ? "Near plane" : "Far plane"}
              min={key === "nearPlane" ? 0.1 : 8}
              max={key === "nearPlane" ? 2 : 24}
              step=".1"
              value={scene.lens[key]}
              onChange={(e) => editLens(key, Number(e.target.value))}
            />
            <output>{scene.lens[key].toFixed(2)}</output>
          </label>
        ))}
      {stage >= 6 && (
        <>
          <button onClick={togglePause} disabled={reducedMotion}>
            {scene.paused ? "Cho điểm bay" : "Tạm dừng"}
          </button>
          <button disabled={!scene.paused} onClick={step}>
            Tiến 0.1 s
          </button>
        </>
      )}
      {stage >= 8 && (
        <button aria-pressed={scene.debug} onClick={toggleDebug}>
          {scene.debug ? "Ẩn debug" : "Hiện debug"}
        </button>
      )}
      <button onClick={() => reset()}>Đặt lại</button>
    </div>
  );
}
