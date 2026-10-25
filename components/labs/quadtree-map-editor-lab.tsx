"use client";

import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useRef,
  useState,
  type FocusEvent,
  type KeyboardEvent,
  type PointerEvent,
} from "react";
import {
  createMapScene,
  initialMapCamera,
  cancelMapWork,
  refreshMapScene,
  beginMapGesture,
  moveMapGesture,
  endMapGesture,
  zoomMapScene,
  mapModes,
  type MapTool,
} from "@/lib/labs/map-scene";
import { viewportBox } from "@/lib/labs/map-geometry";
import { MapEditorControls } from "./map-editor-controls";
import { MapEditorReadout } from "./map-editor-readout";
import { mapEditorHelp } from "./map-editor-help";
import { drawMapEditor } from "./map-editor-view";
import { useCanvasSize, useReducedMotion } from "./lab-shared";
import type { MapLayout } from "@/lib/labs/map-data";

const MapEditorDiagnostics = lazy(() => import("./map-editor-diagnostics"));

function MapEditorScene({ mode }: { mode?: string }) {
  const index = mapModes.indexOf(mode as (typeof mapModes)[number]);
  const stage = index < 0 ? 11 : index + 1;
  const [scene, setScene] = useState(() => createMapScene(stage));
  const [measurementsReady, setMeasurementsReady] = useState(false);
  const model = useRef(scene);
  const getScene = useCallback(() => model.current, []);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const owner = useRef<number | null>(null);
  // Each course page owns one instance of this mode. Keep its ARIA link stable
  // across the server/client RSC boundaries as well as client navigation.
  const helpId = `quadtree-map-editor-help-${mode ?? "overview"}`;
  const reduced = useReducedMotion();
  const publish = useCallback(() => {
    const current = model.current;
    setScene({
      ...current,
      camera: { ...current.camera },
      gesture: current.gesture
        ? { ...current.gesture, offset: { ...current.gesture.offset } }
        : null,
      validation: current.validation ? { ...current.validation } : null,
      benchmark: current.benchmark
        ? { ...current.benchmark, rows: [...current.benchmark.rows] }
        : null,
    });
  }, []);
  const release = useCallback(() => {
    const id = owner.current;
    owner.current = null;
    if (id !== null && canvasRef.current?.hasPointerCapture(id))
      canvasRef.current.releasePointerCapture(id);
  }, []);
  const stop = useCallback(() => {
    release();
    cancelMapWork(model.current);
    publish();
  }, [publish, release]);
  const size = useCanvasSize(canvasRef, stop);
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      model.current.size = { width: size.width, height: size.height };
      refreshMapScene(model.current);
      setMeasurementsReady(true);
      publish();
    });
    return () => cancelAnimationFrame(frame);
  }, [size.width, size.height, publish]);
  useEffect(() => {
    const context = canvasRef.current?.getContext("2d");
    if (context) drawMapEditor(context, scene, size);
  }, [scene, size]);
  useEffect(() => {
    const hide = () => {
      if (document.hidden) stop();
    };
    window.addEventListener("blur", stop);
    document.addEventListener("visibilitychange", hide);
    return () => {
      window.removeEventListener("blur", stop);
      document.removeEventListener("visibilitychange", hide);
      cancelMapWork(model.current);
      release();
    };
  }, [stop, release]);
  const point = (clientX: number, clientY: number, canvas: HTMLCanvasElement) => {
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((clientX - rect.left) * size.width) / rect.width,
      y: ((clientY - rect.top) * size.height) / rect.height,
    };
  };
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const wheel = (event: WheelEvent) => {
      if (model.current.stage < 2 || event.ctrlKey || event.metaKey) return;
      event.preventDefault();
      const rect = canvas.getBoundingClientRect();
      const anchor = {
        x: ((event.clientX - rect.left) * size.width) / rect.width,
        y: ((event.clientY - rect.top) * size.height) / rect.height,
      };
      let delta = event.deltaY;
      if (event.deltaMode === 1) delta *= 16;
      if (event.deltaMode === 2) delta *= size.height;
      release();
      zoomMapScene(
        model.current,
        anchor,
        model.current.camera.zoom * Math.exp(-Math.max(-600, Math.min(600, delta)) * 0.0015),
      );
      publish();
    };
    canvas.addEventListener("wheel", wheel, { passive: false });
    return () => canvas.removeEventListener("wheel", wheel);
  }, [size.width, size.height, release, publish]);
  const reset = (
    count = model.current.count,
    seed = model.current.seed,
    layout: MapLayout = model.current.layout,
  ) => {
    stop();
    model.current = createMapScene(stage, count, seed, layout);
    model.current.size = { width: size.width, height: size.height };
    refreshMapScene(model.current);
    publish();
  };
  const tool = (value: MapTool) => {
    stop();
    model.current.tool = value;
    publish();
  };
  const down = (event: PointerEvent<HTMLCanvasElement>) => {
    if (event.button !== 0 || !event.isPrimary || owner.current !== null) return;
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      return;
    }
    owner.current = event.pointerId;
    event.currentTarget.focus();
    beginMapGesture(
      model.current,
      point(event.clientX, event.clientY, event.currentTarget),
      event.shiftKey,
    );
    publish();
  };
  const move = (event: PointerEvent<HTMLCanvasElement>) => {
    if (owner.current !== event.pointerId) return;
    if (!(event.buttons & 1)) {
      stop();
      return;
    }
    moveMapGesture(model.current, point(event.clientX, event.clientY, event.currentTarget));
    publish();
  };
  const up = (event: PointerEvent<HTMLCanvasElement>) => {
    if (owner.current !== event.pointerId || event.button !== 0) return;
    endMapGesture(model.current, point(event.clientX, event.clientY, event.currentTarget));
    release();
    publish();
  };
  const add = () => {
    stop();
    const current = model.current;
    current.document.add(current.camera, current.kind);
    refreshMapScene(current);
    publish();
  };
  const remove = () => {
    stop();
    model.current.document.deleteSelection();
    refreshMapScene(model.current);
    publish();
  };
  const zoom = (factor: number) => {
    release();
    zoomMapScene(
      model.current,
      { x: size.width / 2, y: size.height / 2 },
      model.current.camera.zoom * factor,
    );
    publish();
  };
  const key = (event: KeyboardEvent<HTMLCanvasElement>) => {
    if (event.ctrlKey || event.metaKey || event.altKey || event.repeat) return;
    const pressed = event.key.toLowerCase();
    if (
      ![
        "escape",
        "delete",
        "backspace",
        "home",
        "+",
        "=",
        "-",
        "arrowleft",
        "arrowright",
        "arrowup",
        "arrowdown",
      ].includes(pressed)
    )
      return;
    event.preventDefault();
    if (pressed === "escape") {
      stop();
      return;
    }
    if ((pressed === "delete" || pressed === "backspace") && stage >= 7) {
      remove();
      return;
    }
    if (pressed === "+" || pressed === "=") {
      zoom(1.25);
      return;
    }
    if (pressed === "-") {
      zoom(0.8);
      return;
    }
    stop();
    if (pressed === "home")
      model.current.camera = initialMapCamera(model.current.count, model.current.layout);
    const direction = {
      x: pressed === "arrowleft" ? -1 : pressed === "arrowright" ? 1 : 0,
      y: pressed === "arrowup" ? -1 : pressed === "arrowdown" ? 1 : 0,
    };
    if (event.shiftKey && stage >= 7 && (direction.x || direction.y))
      model.current.document.moveSelection({ x: direction.x * 8, y: direction.y * 8 });
    else if (stage >= 2)
      model.current.camera = {
        ...model.current.camera,
        x: model.current.camera.x + (direction.x * 64) / model.current.camera.zoom,
        y: model.current.camera.y + (direction.y * 64) / model.current.camera.zoom,
      };
    refreshMapScene(model.current);
    publish();
  };
  const blur = (event: FocusEvent<HTMLDivElement>) => {
    if (
      !(event.relatedTarget instanceof Node) ||
      !event.currentTarget.contains(event.relatedTarget)
    )
      stop();
  };
  return (
    <div
      className="lab-body"
      onBlur={blur}
      data-map-count={scene.document.tree.objects.size}
      data-map-selected={scene.document.selection.size}
      data-map-revision={scene.document.tree.revision}
      data-reduced-motion={reduced}
    >
      <MapEditorControls
        scene={scene}
        commands={{
          tool,
          reset,
          cancel: stop,
          zoom,
          remove,
          add,
          home: () => {
            stop();
            model.current.camera = initialMapCamera(model.current.count, model.current.layout);
            refreshMapScene(model.current);
            publish();
          },
          selectView: () => {
            stop();
            const current = model.current;
            const box = viewportBox(current.camera, current.size);
            current.document.selectRegion(box, { x: box.x + box.width, y: box.y + box.height });
            refreshMapScene(current);
            publish();
          },
          kind: (kind) => {
            stop();
            model.current.kind = kind;
            publish();
          },
          debug: () => {
            model.current.debug = !model.current.debug;
            publish();
          },
          method: () => {
            stop();
            model.current.document.useTree = !model.current.document.useTree;
            model.current.document.lastQuery = null;
            refreshMapScene(model.current);
            publish();
          },
          rebuild: (capacity) => {
            stop();
            model.current.document.rebuild(capacity);
            refreshMapScene(model.current);
            publish();
          },
        }}
      />
      <canvas
        ref={canvasRef}
        className="lab-canvas"
        tabIndex={0}
        aria-label="Biên tập bản đồ 2D bằng Quadtree"
        aria-describedby={helpId}
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
        onKeyDown={key}
        onBlur={stop}
        onPointerCancel={(event) => {
          if (owner.current === event.pointerId) stop();
        }}
        onLostPointerCapture={(event) => {
          if (owner.current === event.pointerId) stop();
        }}
        style={{ touchAction: "none", height: "clamp(320px, 52vw, 560px)" }}
      />
      <p id={helpId}>{mapEditorHelp(stage)}</p>
      <p>
        Nhà vàng có mái, cây xanh có tán và công viên có lối đi; đường phố là nền không có ID.{" "}
        {stage >= 3 && "Vùng chọn dùng AABB, không dùng pixel hình vẽ. "}
        {stage >= 8 && "Kéo nhóm chỉ hiện preview; vượt root thì cả nhóm giữ nguyên vị trí. "}
        {reduced && "Không dùng chuyển động tự động hoặc camera có quán tính."}
      </p>
      <MapEditorReadout scene={scene} measurementsReady={measurementsReady} />
      {stage >= 9 && (
        <Suspense fallback={<p>Đang tải công cụ kiểm và đo…</p>}>
          <MapEditorDiagnostics scene={scene} getScene={getScene} publish={publish} stop={stop} />
        </Suspense>
      )}
    </div>
  );
}
export default function QuadtreeMapEditorLab({ mode }: { mode?: string }) {
  return <MapEditorScene key={mode ?? "final"} mode={mode} />;
}
