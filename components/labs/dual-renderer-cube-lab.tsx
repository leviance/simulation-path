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
  initialViewerScene,
  panViewer,
  renderViewer,
  traceViewerVertex,
  turnViewer,
  viewerModels,
  zoomViewer,
  type ViewerScene,
  type RendererKind,
} from "@/lib/labs/dual-renderer-cube";
import { LabReadout, useCanvasSize, usePauseOnReducedMotion, useReducedMotion } from "./lab-shared";
import { drawViewer } from "./dual-renderer-viewer/draw";
import type { InteractiveLabMode } from "./types";

export default function DualRendererCubeLab({ mode }: { mode?: InteractiveLabMode }) {
  return <Viewer key={mode ?? "cube-validation"} mode={mode} />;
}

function Viewer({ mode }: { mode?: InteractiveLabMode }) {
  const models = useMemo(viewerModels, []);
  const canvasRef = useRef<HTMLCanvasElement>(null),
    help = useId();
  const [scene, setScene] = useState(initialViewerScene);
  const current = useRef(scene);
  const [backend, setBackend] = useState<RendererKind>(mode === "gpu-indexed-draw" ? "gpu" : "cpu");
  const [depthView, setDepthView] = useState(false),
    [selectedVertex, setSelectedVertex] = useState(0);
  const [capturing, setCapturing] = useState(false);
  const drag = useRef<{
    id: number;
    x: number;
    y: number;
    pan: boolean;
    before: ViewerScene;
  } | null>(null);
  const commit = useCallback((next: ViewerScene) => {
    current.current = next;
    setScene(next);
  }, []);
  const release = useCallback(() => {
    const active = drag.current;
    drag.current = null;
    setCapturing(false);
    if (active && canvasRef.current?.hasPointerCapture(active.id))
      canvasRef.current.releasePointerCapture(active.id);
  }, []);
  const pause = useCallback(() => {
    release();
    commit({ ...current.current, view: { ...current.current.view, paused: true } });
  }, [commit, release]);
  const size = useCanvasSize(canvasRef, pause),
    reduced = useReducedMotion();
  usePauseOnReducedMotion(pause);
  useEffect(() => {
    const hidden = () => {
      if (document.hidden) pause();
    };
    window.addEventListener("blur", pause);
    document.addEventListener("visibilitychange", hidden);
    return () => {
      window.removeEventListener("blur", pause);
      document.removeEventListener("visibilitychange", hidden);
      release();
    };
  }, [pause, release]);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const wheel = (event: WheelEvent) => {
      if (document.activeElement !== canvas) return;
      event.preventDefault();
      commit(zoomViewer(current.current, -event.deltaY / 100));
    };
    canvas.addEventListener("wheel", wheel, { passive: false });
    return () => canvas.removeEventListener("wheel", wheel);
  }, [commit]);
  useEffect(() => {
    if (scene.view.paused || reduced) return;
    let request = 0,
      previous: number | undefined;
    const tick = (now: number) => {
      if (previous === undefined) previous = now;
      if (now - previous >= 50) {
        const dt = Math.min(0.05, (now - previous) / 1000);
        previous = now;
        commit({
          ...current.current,
          view: { ...current.current.view, angleY: current.current.view.angleY + dt * 0.45 },
        });
      }
      request = requestAnimationFrame(tick);
    };
    request = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(request);
  }, [scene.view.paused, reduced, commit]);
  const mesh = models[scene.meshIndex];
  const scale = Math.min(1, 480 / Math.max(1, size.width, size.height));
  const width = Math.max(1, Math.round(size.width * scale)),
    height = Math.max(1, Math.round(size.height * scale));
  const frame = useMemo(
    () => renderViewer(mesh, scene, width, height),
    [mesh, scene, width, height],
  );
  const vertex = Math.min(selectedVertex, mesh.vertices.length - 1);
  const trace = useMemo(
    () => traceViewerVertex(mesh.vertices[vertex].position, scene, width, height),
    [mesh, vertex, scene, width, height],
  );
  useEffect(() => {
    const ctx = canvasRef.current?.getContext("2d");
    if (ctx) drawViewer(ctx, size, frame, depthView);
  }, [size, frame, depthView]);
  const toggle = (key: "depthEnabled" | "lit") =>
    commit({ ...current.current, [key]: !current.current[key] });
  const toggleView = (
    key: "cullBackfaces" | "wireframe" | "normals" | "grid" | "reverseOrder" | "cameraDrag",
  ) =>
    commit({
      ...current.current,
      view: { ...current.current.view, [key]: !current.current.view[key] },
    });
  const step = () =>
    commit({
      ...current.current,
      view: {
        ...current.current.view,
        paused: true,
        angleY: current.current.view.angleY + Math.PI / 18,
      },
    });
  const reset = () => {
    release();
    commit({ ...initialViewerScene(), meshIndex: current.current.meshIndex });
  };
  const resetCamera = () =>
    commit({
      ...current.current,
      targetX: 0,
      targetY: 0,
      targetZ: 0,
      view: { ...current.current.view, cameraYaw: 0, cameraPitch: 0, distance: 4.2 },
    });
  const onKeyDown = (event: KeyboardEvent<HTMLCanvasElement>) => {
    if (event.altKey || event.ctrlKey || event.metaKey) return;
    const key = event.key.toLowerCase();
    if (
      ![
        "f1",
        "f2",
        "escape",
        " ",
        "n",
        "r",
        "home",
        "v",
        "d",
        "c",
        "l",
        "w",
        "h",
        "g",
        "o",
        "1",
        "2",
        "3",
        "arrowleft",
        "arrowright",
        "arrowup",
        "arrowdown",
        "+",
        "=",
        "-",
        "a",
        "s",
      ].includes(key)
    )
      return;
    event.preventDefault();
    if (event.repeat && !key.startsWith("arrow")) return;
    if (key === "f1") {
      setBackend("cpu");
      return;
    }
    if (key === "f2") {
      setBackend("gpu");
      return;
    }
    if (key === "escape") {
      const before = drag.current?.before;
      release();
      if (before) commit(before);
      else pause();
      return;
    }
    if (drag.current) return;
    if (key === "r") reset();
    else if (key === "home") resetCamera();
    else if (key === "n") step();
    else if (key === " ")
      commit({
        ...current.current,
        view: { ...current.current.view, paused: reduced ? true : !current.current.view.paused },
      });
    else if (key === "v") toggleView("cameraDrag");
    else if (key === "d") toggle("depthEnabled");
    else if (key === "c") toggleView("cullBackfaces");
    else if (key === "l") toggle("lit");
    else if (key === "w") toggleView("wireframe");
    else if (key === "h") toggleView("normals");
    else if (key === "g") toggleView("grid");
    else if (key === "o") toggleView("reverseOrder");
    else if (["1", "2", "3"].includes(key))
      commit({ ...current.current, meshIndex: Number(key) - 1 });
    else if (key === "+" || key === "=" || key === "-")
      commit(zoomViewer(current.current, key === "-" ? -1 : 1));
    else if (key.startsWith("arrow"))
      commit(
        turnViewer(
          current.current,
          key === "arrowleft" ? -0.06 : key === "arrowright" ? 0.06 : 0,
          key === "arrowup" ? -0.06 : key === "arrowdown" ? 0.06 : 0,
        ),
      );
  };
  const onPointerDown = (event: PointerEvent<HTMLCanvasElement>) => {
    if (drag.current || !event.isPrimary || ![0, 2].includes(event.button)) return;
    event.preventDefault();
    event.currentTarget.focus();
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = {
      id: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      pan: event.button === 2,
      before: current.current,
    };
    setCapturing(true);
    commit({ ...current.current, view: { ...current.current.view, paused: true } });
  };
  const onPointerMove = (event: PointerEvent<HTMLCanvasElement>) => {
    const active = drag.current;
    if (!active || active.id !== event.pointerId) return;
    const dx = event.clientX - active.x,
      dy = event.clientY - active.y;
    commit(
      active.pan
        ? panViewer(current.current, dx, dy, size.height)
        : turnViewer(current.current, dx * 0.006, dy * 0.006),
    );
    active.x = event.clientX;
    active.y = event.clientY;
  };
  const onPointerEnd = (event: PointerEvent<HTMLCanvasElement>) => {
    if (drag.current?.id === event.pointerId) release();
  };
  return (
    <>
      <canvas
        ref={canvasRef}
        className="lab-canvas"
        tabIndex={0}
        aria-label="Model viewer OBJ: xoay mô hình hoặc camera, pan và zoom, chọn nhánh CPU F1 / GPU F2"
        aria-describedby={help}
        onKeyDown={onKeyDown}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerEnd}
        onPointerCancel={onPointerEnd}
        onLostPointerCapture={onPointerEnd}
        onBlur={pause}
        onContextMenu={(event) => event.preventDefault()}
        style={{ touchAction: "none" }}
      />
      <div className="lab-controls">
        <label>
          Model
          <select
            value={scene.meshIndex}
            onChange={(event) =>
              commit({ ...current.current, meshIndex: Number(event.target.value) })
            }
          >
            <option value={0}>1 · Rocket · 32 tam giác</option>
            <option value={1}>2 · Sphere · 2.976 tam giác</option>
            <option value={2}>3 · Cube · fixture</option>
          </select>
        </label>
        <label>
          Backend minh họa
          <select
            value={backend}
            onChange={(event) => setBackend(event.target.value as RendererKind)}
          >
            <option value="cpu">F1 · CPU</option>
            <option value="gpu">F2 · OpenGL (minh họa)</option>
          </select>
        </label>
        <label>
          Kéo chuột trái
          <select
            value={scene.view.cameraDrag ? "camera" : "model"}
            onChange={(event) =>
              commit({
                ...current.current,
                view: { ...current.current.view, cameraDrag: event.target.value === "camera" },
              })
            }
          >
            <option value="model">Xoay mô hình</option>
            <option value="camera">Đổi góc nhìn</option>
          </select>
        </label>
        <label className="check">
          <input
            type="checkbox"
            checked={depthView}
            onChange={(event) => setDepthView(event.target.checked)}
          />
          Xem depth (tương phản ×8)
        </label>
        <label className="check">
          <input
            type="checkbox"
            checked={scene.depthEnabled}
            onChange={() => toggle("depthEnabled")}
          />
          Depth test
        </label>
        {(["cullBackfaces", "reverseOrder", "wireframe", "normals", "grid"] as const).map(
          (key, index) => (
            <label className="check" key={key}>
              <input type="checkbox" checked={scene.view[key]} onChange={() => toggleView(key)} />
              {
                ["Face culling", "Đảo thứ tự tam giác", "Wireframe", "Normals", "Lưới tọa độ"][
                  index
                ]
              }
            </label>
          ),
        )}
        <label className="check">
          <input type="checkbox" checked={scene.lit} onChange={() => toggle("lit")} />
          Chiếu sáng Lambert
        </label>
        <button
          type="button"
          disabled={reduced}
          onClick={() =>
            commit({
              ...current.current,
              view: { ...current.current.view, paused: !current.current.view.paused },
            })
          }
        >
          {scene.view.paused ? "Tiếp tục" : "Tạm dừng"}
        </button>
        <button type="button" onClick={step}>
          Tiến 10°
        </button>
        <button type="button" onClick={() => commit(zoomViewer(current.current, 1))}>
          Phóng to
        </button>
        <button type="button" onClick={() => commit(zoomViewer(current.current, -1))}>
          Thu nhỏ
        </button>
        <button
          type="button"
          onClick={() => commit(panViewer(current.current, 24, 0, size.height))}
        >
          Pan trái
        </button>
        <button
          type="button"
          onClick={() => commit(panViewer(current.current, -24, 0, size.height))}
        >
          Pan phải
        </button>
        <button
          type="button"
          onClick={() => commit(panViewer(current.current, 0, 24, size.height))}
        >
          Pan lên
        </button>
        <button
          type="button"
          onClick={() => commit(panViewer(current.current, 0, -24, size.height))}
        >
          Pan xuống
        </button>
        <button type="button" onClick={resetCamera}>
          Đặt lại camera
        </button>
        <button type="button" onClick={reset}>
          Đặt lại
        </button>
        <label>
          Vertex cần xem
          <input
            type="range"
            min={0}
            max={mesh.vertices.length - 1}
            value={vertex}
            onChange={(event) => setSelectedVertex(Number(event.target.value))}
          />
        </label>
      </div>
      <LabReadout
        items={[
          {
            label: "Backend đang chọn",
            value:
              backend === "cpu" ? "F1 · CPU rasterizer" : "F2 · nhánh OpenGL (Canvas minh họa)",
          },
          {
            label: "Indexed mesh",
            value: `${mesh.name} · ${mesh.vertices.length} vertices · ${mesh.indices.length / 3} tam giác`,
          },
          {
            label: "Tư thế chung",
            value: `Model ${scene.view.angleX.toFixed(2)} / ${scene.view.angleY.toFixed(2)} · camera ${scene.view.cameraYaw.toFixed(2)} / ${scene.view.cameraPitch.toFixed(2)} · khoảng cách ${scene.view.distance.toFixed(2)}`,
          },
          {
            label: `Vertex ${vertex}: clip x y z w`,
            value: [trace.clip.x, trace.clip.y, trace.clip.z, trace.clip.w]
              .map((n) => n.toFixed(3))
              .join(" · "),
          },
          {
            label: "NDC → screen / depth",
            value:
              trace.ndc && trace.screen
                ? `${trace.ndc.x.toFixed(3)} ${trace.ndc.y.toFixed(3)} ${trace.ndc.z.toFixed(3)} → ${trace.screen.x.toFixed(1)}, ${trace.screen.y.toFixed(1)} / ${trace.screen.depth.toFixed(5)}`
                : "w gần 0: chưa thực hiện perspective divide",
          },
          {
            label: "CPU minh họa",
            value: `${frame.submitted} submit · ${frame.clipped} clip · ${frame.culled} cull · ${frame.passed} pass · ${frame.rejected} reject`,
          },
          {
            label: "Trạng thái tương tác",
            value: `Pointer ${capturing ? "đang capture" : "đã nhả"} · reduced motion ${reduced ? "bật (dùng tiến từng bước)" : "tắt"}`,
          },
        ]}
      />
      <p className="lab-hint" id={help}>
        Canvas 2D chỉ minh họa state và công thức; không chạy OpenGL, không đo tốc độ GPU và không
        chứng minh hai backend đã cho ảnh giống nhau. Hãy chạy bản C++ với <code>--verify</code> để
        đối chiếu trên GPU thật. Kéo trái để xoay, kéo phải để pan; cuộn khi Canvas có focus để
        zoom. Phím V đổi chế độ kéo, mũi tên xoay, Home đặt lại camera; F1/F2 không đổi tư thế.
        Escape hủy lượt kéo. Các nút bên trên dùng được bằng bàn phím.
      </p>
    </>
  );
}
