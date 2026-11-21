"use client";

import { lazy, Suspense, useState } from "react";
import type {
  ChamberController,
  ChamberView,
} from "@/lib/labs/charged-particle-chamber/controller";

const ChamberSettings = lazy(() => import("./settings"));

export default function ChamberControls({
  controller,
  state,
  reducedMotion,
  reset,
}: {
  controller: ChamberController;
  state: ChamberView;
  reducedMotion: boolean;
  reset: () => void;
}) {
  const [expanded, setExpanded] = useState(state.mode !== "chamber-view");
  return (
    <>
      <div className="lab-controls">
        <button
          type="button"
          onClick={() => (state.paused ? controller.resume() : controller.pause())}
          disabled={state.comparison.status === "running" || (state.paused && reducedMotion)}
        >
          {state.paused ? "Chạy" : "Tạm dừng"}
        </button>
        <button
          type="button"
          onClick={() => controller.step()}
          disabled={!state.paused || state.comparison.status === "running"}
        >
          Một bước
        </button>
        <button type="button" onClick={reset}>
          Đặt lại
        </button>
        <button type="button" onClick={() => controller.resetCamera()}>
          Góc nhìn ban đầu
        </button>
        <button type="button" onClick={() => controller.focusSelected()}>
          Nhìn hạt đang chọn
        </button>
        <label>
          Hạt đang chọn (ID mẫu CPU)
          <input
            type="number"
            aria-label="Hạt đang chọn"
            min="0"
            max={state.particles.length - 1}
            value={state.selected}
            onChange={(e) => controller.select(Number(e.target.value))}
          />
        </label>
        <label>
          <input
            type="checkbox"
            checked={state.showTrails}
            onChange={(e) => controller.setPresentation("showTrails", e.target.checked)}
          />
          Vệt quỹ đạo (tối đa 17)
        </label>
        <label>
          <input
            type="checkbox"
            checked={state.bySpeed}
            onChange={(e) => controller.setPresentation("bySpeed", e.target.checked)}
          />
          Màu theo tốc độ
        </label>
      </div>
      <details open={expanded} onToggle={(event) => setExpanded(event.currentTarget.open)}>
        <summary>Cấu hình thí nghiệm — chỉnh trước, áp dụng sau</summary>
        {expanded && (
          <Suspense fallback={<p className="lab-hint">Đang tải các thông số thí nghiệm…</p>}>
            <ChamberSettings controller={controller} state={state} />
          </Suspense>
        )}
      </details>
      <div className="lab-controls">
        <label>
          Integrator CPU
          <select
            aria-label="Integrator CPU"
            value={state.integrator}
            onChange={(e) => controller.setIntegrator(e.target.value as "boris" | "euler")}
          >
            <option value="boris">Boris — bản hoàn chỉnh</option>
            <option value="euler">Euler — cố ý tạo sai số</option>
          </select>
        </label>
        <button
          type="button"
          disabled={state.comparison.status === "running"}
          onClick={() => controller.startComparison()}
        >
          Đối chiếu dt và dt/2 (CPU)
        </button>
        <button
          type="button"
          disabled={state.comparison.status !== "running"}
          onClick={() => controller.cancelComparison()}
        >
          Hủy đối chiếu
        </button>
      </div>
      {reducedMotion && (
        <p className="lab-hint">
          Reduced motion đang bật: không tự chạy. Bạn vẫn có thể dùng Một bước, điều khiển camera và
          đối chiếu hữu hạn.
        </p>
      )}
    </>
  );
}
