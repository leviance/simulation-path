"use client";
import type { FountainScene } from "@/lib/labs/fountain/scene";
import type { MemoryWorkload } from "@/lib/labs/fountain/state";
import type { BenchmarkProgress } from "@/lib/labs/fountain/worker-protocol";

export type FountainAction =
  | "run"
  | "step"
  | "reset"
  | "preset"
  | "layout"
  | "cancel"
  | "benchmark"
  | "scaling"
  | "workload"
  | "seed"
  | "emitterX"
  | "launchSpeed"
  | "gravity"
  | "lifetime"
  | "emissionRate"
  | "selected"
  | "camera"
  | "debug";
interface Props {
  scene: FountainScene;
  result: BenchmarkProgress | null;
  workload: MemoryWorkload;
  reduced: boolean;
  debug: boolean;
  action: (action: FountainAction, value?: number) => void;
}
export default function FountainControls({
  scene,
  result,
  workload,
  reduced,
  debug,
  action,
}: Props) {
  const running = result?.active
    ? !result.paused
    : scene.pending?.kind === "conversion"
      ? !scene.jobPaused
      : !scene.paused;
  return (
    <div className="lab-controls">
      <label>
        Preset / số hạt Canvas
        <select
          value={scene.preset}
          onChange={(event) => action("preset", Number(event.target.value))}
        >
          <option value={0} disabled={scene.stage < 2}>
            256 slot trống — xem emission
          </option>
          <option value={3}>256 hạt sống — xem vòng đời</option>
          <option value={1}>2.000 hạt sống</option>
          <option value={2}>20.000 hạt sống — giới hạn Canvas</option>
        </select>
      </label>
      <button
        type="button"
        onClick={() => action("run")}
        disabled={scene.stage < 2 || (reduced && !result?.active && !scene.pending)}
      >
        {" "}
        {running ? "Tạm dừng" : "Tiếp tục"}
      </button>
      <button
        type="button"
        onClick={() => action("step")}
        disabled={scene.stage < 2 || Boolean(result?.active)}
      >
        Tiến một bước
      </button>
      <button type="button" onClick={() => action("reset")}>
        Đặt lại cùng preset/seed
      </button>
      {scene.stage >= 4 && (
        <button type="button" onClick={() => action("layout")} disabled={Boolean(result?.active)}>
          Đổi sang {scene.layout === "aos" ? "SoA" : "AoS"}
        </button>
      )}
      <button
        type="button"
        onClick={() => action("cancel")}
        disabled={!scene.pending && !result?.active}
      >
        Hủy tác vụ
      </button>
      <label>
        Seed
        <select
          value={scene.config.seed}
          onChange={(event) => action("seed", Number(event.target.value))}
        >
          <option value={0x32c0ffee}>32C0FFEE</option>
          <option value={0x12345678}>12345678</option>
          <option value={0x31415926}>31415926</option>
        </select>
      </label>
      {scene.stage >= 2 && (
        <>
          <label>
            Emitter X (m): {scene.config.emitterX.toFixed(1)}
            <input
              type="range"
              min={-3}
              max={3}
              step={0.1}
              value={scene.config.emitterX}
              onChange={(event) => action("emitterX", Number(event.target.value))}
            />
          </label>
          <label>
            Vận tốc phóng (m/s): {scene.config.launchSpeed.toFixed(1)}
            <input
              type="range"
              min={1}
              max={20}
              step={0.5}
              value={scene.config.launchSpeed}
              onChange={(event) => action("launchSpeed", Number(event.target.value))}
            />
          </label>
          <label>
            Gravity (m/s²): {scene.config.gravity.toFixed(2)}
            <input
              type="range"
              min={-20}
              max={0}
              step={0.1}
              value={scene.config.gravity}
              onChange={(event) => action("gravity", Number(event.target.value))}
            />
          </label>
          <label>
            Lifetime cơ sở (s): {scene.config.lifetime.toFixed(1)}
            <input
              type="range"
              min={0.5}
              max={8}
              step={0.1}
              value={scene.config.lifetime}
              onChange={(event) => action("lifetime", Number(event.target.value))}
            />
          </label>
          <label>
            Emission (hạt/s): {scene.config.emissionRate.toFixed(0)}
            <input
              type="range"
              min={0}
              max={Math.max(256, scene.count)}
              step={1}
              value={scene.config.emissionRate}
              onChange={(event) => action("emissionRate", Number(event.target.value))}
            />
          </label>
        </>
      )}
      <label>
        Slot cần xem
        <input
          type="number"
          min={0}
          max={scene.count - 1}
          value={scene.selected}
          onChange={(event) => action("selected", Number(event.target.value))}
        />
      </label>
      <button type="button" onClick={() => action("camera")}>
        Đặt lại camera
      </button>
      <button type="button" aria-pressed={debug} onClick={() => action("debug")}>
        {debug ? "Ẩn thông số chi tiết" : "Hiện thông số chi tiết"}
      </button>
      {scene.stage >= 3 && (
        <>
          <label>
            Workload chỉ dùng khi đo
            <select
              value={workload}
              onChange={(event) =>
                action("workload", event.target.value === "gravity-only" ? 0 : 1)
              }
            >
              <option value="gravity-only">Ít field — chỉ cập nhật velocityY</option>
              <option value="full-lifecycle">Toàn vòng đời — gravity, tích phân, respawn</option>
            </select>
          </label>
          <button
            type="button"
            disabled={Boolean(result?.active)}
            onClick={() => action("benchmark")}
          >
            {scene.stage < 7 ? "Đo baseline AoS" : "Đo AoS và SoA"}
          </button>
          {scene.stage >= 7 && (
            <button
              type="button"
              disabled={Boolean(result?.active)}
              onClick={() => action("scaling")}
            >
              Đo 3 N × 2 workload
            </button>
          )}
        </>
      )}
    </div>
  );
}
