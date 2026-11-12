import type { Dispatch, SetStateAction } from "react";
import type { Settings } from "@/lib/labs/mandelbulb-explorer/math";
import type { ViewMode } from "@/lib/labs/mandelbulb-explorer/view";
interface Props {
  id: string;
  settings: Settings;
  setSettings: Dispatch<SetStateAction<Settings>>;
  apply: () => void;
  reset: () => void;
  preset: (index: number) => void;
  paused: boolean;
  pause: () => void;
  cancel: () => void;
  restart: () => void;
  step: () => void;
  view: ViewMode;
  setView: (view: ViewMode) => void;
  zoom: (wheel: number) => void;
  cameraReset: () => void;
}
export function BulbControls(p: Props) {
  const numbers: { key: keyof Settings; label: string; min: number; max: number; step: number }[] =
    [
      { key: "power", label: "Power", min: 2, max: 12, step: 1 },
      { key: "iterations", label: "Fractal iterations (Canvas)", min: 4, max: 12, step: 1 },
      { key: "bailout", label: "Bailout", min: 2, max: 16, step: 1 },
      { key: "raySteps", label: "Max ray steps (Canvas)", min: 32, max: 96, step: 8 },
      { key: "epsilon", label: "Hit epsilon", min: 0.0015, max: 0.01, step: 0.0005 },
      { key: "normalStep", label: "Normal difference step", min: 0.003, max: 0.02, step: 0.001 },
      { key: "safety", label: "Safety", min: 0.2, max: 1, step: 0.05 },
      { key: "sliceY", label: "Mặt cắt Y", min: -2, max: 2, step: 0.05 },
    ];
  return (
    <>
      <div className="lab-controls" aria-label="Tham số chờ áp dụng">
        {numbers.map((item) => (
          <label key={item.key} htmlFor={p.id + item.key}>
            {item.label}
            <input
              id={p.id + item.key}
              type="number"
              min={item.min}
              max={item.max}
              step={item.step}
              value={Number.isNaN(p.settings[item.key]) ? "" : (p.settings[item.key] as number)}
              onChange={(event) =>
                p.setSettings((current) => ({ ...current, [item.key]: event.target.valueAsNumber }))
              }
            />
          </label>
        ))}
        <label htmlFor={p.id + "palette"}>
          Palette
          <select
            id={p.id + "palette"}
            aria-label="Palette"
            value={p.settings.palette}
            onChange={(event) =>
              p.setSettings((current) => ({ ...current, palette: Number(event.target.value) }))
            }
          >
            <option value={0}>Đồng / xanh sâu</option>
            <option value={1}>Băng / tím</option>
            <option value={2}>Đá ấm</option>
          </select>
        </label>
        <label htmlFor={p.id + "samples"}>
          Mẫu mỗi pixel
          <select
            id={p.id + "samples"}
            aria-label="Mẫu mỗi pixel"
            value={p.settings.samples}
            onChange={(event) =>
              p.setSettings((current) => ({
                ...current,
                samples: Number(event.target.value) as 1 | 4,
              }))
            }
          >
            <option value={1}>1 — pixel center</option>
            <option value={4}>4 — bốn góc ¼ pixel</option>
          </select>
        </label>
        <label htmlFor={p.id + "slice"}>
          <input
            id={p.id + "slice"}
            type="checkbox"
            checked={p.settings.slice}
            onChange={(event) =>
              p.setSettings((current) => ({ ...current, slice: event.target.checked }))
            }
          />
          Xem mặt cắt 2D
        </label>
        <label htmlFor={p.id + "lighting"}>
          <input
            id={p.id + "lighting"}
            type="checkbox"
            checked={p.settings.lighting}
            onChange={(event) =>
              p.setSettings((current) => ({ ...current, lighting: event.target.checked }))
            }
          />
          Normals và ánh sáng
        </label>
        <label htmlFor={p.id + "occlusion"}>
          <input
            id={p.id + "occlusion"}
            type="checkbox"
            checked={p.settings.occlusion}
            onChange={(event) =>
              p.setSettings((current) => ({ ...current, occlusion: event.target.checked }))
            }
          />
          AO 4 probe
        </label>
        <button type="button" onClick={p.apply}>
          Áp dụng tham số
        </button>
      </div>
      <div className="lab-controls">
        <button type="button" onClick={p.pause}>
          {p.paused ? "Tiếp tục refinement" : "Tạm dừng refinement"}
        </button>
        <button type="button" onClick={p.step}>
          Tiến 1 batch
        </button>
        <button type="button" onClick={p.cancel}>
          Hủy ảnh đang tính
        </button>
        <button type="button" onClick={p.restart}>
          Tính lại ACTIVE
        </button>
        <button type="button" onClick={p.reset}>
          Reset preset
        </button>
        <label htmlFor={p.id + "view"}>
          Cách hiển thị
          <select
            id={p.id + "view"}
            aria-label="Cách hiển thị"
            value={p.view}
            onChange={(event) => p.setView(event.target.value as ViewMode)}
          >
            <option value="beauty">Ảnh có ánh sáng</option>
            <option value="steps">Ray steps</option>
            <option value="iterations">Fractal work thực tế</option>
            <option value="states">Lý do dừng ray</option>
            <option value="normals">Normals</option>
          </select>
        </label>
        <button type="button" onClick={() => p.preset(0)}>
          Power 8
        </button>
        <button type="button" onClick={() => p.preset(1)}>
          Power 6
        </button>
        <button type="button" onClick={() => p.preset(2)}>
          Góc nhìn gần
        </button>
        <button type="button" disabled={p.settings.slice} onClick={() => p.zoom(1)}>
          Phóng gần
        </button>
        <button type="button" disabled={p.settings.slice} onClick={() => p.zoom(-1)}>
          Lùi camera
        </button>
        <button type="button" onClick={p.cameraReset}>
          Đặt lại camera
        </button>
      </div>
    </>
  );
}
