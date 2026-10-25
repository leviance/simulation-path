import type { BoidsParams } from "@/lib/labs/boids";
import type { GridScene } from "@/lib/labs/boids-grid-scene";
import type { FlockLayout, GridMethod } from "@/lib/labs/boids-grid-step";

export interface GridCommands {
  toggle: () => void;
  step: () => void;
  reset: () => void;
  stop: () => void;
  count: (value: number) => void;
  seed: (value: number) => void;
  cellSize: (value: number) => void;
  layout: (value: FlockLayout) => void;
  method: (value: GridMethod) => void;
  parameter: (name: keyof BoidsParams, value: number) => void;
  debug: (name: "debug" | "showCells" | "showOccupancy") => void;
  validate: () => void;
  benchmark: (plan: "scale" | "cells") => void;
}

export function BoidsGridControls({
  scene,
  commands,
  reduced,
}: {
  scene: GridScene;
  commands: GridCommands;
  reduced: boolean;
}) {
  const busy = !!scene.job || !!scene.benchmark?.active || !!scene.validation?.active;
  return (
    <div className="lab-controls">
      <button type="button" onClick={commands.toggle} disabled={reduced}>
        {scene.paused ? "Chạy mô phỏng" : "Tạm dừng"}
      </button>
      <button type="button" onClick={commands.step} disabled={busy}>
        Tiến một bước
      </button>
      <button type="button" onClick={commands.reset}>
        Đặt lại
      </button>
      <button type="button" onClick={commands.stop}>
        Dừng / hủy công việc
      </button>
      <label>
        Số cá thể
        <select
          aria-label="Số cá thể"
          value={scene.count}
          onChange={(event) => commands.count(Number(event.target.value))}
        >
          {[256, 1024, ...(scene.stage >= 8 ? [10000] : [])].map((count) => (
            <option key={count} value={count}>
              {count.toLocaleString("vi-VN")}
            </option>
          ))}
        </select>
      </label>
      <label>
        Seed
        <select
          aria-label="Seed"
          value={scene.seed}
          onChange={(event) => commands.seed(Number(event.target.value))}
        >
          {[1, 7, 42].map((seed) => (
            <option key={seed} value={seed}>
              {seed}
            </option>
          ))}
        </select>
      </label>
      <label>
        Cell size
        <select
          aria-label="Cell size"
          value={scene.cellSize}
          onChange={(event) => commands.cellSize(Number(event.target.value))}
        >
          {[16, 32, 64, 100, 128, 240].map((size) => (
            <option key={size} value={size}>
              {size}
            </option>
          ))}
        </select>
      </label>
      {scene.stage >= 5 && (
        <label>
          Tìm hàng xóm
          <select
            aria-label="Tìm hàng xóm"
            value={scene.method}
            onChange={(event) => commands.method(event.target.value as GridMethod)}
          >
            <option value="grid">Spatial Grid</option>
            <option value="brute" disabled={scene.count > 1024}>
              Brute force (N ≤ 1.024)
            </option>
          </select>
        </label>
      )}
      {scene.stage >= 7 && (
        <label>
          Phân bố ban đầu
          <select
            aria-label="Phân bố ban đầu"
            value={scene.layout}
            onChange={(event) => commands.layout(event.target.value as FlockLayout)}
          >
            <option value="uniform">Đều</option>
            <option value="clustered">Hai cụm</option>
            <option value="dense">Cụm rất đặc</option>
          </select>
        </label>
      )}
      {(
        [
          ["radius", "Bán kính hàng xóm", 0, 240, 1],
          ["separationWeight", "Separation", 0, 5, 0.1],
          ["alignmentWeight", "Alignment", 0, 5, 0.1],
          ["cohesionWeight", "Cohesion", 0, 5, 0.1],
          ["maxSpeed", "Giới hạn vận tốc", 10, 240, 5],
          ["maxAcceleration", "Giới hạn gia tốc", 10, 240, 5],
        ] as const
      ).map(([name, label, min, max, step]) => (
        <label key={name}>
          {label}: {scene.params[name].toFixed(1)}
          <input
            aria-label={label}
            type="range"
            min={min}
            max={max}
            step={step}
            value={scene.params[name]}
            onChange={(event) => commands.parameter(name, Number(event.target.value))}
          />
        </label>
      ))}
      <label>
        <input type="checkbox" checked={scene.debug} onChange={() => commands.debug("debug")} />
        Hiện debug
      </label>
      <label>
        <input
          type="checkbox"
          checked={scene.showCells}
          onChange={() => commands.debug("showCells")}
        />
        Đường biên cell
      </label>
      <label>
        <input
          type="checkbox"
          checked={scene.showOccupancy}
          onChange={() => commands.debug("showOccupancy")}
        />
        Mật độ cell
      </label>
      {scene.stage >= 6 && (
        <button type="button" onClick={commands.validate}>
          Đối chiếu toàn đàn nhỏ
        </button>
      )}
      {scene.stage >= 9 && (
        <>
          <button type="button" onClick={() => commands.benchmark("scale")}>
            Đo theo N (phân bố đều)
          </button>
          <button type="button" onClick={() => commands.benchmark("cells")}>
            Đo theo cell size (N=1.024)
          </button>
        </>
      )}
    </div>
  );
}
