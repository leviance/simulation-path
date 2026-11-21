"use client";
import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type KeyboardEvent,
  type PointerEvent,
} from "react";
import { WaterSession } from "@/lib/labs/sph-water-gpu/session3d";
import {
  initialWaterCamera,
  limitWaterCamera,
  waterGroundPick,
  type WaterCamera,
} from "@/lib/labs/sph-water-gpu/lens";
import { type FluidPreset, type Vec3 } from "@/lib/labs/sph-water-gpu/state";
import { useClientReady } from "../../use-client-ready";
import {
  canvasPoint,
  LabReadout,
  useCanvasSize,
  usePauseOnReducedMotion,
  useReducedMotion,
} from "../lab-shared";
import type { WaterView } from "./render-scene";
import { useWaterRenderer } from "./use-water-renderer";
import styles from "./water.module.css";
import { SplinePlot } from "./spline-plot";

const subscribeNone = () => () => {};
const zero = () => 0;
const darkSnapshot = () =>
  document.documentElement.dataset.theme === "dark" ||
  document.documentElement.classList.contains("dark");
const themeSubscribe = (changed: () => void) => {
  const observer = new MutationObserver(changed);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["data-theme", "class"],
  });
  return () => observer.disconnect();
};

export default function WaterWorkshop({
  stage = 13,
  autoplay = false,
}: {
  stage?: number;
  autoplay?: boolean;
}) {
  const ready = useClientReady(),
    reduced = useReducedMotion(),
    help = useId();
  const { renderer, error: rendererError } = useWaterRenderer();
  const canvas = useRef<HTMLCanvasElement>(null),
    size = useCanvasSize(canvas);
  const [side, setSide] = useState(stage === 1 ? 4 : stage < 6 ? 8 : 12),
    [preset, setPreset] = useState<FluidPreset>("dam");
  const session = useMemo(
    () => (ready ? new WaterSession(side, preset) : null),
    [ready, side, preset],
  );
  const version = useSyncExternalStore(
    session?.subscribe ?? subscribeNone,
    session?.snapshot ?? zero,
    zero,
  );
  const [camera, setCamera] = useState<WaterCamera>({ ...initialWaterCamera }),
    [view, setView] = useState<WaterView>(stage >= 8 ? "water" : "particles");
  const [tool, setTool] = useState("orbit"),
    [dragging, setDragging] = useState(false),
    [details, setDetails] = useState(false);
  const dark = useSyncExternalStore(themeSubscribe, darkSnapshot, () => false);
  const pointer = useRef<{ id: number; x: number; y: number; tool: string } | null>(null);
  const wheelIdle = useRef<ReturnType<typeof setTimeout> | null>(null);
  const release = useCallback(() => {
    const active = pointer.current;
    pointer.current = null;
    setDragging(false);
    if (active && canvas.current?.hasPointerCapture(active.id))
      canvas.current.releasePointerCapture(active.id);
  }, []);
  const stop = useCallback(() => {
    session?.pause();
    release();
  }, [session, release]);
  usePauseOnReducedMotion(stop);
  const paused = session?.paused ?? true;
  useEffect(() => () => session?.dispose(), [session]);
  useEffect(() => {
    if (autoplay && !reduced && stage >= 5) session?.play();
  }, [session, autoplay, reduced, stage]);
  useEffect(() => {
    const hidden = () => {
      if (document.hidden) stop();
    };
    window.addEventListener("blur", stop);
    document.addEventListener("visibilitychange", hidden);
    return () => {
      window.removeEventListener("blur", stop);
      document.removeEventListener("visibilitychange", hidden);
      release();
    };
  }, [stop, release]);
  useEffect(() => {
    if (!session || paused || reduced) return;
    let frame = 0;
    const animate = () => {
      session.step(4, 12);
      frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [session, paused, reduced]);
  useEffect(() => {
    const target = canvas.current;
    if (!target) return;
    const wheel = (event: WheelEvent) => {
      if (document.activeElement !== target) return;
      event.preventDefault();
      setDragging(true);
      setCamera((old) =>
        limitWaterCamera({ ...old, distance: old.distance * Math.exp(event.deltaY * 0.001) }),
      );
      if (wheelIdle.current) clearTimeout(wheelIdle.current);
      wheelIdle.current = setTimeout(() => setDragging(false), 120);
    };
    target.addEventListener("wheel", wheel, { passive: false });
    return () => {
      target.removeEventListener("wheel", wheel);
      if (wheelIdle.current) clearTimeout(wheelIdle.current);
    };
  }, []);
  useEffect(() => {
    const ctx = canvas.current?.getContext("2d");
    if (ctx && session && renderer)
      renderer(ctx, size, session.state, camera, view, dark, dragging || !paused, stage);
  }, [session, version, size, camera, view, dark, dragging, paused, renderer, stage]);
  const point = (event: PointerEvent<HTMLCanvasElement>) => {
    const p = canvasPoint(event, event.currentTarget);
    const world = waterGroundPick(camera, size.width, size.height, p.x, p.y);
    if (world) session?.target(world);
  };
  const down = (event: PointerEvent<HTMLCanvasElement>) => {
    if (event.button !== 0 || pointer.current || !session) return;
    event.currentTarget.focus();
    const p = canvasPoint(event, event.currentTarget);
    pointer.current = { id: event.pointerId, x: p.x, y: p.y, tool };
    event.currentTarget.setPointerCapture(event.pointerId);
    setDragging(true);
    if (tool === "paddle") point(event);
  };
  const move = (event: PointerEvent<HTMLCanvasElement>) => {
    const active = pointer.current;
    if (active?.id !== event.pointerId) return;
    if (active.tool === "paddle") {
      point(event);
      return;
    }
    const p = canvasPoint(event, event.currentTarget),
      dx = p.x - active.x,
      dy = p.y - active.y;
    active.x = p.x;
    active.y = p.y;
    setCamera((old) =>
      limitWaterCamera({ ...old, yaw: old.yaw + dx * 0.007, pitch: old.pitch + dy * 0.007 }),
    );
  };
  const end = (event: PointerEvent<HTMLCanvasElement>) => {
    if (pointer.current?.id === event.pointerId) release();
  };
  const keyboard = (event: KeyboardEvent<HTMLCanvasElement>) => {
    const arrows = ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"];
    if (arrows.includes(event.key) || event.key === " ") event.preventDefault();
    if (!session) return;
    if (event.key === " " && !event.repeat && !reduced && stage >= 5) {
      if (paused) session.play();
      else session.pause();
    }
    if (event.key.toLowerCase() === "n" && !event.repeat && stage >= 5) {
      session.pause();
      session.step();
    }
    if (event.key.toLowerCase() === "r" && !event.repeat) {
      release();
      session.reset();
    }
    if (event.key === "Home") {
      setCamera({ ...initialWaterCamera });
      return;
    }
    if (arrows.includes(event.key)) {
      if (tool === "paddle" && !event.ctrlKey) {
        const next: Vec3 = [...session.state.paddle.target];
        if (event.key === "ArrowLeft") next[0] -= 0.03;
        if (event.key === "ArrowRight") next[0] += 0.03;
        if (event.key === "ArrowUp") next[2] -= 0.03;
        if (event.key === "ArrowDown") next[2] += 0.03;
        session.target(next);
      } else
        setCamera((old) =>
          limitWaterCamera({
            ...old,
            yaw:
              old.yaw + (event.key === "ArrowLeft" ? -0.08 : event.key === "ArrowRight" ? 0.08 : 0),
            pitch:
              old.pitch + (event.key === "ArrowUp" ? 0.06 : event.key === "ArrowDown" ? -0.06 : 0),
          }),
        );
    }
  };
  const state = session?.state;
  return (
    <section className="lab-workbench" data-water51-ready={session && renderer ? "true" : "false"}>
      {stage === 2 && <SplinePlot />}
      <header className="lab-subheading">
        <div>
          <span>SPH · THỂ TÍCH THẬT</span>
          <h3>Bể nước 3D</h3>
        </div>
        <span>{state?.count.toLocaleString("en-US") ?? "…"} hạt CPU</span>
      </header>
      <div className="lab-controls">
        <button
          type="button"
          disabled={!session || reduced || stage < 5}
          onClick={() => {
            if (paused) session?.play();
            else session?.pause();
          }}
        >
          {paused ? "Chạy mô phỏng" : "Tạm dừng"}
        </button>
        <button
          type="button"
          disabled={!session || stage < 5}
          onClick={() => {
            session?.pause();
            session?.step();
          }}
        >
          Một bước
        </button>
        <button
          type="button"
          disabled={!session}
          onClick={() => {
            release();
            session?.reset();
          }}
        >
          Đặt lại nước
        </button>
        <label>
          Cảnh
          <select
            aria-label="Cảnh nước 3D"
            value={preset}
            disabled={!ready}
            onChange={(e) => {
              stop();
              setTool("orbit");
              setPreset(e.target.value as FluidPreset);
            }}
          >
            <option value="dam">Vỡ đập</option>
            <option value="pool">Hồ nước</option>
            <option value="obstacle">Nước qua vật cản</option>
          </select>
        </label>
        <label>
          Số hạt CPU
          <select
            aria-label="Số hạt Canvas"
            value={side}
            disabled={!ready}
            onChange={(e) => {
              stop();
              setSide(Number(e.target.value));
            }}
          >
            {[4, 8, 12, 16, 20].map((n) => (
              <option key={n} value={n}>
                {(n ** 3).toLocaleString("en-US")}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="lab-controls">
        <button
          type="button"
          aria-pressed={tool === "orbit"}
          onClick={() => {
            release();
            setTool("orbit");
          }}
        >
          Xoay góc nhìn
        </button>
        <button
          type="button"
          aria-pressed={tool === "paddle"}
          disabled={stage < 10 || preset !== "obstacle"}
          onClick={() => {
            release();
            setTool("paddle");
          }}
        >
          Khuấy nước
        </button>
        <label>
          Hiển thị
          <select
            aria-label="Hiển thị nước"
            value={view}
            onChange={(e) => setView(e.target.value as WaterView)}
          >
            <option value="water" disabled={stage < 8}>
              Mặt nước
            </option>
            <option value="particles">Hạt</option>
            <option value="density">Density</option>
            <option value="speed">Tốc độ</option>
          </select>
        </label>
        <button
          type="button"
          onClick={() =>
            setCamera((old) => limitWaterCamera({ ...old, distance: old.distance * 0.9 }))
          }
        >
          Phóng to
        </button>
        <button
          type="button"
          onClick={() =>
            setCamera((old) => limitWaterCamera({ ...old, distance: old.distance / 0.9 }))
          }
        >
          Thu nhỏ
        </button>
        <button type="button" onClick={() => setCamera({ ...initialWaterCamera })}>
          Góc nhìn ban đầu
        </button>
      </div>
      <p id={ready ? help : undefined} className="lab-hint">
        Kéo theo công cụ đang chọn. Mũi tên điều khiển camera hoặc vị trí vật cản; Ctrl+mũi tên luôn
        xoay camera. Cuộn khi Canvas đang focus để zoom. Space chạy/dừng, N tiến một bước, R đặt lại
        nước; Home chỉ đặt lại góc nhìn. Công cụ khuấy chỉ dùng trong cảnh Nước qua vật cản, không
        chèn vật rắn đột ngột vào nước.
      </p>
      <canvas
        ref={canvas}
        className="lab-canvas"
        style={{ height: 560, touchAction: "none" }}
        tabIndex={0}
        aria-label="Bể nước SPH 3D"
        aria-describedby={ready ? help : undefined}
        onKeyDown={keyboard}
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={end}
        onPointerCancel={end}
        onLostPointerCapture={end}
      >
        Hạt có đủ tọa độ x/y/z, density/pressure/viscosity và va chạm thành. Mặt nước được dựng từ
        depth và thickness của chính các hạt ấy.
      </canvas>
      <div className={styles.status}>
        <span>Model time {state?.time.toFixed(3) ?? "0.000"} s</span>
        <span>Tick {state?.ticks ?? 0}</span>
        <span>Solver {session?.solveMs.toFixed(1) ?? "0.0"} ms/batch</span>
      </div>
      <div className={styles.parameters}>
        <label>
          Sound speed c = {session?.parameters.soundSpeed ?? 18} m/s
          <input
            aria-label="Sound speed 3D"
            type="range"
            min={10}
            max={40}
            step={1}
            disabled={!session || stage < 5}
            value={session?.parameters.soundSpeed ?? 18}
            onChange={(e) => session?.configure({ soundSpeed: Number(e.target.value) })}
          />
        </label>
        <label>
          Artificial viscosity α = {(session?.parameters.alpha ?? 0.25).toFixed(2)}
          <input
            aria-label="Artificial viscosity 3D"
            type="range"
            min={0}
            max={1}
            step={0.05}
            disabled={!session || stage < 5}
            value={session?.parameters.alpha ?? 0.25}
            onChange={(e) => session?.configure({ alpha: Number(e.target.value) })}
          />
        </label>
      </div>
      {rendererError && <p role="alert">{rendererError}</p>}
      {session?.error && <p role="alert">{session.error}. Đặt lại nước để tiếp tục.</p>}
      {reduced && (
        <p>
          Chế độ giảm chuyển động (reduced motion) đang bật. Mô phỏng không tự chạy; bạn vẫn có thể
          xoay camera hoặc tiến từng bước bằng nút Một bước.
        </p>
      )}
      <details open={details} onToggle={(e) => setDetails(e.currentTarget.open)}>
        <summary>Đọc dữ liệu và phân biệt Canvas với GPU thật</summary>
        <p>
          Canvas dùng CPU double và tối đa 8.000 hạt để giải thích. Bản C++ phải chạy ít nhất
          100.000 hạt trên GPU; không lấy tốc độ Canvas làm benchmark GPU. Smoothing/khúc xạ gần
          đúng chỉ dùng khi vẽ, không sửa pressure hoặc lực. Khung bể chỉ hiện trong các chế độ
          Hạt/Density/Tốc độ; sáu mặt va chạm vẫn giữ nguyên khi xem Mặt nước.
        </p>
        <LabReadout
          items={[
            { label: "Hạt thực sự cập nhật", value: String(state?.updated ?? 0) },
            { label: "Hạt nộp vẽ", value: String(state?.count ?? 0) },
            {
              label: "Hạt 0 — position",
              value: state
                ? [...state.position.subarray(0, 3)].map((v) => v.toFixed(5)).join("; ")
                : "…",
            },
            {
              label: "Vị trí vật cản",
              value: state?.paddle.position.map((v) => v.toFixed(5)).join("; ") ?? "…",
            },
            {
              label: "Đích vật cản",
              value: state?.paddle.target.map((v) => v.toFixed(5)).join("; ") ?? "…",
            },
            { label: "Hạt thoát bể", value: String(state?.leakage ?? 0) },
            {
              label: "Khối lượng nước",
              value: ((state?.mass ?? 0) * (state?.count ?? 0)).toFixed(3) + " kg",
            },
            { label: "Timestep", value: (state?.dt ?? 0).toExponential(3) + " s" },
            {
              label: "Compression lớn nhất",
              value: ((state?.compression ?? 0) * 100).toFixed(2) + " %",
            },
            {
              label: "Spacing / h",
              value: (state?.spacing ?? 0).toFixed(4) + " / " + (state?.h ?? 0).toFixed(4) + " m",
            },
            {
              label: "Camera yaw/pitch/distance",
              value: [camera.yaw, camera.pitch, camera.distance]
                .map((v) => v.toFixed(4))
                .join("; "),
            },
            { label: "Trạng thái", value: paused ? "Paused" : "Running" },
          ]}
        />
      </details>
    </section>
  );
}
