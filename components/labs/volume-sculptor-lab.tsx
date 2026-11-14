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
import { defaultCamera, orbit, pan, zoom } from "@/lib/labs/shared/orthographic-camera";
import { clamp } from "@/lib/labs/volume-sculptor/grid";
import { SculptSession } from "@/lib/labs/volume-sculptor/session";
import {
  initialView,
  modeQuestions,
  moveProbe,
  slicePoint,
  volumeMode,
  type VolumeMode,
  type VolumeView,
} from "@/lib/labs/volume-sculptor/view";
import { canvasPoint, useCanvasSize, useReducedMotion } from "./lab-shared";
import { VolumeControls } from "./volume-sculptor/controls";
import { hitSlice, paintVolume, volumeLayout, type RasterLayer } from "./volume-sculptor/paint";
import { VolumeReadout } from "./volume-sculptor/readout";
import { TetraLab } from "./volume-sculptor/tetra-lab";
import { useClientReady } from "../use-client-ready";
import type { InteractiveLabMode } from "./types";

interface Drag {
  id: number;
  x: number;
  y: number;
  kind: "brush" | "orbit" | "pan";
}
function newSession(mode: VolumeMode) {
  const session = new SculptSession(mode === "cells" ? 12 : 24);
  if (mode === "cells") session.setGradientNormals(false);
  return session;
}

