"use client";
import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  type FocusEvent as ReactFocusEvent,
} from "react";
import {
  makeTankScene,
  tankStage,
  stopTankScene,
  editTankScene,
  stepTankScene,
  requestTankFast,
  advanceTankFrame,
  spawnTankBodies,
  kickTankBall,
  orbitTankCamera,
  type TankSetting,
  type TankScene,
} from "@/lib/labs/collision-scene";
import { collisionScale, collisionSubtract } from "@/lib/labs/collision-tank";
import {
  tankEventPoint,
  hitTankBall,
  tankScreenToWorld,
  drawTankCanvas,
} from "./collision-tank-view";
import { createTankRaster, type TankRaster } from "./collision-raster";
import { LabReadout, useCanvasSize, usePauseOnReducedMotion, useReducedMotion } from "./lab-shared";
import type { InteractiveLabMode } from "./types";
type Point = { x: number; y: number };
const CollisionControls = lazy(() =>
  import("./collision-controls").then((module) => ({ default: module.CollisionControls })),
);
const CollisionReadout = lazy(() =>
  import("./collision-readout").then((module) => ({ default: module.CollisionReadout })),
);
type Gesture = {
  id: number;
  kind: "kick" | "orbit";
  index: number;
  start: Point;
  current: Point;
  camera: { yaw: number; pitch: number };
};
export default function CollisionTankLab({ mode }: { mode?: InteractiveLabMode }) {
  return <Tank key={mode ?? "collision-final"} mode={mode} />;
}
function Tank({ mode }: { mode?: InteractiveLabMode }) {
  const stage = tankStage(mode),
    canvasRef = useRef<HTMLCanvasElement>(null),
    rasterRef = useRef<TankRaster | null>(null);
  const [scene, setScene] = useState(() => makeTankScene(stage)),
    sceneRef = useRef(scene);
  const [gesture, setGesture] = useState<Gesture | null>(null),
    gestureRef = useRef<Gesture | null>(null);
  const reducedMotion = useReducedMotion();
  const commit = useCallback((next: TankScene) => {
    sceneRef.current = next;
    setScene(next);
  }, []);
  const cancelGesture = useCallback(() => {
    const active = gestureRef.current;
    gestureRef.current = null;
    setGesture(null);
    if (active && canvasRef.current?.hasPointerCapture(active.id))
      canvasRef.current.releasePointerCapture(active.id);
  }, []);
  const stop = useCallback(() => {
    cancelGesture();
    commit(stopTankScene(sceneRef.current));
  }, [cancelGesture, commit]);
  const size = useCanvasSize(canvasRef, stop);
  usePauseOnReducedMotion(stop);
  const edit = useCallback(
    (key: TankSetting, value: number) => {
      cancelGesture();
      commit(editTankScene(sceneRef.current, key, value));
    },
    [cancelGesture, commit],
  );
  const reset = useCallback(() => {
    cancelGesture();
    commit(makeTankScene(stage));
  }, [cancelGesture, commit, stage]);
  const step = useCallback(() => {
    cancelGesture();
    commit(stepTankScene(sceneRef.current));
  }, [cancelGesture, commit]);
  const fast = useCallback(() => {
    cancelGesture();
    commit(requestTankFast(sceneRef.current));
  }, [cancelGesture, commit]);
  const spawn = useCallback(() => {
    cancelGesture();
    commit(spawnTankBodies(sceneRef.current));
  }, [cancelGesture, commit]);
  const toggleDebug = useCallback(() => {
    cancelGesture();
    commit({ ...sceneRef.current, debug: !sceneRef.current.debug });
  }, [cancelGesture, commit]);
  const orbit = useCallback(
    (yaw: number, pitch: number, distance?: number) => {
      cancelGesture();
      commit(orbitTankCamera(sceneRef.current, yaw, pitch, distance));
    },
    [cancelGesture, commit],
  );
  const togglePause = useCallback(() => {
    cancelGesture();
    const current = sceneRef.current;
    if (current.fastRemaining > 0) {
      commit(stopTankScene(current));
      return;
    }
    commit({ ...current, paused: reducedMotion || current.stage < 2 ? true : !current.paused });
  }, [cancelGesture, commit, reducedMotion]);
  const updateGesture = useCallback(
    (event: ReactPointerEvent<HTMLCanvasElement>) => {
      const active = gestureRef.current;
      if (!active || active.id !== event.pointerId) return;
      const point = tankEventPoint(event, size);
      if (!point) return;
      const next = { ...active, current: point };
      gestureRef.current = next;
      setGesture(next);
      if (active.kind === "orbit")
        commit(
          orbitTankCamera(
            sceneRef.current,
            active.camera.yaw + (point.x - active.start.x) * 0.006,
            active.camera.pitch + (point.y - active.start.y) * 0.006,
          ),
        );
    },
    [size, commit],
  );
  const onPointerDown = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (!event.isPrimary || event.button !== 0 || gestureRef.current) return;
    const point = tankEventPoint(event, size),
      current = sceneRef.current;
    if (!point || point.x < 0 || point.x > 1100 || point.y < 85 || point.y > 650) return;
    const index = current.spatial ? -1 : hitTankBall(current, point);
    if (!current.spatial && (current.stage < 11 || index < 0)) return;
    event.currentTarget.focus();
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      return;
    }
    const next: Gesture = {
      id: event.pointerId,
      kind: current.spatial ? "orbit" : "kick",
      index,
      start: point,
      current: point,
      camera: { ...current.camera },
    };
    gestureRef.current = next;
    setGesture(next);
    commit(stopTankScene(current));
  };
  const onPointerMove = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (gestureRef.current?.id !== event.pointerId) return;
    if (!(event.buttons & 1)) {
      cancelGesture();
      return;
    }
    updateGesture(event);
  };
  const onPointerUp = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (gestureRef.current?.id !== event.pointerId || event.button !== 0) return;
    updateGesture(event);
    const active = gestureRef.current;
    if (active?.kind === "kick") {
      const change = collisionScale(
        collisionSubtract(tankScreenToWorld(active.current), tankScreenToWorld(active.start)),
        2,
      );
      commit(kickTankBall(sceneRef.current, active.index, change));
    }
    cancelGesture();
  };
  const onPointerCancel = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (gestureRef.current?.id === event.pointerId) cancelGesture();
  };
  const onCanvasBlur = (event: ReactFocusEvent<HTMLCanvasElement>) => {
    if (event.currentTarget.parentElement?.contains(event.relatedTarget)) cancelGesture();
    else stop();
  };
  const onKeyDown = (event: ReactKeyboardEvent<HTMLCanvasElement>) => {
    if (event.altKey || event.ctrlKey || event.metaKey || event.repeat || event.key === "Tab")
      return;
    const key = event.key.toLowerCase(),
      s = sceneRef.current;
    if (key === " ") togglePause();
    else if (key === "n") step();
    else if (key === "r") reset();
    else if (key === "f") toggleDebug();
    else if (stage >= 2 && (key === "[" || key === "]"))
      edit("dtIndex", Math.max(0, Math.min(2, s.dtIndex + (key === "[" ? -1 : 1))));
    else if (stage >= 3 && key === "e")
      edit("restitution", s.restitution <= 0.01 ? 1 : Math.max(0, s.restitution - 0.2));
    else if (stage >= 6 && key === "d") edit("correction", Number(!s.correction));
    else if (stage >= 7 && key === "i") edit("iterations", (s.iterations % 8) + 1);
    else if (stage >= 7 && key === "c") edit("count", s.count === 256 ? 64 : 256);
    else if (stage >= 8 && key === "h") edit("elastic", Number(!s.elastic));
    else if (stage >= 8 && key === "enter") fast();
    else if (stage >= 10 && (key === "2" || key === "3")) edit("dimension", Number(key));
    else if (s.spatial && (key === "arrowleft" || key === "arrowright"))
      orbit(s.camera.yaw + (key === "arrowleft" ? -0.1 : 0.1), s.camera.pitch);
    else if (s.spatial && (key === "arrowup" || key === "arrowdown"))
      orbit(s.camera.yaw, s.camera.pitch + (key === "arrowup" ? 0.1 : -0.1));
    else if (stage >= 11 && key === "b") spawn();
    else return;
    event.preventDefault();
  };
  useEffect(() => {
    const hidden = () => {
      if (document.hidden) stop();
    };
    window.addEventListener("blur", stop);
    document.addEventListener("visibilitychange", hidden);
    return () => {
      window.removeEventListener("blur", stop);
      document.removeEventListener("visibilitychange", hidden);
      cancelGesture();
      rasterRef.current = null;
    };
  }, [stop, cancelGesture]);
  const active = (!scene.paused && !reducedMotion) || scene.fastRemaining > 0;
  useEffect(() => {
    if (!active) return;
    let frame = 0,
      previous = performance.now(),
      disposed = false;
    const animate = (now: number) => {
      if (disposed) return;
      const current = sceneRef.current;
      if (current.paused && current.fastRemaining === 0) return;
      const next = advanceTankFrame(current, Math.max(0, (now - previous) / 1000));
      previous = now;
      commit(next);
      if (!disposed && (!next.paused || next.fastRemaining > 0))
        frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);
    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
    };
  }, [active, commit]);
  useEffect(() => {
    const context = canvasRef.current?.getContext("2d");
    if (!context) return;
    if (scene.spatial && !rasterRef.current) rasterRef.current = createTankRaster();
    drawTankCanvas(
      context,
      size,
      scene,
      rasterRef.current,
      gesture?.kind === "kick" ? gesture : null,
    );
  }, [scene, size, gesture]);
  return (
    <div className="lab-body">
      <Suspense fallback={<p role="status">Đang tải điều khiển bể bóng…</p>}>
        <CollisionControls
          scene={scene}
          reducedMotion={reducedMotion}
          edit={edit}
          reset={reset}
          step={step}
          togglePause={togglePause}
          fast={fast}
          spawn={spawn}
          stop={stop}
          toggleDebug={toggleDebug}
          orbit={orbit}
        />
      </Suspense>
      <canvas
        ref={canvasRef}
        tabIndex={0}
        aria-label="Bể va chạm: circle 2D và sphere 3D, contact normal và impulse"
        style={{ height: "clamp(500px,62vw,660px)", touchAction: "none" }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerCancel}
        onLostPointerCapture={onPointerCancel}
        onKeyDown={onKeyDown}
        onBlur={onCanvasBlur}
      />
      <p>
        Space: pause; N: một bước; R: mặc định; F: debug.
        {stage >= 2 && " [ / ]: dt."}
        {stage >= 3 && " E: restitution."}
        {stage >= 6 && " D: sửa chồng lấn."}
        {stage >= 7 && " I: iterations; C: số bóng."}
        {stage >= 8 && " H: vật liệu đàn hồi; Enter: tua 2 giây."}
        {stage >= 10 && " 2/3: đổi không gian; trong 3D, kéo để orbit, mũi tên đổi góc camera."}
        {stage >= 11 && " B: spawn; trong 2D, kéo đúng bóng rồi thả để kick."} Tab rời Canvas.
      </p>
      {reducedMotion && (
        <p>
          Reduced motion: chuyển động liên tục bị tắt; nút bước, camera và job hữu hạn vẫn dùng
          được.
        </p>
      )}
      {scene.message && <p role="status">{scene.message}</p>}
      {scene.debug ? (
        <Suspense
          fallback={
            <LabReadout items={[{ label: "Trạng thái", value: "Đang tải số liệu va chạm…" }]} />
          }
        >
          <CollisionReadout scene={scene} capturing={gesture !== null} />
        </Suspense>
      ) : (
        <LabReadout
          items={[
            {
              label: "Trạng thái",
              value: `${scene.spatial ? "3D" : "2D"} · ${scene.paused ? "tạm dừng" : "đang chạy"} · t=${scene.elapsed.toFixed(3)} s`,
            },
          ]}
        />
      )}
      {stage >= 8 && (
        <p>
          Động lượng của cả đàn không cố định khi va tường. Residual đối chiếu P−P₀ với tổng xung
          lực từ tường. Thêm bóng hoặc kick sẽ bắt đầu lại mốc đo. History lấy mẫu sau từng bước
          physics; không lấy mẫu khi vẽ. Đồ thị K và độ xuyên dùng hai thang dọc riêng.
        </p>
      )}
      {stage === 9 && (
        <p>
          Bài này kiểm công thức sphere bằng ví dụ số; bể tương tác vẫn là 2D. Bài 10 sẽ dựng góc
          nhìn 3D thật cho toàn bộ đàn.
        </p>
      )}
    </div>
  );
}
