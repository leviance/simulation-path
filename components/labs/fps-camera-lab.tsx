"use client";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import type { Vec3 } from "@/lib/labs/normal";
import {
  initialFpsScene,
  fpsStage,
  fpsPreset,
  fpsResults,
  fpsInput,
  turnFpsCamera,
  lookFpsScene,
  advanceFpsScene,
  toggleFpsMode,
  clampFpsRoom,
  fpsInsideRoom,
  type FpsScene,
  type FpsInput,
} from "@/lib/labs/fps-camera-scene";
import { FPS_ROOM_GEOMETRY } from "@/lib/labs/fps-camera-room";
import { drawFpsLab, fpsPointFromEvent } from "./fps-camera-lab-view";
import { LabReadout, useCanvasSize, useReducedMotion } from "./lab-shared";
import type { InteractiveLabMode } from "./types";
const format = (p: Vec3) => "(" + [p.x, p.y, p.z].map((x) => x.toFixed(3)).join(", ") + ")";
export default function FpsCameraLab({ mode }: { mode?: InteractiveLabMode }) {
  const canvasRef = useRef<HTMLCanvasElement>(null),
    size = useCanvasSize(canvasRef),
    reducedMotion = useReducedMotion(),
    stage = fpsStage(mode);
  const [scene, setScene] = useState<FpsScene>(initialFpsScene),
    sceneRef = useRef(scene);
  const drag = useRef<{ id: number; previous: { x: number; y: number } } | null>(null),
    keys = useRef(new Set<string>());
  const [captured, setCaptured] = useState(false),
    [moving, setMoving] = useState(false),
    [fps, setFps] = useState(60);
  const commit = useCallback((next: FpsScene) => {
    sceneRef.current = next;
    setScene(next);
  }, []);
  const cancelLook = useCallback(() => {
    const active = drag.current;
    drag.current = null;
    setCaptured(false);
    const canvas = canvasRef.current;
    if (active && canvas?.hasPointerCapture(active.id)) canvas.releasePointerCapture(active.id);
  }, []);
  const stopInput = useCallback(() => {
    keys.current.clear();
    setMoving(false);
    cancelLook();
  }, [cancelLook]);
  const reset = useCallback(
    (index = 0) => {
      stopInput();
      setFps(60);
      commit(fpsPreset(index));
    },
    [stopInput, commit],
  );
  const editPosition = (axis: keyof Vec3, value: number) => {
    if (!Number.isFinite(value)) return;
    stopInput();
    const s = sceneRef.current;
    let camera = { ...s.camera, position: { ...s.camera.position, [axis]: value } };
    camera = clampFpsRoom(camera, s.fly, stage >= 8 ? s.margin : 0.35);
    commit({ ...s, demo: false, camera });
  };
  const editAngle = (axis: "yaw" | "pitch", value: number) => {
    if (!Number.isFinite(value)) return;
    stopInput();
    const s = sceneRef.current;
    commit({
      ...s,
      demo: false,
      camera: turnFpsCamera(
        s.camera,
        axis === "yaw" ? value - s.camera.yaw : 0,
        axis === "pitch" ? value - s.camera.pitch : 0,
      ),
    });
  };
  const editNumber = (key: "speed" | "sensitivity" | "margin", value: number) => {
    if (!Number.isFinite(value)) return;
    stopInput();
    const s = sceneRef.current;
    const min = key === "speed" ? 1 : key === "sensitivity" ? 0.001 : 0,
      max = key === "speed" ? 7 : key === "sensitivity" ? 0.02 : 1;
    const next = { ...s, demo: false, [key]: Math.max(min, Math.min(max, value)) };
    if (stage >= 8) next.camera = clampFpsRoom(next.camera, next.fly, next.margin);
    commit(next);
  };
  const changeMode = () => {
    stopInput();
    commit(toggleFpsMode(sceneRef.current));
  };
  const togglePause = () => {
    stopInput();
    commit({ ...sceneRef.current, demo: false, paused: !sceneRef.current.paused });
  };
  const toggleDebug = () => {
    commit({ ...sceneRef.current, debug: !sceneRef.current.debug });
  };
  const toggleDemo = () => {
    stopInput();
    commit({
      ...sceneRef.current,
      demo: reducedMotion ? false : !sceneRef.current.demo,
      paused: false,
    });
  };
  const stepInput = (input: FpsInput, dt = 0.1) => {
    stopInput();
    const s = sceneRef.current;
    const next = advanceFpsScene({ ...s, paused: false, demo: false }, input, dt, stage);
    commit({ ...next, paused: s.paused });
  };
  const runSecond = () => {
    stopInput();
    let next = { ...sceneRef.current, paused: false, demo: false };
    for (let i = 0; i < fps; i++)
      next = advanceFpsScene(next, { strafe: 0, advance: 1, lift: 0 }, 1 / fps, stage);
    commit({ ...next, paused: sceneRef.current.paused });
  };
  const moveLook = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const active = drag.current;
    if (!active || active.id !== event.pointerId) return;
    const p = fpsPointFromEvent(event, size, true);
    if (!p) return;
    commit(lookFpsScene(sceneRef.current, p.x - active.previous.x, p.y - active.previous.y));
    active.previous = p;
  };
  const startLook = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (stage < 7 || !event.isPrimary || event.button !== 0 || drag.current) return;
    const p = fpsPointFromEvent(event, size);
    if (!p) return;
    event.preventDefault();
    event.currentTarget.focus({ preventScroll: true });
    drag.current = { id: event.pointerId, previous: p };
    commit({ ...sceneRef.current, paused: false, demo: false });
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
      setCaptured(true);
    } catch {
      drag.current = null;
      setCaptured(false);
    }
  };
  const pointerMove = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (drag.current?.id !== event.pointerId) return;
    if (event.pointerType === "mouse" && (event.buttons & 1) === 0) {
      cancelLook();
      return;
    }
    moveLook(event);
  };
  const pointerUp = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (drag.current?.id !== event.pointerId || event.button !== 0) return;
    moveLook(event);
    cancelLook();
  };
  const pointerCancel = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (drag.current?.id === event.pointerId) cancelLook();
  };
  const onKeyDown = (event: ReactKeyboardEvent<HTMLCanvasElement>) => {
    if (event.altKey || event.ctrlKey || event.metaKey || event.key === "Tab") return;
    const key = event.key.toLowerCase();
    const movementKeys = stage >= 6 ? ["w", "a", "s", "d", "q", "e"] : ["w", "a", "s", "d"];
    if (stage >= 5 && movementKeys.includes(key)) {
      event.preventDefault();
      if (sceneRef.current.paused || (event.repeat && !keys.current.has(key))) return;
      keys.current.add(key);
      setMoving(true);
      commit({ ...sceneRef.current, demo: false });
      return;
    }
    if (key === "r") {
      event.preventDefault();
      if (!event.repeat) reset();
      return;
    }
    if (key === "escape") {
      event.preventDefault();
      stopInput();
      commit({ ...sceneRef.current, demo: false, paused: true });
      return;
    }
    if (stage >= 6 && key === "m") {
      event.preventDefault();
      if (!event.repeat) changeMode();
      return;
    }
    if (stage >= 5 && key === " ") {
      event.preventDefault();
      if (!event.repeat) togglePause();
      return;
    }
    if (stage >= 8 && key === "t") {
      event.preventDefault();
      if (!event.repeat) toggleDemo();
      return;
    }
    if (stage >= 8 && key === "f") {
      event.preventDefault();
      if (!event.repeat) toggleDebug();
      return;
    }
    if (stage >= 8 && key === "n") {
      event.preventDefault();
      if (!event.repeat && sceneRef.current.paused) stepInput({ strafe: 0, advance: 1, lift: 0 });
      return;
    }
    const lookKeys: Record<string, ["yaw" | "pitch", number]> = {
      j: ["yaw", -1],
      l: ["yaw", 1],
      i: ["pitch", 1],
      k: ["pitch", -1],
      ArrowLeft: ["yaw", -1],
      ArrowRight: ["yaw", 1],
      ArrowUp: ["pitch", 1],
      ArrowDown: ["pitch", -1],
    };
    if (stage >= 3 && (lookKeys[key] || lookKeys[event.key])) {
      event.preventDefault();
      const [axis, sign] = lookKeys[key] || lookKeys[event.key];
      cancelLook();
      const s = sceneRef.current;
      commit({
        ...s,
        demo: false,
        camera: turnFpsCamera(
          s.camera,
          axis === "yaw" ? (sign * 3 * Math.PI) / 180 : 0,
          axis === "pitch" ? (sign * 3 * Math.PI) / 180 : 0,
        ),
      });
      return;
    }
  };
  const onKeyUp = (event: ReactKeyboardEvent<HTMLCanvasElement>) => {
    const key = event.key.toLowerCase();
    if (!keys.current.has(key)) return;
    event.preventDefault();
    keys.current.delete(key);
    setMoving(keys.current.size > 0);
  };
  useEffect(() => {
    const pause = () => {
      stopInput();
      commit({ ...sceneRef.current, paused: true, demo: false });
    };
    const hidden = () => {
      if (document.hidden) pause();
    };
    window.addEventListener("blur", pause);
    document.addEventListener("visibilitychange", hidden);
    return () => {
      window.removeEventListener("blur", pause);
      document.removeEventListener("visibilitychange", hidden);
      stopInput();
    };
  }, [stopInput, commit]);
  useEffect(() => {
    stopInput();
    commit(initialFpsScene());
    setFps(60);
  }, [mode, stopInput, commit]);
  useEffect(() => {
    stopInput();
    commit({ ...sceneRef.current, demo: false });
  }, [size.width, size.height, size.dpr, stopInput, commit]);
  useEffect(() => {
    if (reducedMotion) {
      stopInput();
      commit({ ...sceneRef.current, demo: false });
    }
  }, [reducedMotion, stopInput, commit]);
  useEffect(() => {
    if (stage < 5 || scene.paused || (!moving && (!scene.demo || reducedMotion))) return;
    let frame = 0,
      previous = performance.now();
    const animate = (now: number) => {
      const dt = Math.min(0.1, Math.max(0, (now - previous) / 1000));
      previous = now;
      const s = sceneRef.current;
      if (s.paused) return;
      let input = fpsInput(keys.current);
      if (s.demo && !reducedMotion && keys.current.size === 0)
        input = { strafe: 0, advance: 1, lift: 0 };
      commit(advanceFpsScene(s, input, dt, stage));
      frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [stage, scene.paused, scene.demo, moving, reducedMotion, commit]);
  useEffect(() => {
    const ctx = canvasRef.current?.getContext("2d");
    if (ctx) drawFpsLab(ctx, size, scene, stage);
  }, [size, scene, stage]);
  const r = fpsResults(scene, stage),
    debug = stage < 8 || scene.debug;
  return (
    <div className="lab-body">
      <div className="lab-controls">
        <label>
          Preset
          <select aria-label="Camera mẫu" value="" onChange={(e) => reset(Number(e.target.value))}>
            <option value="" disabled>
              Chọn thí nghiệm
            </option>
            {["Cửa vào", "Nhìn từ cuối phòng", "Yaw 90°", "Nhìn lên", "Sát tường"].map(
              (name, i) => (
                <option key={i} value={i}>
                  {name}
                </option>
              ),
            )}
          </select>
        </label>
        {stage >= 2 &&
          (["x", "z"] as const).map((axis) => (
            <label key={axis}>
              Camera {axis.toUpperCase()}
              <input
                aria-label={"Camera " + axis.toUpperCase()}
                type="range"
                min={axis === "x" ? -5.65 : 0.35}
                max={axis === "x" ? 5.65 : 21.65}
                step=".1"
                value={scene.camera.position[axis]}
                onChange={(e) => editPosition(axis, Number(e.target.value))}
              />
              <output>{scene.camera.position[axis].toFixed(2)}</output>
            </label>
          ))}
        {stage >= 6 && scene.fly && (
          <label>
            Camera Y
            <input
              aria-label="Camera Y"
              type="range"
              min=".35"
              max="3.65"
              step=".1"
              value={scene.camera.position.y}
              onChange={(e) => editPosition("y", Number(e.target.value))}
            />
            <output>{scene.camera.position.y.toFixed(2)}</output>
          </label>
        )}
        {stage >= 3 &&
          (["yaw", "pitch"] as const).map((axis) => (
            <label key={axis}>
              {axis}
              <input
                aria-label={axis === "yaw" ? "Yaw" : "Pitch"}
                type="range"
                min={axis === "yaw" ? -180 : -89}
                max={axis === "yaw" ? 180 : 89}
                step="1"
                value={(scene.camera[axis] * 180) / Math.PI}
                onChange={(e) => editAngle(axis, (Number(e.target.value) * Math.PI) / 180)}
              />
              <output>{((scene.camera[axis] * 180) / Math.PI).toFixed(1)}°</output>
            </label>
          ))}
        {stage >= 5 && (
          <>
            <label>
              Speed
              <input
                aria-label="Speed"
                type="range"
                min="1"
                max="7"
                step=".5"
                value={scene.speed}
                onChange={(e) => editNumber("speed", Number(e.target.value))}
              />
              <output>{scene.speed.toFixed(1)} world/s</output>
            </label>
            <label>
              FPS thí nghiệm
              <select
                aria-label="FPS thí nghiệm"
                value={fps}
                onChange={(e) => setFps(Number(e.target.value))}
              >
                {[30, 60, 144].map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </label>
            <button onClick={runSecond}>Đi W trong 1 giây</button>
            <button onClick={togglePause}>{scene.paused ? "Tiếp tục" : "Tạm dừng"}</button>
            {[
              ["W", 0, 1, 0],
              ["A", -1, 0, 0],
              ["S", 0, -1, 0],
              ["D", 1, 0, 0],
              ...(stage >= 6
                ? [
                    ["Q", 0, 0, -1],
                    ["E", 0, 0, 1],
                  ]
                : []),
            ].map(([label, strafe, advance, lift]) => (
              <button
                key={String(label)}
                onClick={() =>
                  stepInput({
                    strafe: Number(strafe),
                    advance: Number(advance),
                    lift: Number(lift),
                  })
                }
              >
                Bước {label} 0.1 s
              </button>
            ))}
          </>
        )}
        {stage >= 6 && <button onClick={changeMode}>Mode: {scene.fly ? "Fly" : "Walk"}</button>}
        {stage >= 7 && (
          <label>
            Sensitivity
            <input
              aria-label="Sensitivity"
              type="range"
              min=".001"
              max=".02"
              step=".0005"
              value={scene.sensitivity}
              onChange={(e) => editNumber("sensitivity", Number(e.target.value))}
            />
            <output>{scene.sensitivity.toFixed(4)} rad/input unit</output>
          </label>
        )}
        {stage >= 8 && (
          <>
            <label>
              Wall margin
              <input
                aria-label="Wall margin"
                type="range"
                min="0"
                max="1"
                step=".05"
                value={scene.margin}
                onChange={(e) => editNumber("margin", Number(e.target.value))}
              />
              <output>{scene.margin.toFixed(2)}</output>
            </label>

            <button onClick={toggleDemo} disabled={reducedMotion}>
              {scene.demo ? "Dừng đi thử" : "Đi thử tự động"}
            </button>
            <button onClick={toggleDebug}>{scene.debug ? "Ẩn debug" : "Hiện debug"}</button>
          </>
        )}
        <button onClick={() => reset()}>Đặt lại</button>
      </div>
      <canvas
        ref={canvasRef}
        style={{ height: "clamp(380px,58vw,560px)", touchAction: "none" }}
        tabIndex={0}
        onPointerDown={startLook}
        onPointerMove={pointerMove}
        onPointerUp={pointerUp}
        onPointerCancel={pointerCancel}
        onLostPointerCapture={pointerCancel}
        onKeyDown={onKeyDown}
        onKeyUp={onKeyUp}
        onBlur={() => {
          stopInput();
          commit({ ...sceneRef.current, paused: true, demo: false });
        }}
        aria-label="Căn phòng wireframe camera FPS: WASD đi, M Walk/Fly, Q/E lên xuống, kéo chuột hoặc IJKL nhìn quanh"
      />
      <p>
        World đứng yên; camera ở trong phòng 12×22×4. Walk giữ Y=1.6 và chỉ dùng yaw để đi; Fly dùng
        forward đầy đủ, Q/E đổi world Y. IJKL hoặc mũi tên đổi góc 3°; M đổi mode, R reset, Esc nhả
        thao tác. Space pause, N bước W 0.1s khi paused, T đi thử, F debug. Canvas dùng drag/pointer
        capture, KHÔNG phải relative mouse mode vô hạn của SDL. Delta drag tính bằng CSS pixel,
        không nhân DPR. Các hộp chỉ là mốc, collision giới hạn ở sáu biên ngoài. FPS thí nghiệm chỉ
        chia 1 giây thành N bước, không ép browser chạy ở N FPS.
        {reducedMotion
          ? " Reduced motion: tắt đi thử tự động; vẫn điều khiển tay và step được."
          : ""}
      </p>
      {debug && (
        <LabReadout
          items={[
            { label: "room geometry", value: FPS_ROOM_GEOMETRY.length + " world-space segments" },
            { label: "visible segments", value: String(r.segments.length) },
            { label: "camera position", value: format(r.camera.position) },
            { label: "world point", value: format(r.world) },
            { label: "sau trừ position", value: format(r.translated) },
            ...(stage >= 3
              ? [
                  { label: "view point", value: format(r.view) },
                  {
                    label: "yaw / pitch",
                    value:
                      ((r.camera.yaw * 180) / Math.PI).toFixed(1) +
                      "° / " +
                      ((r.camera.pitch * 180) / Math.PI).toFixed(1) +
                      "°",
                  },
                ]
              : []),
            ...(stage >= 4
              ? [
                  { label: "forward", value: format(r.basis.forward) },
                  { label: "right", value: format(r.basis.right) },
                  { label: "up", value: format(r.basis.up) },
                  { label: "basis error", value: r.basisError.toExponential(2) },
                ]
              : []),
            ...(stage >= 6 ? [{ label: "movement mode", value: scene.fly ? "Fly" : "Walk" }] : []),
            ...(stage >= 7
              ? [{ label: "pointer capture", value: captured ? "đang nhìn" : "đã nhả" }]
              : []),
            ...(stage >= 8
              ? [
                  {
                    label: "room bounds",
                    value: fpsInsideRoom(scene) ? "bên trong" : "vượt giới hạn",
                  },
                ]
              : []),
            ...(stage >= 9
              ? [{ label: "round-trip error", value: r.roundTrip.toExponential(2) }]
              : []),
          ]}
        />
      )}
    </div>
  );
}
