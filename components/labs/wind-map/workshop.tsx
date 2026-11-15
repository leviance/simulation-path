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
import { WindSession } from "@/lib/labs/wind-map/session";
import { fromScreen } from "@/lib/labs/wind-map/view";
import {
  canvasPoint,
  useCanvasSize,
  useReducedMotion,
  usePauseOnReducedMotion,
} from "../lab-shared";
import { WindControls } from "./controls";
import { WindReadout } from "./readout";
import { WindPainter } from "./paint";

export default function WindWorkshop({ stage }: { stage: number }) {
  const [app] = useState(() => new WindSession(stage));
  const [, refresh] = useState(0);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pointer = useRef<number | null>(null);
  const needsPaint = useRef(true);
  const needsSummary = useRef(false);
  const help = useId();
  const reducedMotion = useReducedMotion();
  const publish = useCallback(() => {
    needsPaint.current = true;
    needsSummary.current = false;
    refresh((value) => value + 1);
  }, []);
  const release = useCallback(() => {
    const id = pointer.current;
    pointer.current = null;
    if (id !== null && canvasRef.current?.hasPointerCapture(id))
      canvasRef.current.releasePointerCapture(id);
  }, []);
  const stop = useCallback(() => {
    app.pause();
    release();
    publish();
  }, [app, release, publish]);
  const size = useCanvasSize(canvasRef, release);
  usePauseOnReducedMotion(stop);
  useEffect(() => {
    app.mount();
    const frame = requestAnimationFrame(() => setReady(true));
    const hidden = () => {
      if (document.hidden) stop();
    };
    window.addEventListener("blur", stop);
    document.addEventListener("visibilitychange", hidden);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("blur", stop);
      document.removeEventListener("visibilitychange", hidden);
      release();
      app.dispose();
    };
  }, [app, stop, release]);
  useEffect(() => {
    app.resize(size.width, size.height);
    const painter = new WindPainter();
    let frame = 0,
      previous = performance.now(),
      lastPublish = previous;
    let revision = app.clockRevision;
    needsPaint.current = true;
    const animate = (time: number) => {
      if (revision !== app.clockRevision) {
        revision = app.clockRevision;
        previous = time;
      }
      if (app.paused) previous = time;
      if (!app.paused && time - previous >= 1000 / app.fps - 0.25) {
        app.frame((time - previous) / 1000);
        previous = time;
        needsPaint.current = true;
        needsSummary.current = true;
      }
      if (needsSummary.current && time - lastPublish >= 125) {
        lastPublish = time;
        publish();
      }
      if (needsPaint.current && canvasRef.current) {
        needsPaint.current = false;
        if (!painter.draw(canvasRef.current, size, app)) {
          app.pause();
          setError("Canvas 2D không khả dụng; đọc trạng thái ở bảng số bên dưới.");
        }
      }
      frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);
    return () => {
      cancelAnimationFrame(frame);
      painter.dispose();
    };
  }, [app, size, publish]);
  const invoke = (action: () => void) => {
    release();
    action();
    publish();
  };
  const locate = (event: PointerEvent<HTMLCanvasElement>) => {
    const point = canvasPoint(event, event.currentTarget),
      bounds = event.currentTarget.getBoundingClientRect();
    if (bounds.width <= 0 || bounds.height <= 0) return null;
    return fromScreen(size.width, size.height, {
      x: (point.x * size.width) / bounds.width,
      y: (point.y * size.height) / bounds.height,
    });
  };
  const down = (event: PointerEvent<HTMLCanvasElement>) => {
    if (stage < 2 || event.button !== 0 || pointer.current !== null) return;
    const p = locate(event);
    if (!p) return;
    event.preventDefault();
    event.currentTarget.focus();
    event.currentTarget.setPointerCapture(event.pointerId);
    pointer.current = event.pointerId;
    app.point(p, app.editVortex);
    publish();
  };
  const move = (event: PointerEvent<HTMLCanvasElement>) => {
    if (stage < 2 || (pointer.current !== null && pointer.current !== event.pointerId)) return;
    const p = locate(event);
    if (!p) return;
    app.point(p, app.editVortex && pointer.current === event.pointerId);
    needsPaint.current = true;
    needsSummary.current = true;
  };
  const end = (event: PointerEvent<HTMLCanvasElement>) => {
    if (pointer.current === event.pointerId) release();
  };
  const keyDown = (event: KeyboardEvent<HTMLCanvasElement>) => {
    if (event.ctrlKey || event.metaKey || event.altKey) return;
    const arrows = ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"];
    if (event.repeat && !arrows.includes(event.key)) {
      if (event.key === " " || event.key === "Enter") event.preventDefault();
      return;
    }
    let action: (() => void) | null = null;
    if (stage >= 2 && arrows.includes(event.key))
      action = () => {
        const p = { ...app.cursor };
        if (event.key === "ArrowLeft") p.x -= app.field.dx;
        if (event.key === "ArrowRight") p.x += app.field.dx;
        if (event.key === "ArrowUp") p.y += app.field.dy;
        if (event.key === "ArrowDown") p.y -= app.field.dy;
        app.point(p);
      };
    if (event.key === "Enter" && stage >= 8) action = () => app.point(app.cursor, true);
    if (event.key.toLowerCase() === "n")
      action = () => {
        app.pause();
        app.step();
      };
    if (event.key === " " && !reducedMotion)
      action = () => {
        if (app.paused) app.resume();
        else app.pause();
      };
    if (event.key.toLowerCase() === "r") action = () => app.reset();
    if (event.key.toLowerCase() === "t" && stage >= 7) action = () => app.toggleTracers();
    if (!action) return;
    event.preventDefault();
    invoke(action);
  };
  return (
    <>
      <fieldset
        disabled={!ready}
        data-wind-ready={ready}
        aria-label="Điều khiển bản đồ gió"
        style={{ border: 0, padding: 0, margin: 0, minWidth: 0 }}
      >
        <WindControls app={app} reducedMotion={reducedMotion} invoke={invoke} />
      </fieldset>
      <canvas
        ref={canvasRef}
        className="lab-canvas"
        tabIndex={ready ? 0 : -1}
        aria-busy={!ready}
        aria-label="Bản đồ trường vector"
        aria-describedby={help}
        style={{
          touchAction: "none",
          pointerEvents: ready ? "auto" : "none",
          height: "clamp(380px, 58vh, 620px)",
        }}
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={end}
        onPointerCancel={end}
        onLostPointerCapture={end}
        onBlur={release}
        onKeyDown={keyDown}
      >
        Trường 2D trong miền x từ −2 đến 2, y từ −1,5 đến 1,5. Bảng số bên dưới cho biết scalar,
        vector, gradient, divergence và curl tại nút chọn.
      </canvas>
      <p id={help} className="lab-note">
        World y hướng lên. Chuột/mũi tên chọn nút; chọn “Đặt/kéo tâm xoáy” để sửa trường, Enter đặt
        xoáy tại nút. N tiến 1/60 s, Space chạy/dừng, T bật/tắt hạt, R đặt lại. Tab dùng các điều
        khiển bên ngoài.
      </p>
      {stage >= 3 && (
        <p className="lab-note">
          Thang cố định −2 (xanh) → 0 (tối) → +2 (cam); màu bão hòa không sửa số đo. Lớp Gradient vẽ
          ∇φ và màu |∇φ|, độc lập với vận tốc. Các lớp còn lại vẽ mũi tên vận tốc; tracer luôn đi
          theo vx/vy.
        </p>
      )}
      {stage >= 5 && (
        <p className="lab-note">
          Curl z dương chỉ xu hướng quay ngược kim đồng hồ. Trường trượt (y; 0) có curl −1 dù đường
          dòng thẳng. Đây là trường cho trước, chưa giải pressure hoặc Navier–Stokes.
        </p>
      )}
      {stage >= 7 && (
        <p className="lab-note">
          Lưới hiện có {app.field.width * app.field.height} nút thật, glyph được lấy thưa còn 221 để
          đọc hình. 128 tracer dùng bilinear/RK2, giữ tối đa 24 vị trí; ra khỏi miền hoặc quá 8 giây
          được gieo lại. Mật độ chấm không đo lượng chất lỏng. Đổi trường/lưới dừng và gieo lại hạt;
          đổi overlay không đổi quỹ đạo.
        </p>
      )}
      {reducedMotion && (
        <p className="lab-note">
          Reduced motion đang bật: dùng “Tiến một bước”; không tự chạy chuyển động.
        </p>
      )}
      {error && (
        <p className="lab-note" role="alert">
          {error}
        </p>
      )}
      <WindReadout app={app} />
    </>
  );
}
