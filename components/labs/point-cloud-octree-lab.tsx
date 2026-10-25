"use client";

import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type KeyboardEvent,
  type PointerEvent,
} from "react";
import { useCanvasSize, useReducedMotion } from "./lab-shared";
import { CloudSurveyReadout } from "./cloud-survey-readout";
import { drawCloud, type CloudViewCache } from "./cloud-survey-view";
import {
  cloudModes,
  createCloudScene,
  refreshCloud,
  exportCloud,
  type CloudScene,
} from "@/lib/labs/cloud-survey/scene";
import {
  cameraBasis,
  resetCamera,
  switchCameraMode,
  translateCamera,
  type Camera,
} from "@/lib/labs/cloud-survey/camera";
import { add, scale, type Vec3 } from "@/lib/labs/cloud-survey/geometry";
import { maximumCsvBytes } from "@/lib/labs/cloud-survey/csv";
import type { CloudJob } from "@/lib/labs/cloud-survey/jobs";

const CloudSurveyControls = lazy(() => import("./cloud-survey-controls"));
const CloudSurveyDiagnostics = lazy(() => import("./cloud-survey-diagnostics"));

interface Gesture {
  id: number;
  x: number;
  y: number;
  camera: Camera;
  tool: "orbit" | "pan";
}
function CloudSurveyScene({ mode }: { mode?: string }) {
  const found = cloudModes.indexOf(mode as (typeof cloudModes)[number]),
    stage = found < 0 ? 11 : found + 1;
  const [scene, setScene] = useState(() => createCloudScene(stage));
  const model = useRef(scene),
    canvasRef = useRef<HTMLCanvasElement>(null),
    gesture = useRef<Gesture | null>(null);
  const cache = useRef<CloudViewCache | null>(null),
    csvInput = useRef<string | undefined>(undefined),
    fileEpoch = useRef(0);
  const downloadUrl = useRef<string | null>(null),
    mounted = useRef(true);
  const [tool, setTool] = useState<"orbit" | "pan">("orbit");
  const [ready, setReady] = useState(false),
    [renderInfo, setRenderInfo] = useState({ drawn: 0, milliseconds: 0, error: "" });
  const [job, setJob] = useState<CloudJob | null>(null),
    jobRef = useRef<CloudJob | null>(null);
  const [paused, setPaused] = useState(false);
  const reduced = useReducedMotion();
  const getScene = useCallback(() => model.current, []);
  const getJob = useCallback(() => jobRef.current, []);
  const publishJob = useCallback((value: CloudJob | null) => {
    jobRef.current = value;
    setJob(value ? { ...value } : null);
  }, []);
  const invalidateFile = useCallback(() => {
    fileEpoch.current += 1;
    return fileEpoch.current;
  }, []);
  const helpId = `cloud-survey-help-${mode ?? "overview"}`;
  const publish = useCallback(
    () =>
      setScene({
        ...model.current,
        camera: { ...model.current.camera },
        region: { ...model.current.region },
      }),
    [],
  );
  const release = useCallback((restore = false) => {
    const current = gesture.current;
    gesture.current = null;
    if (!current) return;
    if (restore) model.current.camera = current.camera;
    if (canvasRef.current?.hasPointerCapture(current.id))
      canvasRef.current.releasePointerCapture(current.id);
  }, []);
  const stop = useCallback(() => {
    const wasDragging = gesture.current !== null;
    release(true);
    if (wasDragging) {
      refreshCloud(model.current);
      publish();
    }
    if (jobRef.current) jobRef.current.active = false;
    jobRef.current = null;
    setJob(null);
  }, [release, publish]);
  const size = useCanvasSize(canvasRef, stop);
  const change = useCallback(
    (action: (scene: CloudScene) => void) => {
      stop();
      action(model.current);
      refreshCloud(model.current);
      publish();
    },
    [stop, publish],
  );
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      model.current.width = size.width;
      model.current.height = size.height;
      refreshCloud(model.current);
      publish();
      setReady(true);
    });
    return () => cancelAnimationFrame(frame);
  }, [size.width, size.height, publish]);
  useEffect(() => {
    const context = canvasRef.current?.getContext("2d");
    if (!context) return;
    try {
      cache.current = drawCloud(context, model.current, size, cache.current);
      setRenderInfo({
        drawn: model.current.drawn,
        milliseconds: model.current.renderMilliseconds,
        error: "",
      });
    } catch (error) {
      setRenderInfo({ drawn: 0, milliseconds: 0, error: String(error) });
    }
  }, [scene, size]);
  useEffect(() => {
    mounted.current = true;
    const hidden = () => {
      if (document.hidden) stop();
    };
    window.addEventListener("blur", stop);
    document.addEventListener("visibilitychange", hidden);
    return () => {
      mounted.current = false;
      invalidateFile();
      release();
      if (jobRef.current) jobRef.current.active = false;
      if (downloadUrl.current) URL.revokeObjectURL(downloadUrl.current);
      cache.current = null;
      window.removeEventListener("blur", stop);
      document.removeEventListener("visibilitychange", hidden);
    };
  }, [stop, release, invalidateFile]);
  useEffect(() => {
    if (!reduced) return;
    const frame = requestAnimationFrame(() => setPaused(true));
    return () => cancelAnimationFrame(frame);
  }, [reduced]);
  const point = (event: { clientX: number; clientY: number }, canvas: HTMLCanvasElement) => {
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) * size.width) / rect.width,
      y: ((event.clientY - rect.top) * size.height) / rect.height,
    };
  };
  const applyGesture = (position: { x: number; y: number }) => {
    const current = gesture.current;
    if (!current) return;
    const c = { ...current.camera },
      dx = position.x - current.x,
      dy = position.y - current.y;
    if (current.tool === "orbit") {
      c.yaw -= dx * 0.006;
      c.pitch = Math.max(-1.45, Math.min(1.45, c.pitch + dy * 0.006));
    } else {
      const basis = cameraBasis(c),
        factor = c.distance * 0.0015;
      translateCamera(c, add(scale(basis.right, -dx * factor), scale(basis.up, dy * factor)));
    }
    model.current.camera = c;
    refreshCloud(model.current);
    publish();
  };
  const down = (event: PointerEvent<HTMLCanvasElement>) => {
    if (stage < 2 || event.button !== 0 || !event.isPrimary || gesture.current) return;
    stop();
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      return;
    }
    const position = point(event, event.currentTarget);
    gesture.current = {
      id: event.pointerId,
      ...position,
      camera: { ...model.current.camera },
      tool,
    };
    event.currentTarget.focus();
  };
  const move = (event: PointerEvent<HTMLCanvasElement>) => {
    if (gesture.current?.id !== event.pointerId) return;
    if (!(event.buttons & 1)) {
      release(true);
      refreshCloud(model.current);
      publish();
      return;
    }
    applyGesture(point(event, event.currentTarget));
  };
  const up = (event: PointerEvent<HTMLCanvasElement>) => {
    if (gesture.current?.id !== event.pointerId || event.button !== 0) return;
    applyGesture(point(event, event.currentTarget));
    release();
  };
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const wheel = (event: WheelEvent) => {
      if (stage < 2 || event.ctrlKey || event.metaKey) return;
      event.preventDefault();
      let delta = event.deltaY;
      if (event.deltaMode === 1) delta *= 16;
      if (event.deltaMode === 2) delta *= size.height;
      change((s) => {
        if (s.camera.freeFly)
          translateCamera(
            s.camera,
            scale(cameraBasis(s.camera).forward, -Math.max(-600, Math.min(600, delta)) * 0.01),
          );
        else
          s.camera.distance = Math.max(
            0.1,
            Math.min(
              Math.max(500, s.camera.farPlane * 0.8),
              s.camera.distance * Math.exp(Math.max(-600, Math.min(600, delta)) * 0.001),
            ),
          );
      });
    };
    canvas.addEventListener("wheel", wheel, { passive: false });
    return () => canvas.removeEventListener("wheel", wheel);
  }, [stage, size.height, change]);
  const key = (event: KeyboardEvent<HTMLCanvasElement>) => {
    if (event.ctrlKey || event.metaKey || event.altKey) return;
    const pressed = event.key.toLowerCase();
    if (pressed === "escape") {
      event.preventDefault();
      stop();
      refreshCloud(model.current);
      publish();
      return;
    }
    if (pressed === " ") {
      event.preventDefault();
      setPaused((value) => !value);
      return;
    }
    if (
      stage < 2 ||
      ![
        "w",
        "a",
        "s",
        "d",
        "q",
        "e",
        "f",
        "home",
        "arrowleft",
        "arrowright",
        "arrowup",
        "arrowdown",
        "j",
        "l",
        "i",
        "k",
        "u",
        "o",
        "delete",
        "backspace",
        "[",
        "]",
      ].includes(pressed)
    )
      return;
    event.preventDefault();
    change((s) => {
      const basis = cameraBasis(s.camera);
      const directions: Record<string, Vec3> = {
        w: basis.forward,
        s: scale(basis.forward, -1),
        a: scale(basis.right, -1),
        d: basis.right,
        q: { x: 0, y: -1, z: 0 },
        e: { x: 0, y: 1, z: 0 },
      };
      if (directions[pressed]) translateCamera(s.camera, scale(directions[pressed], 0.5));
      if (pressed === "f") switchCameraMode(s.camera);
      if (pressed === "home") s.camera = resetCamera(s.tree.nodes[0].bounds);
      if (pressed === "arrowleft") s.camera.yaw -= 0.1;
      if (pressed === "arrowright") s.camera.yaw += 0.1;
      if (pressed === "arrowup") s.camera.pitch = Math.max(-1.45, s.camera.pitch - 0.1);
      if (pressed === "arrowdown") s.camera.pitch = Math.min(1.45, s.camera.pitch + 0.1);
      if (stage >= 3) {
        const axes: Record<string, Vec3> = {
          j: { x: -0.5, y: 0, z: 0 },
          l: { x: 0.5, y: 0, z: 0 },
          i: { x: 0, y: 0.5, z: 0 },
          k: { x: 0, y: -0.5, z: 0 },
          u: { x: 0, y: 0, z: -0.5 },
          o: { x: 0, y: 0, z: 0.5 },
        };
        if (axes[pressed]) {
          s.region.center = add(s.region.center, axes[pressed]);
          for (const axis of ["x", "y", "z"] as const) {
            s.region.center[axis] = Math.max(-10000, Math.min(10000, s.region.center[axis]));
          }
          s.selectionEnabled = true;
        }
        if (pressed === "delete" || pressed === "backspace") s.selectionEnabled = false;
        if (pressed === "[" || pressed === "]") {
          const factor = pressed === "[" ? 0.8 : 1.25;
          s.region.radius = Math.max(0.05, Math.min(1000, s.region.radius * factor));
          s.region.half = scale(s.region.half, factor);
          for (const axis of ["x", "y", "z"] as const)
            s.region.half[axis] = Math.max(0.05, Math.min(1000, s.region.half[axis]));
          s.selectionEnabled = true;
        }
      }
    });
  };
  const preset = (count: number, uniform: boolean) => {
    stop();
    invalidateFile();
    csvInput.current = undefined;
    model.current = createCloudScene(stage, count, uniform);
    model.current.width = size.width;
    model.current.height = size.height;
    refreshCloud(model.current);
    publish();
  };
  const reset = () => {
    stop();
    invalidateFile();
    model.current = createCloudScene(stage, scene.count, scene.uniform, csvInput.current);
    model.current.width = size.width;
    model.current.height = size.height;
    refreshCloud(model.current);
    publish();
  };
  const open = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = "";
    if (!file) return;
    const epoch = invalidateFile();
    stop();
    try {
      if (file.size > maximumCsvBytes) throw Error("CSV vượt 16 MiB");
      const text = await file.text();
      if (!mounted.current || fileEpoch.current !== epoch) return;
      const next = createCloudScene(stage, 0, false, text);
      next.notice = `Đã mở CSV ${file.name}: ${next.count.toLocaleString("vi-VN")} điểm, đơn vị mét.`;
      csvInput.current = text;
      // File đọc bất đồng bộ: dùng viewport hiện tại, không dùng size cũ trong closure.
      next.width = model.current.width;
      next.height = model.current.height;
      refreshCloud(next);
      model.current = next;
      publish();
    } catch (error) {
      if (mounted.current && fileEpoch.current === epoch) {
        model.current.notice = String(error);
        publish();
      }
    }
  };
  const exportCsv = () => {
    stop();
    const result = exportCloud(model.current);
    if (!result.matches) {
      model.current.notice = "Đọc lại CSV không khớp; chưa tạo download.";
      publish();
      return;
    }
    if (downloadUrl.current) URL.revokeObjectURL(downloadUrl.current);
    const url = URL.createObjectURL(new Blob([result.csv], { type: "text/csv;charset=utf-8" }));
    downloadUrl.current = url;
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "cloud-selection.csv";
    anchor.click();
    model.current.notice = `CSV: ${result.count} điểm · đọc lại giữ nguyên ID/tọa độ.`;
    publish();
  };
  return (
    <section
      data-cloud-count={scene.count}
      data-cloud-selected={scene.selected.indices.length}
      data-cloud-visible={scene.visible.indices.length}
    >
      <Suspense fallback={<p>Đang tải công cụ điều khiển…</p>}>
        <CloudSurveyControls
          scene={scene}
          tool={tool}
          setTool={(value) => {
            stop();
            setTool(value);
          }}
          change={change}
          preset={preset}
          reset={reset}
          frame={() =>
            change((s) => {
              s.camera = resetCamera(s.tree.nodes[0].bounds);
            })
          }
          cameraMode={() => change((s) => switchCameraMode(s.camera))}
          open={open}
          exportCsv={exportCsv}
        />
      </Suspense>
      <canvas
        ref={canvasRef}
        tabIndex={0}
        aria-label="Khảo sát point cloud 3D bằng Octree"
        aria-describedby={helpId}
        style={{ width: "100%", height: 420, touchAction: "none", display: "block" }}
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
        onPointerCancel={(event) => {
          if (gesture.current?.id === event.pointerId) {
            release(true);
            refreshCloud(model.current);
            publish();
          }
        }}
        onLostPointerCapture={(event) => {
          if (gesture.current?.id === event.pointerId) {
            release(true);
            refreshCloud(model.current);
            publish();
          }
        }}
        onKeyDown={key}
      />
      <p id={helpId}>
        {stage < 2
          ? "Bài này đọc CSV và vẽ dữ liệu phòng; điều khiển camera bắt đầu ở bài 02."
          : "Kéo để orbit hoặc pan theo công cụ đã chọn; wheel tiến/lùi. WASD/QE dịch camera, mũi tên đổi hướng, F đổi orbit/free-fly, Home nhìn toàn dataset."}
        {stage >= 3 &&
          " J/L, I/K, U/O dời tâm vùng theo X/Y/Z; [ ] đổi kích thước, Delete xóa selection. Escape hủy thao tác đang kéo."}{" "}
        Dữ liệu đứng yên; Pause chỉ dừng tác vụ kiểm tra/đo, không khóa camera.{" "}
        {reduced && "Reduced motion: tác vụ bắt đầu ở trạng thái tạm dừng."}
      </p>
      <div className="lab-controls">
        <button type="button" onClick={() => setPaused((value) => !value)}>
          {paused ? "Tiếp tục tác vụ" : "Tạm dừng tác vụ"}
        </button>
      </div>
      <p role="status">
        {scene.notice}
        {renderInfo.error && ` · ${renderInfo.error}`}
      </p>
      <CloudSurveyReadout scene={scene} ready={ready} renderInfo={renderInfo} />
      <p>
        Vẽ đủ mọi visible point, không lấy mẫu cloud. Raster có depth buffer, giới hạn 2 triệu
        pixel; viewport độ phân giải cao được phóng theo DPR. Màu xanh–cam biểu diễn chiều cao Y;
        vàng là selection.
      </p>
      {stage >= 9 && (
        <Suspense fallback={<p>Đang tải phần kiểm chứng…</p>}>
          <CloudSurveyDiagnostics
            stage={stage}
            paused={paused}
            job={job}
            getScene={getScene}
            getJob={getJob}
            onJob={publishJob}
            stop={stop}
          />
        </Suspense>
      )}
    </section>
  );
}
export default function PointCloudOctreeLab({ mode }: { mode?: string }) {
  return <CloudSurveyScene key={mode ?? "overview"} mode={mode} />;
}
