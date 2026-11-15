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
import { HeatSession } from "@/lib/labs/heat-plate/session";
import { pointerCell } from "@/lib/labs/heat-plate/view";
import {
  canvasPoint,
  useCanvasSize,
  useReducedMotion,
  usePauseOnReducedMotion,
} from "../lab-shared";
import { HeatPainter } from "./paint";
import { HeatControls } from "./controls";
import { HeatReadout } from "./readout";

export default function HeatWorkshop({ stage }: { stage: number }) {
  const [session] = useState(() => new HeatSession(stage));
  const [summary, setSummary] = useState(() => session.summary());
  const [canvasError, setCanvasError] = useState("");
  const [ready, setReady] = useState(false);
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
  const resize = useCallback(() => {
    release();
    session.resize();
  }, [release, session]);
  const size = useCanvasSize(canvasRef, resize);
  const stop = useCallback(() => {
    release();
    session.pause();
    publish();
  }, [release, session, publish]);
  usePauseOnReducedMotion(stop);
  useEffect(() => {
    session.mount();
    const readyFrame = requestAnimationFrame(() => setReady(true));
    const hidden = () => {
      if (document.hidden) stop();
    };
    window.addEventListener("blur", stop);
    document.addEventListener("visibilitychange", hidden);
    return () => {
      cancelAnimationFrame(readyFrame);
      window.removeEventListener("blur", stop);
      document.removeEventListener("visibilitychange", hidden);
      release();
      session.dispose();
    };
  }, [session, release, stop]);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const painter = new HeatPainter();
    let frame = 0;
    let lastProcess = performance.now();
    let lastPublish = lastProcess;
    let clockRevision = session.clockRevision;
    let disposed = false;
    let reportedError = false;
    needsPaint.current = true;
    const animate = (time: number) => {
      if (disposed) return;
      if (clockRevision !== session.clockRevision) {
        clockRevision = session.clockRevision;
        lastProcess = time;
      }
      if (!session.paused && time - lastProcess >= 1000 / session.fps - 0.25) {
        session.advance((time - lastProcess) / 1000);
        lastProcess = time;
        needsPaint.current = true;
        needsSummary.current = true;
      }
      if (needsPaint.current) {
        const ok = painter.draw(canvas, size, session);
        needsPaint.current = false;
        if (!ok && !reportedError) {
          reportedError = true;
          session.pause();
          setCanvasError(
            "Canvas 2D không khả dụng; dùng bộ điều khiển và bảng số bên ngoài để đọc trạng thái.",
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
      disposed = true;
      cancelAnimationFrame(frame);
      painter.dispose();
    };
  }, [session, size, publish]);
  const invoke = (action: () => void) => {
    release();
    try {
      action();
    } catch (error) {
      session.pause();
      session.note = error instanceof Error ? error.message : "Thao tác bị từ chối; giữ lưới cũ.";
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
      session.field,
    );
  };
  const down = (event: PointerEvent<HTMLCanvasElement>) => {
    if (activePointer.current !== null || (event.button !== 0 && event.button !== 2)) return;
    const point = locate(event);
    if (!point) return;
    event.preventDefault();
    event.currentTarget.focus();
    if (stage >= 8 && event.shiftKey) {
      invoke(() => session.selectProbe(point));
      return;
    }
    session.pointerBegin(point, event.button === 2);
    if (stage >= 2) {
      event.currentTarget.setPointerCapture(event.pointerId);
      activePointer.current = event.pointerId;
    }
    needsPaint.current = true;
    publish();
  };
  const move = (event: PointerEvent<HTMLCanvasElement>) => {
    if (activePointer.current !== null && activePointer.current !== event.pointerId) return;
    session.pointerMove(locate(event));
    needsPaint.current = true;
    needsSummary.current = true;
  };
  const end = (event: PointerEvent<HTMLCanvasElement>) => {
    if (activePointer.current !== event.pointerId) return;
    release();
    publish();
  };
  const keyDown = (event: KeyboardEvent<HTMLCanvasElement>) => {
    if (event.ctrlKey || event.metaKey || event.altKey) return;
    const arrows = ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"];
    if (event.repeat && !arrows.includes(event.key)) {
      if (event.key === " " || event.key === "Enter") event.preventDefault();
      return;
    }
    const stride = event.shiftKey ? 16 : 1;
    const key = event.key.toLowerCase();
    let action: (() => void) | null = null;
    if (event.key === "ArrowLeft") action = () => session.moveCursor(-stride, 0);
    else if (event.key === "ArrowRight") action = () => session.moveCursor(stride, 0);
    else if (event.key === "ArrowUp") action = () => session.moveCursor(0, -stride);
    else if (event.key === "ArrowDown") action = () => session.moveCursor(0, stride);
    else if (key === "enter") action = () => session.stampAtCursor();
    else if (key === "n") action = () => session.singleStep();
    else if (key === " " && !reducedMotion) action = () => session.toggleRun();
    else if (key === "r") action = () => session.reset();
    else if (key === "c") action = () => session.reset(session.preset, true);
    else if (key === "1" || key === "2")
      action = () =>
        session.setBrush(
          session.brushMode === "unpin" ? "temperature" : session.brushMode,
          key === "1" ? 1 : 0,
        );
    else if (key === "h")
      action = () => session.setBrush(session.brushMode === "heater" ? "temperature" : "heater");
    else if (key === "e") action = () => session.setBrush("unpin");
    else if (key === "[") action = () => session.setRadius(session.radius - 1);
    else if (key === "]") action = () => session.setRadius(session.radius + 1);
    else if (key === "l" && stage >= 8) action = () => session.selectProbe(session.cursor);
    else if (key === "u") action = () => session.toggleExperiment();
    else if (key === "v") action = () => session.validate();
    if (!action) return;
    event.preventDefault();
    invoke(action);
  };
  return (
    <>
      <fieldset
        disabled={!ready}
        aria-label="Điều khiển trường nhiệt"
        data-heat-ready={ready}
        style={{ border: 0, padding: 0, margin: 0, minWidth: 0 }}
      >
        <HeatControls
          session={session}
          summary={summary}
          reducedMotion={reducedMotion}
          invoke={invoke}
        />
      </fieldset>
      <canvas
        ref={canvasRef}
        className="lab-canvas"
        tabIndex={ready ? 0 : -1}
        aria-busy={!ready}
        aria-label="Tấm kim loại nóng"
        aria-describedby={helpId}
        style={{
          touchAction: "none",
          pointerEvents: ready ? "auto" : "none",
          height: "clamp(360px, 58vh, 620px)",
        }}
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={end}
        onPointerCancel={end}
        onLostPointerCapture={end}
        onBlur={release}
        onKeyDown={keyDown}
        onContextMenu={(event) => event.preventDefault()}
      >
        Trường nhiệt {summary.size}×{summary.size}: xanh đậm là nhiệt độ thấp, cam/sáng là cao; số
        liệu chính xác nằm trong bảng dưới.
      </canvas>
      <p id={helpId} className="lab-note">
        Mũi tên chọn ô, Shift+mũi tên đi 16 ô; Enter tô, 1/2 chọn nóng/lạnh; chuột trái tô, chuột
        phải đặt lạnh. H đổi bút thường/heater, E bỏ heater; N tiến bước, Space chạy/dừng, R đặt
        lại, C xóa. L hoặc Shift+click đặt probe. Nút và slider bên ngoài dùng được bằng Tab.
      </p>
      <p className="lab-note">
        {summary.settings.experiment
          ? "Thang màu thí nghiệm cố định [-1, 2], tâm 0,5. Màu có thể bão hòa, giá trị theta thật không bị cắt."
          : "Thang màu cố định [0, 1]: xanh đậm → cyan → vàng → cam → kem sáng. Không tự đổi thang theo min/max của từng khung hình."}
      </p>
      {stage < 3 && (
        <p className="lab-note">
          Bài này chưa có bước lan nhiệt. Dữ liệu chỉ đổi khi đặt cảnh hoặc tô; chưa có animation
          giấu sẵn.
        </p>
      )}
      {stage === 3 && (
        <p className="lab-note">
          Mới chỉ trao đổi theo chiều ngang. Các hàng độc lập; cảnh khởi đầu chỉ làm nóng hàng giữa.
        </p>
      )}
      {stage >= 5 && (
        <p className="lab-note">
          Bút thường đặt nhiệt độ một lần. Heater giữ theta sau mỗi bước, không phải nguồn công suất
          cố định. Vành lạnh giữ tâm các ô ngoài ở 0; biên cách nhiệt đóng các mặt ngoài của miền.
        </p>
      )}
      {stage >= 7 && (
        <p className="lab-note">
          Canvas cập nhật/vẽ đủ {summary.size * summary.size} ô. Các lưới 128/192/256 phủ cùng miền
          cách nhiệt 96×96; đổi độ phân giải sẽ đổi h và giới hạn dt, không tự sửa D/dt. Timing
          JavaScript không thay benchmark C++.
        </p>
      )}
      {reducedMotion && (
        <p className="lab-note">
          Reduced motion đang bật: chỉ tiến từng bước; tô, chọn ô và các điều khiển vẫn hoạt động.
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
      <HeatReadout summary={summary} />
    </>
  );
}
