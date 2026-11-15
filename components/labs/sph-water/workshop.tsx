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
import dynamic from "next/dynamic";
import { WaterSession } from "@/lib/labs/sph-water";
import {
  canvasPoint,
  useCanvasSize,
  useReducedMotion,
  usePauseOnReducedMotion,
} from "../lab-shared";
import { WaterPainter, fromScreen } from "./draw";
const Controls = dynamic(() => import("./controls").then((m) => m.WaterControls));
const Readout = dynamic(() => import("./readout").then((m) => m.WaterReadout));
const Pair = dynamic(() => import("./pair-force").then((m) => m.PairForceExperiment));
export default function Workshop({
  stage,
  autoplay = false,
}: {
  stage: number;
  autoplay?: boolean;
}) {
  const [session] = useState(() => new WaterSession(stage));
  const [snapshot, setSnapshot] = useState(() => session.snapshot());
  const [ready, setReady] = useState(false),
    [pair, setPair] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null),
    pairDetails = useRef<HTMLDetailsElement>(null),
    pointer = useRef<number | null>(null),
    activated = useRef(false),
    published = useRef(-1);
  const size = useCanvasSize(canvasRef),
    reducedMotion = useReducedMotion(),
    helpId = useId();
  const publish = useCallback(() => {
    published.current = session.revision;
    setSnapshot(session.snapshot());
  }, [session]);
  const release = useCallback(() => {
    const id = pointer.current;
    pointer.current = null;
    session.endStroke();
    if (id !== null && canvasRef.current?.hasPointerCapture(id))
      canvasRef.current.releasePointerCapture(id);
  }, [session]);
  const stop = useCallback(() => {
    session.pause();
    session.cancelInput();
    release();
    publish();
  }, [session, publish, release]);
  usePauseOnReducedMotion(stop);
  useEffect(() => {
    session.mount();
    const frame = requestAnimationFrame(() => {
      if (!activated.current) {
        activated.current = true;
        if (pairDetails.current?.open) setPair(true);
        if (
          autoplay &&
          stage >= 8 &&
          !pairDetails.current?.open &&
          !matchMedia("(prefers-reduced-motion: reduce)").matches
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
    const painter = new WaterPainter();
    let frame = 0,
      last = performance.now(),
      lastPublished = 0,
      drawn = -1,
      clock = session.clockRevision;
    const animate = (time: number) => {
      if (clock !== session.clockRevision) {
        clock = session.clockRevision;
        last = time;
      }
      if (time - last >= 1000 / 30 - 0.5) {
        if (!reducedMotion && !pair)
          session.advance((time - last) / 1000, 10, () => performance.now());
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
  }, [session, size, reducedMotion, pair, publish]);
  const change = (action: () => void) => {
    release();
    action();
    session.invalidate();
    publish();
  };
  const point = (e: PointerEvent<HTMLCanvasElement>) =>
    fromScreen(size.width, size.height, canvasPoint(e, e.currentTarget));
  const down = (e: PointerEvent<HTMLCanvasElement>) => {
    if (!ready || e.button !== 0 || pointer.current !== null) return;
    const p = point(e);
    if (!p) return;
    e.currentTarget.focus();
    e.currentTarget.setPointerCapture(e.pointerId);
    pointer.current = e.pointerId;
    session.beginStroke(p);
    publish();
  };
  const move = (e: PointerEvent<HTMLCanvasElement>) => {
    if (pointer.current === e.pointerId) session.moveStroke(point(e));
  };
  const end = (e: PointerEvent<HTMLCanvasElement>) => {
    if (pointer.current === e.pointerId) {
      release();
      publish();
    }
  };
  const key = (e: KeyboardEvent<HTMLCanvasElement>) => {
    if (e.ctrlKey || e.altKey || e.metaKey) return;
    const code = e.key.toLowerCase();
    if (code.startsWith("arrow")) {
      e.preventDefault();
      if (code === "arrowleft") session.moveCursor(-1, 0);
      if (code === "arrowright") session.moveCursor(1, 0);
      if (code === "arrowup") session.moveCursor(0, 1);
      if (code === "arrowdown") session.moveCursor(0, -1);
      publish();
      return;
    }
    if (code === " " || code === "enter") e.preventDefault();
    if (e.repeat) return;
    if (code === "n") session.singleStep();
    if (code === "r") {
      release();
      session.reset();
    }
    if (code === "enter" && session.tool === "pour") session.emit();
    if (code === " " && !reducedMotion) {
      if (session.paused) session.resume();
      else session.pause();
    }
    if (code === "escape") stop();
    session.invalidate();
    publish();
  };
  return (
    <div data-sph-ready={ready ? "true" : "false"}>
      <fieldset
        disabled={!ready}
        style={{ border: 0, padding: 0, margin: 0, minWidth: 0 }}
        aria-label="Điều khiển bể nước"
      >
        <Controls
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
        aria-label="Mô phỏng nước SPH 2D"
        aria-describedby={helpId}
        style={{ touchAction: "none", height: "min(64vw,560px)", minHeight: 300 }}
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={end}
        onPointerCancel={end}
        onLostPointerCapture={end}
        onKeyDown={key}
      >
        Nước được tính bằng các hạt có khối lượng. Dùng các nút và bảng số để thử mà không cần nhìn
        hình.
      </canvas>
      <p id={helpId} className="lab-note">
        N tiến một substep, Space chạy/dừng từ bài 8; R đặt lại đúng cảnh và số hạt đang chọn. Từ
        bài 10: chọn Vòi nước, mũi tên chuyển vòi và Enter đổ bảy hạt nếu đủ chỗ. Từ bài 11: chọn
        Kéo vật cản rồi kéo hoặc dùng mũi tên; vật cản chỉ di chuyển khi physics chạy.
      </p>
      <p className="lab-note">
        Bể kín 12,6×7,56 m; density kg/m², pressure N/m. Mặt nước là trường phủ từ vị trí hạt, không
        phải một solver khác. Màu Density: 0,85–1,15 ρ₀; Pressure: 0–60.000 N/m; Tốc độ: 0–8 m/s,
        xanh tới cam. Màu bão hòa không clamp dữ liệu.
      </p>
      {stage >= 8 && (
        <p className="lab-note">
          Mỗi frame tối đa 24 substep và khoảng 10 ms cho vòng solver; luôn hoàn tất bước đang chạy
          rồi trả quyền xử lý input. Thời gian vượt ngân sách được báo riêng, không giả thời gian
          thực. Độ nén lớn và hạt văng rời vẫn là hạn chế của WCSPH này.
        </p>
      )}
      {reducedMotion && (
        <p className="lab-note">
          Reduced motion đang bật: dùng từng bước; tắt tùy chọn này không tự chạy lại.
        </p>
      )}
      <Readout s={snapshot} />
      {stage >= 5 && (
        <details
          ref={pairDetails}
          onToggle={(e) => {
            setPair(e.currentTarget.open);
            if (e.currentTarget.open) stop();
          }}
        >
          <summary>Thí nghiệm lực trên hai hạt độc lập</summary>
          {/* Giữ nội dung độc lập với toggle: người đọc có thể mở details trước hydration. */}
          <Pair stage={stage} />
        </details>
      )}
    </div>
  );
}
