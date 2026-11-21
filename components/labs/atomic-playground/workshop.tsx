"use client";

import {
  lazy,
  Suspense,
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
  AtomicSession,
  defaultConfig,
  hasGenerationWork,
  validateConfig,
  type CloudConfig,
} from "@/lib/labs/atomic-playground/session";
import { measureCloud } from "@/lib/labs/atomic-playground/statistics";
import {
  fitCamera,
  initialView,
  modeQuestions,
  orbitCamera,
  panCamera,
  travelCamera,
  zoomCamera,
  type AtomicMode,
  type AtomicView,
} from "@/lib/labs/atomic-playground/view";
import { useClientReady } from "../../use-client-ready";
import { useCanvasSize, useReducedMotion } from "../lab-shared";
import { paintAtomic, type PaintCounts } from "./paint";

const AtomicControls = lazy(() =>
  import("./controls").then((module) => ({ default: module.AtomicControls })),
);
const AtomicReadout = lazy(() =>
  import("./readout").then((module) => ({ default: module.AtomicReadout })),
);
const AtomicTrace = lazy(() =>
  import("./trace").then((module) => ({ default: module.AtomicTrace })),
);
interface Drag {
  id: number;
  x: number;
  y: number;
  pan: boolean;
}
const fallback = (
  <p className="lab-fallback">
    Đang chuẩn bị bảng điều khiển; Canvas CPU giới hạn 20.000 mẫu, không chạy GPU triệu điểm.
  </p>
);

