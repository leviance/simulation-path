"use client";
import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent,
} from "react";
import {
  activate,
  advance,
  audit,
  cancelPointer,
  createModel,
  createUi,
  fixedDt,
  keyDown,
  pointerDown,
  pointerMove,
  pointerUp,
  resetSimulation,
  scenePointerDown,
  setGravity,
  setPaused,
  stepPhysics,
  suspend,
  windowToLogical,
} from "@/lib/labs/simulator-controls";
import {
  LabReadout,
  canvasPoint,
  useCanvasSize,
  usePauseOnReducedMotion,
  useReducedMotion,
} from "./lab-shared";
import { draw } from "./simulator-controls/draw";

export default function SimulatorControlsLab({ mode }: { mode?: string }) {
  const parsed = Number(mode?.split("-").at(-1));
  const lessonStage = Number.isInteger(parsed) && parsed >= 1 && parsed <= 7 ? parsed : 7;
  const [preview, setPreview] = useState(false);
  const stage = preview ? 7 : lessonStage;
  return (
    <>
      {lessonStage < 7 && (
        <label>
          <input type="checkbox" checked={preview} onChange={(e) => setPreview(e.target.checked)} />
          Xem bản hoàn chỉnh (đổi chế độ sẽ reset mô phỏng)
        </label>
      )}
      <ControlsLab key={stage} stage={stage} />
    </>
  );
}

