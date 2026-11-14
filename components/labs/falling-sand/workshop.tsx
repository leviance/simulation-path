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
import { SandSession } from "@/lib/labs/falling-sand/session";
import { Cell } from "@/lib/labs/falling-sand/model";
import { pointerCell } from "@/lib/labs/falling-sand/view";
import {
  canvasPoint,
  useCanvasSize,
  useReducedMotion,
  usePauseOnReducedMotion,
} from "../lab-shared";
import { SandPainter } from "./paint";
import { SandControls } from "./controls";
import { SandReadout } from "./readout";

export default function SandWorkshop({ stage }: { stage: number }) {
  const [session] = useState(() => new SandSession(stage));
  const [summary, setSummary] = useState(() => session.summary());
  const [canvasError, setCanvasError] = useState("");
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const activePointer = useRef<number | null>(null);
  const needsPaint = useRef(true);
  const needsSummary = useRef(false);
  const helpId = useId();
  const reducedMotion = useReducedMotion();
  const publish = useCallback(() => {
    needsSummary.current = false;
    setSummary(session.summary());
  }, [session]);
  const release = useCallback(() => {
    const id = activePointer.current;
    activePointer.current = null;
    session.endStroke();
    const canvas = canvasRef.current;
    if (canvas && id !== null && canvas.hasPointerCapture(id)) canvas.releasePointerCapture(id);
    needsPaint.current = true;
  }, [session]);
  const size = useCanvasSize(canvasRef, release);
  const stop = useCallback(() => {
    release();
    session.pause();
    publish();
  }, [release, session, publish]);
  usePauseOnReducedMotion(stop);

  useEffect(() => {
    session.mount();
    const hidden = () => {
      if (document.hidden) stop();
    };
    window.addEventListener("blur", stop);
    document.addEventListener("visibilitychange", hidden);
    return () => {
      window.removeEventListener("blur", stop);
      document.removeEventListener("visibilitychange", hidden);
      release();
      session.dispose();
    };
  }, [session, release, stop]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const painter = new SandPainter();
    let frame = 0;
    let lastProcess = performance.now();
    let lastPublish = lastProcess;
    let previousClockRevision = session.clockRevision;
    let stopped = false;
    let reportedError = false;
    needsPaint.current = true;
    const animate = (time: number) => {
      if (stopped) return;
      if (previousClockRevision !== session.clockRevision) {
        previousClockRevision = session.clockRevision;
        lastProcess = time;
      }
      if (!session.paused && time - lastProcess >= 1000 / session.fps - 0.25) {
        if (session.advance((time - lastProcess) / 1000) > 0) needsSummary.current = true;
        lastProcess = time;
        needsPaint.current = true;
      }
      if (needsPaint.current) {
        const ok = painter.draw(canvas, size, session);
        needsPaint.current = false;
        if (!ok && !reportedError) {
          reportedError = true;
          session.pause();
          setCanvasError(
            "Canvas 2D không khả dụng. Bộ điều khiển và bảng số vẫn mô tả trạng thái lưới.",
          );
        }
      }
      if (needsSummary.current && time - lastPublish >= 125) {
        lastPublish = time;
        publish();
      }
      frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);
    return () => {
      stopped = true;
      cancelAnimationFrame(frame);
      painter.dispose();
    };
  }, [session, size, publish]);

  const invoke = (action: () => void) => {
    release();
    try {
      action();
    } catch (error) {
      session.setNote(
        error instanceof Error
          ? error.message
          : "Không áp dụng được thao tác; lưới cũ được giữ lại.",
      );
    }
    needsPaint.current = true;
    publish();
  };
  const locate = (event: PointerEvent<HTMLCanvasElement>) => {
    const canvas = event.currentTarget;
    const bounds = canvas.getBoundingClientRect();
    if (bounds.width <= 0 || bounds.height <= 0) return null;
    const point = canvasPoint(event, canvas);
    return pointerCell(
      size.width,
      size.height,
      (point.x * size.width) / bounds.width,
      (point.y * size.height) / bounds.height,
      session.grid,
    );
  };
  const pointerDown = (event: PointerEvent<HTMLCanvasElement>) => {
    if (activePointer.current !== null || (event.button !== 0 && event.button !== 2)) return;
    const cell = locate(event);
    if (!cell) return;
    event.preventDefault();
    event.currentTarget.focus();
    session.pointerBegin(cell, event.button === 2);
    if (stage >= 2) {
      event.currentTarget.setPointerCapture(event.pointerId);
      activePointer.current = event.pointerId;
    }
    needsPaint.current = true;
    publish();
  };
  const pointerMove = (event: PointerEvent<HTMLCanvasElement>) => {
    if (activePointer.current !== null && activePointer.current !== event.pointerId) return;
    session.pointerMove(locate(event));
    needsPaint.current = true;
    needsSummary.current = true;
  };
  const pointerEnd = (event: PointerEvent<HTMLCanvasElement>) => {
    if (activePointer.current !== event.pointerId) return;
    release();
    publish();
  };
  const keyDown = (event: KeyboardEvent<HTMLCanvasElement>) => {
    if (event.ctrlKey || event.metaKey || event.altKey) return;
    if (event.repeat && !["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) {
      if (event.key === " " || event.key === "Enter") event.preventDefault();
      return;
    }
    const stride = event.shiftKey ? 16 : 1;
    let handled = true;
    if (event.key === "ArrowLeft") session.moveCursor(-stride, 0);
    else if (event.key === "ArrowRight") session.moveCursor(stride, 0);
    else if (event.key === "ArrowUp") session.moveCursor(0, -stride);
    else if (event.key === "ArrowDown") session.moveCursor(0, stride);
    else if (!event.repeat) {
      const key = event.key.toLowerCase();
      if (key === "enter") session.stampAtCursor();
      else if (key === "n") session.singleStep();
      else if (key === " " && !reducedMotion) session.toggleRun();
      else if (key === "r") session.reset();
      else if (key === "k") session.reset(session.preset, session.seed, true);
      else if (key === "1") session.setMaterial(Cell.Sand);
      else if (key === "2") session.setMaterial(Cell.Wall);
      else if (key === "3") session.setMaterial(Cell.Water);
      else if (key === "4") session.setMaterial(Cell.Empty);
      else if (key === "[") session.setRadius(session.radius - 1);
      else if (key === "]") session.setRadius(session.radius + 1);
      else handled = false;
    }
    if (!handled) return;
    event.preventDefault();
    needsPaint.current = true;
    publish();
  };

  return (
    <>
      <SandControls
        session={session}
        summary={summary}
        reducedMotion={reducedMotion}
        invoke={invoke}
      />
      <canvas
        ref={canvasRef}
        className="lab-canvas"
        tabIndex={0}
        aria-label="Hộp cát ô lưới"
        aria-describedby={helpId}
        style={{ touchAction: "none", height: "clamp(320px, 52vh, 560px)" }}
        onPointerDown={pointerDown}
        onPointerMove={pointerMove}
        onPointerUp={pointerEnd}
        onPointerCancel={pointerEnd}
        onLostPointerCapture={pointerEnd}
        onBlur={release}
        onKeyDown={keyDown}
        onContextMenu={(event) => event.preventDefault()}
      >
        Lưới {summary.width}×{summary.height}. Vàng là cát, xanh là nước giả, xám là tường. Bảng số
        và bộ điều khiển bên ngoài Canvas mô tả cùng trạng thái.
      </canvas>
      <p id={helpId} className="lab-note">
        Mũi tên chọn ô; Shift+mũi tên đi 16 ô; Enter tô; N tiến một tick; Space chạy/dừng từ bài 6.
        Chuột trái vẽ, chuột phải tẩy. R đặt lại; K xóa. Các nút và trường chọn đều dùng được bằng
        Tab.
      </p>
      {stage < 3 && (
        <p className="lab-note">
          Mốc này chưa cập nhật chuyển động. Hãy kiểm dữ liệu và cách vẽ trước khi thêm luật rơi.
        </p>
      )}
      {stage >= 3 && (
        <p className="lab-note">
          Cờ moved không giữ chỗ cho ô trống. Màu hồng của overlay chỉ cho biết ô đã tham gia swap;
          đích đang có vật liệu vẫn phải được kiểm cờ để không di chuyển lần hai.
        </p>
      )}
      {stage >= 5 && (
        <p className="lab-note">
          Đây là nước giả theo luật ô lưới, không có áp suất hay nghiệm chất lưu. Chỉ xét bảo toàn
          từng loại khi không vẽ/tẩy/reset.
        </p>
      )}
      {stage >= 7 && (
        <p className="lab-note">
          Canvas dùng toàn bộ {summary.width * summary.height} ô, không bỏ bớt khi vẽ. Timing
          JavaScript không thay số đo C++/SDL3; đây không phải chạy C++ trong trình duyệt.
        </p>
      )}
      {stage >= 8 && (
        <p className="lab-note">
          Seed chỉ đổi cách xếp ở cảnh Hỗn hợp; luật di chuyển không gọi RNG. Đổi order rồi Đặt lại
          để bắt đầu so sánh từ cùng dữ liệu.
        </p>
      )}
      {stage >= 9 && (
        <p className="lab-note">
          Nút kiểm chạy fixture chuẩn riêng, không sửa hộp đang vẽ và không chứng nhận scene tùy ý
          hoặc hiệu năng của máy.
        </p>
      )}
      {reducedMotion && (
        <p className="lab-note">
          Reduced motion đang bật: mô phỏng chỉ tiến bằng nút từng tick, vẫn cho phép vẽ và chọn ô.
        </p>
      )}
      {canvasError && (
        <p className="lab-note" role="alert">
          {canvasError}
        </p>
      )}
      <p className="lab-note" role="status">
        {summary.note}
      </p>
      <SandReadout summary={summary} />
    </>
  );
}
