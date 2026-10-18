"use client";
import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type PointerEvent,
  type KeyboardEvent,
} from "react";
import {
  createLab,
  ensureLayout,
  setWidth,
  setSpacing,
  toggleReset,
  appendLabel,
  removeLabel,
  setOverflow,
  auditLayout,
  createUi,
  cancel,
  pointerDown,
  pointerMove,
  pointerUp,
  keyDown,
  focusOrder,
  createModel,
  advance,
  setPaused,
  resetSimulation,
  stepPhysics,
  setGravity,
  windowToLogical,
  locate,
} from "@/lib/labs/box-layout";
import {
  canvasPoint,
  useCanvasSize,
  useReducedMotion,
  usePauseOnReducedMotion,
  LabReadout,
} from "./lab-shared";
import { draw } from "./box-layout/draw";
import { LayoutInspector } from "./box-layout/inspector";

function LayoutLab({ stage }: { stage: number }) {
  const canvas = useRef<HTMLCanvasElement>(null),
    size = useCanvasSize(canvas),
    help = useId(),
    reduced = useReducedMotion();
  const ui = useRef(createUi()),
    model = useRef(createModel()),
    pointer = useRef<number | null>(null);
  const [lab, setLab] = useState(() => {
    const value = createLab(stage);
    ensureLayout(value, ui.current);
    return value;
  });
  const [version, setVersion] = useState(0),
    [running, setRunning] = useState(false),
    [selected, setSelected] = useState(lab.pause),
    [boxes, setBoxes] = useState(true),
    [preset, setPreset] = useState("default"),
    [message, setMessage] = useState("Giữ cây hiện tại; thay đầu vào layout để quan sát kết quả.");
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
  const stop = useCallback(() => {
    cancel(ui.current);
    release();
    setPaused(model.current, true);
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
      let dt = 0;
      if (previous && revision === model.current.clockRevision) dt = (now - previous) / 1000;
      previous = now;
      revision = model.current.clockRevision;
      advance(model.current, dt);
      publish();
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [running, reduced, publish]);
  useEffect(() => {
    const ctx = canvas.current?.getContext("2d");
    if (ctx) {
      ensureLayout(lab, ui.current);
      draw(ctx, size, lab, model.current, ui.current, selected, boxes);
    }
  }, [lab, size, version, selected, boxes]);
  const edit = (operation: () => unknown) => {
    stop();
    operation();
    ensureLayout(lab, ui.current);
    release();
    publish();
  };
  const resetLab = (name = "default") => {
    stop();
    ui.current = createUi();
    const value = createLab(stage);
    if (name === "gap") setSpacing(value, ui.current, 24, 16);
    if (name === "compact") setSpacing(value, ui.current, 0, 4);
    if (name === "narrow") setWidth(value, ui.current, 220);
    if (name === "overflow") {
      setWidth(value, ui.current, 220);
      setOverflow(value, ui.current, true);
    }
    ensureLayout(value, ui.current);
    setLab(value);
    setSelected(value.pause);
    setPreset(name);
    setMessage("Đã khôi phục bố cục; giữ trạng thái cảnh và tạm dừng.");
    publish();
  };
  const point = (e: PointerEvent<HTMLCanvasElement>) =>
    windowToLogical(canvasPoint(e, e.currentTarget), size.width, size.height);
  const down = (e: PointerEvent<HTMLCanvasElement>) => {
    if (e.button !== 0 || pointer.current !== null) return;
    const p = point(e);
    if (!p) return;
    e.preventDefault();
    e.currentTarget.focus({ preventScroll: true });
    ensureLayout(lab, ui.current);
    pointerDown(lab.tree, model.current, ui.current, p);
    if (ui.current.active) {
      try {
        e.currentTarget.setPointerCapture(e.pointerId);
        pointer.current = e.pointerId;
      } catch {
        cancel(ui.current);
      }
    }
    publish();
  };
  const move = (e: PointerEvent<HTMLCanvasElement>) => {
    if (pointer.current !== null && pointer.current !== e.pointerId) return;
    const p = point(e);
    if (p) {
      ensureLayout(lab, ui.current);
      pointerMove(lab.tree, model.current, ui.current, p);
      publish();
    }
  };
  const up = (e: PointerEvent<HTMLCanvasElement>) => {
    if (e.button !== 0 || pointer.current !== e.pointerId) return;
    const p = point(e);
    ensureLayout(lab, ui.current);
    if (p) pointerUp(lab.tree, model.current, ui.current, p);
    else cancel(ui.current);
    release();
    if (reduced) setPaused(model.current, true);
    publish();
  };
  const cancelled = (e: PointerEvent<HTMLCanvasElement>) => {
    if (pointer.current === e.pointerId) {
      cancel(ui.current);
      release();
      publish();
    }
  };
  const keyboard = (e: KeyboardEvent<HTMLCanvasElement>) => {
    ensureLayout(lab, ui.current);
    if (e.shiftKey && stage >= 7 && (e.key === "ArrowLeft" || e.key === "ArrowRight")) {
      e.preventDefault();
      edit(() =>
        setWidth(
          lab,
          ui.current,
          Math.max(220, Math.min(420, lab.width + (e.key === "ArrowRight" ? 20 : -20))),
        ),
      );
      return;
    }
    if (e.key === "Tab") {
      const order = focusOrder(lab.tree),
        index = order.indexOf(ui.current.focus);
      if (
        !order.length ||
        (!e.shiftKey && index === order.length - 1) ||
        (e.shiftKey && index <= 0)
      ) {
        cancel(ui.current);
        ui.current.focus = 0;
        release();
        publish();
        return;
      }
    }
    let consumed = keyDown(lab.tree, model.current, ui.current, e.key, e.shiftKey, e.repeat);
    if (e.key === " " && !consumed) {
      if (!e.repeat && !ui.current.active) setPaused(model.current, !model.current.paused);
      consumed = true;
    }
    if (e.key.toLowerCase() === "n") {
      if (!e.repeat && model.current.paused && !ui.current.active) stepPhysics(model.current);
      consumed = true;
    }
    if (consumed) e.preventDefault();
    if (!ui.current.active) release();
    if (reduced) setPaused(model.current, true);
    publish();
  };
  const rootStyle = lab.styles.get(1)!,
    reset = lab.tree.root.children
      .flatMap((n) => [n, ...n.children])
      .find((n) => n.id === lab.reset);
  const m = model.current;
  const pauseView = locate(lab.tree, lab.pause);
  return (
    <div
      className="lab-body"
      onKeyDownCapture={(e) => {
        if (
          e.repeat &&
          (e.key === " " || e.key === "Enter") &&
          (e.target as HTMLElement).tagName === "BUTTON"
        )
          e.preventDefault();
      }}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) stop();
      }}
      onFocusCapture={(e) => {
        if (!canvas.current?.isSameNode(e.target)) {
          cancel(ui.current);
          ui.current.focus = 0;
          release();
        }
      }}
    >
      <p id={help}>
        Checkpoint {stage}.{" "}
        {stage < 4
          ? "Rect vẫn đặt tay; lớp hộp và số đo chưa tự di chuyển control."
          : "Layout xếp control theo thứ tự cây, từ trên xuống."}{" "}
        Tab/Shift+Tab đi qua control và thoát Canvas ở hai đầu; Enter/Space nhấn nút; ←/→, Home/End
        chỉnh Slider; Esc hủy kéo. {stage >= 7 && "Shift+←/→ đổi chiều rộng Panel."}
      </p>
      <div className="lab-controls">
        <button
          type="button"
          disabled={reduced}
          onClick={() => {
            cancel(ui.current);
            release();
            setPaused(m, !m.paused);
            publish();
          }}
        >
          {m.paused ? "Chạy cảnh" : "Tạm dừng"}
        </button>
        <button
          type="button"
          onClick={() => {
            cancel(ui.current);
            release();
            resetSimulation(m);
            publish();
          }}
        >
          Reset cảnh (giữ layout)
        </button>
        <button
          type="button"
          disabled={!m.paused}
          onClick={() => {
            stepPhysics(m);
            publish();
          }}
        >
          Một bước 1/120 s
        </button>
        <button type="button" onClick={() => resetLab()}>
          Khôi phục bố cục
        </button>
        <label>
          Preset{" "}
          <select value={preset} onChange={(e) => resetLab(e.target.value)}>
            <option value="default">Mặc định</option>
            {stage >= 4 && (
              <>
                <option value="gap">Gap lớn</option>
                <option value="compact">Gọn, không gap</option>
              </>
            )}
            {stage >= 7 && <option value="narrow">Panel hẹp</option>}
            {stage >= 8 && <option value="overflow">Slider rộng hơn cha</option>}
          </select>
        </label>
        {stage >= 2 && (
          <label>
            <input type="checkbox" checked={boxes} onChange={(e) => setBoxes(e.target.checked)} />{" "}
            Hiện box model
          </label>
        )}
        {stage >= 4 && (
          <>
            <label>
              Gap {rootStyle.gap}
              <input
                type="range"
                min="0"
                max="32"
                step="2"
                value={rootStyle.gap}
                onChange={(e) =>
                  edit(() =>
                    setSpacing(lab, ui.current, Number(e.target.value), rootStyle.padding.left),
                  )
                }
              />
            </label>
            <label>
              Padding root {rootStyle.padding.left}
              <input
                type="range"
                min="0"
                max="48"
                step="2"
                value={rootStyle.padding.left}
                onChange={(e) =>
                  edit(() => setSpacing(lab, ui.current, rootStyle.gap, Number(e.target.value)))
                }
              />
            </label>
          </>
        )}
        {stage >= 6 && (
          <>
            <button type="button" onClick={() => edit(() => toggleReset(lab, ui.current))}>
              {reset?.visible ? "Ẩn Reset" : "Hiện Reset"}
            </button>
            <button
              type="button"
              disabled={lab.extras.length >= 4}
              onClick={() => edit(() => appendLabel(lab, ui.current))}
            >
              Thêm Label
            </button>
            <button
              type="button"
              disabled={!lab.extras.length}
              onClick={() => edit(() => removeLabel(lab, ui.current))}
            >
              Xóa Label cuối
            </button>
          </>
        )}
        {stage >= 7 && (
          <label>
            Chiều rộng Panel {lab.width}
            <input
              type="range"
              min="220"
              max="420"
              value={lab.width}
              onChange={(e) => edit(() => setWidth(lab, ui.current, Number(e.target.value)))}
            />
          </label>
        )}
        {stage >= 8 && (
          <label>
            <input
              type="checkbox"
              checked={lab.overflow}
              onChange={(e) => edit(() => setOverflow(lab, ui.current, e.target.checked))}
            />{" "}
            Slider cố định rộng 320
          </label>
        )}
        <label>
          Gravity{" "}
          <input
            type="range"
            min="0"
            max="1200"
            step="20"
            value={m.gravity}
            disabled={!locate(lab.tree, lab.slider)}
            onChange={(e) => {
              cancel(ui.current);
              release();
              setGravity(m, Number(e.target.value));
              publish();
            }}
          />
        </label>
        {stage >= 9 && (
          <button
            type="button"
            onClick={() => {
              try {
                ensureLayout(lab, ui.current);
                setMessage(`PASS: ${auditLayout(lab)} node nhìn thấy`);
              } catch (e) {
                setMessage(String(e));
              }
            }}
          >
            Kiểm layout hiện tại
          </button>
        )}
      </div>
      <canvas
        ref={canvas}
        className="lab-canvas"
        role="application"
        aria-label="Vertical Box Layout Lab"
        aria-describedby={help}
        tabIndex={0}
        onKeyDown={keyboard}
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
        onPointerCancel={cancelled}
        onLostPointerCapture={cancelled}
      />
      <LabReadout
        items={[
          { label: "Node / lượt layout", value: `${lab.tree.count} / ${lab.passes}` },
          {
            label: "Pause world",
            value: pauseView
              ? `(${pauseView.bounds.x}, ${pauseView.bounds.y}) ${pauseView.bounds.width}×${pauseView.bounds.height}`
              : "Đang ẩn hoặc ngoài clip",
          },
          { label: "Gravity / tick", value: `${m.gravity} / ${m.ticks}` },
          {
            label: "Root naturalHeight / height",
            value: `${lab.sizes.get(1)?.naturalHeight ?? "chưa đo"} / ${lab.tree.root.local.height}`,
          },
          {
            label: "Hot / Active / Focus",
            value: `${ui.current.hot} / ${ui.current.active} / ${ui.current.focus}`,
          },
          { label: "Trạng thái", value: message },
        ]}
      />
      {stage >= 2 && <LayoutInspector lab={lab} selected={selected} onSelect={setSelected} />}
      <p>
        Canvas luôn dùng mặt phẳng 960×540; resize khung web chỉ đổi tỉ lệ hiển thị. Thanh chiều
        rộng mô phỏng constraint mà host cấp cho Panel. Native còn cấp
        width=clamp(windowWidth/3,220,420) khi resize. Control HTML là cách thao tác thay thế, không
        được đếm vào cây. {reduced && "Reduced motion đang bật: chỉ tiến từng bước."}
      </p>
    </div>
  );
}
export default function BoxLayoutLab({ mode }: { mode?: string }) {
  const stage = Math.max(1, Math.min(9, Number(mode?.split("-").pop()) || 9));
  return <LayoutLab key={stage} stage={stage} />;
}
