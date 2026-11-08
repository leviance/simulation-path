"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useSyncExternalStore,
  type KeyboardEvent,
  type PointerEvent,
} from "react";
import { CityController } from "@/lib/labs/million-object-city/controller";
import { renderCity } from "@/lib/labs/million-object-city/render";
import { canvasPoint, setupCanvas, useCanvasSize, useReducedMotion } from "./lab-shared";
import Readout from "./million-object-city/readout";
import type { InteractiveLabMode } from "./types";

export default function MillionObjectCityLab({ mode = "city" }: { mode?: InteractiveLabMode }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const controller = useMemo(() => new CityController(mode), [mode]);
  const state = useSyncExternalStore(
    controller.subscribe,
    controller.getSnapshot,
    controller.getSnapshot,
  );
  const size = useCanvasSize(canvasRef),
    reducedMotion = useReducedMotion();
  const release = (id = controller.getSnapshot().pointer, pick = false) => {
    if (id === null) return;
    controller.endPointer(id, pick ? size.width : undefined, pick ? size.height : undefined);
    if (canvasRef.current?.hasPointerCapture(id)) canvasRef.current.releasePointerCapture(id);
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
      controller.cancel();
    };
    const visibility = () => {
      if (document.hidden) stop();
    };
    const observer = new IntersectionObserver((entries) => {
      if (!entries[0]?.isIntersecting) stop();
    });
    // Controls and the fixture table belong to the same experiment. Scrolling
    // from the viewport down to a button must not cancel the job just started.
    const surface = canvas?.closest("section.interactive-lab") ?? canvas;
    if (surface) observer.observe(surface);
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
    const id = controller.getSnapshot().pointer;
    if (id !== null) {
      controller.endPointer(id);
      if (canvas?.hasPointerCapture(id)) canvas.releasePointerCapture(id);
    }
    controller.resize(size.width, size.height);
  }, [controller, size]);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const wheel = (event: WheelEvent) => {
      if (document.activeElement !== canvas) return;
      event.preventDefault();
      controller.move(-Math.sign(event.deltaY) * 6, 0, 0);
    };
    canvas.addEventListener("wheel", wheel, { passive: false });
    return () => canvas.removeEventListener("wheel", wheel);
  }, [controller]);
  useEffect(() => {
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    let frame = 0,
      previous: number | null = null,
      drawn = -1;
    const draw = (now: number) => {
      controller.tick(previous === null ? 0 : (now - previous) / 1000);
      previous = now;
      if (drawn !== controller.drawVersion) {
        setupCanvas(ctx, size);
        renderCity(ctx, controller.getSnapshot(), size.width, size.height);
        drawn = controller.drawVersion;
        if (canvasRef.current) canvasRef.current.dataset.renderState = "complete";
      }
      frame = requestAnimationFrame(draw);
    };
    frame = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(frame);
  }, [controller, size]);
  const down = (event: PointerEvent<HTMLCanvasElement>) => {
    const p = canvasPoint(event, event.currentTarget);
    if (!controller.beginPointer(event.pointerId, event.isPrimary, event.button, p.x, p.y)) return;
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
        "w",
        "s",
        "a",
        "d",
        "q",
        "e",
        "arrowleft",
        "arrowright",
        "arrowup",
        "arrowdown",
        " ",
        "r",
        "escape",
        "c",
        "f",
        "+",
        "=",
        "-",
      ].includes(key)
    )
      return;
    event.preventDefault();
    if (event.repeat && [" ", "r", "c", "f", "escape"].includes(key)) return;
    const speed = event.shiftKey ? 20 : 5;
    if (key === "w" || key === "s") controller.move(key === "w" ? speed : -speed, 0, 0);
    if (key === "a" || key === "d") controller.move(0, key === "a" ? -speed : speed, 0);
    if (key === "q" || key === "e") controller.move(0, 0, key === "q" ? -speed : speed);
    if (key === "arrowleft" || key === "arrowright")
      controller.look(key === "arrowleft" ? -10 : 10, 0);
    if (key === "arrowup" || key === "arrowdown") controller.look(0, key === "arrowup" ? -10 : 10);
    if (key === " ") {
      if (state.paused && !reducedMotion) controller.resume();
      else controller.pause();
    }
    if (key === "r") {
      release();
      controller.reset();
    }
    if (key === "escape") {
      release();
      controller.pause();
      controller.cancel();
    }
    if (key === "c") controller.toggleCulling();
    if (key === "f") controller.toggleDebug();
    if (["+", "=", "-"].includes(key)) controller.setFov(state.camera.fov + (key === "-" ? 3 : -3));
  };
  return (
    <>
      <canvas
        ref={canvasRef}
        className="lab-canvas"
        style={{ height: "clamp(360px, 56vw, 620px)", touchAction: "none" }}
        tabIndex={0}
        aria-label="Canvas Project 39: thành phố 3D, mẫu CPU nhỏ"
        onKeyDown={key}
        onPointerDown={down}
        onPointerMove={(event) => {
          const p = canvasPoint(event, event.currentTarget);
          controller.movePointer(event.pointerId, p.x, p.y);
        }}
        onPointerUp={(event) => release(event.pointerId, true)}
        onPointerCancel={(event) => release(event.pointerId)}
        onLostPointerCapture={(event) => controller.endPointer(event.pointerId)}
        onBlur={() => {
          release();
          controller.pause();
          controller.cancel();
        }}
      />
      <fieldset
        className="lab-controls"
        aria-label="Điều khiển thành phố 3D"
        disabled={!state.mounted}
        style={{ border: 0, padding: 0 }}
      >
        <button
          type="button"
          onClick={() => (state.paused ? controller.resume() : controller.pause())}
          disabled={(state.paused && reducedMotion) || state.validation.status === "running"}
        >
          {state.paused ? "Bay tiến tự động" : "Tạm dừng"}
        </button>
        <button
          type="button"
          onClick={() => {
            release();
            controller.reset();
          }}
        >
          Reset
        </button>
        <button
          type="button"
          onClick={() => {
            release();
            controller.preset("street");
          }}
        >
          Tầm đường phố
        </button>
        <button
          type="button"
          onClick={() => {
            release();
            controller.preset("overview");
          }}
        >
          Nhìn từ trên cao
        </button>
        <button
          type="button"
          aria-pressed={state.culling}
          onClick={() => controller.toggleCulling()}
        >
          Culling {state.culling ? "ON" : "OFF"}
        </button>
        <button type="button" aria-pressed={state.debug} onClick={() => controller.toggleDebug()}>
          Frustum debug
        </button>
        <label>
          Record CPU mẫu
          <select
            aria-label="Record CPU mẫu"
            value={state.objects.length}
            onChange={(e) => {
              release();
              controller.regenerate(Number(e.target.value), state.seed);
            }}
          >
            {[64, 257, 1024, 2049].map((n) => (
              <option key={n} value={n}>
                {n.toLocaleString("vi-VN")}
              </option>
            ))}
          </select>
        </label>
        <label>
          Seed
          <input
            aria-label="Seed thành phố"
            type="number"
            value={state.seed}
            min="0"
            max="1000000"
            onChange={(e) => {
              const seed = Number(e.target.value);
              if (Number.isSafeInteger(seed) && seed >= 0 && seed <= 1000000) {
                release();
                controller.regenerate(state.objects.length, seed);
              }
            }}
          />
        </label>
        <label>
          FOV {state.camera.fov}°
          <input
            aria-label="FOV thành phố"
            type="range"
            min="35"
            max="100"
            value={state.camera.fov}
            onChange={(e) => controller.setFov(Number(e.target.value))}
          />
        </label>
        <label>
          Object ID
          <input
            aria-label="Object ID"
            type="number"
            min="0"
            max={state.objects.length - 1}
            value={state.selected}
            onChange={(e) => controller.select(Number(e.target.value))}
          />
        </label>
        <button
          type="button"
          onClick={() => controller.validate()}
          disabled={state.validation.status === "running"}
        >
          Đối chiếu CPU 9 góc nhìn
        </button>
        <button
          type="button"
          onClick={() => controller.cancel()}
          disabled={state.validation.status !== "running"}
        >
          Hủy đối chiếu
        </button>
      </fieldset>
      <Readout state={state} />
      <p className="lab-hint">
        Kéo chuột để nhìn, WASD để đi, Q/E đổi độ cao; mũi tên xoay camera, Shift đi nhanh. Focus
        Canvas rồi cuộn để đi tới/lùi; +/− thay FOV, C đổi culling, F bật debug, R reset, Escape
        dừng/hủy. Space dừng/chạy chuyến bay; camera vẫn nhận thao tác khi đã dừng. Mô tả thay thế:
        thành phố gồm nhà hộp, nhà thu nhỏ phần đỉnh và mái nhọn, có các đại lộ giao nhau; vàng là
        bounds trong frustum trên bản đồ debug.
      </p>
    </>
  );
}