function ControlsLab({ stage }: { stage: number }) {
  const canvas = useRef<HTMLCanvasElement>(null),
    size = useCanvasSize(canvas),
    help = useId(),
    gravityId = useId(),
    reduced = useReducedMotion();
  const model = useRef(createModel()),
    ui = useRef(createUi()),
    pointer = useRef<number | null>(null);
  const [version, setVersion] = useState(0),
    [running, setRunning] = useState(false);
  const [preset, setPreset] = useState("480");
  const publish = useCallback(() => {
    setVersion((v) => v + 1);
    setRunning(!model.current.paused);
  }, []);
  const release = useCallback(() => {
    const id = pointer.current;
    pointer.current = null;
    if (id !== null && canvas.current?.hasPointerCapture(id))
      canvas.current.releasePointerCapture(id);
  }, []);
  const cancel = useCallback(() => {
    cancelPointer(ui.current);
    release();
    publish();
  }, [release, publish]);
  const stop = useCallback(() => {
    suspend(model.current, ui.current);
    release();
    publish();
  }, [release, publish]);
  usePauseOnReducedMotion(stop);
  useEffect(() => {
    const hidden = () => {
      if (document.hidden) stop();
    };
    window.addEventListener("blur", stop);
    document.addEventListener("visibilitychange", hidden);
    return () => {
      window.removeEventListener("blur", stop);
      document.removeEventListener("visibilitychange", hidden);
      release();
    };
  }, [stop, release]);
  useEffect(() => {
    stop();
  }, [size.width, size.height, size.dpr, stop]);
  useEffect(() => {
    if (!running || reduced) return;
    let frame = 0,
      previous = 0,
      revision = model.current.clockRevision;
    const tick = (now: number) => {
      let elapsed = 0;
      if (previous && revision === model.current.clockRevision) elapsed = (now - previous) / 1000;
      previous = now;
      revision = model.current.clockRevision;
      advance(model.current, elapsed);
      publish();
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [running, reduced, publish]);
  useEffect(() => {
    const ctx = canvas.current?.getContext("2d");
    if (ctx) draw(ctx, size, model.current, ui.current, stage);
  }, [size, version, stage]);
  const point = (e: PointerEvent<HTMLCanvasElement>) =>
    windowToLogical(canvasPoint(e, e.currentTarget), size.width, size.height);
  const enforceReduced = () => {
    if (reduced) setPaused(model.current, true);
  };
  const down = (e: PointerEvent<HTMLCanvasElement>) => {
    if (e.button !== 0 || pointer.current !== null) return;
    const p = point(e);
    if (!p) return;
    e.preventDefault();
    e.currentTarget.focus({ preventScroll: true });
    const consumed = pointerDown(model.current, ui.current, p, stage);
    if (!consumed && stage >= 6) scenePointerDown(model.current, p);
    if (ui.current.active !== "None") {
      try {
        e.currentTarget.setPointerCapture(e.pointerId);
        pointer.current = e.pointerId;
      } catch {
        cancelPointer(ui.current);
      }
    }
    publish();
  };
  const move = (e: PointerEvent<HTMLCanvasElement>) => {
    if (pointer.current !== null && pointer.current !== e.pointerId) return;
    const p = point(e);
    if (p) {
      pointerMove(model.current, ui.current, p, stage);
      publish();
    }
  };
  const up = (e: PointerEvent<HTMLCanvasElement>) => {
    if (e.button !== 0 || pointer.current !== e.pointerId) return;
    const p = point(e);
    if (p) pointerUp(model.current, ui.current, p, stage);
    else cancelPointer(ui.current);
    release();
    enforceReduced();
    publish();
  };
  const cancelled = (e: PointerEvent<HTMLCanvasElement>) => {
    if (pointer.current === e.pointerId) cancel();
  };
  const keyboard = (e: KeyboardEvent<HTMLCanvasElement>) => {
    // Canvas không giữ Tab ở hai đầu: người dùng vẫn ra được các control HTML bên ngoài.
    if (
      stage >= 5 &&
      e.key === "Tab" &&
      ((!e.shiftKey && ui.current.focus === "Gravity") ||
        (e.shiftKey && (ui.current.focus === "None" || ui.current.focus === "Pause")))
    ) {
      cancelPointer(ui.current);
      ui.current.focus = "None";
      release();
      publish();
      return;
    }
    const consumed = keyDown(model.current, ui.current, e.key, e.shiftKey, e.repeat, stage);
    if (consumed) e.preventDefault();
    if (ui.current.active === "None") release();
    enforceReduced();
    publish();
  };
  const reset = () => {
    cancelPointer(ui.current);
    release();
    resetSimulation(model.current);
    publish();
  };
  const singleStep = () => {
    if (model.current.paused) {
      stepPhysics(model.current);
      publish();
    }
  };
  const m = model.current,
    state = ui.current;
  return (
    <div
      className="lab-body"
      onFocusCapture={(e) => {
        if (!canvas.current?.isSameNode(e.target)) {
          cancelPointer(ui.current);
          ui.current.focus = "None";
          release();
          publish();
        }
      }}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) stop();
      }}
    >
      <p id={help}>
        Mô phỏng đang chạy đúng checkpoint {stage}.
        {stage < 3 &&
          " Các nút vẽ trong Canvas chưa nhận click; dùng control HTML bên dưới để thử vật lý."}
        {stage >= 3 && " Nhấn rồi thả trên cùng nút để kích hoạt; Esc hủy kéo."}
        {stage >= 4 && " Slider thay đổi trọng lực từ 0 đến 1200 px/s²."}
        {stage < 5 && " Khi Canvas có focus: Space chạy/dừng, N tiến một bước."}
        {stage >= 5 &&
          " Tab chọn control; Enter/Space nhấn nút, ← → và Home/End chỉnh slider. Tab ở cuối đi ra ngoài Canvas."}
      </p>
      <canvas
        ref={canvas}
        width={760}
        height={428}
        style={{ width: "100%", height: 428, touchAction: "none" }}
        tabIndex={0}
        role="application"
        aria-label="Simulator Controls Lab"
        aria-describedby={help}
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
        onPointerCancel={cancelled}
        onLostPointerCapture={cancelled}
        onPointerLeave={() => {
          if (pointer.current === null) {
            ui.current.hot = "None";
            publish();
          }
        }}
        onKeyDown={keyboard}
      />
      <p>
        Các control HTML dưới đây là cách điều khiển tương đương cho bàn phím và trình đọc màn hình;
        chúng sửa cùng Model, không phải một mô phỏng khác.
      </p>
      <div className="lab-controls">
        <button
          type="button"
          disabled={reduced}
          onClick={() => {
            activate(m, "Pause");
            publish();
          }}
        >
          {m.paused ? "Chạy mô phỏng" : "Tạm dừng"}
        </button>
        <button type="button" onClick={reset}>
          Reset cảnh
        </button>
        <button type="button" disabled={!m.paused} onClick={singleStep}>
          Một bước 1/120 s
        </button>
        {stage >= 4 && (
          <>
            <label htmlFor={gravityId}>Trọng lực (px/s²)</label>
            <input
              id={gravityId}
              type="range"
              min="0"
              max="1200"
              step="any"
              value={m.gravity}
              onKeyDown={(e) => {
                if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(e.key)) return;
                e.preventDefault();
                if (e.key === "ArrowLeft") setGravity(m, m.gravity - 20);
                if (e.key === "ArrowRight") setGravity(m, m.gravity + 20);
                if (e.key === "Home") setGravity(m, 0);
                if (e.key === "End") setGravity(m, 1200);
                publish();
              }}
              onChange={(e) => {
                setGravity(m, Number(e.target.value));
                publish();
              }}
            />
            <label>
              Preset trọng lực
              <select
                value={preset}
                onChange={(e) => {
                  setPreset(e.target.value);
                  cancelPointer(state);
                  release();
                  setPaused(m, true);
                  setGravity(m, Number(e.target.value));
                  resetSimulation(m);
                  publish();
                }}
              >
                <option value="0">Không trọng lực</option>
                <option value="480">Vừa — 480</option>
                <option value="1200">Mạnh — 1200</option>
              </select>
            </label>
          </>
        )}
      </div>
      <LabReadout
        items={[
          { label: "Trạng thái", value: m.paused ? "Đang tạm dừng" : "Đang chạy" },
          {
            label: "Gravity / thời gian mô phỏng",
            value: `${m.gravity.toFixed(0)} / ${(m.ticks * fixedDt).toFixed(3)} s`,
          },
          { label: "Vị trí / vận tốc Y", value: `${m.y.toFixed(2)} / ${m.velocity.toFixed(2)}` },
          {
            label: "Hot / Active / Focus",
            value: `${state.hot} / ${state.active} / ${state.focus}`,
          },
          { label: "Click vào cảnh", value: m.scenePresses },
          { label: "State audit", value: audit(m, state) ? "Hợp lệ" : "Có lỗi" },
        ]}
      />
      <p>
        Pause chỉ dừng vật lý, UI vẫn hoạt động. Reset giữ gravity và Pause; preset cố ý tạm dừng
        rồi reset. Resize, mất focus hoặc ẩn tab sẽ hủy kéo và tạm dừng, không tự chạy lại.
        Reduced-motion chỉ cho bước thủ công. Cảnh dùng logical pixel, không quy đổi gravity sang
        m/s².
      </p>
    </div>
  );
}
