"use client";

import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useId,
  useReducer,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import {
  createSession,
  reduceSession,
  keyboardAction,
  PointerOwner,
  type RoomAction,
} from "@/lib/labs/raymarch-room/session";
import { SPHERE_CENTER } from "@/lib/labs/raymarch-room/scene";
import { useCanvasSize, useReducedMotion, usePauseOnReducedMotion } from "./lab-shared";
import { renderRoom } from "./raymarch-room/renderer";
import type { InteractiveLabMode } from "./types";

const RoomControls = lazy(() =>
  import("./raymarch-room/controls").then((module) => ({ default: module.RoomControls })),
);
const RoomReadout = lazy(() =>
  import("./raymarch-room/readout").then((module) => ({ default: module.RoomReadout })),
);

function RoomLab({ mode }: { mode?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pointer = useRef(new PointerOwner());
  const [state, dispatch] = useReducer(reduceSession, mode, createSession);
  const [capturing, setCapturing] = useState(false);
  const size = useCanvasSize(canvasRef);
  const reducedMotion = useReducedMotion();
  const hintId = useId();
  const release = useCallback((update = true) => {
    const canvas = canvasRef.current,
      id = pointer.current.id;
    pointer.current.clear();
    if (canvas && id !== null && canvas.hasPointerCapture(id)) canvas.releasePointerCapture(id);
    if (update) setCapturing(false);
  }, []);
  const apply = useCallback(
    (action: RoomAction) => {
      if (action.type === "reset" || action.type === "preset") release();
      dispatch(action);
    },
    [release],
  );
  const pause = useCallback(() => dispatch({ type: "pause" }), []);
  usePauseOnReducedMotion(pause);

  useEffect(() => {
    const blur = () => {
      release();
      pause();
    };
    const hidden = () => {
      if (document.hidden) blur();
    };
    window.addEventListener("blur", blur);
    document.addEventListener("visibilitychange", hidden);
    return () => {
      window.removeEventListener("blur", blur);
      document.removeEventListener("visibilitychange", hidden);
      release(false);
    };
  }, [pause, release]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const dispose = renderRoom(canvas, size, state, () => {
      if (!state.paused && !reducedMotion && (state.stage === 4 || state.stage >= 8)) {
        timer = setTimeout(() => dispatch({ type: "tick" }), state.stage === 4 ? 300 : 100);
      }
    });
    return () => {
      dispose();
      if (timer !== null) clearTimeout(timer);
    };
  }, [state, size, reducedMotion]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const wheel = (event: WheelEvent) => {
      if (document.activeElement !== canvas || (state.stage !== 2 && state.stage < 9)) return;
      event.preventDefault();
      dispatch({
        type: "fov",
        value: state.camera.verticalFieldOfViewRadians + Math.sign(event.deltaY) * 0.04,
      });
    };
    canvas.addEventListener("wheel", wheel, { passive: false });
    return () => canvas.removeEventListener("wheel", wheel);
  }, [state.stage, state.camera.verticalFieldOfViewRadians]);

  const pointAction = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const box = event.currentTarget.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (event.clientX - box.left) / Math.max(1, box.width)));
    const y = Math.max(0, Math.min(1, (event.clientY - box.top) / Math.max(1, box.height)));
    if (state.stage === 3)
      dispatch({
        type: "sample",
        point: {
          x: SPHERE_CENTER.x + (((2 * x - 1) * size.width) / size.height) * 1.7,
          y: SPHERE_CENTER.y + (1 - 2 * y) * 1.7,
          z: 0.15,
        },
      });
    else if (state.stage === 4) dispatch({ type: "ray", offset: (x - 0.5) * 2.4 });
    else dispatch({ type: "pixel", x, y });
  };

  return (
    <>
      <canvas
        ref={canvasRef}
        className="lab-canvas"
        tabIndex={0}
        aria-label="Canvas Project 36: camera ray, SDF và ray marching"
        aria-describedby={hintId}
        onKeyDown={(event) => {
          const action = keyboardAction(
            {
              key: event.key,
              repeat: event.repeat,
              ctrlKey: event.ctrlKey,
              metaKey: event.metaKey,
              altKey: event.altKey,
              isComposing: event.nativeEvent.isComposing,
            },
            state,
          );
          if (!action) return;
          event.preventDefault();
          if (action.type === "play" && reducedMotion) return;
          if (event.key === "Escape") release();
          apply(action);
        }}
        onBlur={() => release()}
        onPointerDown={(event) => {
          if (
            !pointer.current.begin(
              event.pointerId,
              event.button,
              event.isPrimary,
              event.clientX,
              event.clientY,
            )
          )
            return;
          event.currentTarget.focus();
          try {
            event.currentTarget.setPointerCapture(event.pointerId);
          } catch {
            release();
            return;
          }
          setCapturing(true);
          pointAction(event);
        }}
        onPointerMove={(event) => {
          if (pointer.current.id !== event.pointerId) return;
          const delta = pointer.current.move(
            event.pointerId,
            event.buttons,
            event.clientX,
            event.clientY,
          );
          if (!delta) {
            release();
            return;
          }
          if (state.stage === 2 || state.stage >= 9)
            dispatch({ type: "look", dx: delta.dx, dy: delta.dy });
          else pointAction(event);
        }}
        onPointerUp={(event) => {
          if (pointer.current.id === event.pointerId) release();
        }}
        onPointerCancel={(event) => {
          if (pointer.current.id === event.pointerId) release();
        }}
        onLostPointerCapture={(event) => {
          if (pointer.current.id === event.pointerId) release();
        }}
      />
      <Suspense fallback={<p role="status">Đang tải điều khiển ray-march…</p>}>
        <RoomControls state={state} dispatch={apply} reducedMotion={reducedMotion} />
      </Suspense>
      <Suspense fallback={<p role="status">Đang tải số liệu tia và sai số…</p>}>
        <RoomReadout state={state} size={size} capturing={capturing} />
      </Suspense>
      <p id={hintId} className="lab-hint">
        {state.stage === 1
          ? "Kéo hoặc dùng mũi tên để chọn fragment. Lưới có cạnh 32 pixel vật lý. "
          : null}
        {state.stage === 3
          ? "Kéo điểm trên lát cắt; Sample X/Y là cách dùng bàn phím thay chuột. "
          : null}
        {state.stage === 4
          ? "Preset chọn tia; N/Một mẫu đọc thêm một SDF sample. Vòng tròn dùng |distance| kể cả bên trong sphere. "
          : null}
        {state.stage >= 5 && state.stage < 9
          ? "Kéo để chọn tia/điểm chạm, không xoay scene. "
          : null}
        {state.stage === 2 || state.stage >= 9
          ? "Canvas: kéo chuột trái hoặc mũi tên để nhìn; con lăn khi đang focus đổi FOV. "
          : null}
        {state.stage >= 9
          ? "WASD/QE đi từng bước 0,2m; bản SDL dùng phím giữ với dt và chuột phải. "
          : null}
        {state.stage >= 10
          ? "V đổi view. Oracle riêng dùng preset sphere-only, không phải mọi điểm trong ảnh phòng. "
          : null}
        R đặt lại đúng preset đã chọn; Escape nhả pointer/dừng clock. Chỉ Canvas đang focus nhận
        phím.
        {reducedMotion ? " Reduced motion: tự chạy đã dừng, vẫn có thể tiến từng bước." : null}
      </p>
      {state.stage >= 8 ? (
        <p className="lab-hint">
          Ảnh CPU được dựng theo batch; clock tăng tối đa 0,05 giây sau mỗi ảnh hoàn tất, không chạy
          theo FPS trình duyệt. Pause chỉ dừng đèn; camera và controls vẫn dùng được.
        </p>
      ) : null}
      <p className="lab-hint">
        Mô tả thay thế:{" "}
        {state.stage <= 3
          ? "tọa độ và dấu của khoảng cách được đọc bằng số bên trên."
          : "mỗi tia hỏi cùng scene SDF, rồi dừng bằng epsilon hoặc giới hạn công việc. Không có mesh của vật thể."}{" "}
        Canvas 2D hỗ trợ học công thức, không thay ứng dụng C++/OpenGL.
      </p>
    </>
  );
}
export default function RayMarchedShapeRoomLab({ mode }: { mode?: InteractiveLabMode }) {
  return <RoomLab key={mode ?? "final"} mode={mode} />;
}
