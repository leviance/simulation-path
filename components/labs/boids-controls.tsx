import { boidsCounts, type BoidsParams } from "@/lib/labs/boids";
import type { BoidsScene } from "@/lib/labs/boids-scene";

export interface BoidsCommands {
  toggle: () => void;
  step: () => void;
  reset: () => void;
  cancel: () => void;
  debug: () => void;
  benchmark: () => void;
  count: (value: number) => void;
  seed: (value: number) => void;
  parameter: (key: keyof BoidsParams, value: number) => void;
}

export function BoidsControls({
  scene,
  reduced,
  commands,
}: {
  scene: BoidsScene;
  reduced: boolean;
  commands: BoidsCommands;
}) {
  return (
    <div className="lab-controls">
      <button type="button" onClick={commands.toggle} disabled={reduced || !!scene.job?.active}>
        {scene.paused ? "Chạy mô phỏng" : "Tạm dừng"}
      </button>
      <button type="button" onClick={commands.step} disabled={!!scene.job?.active}>
        Tiến một bước
      </button>
      <button type="button" onClick={commands.reset}>
        Đặt lại
      </button>
      <button type="button" onClick={commands.debug}>
        {scene.debug ? "Ẩn debug" : "Hiện debug"}
      </button>
      {scene.stage >= 2 && (
        <label>
          Số cá thể
          <select
            aria-label="Số cá thể"
            value={scene.count}
            onChange={(e) => commands.count(Number(e.target.value))}
          >
            {boidsCounts.map((count) => (
              <option key={count} value={count}>
                {count}
              </option>
            ))}
          </select>
        </label>
      )}
      {scene.stage >= 2 && (
        <label>
          Seed
          <select
            aria-label="Seed"
            value={scene.seed}
            onChange={(e) => commands.seed(Number(e.target.value))}
          >
            {[1, 7, 42].map((seed) => (
              <option key={seed} value={seed}>
                {seed}
              </option>
            ))}
          </select>
        </label>
      )}
      {scene.stage >= 3 && (
        <label>
          Bán kính: {scene.params.radius}
          <input
            aria-label="Bán kính hàng xóm"
            type="range"
            min="0"
            max="240"
            step="1"
            value={scene.params.radius}
            onChange={(e) => commands.parameter("radius", Number(e.target.value))}
          />
        </label>
      )}
      {(
        [
          ["separationWeight", "Separation", 4],
          ["alignmentWeight", "Alignment", 5],
          ["cohesionWeight", "Cohesion", 6],
        ] as const
      )
        .filter(([, , stage]) => scene.stage >= stage)
        .map(([key, label]) => (
          <label key={key}>
            {label}: {scene.params[key].toFixed(1)}
            <input
              aria-label={label}
              type="range"
              min="0"
              max="5"
              step="0.1"
              value={scene.params[key]}
              onChange={(e) => commands.parameter(key, Number(e.target.value))}
            />
          </label>
        ))}
      {scene.stage >= 7 && (
        <>
          <label>
            Speed cap: {scene.params.maxSpeed}
            <input
              aria-label="Giới hạn vận tốc"
              type="range"
              min="10"
              max="240"
              step="5"
              value={scene.params.maxSpeed}
              onChange={(e) => commands.parameter("maxSpeed", Number(e.target.value))}
            />
          </label>
          <label>
            Acceleration cap: {scene.params.maxAcceleration}
            <input
              aria-label="Giới hạn gia tốc"
              type="range"
              min="10"
              max="240"
              step="5"
              value={scene.params.maxAcceleration}
              onChange={(e) => commands.parameter("maxAcceleration", Number(e.target.value))}
            />
          </label>
        </>
      )}
      {scene.stage >= 8 && (
        <>
          <button type="button" onClick={commands.benchmark} disabled={!!scene.job?.active}>
            Đo 256 / 512 / 1024
          </button>
          <button type="button" onClick={commands.cancel}>
            Dừng / hủy phép đo
          </button>
        </>
      )}
    </div>
  );
}
