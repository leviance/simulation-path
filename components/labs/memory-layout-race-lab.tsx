"use client";
import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent,
  type KeyboardEvent,
} from "react";
import {
  beginConversion,
  beginPhysics,
  cancelPending,
  createFountain,
  modes,
  tickPending,
  type Camera,
} from "@/lib/labs/fountain/scene";
import { validateConfig, type MemoryWorkload } from "@/lib/labs/fountain/state";
import { fountainCamera, fountainViews, panFountainCamera } from "@/lib/labs/fountain/camera";
import { nextExpirySlot, pickFountainDrop } from "@/lib/labs/fountain/inspection";
import {
  LabReadout,
  canvasPoint,
  setupCanvas,
  useCanvasSize,
  usePauseOnReducedMotion,
  useReducedMotion,
} from "./lab-shared";
import { drawFountain, type DrawStats } from "./fountain/view";
import { FountainObservation } from "./fountain/observation";
import { useFountainBenchmark } from "./fountain/use-benchmark";
import type { FountainAction } from "./fountain/controls";
import type { InteractiveLabMode } from "./types";
const Controls = lazy(() => import("./fountain/controls"));
const Results = lazy(() => import("./fountain/results"));

export default function MemoryLayoutRaceLab({ mode }: { mode?: InteractiveLabMode }) {
  return <Fountain key={mode ?? "overview"} mode={mode} />;
}

