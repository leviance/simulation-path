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
import { defaultCamera, orbit, pan, zoom } from "@/lib/labs/geometry-workshop/camera";
import type { Mesh } from "@/lib/labs/geometry-workshop/mesh";
import { MeshSession } from "@/lib/labs/geometry-workshop/session";
import {
  presetSettings,
  thicknessLimit,
  type SurfaceKind,
  type SurfaceSettings,
} from "@/lib/labs/geometry-workshop/settings";
import {
  geometryMode,
  initialView,
  modeShapes,
  probeAtFace,
  type GeometryMode,
} from "@/lib/labs/geometry-workshop/view";
import {
  canvasPoint,
  useCanvasSize,
  usePauseOnReducedMotion,
  useReducedMotion,
} from "./lab-shared";
import { GeometryControls } from "./geometry-workshop/controls";
import { paintGeometry, type RasterLayer } from "./geometry-workshop/paint";
import { GeometryReadout } from "./geometry-workshop/readout";
import type { InteractiveLabMode } from "./types";

interface CameraDrag {
  id: number;
  x: number;
  y: number;
  travelled: number;
  pan: boolean;
}

function Workshop({ mode }: { mode: GeometryMode }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const paintRef = useRef<{ layer: RasterLayer; mesh: Mesh } | null>(null);
  const dragRef = useRef<CameraDrag | null>(null);
  const sliderRef = useRef<number | null>(null);
  const holdRef = useRef(false);
  const hintId = useId();
  const size = useCanvasSize(canvasRef);
  const reducedMotion = useReducedMotion();
  const [session, setSession] = useState(() => new MeshSession(presetSettings(modeShapes[mode])));
  const [state, setState] = useState(() => session.read());
  const [view, setView] = useState(() => initialView(mode));
  const [held, setHeld] = useState(false);
  const [paused, setPaused] = useState(false);
  const [spinning, setSpinning] = useState(false);
  const [visible, setVisible] = useState(true);
  const stopSpin = useCallback(() => setSpinning(false), []);
  usePauseOnReducedMotion(stopSpin);

  const refresh = useCallback(() => setState(session.read()), [session]);
  const displayed = state.displayed;

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      const context = canvasRef.current?.getContext("2d");
      if (!context) return;
      const layer = paintGeometry(
        context,
        size,
        displayed,
        mode,
        view,
        paintRef.current?.layer ?? null,
      );
      paintRef.current = layer ? { layer, mesh: displayed } : null;
    });
    return () => cancelAnimationFrame(frame);
  }, [displayed, mode, size, view]);

  useEffect(() => {
    if (!state.requested || !session.canAdvance || (paused && !session.previewPending)) return;
    const frame = requestAnimationFrame(() => {
      if (session.advance()) refresh();
    });
    return () => cancelAnimationFrame(frame);
  }, [paused, refresh, session, state]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry) setVisible(entry.isIntersecting);
    });
    observer.observe(canvas);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!spinning || reducedMotion || !visible) return;
    let previous = 0;
    let frame = 0;
    function animate(now: number) {
      if (now - previous >= 33) {
        let elapsed = 0;
        if (previous > 0) elapsed = Math.min(50, now - previous);
        previous = now;
        if (elapsed > 0)
          setView((current) => ({ ...current, camera: orbit(current.camera, elapsed * 0.045, 0) }));
      }
      frame = requestAnimationFrame(animate);
    }
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [reducedMotion, spinning, visible]);

  const releaseViewport = useCallback((pointerId?: number) => {
    const drag = dragRef.current;
    if (!drag || (pointerId !== undefined && pointerId !== drag.id)) return;
    dragRef.current = null;
    const canvas = canvasRef.current;
    if (canvas?.hasPointerCapture(drag.id)) canvas.releasePointerCapture(drag.id);
  }, []);

  useEffect(() => {
    // A native range input can release outside its box. Track only its original pointer.
    const finishSlider = (event: globalThis.PointerEvent) => {
      if (sliderRef.current !== event.pointerId) return;
      sliderRef.current = null;
      if (!holdRef.current) session.finishInteraction();
      refresh();
    };
    const blur = () => {
      releaseViewport();
      sliderRef.current = null;
      holdRef.current = false;
      setHeld(false);
      stopSpin();
      session.finishInteraction();
      refresh();
    };
    window.addEventListener("pointerup", finishSlider, true);
    window.addEventListener("pointercancel", finishSlider, true);
    window.addEventListener("blur", blur);
    return () => {
      window.removeEventListener("pointerup", finishSlider, true);
      window.removeEventListener("pointercancel", finishSlider, true);
      window.removeEventListener("blur", blur);
    };
  }, [refresh, releaseViewport, session, stopSpin]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const wheel = (event: WheelEvent) => {
      // Scrolling still works normally unless the user has focused the viewport.
      if (document.activeElement !== canvas || event.ctrlKey) return;
      event.preventDefault();
      if (event.deltaY !== 0) {
        stopSpin();
        setView((current) => ({
          ...current,
          camera: zoom(current.camera, -Math.sign(event.deltaY)),
        }));
      }
    };
    canvas.addEventListener("wheel", wheel, { passive: false });
    return () => canvas.removeEventListener("wheel", wheel);
  }, [stopSpin]);

  function updateGeometry(patch: Partial<SurfaceSettings>) {
    const current = session.read();
    const next = { ...(current.requested ?? current.lastGood.settings), ...patch };
    if (patch.radius !== undefined) {
      const limit = Math.floor(thicknessLimit(next.kind, next.radius) * 100) / 100;
      next.thickness = Math.min(next.thickness, limit);
    }
    session.request(next, holdRef.current || sliderRef.current !== null);
    refresh();
  }

  function chooseKind(kind: SurfaceKind) {
    releaseViewport();
    sliderRef.current = null;
    session.request(presetSettings(kind), holdRef.current);
    refresh();
  }

  function startSlider(pointerId: number) {
    sliderRef.current = pointerId;
    session.setInteraction(true);
    refresh();
  }

  function toggleHold() {
    const next = !holdRef.current;
    holdRef.current = next;
    setHeld(next);
    session.setInteraction(next || sliderRef.current !== null);
    refresh();
  }

  function cancelBuild() {
    sliderRef.current = null;
    holdRef.current = false;
    setHeld(false);
    session.cancel();
    refresh();
  }

  function reset() {
    releaseViewport();
    sliderRef.current = null;
    holdRef.current = false;
    setHeld(false);
    setPaused(false);
    stopSpin();
    const next = new MeshSession(presetSettings(modeShapes[mode]));
    setSession(next);
    setState(next.read());
    setView(initialView(mode));
  }

  function pointerDown(event: PointerEvent<HTMLCanvasElement>) {
    if (!event.isPrimary || dragRef.current || ![0, 1, 2].includes(event.button)) return;
    const canvas = event.currentTarget;
    event.preventDefault();
    canvas.focus({ preventScroll: true });
    canvas.setPointerCapture(event.pointerId);
    stopSpin();
    dragRef.current = {
      id: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      travelled: 0,
      pan: event.button !== 0 || event.shiftKey,
    };
  }

  function pointerMove(event: PointerEvent<HTMLCanvasElement>) {
    const drag = dragRef.current;
    if (!drag || drag.id !== event.pointerId) return;
    if (event.pointerType === "mouse" && event.buttons === 0) {
      releaseViewport(event.pointerId);
      return;
    }
    const dx = event.clientX - drag.x;
    const dy = event.clientY - drag.y;
    drag.x = event.clientX;
    drag.y = event.clientY;
    drag.travelled += Math.hypot(dx, dy);
    if (dx === 0 && dy === 0) return;
    const panning = drag.pan;
    setView((current) => ({
      ...current,
      camera: panning
        ? pan(current.camera, dx, dy, size.width, size.height)
        : orbit(current.camera, dx, dy),
    }));
  }

  function pointerUp(event: PointerEvent<HTMLCanvasElement>) {
    const drag = dragRef.current;
    if (!drag || drag.id !== event.pointerId) return;
    if (!drag.pan && drag.travelled < 4) {
      const rendered = paintRef.current;
      if (rendered && rendered.mesh === session.read().displayed) {
        const canvas = event.currentTarget;
        const point = canvasPoint(event, canvas);
        const { width, height, faces } = rendered.layer.target;
        const x = Math.floor((point.x * width) / canvas.clientWidth);
        const y = Math.floor((point.y * height) / canvas.clientHeight);
        if (x >= 0 && x < width && y >= 0 && y < height) {
          setView((current) => probeAtFace(current, rendered.mesh, faces[y * width + x]));
        }
      }
    }
    releaseViewport(event.pointerId);
  }

  function keyDown(event: KeyboardEvent<HTMLCanvasElement>) {
    if (event.altKey || event.ctrlKey || event.metaKey) return;
    const key = event.key.toLowerCase();
    let dx = 0;
    let dy = 0;
    if (key === "arrowleft") dx = -16;
    if (key === "arrowright") dx = 16;
    if (key === "arrowup") dy = -16;
    if (key === "arrowdown") dy = 16;
    if (dx !== 0 || dy !== 0) {
      const panning = event.shiftKey;
      event.preventDefault();
      stopSpin();
      setView((current) => ({
        ...current,
        camera: panning
          ? pan(current.camera, dx, dy, size.width, size.height)
          : orbit(current.camera, dx, dy),
      }));
    } else if (key === "+" || key === "=" || key === "-") {
      event.preventDefault();
      stopSpin();
      setView((current) => ({ ...current, camera: zoom(current.camera, key === "-" ? -1 : 1) }));
    } else if (key === "r") {
      event.preventDefault();
      stopSpin();
      setView((current) => ({ ...current, camera: defaultCamera() }));
    } else if (key === "escape") {
      event.preventDefault();
      releaseViewport();
      stopSpin();
      cancelBuild();
    }
  }

  return (
    <div data-geometry-workshop={mode}>
      <canvas
        ref={canvasRef}
        className="lab-canvas"
        style={{ height: "clamp(320px, 48vw, 460px)" }}
        tabIndex={0}
        aria-label="Canvas Project 41: xưởng hình học 3D"
        aria-describedby={hintId}
        onPointerDown={pointerDown}
        onPointerMove={pointerMove}
        onPointerUp={pointerUp}
        onPointerCancel={(event) => releaseViewport(event.pointerId)}
        onLostPointerCapture={(event) => releaseViewport(event.pointerId)}
        onBlur={() => releaseViewport()}
        onContextMenu={(event) => event.preventDefault()}
        onKeyDown={keyDown}
      >
        Dùng các điều khiển và bảng số liệu phía dưới để đổi lưới, đọc đường nối và kiểm kết quả.
      </canvas>
      <p id={hintId} className="lab-fallback">
        Kéo để xoay, giữ Shift hoặc dùng nút chuột phải để pan. Bấm vào Canvas rồi cuộn để zoom. Bàn
        phím: phím mũi tên để xoay, Shift + mũi tên để pan, + / − để zoom, R để đặt lại góc nhìn,
        Esc để dừng xoay và hủy bản đang dựng. Đường kiểm vẫn hiện ở phần bị che.
      </p>
      <GeometryControls
        mode={mode}
        settings={state.requested ?? state.lastGood.settings}
        view={view}
        held={held}
        paused={paused}
        pending={state.requested !== null}
        spinning={spinning}
        reducedMotion={reducedMotion}
        onGeometry={updateGeometry}
        onView={(patch) => setView((current) => ({ ...current, ...patch }))}
        onChoose={chooseKind}
        onControlDown={startSlider}
        onToggleHold={toggleHold}
        onTogglePause={() => setPaused((current) => !current)}
        onToggleSpin={() => setSpinning((current) => !current)}
        onStep={() => {
          setPaused(true);
          if (session.advance()) refresh();
        }}
        onCancel={cancelBuild}
        onReset={reset}
      />
      <GeometryReadout mode={mode} view={view} state={state} paused={paused} />
    </div>
  );
}

export default function GeometryWorkshopLab({ mode }: { mode?: InteractiveLabMode }) {
  const resolved = geometryMode(mode);
  return <Workshop key={resolved} mode={resolved} />;
}
