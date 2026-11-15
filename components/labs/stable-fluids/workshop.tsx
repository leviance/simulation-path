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
import { FluidSession, fromScreen } from "@/lib/labs/stable-fluids";
import dynamic from "next/dynamic";
import {
  canvasPoint,
  useCanvasSize,
  useReducedMotion,
  usePauseOnReducedMotion,
} from "../lab-shared";
import { FluidPainter } from "./draw";
// Các panel tách thành chunk riêng; kernel số không nằm trong React state.
const FluidControls = dynamic(() => import("./controls").then((module) => module.FluidControls));
const FluidReadout = dynamic(() => import("./readout").then((module) => module.FluidReadout));

export default function Workshop({
  stage,
  autoplay = false,
}: {
  stage: number;
  autoplay?: boolean;
}) {
  const [session] = useState(() => {
    const value = new FluidSession(stage);
    value.paused = !autoplay || stage < 10;
    return value;
  });
  const [snapshot, setSnapshot] = useState(() => session.snapshot());
  const [ready, setReady] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pointer = useRef<number | null>(null);
  const published = useRef(session.revision);
  const activated = useRef(false);
  const size = useCanvasSize(canvasRef);
  const reducedMotion = useReducedMotion();
  const helpId = useId();
  const publish = useCallback(() => {
    published.current = session.revision;
    setSnapshot(session.snapshot());
  }, [session]);
  const release = useCallback(
    (click = false) => {
      const id = pointer.current;
      pointer.current = null;
      session.endStroke(click);
      if (id !== null && canvasRef.current?.hasPointerCapture(id))
        canvasRef.current.releasePointerCapture(id);
    },
    [session],
  );
  const stop = useCallback(() => {
    session.pause();
    release();
    publish();
  }, [session, release, publish]);
  usePauseOnReducedMotion(stop);

  useEffect(() => {
    session.mount();
    const frame = requestAnimationFrame(() => {
      if (!activated.current) {
        activated.current = true;
        if (
          autoplay &&
          stage >= 10 &&
          !window.matchMedia("(prefers-reduced-motion: reduce)").matches
        )
          session.resume();
        else session.pause();
      }
      setReady(true);
      publish();
    });
    const hidden = () => {
      if (document.hidden) stop();
    };
    window.addEventListener("blur", stop);
    document.addEventListener("visibilitychange", hidden);
    return () => {
      cancelAnimationFrame(frame);
      release();
      session.dispose();
      window.removeEventListener("blur", stop);
      document.removeEventListener("visibilitychange", hidden);
    };
  }, [session, stage, autoplay, stop, release, publish]);

  useEffect(() => {
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    const painter = new FluidPainter();
    let frame = 0;
    let last = performance.now();
    let lastPublished = 0;
    let drawn = -1;
    let clock = session.clockRevision;
    const animate = (time: number) => {
      if (clock !== session.clockRevision) {
        clock = session.clockRevision;
        last = time;
      }
      if (time - last >= 1000 / 30 - 0.5) {
        if (!reducedMotion) session.advance((time - last) / 1000, 12, () => performance.now());
        last = time;
      }
      if (drawn !== session.revision) {
        painter.draw(ctx, size, session);
        drawn = session.revision;
      }
      if (time - lastPublished >= 125 && published.current !== session.revision) {
        publish();
        lastPublished = time;
      }
      frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);
    return () => {
      cancelAnimationFrame(frame);
      painter.dispose();
    };
  }, [session, size, reducedMotion, publish]);

  const change = (action: () => void) => {
    release();
    action();
    session.invalidate();
    publish();
  };
  const point = (event: PointerEvent<HTMLCanvasElement>) =>
    fromScreen(size.width, size.height, canvasPoint(event, event.currentTarget));
  const down = (event: PointerEvent<HTMLCanvasElement>) => {
    if (
      !ready ||
      stage < 2 ||
      (event.button !== 0 && event.button !== 2) ||
      pointer.current !== null
    )
      return;
    const p = point(event);
    if (!p) return;
    event.currentTarget.focus();
    event.currentTarget.setPointerCapture(event.pointerId);
    pointer.current = event.pointerId;
    session.beginStroke(p, event.button === 2);
    publish();
  };
  const move = (event: PointerEvent<HTMLCanvasElement>) => {
    if (!ready || stage < 2) return;
    const p = point(event);
    if (pointer.current === event.pointerId) session.moveStroke(p);
    else if (p) session.select(p);
  };
  const end = (event: PointerEvent<HTMLCanvasElement>) => {
    if (pointer.current === event.pointerId) {
      release(event.type === "pointerup");
      publish();
    }
  };
  const keyDown = (event: KeyboardEvent<HTMLCanvasElement>) => {
    if (event.ctrlKey || event.altKey || event.metaKey) return;
    const key = event.key.toLowerCase();
    if (stage >= 2 && key.startsWith("arrow")) {
      event.preventDefault();
      if (key === "arrowleft") session.moveCursor(-1, 0);
      if (key === "arrowright") session.moveCursor(1, 0);
      if (key === "arrowup") session.moveCursor(0, 1);
      if (key === "arrowdown") session.moveCursor(0, -1);
      publish();
      return;
    }
    if (key === " ") event.preventDefault();
    if (event.repeat) return;
    if (key === "enter") {
      event.preventDefault();
      session.paint();
    }
    if (key === "n") {
      session.pause();
      session.singleStep();
    }
    if (key === "r") {
      release();
      session.reset();
    }
    if (key === "j") session.jacobi();
    if (key === " " && !reducedMotion) session.toggle();
    if (key === "w") session.impulse({ x: 0, y: 0.05 });
    if (key === "s") session.impulse({ x: 0, y: -0.05 });
    if (key === "a") session.impulse({ x: -0.05, y: 0 });
    if (key === "d") session.impulse({ x: 0.05, y: 0 });
    publish();
  };

  return (
    <div data-fluid-ready={ready}>
      <fieldset
        disabled={!ready}
        style={{ border: 0, padding: 0, margin: 0, minWidth: 0 }}
        aria-label="Điều khiển mô phỏng khói"
      >
        <FluidControls
          session={session}
          snapshot={snapshot}
          reducedMotion={reducedMotion}
          change={change}
        />
      </fieldset>
      <canvas
        ref={canvasRef}
        className="lab-canvas"
        tabIndex={0}
        aria-label="Mô phỏng khói Stable Fluids"
        aria-describedby={helpId}
        style={{ touchAction: "none", height: "min(76vw, 760px)", minHeight: 360 }}
        onContextMenu={(e) => e.preventDefault()}
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={end}
        onPointerCancel={end}
        onLostPointerCapture={end}
        onKeyDown={keyDown}
      >
        Khói là concentration tại tâm ô; velocity nằm trên cạnh. Click thêm khói, kéo để khuấy; các
        nút và bảng số cung cấp cách thử không cần nhìn Canvas.
      </canvas>
      <p id={helpId} className="lab-note">
        Mũi tên chọn ô, Enter đặt bút; N tiến 1/60 s từ bài 3. Từ bài 8: click thêm một vệt khói,
        kéo để khuấy; chuột phải chỉ khuấy, WASD tạo impulse. Space chạy/dừng từ bài 10. Đặt lại giữ
        cảnh, lưới và tham số đang chọn.
      </p>
      {stage === 3 && (
        <p className="lab-note">
          Bước học advection dùng gió cho trước (0,18; 0), chưa giải vận tốc của hộp kín.
        </p>
      )}
      {stage >= 4 && (
        <p className="lab-note">
          Hộp kín, normal velocity bằng 0 và free-slip tiếp tuyến. Lưới MAC có scalar ở tâm, u/v
          trên cạnh. Lớp Velocity vẽ tốc độ và mũi tên, không sửa field.
        </p>
      )}
      {stage >= 5 && (
        <p className="lab-note">
          Pressure ±0,08, divergence ±1: âm xanh, dương cam, 0 tối. Velocity: tốc độ 0–0,6, tối đến
          xanh. Màu bão hòa không clamp số đo. J giải một vòng Jacobi trên RHS cố định, không đổi
          velocity/scalar/tick.
        </p>
      )}
      {stage >= 6 && (
        <p className="lab-note">
          RMS(div sau projection) ≈ dt × residual RMS. PASS ca chuẩn riêng không thay số đo của thí
          nghiệm đang xem.
        </p>
      )}
      {stage >= 7 && (
        <p className="lab-note">
          Semi-Lagrangian có diffusion số và không bảo toàn tích phân scalar chính xác. Courant lớn
          không nhất thiết nổ số nhưng có thể làm sai quỹ đạo hoặc mất chi tiết.
        </p>
      )}
      {stage >= 10 && (
        <p className="lab-note">
          Nguồn → lực → confinement (bài 13) → viscosity → project → advect velocity → project →
          advect khói. Tối đa bốn tick/frame; trả quyền xử lý input sau tick đắt và báo phần thời
          gian bị bỏ. Không chạy bù vô hạn.
        </p>
      )}
      {stage >= 14 && (
        <p className="lab-note">
          Mặc định 128×128 ô thật để tương tác; 256×256 giữ được nhiều dải khói mảnh hơn nhưng tốn
          thời gian hơn. PCG dùng multigrid tự viết; residual được đo lại bằng phương trình gốc. Đây
          là khói 2D với tone mapping, không phải mô hình tán xạ ánh sáng 3D.
        </p>
      )}
      {reducedMotion && (
        <p className="lab-note">
          Reduced motion đang bật: chỉ tiến từng bước, không tự chạy lại khi tắt tùy chọn này.
        </p>
      )}
      <FluidReadout snapshot={snapshot} stage={stage} />
    </div>
  );
}
