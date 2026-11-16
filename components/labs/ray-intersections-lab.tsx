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
  add,
  boxInterval,
  sphereInterval,
  cameraRay,
  candidates,
  dot,
  length,
  nearestHit,
  presetCamera,
  scene,
  subtract,
  validateHits,
  aimAspect,
  initialOrbit,
  orbitCamera,
  rotateOrbit,
  panOrbit,
  zoomOrbit,
  objectCenter,
  translateObject,
  moveSource,
  type Vec3,
} from "@/lib/labs/ray-intersections";
import {
  LabReadout,
  canvasPoint,
  useCanvasSize,
  usePauseOnReducedMotion,
  useReducedMotion,
} from "./lab-shared";
import { aimRect, drawPicking } from "./ray-intersections/draw";
import { TranslationControls } from "./ray-intersections/translation-controls";
import { useClientReady } from "../use-client-ready";

const vec = (v: Vec3) => `(${v.x.toFixed(5)}; ${v.y.toFixed(5)}; ${v.z.toFixed(5)})`;
const names = ["Plane", "Sphere", "Box", "Triangle"];
const clamp = (n: number) => Math.max(0, Math.min(1, n));

function PickingExperiment({ stage }: { stage: number }) {
  const ready = useClientReady();
  const canvas = useRef<HTMLCanvasElement>(null),
    size = useCanvasSize(canvas),
    help = useId(),
    reduced = useReducedMotion();
  const [uv, setUv] = useState({ u: 0.37, v: 0.5 });
  const [preset, setPreset] = useState(0),
    [tMax, setRange] = useState(14),
    [paused, setPaused] = useState(true);
  const [experiment, setExperiment] = useState("pointer"),
    [selected, setSelected] = useState(1),
    [debug, setDebug] = useState(true);
  const [baseGeometry, setGeometry] = useState(() => structuredClone(scene));
  const [emitter, setEmitter] = useState(() => presetCamera());
  const [orbit, setOrbit] = useState(initialOrbit);
  const [validation, setValidation] = useState({ key: "", text: "Chưa kiểm" });
  const pointer = useRef<{
    id: number;
    kind: "aim" | "orbit" | "pan";
    x: number;
    y: number;
  } | null>(null);
  const phase = useRef(0);
  const release = useCallback(() => {
    const held = pointer.current;
    pointer.current = null;
    if (held && canvas.current?.hasPointerCapture(held.id))
      canvas.current.releasePointerCapture(held.id);
  }, []);
  const stop = useCallback(() => {
    setPaused(true);
    release();
  }, [release]);
  usePauseOnReducedMotion(stop);
  const observer = useMemo(() => orbitCamera(orbit), [orbit]);
  const geometry = useMemo(() => {
    if (experiment !== "degenerate") return baseGeometry;
    return { ...baseGeometry, triangle: { ...baseGeometry.triangle, c: baseGeometry.triangle.b } };
  }, [baseGeometry, experiment]);
  const ray = useMemo(() => {
    const value = cameraRay(emitter, uv.u, uv.v, aimAspect, tMax);
    if (experiment === "parallel")
      return { ...value, origin: { x: 0, y: 2, z: -3 }, direction: { x: 1, y: 0, z: 0 } };
    if (experiment === "tangent")
      return {
        ...value,
        origin: {
          x: geometry.sphere.center.x + geometry.sphere.radius,
          y: geometry.sphere.center.y,
          z: geometry.sphere.center.z - 3,
        },
        direction: { x: 0, y: 0, z: 1 },
      };
    return value;
  }, [emitter, uv, tMax, experiment, geometry.sphere]);
  const hits = useMemo(() => candidates(ray, geometry, stage), [ray, geometry, stage]);
  const best = stage >= 7 ? nearestHit(hits) : null;
  const validationKey = JSON.stringify([ray, geometry]);
  useEffect(() => {
    const ctx = canvas.current?.getContext("2d");
    const fixture = experiment === "parallel" || experiment === "tangent";
    const aimingCamera = fixture
      ? { ...emitter, origin: ray.origin, target: add(ray.origin, ray.direction) }
      : emitter;
    if (ctx)
      drawPicking(
        ctx,
        size,
        observer,
        aimingCamera,
        ray,
        hits,
        best,
        stage,
        fixture ? 0.5 : uv.u,
        fixture ? 0.5 : uv.v,
        geometry,
        selected,
        debug,
      );
  }, [size, observer, emitter, ray, hits, best, stage, uv, geometry, selected, debug, experiment]);
  useEffect(() => {
    const hidden = () => {
      if (document.hidden) stop();
    };
    window.addEventListener("blur", stop);
    document.addEventListener("visibilitychange", hidden);
    const element = canvas.current;
    const wheel = (event: WheelEvent) => {
      event.preventDefault();
      setOrbit((old) => zoomOrbit(old, -Math.sign(event.deltaY)));
    };
    element?.addEventListener("wheel", wheel, { passive: false });
    return () => {
      window.removeEventListener("blur", stop);
      document.removeEventListener("visibilitychange", hidden);
      element?.removeEventListener("wheel", wheel);
      release();
    };
  }, [stop, release]);
  useEffect(() => {
    if (paused || reduced || stage < 7 || experiment !== "pointer") return;
    let frame = 0,
      previous = performance.now();
    const animate = (now: number) => {
      if (now - previous >= 1000 / 30) {
        phase.current += Math.min(0.1, (now - previous) / 1000) * 0.8;
        previous = now;
        setUv((current) => ({ ...current, u: 0.5 + 0.35 * Math.sin(phase.current) }));
      }
      frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [paused, reduced, stage, experiment]);
  const changeObject = (delta: Vec3) => {
    stop();
    setGeometry((old) => translateObject(old, selected, delta));
  };
  const changeSource = (delta: Vec3) => {
    stop();
    setExperiment("pointer");
    setEmitter((old) => moveSource(old, delta));
  };
  const aimSelected = () => {
    stop();
    setExperiment("pointer");
    setEmitter((old) => ({ ...old, target: objectCenter(geometry, selected) }));
    setUv({ u: 0.5, v: 0.5 });
  };
  const reset = () => {
    stop();
    setUv({ u: 0.37, v: 0.5 });
    setPreset(0);
    setRange(14);
    setExperiment("pointer");
    setGeometry(structuredClone(scene));
    setEmitter(presetCamera());
    setOrbit(initialOrbit());
    setSelected(1);
    setDebug(true);
    setValidation({ key: "", text: "Chưa kiểm" });
    phase.current = 0;
  };
  const aim = (x: number, y: number) => {
    const rect = aimRect(size);
    setUv({ u: clamp((x - rect.x) / rect.width), v: clamp((y - rect.y) / rect.height) });
    setPaused(true);
    setExperiment("pointer");
  };
  const down = (event: PointerEvent<HTMLCanvasElement>) => {
    if (pointer.current) return;
    event.currentTarget.focus();
    const point = canvasPoint(event, event.currentTarget),
      rect = aimRect(size);
    const inAim =
      stage >= 2 &&
      point.x >= rect.x &&
      point.x <= rect.x + rect.width &&
      point.y >= rect.y &&
      point.y <= rect.y + rect.height;
    if (event.button === 0 && !inAim) {
      if (stage >= 7) {
        const pickRay = cameraRay(
          observer,
          point.x / size.width,
          point.y / size.height,
          size.width / size.height,
        );
        const hit = nearestHit(candidates(pickRay, geometry, stage));
        if (hit) setSelected(hit.objectId);
      }
      return;
    }
    if (event.button !== 0 && event.button !== 1 && event.button !== 2) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    const kind =
      inAim && event.button === 0 ? "aim" : event.shiftKey || event.button === 1 ? "pan" : "orbit";
    pointer.current = { id: event.pointerId, kind, x: point.x, y: point.y };
    if (kind === "aim") aim(point.x, point.y);
  };
  const move = (event: PointerEvent<HTMLCanvasElement>) => {
    const held = pointer.current;
    if (!held || held.id !== event.pointerId) return;
    const point = canvasPoint(event, event.currentTarget);
    if (held.kind === "aim") aim(point.x, point.y);
    else if (held.kind === "pan")
      setOrbit((old) => panOrbit(old, point.x - held.x, point.y - held.y));
    else setOrbit((old) => rotateOrbit(old, point.x - held.x, point.y - held.y));
    pointer.current = { ...held, x: point.x, y: point.y };
  };
  const end = (event: PointerEvent<HTMLCanvasElement>) => {
    if (pointer.current?.id === event.pointerId) release();
  };
  const key = (event: KeyboardEvent<HTMLCanvasElement>) => {
    const code = event.key.toLowerCase();
    if (event.key.startsWith("Arrow")) {
      event.preventDefault();
      let dx = 0,
        dy = 0;
      if (event.key === "ArrowLeft") dx = -8;
      if (event.key === "ArrowRight") dx = 8;
      if (event.key === "ArrowUp") dy = -8;
      if (event.key === "ArrowDown") dy = 8;
      if (event.ctrlKey)
        setOrbit((old) => (event.shiftKey ? panOrbit(old, dx, dy) : rotateOrbit(old, dx, dy)));
      else if (stage >= 2) {
        stop();
        setExperiment("pointer");
        setUv((old) => ({ u: clamp(old.u + dx * 0.0025), v: clamp(old.v + dy * 0.0025) }));
      }
    }
    if (/^[1-4]$/.test(code)) setSelected(Number(code) - 1);
    const objectKeys: Record<string, Vec3> = {
      a: { x: -0.1, y: 0, z: 0 },
      d: { x: 0.1, y: 0, z: 0 },
      q: { x: 0, y: -0.1, z: 0 },
      e: { x: 0, y: 0.1, z: 0 },
      s: { x: 0, y: 0, z: -0.1 },
      w: { x: 0, y: 0, z: 0.1 },
    };
    const sourceKeys: Record<string, Vec3> = {
      j: objectKeys.a,
      l: objectKeys.d,
      u: objectKeys.q,
      o: objectKeys.e,
      k: objectKeys.s,
      i: objectKeys.w,
    };
    if (objectKeys[code]) {
      event.preventDefault();
      changeObject(objectKeys[code]);
    }
    if (stage >= 2 && sourceKeys[code]) {
      event.preventDefault();
      changeSource(sourceKeys[code]);
    }
    if (code === "f" && stage >= 2) aimSelected();
    if (code === "pageup" || code === "pagedown") {
      event.preventDefault();
      setOrbit((old) => zoomOrbit(old, code === "pageup" ? 1 : -1));
    }
    if (code === "r") reset();
    if (code === "b" && !event.repeat) setDebug((old) => !old);
    if (code === " " && stage >= 7) {
      event.preventDefault();
      if (!event.repeat && !reduced && experiment === "pointer") setPaused((old) => !old);
    }
  };
  const readout = [
    { label: "Tâm đối tượng đang chọn", value: vec(objectCenter(geometry, selected)) },
    { label: "Camera quan sát", value: vec(observer.origin) },
    { label: "Camera origin", value: vec(emitter.origin) },
  ];
  if (stage >= 2)
    readout.push(
      { label: "Ray origin", value: vec(ray.origin) },
      {
        label: "Direction / độ dài",
        value: vec(ray.direction) + " / " + length(ray.direction).toFixed(6),
      },
    );
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
  for (const [label, interval] of [
    ["Sphere", stage >= 4 ? sphereInterval(ray, geometry.sphere) : null],
    ["Box", stage >= 5 ? boxInterval(ray, geometry.box) : null],
  ] as const)
    if (stage >= (label === "Sphere" ? 4 : 5))
      readout.push({
        label: label + " — entry / exit (chưa cắt range)",
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
      {
        label: "Lần kiểm gần nhất",
        value:
          validation.key === validationKey
            ? validation.text
            : validation.key
              ? "Dữ liệu đã đổi — cần kiểm lại"
              : "Chưa kiểm",
      },
      {
        label: "Residual p−(o+t·d)",
        value: Math.max(
          0,
          ...hits.filter((h) => h !== null).map((h) => length(subtract(h.point, at(ray, h.t)))),
        ).toExponential(3),
      },
      {
        label: "Plane — n·(p−p0)",
        value: hits[0]
          ? dot(subtract(hits[0].point, geometry.plane.point), geometry.plane.normal).toExponential(
              3,
            )
          : "MISS",
      },
    );
  return (
    <>
      <p id={help}>
        Cửa sổ nhỏ là góc nhìn ngắm bắn: kéo tâm ngắm hoặc dùng mũi tên để đổi tia. Ở góc nhìn lớn,
        kéo chuột phải để xoay, giữ Shift để pan, lăn chuột để zoom. Ctrl+mũi tên, Ctrl+Shift+mũi
        tên và PageUp/PageDown là các thao tác tương đương bằng phím. Đổi góc nhìn không đổi tia
        đang giữ.
      </p>
      {!ready && <p role="status">Đang chuẩn bị điều khiển…</p>}
      <fieldset
        className="lab-controls"
        disabled={!ready}
        aria-label="Điều khiển ray inspector"
        style={{ border: 0, padding: 0, margin: 0 }}
      >
        <label>
          Đối tượng đang chọn{" "}
          <select
            aria-label="Đối tượng đang chọn"
            value={selected}
            onChange={(event) => setSelected(Number(event.target.value))}
          >
            {names.map((name, i) => (
              <option key={name} value={i}>
                {i + 1}. {name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Preset camera{" "}
          <select
            aria-label="Preset camera"
            value={preset}
            disabled={stage < 7}
            onChange={(event) => {
              stop();
              const value = Number(event.target.value);
              setPreset(value);
              if (value === 1 || value === 2) setSelected(value);
              setEmitter(presetCamera(value, geometry));
              setUv({ u: 0.5, v: 0.5 });
              setExperiment("pointer");
              phase.current = 0;
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
        <button type="button" disabled={stage < 2} onClick={aimSelected}>
          Ngắm đối tượng đã chọn
        </button>
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
        <button type="button" aria-pressed={debug} onClick={() => setDebug((old) => !old)}>
          Lưới và trục
        </button>
        {stage >= 8 && (
          <button
            type="button"
            onClick={() => {
              stop();
              const report = validateHits(ray, geometry, hits);
              setValidation({
                key: validationKey,
                text: `${report.failures === 0 ? "PASS" : "FAIL"} — checks=${report.checks}; failures=${report.failures}; chỉ kiểm record được báo`,
              });
            }}
          >
            Kiểm hit hiện tại
          </button>
        )}
      </fieldset>
      <TranslationControls label="Dịch đối tượng" disabled={!ready} move={changeObject} />
      <TranslationControls
        label="Dịch nguồn tia"
        disabled={!ready || stage < 2}
        move={changeSource}
      />
      <canvas
        ref={canvas}
        className="lab-canvas"
        tabIndex={ready ? 0 : -1}
        data-ray52-ready={ready}
        aria-busy={!ready}
        aria-disabled={!ready}
        aria-label="Ray Intersection Lab"
        aria-describedby={help}
        onKeyDown={key}
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={end}
        onPointerCancel={end}
        onLostPointerCapture={end}
        onContextMenu={(event) => event.preventDefault()}
        style={{
          touchAction: "none",
          height: "clamp(360px, 50vw, 560px)",
          pointerEvents: ready ? "auto" : "none",
        }}
      />
      <LabReadout items={readout} />
      {reduced && (
        <p>
          Reduced motion đang bật: quét tự động bị tắt; các thao tác thủ công vẫn dùng được. Tắt
          reduced motion không tự chạy lại.
        </p>
      )}
      <p>
        Sphere/AABB có khoảng thể tích; plane/triangle chỉ có giao bề mặt. Tia bắt đầu trong solid
        có thể có entry âm, nhưng chỉ chọn mặt nằm trong [tMin,tMax]. Normal giữ hướng hình học;
        điểm ra màu vàng, điểm gần nhất màu xanh lá. Cảnh dùng renderer CPU, không chạy C++ hoặc GPU
        trong trình duyệt. Lưới plane hữu hạn chỉ để minh họa một mặt phẳng vô hạn.
      </p>
    </>
  );
}
export default function RayIntersectionsLab({ mode = "ray52-8" }: { mode?: string }) {
  const stage = Math.max(1, Math.min(8, Number(mode.split("-")[1]) || 8));
  return <PickingExperiment key={stage} stage={stage} />;
}
