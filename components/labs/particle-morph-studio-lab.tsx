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
import { advanceTime, clamp } from "@/lib/labs/particle-morph-studio/math";
import { MorphSession, meanTravel } from "@/lib/labs/particle-morph-studio/session";
import {
  morphMode,
  initialSettings,
  initialView,
  defaultCamera,
  orbit,
  pan,
  zoom,
  type MorphMode,
} from "@/lib/labs/particle-morph-studio/view";
import {
  canvasPoint,
  useCanvasSize,
  usePauseOnReducedMotion,
  useReducedMotion,
} from "./lab-shared";
import { paintMorph, type Probe } from "./particle-morph-studio/paint";
import { MorphControls } from "./particle-morph-studio/controls";
import { MorphReadout } from "./particle-morph-studio/readout";
import styles from "./particle-morph-studio/studio.module.css";

interface Drag {
  id: number;
  x: number;
  y: number;
  pan: boolean;
}

function Studio({ mode }: { mode: MorphMode }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dragRef = useRef<Drag | null>(null);
  const resetOnPublish = useRef(false);
  const id = useId();
  const size = useCanvasSize(canvasRef);
  const reducedMotion = useReducedMotion();
  const [session] = useState(() => {
    const created = new MorphSession();
    created.request(initialSettings(mode));
    return created;
  });
  const [revision, setRevision] = useState(0);
  const [staged, setStaged] = useState(() => initialSettings(mode));
  const [view, setView] = useState(() => initialView(mode));
  const [time, setTime] = useState(mode === "matching" || mode === "showcase" ? 0.65 : 0);
  const [playing, setPlaying] = useState(false);
  const [reverse, setReverse] = useState(false);
  const [loop, setLoop] = useState(true);
  const [hold, setHold] = useState(false);
  const [visible, setVisible] = useState(true);
  const [probe, setProbe] = useState<Probe>({ u: 0.25, v: 0.5 });
  const stop = useCallback(() => setPlaying(false), []);
  usePauseOnReducedMotion(stop);
  const active = session.active;
  const travel = useMemo(
    () =>
      active
        ? { random: meanTravel(active, "random"), spatial: meanTravel(active, "spatial") }
        : { random: 0, spatial: 0 },
    [active],
  );
  const release = useCallback((pointerId?: number) => {
    const drag = dragRef.current;
    if (!drag || (pointerId !== undefined && pointerId !== drag.id)) return;
    dragRef.current = null;
    if (canvasRef.current?.hasPointerCapture(drag.id))
      canvasRef.current.releasePointerCapture(drag.id);
  }, []);
  const step = useCallback(() => {
    const previous = session.active;
    session.advance(mode === "generation" ? 128 : 512);
    if (previous !== session.active && resetOnPublish.current) {
      resetOnPublish.current = false;
      setTime(0);
      setPlaying(false);
    }
    setRevision((value) => value + 1);
  }, [mode, session]);

  useEffect(() => {
    if (!session.busy || hold) return;
    const frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [hold, revision, session, step]);

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      const context = canvasRef.current?.getContext("2d");
      if (context) paintMorph(context, size, active, view, time, mode, probe);
    });
    return () => cancelAnimationFrame(frame);
  }, [active, mode, probe, size, time, view]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry) setVisible(entry.isIntersecting);
    });
    observer.observe(canvas);
    const blur = () => {
      release();
      setPlaying(false);
    };
    const hidden = () => {
      if (document.hidden) blur();
    };
    window.addEventListener("blur", blur);
    document.addEventListener("visibilitychange", hidden);
    return () => {
      observer.disconnect();
      release();
      window.removeEventListener("blur", blur);
      document.removeEventListener("visibilitychange", hidden);
    };
  }, [release]);

  useEffect(() => {
    if (!playing || reducedMotion || !visible) return;
    let frame = 0;
    let previous = 0;
    const animate = (now: number) => {
      if (previous === 0) previous = now;
      if (now - previous >= 33) {
        const dt = (now - previous) / 1000;
        previous = now;
        setTime((current) => advanceTime(current * 5, dt, 5, reverse, loop) / 5);
      }
      frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [loop, playing, reducedMotion, reverse, visible]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const wheel = (event: WheelEvent) => {
      if (document.activeElement !== canvas || mode === "area") return;
      event.preventDefault();
      setView((current) => ({ ...current, camera: zoom(current.camera, -event.deltaY * 0.01) }));
    };
    canvas.addEventListener("wheel", wheel, { passive: false });
    return () => canvas.removeEventListener("wheel", wheel);
  }, [mode]);

  function apply() {
    resetOnPublish.current = true;
    session.request({ ...staged });
    setRevision((value) => value + 1);
  }
  function cancel() {
    session.cancel();
    resetOnPublish.current = false;
    setRevision((value) => value + 1);
  }
  function scrub(value: number) {
    setPlaying(false);
    setTime(clamp(value, 0, 1));
  }
  function pointerDown(event: PointerEvent<HTMLCanvasElement>) {
    if (!event.isPrimary || dragRef.current || ![0, 1, 2].includes(event.button)) return;
    event.preventDefault();
    event.currentTarget.focus({ preventScroll: true });
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
    if (mode === "area") {
      const point = canvasPoint(event, event.currentTarget);
      setProbe({ u: clamp(point.x / size.width, 0, 1), v: clamp(point.y / size.height, 0, 1) });
    } else {
      const dx = event.clientX - drag.x;
      const dy = event.clientY - drag.y;
      setView((current) => ({
        ...current,
        camera: drag.pan ? pan(current.camera, dx, dy) : orbit(current.camera, dx, dy),
      }));
    }
    drag.x = event.clientX;
    drag.y = event.clientY;
  }
  function keyDown(event: KeyboardEvent<HTMLCanvasElement>) {
    if (event.altKey || event.ctrlKey || event.metaKey) return;
    const key = event.key.toLowerCase();
    let dx = 0;
    let dy = 0;
    if (key === "arrowleft") dx = -14;
    if (key === "arrowright") dx = 14;
    if (key === "arrowup") dy = -14;
    if (key === "arrowdown") dy = 14;
    if (dx || dy) {
      event.preventDefault();
      if (mode === "area")
        setProbe((current) => ({
          u: clamp(current.u + dx * 0.003, 0, 1),
          v: clamp(current.v + dy * 0.003, 0, 1),
        }));
      else
        setView((current) => ({
          ...current,
          camera: event.shiftKey ? pan(current.camera, dx, dy) : orbit(current.camera, dx, dy),
        }));
    } else if (key === "+" || key === "=" || key === "-") {
      event.preventDefault();
      setView((current) => ({ ...current, camera: zoom(current.camera, key === "-" ? -1 : 1) }));
    } else if (key === " " && !event.repeat) {
      event.preventDefault();
      if (!reducedMotion) setPlaying((value) => !value);
    } else if (key === "home" || key === "end") {
      event.preventDefault();
      scrub(key === "home" ? 0 : 1);
    } else if (key === "r") {
      event.preventDefault();
      scrub(0);
    } else if (key === "0") {
      event.preventDefault();
      setView((current) => ({ ...current, camera: defaultCamera() }));
    } else if (key === "escape") {
      event.preventDefault();
      release();
      setPlaying(false);
      cancel();
    }
  }
  const phases = [
    "Lấy mẫu nguồn/đích",
    "Đếm mẫu theo diện tích",
    "Lập random permutation",
    "Xếp điểm nguồn",
    "Xếp điểm đích",
    "Ghép theo hạng",
  ];
  return (
    <div data-particle-morph-mode={mode}>
      <canvas
        ref={canvasRef}
        className="lab-canvas"
        style={{ height: "clamp(320px,48vw,460px)" }}
        tabIndex={0}
        aria-label="Canvas Project 42: biến hình hạt"
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
        Dùng các điều khiển và số liệu bên dưới để so sampling, ghép điểm và timeline. Canvas chỉ
        chạy CPU tối đa 4.096 mẫu.
      </canvas>
      <p id={id + "-hint"} className="lab-fallback">
        Kéo để orbit; Shift hoặc nút phải để pan. Đặt focus vào Canvas rồi cuộn để zoom. Phím mũi
        tên đổi góc nhìn, Shift + mũi tên để pan, +/− để zoom, 0 đặt lại camera; Space Play/Pause,
        Home/End về hai đầu, R Reset thời gian, Esc dừng và hủy yêu cầu mới.
        {mode === "area"
          ? " Ở bài tam giác, kéo hoặc dùng phím mũi tên để đổi u/v của điểm trắng."
          : ""}
      </p>
      <p className={styles.status} role="status" aria-live="polite">
        {session.busy
          ? "Yêu cầu đang chuẩn bị: " + phases[session.phase] + ". ACTIVE cũ vẫn được giữ."
          : session.error || "ACTIVE đã sẵn sàng. Các lựa chọn STAGED chỉ có hiệu lực sau Áp dụng."}
      </p>
      <MorphControls
        id={id}
        staged={staged}
        setStaged={setStaged}
        view={view}
        setView={setView}
        apply={apply}
        cancel={cancel}
        busy={session.busy}
        playing={playing}
        reducedMotion={reducedMotion}
        setPlaying={setPlaying}
        time={time}
        scrub={scrub}
        reset={() => scrub(0)}
        reverse={reverse}
        setReverse={setReverse}
        loop={loop}
        setLoop={setLoop}
        probe={probe}
        setProbe={setProbe}
        area={mode === "area"}
        hold={hold}
        setHold={setHold}
        step={step}
        generation={mode === "generation"}
      />
      {reducedMotion && (
        <p className="lab-fallback">
          Reduced motion đang bật: Play được vô hiệu hóa; bạn vẫn kéo timeline, đổi cấu hình và điều
          khiển camera bằng chuột hoặc bàn phím.
        </p>
      )}
      <p className="lab-fallback">
        Một lượt morph dài 5 giây model time khi đang hiển thị. Focus/visibility bị mất sẽ dừng tiến
        thời gian. Không có lực, collision hoặc integrator vật lý.
      </p>
      <MorphReadout
        data={active}
        view={view}
        time={time}
        mode={mode}
        probe={probe}
        randomTravel={travel.random}
        spatialTravel={travel.spatial}
      />
    </div>
  );
}

export default function ParticleMorphStudioLab({ mode = "showcase" }: { mode?: string }) {
  const selected = morphMode(mode);
  return <Studio key={selected} mode={selected} />;
}
