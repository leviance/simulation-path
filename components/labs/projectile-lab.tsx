"use client";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import {
  compareProjectileState,
  projectileAimFromScreenDrag,
  projectileWorldToScreen,
  solveProjectileGroundImpactTime,
} from "@/lib/labs/projectile";
import {
  advanceProjectileFlight,
  createProjectileFlight,
  projectileDefaults,
  projectileLaunch,
  projectileMeanError,
  projectileView,
  stepProjectileFlight,
  type ProjectileSettings,
} from "@/lib/labs/projectile-flight";
import {
  LabReadout,
  canvasPoint,
  useCanvasSize,
  usePauseOnReducedMotion,
  useReducedMotion,
} from "./lab-shared";
import { drawProjectileView } from "./projectile-view";
import type { InteractiveLabMode } from "./types";

const modes = [
  "projectile-aim",
  "projectile-components",
  "projectile-analytic",
  "projectile-euler",
  "projectile-timestep",
  "projectile-impact",
  "projectile-validation",
];
export default function ProjectileLab({ mode }: { mode?: InteractiveLabMode }) {
  const stage = mode ? Math.max(1, modes.indexOf(mode) + 1) : 7;
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drag = useRef<{ id: number; muzzle: { x: number; y: number } } | null>(null);
  const [capturing, setCapturing] = useState(false);
  const cancel = useCallback(() => {
    const id = drag.current?.id;
    drag.current = null;
    const canvas = canvasRef.current;
    if (id !== undefined && canvas?.hasPointerCapture(id)) canvas.releasePointerCapture(id);
    setCapturing(false);
  }, []);
  const size = useCanvasSize(canvasRef, cancel);
  const reducedMotion = useReducedMotion();
  const [settings, setSettings] = useState(projectileDefaults);
  const [flight, setFlight] = useState(() => createProjectileFlight(projectileDefaults(), false));
  const current = useRef(flight);
  const commit = useCallback((next: typeof flight) => {
    current.current = next;
    setFlight(next);
  }, []);
  const [history, setHistory] = useState<(typeof flight)[]>([]);
  const [paused, setPaused] = useState(true);
  const [debug, setDebug] = useState(true);
  const suspend = useCallback(() => {
    cancel();
    setPaused(true);
  }, [cancel]);
  usePauseOnReducedMotion(suspend);
  const preview = useMemo(() => projectileLaunch(settings), [settings]);
  const view = useMemo(
    () =>
      projectileView(size.width, size.height, [
        preview,
        ...history.map((s) => s.launch),
        ...(flight.exists ? [flight.launch] : []),
      ]),
    [size, preview, history, flight.exists, flight.launch],
  );

  useEffect(() => {
    const hidden = () => {
      if (document.hidden) suspend();
    };
    window.addEventListener("blur", suspend);
    document.addEventListener("visibilitychange", hidden);
    return () => {
      window.removeEventListener("blur", suspend);
      document.removeEventListener("visibilitychange", hidden);
    };
  }, [suspend]);
  useEffect(() => {
    if (paused || reducedMotion || !flight.projectile.active) return;
    let request = 0,
      previous = performance.now();
    const animate = (now: number) => {
      commit(advanceProjectileFlight(current.current, (now - previous) / 1000));
      previous = now;
      if (current.current.projectile.active) request = requestAnimationFrame(animate);
    };
    request = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(request);
  }, [paused, reducedMotion, flight.projectile.active, commit]);
  useEffect(() => {
    const context = canvasRef.current?.getContext("2d");
    if (context) drawProjectileView(context, size, view, preview, flight, history, stage, debug);
  }, [size, view, preview, flight, history, stage, debug]);

  const fire = () => {
    cancel();
    const finished = current.current;
    if (finished.exists) setHistory((previous) => [...previous, finished].slice(-4));
    commit(createProjectileFlight(settings));
    setPaused(reducedMotion);
  };
  const step = () => {
    cancel();
    const working = current.current.exists ? current.current : createProjectileFlight(settings);
    commit(stepProjectileFlight(working));
    setPaused(true);
  };
  const reset = () => {
    cancel();
    setSettings(projectileDefaults());
    commit(createProjectileFlight(projectileDefaults(), false));
    setHistory([]);
    setPaused(true);
    setDebug(true);
  };
  const preset = (id: number) => {
    cancel();
    const next = { ...projectileDefaults(), speed: 24 };
    if (id === 1) next.angleDegrees = 18;
    if (id === 2) next.angleDegrees = 75;
    if (id === 3) {
      next.gravity = 3;
      next.fixedDt = 1 / 15;
    }
    setSettings(next);
  };
  const aim = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (!drag.current || drag.current.id !== event.pointerId) return;
    const selection = projectileAimFromScreenDrag(
      drag.current.muzzle,
      canvasPoint(event, event.currentTarget),
      5,
      4,
      32,
      Math.PI / 36,
      (85 * Math.PI) / 180,
    );
    if (selection.valid)
      setSettings((previous) => ({
        ...previous,
        speed: selection.speed,
        angleDegrees: (selection.angleRadians * 180) / Math.PI,
      }));
  };
  const pointerDown = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (event.button !== 0 || drag.current) return;
    event.preventDefault();
    event.currentTarget.focus();
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      cancel();
      return;
    }
    drag.current = { id: event.pointerId, muzzle: projectileWorldToScreen(preview.position, view) };
    setCapturing(true);
    aim(event);
  };
  const pointerMove = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (drag.current?.id !== event.pointerId) return;
    if (!(event.buttons & 1)) {
      cancel();
      return;
    }
    aim(event);
  };
  const pointerUp = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (drag.current?.id !== event.pointerId || event.button !== 0) return;
    aim(event);
    cancel();
  };
  const keyDown = (event: ReactKeyboardEvent<HTMLCanvasElement>) => {
    if (event.ctrlKey || event.altKey || event.metaKey) return;
    const key = event.key.toLowerCase();
    const arrows = ["arrowleft", "arrowright", "arrowup", "arrowdown"].includes(key);
    const action =
      key === "r" ||
      key === "f" ||
      (stage >= 4 && ["enter", " ", "n", "1", "2", "3"].includes(key));
    const parameter =
      (stage >= 3 && ["g", "h"].includes(key)) || (stage >= 5 && ["[", "]"].includes(key));
    if (!arrows && !action && !parameter) return;
    event.preventDefault();
    if (event.repeat && action) return;
    cancel();
    if (key === "r") reset();
    else if (key === "f") setDebug((value) => !value);
    else if (key === "enter") fire();
    else if (key === "n") step();
    else if (key === " " && !reducedMotion && current.current.projectile.active)
      setPaused((value) => !value);
    else if (["1", "2", "3"].includes(key)) preset(Number(key));
    else
      setSettings((previous) => ({
        ...previous,
        speed: Math.min(
          32,
          Math.max(4, previous.speed + (key === "arrowright" ? 1 : key === "arrowleft" ? -1 : 0)),
        ),
        angleDegrees: Math.min(
          85,
          Math.max(
            5,
            previous.angleDegrees + (key === "arrowup" ? 1 : key === "arrowdown" ? -1 : 0),
          ),
        ),
        gravity: Math.min(
          25,
          Math.max(2.5, previous.gravity + (key === "h" ? 0.5 : key === "g" ? -0.5 : 0)),
        ),
        fixedDt: Math.min(
          1 / 15,
          Math.max(1 / 240, previous.fixedDt * (key === "[" ? 2 : key === "]" ? 0.5 : 1)),
        ),
      }));
  };
  const comparison = compareProjectileState(flight.launch, flight.projectile);
  const mean = projectileMeanError(flight);
  const change = (patch: Partial<ProjectileSettings>) => {
    cancel();
    setSettings((previous) => ({ ...previous, ...patch }));
  };
  return (
    <div className="lab-stack">
      <p>
        Thông số dưới đây dành cho <strong>phát tiếp theo</strong>. Đường vàng và chấm đỏ luôn đối
        chiếu với phát đang xem; đường xám là tối đa bốn phát trước.
      </p>
      <div className="lab-controls">
        <label>
          Góc bắn
          <input
            aria-label="Góc bắn"
            type="range"
            min="5"
            max="85"
            value={settings.angleDegrees}
            onChange={(e) => change({ angleDegrees: Number(e.target.value) })}
          />
          <output>{settings.angleDegrees.toFixed(1)}°</output>
        </label>
        <label>
          Tốc độ đầu
          <input
            aria-label="Tốc độ đầu"
            type="range"
            min="4"
            max="32"
            value={settings.speed}
            onChange={(e) => change({ speed: Number(e.target.value) })}
          />
          <output>{settings.speed.toFixed(1)} m/s</output>
        </label>
        {stage >= 3 && (
          <label>
            Trọng lực g
            <input
              aria-label="Trọng lực g"
              type="range"
              min="2.5"
              max="25"
              step="0.01"
              value={settings.gravity}
              onChange={(e) => change({ gravity: Number(e.target.value) })}
            />
            <output>{settings.gravity.toFixed(2)} m/s²</output>
          </label>
        )}
        {stage >= 5 && (
          <label>
            Fixed dt
            <select
              aria-label="Fixed dt"
              value={settings.fixedDt}
              onChange={(e) => change({ fixedDt: Number(e.target.value) })}
            >
              {[15, 30, 60, 120, 240].map((n) => (
                <option key={n} value={1 / n}>
                  1/{n} s
                </option>
              ))}
            </select>
          </label>
        )}
        {stage >= 4 && (
          <>
            <label>
              Preset
              <select
                aria-label="Preset"
                value="0"
                onChange={(e) => preset(Number(e.target.value))}
              >
                <option value="0">Chọn cấu hình</option>
                <option value="1">Bắn thấp</option>
                <option value="2">Bắn cao</option>
                <option value="3">Trọng lực yếu</option>
              </select>
            </label>
            <button type="button" onClick={fire}>
              Bắn lại
            </button>
            <button
              type="button"
              disabled={reducedMotion || !flight.projectile.active}
              onClick={() => setPaused((value) => !value)}
            >
              {paused ? "Tiếp tục" : "Tạm dừng"}
            </button>
            <button type="button" onClick={step}>
              Tiến một bước
            </button>
          </>
        )}
        {stage === 5 && (
          <button
            type="button"
            onClick={() => {
              const working = current.current.exists
                ? current.current
                : createProjectileFlight(settings);
              commit(advanceProjectileFlight(working, 0.12));
              setPaused(true);
            }}
          >
            Mô phỏng frame 120 ms
          </button>
        )}
        <label className="check">
          <input
            aria-label="Lưới và thành phần vận tốc"
            type="checkbox"
            checked={debug}
            onChange={(e) => setDebug(e.target.checked)}
          />
          Lưới / debug
        </label>
        <button type="button" onClick={reset}>
          Đặt lại
        </button>
      </div>
      <canvas
        ref={canvasRef}
        className="lab-canvas"
        style={{ height: 420, touchAction: "none" }}
        tabIndex={0}
        role="img"
        aria-label="Bãi bắn: quỹ đạo giải tích màu vàng và Explicit Euler màu xanh"
        onKeyDown={keyDown}
        onPointerDown={pointerDown}
        onPointerMove={pointerMove}
        onPointerUp={pointerUp}
        onPointerCancel={(e) => {
          if (drag.current?.id === e.pointerId) cancel();
        }}
        onLostPointerCapture={(e) => {
          if (drag.current?.id === e.pointerId) cancel();
        }}
        onBlur={cancel}
      />
      <p>
        Phím mũi tên: ngắm; Enter: bắn; Space: pause; N: một bước; G/H: giảm/tăng g; [ / ]: đổi dt;
        R: đặt lại. Tab rời Canvas.{" "}
        {reducedMotion && "Reduced motion đang bật: chỉ tiến bằng nút bước."}
      </p>
      <LabReadout
        items={[
          {
            label: "Góc / tốc độ kế tiếp",
            value: `${settings.angleDegrees.toFixed(1)}° / ${settings.speed.toFixed(1)} m/s`,
          },
          { label: "pointer capture", value: capturing ? "đang kéo" : "đã nhả" },
          ...(stage >= 4
            ? [
                {
                  label: "Phát đang xem: g / dt",
                  value: flight.exists
                    ? `${(-flight.launch.acceleration.y).toFixed(2)} m/s² / ${flight.fixedDt.toFixed(5)} s`
                    : "chưa bắn",
                },
                {
                  label: "Elapsed / substep",
                  value: `${flight.projectile.elapsed.toFixed(3)} s / ${flight.substeps}`,
                },
                {
                  label: "Accumulator / thời gian bị bỏ",
                  value: `${flight.accumulator.toFixed(5)} / ${flight.droppedTime.toFixed(5)} s`,
                },
                {
                  label: "Position error",
                  value: `${flight.exists ? comparison.error.toFixed(5) : "0.00000"} m`,
                },
                {
                  label: "Impact",
                  value: flight.impact?.impacted
                    ? `t=${flight.projectile.elapsed.toFixed(4)} s, y=0`
                    : "chưa chạm đất",
                },
              ]
            : []),
          ...(stage >= 7
            ? [
                {
                  label: "Max / mean position error",
                  value: `${flight.errors.maximum.toFixed(5)} / ${mean.toFixed(5)} m`,
                },
                { label: "Số sample", value: String(flight.errors.count) },
              ]
            : []),
        ]}
      />
      {stage >= 7 && (
        <p>
          Mean là trung bình số học của các sample vật lý, gồm t=0 và bước chạm đất; không phải
          trung bình mỗi frame hay tích phân theo thời gian. Khi nghiệm số chạm đất muộn, nghiệm
          giải tích dùng để đo sai số vẫn được đánh giá tại cùng thời điểm, kể cả khi nó đã xuống
          dưới y=0.
        </p>
      )}
      {flight.logLimitReached && (
        <p role="status">Đã chạm giới hạn 8.192 sample; mô phỏng dừng an toàn.</p>
      )}
      {history.length > 0 && (
        <div className="table-scroll">
          <table>
            <caption>Các lần bắn trước — kể cả lần dừng giữa chừng</caption>
            <thead>
              <tr>
                <th>g</th>
                <th>dt</th>
                <th>t</th>
                <th>Max error</th>
                <th>Mean error</th>
              </tr>
            </thead>
            <tbody>
              {history.map((shot, index) => (
                <tr key={index}>
                  <td>{(-shot.launch.acceleration.y).toFixed(2)}</td>
                  <td>{shot.fixedDt.toFixed(5)}</td>
                  <td>{shot.projectile.elapsed.toFixed(3)}</td>
                  <td>{shot.errors.maximum.toFixed(5)}</td>
                  <td>{projectileMeanError(shot).toFixed(5)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="sr-only">
        Sai số vị trí {flight.exists ? comparison.error.toFixed(5) : 0} mét. Max{" "}
        {flight.errors.maximum.toFixed(5)}, mean {mean.toFixed(5)} mét. Thời gian chạm đất giải tích{" "}
        {solveProjectileGroundImpactTime(flight.launch, 0)?.toFixed(4)} giây.
      </p>
    </div>
  );
}