function Fountain({ mode }: { mode?: string }) {
  const found = modes.indexOf(mode as (typeof modes)[number]);
  const stage = found < 0 ? 8 : found + 1;
  const [scene, setScene] = useState(() => createFountain(stage));
  const model = useRef(scene);
  const [workload, setWorkload] = useState<MemoryWorkload>("gravity-only");
  const [debug, setDebug] = useState(false);
  const [inspecting, setInspecting] = useState(false);
  const [paintRequest, setPaintRequest] = useState(0);
  const [stats, setStats] = useState<DrawStats & { frameMs: number }>({
    sampled: 0,
    rendered: 0,
    renderMs: 0,
    frameMs: 0,
  });
  const frameInterval = useRef(0);
  const canvas = useRef<HTMLCanvasElement>(null);
  const gesture = useRef<{
    id: number;
    button: number;
    x: number;
    y: number;
    before: Camera;
    moved: boolean;
  } | null>(null);
  const { result, start, pause, cancel, clear } = useFountainBenchmark();
  const publish = useCallback(() => {
    setScene({ ...model.current });
    setPaintRequest((request) => request + 1);
  }, []);
  const release = useCallback((rollback = false) => {
    const active = gesture.current;
    gesture.current = null;
    if (!active) return;
    if (rollback) model.current.camera = active.before;
    if (canvas.current?.hasPointerCapture(active.id))
      canvas.current.releasePointerCapture(active.id);
  }, []);
  const stop = useCallback(() => {
    model.current.paused = true;
    model.current.jobPaused = true;
    release();
    pause(true);
    publish();
  }, [pause, publish, release]);
  const size = useCanvasSize(canvas, stop);
  const reduced = useReducedMotion();
  usePauseOnReducedMotion(stop);
  const helpId = "fountain-help-" + (mode ?? "overview");

  const action = useCallback(
    (kind: FountainAction, value = 0) => {
      const current = model.current;
      if (kind === "run") {
        if (stage < 2) return;
        if (result?.active) pause(!result.paused);
        else if (current.pending?.kind === "conversion") current.jobPaused = !current.jobPaused;
        else if (!reduced) {
          current.paused = !current.paused;
          current.jobPaused = current.paused;
        }
        publish();
        return;
      }
      if (kind === "debug") {
        setDebug((visible) => !visible);
        return;
      }
      if (kind === "camera") {
        current.camera = fountainCamera(fountainViews[value] ?? "oblique");
        release();
        publish();
        return;
      }
      if (kind === "inspect") {
        setInspecting((visible) => !visible);
        return;
      }
      if (kind === "expiry") {
        if (stage < 2) return;
        const slot = nextExpirySlot(current);
        if (slot < 0) return;
        current.selected = slot;
        setInspecting(true);
        publish();
        return;
      }
      if (kind === "selected") {
        if (Number.isFinite(value)) {
          current.selected = Math.max(0, Math.min(current.count - 1, Math.trunc(value)));
          setInspecting(true);
        }
        publish();
        return;
      }
      if (kind === "cancel") {
        cancelPending(current);
        if (result?.active) cancel();
        release();
        publish();
        return;
      }
      if (kind === "benchmark" || kind === "scaling") {
        if (stage < 3 || (kind === "scaling" && stage < 7)) return;
        cancelPending(current);
        release();
        start(
          current.config,
          kind === "scaling" ? [256, 2000, 20000] : [current.count],
          kind === "scaling" ? ["gravity-only", "full-lifecycle"] : [workload],
          stage >= 7,
        );
        publish();
        return;
      }
      if (kind === "workload") {
        clear();
        setWorkload(value === 0 ? "gravity-only" : "full-lifecycle");
        return;
      }
      if (kind === "layout") {
        if (result?.active || stage < 4) return;
        beginConversion(current);
        publish();
        return;
      }
      if (kind === "step") {
        if (result?.active || stage < 2 || current.pending?.kind === "conversion") return;
        current.paused = true;
        current.jobPaused = false;
        current.singleStep = true;
        if (!current.pending) beginPhysics(current);
        publish();
        return;
      }
      clear();
      release();
      if (kind === "reset" || kind === "preset" || kind === "seed") {
        const preset = kind === "preset" ? value : current.preset;
        const config = { ...current.config };
        if (kind === "seed") config.seed = value;
        if (kind === "preset") config.emissionRate = [256, 2000, 20000, 256][preset] * 0.5;
        const next = createFountain(stage, preset, config);
        if (kind === "reset") {
          next.camera = current.camera;
          next.selected = current.selected;
          next.notice =
            "Đã đặt lại cùng số slot và seed, dùng độ xòe hiện tại; thời gian trở về 0.";
        }
        next.revision = current.revision + 1;
        model.current = next;
        publish();
        return;
      }
      if (
        ["emitterX", "launchSpeed", "gravity", "lifetime", "emissionRate", "spread"].includes(
          kind,
        ) &&
        stage >= 2 &&
        Number.isFinite(value)
      ) {
        const next = { ...current.config, [kind]: Math.fround(value) };
        try {
          validateConfig(next);
          cancelPending(current);
          current.config = next;
          current.notice =
            kind === "spread"
              ? "Đã chỉnh độ xòe. Giọt đang bay giữ nguyên vận tốc ngang; nhấn Đặt lại để thấy cả tia nước đổi ngay."
              : "Đã đổi cấu hình và dừng bước dở. Gravity áp dụng ở bước sau; thông số sinh hạt áp dụng cho lần sinh kế tiếp.";
        } catch {
          current.notice = "Giá trị nằm ngoài ngân sách cho phép; giữ nguyên cấu hình.";
        }
        publish();
      }
    },
    [cancel, clear, pause, publish, reduced, release, result, stage, start, workload],
  );

  useEffect(() => {
    const element = canvas.current,
      context = element?.getContext("2d");
    if (!element || !context) return;
    let frame = 0,
      lastFrame = performance.now(),
      lastReport = lastFrame;
    let latest: DrawStats & { frameMs: number };
    const paint = (now: number) => {
      setupCanvas(context, size);
      latest = {
        ...drawFountain(context, model.current, size.width, size.height, debug, inspecting),
        frameMs: now - lastFrame,
      };
      lastFrame = now;
    };
    paint(lastFrame);
    setStats({ ...latest!, frameMs: frameInterval.current });
    const needsFrame = (current: typeof model.current) => {
      if (!current.pending) return !current.paused;
      if (current.jobPaused) return false;
      return current.pending.kind === "conversion" || !current.paused || current.singleStep;
    };
    const animate = (now: number) => {
      const current = model.current;
      const revision = current.revision;
      try {
        if (!current.pending && !current.paused) beginPhysics(current);
        if (current.pending) tickPending(current);
      } catch (error) {
        cancelPending(current);
        current.notice =
          "Đã dừng an toàn: " + (error instanceof Error ? error.message : "lỗi cập nhật");
      }
      // A half-written batch is not a new image. Keep the last frame until all slots commit.
      const interval = now - lastFrame;
      if (current.revision !== revision) paint(now);
      lastFrame = now;
      frameInterval.current = interval;
      const active = needsFrame(current);
      if (now - lastReport >= 120 || !active) {
        lastReport = now;
        setStats({ ...latest, frameMs: interval });
        setScene({ ...current });
      }
      if (active) frame = requestAnimationFrame(animate);
    };
    if (needsFrame(model.current)) frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [paintRequest, size, debug, inspecting]);

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
    const element = canvas.current;
    if (!element) return;
    const wheel = (event: WheelEvent) => {
      event.preventDefault();
      model.current.camera.distance = Math.max(
        4,
        Math.min(40, model.current.camera.distance * Math.exp(event.deltaY * 0.001)),
      );
      publish();
    };
    element.addEventListener("wheel", wheel, { passive: false });
    return () => element.removeEventListener("wheel", wheel);
  }, [publish]);

  const move = (event: PointerEvent<HTMLCanvasElement>) => {
    const active = gesture.current;
    if (!active || active.id !== event.pointerId) return;
    if (event.type === "pointermove" && (event.buttons & (active.button === 0 ? 1 : 2)) === 0) {
      release();
      publish();
      return;
    }
    const point = canvasPoint(event, event.currentTarget);
    const dx = point.x - active.x,
      dy = point.y - active.y;
    if (!active.moved && Math.hypot(dx, dy) < 4) return;
    active.moved = true;
    let camera = { ...active.before };
    if (active.button === 0) {
      camera.yaw += dx * 0.008;
      camera.pitch = Math.max(-Math.PI / 2, Math.min(1.1, camera.pitch + dy * 0.006));
    } else {
      camera = panFountainCamera(camera, dx, dy, size.height);
    }
    model.current.camera = camera;
    publish();
  };
  const pointerDown = (event: PointerEvent<HTMLCanvasElement>) => {
    if (gesture.current || !event.isPrimary || (event.button !== 0 && event.button !== 2)) return;
    event.preventDefault();
    event.currentTarget.focus({ preventScroll: true });
    event.currentTarget.setPointerCapture(event.pointerId);
    const point = canvasPoint(event, event.currentTarget);
    gesture.current = {
      id: event.pointerId,
      button: event.button,
      x: point.x,
      y: point.y,
      before: { ...model.current.camera },
      moved: false,
    };
  };
  const keyDown = (event: KeyboardEvent<HTMLCanvasElement>) => {
    if (event.ctrlKey || event.metaKey || event.altKey || event.key === "Tab") return;
    const key = event.key.toLowerCase();
    const shortcuts: Record<string, FountainAction> = {
      " ": "run",
      n: "step",
      r: "reset",
      l: "layout",
      x: "cancel",
      b: "benchmark",
      c: "scaling",
      f: "debug",
      i: "inspect",
      u: "expiry",
      home: "camera",
    };
    if (key === "f1" || key === "f2" || key === "f3") {
      event.preventDefault();
      if (event.repeat) return;
      action("camera", Number(key.slice(1)) - 1);
      return;
    }
    if ((key === "," || key === ".") && stage >= 2) {
      event.preventDefault();
      const delta = key === "," ? -0.5 : 0.5;
      action("spread", Math.max(0, Math.min(5, model.current.config.spread + delta)));
      return;
    }
    if (key === "escape") {
      event.preventDefault();
      release(true);
      action("cancel");
      return;
    }
    if (key === "1" || key === "2" || key === "3") {
      event.preventDefault();
      action("preset", key === "1" ? 0 : key === "2" ? 1 : 2);
      return;
    }
    if (key === "[" || key === "]") {
      event.preventDefault();
      action("selected", model.current.selected + (key === "]" ? 1 : -1));
      return;
    }
    if (key.startsWith("arrow")) {
      event.preventDefault();
      const camera = model.current.camera;
      if (key === "arrowleft") camera.yaw -= 0.08;
      if (key === "arrowright") camera.yaw += 0.08;
      if (key === "arrowup") camera.pitch = Math.max(-Math.PI / 2, camera.pitch - 0.05);
      if (key === "arrowdown") camera.pitch = Math.min(1.1, camera.pitch + 0.05);
      publish();
      return;
    }
    if (shortcuts[key]) {
      event.preventDefault();
      if (!event.repeat) action(shortcuts[key]);
    }
  };

  return (
    <>
      <canvas
        ref={canvas}
        className="lab-canvas"
        role="img"
        style={{ touchAction: "none", height: "clamp(270px, 42vw, 480px)" }}
        tabIndex={0}
        aria-label="Đài phun hạt CPU — Canvas minh họa ba chiều, màu theo tuổi hạt"
        aria-describedby={helpId}
        onKeyDown={keyDown}
        onPointerDown={pointerDown}
        onPointerMove={move}
        onPointerUp={(event) => {
          if (gesture.current?.id === event.pointerId) {
            move(event);
            const active = gesture.current;
            if (active && !active.moved && active.button === 0) {
              const point = canvasPoint(event, event.currentTarget);
              const selected = pickFountainDrop(
                model.current,
                point.x,
                point.y,
                size.width,
                size.height,
              );
              if (selected >= 0) action("selected", selected);
            }
            release();
            publish();
          }
        }}
        onPointerCancel={(event) => {
          if (gesture.current?.id === event.pointerId) {
            release(true);
            publish();
          }
        }}
        onLostPointerCapture={(event) => {
          if (gesture.current?.id === event.pointerId) {
            release(true);
            publish();
          }
        }}
        onContextMenu={(event) => event.preventDefault()}
        onBlur={stop}
      />
      <FountainObservation
        scene={scene}
        inspect={inspecting}
        result={result}
        reduced={reduced}
        action={action}
      />
      <p id={helpId}>
        Canvas minh họa tối đa 20.000 hạt; preset một triệu hạt thật nằm trong bản C++ tải về. Kéo
        trái để xoay camera, kéo phải để pan, cuộn để zoom; các thao tác này không làm đổi state vật
        lý. Mũi tên xoay camera; F1/F2/F3 chọn góc nghiêng, từ trên hoặc ngang. Nhấp một giọt để
        soi, I bật/tắt theo dõi, U tìm giọt sắp tái sinh và [ / ] đổi slot. Dấu phẩy và dấu chấm
        giảm hoặc tăng độ xòe cho lần phát tới. Space tạm dừng/tiếp tục, N tiến một bước, R đặt lại,
        L đổi layout, B đo, C đo nhiều N, X hủy, F hiện/ẩn dữ liệu. Tab rời Canvas, Escape hủy thao
        tác kéo và tác vụ.{" "}
        {reduced && "Reduced motion đang bật: dùng N để tiến từng bước; không tự chạy hoạt ảnh."}
      </p>
      <Suspense fallback={<p>Đang tải bảng điều khiển…</p>}>
        <Controls scene={scene} result={result} workload={workload} debug={debug} action={action} />
      </Suspense>
      <LabReadout
        items={[
          {
            label: "Allocated / alive / updated",
            value:
              scene.count.toLocaleString("vi-VN") +
              " / " +
              scene.active.toLocaleString("vi-VN") +
              " / " +
              scene.committedUpdated.toLocaleString("vi-VN") +
              " (bước đã hoàn tất gần nhất)",
          },
          {
            label: "Sampled / rendered",
            value:
              stats.sampled.toLocaleString("vi-VN") +
              " / " +
              stats.rendered.toLocaleString("vi-VN") +
              " (sau che khuất/culling; sample tối đa 8.000, không giảm update N)",
          },
          {
            label: "State vật lý",
            value:
              scene.layout.toUpperCase() +
              " · " +
              scene.steps +
              " bước · t = " +
              scene.time.toFixed(4) +
              " s",
          },
          {
            label: "Kernel / copy / conversion",
            value:
              scene.kernelMs.toFixed(3) +
              " / " +
              scene.copyMs.toFixed(3) +
              " / " +
              scene.conversionMs.toFixed(3) +
              " ms",
          },
          {
            label: "Render / khoảng frame gần nhất",
            value:
              stats.renderMs.toFixed(3) +
              " / " +
              stats.frameMs.toFixed(3) +
              " ms (không phải tổng bước)",
          },
          {
            label: "Toàn bước đã commit",
            value:
              scene.stepWallMs.toFixed(3) +
              " ms, gồm chờ RAF và copy; pause cũng làm tăng wall time",
          },
          { label: "Births / respawns bước gần nhất", value: scene.born + " / " + scene.respawned },
        ]}
      />
      <p role="status">
        {scene.notice}{" "}
        {scene.pending &&
          "Đang " +
            (scene.pending.kind === "conversion" ? "chuyển layout" : "cập nhật") +
            ": " +
            scene.pending.cursor +
            "/" +
            scene.count +
            " slot; viewport vẫn giữ snapshot hoàn tất."}
      </p>
      <Suspense fallback={<p>Đang tải phần giải thích và kết quả…</p>}>
        <Results scene={scene} result={result} workload={workload} debug={debug} />
      </Suspense>
    </>
  );
}
