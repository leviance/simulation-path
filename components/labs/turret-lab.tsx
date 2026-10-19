"use client";

import {
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import { normalizeAngle, TAU } from "@/lib/labs/angle";
import { dot } from "@/lib/labs/turret";
import {
  turretScene,
  turretLayers,
  turretResults,
  turretScreenToWorld,
  setTurretTarget,
  applyTurretPreset,
  advanceTurret,
  type TurretScene,
} from "@/lib/labs/turret-scene";
import { LabReadout, useCanvasSize, useReducedMotion } from "./lab-shared";
import { drawTurretLab, turretPointFromEvent } from "./turret-lab-view";
import type { InteractiveLabMode } from "./types";

export default function TurretLab({ mode }: { mode?: InteractiveLabMode }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const size = useCanvasSize(canvasRef);
  const reducedMotion = useReducedMotion();
  const [scene, setScene] = useState(turretScene);
  const sceneRef = useRef(scene);
  const [paused, setPaused] = useState(false);
  const pausedRef = useRef(false);
  const owner = useRef<number | null>(null);
  const previousMode = useRef(mode);
  const layers = turretLayers(mode);
  const result = turretResults(scene);
  const updateScene = (next: TurretScene) => {
    sceneRef.current = next;
    setScene(next);
  };
  const pause = (value: boolean) => {
    pausedRef.current = value;
    setPaused(value);
  };
  const release = () => {
    const id = owner.current;
    owner.current = null;
    const canvas = canvasRef.current;
    if (id !== null && canvas?.hasPointerCapture(id)) canvas.releasePointerCapture(id);
    if (sceneRef.current.dragging) updateScene({ ...sceneRef.current, dragging: false });
  };
  const reset = () => {
    release();
    pause(true);
    updateScene({ ...turretScene(), followMouse: false });
  };
  const togglePause = () => {
    release();
    pause(!pausedRef.current);
  };
  const choosePreset = (index: number) => {
    release();
    pause(true);
    updateScene(applyTurretPreset(sceneRef.current, index));
  };
  const changeHeading = (angle: number) => {
    release();
    pause(true);
    updateScene({ ...sceneRef.current, turretAngle: normalizeAngle(angle) });
  };
  const toggleFollow = (enabled: boolean) => {
    release();
    updateScene({ ...sceneRef.current, followMouse: enabled });
  };
  const step = () => {
    release();
    pause(true);
    updateScene(advanceTurret(sceneRef.current, 0.1));
  };

  useEffect(() => {
    const blur = () => {
      release();
      pause(true);
    };
    const hidden = () => {
      if (document.hidden) blur();
    };
    window.addEventListener("blur", blur);
    document.addEventListener("visibilitychange", hidden);
    return () => {
      window.removeEventListener("blur", blur);
      document.removeEventListener("visibilitychange", hidden);
      release();
    };
  }, []);
  useEffect(() => {
    release();
    if (previousMode.current !== mode) {
      previousMode.current = mode;
      reset();
    }
  }, [size.width, size.height, size.dpr, mode]);
  useEffect(() => {
    if (reducedMotion) {
      release();
      pause(true);
    }
  }, [reducedMotion]);
  useEffect(() => {
    if (!layers.rotation || paused || reducedMotion) return;
    let frame = 0;
    let previous = performance.now();
    const animate = (now: number) => {
      const deltaTime = Math.min(0.1, Math.max(0, (now - previous) / 1000));
      previous = now;
      if (!document.hidden && !pausedRef.current)
        updateScene(advanceTurret(sceneRef.current, deltaTime));
      frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [layers.rotation, paused, reducedMotion, mode]);
  useEffect(() => {
    const ctx = canvasRef.current?.getContext("2d");
    if (ctx) drawTurretLab(ctx, size, scene, turretLayers(mode));
  }, [size, scene, mode]);

  const startDrag = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (!event.isPrimary || event.button !== 0 || owner.current !== null) return;
    const screen = turretPointFromEvent(event, size);
    if (!screen) return;
    event.preventDefault();
    event.currentTarget.focus();
    owner.current = event.pointerId;
    updateScene({
      ...setTurretTarget(sceneRef.current, turretScreenToWorld(screen)),
      dragging: true,
    });
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      release();
    }
  };
  const moveTarget = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (owner.current !== null && owner.current !== event.pointerId) return;
    if (owner.current !== null && (event.buttons & 1) === 0) {
      release();
      return;
    }
    if (
      owner.current === null &&
      (!sceneRef.current.followMouse ||
        event.pointerType !== "mouse" ||
        !event.isPrimary ||
        event.buttons !== 0)
    )
      return;
    const screen = turretPointFromEvent(event, size, owner.current !== null);
    if (!screen) {
      if (owner.current !== null) release();
      return;
    }
    updateScene(setTurretTarget(sceneRef.current, turretScreenToWorld(screen)));
  };
  const stopDrag = (event: ReactPointerEvent<HTMLCanvasElement>, cancelled = false) => {
    if (owner.current !== event.pointerId || (!cancelled && event.button !== 0)) return;
    const screen = turretPointFromEvent(event, size, true);
    if (!cancelled && screen)
      updateScene(setTurretTarget(sceneRef.current, turretScreenToWorld(screen)));
    release();
  };
  const onKeyDown = (event: ReactKeyboardEvent<HTMLCanvasElement>) => {
    if (event.altKey || event.ctrlKey || event.metaKey) return;
    const key = event.key;
    if (
      ![
        "ArrowLeft",
        "ArrowRight",
        "ArrowUp",
        "ArrowDown",
        " ",
        "r",
        "R",
        "s",
        "S",
        "a",
        "A",
        "d",
        "D",
        "f",
        "F",
        "Escape",
      ].includes(key)
    )
      return;
    event.preventDefault();
    if (key === " ") {
      if (!event.repeat) togglePause();
      return;
    }
    if (key === "Escape") {
      release();
      return;
    }
    if (key.toLowerCase() === "r") {
      if (!event.repeat) reset();
      return;
    }
    if (key.toLowerCase() === "f") {
      if (!event.repeat) toggleFollow(!sceneRef.current.followMouse);
      return;
    }
    if (key.toLowerCase() === "s") {
      if (!event.repeat && layers.rotation && (pausedRef.current || reducedMotion)) step();
      return;
    }
    if (["a", "d"].includes(key.toLowerCase())) {
      changeHeading(
        sceneRef.current.turretAngle + ((key.toLowerCase() === "d" ? 1 : -1) * Math.PI) / 36,
      );
      return;
    }
    release();
    const delta = { x: 0, y: 0 };
    if (key === "ArrowLeft") delta.x = -0.25;
    if (key === "ArrowRight") delta.x = 0.25;
    if (key === "ArrowUp") delta.y = 0.25;
    if (key === "ArrowDown") delta.y = -0.25;
    updateScene({
      ...setTurretTarget(sceneRef.current, {
        x: sceneRef.current.targetOffset.x + delta.x,
        y: sceneRef.current.targetOffset.y + delta.y,
      }),
      followMouse: false,
    });
  };

  const undefinedDirection = "Không xác định (vùng tâm)";
  return (
    <div className="lab-body">
      <div className="lab-controls">
        <label>
          Vị trí mẫu
          <select
            value="custom"
            onChange={(event) => {
              if (event.target.value !== "custom") choosePreset(Number(event.target.value));
            }}
          >
            <option value="custom">Chọn trường hợp…</option>
            {[
              "Cùng hướng, gần",
              "Cùng hướng, xa",
              "Vuông trái",
              "Vuông phải",
              "Ngược hướng",
              "Trùng tâm",
              "Đúng biên vùng nhìn",
            ].map((label, index) => (
              <option key={label} value={index}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label>
          <input
            type="checkbox"
            checked={scene.followMouse}
            onChange={(event) => toggleFollow(event.target.checked)}
          />
          Theo chuột
        </label>
        <label>
          Góc nòng
          <input
            type="range"
            min="0"
            max={TAU}
            step={Math.PI / 180}
            value={scene.turretAngle}
            onChange={(event) => changeHeading(Number(event.target.value))}
          />
          <output>{((scene.turretAngle * 180) / Math.PI).toFixed(1)}°</output>
        </label>
        {layers.rotation && (
          <label>
            Tốc độ quay
            <input
              type="range"
              min="0"
              max={TAU}
              step="0.05"
              value={scene.turnSpeed}
              onChange={(event) => {
                release();
                updateScene({ ...sceneRef.current, turnSpeed: Number(event.target.value) });
              }}
            />
            <output>{scene.turnSpeed.toFixed(3)} rad/s</output>
          </label>
        )}
        {layers.cone && (
          <label>
            Nửa góc vùng nhìn
            <input
              type="range"
              min={(5 * Math.PI) / 180}
              max={Math.PI / 2}
              step={Math.PI / 180}
              value={scene.halfViewAngle}
              onChange={(event) => {
                release();
                updateScene({ ...sceneRef.current, halfViewAngle: Number(event.target.value) });
              }}
            />
            <output>{((scene.halfViewAngle * 180) / Math.PI).toFixed(1)}°</output>
          </label>
        )}
        {layers.rotation && (
          <button onClick={togglePause}>{paused ? "Tiếp tục" : "Tạm dừng"}</button>
        )}
        {layers.rotation && (paused || reducedMotion) && <button onClick={step}>Tiến 0,1 s</button>}
        <button onClick={reset}>Đặt lại</button>
      </div>
      <p>
        Di chuột trong bảng để đặt mục tiêu; bỏ Theo chuột để giữ vị trí và đọc số. Chạm/kéo hoặc
        phím mũi tên cũng đặt mục tiêu. Pause chỉ dừng nòng quay, vẫn cho sửa mục tiêu. A/D đổi góc
        nòng và tạm dừng; Tab chuyển focus bình thường.
      </p>
      {reducedMotion && layers.rotation && (
        <p>Đã bật giảm chuyển động: không tự quay; dùng Tiến 0,1 s.</p>
      )}
      <canvas
        ref={canvasRef}
        style={{ height: "clamp(360px, 54vw, 560px)", touchAction: "none" }}
        onPointerDown={startDrag}
        onPointerMove={moveTarget}
        onPointerUp={stopDrag}
        onPointerCancel={(event) => stopDrag(event, true)}
        onLostPointerCapture={(event) => {
          if (owner.current === event.pointerId) release();
        }}
        onKeyDown={onKeyDown}
        tabIndex={0}
        aria-label="Tháp pháo 2D: di chuột hoặc dùng phím mũi tên đặt mục tiêu; Space tạm dừng; S tiến một bước; A/D đổi hướng nòng"
      />
      <LabReadout
        items={[
          {
            label: "targetOffset",
            value:
              "(" +
              scene.targetOffset.x.toFixed(3) +
              ", " +
              scene.targetOffset.y.toFixed(3) +
              ") world",
          },
          {
            label: "forward",
            value: "(" + result.forward.x.toFixed(3) + ", " + result.forward.y.toFixed(3) + ")",
          },
          {
            label: "target direction",
            value: result.valid
              ? "(" +
                result.targetDirection.x.toFixed(3) +
                ", " +
                result.targetDirection.y.toFixed(3) +
                ")"
              : undefinedDirection,
          },
          ...(layers.dot
            ? [
                { label: "raw dot", value: result.rawDot.toFixed(4) + " world" },
                {
                  label: "normalized dot",
                  value: result.valid ? result.normalizedDot.toFixed(6) : undefinedDirection,
                },
              ]
            : []),
          ...(layers.angle
            ? [
                {
                  label: "unsigned angle",
                  value: result.valid
                    ? ((result.angleError * 180) / Math.PI).toFixed(3) + "°"
                    : undefinedDirection,
                },
              ]
            : []),
          ...(layers.projection
            ? [
                {
                  label: "projection",
                  value:
                    "(" +
                    result.parallel.x.toFixed(3) +
                    ", " +
                    result.parallel.y.toFixed(3) +
                    ") world",
                },
                { label: "scalar projection", value: result.scalar.toFixed(4) + " world" },
                {
                  label: "rejection",
                  value:
                    "(" +
                    result.residual.x.toFixed(3) +
                    ", " +
                    result.residual.y.toFixed(3) +
                    ") world",
                },
                {
                  label: "projection · rejection",
                  value: dot(result.parallel, result.residual).toExponential(2),
                },
              ]
            : []),
          ...(layers.rotation
            ? [
                {
                  label: "signed error",
                  value: result.valid
                    ? ((result.signedError * 180) / Math.PI).toFixed(3) + "°"
                    : undefinedDirection,
                },
                { label: "turnSpeed", value: scene.turnSpeed.toFixed(3) + " rad/s" },
              ]
            : []),
          ...(layers.cone
            ? [
                {
                  label: "trong vùng nhìn",
                  value: result.locked
                    ? "Có (chỉ xét góc)"
                    : result.valid
                      ? "Không"
                      : "Không — chưa có hướng",
                },
              ]
            : []),
          ...(mode === undefined || mode === "turret-full"
            ? [
                {
                  label: "reconstruction error",
                  value:
                    Math.hypot(
                      result.parallel.x + result.residual.x - scene.targetOffset.x,
                      result.parallel.y + result.residual.y - scene.targetOffset.y,
                    ).toExponential(2) + " world",
                },
              ]
            : []),
        ]}
      />
    </div>
  );
}