function Workshop({ mode }: { mode: VolumeMode }) {
  const ready = useClientReady();
  const canvasRef = useRef<HTMLCanvasElement>(null),
    layerRef = useRef<RasterLayer | null>(null),
    dragRef = useRef<Drag | null>(null);
  const size = useCanvasSize(canvasRef),
    hintId = useId(),
    reducedMotion = useReducedMotion();
  const [session, setSession] = useState(() => newSession(mode));
  const [view, setView] = useState(() => initialView(mode));
  const [revision, setRevision] = useState(0);
  const refresh = useCallback(() => setRevision((current) => current + 1), []);

  const releaseViewport = useCallback(
    (cancel = true, owner?: number) => {
      const drag = dragRef.current;
      if (!drag || (owner !== undefined && drag.id !== owner)) return;
      dragRef.current = null;
      if (drag.kind === "brush") {
        if (cancel) session.cancelStroke(drag.id);
        else session.finishStroke(drag.id);
      }
      const canvas = canvasRef.current;
      if (canvas?.hasPointerCapture(drag.id)) canvas.releasePointerCapture(drag.id);
      refresh();
    },
    [refresh, session],
  );

  useEffect(() => {
    // StrictMode can run cleanup/setup twice on the same retained session.
    if (!session.job || session.job.phase === "cancelled") session.requestRemesh(true);
    return () => {
      session.dispose();
      layerRef.current = null;
    };
  }, [session]);

  useEffect(() => {
    // Meshing is finite data work, not an animation. Finish it even while the
    // reader scrolls from the canvas to its controls/readout. Offscreen gating
    // can otherwise leave the very counters they are reading stuck at count.
    if (session.paused || !session.needsWork) return;
    const frame = requestAnimationFrame(() => {
      session.advance();
      refresh();
    });
    return () => cancelAnimationFrame(frame);
  }, [refresh, revision, session]);

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      const context = canvasRef.current?.getContext("2d");
      if (context) layerRef.current = paintVolume(context, size, session, view, layerRef.current);
    });
    return () => cancelAnimationFrame(frame);
  }, [revision, session, size, view]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const blur = () => {
      releaseViewport(true);
      session.cancelStroke();
      session.paused = true;
      refresh();
    };
    const visibility = () => {
      if (document.visibilityState === "hidden") blur();
    };
    window.addEventListener("blur", blur);
    document.addEventListener("visibilitychange", visibility);
    return () => {
      window.removeEventListener("blur", blur);
      document.removeEventListener("visibilitychange", visibility);
      releaseViewport(true);
    };
  }, [refresh, releaseViewport, session]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const wheel = (event: WheelEvent) => {
      if (document.activeElement !== canvas || event.ctrlKey || event.deltaY === 0) return;
      event.preventDefault();
      setView((current) => ({
        ...current,
        camera: zoom(current.camera, -Math.sign(event.deltaY)),
      }));
    };
    canvas.addEventListener("wheel", wheel, { passive: false });
    return () => canvas.removeEventListener("wheel", wheel);
  }, []);

  function act(action: () => void) {
    releaseViewport(true);
    try {
      action();
    } catch (error) {
      session.notice = error instanceof Error ? error.message : "Thao tác không hợp lệ.";
    }
    refresh();
  }

  function updateView(patch: Partial<VolumeView>) {
    if (patch.slice || patch.brush) {
      releaseViewport(true);
      session.cancelStroke();
      refresh();
    }
    setView((current) => ({ ...current, ...patch }));
  }

  function stamp() {
    act(() => {
      if (
        session.beginStroke(-1, {
          ...view.brush,
          center: slicePoint(session.grid.spec, view.slice),
        })
      )
        session.finishStroke(-1);
    });
  }

  function reset() {
    releaseViewport(true);
    setSession(newSession(mode));
    setView(initialView(mode));
    refresh();
  }

  function sliceAt(event: { clientX: number; clientY: number }) {
    const canvas = canvasRef.current;
    if (!canvas) return view.slice;
    const point = canvasPoint(event, canvas),
      { slice } = volumeLayout(size);
    return {
      ...view.slice,
      u: clamp((point.x - slice.x) / slice.side, 0, 1),
      v: clamp(1 - (point.y - slice.y) / slice.side, 0, 1),
    };
  }

  function pointerDown(event: PointerEvent<HTMLCanvasElement>) {
    if (dragRef.current || (event.button !== 0 && event.button !== 1 && event.button !== 2)) return;
    const canvas = event.currentTarget,
      point = canvasPoint(event, canvas),
      slice = volumeLayout(size).slice;
    canvas.focus();
    if (hitSlice(point, slice) && event.button === 0) {
      const next = sliceAt(event);
      setView((current) => ({ ...current, slice: next }));
      if (
        !session.beginStroke(event.pointerId, {
          ...view.brush,
          center: slicePoint(session.grid.spec, next),
        })
      )
        return;
      dragRef.current = { id: event.pointerId, x: point.x, y: point.y, kind: "brush" };
      refresh();
    } else
      dragRef.current = {
        id: event.pointerId,
        x: point.x,
        y: point.y,
        kind: event.button === 1 || event.shiftKey ? "pan" : "orbit",
      };
    event.preventDefault();
    canvas.setPointerCapture(event.pointerId);
  }

  function pointerMove(event: PointerEvent<HTMLCanvasElement>) {
    const drag = dragRef.current;
    if (!drag || drag.id !== event.pointerId) return;
    const point = canvasPoint(event, event.currentTarget);
    if (drag.kind === "brush") {
      const next = sliceAt(event);
      setView((current) => ({ ...current, slice: next }));
      session.continueStroke(event.pointerId, slicePoint(session.grid.spec, next));
      refresh();
      if (session.strokeOwner !== event.pointerId) releaseViewport(true, event.pointerId);
    } else {
      const dx = point.x - drag.x,
        dy = point.y - drag.y,
        width = volumeLayout(size).viewportWidth;
      setView((current) => ({
        ...current,
        camera:
          drag.kind === "pan"
            ? pan(current.camera, dx, dy, width, size.height)
            : orbit(current.camera, dx, dy),
      }));
    }
    drag.x = point.x;
    drag.y = point.y;
  }

  function keyDown(event: KeyboardEvent<HTMLCanvasElement>) {
    if (event.altKey || event.ctrlKey || event.metaKey) return;
    const key = event.key.toLowerCase();
    const arrows: Record<string, [number, number]> = {
      arrowleft: [-12, 0],
      arrowright: [12, 0],
      arrowup: [0, -12],
      arrowdown: [0, 12],
    };
    const probe: Record<string, [number, number]> = {
      h: [-1, 0],
      l: [1, 0],
      j: [0, -1],
      k: [0, 1],
    };
    if (arrows[key]) {
      const [dx, dy] = arrows[key];
      setView((current) => ({
        ...current,
        camera: event.shiftKey
          ? pan(current.camera, dx, dy, volumeLayout(size).viewportWidth, size.height)
          : orbit(current.camera, dx, dy),
      }));
    } else if (probe[key])
      updateView({ slice: moveProbe(view.slice, ...probe[key], session.grid.spec.samples) });
    else if (key === "pageup" || key === "pagedown")
      updateView({
        slice: {
          ...view.slice,
          layer: clamp(
            view.slice.layer + (key === "pageup" ? 1 : -1) / (session.grid.spec.samples - 1),
            0,
            1,
          ),
        },
      });
    else if (key === "x")
      updateView({
        slice: {
          ...view.slice,
          axis: view.slice.axis === "X" ? "Y" : view.slice.axis === "Y" ? "Z" : "X",
        },
      });
    else if (key === "a" || key === "d")
      updateView({ brush: { ...view.brush, mode: key === "a" ? "add" : "subtract" } });
    else if (key === "b") {
      if (!event.repeat) stamp();
    } else if (key === "z" || key === "y")
      act(() => {
        if (!event.repeat) {
          if (key === "z") session.undo();
          else session.redo();
        }
      });
    else if (key === " ") {
      if (!event.repeat)
        act(() => {
          session.paused = !session.paused;
        });
    } else if (key === "enter") {
      if (!event.repeat) act(() => session.requestRemesh(true));
    } else if (key === "c") act(() => session.cancelRemesh());
    else if (key === "escape")
      act(() => {
        session.cancelStroke();
      });
    else if (key === "r") {
      if (!event.repeat) reset();
    } else if (key === "home")
      setView((current) => ({
        ...current,
        camera: { ...defaultCamera(), target: { x: 0, y: 0.05, z: 0 }, zoom: 1.55 },
      }));
    else if (key === "+" || key === "=" || key === "-")
      setView((current) => ({ ...current, camera: zoom(current.camera, key === "-" ? -1 : 1) }));
    else return;
    event.preventDefault();
  }

  return (
    <div data-volume-mode={mode} data-ready={ready}>
      <p className="lab-fallback">{modeQuestions[mode]}</p>
      <canvas
        ref={canvasRef}
        className="lab-canvas"
        style={{ height: 460, touchAction: "none" }}
        tabIndex={ready ? 0 : -1}
        aria-disabled={!ready}
        aria-label="Xưởng điêu khắc: mesh 3D bên trái, lát cắt đặt cọ bên phải"
        aria-describedby={hintId}
        onPointerDown={pointerDown}
        onPointerMove={pointerMove}
        onPointerUp={(event) => releaseViewport(false, event.pointerId)}
        onPointerCancel={(event) => releaseViewport(true, event.pointerId)}
        onLostPointerCapture={(event) => releaseViewport(true, event.pointerId)}
        onBlur={() => releaseViewport(true)}
        onContextMenu={(event) => event.preventDefault()}
        onKeyDown={keyDown}
      />
      <p id={hintId} className="lab-fallback">
        Kéo bên trái để orbit; Shift+kéo hoặc chuột giữa để pan. Focus Canvas rồi dùng wheel hoặc
        +/− để zoom. Kéo trong lát cắt để đặt cọ lên mặt phẳng 3D; đây không phải picking bề mặt
        theo camera như bản C++. Bàn phím: mũi tên xoay, Shift+mũi tên pan, H/J/K/L đổi probe, Page
        Up/Down đổi lớp, X đổi trục, A/D thêm/bớt, B đặt stamp, Space Pause, Enter dựng lại, C hủy,
        Z/Y undo/redo, R Reset, Home về góc nhìn đầu. Pause hoặc mất focus sẽ hủy nét đang kéo để
        input cũ không nối sang lần làm việc tiếp theo.
      </p>
      <fieldset
        disabled={!ready}
        aria-label="Điều khiển Volume Sculptor"
        style={{ border: 0, margin: 0, padding: 0, minWidth: 0 }}
      >
        <VolumeControls
          mode={mode}
          session={session}
          view={view}
          onView={updateView}
          onAction={act}
          onReset={reset}
          onStamp={stamp}
        />
      </fieldset>
      <VolumeReadout session={session} view={view} />
      <p className="lab-note">
        Lab chạy CPU với tối đa 32³ samples, chunk 4³ cells; bản C++ dùng GPU với grid 128³ và chunk
        16³. Count/prefix ở đây là phép tính CPU thật, không phải benchmark GPU. Mesh có Z-buffer
        Canvas 2D; camera trực giao được cấp sẵn.{" "}
        {reducedMotion
          ? "Reduced motion đang bật; lab không tự xoay hoặc chuyển động nội suy."
          : "Không có chuyển động tự chạy; job chỉ tiến khi cần cập nhật dữ liệu."}{" "}
        Snapshot RAM không thay file .scl hoặc OBJ của ứng dụng C++.
      </p>
    </div>
  );
}

export default function VolumeSculptorLab({ mode }: { mode?: InteractiveLabMode }) {
  const selected = volumeMode(mode);
  if (selected === "tetra") return <TetraLab />;
  return <Workshop key={selected} mode={selected} />;
}
