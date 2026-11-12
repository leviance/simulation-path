"use client";
import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent,
} from "react";
import {
  basis,
  cameraRay,
  defaultCamera,
  dolly,
  orbit,
  pan,
  type Camera,
} from "@/lib/labs/mandelbulb-explorer/camera";
import { evaluate, orbitPath } from "@/lib/labs/mandelbulb-explorer/field";
import { add, clamp, scale, type Settings } from "@/lib/labs/mandelbulb-explorer/math";
import { BulbSession } from "@/lib/labs/mandelbulb-explorer/session";
import { march } from "@/lib/labs/mandelbulb-explorer/trace";
import {
  bulbMode,
  initialSettings,
  preset,
  type BulbMode,
  type ViewMode,
} from "@/lib/labs/mandelbulb-explorer/view";
import { useCanvasSize, usePauseOnReducedMotion, useReducedMotion } from "./lab-shared";
import { BulbControls } from "./mandelbulb-explorer/controls";
import { BulbReadout, type ProbeInfo } from "./mandelbulb-explorer/readout";
import { paintBulb, viewport } from "./mandelbulb-explorer/paint";

interface Drag {
  id: number;
  x: number;
  y: number;
  pan: boolean;
}
function Explorer({ mode }: { mode: BulbMode }) {
  const canvasRef = useRef<HTMLCanvasElement>(null),
    dragRef = useRef<Drag | null>(null);
  const cameraRef = useRef(defaultCamera()),
    presetRef = useRef(0);
  const [camera, setCamera] = useState(defaultCamera);
  const cameraPosition = useMemo(() => basis(camera).eye, [camera]);
  const [session] = useState(() => {
    const created = new BulbSession();
    created.request(initialSettings(mode));
    return created;
  });
  const [settings, setSettings] = useState(() => initialSettings(mode));
  const [revision, setRevision] = useState(0),
    [visible, setVisible] = useState(true);
  const [manual, setManual] = useState(false);
  const [requestError, setRequestError] = useState("");
  const [view, setView] = useState<ViewMode>(mode === "work" ? "iterations" : "beauty");
  const [probe, setProbe] = useState({ x: 0.5, y: 0.5 });
  const size = useCanvasSize(canvasRef),
    id = useId(),
    reducedMotion = useReducedMotion();
  const update = useCallback(() => setRevision((value) => value + 1), []);
  const release = useCallback((pointerId?: number) => {
    const drag = dragRef.current;
    if (!drag || (pointerId !== undefined && pointerId !== drag.id)) return;
    dragRef.current = null;
    if (canvasRef.current?.hasPointerCapture(drag.id))
      canvasRef.current.releasePointerCapture(drag.id);
  }, []);
  const pauseForMotion = useCallback(() => {
    session.pause(true);
    update();
  }, [session, update]);
  usePauseOnReducedMotion(pauseForMotion);
  const request = useCallback(
    (next: Settings, camera: Camera) => {
      try {
        session.request(next, camera);
        setRequestError("");
      } catch (error) {
        setRequestError(error instanceof Error ? error.message : "Không thể tạo yêu cầu");
      }
      update();
    },
    [session, update],
  );
  const moveCamera = useCallback(
    (next: Camera) => {
      cameraRef.current = next;
      setCamera(next);
      // Camera changes use REQUESTED settings, never silently apply unsubmitted inputs.
      request(session.requested?.settings ?? initialSettings(mode), next);
    },
    [mode, request, session],
  );
  function loadPreset(index: number) {
    const chosen = preset(index, mode);
    presetRef.current = index;
    cameraRef.current = chosen.camera;
    setCamera(chosen.camera);
    setSettings(chosen.settings);
    release();
    request(chosen.settings, chosen.camera);
  }
  function cancel() {
    release();
    session.cancel();
    update();
  }
  function pause() {
    session.pause(!session.paused);
    update();
  }
  function step() {
    const wasPaused = session.paused;
    session.pause(false);
    session.advance();
    session.pause(wasPaused);
    update();
  }
  function restart() {
    const chosen = session.active ?? session.requested;
    if (chosen) {
      cameraRef.current = chosen.camera;
      setCamera(chosen.camera);
      request(chosen.settings, chosen.camera);
    }
  }
  const active = session.active;
  const info = useMemo<ProbeInfo | null>(() => {
    if (!active) return null;
    const s = active.settings;
    let point = { x: (probe.x - 0.5) * 4, y: s.sliceY, z: (0.5 - probe.y) * 3 };
    let ray = null;
    if (!s.slice) {
      const camera = cameraRay(active.camera, probe.x, probe.y, 1, 1);
      ray = march(camera.origin, camera.direction, s, true);
      point = add(camera.origin, scale(camera.direction, ray.t));
    }
    return { point, field: evaluate(point, s), orbit: orbitPath(point, s), ray };
  }, [active, probe]);
  useEffect(() => {
    if (!session.busy || !visible || manual) return;
    const frame = requestAnimationFrame(() => {
      session.advance();
      update();
    });
    return () => cancelAnimationFrame(frame);
  }, [manual, revision, session, update, visible]);
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      const context = canvasRef.current?.getContext("2d");
      if (context) paintBulb(context, size, session, view, probe, info?.ray ?? null);
    });
    return () => cancelAnimationFrame(frame);
  }, [info, probe, revision, session, size, view]);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry) setVisible(entry.isIntersecting);
    });
    observer.observe(canvas);
    const blur = () => {
      release();
      session.pause(true);
      update();
    };
    const hidden = () => {
      if (document.hidden) blur();
    };
    window.addEventListener("blur", blur);
    document.addEventListener("visibilitychange", hidden);
    const wheel = (event: WheelEvent) => {
      if (document.activeElement !== canvas || session.active?.settings.slice) return;
      event.preventDefault();
      moveCamera(dolly(cameraRef.current, -clamp(event.deltaY, -300, 300) * 0.01));
    };
    canvas.addEventListener("wheel", wheel, { passive: false });
    return () => {
      observer.disconnect();
      release();
      window.removeEventListener("blur", blur);
      document.removeEventListener("visibilitychange", hidden);
      canvas.removeEventListener("wheel", wheel);
    };
  }, [moveCamera, release, session, update]);
  function select(event: PointerEvent<HTMLCanvasElement>) {
    const rect = event.currentTarget.getBoundingClientRect(),
      area = viewport(size.width, size.height);
    const x = (event.clientX - rect.left - area.x) / area.width,
      y = (event.clientY - rect.top - area.y) / area.height;
    if (x < 0 || x > 1 || y < 0 || y > 1) return false;
    setProbe({ x: clamp(x, 0, 1), y: clamp(y, 0, 1) });
    return true;
  }
  function pointerDown(event: PointerEvent<HTMLCanvasElement>) {
    if (!event.isPrimary || dragRef.current || ![0, 1, 2].includes(event.button)) return;
    event.currentTarget.focus({ preventScroll: true });
    if (!select(event)) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = {
      id: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      pan: event.button !== 0 || event.shiftKey,
    };
  }
  function pointerMove(event: PointerEvent<HTMLCanvasElement>) {
    const drag = dragRef.current;
    if (!drag || drag.id !== event.pointerId) return;
    if (event.pointerType === "mouse" && event.buttons === 0) {
      release(event.pointerId);
      return;
    }
    if (session.active?.settings.slice) select(event);
    else {
      const dx = event.clientX - drag.x,
        dy = event.clientY - drag.y;
      moveCamera(drag.pan ? pan(cameraRef.current, dx, dy) : orbit(cameraRef.current, dx, dy));
    }
    drag.x = event.clientX;
    drag.y = event.clientY;
  }
  function keyDown(event: KeyboardEvent<HTMLCanvasElement>) {
    const key = event.key.toLowerCase();
    if (key.startsWith("arrow")) {
      event.preventDefault();
      const dx = key === "arrowleft" ? -10 : key === "arrowright" ? 10 : 0,
        dy = key === "arrowup" ? -10 : key === "arrowdown" ? 10 : 0;
      if (session.active?.settings.slice)
        setProbe((current) => ({
          x: clamp(current.x + dx * 0.002, 0, 1),
          y: clamp(current.y + dy * 0.002, 0, 1),
        }));
      else
        moveCamera(
          event.shiftKey ? pan(cameraRef.current, dx, dy) : orbit(cameraRef.current, dx, dy),
        );
    } else if (["+", "=", "-"].includes(key) && !session.active?.settings.slice) {
      event.preventDefault();
      moveCamera(dolly(cameraRef.current, key === "-" ? -1 : 1));
    } else if (key === " " && !event.repeat) {
      event.preventDefault();
      pause();
    } else if (key === "r" && !event.repeat) {
      event.preventDefault();
      loadPreset(presetRef.current);
    } else if (key === "0") {
      event.preventDefault();
      moveCamera(defaultCamera());
    } else if (key === "escape") {
      event.preventDefault();
      cancel();
    } else if (key === "enter" && !event.repeat) {
      event.preventDefault();
      step();
    } else if (["1", "2", "3"].includes(key) && !event.repeat) {
      event.preventDefault();
      loadPreset(Number(key) - 1);
    } else if (key === "h" && !event.repeat) {
      event.preventDefault();
      const modes: ViewMode[] = ["beauty", "steps", "iterations", "states", "normals"];
      setView((current) => modes[(modes.indexOf(current) + 1) % modes.length]);
    }
  }
  return (
    <div data-mandelbulb-mode={mode}>
      <canvas
        ref={canvasRef}
        className="lab-canvas"
        style={{ height: "clamp(340px,52vw,510px)" }}
        tabIndex={0}
        aria-label="Canvas Project 43: Mandelbulb và chi phí ray marching"
        aria-describedby={id + "-hint"}
        onPointerDown={pointerDown}
        onPointerMove={pointerMove}
        onPointerUp={(event) => release(event.pointerId)}
        onPointerCancel={(event) => release(event.pointerId)}
        onLostPointerCapture={(event) => release(event.pointerId)}
        onBlur={() => release()}
        onContextMenu={(event) => event.preventDefault()}
        onKeyDown={keyDown}
      >
        Dùng bảng điều khiển để đổi power, mặt cắt, camera và heatmap. Đọc quỹ đạo, ray steps, work
        và trạng thái trong bảng văn bản bên dưới.
      </canvas>
      <p id={id + "-hint"} className="lab-fallback">
        Chọn một điểm/ray trong viewport. Ở mặt cắt, kéo hoặc dùng mũi tên để đổi c; ở 3D, kéo để
        orbit, Shift/nút phải để pan. Focus vào Canvas rồi cuộn hoặc dùng +/− để dolly. Mũi tên đổi
        camera, Shift + mũi tên để pan; 0 đặt lại camera, Space dừng/tiếp tục refinement, Enter tiến
        một batch, H đổi heatmap, 1/2/3 chọn preset, R reset preset, Esc hủy. Tham số số chỉ có hiệu
        lực khi bấm Áp dụng.
      </p>
      {reducedMotion && (
        <p className="lab-fallback">
          Reduced motion: refinement tự dừng. Preview vẫn cập nhật khi bạn thao tác; dùng Tiến 1
          batch hoặc chủ động Tiếp tục. Không có camera tự quay.
        </p>
      )}
      {mode === "refine" && (
        <label className="lab-fallback" htmlFor={id + "-manual"}>
          <input
            id={id + "-manual"}
            type="checkbox"
            checked={manual}
            onChange={(event) => setManual(event.target.checked)}
          />
          Giữ job Canvas để đọc từng batch (khác Pause chỉ dừng refinement)
        </label>
      )}
      <BulbControls
        id={id}
        settings={settings}
        setSettings={setSettings}
        apply={() => request(settings, cameraRef.current)}
        reset={() => loadPreset(presetRef.current)}
        preset={loadPreset}
        paused={session.paused}
        pause={pause}
        cancel={cancel}
        restart={restart}
        step={step}
        view={view}
        setView={setView}
        zoom={(wheel) => moveCamera(dolly(cameraRef.current, wheel))}
        cameraReset={() => moveCamera(defaultCamera())}
      />
      <BulbReadout session={session} info={info} error={requestError} />
      <p className="lab-fallback">
        Camera yêu cầu cách target {camera.distance.toFixed(3)} world units; eye (
        {cameraPosition.x.toFixed(3)}, {cameraPosition.y.toFixed(3)}, {cameraPosition.z.toFixed(3)}
        ). Pan giới hạn mỗi trục ±2,5; dolly 0,04–18; không có cam kết zoom vô hạn.
      </p>
    </div>
  );
}
export default function MandelbulbExplorerLab({ mode = "explorer" }: { mode?: string }) {
  const selected = bulbMode(mode);
  return <Explorer key={selected} mode={selected} />;
}