export default function AtomicWorkshop({ mode }: { mode: AtomicMode }) {
  const ready = useClientReady(),
    reducedMotion = useReducedMotion(),
    hintId = useId();
  const canvasRef = useRef<HTMLCanvasElement>(null),
    dragRef = useRef<Drag | null>(null);
  const [session] = useState(() => new AtomicSession());
  const [secondary] = useState(() => new AtomicSession({ ...defaultConfig(), orbital: "s2" }));
  const [view, setView] = useState(() => initialView(mode));
  const [revision, setRevision] = useState(0);
  const [counts, setCounts] = useState<PaintCounts>({ primary: 0, secondary: 0 });
  const refresh = useCallback(() => setRevision((value) => value + 1), []);
  const releasePointer = useCallback((owner?: number) => {
    const drag = dragRef.current;
    if (!drag || (owner !== undefined && owner !== drag.id)) return;
    dragRef.current = null;
    const canvas = canvasRef.current;
    if (canvas?.hasPointerCapture(drag.id)) canvas.releasePointerCapture(drag.id);
  }, []);
  const resize = useCallback(() => releasePointer(), [releasePointer]);
  const size = useCanvasSize(canvasRef, resize);
  const cloud = session.active;
  // Camera/palette changes must not repeat numerical integration or resample.
  const measurement = useMemo(
    () => (cloud ? measureCloud(cloud, view.clip, view.probe) : null),
    [cloud, view.clip, view.probe],
  );

  useEffect(() => {
    session.mount();
    secondary.mount();
    return () => {
      releasePointer();
      session.dispose();
      secondary.dispose();
    };
  }, [releasePointer, secondary, session]);

  useEffect(() => {
    // Finite, bounded work. Once complete/paused/cancelled there is no RAF loop.
    if (!ready || session.paused || !hasGenerationWork(session, secondary, view.compare)) return;
    const frame = requestAnimationFrame(() => {
      session.advance();
      if (view.compare) secondary.advance();
      refresh();
    });
    return () => cancelAnimationFrame(frame);
  }, [ready, refresh, revision, secondary, session, view.compare]);

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      const context = canvasRef.current?.getContext("2d");
      if (!context) return;
      const next = paintAtomic(context, size, session.active, secondary.active, view);
      setCounts((previous) =>
        previous.primary === next.primary && previous.secondary === next.secondary
          ? previous
          : next,
      );
    });
    return () => cancelAnimationFrame(frame);
  }, [revision, secondary, session, size, view]);

  useEffect(() => {
    const blur = () => {
      releasePointer();
      session.setPaused(true);
      secondary.setPaused(true);
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
      releasePointer();
    };
  }, [refresh, releasePointer, secondary, session]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const wheel = (event: WheelEvent) => {
      if (document.activeElement !== canvas || event.ctrlKey || !event.deltaY) return;
      event.preventDefault();
      setView((current) => ({
        ...current,
        camera: zoomCamera(current.camera, -Math.sign(event.deltaY)),
      }));
    };
    canvas.addEventListener("wheel", wheel, { passive: false });
    return () => canvas.removeEventListener("wheel", wheel);
  }, []);

  function action(command: () => void) {
    releasePointer();
    try {
      command();
    } catch (error) {
      session.report(error);
    }
    refresh();
  }
  function request(patch: Partial<CloudConfig>) {
    action(() => {
      const config = validateConfig({ ...session.requested, ...patch });
      session.request(config);
      if (view.compare) secondary.request({ ...config, orbital: view.secondary });
      if (patch.orbital)
        setView((current) => ({
          ...current,
          camera: fitCamera(config.orbital, current.compare ? current.secondary : undefined),
        }));
    });
  }
  function updateView(patch: Partial<AtomicView>) {
    releasePointer();
    action(() => {
      if (patch.compare === true || (patch.secondary && view.compare))
        secondary.request({ ...session.requested, orbital: patch.secondary ?? view.secondary });
      if (patch.compare === false) secondary.cancel();
      setView((current) => {
        const next = { ...current, ...patch };
        if (patch.compare !== undefined || patch.secondary)
          next.camera = fitCamera(
            session.requested.orbital,
            next.compare ? next.secondary : undefined,
          );
        return next;
      });
    });
  }
  function togglePause() {
    action(() => {
      const paused = !session.paused;
      session.setPaused(paused);
      secondary.setPaused(paused);
    });
  }
  function step() {
    action(() => {
      session.setPaused(true);
      secondary.setPaused(true);
      session.advance(true);
      if (view.compare) secondary.advance(true);
    });
  }
  function cancel() {
    action(() => {
      session.cancel();
      secondary.cancel();
    });
  }
  function reset() {
    action(() => {
      session.reset();
      if (view.compare) secondary.reset();
    });
  }
  function fit() {
    releasePointer();
    setView((current) => ({
      ...current,
      camera: fitCamera(session.requested.orbital, current.compare ? current.secondary : undefined),
    }));
  }
  function pointerDown(event: PointerEvent<HTMLCanvasElement>) {
    if (!ready || dragRef.current || (event.button !== 0 && event.button !== 1)) return;
    event.preventDefault();
    event.currentTarget.focus();
    dragRef.current = {
      id: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      pan: event.shiftKey || event.button === 1,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  }
  function pointerMove(event: PointerEvent<HTMLCanvasElement>) {
    const drag = dragRef.current;
    if (!drag || drag.id !== event.pointerId) return;
    const dx = event.clientX - drag.x,
      dy = event.clientY - drag.y;
    dragRef.current = { ...drag, x: event.clientX, y: event.clientY };
    setView((current) => ({
      ...current,
      camera: drag.pan ? panCamera(current.camera, dx, dy) : orbitCamera(current.camera, dx, dy),
    }));
  }
  function keyDown(event: KeyboardEvent<HTMLCanvasElement>) {
    if (!ready || event.altKey || event.ctrlKey || event.metaKey) return;
    const key = event.key.toLowerCase(),
      arrows: Record<string, [number, number]> = {
        arrowleft: [-12, 0],
        arrowright: [12, 0],
        arrowup: [0, -12],
        arrowdown: [0, 12],
      };
    if (arrows[key]) {
      event.preventDefault();
      const [dx, dy] = arrows[key];
      setView((current) => ({
        ...current,
        camera: event.shiftKey
          ? panCamera(current.camera, dx, dy)
          : orbitCamera(current.camera, dx, dy),
      }));
    } else if (["+", "=", "-", "_"].includes(key)) {
      event.preventDefault();
      setView((current) => ({
        ...current,
        camera: zoomCamera(current.camera, ["-", "_"].includes(key) ? -1 : 1),
      }));
    } else if (["w", "s"].includes(key)) {
      event.preventDefault();
      setView((current) => ({
        ...current,
        camera: travelCamera(current.camera, key === "w" ? 1 : -1),
      }));
    } else if (["pageup", "pagedown"].includes(key)) {
      event.preventDefault();
      setView((current) => ({
        ...current,
        clip: {
          ...current.clip,
          position: Math.max(
            -40,
            Math.min(40, current.clip.position + (key === "pageup" ? 0.5 : -0.5)),
          ),
        },
      }));
    } else if (["h", "j", "k", "l"].includes(key)) {
      event.preventDefault();
      setView((current) => ({
        ...current,
        showProbe: true,
        probe: {
          ...current.probe,
          center: {
            ...current.probe.center,
            x: Math.max(
              -20,
              Math.min(20, current.probe.center.x + (key === "h" ? -0.5 : key === "l" ? 0.5 : 0)),
            ),
            y: Math.max(
              -20,
              Math.min(20, current.probe.center.y + (key === "j" ? -0.5 : key === "k" ? 0.5 : 0)),
            ),
          },
        },
      }));
    } else if ([" ", "c", "r", "p", "home", "enter"].includes(key)) {
      event.preventDefault();
      if (event.repeat) return;
      if (key === " ") togglePause();
      else if (key === "c") cancel();
      else if (key === "r" || key === "enter") reset();
      else if (key === "home") fit();
      else
        setView((current) => ({
          ...current,
          clip: { ...current.clip, enabled: !current.clip.enabled },
        }));
    }
  }

  return (
    <section className="lab-body" data-atomic-mode={mode} data-ready={ready}>
      <p>{modeQuestions[mode]}</p>
      <fieldset disabled={!ready} style={{ border: 0, padding: 0, margin: 0 }}>
        <Suspense fallback={fallback}>
          <AtomicControls
            mode={mode}
            session={session}
            view={view}
            hasWork={hasGenerationWork(session, secondary, view.compare)}
            onRequest={request}
            onView={updateView}
            onAction={action}
            onReset={reset}
            onFit={fit}
            onPause={togglePause}
            onStep={step}
            onCancel={cancel}
          />
        </Suspense>
      </fieldset>
      <canvas
        ref={canvasRef}
        aria-label="Đám mây orbital 3D từ các mẫu vị trí theo density được cung cấp"
        aria-describedby={hintId}
        aria-disabled={!ready}
        tabIndex={ready ? 0 : -1}
        className="lab-canvas"
        style={{ width: "100%", height: "min(65vh, 560px)", minHeight: 350, touchAction: "none" }}
        onPointerDown={pointerDown}
        onPointerMove={pointerMove}
        onPointerUp={(event) => releasePointer(event.pointerId)}
        onPointerCancel={(event) => releasePointer(event.pointerId)}
        onLostPointerCapture={(event) => releasePointer(event.pointerId)}
        onBlur={() => releasePointer()}
        onKeyDown={keyDown}
      >
        Orbital là phân bố vị trí tĩnh. Các thùy và vùng nút do công thức radial và real angular
        cung cấp, không phải quỹ đạo electron.
      </canvas>
      <p id={hintId} className="lab-hint">
        Kéo để orbit, Shift+kéo hoặc chuột giữa để pan. Focus Canvas rồi cuộn hoặc +/− để zoom; W/S
        đi xuyên cloud; mũi tên để orbit, Shift+mũi tên để pan. Space pause sinh, Enter thử lại, C
        hủy, R reset cùng seed, Home về góc nhìn đầu. P bật cắt, PageUp/Down dịch mặt cắt; H/J/K/L
        dịch tâm vùng đo X/Y. Các thanh trượt tương ứng hỗ trợ bàn phím.
      </p>
      <p className="lab-note">
        Đây là bản CPU Canvas 2D phục vụ giải thích: 256–20.000 mẫu, mỗi batch tối đa 512 mẫu. Bản
        C++/SDL3/OpenGL mới là sản phẩm triệu mẫu trên GPU. Mỗi điểm là một lần lấy mẫu vị trí;
        không phải nhiều electron đang chạy. Camera thay đổi phép chiếu, không quay field hay sinh
        lại mẫu.
      </p>
      <p className="lab-note">
        {view.palette === "phase"
          ? "Màu xanh âm / cam dương phân biệt dấu amplitude; "
          : "Palette đồng nhất không phân biệt dấu amplitude; "}
        vàng đánh dấu mẫu nằm trong cầu đo. Mật độ điểm phản ánh xác suất, nhưng độ sáng còn chịu
        opacity, kích thước splat, phối cảnh và phép cộng màu. Density boost là transfer hiển thị
        thêm, không phải một phép đo xác suất.{" "}
        {reducedMotion
          ? "Reduced motion đang bật: không có camera tự xoay hay chuyển hình tự động."
          : "Cloud không tự xoay hoặc chuyển hình; bạn chủ động điều khiển góc nhìn."}
      </p>
      {mode === "cdf" && (
        <Suspense fallback={<p className="lab-note">Đang mở trace của sampler…</p>}>
          <AtomicTrace cloud={cloud} />
        </Suspense>
      )}
      <Suspense
        fallback={
          <dl className="lab-readout">
            <div>
              <dt>Trạng thái</dt>
              <dd>
                Đang chuẩn bị cloud CPU bounded; chờ toàn candidate hợp lệ mới thay last-good.
              </dd>
            </div>
          </dl>
        }
      >
        <AtomicReadout
          session={session}
          secondary={secondary}
          view={view}
          measurement={measurement}
          counts={counts}
        />
      </Suspense>
    </section>
  );
}
