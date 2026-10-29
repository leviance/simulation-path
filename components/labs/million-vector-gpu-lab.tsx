"use client";

import {
  lazy,
  Suspense,
  useEffect,
  useMemo,
  useRef,
  useSyncExternalStore,
  type KeyboardEvent,
  type PointerEvent,
} from "react";
import { VectorLabController, labView } from "@/lib/labs/million-vector-gpu/controller";
import { renderVectorLab } from "@/lib/labs/million-vector-gpu/render";
import { canvasPoint, setupCanvas, useCanvasSize, useReducedMotion } from "./lab-shared";
import type { InteractiveLabMode } from "./types";

const Controls = lazy(() => import("./million-vector-gpu/controls"));
const Readout = lazy(() => import("./million-vector-gpu/readout"));

const subscribeHydration = () => () => {};
const clientReady = () => true;
const serverReady = () => false;

export default function MillionVectorGpuLab({
  mode = "vector-gpu-final",
}: {
  mode?: InteractiveLabMode;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const controller = useMemo(() => new VectorLabController(mode), [mode]);
  const state = useSyncExternalStore(
    controller.subscribe,
    controller.getSnapshot,
    controller.getSnapshot,
  );
  const size = useCanvasSize(canvasRef);
  const reducedMotion = useReducedMotion();
  const ready = useSyncExternalStore(subscribeHydration, clientReady, serverReady);

  const release = (pointer = controller.getSnapshot().pointer) => {
    if (pointer === null || !controller.endPointer(pointer)) return;
    const canvas = canvasRef.current;
    if (canvas?.hasPointerCapture(pointer)) canvas.releasePointerCapture(pointer);
  };
  const reset = () => {
    release();
    controller.reset();
  };

  useEffect(() => {
    controller.mount();
    const canvas = canvasRef.current;
    const stop = () => {
      const pointer = controller.getSnapshot().pointer;
      if (pointer !== null) {
        controller.endPointer(pointer);
        if (canvas?.hasPointerCapture(pointer)) canvas.releasePointerCapture(pointer);
      }
      controller.pause();
    };
    const visibility = () => {
      if (document.hidden) stop();
    };
    window.addEventListener("blur", stop);
    document.addEventListener("visibilitychange", visibility);
    return () => {
      stop();
      controller.dispose();
      window.removeEventListener("blur", stop);
      document.removeEventListener("visibilitychange", visibility);
    };
  }, [controller]);

  useEffect(() => {
    const pointer = controller.getSnapshot().pointer;
    if (pointer !== null) {
      controller.endPointer(pointer);
      const canvas = canvasRef.current;
      if (canvas?.hasPointerCapture(pointer)) canvas.releasePointerCapture(pointer);
    }
    controller.resize(size.width, size.height);
  }, [controller, size.width, size.height, size.dpr]);
  useEffect(() => {
    if (reducedMotion) controller.pause();
  }, [controller, reducedMotion]);

  useEffect(() => {
    if (state.paused || reducedMotion) return;
    let frame = 0;
    let last: number | null = null;
    const tick = (now: number) => {
      if (last !== null) controller.tick(now - last);
      last = now;
      if (!controller.getSnapshot().paused) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [controller, state.paused, reducedMotion]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;
    setupCanvas(context, size);
    renderVectorLab(context, { ...state, viewportWidth: size.width, viewportHeight: size.height });
    canvas.dataset.renderState = ready ? "complete" : "mounting";
  }, [state, size, ready]);

  const point = (event: PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const position = canvasPoint(event, canvas);
    controller.selectPoint(event.pointerId, position.x, position.y);
  };
  const down = (event: PointerEvent<HTMLCanvasElement>) => {
    if (!controller.beginPointer(event.pointerId, event.isPrimary, event.button)) return;
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      controller.endPointer(event.pointerId);
      return;
    }
    event.currentTarget.focus();
    event.preventDefault();
    point(event);
  };
  const keyboard = (event: KeyboardEvent<HTMLCanvasElement>) => {
    if (event.ctrlKey || event.metaKey || event.altKey) return;
    const current = controller.getSnapshot();
    const key = event.key.toLowerCase();
    if (
      ![
        " ",
        "escape",
        "r",
        "n",
        "arrowleft",
        "arrowright",
        "home",
        "end",
        "pageup",
        "pagedown",
        "1",
        "2",
        "3",
      ].includes(key)
    )
      return;
    event.preventDefault();
    if (event.repeat && [" ", "r", "n"].includes(key)) return;
    if (key === "r") reset();
    else if (key === "escape") {
      release();
      controller.pause();
    } else if (key === "n") controller.step();
    else if (key === " ") {
      if (!current.paused) controller.pause();
      else if (!reducedMotion) controller.resume();
    } else if (labView(current.mode) === "group") {
      if (key === "arrowleft" || key === "arrowright")
        controller.configure({
          selectedLane: current.selectedLane + (key === "arrowleft" ? -1 : 1),
        });
      if (key === "home") controller.configure({ selectedLane: 0 });
      if (key === "end") controller.configure({ selectedLane: current.localSize - 1 });
    } else {
      if (key === "arrowleft" || key === "arrowright")
        controller.configure({
          selectedIndex: current.selectedIndex + (key === "arrowleft" ? -1 : 1),
        });
      if (key === "pageup" || key === "pagedown")
        controller.configure({
          selectedIndex: current.selectedIndex + (key === "pageup" ? 1024 : -1024),
        });
      if (key === "home") controller.configure({ selectedIndex: 0 });
      if (key === "end") controller.configure({ selectedIndex: current.elementCount - 1 });
      if (key === "1") controller.configure({ operation: "add" });
      if (key === "2") controller.configure({ operation: "axpy" });
      if (key === "3") controller.configure({ operation: "difference" });
    }
  };

  return (
    <>
      <canvas
        ref={canvasRef}
        className="lab-canvas"
        tabIndex={0}
        aria-label="Canvas Project 37: Vec4, workgroup và phạm vi đo compute"
        onKeyDown={keyboard}
        onPointerDown={down}
        onPointerMove={point}
        onPointerUp={(event) => release(event.pointerId)}
        onPointerCancel={(event) => release(event.pointerId)}
        onLostPointerCapture={(event) => controller.endPointer(event.pointerId)}
        onBlur={() => {
          release();
          controller.pause();
        }}
      />
      <Suspense fallback={<p role="status">Đang tải điều khiển mô hình…</p>}>
        <Controls
          controller={controller}
          state={state}
          reducedMotion={reducedMotion}
          ready={ready}
          reset={reset}
        />
      </Suspense>
      <Suspense fallback={<p role="status">Đang tải phần giải thích…</p>}>
        <Readout state={state} reducedMotion={reducedMotion} />
      </Suspense>
      <p className="lab-hint">
        Chọn đúng ô lane bằng chuột; kéo ngang để chọn index trong bài dữ liệu. Mũi tên, Home/End,
        Page Up/Down chọn phần tử; N tiến một bước, Space chạy/dừng lượt minh họa hữu hạn, R đặt
        lại, Escape hủy kéo và dừng. Local size native cố định 256; các cỡ khác ở Canvas chỉ để học
        phép chia group. Reduced motion không tự chạy.
      </p>
    </>
  );
}
