"use client";

import type {
  VectorLabController,
  VectorLabState,
  InjectedError,
  BarrierMode,
} from "@/lib/labs/million-vector-gpu/controller";
import { labView } from "@/lib/labs/million-vector-gpu/controller";
import type { VectorOperation } from "@/lib/labs/million-vector-gpu";
import type { MeasurementScope } from "@/lib/labs/million-vector-gpu/scopes";

export default function VectorControls({
  controller,
  state,
  reducedMotion,
  ready,
  reset,
}: {
  controller: VectorLabController;
  state: Readonly<VectorLabState>;
  reducedMotion: boolean;
  ready: boolean;
  reset: () => void;
}) {
  const view = labView(state.mode);
  const inspect = view === "vectors" || view === "layout";
  const validate = state.mode === "gpu-validation" || state.mode === "vector-gpu-final";
  return (
    <fieldset
      className="lab-controls"
      disabled={!ready}
      aria-busy={!ready}
      aria-label="Điều khiển mô hình vector"
      style={{ margin: 0, minWidth: 0, borderTop: 0, borderLeft: 0, borderRight: 0 }}
    >
      <label>
        Preset N
        <select
          aria-label="Preset N"
          value={state.elementCount}
          disabled={state.mode === "one-workgroup"}
          onChange={(e) => controller.configure({ elementCount: Number(e.target.value) })}
        >
          {[256, 65_537, 1_000_003].map((count) => (
            <option value={count} key={count}>
              {count.toLocaleString("vi-VN")} phần tử
            </option>
          ))}
        </select>
      </label>
      {(view === "group" || view === "limits") && (
        <label>
          Local size minh họa
          <select
            aria-label="Local size minh họa"
            value={state.localSize}
            disabled={state.mode === "one-workgroup"}
            onChange={(e) => controller.configure({ localSize: Number(e.target.value) })}
          >
            {[32, 64, 128, 256].map((size) => (
              <option value={size} key={size}>
                {size}
              </option>
            ))}
          </select>
        </label>
      )}
      {view === "vectors" && (
        <>
          <label>
            Operation
            <select
              aria-label="Operation"
              value={state.operation}
              onChange={(e) =>
                controller.configure({ operation: e.target.value as VectorOperation })
              }
            >
              <option value="add">Add</option>
              <option value="axpy">AXPY</option>
              <option value="difference">Difference</option>
            </select>
          </label>
          <label>
            Scalar: {state.scalar.toFixed(2)}
            <input
              aria-label="Scalar"
              type="range"
              min={-4}
              max={4}
              step={0.25}
              value={state.scalar}
              onChange={(e) => controller.configure({ scalar: Number(e.target.value) })}
            />
          </label>
        </>
      )}
      {inspect && (
        <>
          <label>
            Index đang xem
            <input
              aria-label="Index đang xem"
              type="number"
              min={0}
              max={state.elementCount - 1}
              step={1}
              value={state.selectedIndex}
              onChange={(e) => {
                const value = e.target.valueAsNumber;
                if (Number.isSafeInteger(value)) controller.configure({ selectedIndex: value });
              }}
            />
          </label>
          <label>
            Component
            <select
              aria-label="Component"
              value={state.component}
              onChange={(e) => controller.configure({ component: Number(e.target.value) })}
            >
              {["x", "y", "z", "w"].map((key, index) => (
                <option value={index} key={key}>
                  {key}
                </option>
              ))}
            </select>
          </label>
        </>
      )}
      {view === "limits" && (
        <label>
          Giới hạn giả định
          <select
            aria-label="Giới hạn giả định"
            value={state.limitsPreset}
            onChange={(e) =>
              controller.configure({
                limitsPreset: e.target.value as VectorLabState["limitsPreset"],
              })
            }
          >
            <option value="desktop">Đủ OpenGL / SSBO</option>
            <option value="weak">Thiếu compute / local size</option>
            <option value="bindings">Chỉ có 2 binding</option>
            <option value="capacity">Block chỉ có 4096 byte</option>
          </select>
        </label>
      )}
      {view === "barrier" && (
        <label>
          Thí nghiệm barrier
          <select
            aria-label="Thí nghiệm barrier"
            value={state.barrierMode}
            onChange={(e) => controller.configure({ barrierMode: e.target.value as BarrierMode })}
          >
            <option value="correct">BUFFER_UPDATE đúng consumer</option>
            <option value="missing">Bỏ barrier</option>
            <option value="wrong">Sai consumer bit</option>
          </select>
        </label>
      )}
      {(view === "timing" || view === "barrier" || state.mode === "vector-gpu-final") && (
        <label>
          Phạm vi đo
          <select
            aria-label="Phạm vi đo"
            value={state.scope}
            onChange={(e) => controller.configure({ scope: e.target.value as MeasurementScope })}
          >
            <option value="cpu">CPU loop</option>
            <option value="kernel">GPU kernel</option>
            <option value="end-to-end">End-to-end</option>
          </select>
        </label>
      )}
      {validate && (
        <>
          <label>
            Lỗi cố ý
            <select
              aria-label="Lỗi cố ý"
              value={state.injectedError}
              onChange={(e) =>
                controller.configure({ injectedError: e.target.value as InjectedError })
              }
            >
              <option value="none">Không lỗi</option>
              <option value="roundoff">Roundoff 1e-7</option>
              <option value="large">Sai 0,01</option>
              <option value="nan">NaN</option>
              <option value="infinity">Infinity</option>
              <option value="missing">Thiếu output</option>
              <option value="nan-tolerance">Tolerance NaN</option>
            </select>
          </label>
          <label>
            Abs/rel tolerance: {state.tolerance.toExponential(0)}
            <input
              aria-label="Abs/rel tolerance"
              type="range"
              min={-8}
              max={-2}
              step={1}
              value={Math.round(Math.log10(state.tolerance))}
              onChange={(e) => controller.configure({ tolerance: 10 ** Number(e.target.value) })}
            />
          </label>
        </>
      )}
      <button
        type="button"
        disabled={reducedMotion && state.paused}
        onClick={() => (state.paused ? controller.resume() : controller.pause())}
      >
        {state.paused ? "Chạy lần lượt" : "Tạm dừng"}
      </button>
      <button
        type="button"
        disabled={state.tourStep >= controller.lastStep()}
        onClick={() => controller.step()}
      >
        Một bước
      </button>
      <button type="button" onClick={reset}>
        Đặt lại
      </button>
    </fieldset>
  );
}
