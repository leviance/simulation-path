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
  add,
  buildTree,
  find,
  remove,
  reconcile,
  setVisible,
  setEnabled,
  createUi,
  createModel,
  advance,
  stepPhysics,
  setPaused,
  setGravity,
  resetSimulation,
  hitTest,
  pointerDown,
  pointerMove,
  pointerUp,
  keyDown,
  cancel,
  movePanel,
  focusOrder,
  windowToLogical,
  audit,
  presetNames,
  activate,
  locate,
  type Point,
} from "@/lib/labs/widget-tree";
import {
  canvasPoint,
  useCanvasSize,
  useReducedMotion,
  usePauseOnReducedMotion,
  LabReadout,
} from "./lab-shared";
import { draw } from "./widget-tree/draw";
import { TreeInspector } from "./widget-tree/inspector";

function TreeLab({ stage }: { stage: number }) {
  const canvas = useRef<HTMLCanvasElement>(null),
    size = useCanvasSize(canvas),
    help = useId(),
    reduced = useReducedMotion();
  const [state, setState] = useState(() => buildTree(stage)),
    model = useRef(createModel()),
    ui = useRef(createUi());
  const pointer = useRef<number | null>(null),
    builds = useRef(1),
    frames = useRef(0),
    extras = useRef(0);
  const [version, setVersion] = useState(0),
    [running, setRunning] = useState(false),
    [preset, setPreset] = useState(0),
    [selected, setSelected] = useState(1),
    [message, setMessage] = useState("Cây được tạo một lần; N tiến một bước vật lý.");
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
  const cancelGesture = useCallback(() => {
    cancel(ui.current);
    release();
    publish();
  }, [release, publish]);
  const stop = useCallback(() => {
    cancel(ui.current);
    release();
    setPaused(model.current, true);
    model.current.accumulator = 0;
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
    if (ctx) {
      draw(ctx, size, state.tree, model.current, ui.current, stage);
      frames.current++;
    }
  }, [state, stage, size, version]);
  const point = (e: PointerEvent<HTMLCanvasElement>) =>
    windowToLogical(canvasPoint(e, e.currentTarget), size.width, size.height);
  const down = (e: PointerEvent<HTMLCanvasElement>) => {
    if (e.button !== 0 || pointer.current !== null) return;
    const p = point(e);
    if (!p) return;
    e.preventDefault();
    e.currentTarget.focus({ preventScroll: true });
    const consumed = pointerDown(state.tree, model.current, ui.current, p, stage);
    if (stage >= 5 && !consumed && p.x >= 24 && p.x < 640 && p.y >= 24 && p.y < 516) {
      model.current.y = Math.max(48, Math.min(446, p.y));
      model.current.velocity = 0;
      model.current.accumulator = 0;
      model.current.scenePresses++;
      model.current.clockRevision++;
    }
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
      pointerMove(state.tree, model.current, ui.current, p, stage);
      publish();
    }
  };
  const up = (e: PointerEvent<HTMLCanvasElement>) => {
    if (e.button !== 0 || pointer.current !== e.pointerId) return;
    const p = point(e);
    if (p) pointerUp(state.tree, model.current, ui.current, p, stage);
    else cancel(ui.current);
    release();
    if (reduced) setPaused(model.current, true);
    publish();
  };
  const cancelled = (e: PointerEvent<HTMLCanvasElement>) => {
    if (pointer.current === e.pointerId) cancelGesture();
  };
  const changeTree = (index: number) => {
    stop();
    ui.current = createUi();
    setState(buildTree(stage, index));
    setPreset(index);
    setSelected(1);
    builds.current++;
    extras.current = 0;
    setMessage("Đã dựng cây mới; giữ vị trí, vận tốc và gravity của cảnh, tạm dừng vật lý.");
    publish();
  };
  const mutation = (operation: () => void) => {
    stop();
    try {
      operation();
      reconcile(state.tree, ui.current, stage);
      if (!find(state.tree.root, selected)) setSelected(1);
      setMessage("Đã sửa cây; ID còn lại không đổi, active/focus đã được đối chiếu.");
    } catch (e) {
      setMessage(String(e));
    }
    publish();
  };
  const keyboard = (e: KeyboardEvent<HTMLCanvasElement>) => {
    if (e.shiftKey && stage >= 2 && e.key.startsWith("Arrow")) {
      e.preventDefault();
      cancelGesture();
      movePanel(
        state.tree,
        e.key === "ArrowRight" ? 4 : e.key === "ArrowLeft" ? -4 : 0,
        e.key === "ArrowDown" ? 4 : e.key === "ArrowUp" ? -4 : 0,
      );
      publish();
      return;
    }
    if (stage >= 6 && e.key === "Tab") {
      const order = focusOrder(state.tree, stage),
        i = order.indexOf(ui.current.focus);
      if (!order.length || (!e.shiftKey && i === order.length - 1) || (e.shiftKey && i <= 0)) {
        cancelGesture();
        ui.current.focus = 0;
        publish();
        return;
      }
    }
    let consumed = keyDown(
      state.tree,
      model.current,
      ui.current,
      e.key,
      e.shiftKey,
      e.repeat,
      stage,
    );
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
  const m = model.current,
    tree = state.tree,
    group = find(tree.root, state.group);
  const guardButtonRepeat = (e: KeyboardEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    if (e.repeat && (e.key === "Enter" || e.key === " ") && target.tagName === "BUTTON")
      e.preventDefault();
  };
  const action = (id: number) => {
    cancelGesture();
    activate(tree, m, id, stage);
    if (reduced) setPaused(m, true);
    publish();
  };
  const available = (id: number) => locate(tree, id, stage)?.enabled === true;
  const pointerAt = (p: Point) => hitTest(tree, p, stage);
  return (
    <div
      className="lab-body"
      onKeyDownCapture={guardButtonRepeat}
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
          ? "Các node được vẽ nhưng chưa nhận hover/click."
          : stage < 5
            ? "Hover xem ID; click chưa tạo action."
            : "Nhấn/thả cùng Button để kích hoạt, kéo Slider để chỉnh gravity."}{" "}
        {stage >= 2 && "Shift+mũi tên dịch cả Panel, tọa độ con không đổi. "}
        {stage >= 6
          ? "Tab/Shift+Tab chọn control; Enter/Space nhấn, ←/→ và Home/End chỉnh Slider. Tab ở hai đầu thoát Canvas."
          : "Space chạy/dừng cảnh, N tiến một bước."}{" "}
        Esc hủy kéo.
      </p>
      <div className="lab-controls">
        <button
          type="button"
          disabled={reduced}
          onClick={() => {
            cancelGesture();
            setPaused(m, !m.paused);
            publish();
          }}
        >
          {m.paused ? "Chạy cảnh" : "Tạm dừng"}
        </button>
        <button
          type="button"
          onClick={() => {
            cancelGesture();
            resetSimulation(m);
            publish();
          }}
        >
          Reset cảnh (giữ cây)
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
        <button type="button" onClick={() => changeTree(0)}>
          Dựng lại cây
        </button>
        {stage >= 2 && (
          <label>
            Preset{" "}
            <select value={preset} onChange={(e) => changeTree(Number(e.target.value))}>
              {presetNames.map((name, i) =>
                (i === 1 && stage < 3) || (i === 2 && stage < 4) ? null : (
                  <option key={i} value={i}>
                    {name}
                  </option>
                ),
              )}
            </select>
          </label>
        )}
        {stage >= 2 && (
          <>
            <button
              type="button"
              onClick={() => {
                cancelGesture();
                movePanel(tree, -16, 0);
                publish();
              }}
            >
              Panel ←
            </button>
            <button
              type="button"
              onClick={() => {
                cancelGesture();
                movePanel(tree, 16, 0);
                publish();
              }}
            >
              Panel →
            </button>
          </>
        )}
        {stage >= 5 && (
          <>
            <button
              type="button"
              disabled={!available(state.pause)}
              onClick={() => action(state.pause)}
            >
              Button Pause #{state.pause}
            </button>
            <label>
              Slider gravity (HTML thay thế)
              <input
                type="range"
                min="0"
                max="1200"
                step="20"
                value={m.gravity}
                disabled={!available(state.slider)}
                onChange={(e) => {
                  cancelGesture();
                  setGravity(m, Number(e.target.value));
                  publish();
                }}
              />
            </label>
          </>
        )}
        {stage >= 7 && (
          <>
            <button
              type="button"
              disabled={!group}
              onClick={() => mutation(() => setVisible(tree, state.group, !group?.visible))}
            >
              {group?.visible ? "Ẩn" : "Hiện"} nhóm control
            </button>
            <button
              type="button"
              disabled={!group}
              onClick={() => mutation(() => setEnabled(tree, state.group, !group?.enabled))}
            >
              {group?.enabled ? "Vô hiệu hóa" : "Bật"} nhóm control
            </button>
            <button
              type="button"
              disabled={!group}
              onClick={() =>
                mutation(() => {
                  remove(tree, state.group);
                })
              }
            >
              Xóa nhóm control
            </button>
            <button
              type="button"
              disabled={extras.current >= 4}
              onClick={() =>
                mutation(() => {
                  add(
                    tree,
                    1,
                    "Label",
                    { x: 24, y: 310 + extras.current * 20, width: 224, height: 16 },
                    "Added Label",
                  );
                  extras.current++;
                })
              }
            >
              Thêm Label
            </button>
          </>
        )}
        {stage >= 8 && (
          <button
            type="button"
            onClick={() => {
              stop();
              try {
                setMessage(`PASS: ${audit(tree, ui.current)} node; chỉ kiểm state hiện tại.`);
              } catch (e) {
                setMessage(String(e));
              }
            }}
          >
            Kiểm cây hiện tại
          </button>
        )}
      </div>
      <canvas
        ref={canvas}
        width={760}
        height={428}
        style={{ width: "100%", height: 428, touchAction: "none" }}
        tabIndex={0}
        role="application"
        aria-label="Widget Tree Lab"
        aria-describedby={help}
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
        onPointerCancel={cancelled}
        onLostPointerCapture={cancelled}
        onPointerLeave={() => {
          if (pointer.current === null) {
            ui.current.hot = 0;
            publish();
          }
        }}
        onKeyDown={keyboard}
      />
      <LabReadout
        items={[
          { label: "Node / số lần dựng cây", value: `${tree.count} / ${builds.current}` },
          {
            label: "Hot / Active / Focus (ID)",
            value: `${ui.current.hot} / ${ui.current.active} / ${ui.current.focus}`,
          },
          {
            label: "Gravity / ticks / frame vẽ",
            value: `${m.gravity.toFixed(0)} / ${m.ticks} / ${frames.current}`,
          },
          { label: "ID tại pixel (700,90)", value: pointerAt({ x: 700, y: 90 }) },
          { label: "Trạng thái", value: message },
        ]}
      />
      <TreeInspector tree={tree} stage={stage} selected={selected} onSelect={setSelected} />
      <p>
        Reset cảnh không dựng lại cây. Dựng lại cây/preset giữ trạng thái vật lý nhưng tạm dừng và
        xóa trạng thái input; ID được bắt đầu lại trong phiên cây mới. Các nút Chạy/Reset/Một bước
        là công cụ thí nghiệm HTML, không phải node trong cây SDL. Label không nhận input; Panel và
        control bị disable vẫn chặn click xuống cảnh. Blur, resize, ẩn tab hoặc reduced-motion hủy
        gesture; reduced-motion chỉ dùng bước tay. Không lưu cây qua reload.
      </p>
    </div>
  );
}
export default function WidgetTreeLab({ mode }: { mode?: string }) {
  const parsed = Number(mode?.split("-").at(-1)),
    stage = Number.isInteger(parsed) && parsed >= 1 && parsed <= 8 ? parsed : 8;
  return <TreeLab key={stage} stage={stage} />;
}
