"use client";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useId,
  type PointerEvent,
  type KeyboardEvent,
} from "react";
import {
  lambertStage,
  initialLambertScene,
  advanceLambert,
  dragLambert,
  presetLambert,
  editLambert,
  lambertFrame,
  faceNames,
  orbitLight,
  type LambertScene,
} from "@/lib/labs/lambert-scene";
import { drawLambert } from "./lambert-view";
import { LabReadout, useCanvasSize, useReducedMotion, usePauseOnReducedMotion } from "./lab-shared";
import type { InteractiveLabMode } from "./types";

export default function LambertLab({ mode }: { mode?: InteractiveLabMode }) {
  return <Workbench key={mode ?? "lambert-validation"} mode={mode} />;
}
function Workbench({ mode }: { mode?: InteractiveLabMode }) {
  const stage = lambertStage(mode),
    canvasRef = useRef<HTMLCanvasElement>(null),
    helpId = useId();
  const [scene, setScene] = useState(() => initialLambertScene(stage)),
    current = useRef(scene);
  const commit = useCallback((s: LambertScene) => {
    current.current = s;
    setScene(s);
  }, []);
  const drag = useRef<{ id: number; x: number; y: number } | null>(null);
  const cancel = useCallback(() => {
    const active = drag.current;
    drag.current = null;
    if (active && canvasRef.current?.hasPointerCapture(active.id))
      canvasRef.current.releasePointerCapture(active.id);
  }, []);
  const pause = useCallback(() => {
    cancel();
    commit({ ...current.current, paused: true });
  }, [cancel, commit]);
  const size = useCanvasSize(canvasRef, pause),
    reducedMotion = useReducedMotion();
  usePauseOnReducedMotion(pause);
  useEffect(() => {
    const visible = () => {
      if (document.hidden) pause();
    };
    window.addEventListener("blur", pause);
    document.addEventListener("visibilitychange", visible);
    return () => {
      window.removeEventListener("blur", pause);
      document.removeEventListener("visibilitychange", visible);
      cancel();
    };
  }, [pause, cancel]);
  useEffect(() => {
    if (scene.paused || reducedMotion || stage < 3) return;
    let id = 0,
      previous: number | undefined,
      lastPaint = 0;
    const tick = (time: number) => {
      if (time - lastPaint >= 32) {
        const dt = previous === undefined ? 0 : (time - previous) / 1000;
        previous = time;
        lastPaint = time;
        commit(advanceLambert(current.current, dt, stage));
      }
      id = requestAnimationFrame(tick);
    };
    id = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(id);
  }, [scene.paused, reducedMotion, stage, commit]);
  const width = Math.min(480, size.width),
    height = Math.round((width * size.height) / size.width);
  const frame = useMemo(
    () => lambertFrame(scene, stage, width, height),
    [scene, stage, width, height],
  );
  const selected = frame.faces[scene.selectedFace];
  const scratch = useRef<HTMLCanvasElement | null>(null);
  useEffect(() => {
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    scratch.current ??= document.createElement("canvas");
    drawLambert(ctx, size, scene, frame, stage, scratch.current);
  }, [frame, scene, size, stage]);
  const change = (next: LambertScene) => {
    cancel();
    commit(next);
  };
  const reset = () => change(initialLambertScene(stage));
  const step = () =>
    change({
      ...advanceLambert({ ...current.current, paused: false }, 1 / 60, stage),
      paused: true,
    });
  const range = (
    key: "lightAzimuth" | "lightElevation" | "ambient" | "diffuseStrength" | "distance",
    label: string,
    min: number,
    max: number,
  ) => (
    <label>
      {label}
      <input
        type="range"
        aria-label={label}
        min={min}
        max={max}
        step={0.01}
        value={scene[key]}
        onChange={(e) => change(editLambert(current.current, key, Number(e.target.value)))}
      />
      <output>{scene[key].toFixed(2)}</output>
    </label>
  );
  const down = (e: PointerEvent<HTMLCanvasElement>) => {
    if (
      !e.isPrimary ||
      e.button !== 0 ||
      drag.current ||
      !Number.isFinite(e.clientX) ||
      !Number.isFinite(e.clientY)
    )
      return;
    e.currentTarget.focus();
    commit({ ...current.current, paused: true });
    drag.current = { id: e.pointerId, x: e.clientX, y: e.clientY };
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      drag.current = null;
    }
  };
  const move = (e: PointerEvent<HTMLCanvasElement>) => {
    const p = drag.current;
    if (!p || p.id !== e.pointerId) return;
    if (e.pointerType === "mouse" && (e.buttons & 1) === 0) {
      cancel();
      return;
    }
    if (!Number.isFinite(e.clientX) || !Number.isFinite(e.clientY)) return;
    const rect = e.currentTarget.getBoundingClientRect();
    commit(
      dragLambert(
        current.current,
        ((e.clientX - p.x) * 960) / rect.width,
        ((e.clientY - p.y) * 640) / rect.height,
        stage,
      ),
    );
    p.x = e.clientX;
    p.y = e.clientY;
  };
  const up = (e: PointerEvent<HTMLCanvasElement>) => {
    if (e.button === 0 && drag.current?.id === e.pointerId) {
      // pointerup của chuột có buttons=0 nhưng vẫn phải nhận vị trí cuối.
      const last = drag.current;
      const rect = e.currentTarget.getBoundingClientRect();
      commit(
        dragLambert(
          current.current,
          ((e.clientX - last.x) * 960) / rect.width,
          ((e.clientY - last.y) * 640) / rect.height,
          stage,
        ),
      );
      cancel();
    }
  };
  const key = (e: KeyboardEvent<HTMLCanvasElement>) => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const k = e.key.toLowerCase();
    let s = current.current;
    if (k === "tab") return; // Tab luôn rời Canvas, không giữ focus của người dùng.
    const axis: Record<string, [number, number]> = {
      a: [-10, 0],
      d: [10, 0],
      w: [0, -10],
      s: [0, 10],
      arrowleft: [-10, 0],
      arrowright: [10, 0],
      arrowup: [0, -10],
      arrowdown: [0, 10],
    };
    if (axis[k]) {
      e.preventDefault();
      change(dragLambert(s, ...axis[k], stage));
      return;
    }
    if (e.repeat) return;
    if (k === "r") {
      reset();
      return;
    }
    if (k === "f") s = { ...s, debug: !s.debug };
    else if (k === "n" && stage >= 2) s = { ...s, normals: !s.normals, debug: true };
    else if (k === "t") s = { ...s, selectedFace: (s.selectedFace + 1) % 12, debug: true };
    else if (stage >= 3 && ["1", "2", "3", "4"].includes(k)) s = presetLambert(s, Number(k));
    else if (stage >= 3 && k === " ") {
      e.preventDefault();
      if (reducedMotion) return;
      s = { ...s, paused: !s.paused };
    } else if (stage >= 3 && k === ".") {
      step();
      return;
    } else if (stage >= 3 && (k === "q" || k === "e"))
      s = editLambert(s, "lightAzimuth", s.lightAzimuth + (k === "q" ? -0.08 : 0.08));
    else if (stage >= 3 && (k === "[" || k === "]"))
      s = editLambert(s, "lightElevation", s.lightElevation + (k === "[" ? -0.08 : 0.08));
    else if (stage >= 4 && k === "l") s = { ...s, lighting: !s.lighting };
    else if (stage >= 5 && k === "p") s = { ...s, palette: !s.palette };
    else if (stage >= 6 && k === "m")
      s = { ...s, target: s.target === "model" ? "camera" : "model" };
    else if (stage >= 6 && k === "c") s = { ...s, culling: !s.culling };
    else return;
    change(s);
  };
  const light = orbitLight(scene.lightAzimuth, scene.lightElevation);
  const presetValue =
    scene.lightElevation === 1.4 && scene.lightAzimuth === 0
      ? "2"
      : scene.lightElevation === 0
        ? ({ [0]: "1", [Math.PI / 2]: "3", [Math.PI]: "4" }[scene.lightAzimuth] ?? "")
        : "";
  return (
    <div className="lab-body">
      <div className="lab-controls">
        {stage >= 6 && (
          <label>
            Kéo chuột
            <select
              aria-label="Thao tác kéo"
              value={scene.target}
              onChange={(e) =>
                change({ ...current.current, target: e.target.value as "model" | "camera" })
              }
            >
              <option value="model">Xoay mô hình</option>
              <option value="camera">Đổi góc nhìn</option>
            </select>
          </label>
        )}
        {stage >= 3 && (
          <>
            <label>
              Preset đèn
              <select
                aria-label="Preset hướng đèn"
                value={presetValue}
                onChange={(e) => change(presetLambert(current.current, Number(e.target.value)))}
              >
                <option value="" disabled>
                  Tùy chỉnh
                </option>
                <option value="1">1 · Phía trước</option>
                <option value="2">2 · Phía trên</option>
                <option value="3">3 · Bên phải</option>
                <option value="4">4 · Phía sau</option>
              </select>
            </label>
            {range("lightAzimuth", "Góc đèn quanh Y", -Math.PI, Math.PI)}
            {range("lightElevation", "Độ cao hướng đèn", -1.4, 1.4)}
            <button
              type="button"
              disabled={reducedMotion}
              onClick={() => change({ ...current.current, paused: !current.current.paused })}
            >
              {scene.paused ? "Chạy đèn orbit" : "Tạm dừng"}
            </button>
            <button type="button" onClick={step}>
              Tiến một bước
            </button>
          </>
        )}
        {stage >= 4 && (
          <button
            type="button"
            aria-pressed={scene.lighting}
            onClick={() => change({ ...current.current, lighting: !scene.lighting })}
          >
            Lighting {scene.lighting ? "bật" : "tắt"}
          </button>
        )}
        {stage >= 5 && (
          <>
            {range("ambient", "Ambient", 0, 1)}
            {range("diffuseStrength", "Diffuse strength", 0, 1)}
            <button
              type="button"
              aria-pressed={scene.palette}
              onClick={() => change({ ...current.current, palette: !scene.palette })}
            >
              Material {scene.palette ? "sáu màu" : "một màu"}
            </button>
          </>
        )}
        {stage >= 6 && (
          <>
            {range("distance", "Khoảng cách camera", 3, 9)}
            <button
              type="button"
              aria-pressed={scene.culling}
              onClick={() => change({ ...current.current, culling: !scene.culling })}
            >
              Culling {scene.culling ? "bật" : "tắt"}
            </button>
          </>
        )}
        <button
          type="button"
          aria-pressed={scene.debug}
          onClick={() => change({ ...current.current, debug: !scene.debug })}
        >
          {scene.debug ? "Chế độ trình diễn" : "Hiện debug"}
        </button>
        {stage >= 2 && (
          <button
            type="button"
            aria-pressed={scene.normals}
            onClick={() => change({ ...current.current, normals: !scene.normals, debug: true })}
          >
            Normal {scene.normals ? "bật" : "tắt"}
          </button>
        )}
        <button type="button" onClick={reset}>
          Đặt lại
        </button>
      </div>
      {scene.debug && (
        <label>
          Tam giác đang xem
          <select
            aria-label="Face đang theo dõi"
            value={scene.selectedFace}
            onChange={(e) => change({ ...current.current, selectedFace: Number(e.target.value) })}
          >
            {frame.faces.map((f) => (
              <option key={f.index} value={f.index}>
                {f.index} · {faceNames[f.side]}
              </option>
            ))}
          </select>
        </label>
      )}
      <canvas
        ref={canvasRef}
        className="lab-canvas"
        style={{ height: "clamp(360px,50vw,560px)" }}
        role="img"
        tabIndex={0}
        aria-label="Cube chiếu sáng Lambert bằng CPU với đèn orbit"
        aria-describedby={helpId}
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
        onPointerCancel={(e) => {
          if (drag.current?.id === e.pointerId) cancel();
        }}
        onLostPointerCapture={(e) => {
          if (drag.current?.id === e.pointerId) drag.current = null;
        }}
        onKeyDown={key}
      />
      <p id={helpId}>
        Kéo hoặc dùng WASD/phím mũi tên để xoay.{" "}
        {stage >= 3 && "Q/E đổi hướng đèn, Space chạy/dừng, dấu chấm tiến một bước. "}
        {stage >= 6 && "M đổi giữa xoay mô hình và đổi góc nhìn. "}R đặt lại; Tab chuyển sang điều
        khiển tiếp theo.{" "}
        {reducedMotion &&
          "Reduced motion: chuyển động tự động đã tắt, bạn vẫn có thể tiến từng bước."}
      </p>
      {scene.debug && (
        <LabReadout
          items={[
            ...(stage >= 2
              ? [
                  {
                    label: "Normal world",
                    value: `(${selected.normal.x.toFixed(3)}, ${selected.normal.y.toFixed(3)}, ${selected.normal.z.toFixed(3)})`,
                  },
                ]
              : []),
            ...(stage >= 3
              ? [
                  {
                    label: "surfaceToLight world",
                    value: `(${light.x.toFixed(3)}, ${light.y.toFixed(3)}, ${light.z.toFixed(3)})`,
                  },
                ]
              : []),
            ...(stage >= 4
              ? [
                  {
                    label: "dot → diffuse",
                    value: `${selected.sample.dotValue.toFixed(3)} → ${selected.sample.diffuse.toFixed(3)}`,
                  },
                  { label: "Intensity", value: selected.sample.intensity.toFixed(3) },
                ]
              : []),
            {
              label: "Model yaw / camera yaw",
              value: `${scene.yaw.toFixed(3)} / ${scene.cameraYaw.toFixed(3)}`,
            },
            { label: "Submitted / culled", value: `${12 - frame.culled} / ${frame.culled}` },
          ]}
        />
      )}
      <p className="sr-only">
        Cube gồm 8 vertex và 12 triangle. Mặt {faceNames[selected.side]} có diffuse{" "}
        {selected.sample.diffuse.toFixed(3)}. Normal trắng; hướng về đèn màu vàng. Đèn chỉ đổi màu,
        không đổi geometry.
      </p>
    </div>
  );
}
