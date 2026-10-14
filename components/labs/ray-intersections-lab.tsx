"use client";
import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent,
} from "react";
import {
  at,
  boxInterval,
  cameraRay,
  candidates,
  dot,
  length,
  nearestHit,
  presetCamera,
  scene,
  subtract,
  validateHits,
  type Vec3,
} from "@/lib/labs/ray-intersections";
import {
  LabReadout,
  canvasPoint,
  useCanvasSize,
  usePauseOnReducedMotion,
  useReducedMotion,
} from "./lab-shared";
import { drawPicking } from "./ray-intersections/draw";

function PickingExperiment({ stage }: { stage: number }) {
  const canvas = useRef<HTMLCanvasElement>(null),
    size = useCanvasSize(canvas),
    help = useId(),
    reduced = useReducedMotion();
  const [uv, setUv] = useState({ u: 0.5, v: 0.5 }),
    [preset, setPreset] = useState(0),
    [tMax, setRange] = useState(30),
    [paused, setPaused] = useState(true);
  const [experiment, setExperiment] = useState("pointer");
  const [validation, setValidation] = useState("Chưa kiểm");
  const pointer = useRef<number | null>(null),
    phase = useRef(0);
  const release = useCallback(() => {
    const id = pointer.current;
    pointer.current = null;
    if (id !== null && canvas.current?.hasPointerCapture(id))
      canvas.current.releasePointerCapture(id);
  }, []);
  const stop = useCallback(() => {
    setPaused(true);
    release();
  }, [release]);
  usePauseOnReducedMotion(stop);
  const camera = useMemo(() => presetCamera(preset), [preset]);
  const geometry = useMemo(() => {
    if (experiment !== "degenerate") return scene;
    return {
      ...scene,
      triangle: { a: scene.triangle.a, b: scene.triangle.b, c: scene.triangle.b },
    };
  }, [experiment]);
  const ray = useMemo(() => {
    const value = cameraRay(camera, uv.u, uv.v, size.width / size.height, tMax);
    if (experiment === "parallel")
      return { ...value, origin: { x: 0, y: 2, z: -3 }, direction: { x: 1, y: 0, z: 0 } };
    if (experiment === "tangent")
      return {
        ...value,
        origin: { x: scene.sphere.center.x + scene.sphere.radius, y: 0, z: -3 },
        direction: { x: 0, y: 0, z: 1 },
      };
    return value;
  }, [camera, uv, size, tMax, experiment]);
  const hits = useMemo(() => candidates(ray, geometry, stage), [ray, geometry, stage]),
    best = stage >= 7 ? nearestHit(hits) : null;
  const interval = stage >= 5 ? boxInterval(ray, geometry.box) : null;
  useEffect(() => {
    const ctx = canvas.current?.getContext("2d");
    if (ctx) drawPicking(ctx, size, camera, ray, hits, best, stage, uv.u, uv.v, geometry);
  }, [size, camera, ray, hits, best, stage, uv, geometry]);
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
    if (paused || reduced || stage < 7 || experiment !== "pointer") return;
    let frame = 0,
      previous = performance.now();
    const animate = (now: number) => {
      phase.current += Math.min(0.1, (now - previous) / 1000) * 0.8;
      previous = now;
      setUv((current) => ({ ...current, u: 0.5 + 0.35 * Math.sin(phase.current) }));
      frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [paused, reduced, stage, experiment]);
  const aim = (event: PointerEvent<HTMLCanvasElement>) => {
    const point = canvasPoint(event, event.currentTarget);
    setUv({
      u: Math.max(0, Math.min(1, point.x / size.width)),
      v: Math.max(0, Math.min(1, point.y / size.height)),
    });
    setPaused(true);
    setExperiment("pointer");
  };
  const down = (event: PointerEvent<HTMLCanvasElement>) => {
    if (stage < 2 || event.button !== 0 || pointer.current !== null) return;
    event.currentTarget.focus();
    event.currentTarget.setPointerCapture(event.pointerId);
    pointer.current = event.pointerId;
    aim(event);
  };
  const move = (event: PointerEvent<HTMLCanvasElement>) => {
    if (pointer.current === event.pointerId) aim(event);
  };
  const end = (event: PointerEvent<HTMLCanvasElement>) => {
    if (pointer.current === event.pointerId) release();
  };
  const reset = () => {
    stop();
    setUv({ u: 0.5, v: 0.5 });
    setPreset(0);
    setRange(30);
    setExperiment("pointer");
    setValidation("Chưa kiểm");
    phase.current = 0;
  };
  const key = (event: KeyboardEvent<HTMLCanvasElement>) => {
    if (stage < 2) return;
    if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", " "].includes(event.key))
      event.preventDefault();
    if (event.key.startsWith("Arrow")) {
      stop();
      setExperiment("pointer");
      setUv((old) => ({
        u: Math.max(
          0,
          Math.min(
            1,
            old.u + (event.key === "ArrowRight" ? 0.02 : event.key === "ArrowLeft" ? -0.02 : 0),
          ),
        ),
        v: Math.max(
          0,
          Math.min(
            1,
            old.v + (event.key === "ArrowDown" ? 0.02 : event.key === "ArrowUp" ? -0.02 : 0),
          ),
        ),
      }));
    }
    if (event.key.toLowerCase() === "r") reset();
    if (event.key === " " && !event.repeat && stage >= 7 && !reduced && experiment === "pointer")
      setPaused((old) => !old);
  };
  const vec = (v: Vec3) => `(${v.x.toFixed(5)}; ${v.y.toFixed(5)}; ${v.z.toFixed(5)})`;
  const readout = [{ label: "Camera origin", value: vec(camera.origin) }];
  if (stage >= 2)
    readout.push(
      { label: "Ray origin", value: vec(ray.origin) },
      {
        label: "Direction / độ dài",
        value: vec(ray.direction) + " / " + length(ray.direction).toFixed(6),
      },
    );
  const names = ["Plane", "Sphere", "Box", "Triangle"];
  for (let i = 0; i < 4; i++)
    if (stage >= i + 3) {
      const hit = hits[i];
      readout.push({
        label: names[i] + " — t / point",
        value: hit ? hit.t.toFixed(6) + " / " + vec(hit.point) : "MISS",
      });
      if (hit)
        readout.push({
          label: names[i] + " — normal / frontFace",
          value: vec(hit.normal) + " / " + String(hit.frontFace),
        });
    }
  if (stage >= 5)
    readout.push({
      label: "Box — entry / exit (chưa cắt range)",
      value: interval
        ? interval.entry.toFixed(6) + " / " + interval.exit.toFixed(6)
        : "Không có khoảng chung",
    });
  if (stage >= 6) {
    const hit = hits[3];
    readout.push({
      label: "Triangle — w / u / v",
      value: hit
        ? [1 - hit.u - hit.v, hit.u, hit.v].map((x) => x.toFixed(6)).join(" / ")
        : "Không có barycentric",
    });
  }
  if (stage >= 7)
    readout.push({
      label: "Gần nhất",
      value: best ? names[best.objectId] + " — t=" + best.t.toFixed(6) : "MISS",
    });
  if (stage >= 8)
    readout.push(
      { label: "Lần kiểm gần nhất", value: validation },
      {
        label: "Residual lớn nhất của hit",
        value: Math.max(
          0,
          ...hits.filter((h) => h !== null).map((h) => length(subtract(h.point, at(ray, h.t)))),
        ).toExponential(3),
      },
      {
        label: "Plane — n·(p−p0)",
        value: hits[0]
          ? dot(subtract(hits[0].point, scene.plane.point), scene.plane.normal).toExponential(3)
          : "MISS",
      },
    );
  return (
    <>
      <p id={help}>
        Kéo vùng vẽ hoặc dùng các phím mũi tên để ngắm tia. R đặt lại; Space quét/dừng từ Bài 07.
        Hình khung dây không che khuất; ô XZ cho thấy tia từ trên xuống. Canvas tính trên CPU, không
        chạy C++ hay GPU.
      </p>
      <div className="lab-controls">
        <label>
          Preset camera{" "}
          <select
            aria-label="Preset camera"
            value={preset}
            disabled={stage < 7}
            onChange={(event) => {
              stop();
              setPreset(Number(event.target.value));
              setUv({ u: 0.5, v: 0.5 });
              setExperiment("pointer");
            }}
          >
            <option value="0">Cảnh bốn hình</option>
            <option value="1">Trong sphere</option>
            <option value="2">Trong box</option>
            <option value="3">Nhìn ra ngoài cảnh</option>
          </select>
        </label>
        <label>
          Thí nghiệm{" "}
          <select
            aria-label="Thí nghiệm tia"
            value={experiment}
            disabled={stage < 3}
            onChange={(event) => {
              stop();
              setExperiment(event.target.value);
              setPreset(0);
            }}
          >
            <option value="pointer">Tia từ chuột</option>
            <option value="parallel">Song song plane</option>
            {stage >= 4 && <option value="tangent">Tiếp tuyến sphere</option>}
            {stage >= 6 && <option value="degenerate">Triangle suy biến</option>}
          </select>
        </label>
        <label>
          tMax: {tMax.toFixed(1)}{" "}
          <input
            aria-label="tMax"
            type="range"
            min="0.1"
            max="30"
            step="0.1"
            value={tMax}
            disabled={stage < 2}
            onChange={(event) => {
              stop();
              setRange(Number(event.target.value));
            }}
          />
        </label>
        <button
          type="button"
          disabled={stage < 7 || reduced || experiment !== "pointer"}
          onClick={() => setPaused((old) => !old)}
        >
          {paused ? "Quét tia" : "Dừng"}
        </button>
        <button type="button" onClick={reset}>
          Đặt lại
        </button>
        {stage >= 8 && (
          <button
            type="button"
            onClick={() => {
              stop();
              const report = validateHits(ray, geometry, hits);
              setValidation(
                (report.failures === 0 ? "PASS" : "FAIL") +
                  " — checks=" +
                  report.checks +
                  "; failures=" +
                  report.failures +
                  "; chỉ kiểm record được báo",
              );
            }}
          >
            Kiểm hit hiện tại
          </button>
        )}
      </div>
      <canvas
        ref={canvas}
        className="lab-canvas"
        tabIndex={0}
        aria-label="Ray Intersection Lab"
        aria-describedby={help}
        onKeyDown={key}
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={end}
        onPointerCancel={end}
        onLostPointerCapture={end}
        style={{ touchAction: "none" }}
      />
      <LabReadout items={readout} />
      {reduced && (
        <p>
          Reduced motion đang bật: quét tự động bị tắt; chuột, bàn phím và các ca tĩnh vẫn dùng
          được.
        </p>
      )}
      <p>
        Plane là mặt phẳng vô hạn; lưới chỉ là vùng minh họa. Normal giữ hướng hình học, không tự
        lật theo tia. Khi tia trong box mà tMax chưa tới mặt thoát, phép chọn bề mặt trả MISS dù
        đoạn tia vẫn nằm trong thể tích.
      </p>
    </>
  );
}
export default function RayIntersectionsLab({ mode = "ray52-8" }: { mode?: string }) {
  const stage = Math.max(1, Math.min(8, Number(mode.split("-")[1]) || 8));
  return <PickingExperiment key={stage} stage={stage} />;
}
