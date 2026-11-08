"use client";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useSyncExternalStore,
  type KeyboardEvent,
  type PointerEvent,
} from "react";
import { ClothController } from "@/lib/labs/cloth-workshop/controller";
import { renderCloth } from "@/lib/labs/cloth-workshop/render";
import { canvasPoint, setupCanvas, useCanvasSize, useReducedMotion } from "./lab-shared";
import Controls from "./cloth-workshop/controls";
import Readout from "./cloth-workshop/readout";
import type { InteractiveLabMode } from "./types";
export default function ClothWorkshopLab({ mode = "surface" }: { mode?: InteractiveLabMode }) {
  const canvasRef = useRef<HTMLCanvasElement>(null),
    labRef = useRef<HTMLDivElement>(null);
  const controller = useMemo(() => new ClothController(mode), [mode]);
  const state = useSyncExternalStore(
    controller.subscribe,
    controller.getSnapshot,
    controller.getSnapshot,
  );
  const size = useCanvasSize(canvasRef),
    reducedMotion = useReducedMotion();
  const release = useCallback(
    (id = controller.getSnapshot().pointer) => {
      if (id === null) return;
      controller.endPointer(id);
      if (canvasRef.current?.hasPointerCapture(id)) canvasRef.current.releasePointerCapture(id);
    },
    [controller],
  );
  useEffect(() => {
    controller.mount();
    const canvas = canvasRef.current;
    const stop = () => {
      const id = controller.getSnapshot().pointer;
      controller.endPointer();
      if (id !== null && canvas?.hasPointerCapture(id)) canvas.releasePointerCapture(id);
      controller.pause();
      controller.cancelValidation("Đã hủy oracle khi lab/cửa sổ không còn hoạt động.");
    };
    const visibility = () => {
      if (document.hidden) stop();
    };
    // Observe the complete lab: scrolling from canvas down to controls is not leaving it.
    const observer = new IntersectionObserver((entries) => {
      if (!entries[0]?.isIntersecting) stop();
    });
    if (labRef.current) observer.observe(labRef.current);
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
      event.preventDefault();
      controller.zoom(-Math.sign(event.deltaY));
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
      if (!current.paused || current.validation.status === "running")
        controller.tick(last === null ? 0 : (now - last) / 1000, now);
      last = now;
      if (drawn !== controller.drawVersion) {
        setupCanvas(ctx, size);
        renderCloth(ctx, controller.getSnapshot(), size.width, size.height);
        drawn = controller.drawVersion;
        canvas.dataset.renderState = "complete";
        canvas.dataset.tick = String(controller.getSnapshot().tick);
      }
      frame = requestAnimationFrame(draw);
    };
    frame = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(frame);
  }, [controller, size]);
  useEffect(() => {
    release();
  }, [release, size]);
  const down = (event: PointerEvent<HTMLCanvasElement>) => {
    const p = canvasPoint(event, event.currentTarget);
    if (
      !controller.beginPointer(
        event.pointerId,
        event.isPrimary,
        event.button,
        p.x,
        p.y,
        size.width,
        size.height,
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
    if (event.altKey || event.metaKey || event.ctrlKey) return;
    const key = event.key.toLowerCase();
    if (
      ![
        " ",
        "n",
        "r",
        "escape",
        "arrowleft",
        "arrowright",
        "arrowup",
        "arrowdown",
        "+",
        "=",
        "-",
        "[",
        "]",
        "p",
        "backspace",
      ].includes(key)
    )
      return;
    event.preventDefault();
    if (event.repeat && [" ", "n", "r", "p"].includes(key)) return;
    if (key === " " && (!state.paused || !reducedMotion)) controller.toggle();
    if (key === "n") controller.step();
    if (key === "r") {
      release();
      controller.reset();
    }
    if (key === "p") controller.togglePin();
    if (key === "escape") {
      release();
      controller.pause();
      controller.cancelValidation();
    }
    if (key === "[" || key === "]") controller.select(state.selected + (key === "[" ? -1 : 1));
    if (key === "backspace") controller.resetCamera();
    if (["+", "=", "-"].includes(key)) controller.zoom(key === "-" ? -1 : 1);
    if (key.startsWith("arrow"))
      controller.moveCamera(
        key === "arrowleft" ? -12 : key === "arrowright" ? 12 : 0,
        key === "arrowup" ? -12 : key === "arrowdown" ? 12 : 0,
        event.shiftKey,
      );
  };
  return (
    <div ref={labRef} data-testid="cloth-workshop-lab">
      <canvas
        ref={canvasRef}
        className="lab-canvas"
        style={{ height: "clamp(360px, 58vw, 620px)", touchAction: "none" }}
        tabIndex={0}
        aria-label="Canvas Project 40: xưởng vải 3D, mẫu CPU XPBD"
        onKeyDown={key}
        onPointerDown={down}
        onPointerMove={(event) => {
          const p = canvasPoint(event, event.currentTarget);
          controller.movePointer(event.pointerId, p.x, p.y);
        }}
        onPointerUp={(event) => release(event.pointerId)}
        onPointerCancel={(event) => release(event.pointerId)}
        onLostPointerCapture={(event) => controller.endPointer(event.pointerId)}
        onBlur={() => release()}
        onContextMenu={(event) => event.preventDefault()}
      >
        Tấm vải tam giác 3D có hai góc ghim, chịu gravity/gió, được giải XPBD CPU với
        sphere/capsule/plane. Dùng các nút để bước đơn, chọn ID, ghim và kéo ID bằng bàn phím; số
        liệu bên dưới là mô tả thay thế.
      </canvas>
      <Controls
        controller={controller}
        state={state}
        reducedMotion={reducedMotion}
        release={release}
      />
      <Readout state={state} />
      <p className="lab-hint">
        Camera: kéo orbit; Shift-kéo/chuột phải pan; focus Canvas rồi cuộn hoặc +/− để zoom. Chọn
        công cụ Kéo vùng vải hoặc Ghim bằng click trước khi tác động mesh. Mũi tên/Shift-mũi tên:
        orbit/pan; [ / ]: chọn ID; P: ghim; Space: chạy/dừng; N: bước đơn; R: Reset; Backspace:
        camera ban đầu; Escape: dừng và hủy. Chế độ reduced motion giữ Pause, bước đơn và camera vẫn
        dùng được. Mô tả thay thế: mặt vải hai phía xanh/đất nung với ô dệt, ghim vàng và probe
        XYZ/strain/contact bên trên.
      </p>
    </div>
  );
}
