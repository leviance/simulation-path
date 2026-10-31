"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useSyncExternalStore,
  type KeyboardEvent,
  type PointerEvent,
} from "react";
import { ChamberController } from "@/lib/labs/charged-particle-chamber/controller";
import { renderChamber } from "@/lib/labs/charged-particle-chamber/render";
import { canvasPoint, setupCanvas, useCanvasSize, useReducedMotion } from "./lab-shared";
import Controls from "./charged-particle-chamber/controls";
import Readout from "./charged-particle-chamber/readout";
import type { InteractiveLabMode } from "./types";

export default function ChargedParticleChamberLab({
  mode = "charged-chamber",
}: {
  mode?: InteractiveLabMode;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const controller = useMemo(() => new ChamberController(mode), [mode]);
  const state = useSyncExternalStore(
    controller.subscribe,
    controller.getSnapshot,
    controller.getSnapshot,
  );
  const size = useCanvasSize(canvasRef);
  const reducedMotion = useReducedMotion();
  const release = (id = controller.getSnapshot().pointer, pick = false) => {
    if (id === null) return;
    controller.endPointer(id, pick ? size.width : undefined, pick ? size.height : undefined);
    if (canvasRef.current?.hasPointerCapture(id)) canvasRef.current.releasePointerCapture(id);
  };
  const reset = () => {
    release();
    controller.reset();
  };

  useEffect(() => {
    controller.mount();
    const canvas = canvasRef.current;
    const stop = () => {
      const id = controller.getSnapshot().pointer;
      if (id !== null) {
        controller.endPointer(id);
        if (canvas?.hasPointerCapture(id)) canvas.releasePointerCapture(id);
      }
      controller.pause();
      controller.cancelComparison("Đã hủy khi tab/cửa sổ không còn hoạt động.");
    };
    const visibility = () => {
      if (document.hidden) stop();
    };
    const observer = new IntersectionObserver((entries) => {
      if (!entries[0]?.isIntersecting) stop();
    });
    if (canvas) observer.observe(canvas);
    window.addEventListener("blur", stop);
    document.addEventListener("visibilitychange", visibility);
    return () => {
      observer.disconnect();
      stop();
      controller.dispose();
      window.removeEventListener("blur", stop);
      document.removeEventListener("visibilitychange", visibility);
    };
  }, [controller]);
  useEffect(() => {
    if (reducedMotion) controller.pause();
  }, [controller, reducedMotion]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const wheel = (event: WheelEvent) => {
      if (document.activeElement !== canvas) return;
      // React's delegated wheel listener may be passive. Only the focused lab
      // consumes scrolling; elsewhere the learner can scroll the lesson normally.
      event.preventDefault();
      controller.zoomCamera(-Math.sign(event.deltaY));
    };
    canvas.addEventListener("wheel", wheel, { passive: false });
    return () => canvas.removeEventListener("wheel", wheel);
  }, [controller]);
  useEffect(() => {
    const canvas = canvasRef.current,
      ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    let frame = 0,
      last: number | null = null,
      drawn = -1;
    const draw = (now: number) => {
      const current = controller.getSnapshot();
      if (!current.paused || current.comparison.status === "running") {
        controller.tick(last === null ? 0 : (now - last) / 1000);
      }
      last = now;
      if (drawn !== controller.drawVersion) {
        setupCanvas(ctx, size);
        renderChamber(ctx, controller.getSnapshot(), size.width, size.height);
        drawn = controller.drawVersion;
        canvas.dataset.renderState = "complete";
      }
      frame = requestAnimationFrame(draw);
    };
    frame = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(frame);
  }, [controller, size]);
  useEffect(() => {
    const id = controller.getSnapshot().pointer;
    if (id !== null) {
      controller.endPointer(id);
      const canvas = canvasRef.current;
      if (canvas?.hasPointerCapture(id)) canvas.releasePointerCapture(id);
    }
  }, [controller, size]);
  const down = (event: PointerEvent<HTMLCanvasElement>) => {
    const point = canvasPoint(event, event.currentTarget);
    if (
      !controller.beginPointer(
        event.pointerId,
        event.isPrimary,
        event.button,
        point.x,
        point.y,
        event.shiftKey,
      )
    )
      return;
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      controller.endPointer(event.pointerId);
      return;
    }
    event.preventDefault();
    event.currentTarget.focus();
  };
  const key = (event: KeyboardEvent<HTMLCanvasElement>) => {
    if (event.ctrlKey || event.metaKey || event.altKey) return;
    const key = event.key.toLowerCase();
    if (
      ![
        " ",
        "n",
        "r",
        "escape",
        "i",
        "j",
        "k",
        "l",
        "arrowleft",
        "arrowright",
        "arrowup",
        "arrowdown",
        "+",
        "=",
        "-",
        "[",
        "]",
        "f",
        "backspace",
      ].includes(key)
    )
      return;
    event.preventDefault();
    if (event.repeat && [" ", "n", "r"].includes(key)) return;
    if (key === " ") {
      if (!state.paused) controller.pause();
      else if (!reducedMotion) controller.resume();
    }
    if (key === "n") controller.step();
    if (key === "r") reset();
    if (key === "escape") {
      release();
      controller.pause();
      controller.cancelComparison();
    }
    if (key === "[" || key === "]") controller.select(state.selected + (key === "[" ? -1 : 1));
    if (key === "f") controller.focusSelected();
    if (key === "backspace") controller.resetCamera();
    if (["+", "=", "-"].includes(key)) controller.zoomCamera(key === "-" ? -1 : 1);
    if (["j", "arrowleft", "l", "arrowright", "i", "arrowup", "k", "arrowdown"].includes(key)) {
      const dx = ["j", "arrowleft"].includes(key)
        ? -12
        : ["l", "arrowright"].includes(key)
          ? 12
          : 0;
      const dy = ["i", "arrowup"].includes(key) ? -12 : ["k", "arrowdown"].includes(key) ? 12 : 0;
      controller.moveCamera(dx, dy, event.shiftKey);
    }
  };
  return (
    <>
      <canvas
        ref={canvasRef}
        className="lab-canvas"
        style={{ height: "clamp(340px, 55vw, 600px)", touchAction: "none" }}
        tabIndex={0}
        aria-label="Canvas Project 38: buồng hạt tích điện 3D, bản minh họa CPU"
        onKeyDown={key}
        onPointerDown={down}
        onPointerMove={(event) => {
          const p = canvasPoint(event, event.currentTarget);
          controller.movePointer(event.pointerId, p.x, p.y);
        }}
        onPointerUp={(event) => release(event.pointerId, true)}
        onPointerCancel={(event) => release(event.pointerId)}
        onLostPointerCapture={(event) => controller.endPointer(event.pointerId)}
        onContextMenu={(event) => event.preventDefault()}
      />
      <Controls controller={controller} state={state} reducedMotion={reducedMotion} reset={reset} />
      <Readout state={state} />
      <p className="lab-hint">
        Kéo để orbit; Shift-kéo hoặc chuột phải để pan; focus Canvas rồi cuộn để zoom. Click chọn
        một trong các ID mẫu CPU. IJKL/mũi tên: camera; Shift: pan; +/−: zoom; [ / ]: ID; F: focus;
        Backspace: góc nhìn ban đầu; Space: chạy/dừng; N: một bước; R: Reset; Escape: hủy. Đổi
        camera không đổi state mô phỏng.
      </p>
    </>
  );
}
