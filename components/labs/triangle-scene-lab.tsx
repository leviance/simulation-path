"use client";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent,
  type KeyboardEvent,
} from "react";
import {
  initialRasterScene,
  rasterScenePreset,
  editRasterScene,
  dragRasterScene,
  rasterSceneTriangle,
  rasterSceneViewport,
  type RasterScene,
  type SceneEdit,
} from "@/lib/labs/triangle-scene";
import { drawRasterScene, scenePointer, sceneRaster } from "./triangle-scene-view";
import { LabReadout, useCanvasSize, useReducedMotion, usePauseOnReducedMotion } from "./lab-shared";

export default function TriangleSceneLab() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [scene, setScene] = useState<RasterScene>(initialRasterScene),
    sceneRef = useRef(scene);
  const drag = useRef<{
    id: number;
    index: number;
    depth: number;
    offset: { x: number; y: number };
  } | null>(null);
  const reducedMotion = useReducedMotion();
  const commit = useCallback((s: RasterScene) => {
    sceneRef.current = s;
    setScene(s);
  }, []);
  const cancelDrag = useCallback(() => {
    const active = drag.current;
    drag.current = null;
    if (active && canvasRef.current?.hasPointerCapture(active.id))
      canvasRef.current.releasePointerCapture(active.id);
  }, []);
  const pauseEnvironment = useCallback(() => {
    cancelDrag();
    commit({ ...sceneRef.current, paused: true });
  }, [cancelDrag, commit]);
  const size = useCanvasSize(canvasRef, pauseEnvironment);
  usePauseOnReducedMotion(pauseEnvironment);
  const reset = (preset = 0) => {
    cancelDrag();
    commit(rasterScenePreset(preset));
  };
  const edit = (key: SceneEdit, value: number) => {
    cancelDrag();
    commit(editRasterScene(sceneRef.current, key, value));
  };
  const select = (index: number) => {
    if (!Number.isInteger(index) || index < 0 || index > 2) return;
    cancelDrag();
    commit({ ...sceneRef.current, selected: index, paused: true });
  };
  const toggleDebug = () => {
    cancelDrag();
    commit({ ...sceneRef.current, debug: !sceneRef.current.debug, paused: true, limit: Infinity });
  };
  const step = () => {
    cancelDrag();
    const s = sceneRef.current;
    if (!s.paused) return;
    commit({ ...s, limit: Math.min(79200, Number.isFinite(s.limit) ? s.limit + 1 : 1) });
  };
  const play = () => {
    cancelDrag();
    const s = sceneRef.current;
    commit({
      ...s,
      paused: reducedMotion ? true : !s.paused,
      limit: Number.isFinite(s.limit) ? s.limit : 0,
    });
  };
  const moveDrag = (event: PointerEvent<HTMLCanvasElement>) => {
    const active = drag.current;
    if (!active || active.id !== event.pointerId) return;
    const point = scenePointer(event, size, sceneRef.current);
    if (point)
      commit(
        dragRasterScene(
          sceneRef.current,
          active.index,
          { x: point.x - active.offset.x, y: point.y - active.offset.y },
          active.depth,
        ),
      );
  };
  const pointerDown = (event: PointerEvent<HTMLCanvasElement>) => {
    if (!event.isPrimary || event.button !== 0 || drag.current) return;
    const s = sceneRef.current,
      p = scenePointer(event, size, s),
      t = rasterSceneTriangle(s),
      v = rasterSceneViewport(s);
    if (!p || !t || p.x < 0 || p.y < 0 || p.x >= v.width || p.y >= v.height) return;
    const points = [t.a, t.b, t.c],
      index = points.findIndex((q) => Math.hypot(p.x - q.x, p.y - q.y) <= 6);
    if (index < 0) return;
    event.preventDefault();
    event.currentTarget.focus({ preventScroll: true });
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
      drag.current = {
        id: event.pointerId,
        index,
        depth: s.world[index].z - s.camera.position.z,
        offset: { x: p.x - points[index].x, y: p.y - points[index].y },
      };
      commit({ ...s, selected: index, paused: true });
    } catch {
      drag.current = null;
    }
  };
  const pointerMove = (event: PointerEvent<HTMLCanvasElement>) => {
    if (drag.current?.id !== event.pointerId) return;
    if (event.pointerType === "mouse" && (event.buttons & 1) === 0) {
      cancelDrag();
      return;
    }
    moveDrag(event);
  };
  const pointerUp = (event: PointerEvent<HTMLCanvasElement>) => {
    if (drag.current?.id !== event.pointerId || event.button !== 0) return;
    moveDrag(event);
    cancelDrag();
  };
  const pointerCancel = (event: PointerEvent<HTMLCanvasElement>) => {
    if (drag.current?.id === event.pointerId) cancelDrag();
  };
  const keyDown = (event: KeyboardEvent<HTMLCanvasElement>) => {
    if (event.ctrlKey || event.altKey || event.metaKey || event.key === "Tab") return;
    const key = event.key.toLowerCase(),
      s = sceneRef.current,
      point = s.world[s.selected];
    const commands: Record<string, [SceneEdit, number]> = {
      arrowleft: ["vertexX", point.x - 0.1],
      arrowright: ["vertexX", point.x + 0.1],
      arrowup: ["vertexY", point.y + 0.1],
      arrowdown: ["vertexY", point.y - 0.1],
      pageup: ["vertexZ", point.z + 0.1],
      pagedown: ["vertexZ", point.z - 0.1],
      j: ["cameraX", s.camera.position.x - 0.1],
      l: ["cameraX", s.camera.position.x + 0.1],
      u: ["cameraZ", s.camera.position.z - 0.1],
      o: ["cameraZ", s.camera.position.z + 0.1],
    };
    if (commands[key]) {
      event.preventDefault();
      edit(...commands[key]);
      return;
    }
    if (!["r", "f", "n", " "].includes(key)) return;
    event.preventDefault();
    if (event.repeat) return;
    if (key === "r") reset();
    if (key === "f") toggleDebug();
    if (key === "n") step();
    if (key === " ") play();
  };
  const raster = useMemo(() => sceneRaster(scene), [scene]);
  useEffect(() => {
    const ctx = canvasRef.current?.getContext("2d");
    if (ctx) drawRasterScene(ctx, size, scene);
  }, [scene, size]);
  useEffect(() => {
    const blur = () => pauseEnvironment(),
      hidden = () => {
        if (document.hidden) pauseEnvironment();
      };
    window.addEventListener("blur", blur);
    document.addEventListener("visibilitychange", hidden);
    return () => {
      window.removeEventListener("blur", blur);
      document.removeEventListener("visibilitychange", hidden);
      cancelDrag();
    };
  }, [cancelDrag, pauseEnvironment]);
  useEffect(() => {
    if (
      scene.paused ||
      reducedMotion ||
      !Number.isFinite(scene.limit) ||
      !raster ||
      scene.limit >= raster.candidateCount
    )
      return;
    let frame = 0;
    const animate = () => {
      const s = sceneRef.current;
      if (s.paused) return;
      const count = sceneRaster(s)?.candidateCount ?? 0;
      const limit = Math.min(count, s.limit + 512);
      commit({ ...s, limit, paused: limit >= count });
      if (limit < count) frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [scene.paused, scene.limit, reducedMotion, raster, commit]);
  const vertex = scene.world[scene.selected];
  const sliders: {
    label: string;
    key: SceneEdit;
    min: number;
    max: number;
    step: number;
    value: number;
  }[] = [
    { label: "World X", key: "vertexX", min: -6, max: 6, step: 0.1, value: vertex.x },
    { label: "World Y", key: "vertexY", min: -4, max: 4, step: 0.1, value: vertex.y },
    { label: "World Z", key: "vertexZ", min: 2.5, max: 10, step: 0.1, value: vertex.z },
    {
      label: "Camera X",
      key: "cameraX",
      min: -1.5,
      max: 1.5,
      step: 0.1,
      value: scene.camera.position.x,
    },
    {
      label: "Camera Z",
      key: "cameraZ",
      min: -1,
      max: 1,
      step: 0.1,
      value: scene.camera.position.z,
    },
    { label: "FOV", key: "fov", min: 40, max: 100, step: 1, value: (scene.fov * 180) / Math.PI },
  ];
  return (
    <div className="lab-body">
      <div className="lab-controls">
        <label>
          Preset
          <select
            aria-label="Scene preset"
            value=""
            onChange={(e) => reset(Number(e.target.value))}
          >
            <option value="" disabled>
              Chọn thí nghiệm
            </option>
            {["Mặc định", "Đảo geometry và màu B/C", "Suy biến", "Vertex sau camera"].map(
              (s, i) => (
                <option key={i} value={i}>
                  {s}
                </option>
              ),
            )}
          </select>
        </label>
        <label>
          Vertex
          <select
            aria-label="Vertex 3D"
            value={scene.selected}
            onChange={(e) => select(Number(e.target.value))}
          >
            {["A", "B", "C"].map((s, i) => (
              <option key={i} value={i}>
                {s}
              </option>
            ))}
          </select>
        </label>
        {sliders.map((c) => (
          <label key={c.key}>
            {c.label}
            <input
              aria-label={c.label}
              type="range"
              min={c.min}
              max={c.max}
              step={c.step}
              value={c.value}
              onChange={(e) =>
                edit(c.key, Number(e.target.value) * (c.key === "fov" ? Math.PI / 180 : 1))
              }
            />
            <output>{c.value.toFixed(2)}</output>
          </label>
        ))}
        <button onClick={play} disabled={reducedMotion}>
          {scene.paused ? "Quét raster" : "Tạm dừng"}
        </button>
        <button onClick={step} disabled={!scene.paused}>
          Tiến một pixel
        </button>
        <button onClick={toggleDebug}>{scene.debug ? "Ẩn debug" : "Hiện debug"}</button>
        <button onClick={() => reset()}>Đặt lại</button>
      </div>
      <canvas
        ref={canvasRef}
        tabIndex={0}
        style={{
          height: scene.debug ? "clamp(320px,46vw,460px)" : "clamp(360px,60vw,560px)",
          touchAction: "none",
        }}
        aria-label="Bề mặt tam giác 3D tự raster: kéo vertex giữ depth, mũi tên đổi XY, PageUp/Down đổi Z"
        onPointerDown={pointerDown}
        onPointerMove={pointerMove}
        onPointerUp={pointerUp}
        onPointerCancel={pointerCancel}
        onLostPointerCapture={pointerCancel}
        onKeyDown={keyDown}
        onBlur={pauseEnvironment}
      />
      <p>
        Ba world vertex đi qua cùng camera/projection như lưới sàn. Kéo giữ camera depth và chỗ nắm.
        Mũi tên sửa XY, PageUp/Down sửa Z; J/L đổi camera X, U/O đổi camera Z; F bật/tắt debug, N
        tiến một pixel, R đặt lại. RGB là barycentric trong screen space, chưa phải
        perspective-correct. Dữ liệu ngoài near/far bị từ chối nguyên triangle; clipping đa giác nằm
        ở Project 18.{" "}
        {reducedMotion ? "Reduced motion: tắt tự quét, vẫn chỉnh tay và bước được." : ""}
      </p>
      {scene.debug && (
        <LabReadout
          items={[
            {
              label: "world vertex",
              value: "(" + [vertex.x, vertex.y, vertex.z].map((v) => v.toFixed(3)).join(", ") + ")",
            },
            {
              label: "raster status",
              value: raster ? (raster.degenerate ? "degenerate" : "depth valid") : "depth rejected",
            },
            {
              label: "tested / candidates",
              value: (raster?.testedCount ?? 0) + " / " + (raster?.candidateCount ?? 0),
            },
            { label: "covered", value: raster?.coveredCount ?? 0 },
          ]}
        />
      )}
    </div>
  );
}
