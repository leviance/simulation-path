"use client";
import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent,
  type KeyboardEvent,
} from "react";
import {
  createGalaxy,
  modes,
  tickPhysics,
  invalidateExperiment,
  cancelPhysics,
  selectedForce,
  vectorLength,
  validateGalaxy,
  type Camera,
} from "@/lib/labs/galaxy/scene";
import type { GalaxyJob } from "@/lib/labs/galaxy/jobs";
import {
  LabReadout,
  setupCanvas,
  useCanvasSize,
  useReducedMotion,
  usePauseOnReducedMotion,
} from "./lab-shared";
import { drawGalaxy, pickGalaxy } from "./galaxy-view";
import type { GalaxyAction } from "./galaxy-controls";
import type { InteractiveLabMode } from "./types";
const GalaxyControls = lazy(() => import("./galaxy-controls"));
const GalaxyResults = lazy(() => import("./galaxy-results"));
const loadJobs = () => import("@/lib/labs/galaxy/jobs");

export default function BarnesHutNbodyLab({ mode }: { mode?: InteractiveLabMode }) {
  return <Galaxy key={mode ?? "overview"} mode={mode} />;
}
function Galaxy({ mode }: { mode?: string }) {
  const found = modes.indexOf(mode as (typeof modes)[number]),
    stage = found < 0 ? 10 : found + 1;
  const [scene, setScene] = useState(() => createGalaxy(stage)),
    model = useRef(scene);
  const [job, setJob] = useState<GalaxyJob | null>(null),
    jobRef = useRef(job);
  const jobsRuntime = useRef<Awaited<ReturnType<typeof loadJobs>> | null>(null);
  const requestEpoch = useRef(0),
    mounted = useRef(true);
  const [loadingJob, setLoadingJob] = useState(false);
  const [tool, setTool] = useState<"orbit" | "pan">("orbit");
  const canvasRef = useRef<HTMLCanvasElement>(null),
    reduced = useReducedMotion();
  const gesture = useRef<{
    id: number;
    x: number;
    y: number;
    startX: number;
    startY: number;
    before: Camera;
  } | null>(null);
  const publish = useCallback(() => setScene({ ...model.current }), []);
  const publishJob = useCallback((value: GalaxyJob | null) => {
    jobRef.current = value;
    setJob(value ? { ...value } : null);
  }, []);
  const release = useCallback((rollback = false) => {
    const active = gesture.current;
    gesture.current = null;
    if (!active) return;
    if (rollback) model.current.camera = active.before;
    const canvas = canvasRef.current;
    if (canvas?.hasPointerCapture(active.id)) canvas.releasePointerCapture(active.id);
  }, []);
  const stop = useCallback(() => {
    requestEpoch.current++;
    setLoadingJob(false);
    model.current.paused = true;
    release();
    if (jobRef.current) {
      jobRef.current.paused = true;
      publishJob(jobRef.current);
    }
    publish();
  }, [publish, publishJob, release]);
  const size = useCanvasSize(canvasRef, stop);
  usePauseOnReducedMotion(stop);
  const helpId = "galaxy-help-" + (mode ?? "overview");
  const startMeasurement = useCallback(
    async (kind: GalaxyJob["kind"]) => {
      const current = model.current;
      const revision = current.revision;
      const request = ++requestEpoch.current;
      cancelPhysics(current);
      publishJob(null);
      setLoadingJob(true);
      current.notice = "Đang tải phép đo; camera vẫn sử dụng được.";
      publish();
      try {
        const runtime = jobsRuntime.current ?? (await loadJobs());
        if (
          !mounted.current ||
          requestEpoch.current !== request ||
          model.current !== current ||
          current.revision !== revision
        )
          return;
        jobsRuntime.current = runtime;
        setLoadingJob(false);
        publishJob(runtime.startGalaxyJob(current, kind));
        current.notice =
          "Vật lý tạm dừng trong khi đo. Xem tiến độ và kết quả trong bảng bên dưới.";
        publish();
      } catch {
        if (mounted.current && requestEpoch.current === request) {
          setLoadingJob(false);
          current.notice = "Không tải được phép đo. Bạn có thể thử lại hoặc đặt lại preset.";
          publish();
        }
      }
    },
    [publish, publishJob],
  );
  const act = useCallback(
    (action: GalaxyAction, value = 0) => {
      const current = model.current;
      if (action === "run") {
        requestEpoch.current++;
        setLoadingJob(false);
        if (jobRef.current?.active) {
          jobRef.current.paused = !jobRef.current.paused;
          publishJob(jobRef.current);
        } else if (!reduced) {
          current.paused = !current.paused;
          publish();
        }
        return;
      }
      if (action === "camera") {
        current.camera = { yaw: 0.45, pitch: -0.52, distance: 2.5, x: 0, y: 0 };
        publish();
        return;
      }
      if (action === "debug") {
        current.debug = !current.debug;
        publish();
        return;
      }
      if (action === "validate") {
        current.notice = Object.entries(validateGalaxy(current))
          .map(([name, valid]) => name + ": " + (valid ? "đạt" : "LỖI"))
          .join(" · ");
        publish();
        return;
      }
      if (action === "selected" && Number.isFinite(value)) {
        current.selected = Math.max(0, Math.min(current.bodies.length - 1, Math.floor(value)));
        publish();
        return;
      }
      if (action === "cancel") {
        requestEpoch.current++;
        setLoadingJob(false);
        cancelPhysics(current);
        current.notice = "Đã hủy tác vụ; trạng thái vật lý đã hoàn tất gần nhất được giữ nguyên.";
        if (jobRef.current) {
          jobRef.current.active = false;
          jobRef.current.notice =
            "Đã hủy; các dòng đã tính xong được giữ lại, thí nghiệm chưa hoàn tất.";
          publishJob(jobRef.current);
        }
        publish();
        return;
      }
      release();
      if (["sweep", "runtime", "energy", "dtStudy"].includes(action)) {
        const kind = action === "dtStudy" ? "dt" : action;
        void startMeasurement(kind as GalaxyJob["kind"]);
        return;
      }
      requestEpoch.current++;
      setLoadingJob(false);
      publishJob(null);
      if (action === "preset" || action === "reset") {
        const next = createGalaxy(stage, action === "preset" ? value : current.preset);
        next.theta = current.theta;
        next.epsilon = current.epsilon;
        next.dt = current.dt;
        next.revision = current.revision + 1;
        model.current = next;
        publish();
        return;
      }
      if (action === "step") {
        cancelPhysics(current);
        current.singleStep = true;
        publish();
        return;
      }
      invalidateExperiment(current);
      if (action === "theta" && Number.isFinite(value))
        current.theta = Math.max(0.05, Math.min(1.2, value));
      if (action === "epsilon" && Number.isFinite(value))
        current.epsilon = Math.max(0.005, Math.min(0.08, value));
      if (action === "dt" && [1 / 60, 1 / 120, 1 / 240].includes(value)) current.dt = value;
      if (action === "direct") {
        if (value === 1 && current.bodies.length > 256)
          current.notice =
            "Direct simulation chỉ chạy ở N≤256; reference lực hệ lớn vẫn đọc toàn bộ sources.";
        else current.direct = value === 1;
      }
      publish();
    },
    [publish, publishJob, reduced, release, stage, startMeasurement],
  );
  const active =
    (!scene.paused && stage >= 4) || scene.singleStep || !!(job?.active && !job.paused);
  useEffect(() => {
    if (!active) return;
    let frame = 0,
      disposed = false;
    const tick = () => {
      if (disposed) return;
      const current = model.current,
        measurement = jobRef.current;
      if (measurement?.active && !measurement.paused) {
        jobsRuntime.current?.tickGalaxyJob(measurement, current.revision);
        if (!measurement.active && measurement.energy) {
          current.history.push(measurement.energy);
          if (current.history.length > 64) current.history.shift();
        }
        publishJob(measurement);
      } else if (stage >= 4 && (!current.paused || current.singleStep) && !measurement?.active) {
        if (tickPhysics(current) && measurement) publishJob(null);
      }
      publish();
      if (!disposed) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
    };
  }, [active, publish, publishJob, stage]);
  useEffect(() => {
    const epoch = requestEpoch;
    mounted.current = true;
    const hidden = () => {
      if (document.hidden) stop();
    };
    window.addEventListener("blur", stop);
    document.addEventListener("visibilitychange", hidden);
    return () => {
      mounted.current = false;
      epoch.current++;
      window.removeEventListener("blur", stop);
      document.removeEventListener("visibilitychange", hidden);
      release();
      model.current.physics = null;
      if (jobRef.current) jobRef.current.active = false;
    };
  }, [stop, release]);
  const { bodies, selected, theta, epsilon, tree } = scene;
  const force = useMemo(
    () => selectedForce({ bodies, selected, theta, epsilon, tree }),
    [bodies, selected, theta, epsilon, tree],
  );
  useEffect(() => {
    const context = canvasRef.current?.getContext("2d");
    if (context) {
      setupCanvas(context, size);
      drawGalaxy(context, size.width, size.height, scene, force);
    }
  }, [size, scene, force]);
  const applyGesture = useCallback(
    (event: PointerEvent<HTMLCanvasElement>) => {
      const active = gesture.current;
      if (
        !active ||
        active.id !== event.pointerId ||
        !Number.isFinite(event.clientX) ||
        !Number.isFinite(event.clientY)
      )
        return;
      const rect = event.currentTarget.getBoundingClientRect(),
        x = event.clientX - rect.left,
        y = event.clientY - rect.top;
      const camera = model.current.camera,
        dx = x - active.x,
        dy = y - active.y;
      if (tool === "orbit") {
        camera.yaw += dx * 0.006;
        camera.pitch = Math.max(-1.4, Math.min(1.4, camera.pitch + dy * 0.006));
      } else {
        camera.x -= (dx * camera.distance) / size.height;
        camera.y += (dy * camera.distance) / size.height;
      }
      active.x = x;
      active.y = y;
      publish();
    },
    [publish, size.height, tool],
  );
  const down = (event: PointerEvent<HTMLCanvasElement>) => {
    if (
      !event.isPrimary ||
      event.button !== 0 ||
      gesture.current ||
      !Number.isFinite(event.clientX) ||
      !Number.isFinite(event.clientY)
    )
      return;
    const rect = event.currentTarget.getBoundingClientRect(),
      x = event.clientX - rect.left,
      y = event.clientY - rect.top;
    event.currentTarget.focus();
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      return;
    }
    gesture.current = {
      id: event.pointerId,
      x,
      y,
      startX: x,
      startY: y,
      before: { ...model.current.camera },
    };
  };
  const up = (event: PointerEvent<HTMLCanvasElement>) => {
    const active = gesture.current;
    if (!active || active.id !== event.pointerId || event.button !== 0) return;
    applyGesture(event);
    if (Math.hypot(active.x - active.startX, active.y - active.startY) < 3 && stage >= 2)
      act("selected", pickGalaxy(model.current, active.x, active.y, size.width, size.height));
    release();
  };
  const key = (event: KeyboardEvent<HTMLCanvasElement>) => {
    if (event.ctrlKey || event.metaKey || event.altKey || event.key === "Tab" || event.repeat)
      return;
    const current = model.current,
      k = event.key.toLowerCase();
    if (k === "escape") {
      release(true);
      act("cancel");
      publish();
    } else if (k === "r") act("reset");
    else if (k === "home") act("camera");
    else if (k === "arrowleft" || k === "arrowright") {
      current.camera.yaw += k === "arrowleft" ? -0.08 : 0.08;
      publish();
    } else if (k === "arrowup" || k === "arrowdown") {
      current.camera.pitch = Math.max(
        -1.4,
        Math.min(1.4, current.camera.pitch + (k === "arrowup" ? -0.08 : 0.08)),
      );
      publish();
    } else if (k === "q" || k === "z") {
      current.camera.distance = Math.max(
        0.3,
        Math.min(30, current.camera.distance * (k === "q" ? 1.1 : 1 / 1.1)),
      );
      publish();
    } else if (stage >= 4 && k === " ") act("run");
    else if (stage >= 4 && k === "n") act("step");
    else if (stage >= 6 && (k === "[" || k === "]"))
      act("theta", current.theta + (k === "[" ? -0.05 : 0.05));
    else if (stage >= 5 && k === "f") act("debug");
    else if (stage >= 8 && k === "t") act("sweep");
    else if (stage >= 9 && k === "b") act("runtime");
    else if (stage >= 10 && k === "e") act("energy");
    else if (stage >= 10 && k === "i") act("dtStudy");
    else return;
    event.preventDefault();
  };
  const lastEnergy = scene.history.at(-1);
  return (
    <div className="lab-body">
      <Suspense fallback={<p role="status">Đang tải điều khiển thiên hà…</p>}>
        <GalaxyControls
          scene={scene}
          job={job}
          loading={loadingJob}
          reduced={reduced}
          tool={tool}
          setTool={setTool}
          act={act}
        />
      </Suspense>
      <canvas
        ref={canvasRef}
        className="lab-canvas"
        role="img"
        aria-label="Thiên hà N-body 3D bằng Barnes–Hut"
        aria-describedby={helpId}
        tabIndex={0}
        style={{ height: "clamp(400px,55vw,560px)", touchAction: "none" }}
        onPointerDown={down}
        onPointerMove={(event) => {
          if (gesture.current?.id === event.pointerId) {
            if ((event.buttons & 1) === 0) release();
            else applyGesture(event);
          }
        }}
        onPointerUp={up}
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
        onKeyDown={key}
      />
      <p id={helpId}>
        Kéo để đổi góc nhìn, chọn Pan để dịch camera; nhấp gần một body để theo dõi. Phím mũi tên
        xoay, Q/Z zoom, Home đặt lại camera, R đặt lại preset.{" "}
        {stage >= 4 && "Space chạy/dừng, N tiến đúng một bước."}{" "}
        {stage >= 8 && "T đo theta; Escape hủy tác vụ."} Tab rời Canvas. Camera không đổi state vật
        lý.
      </p>
      <p>
        Màu xanh → cam: tốc độ 0 → 1,5 length/time unit; hồng: central body; vàng: target. Vẽ mọi
        body trong viewport, không lấy mẫu mô phỏng. Trails chỉ theo dõi 24 body, giữ 64 snapshot.
      </p>
      <LabReadout
        items={[
          {
            label: "N / step / thời gian mô phỏng",
            value: scene.bodies.length + " / " + scene.steps + " / " + scene.time.toFixed(5),
          },
          {
            label: "Preset / seed / không gian",
            value: scene.preset + " / 0x31c0ffee / XYZ 3D · G=0,001",
          },
          {
            label: "Trạng thái / physics progress",
            value:
              (scene.paused ? "Tạm dừng" : "Đang chạy") +
              " · " +
              (scene.physics
                ? scene.physics.target + "/" + scene.bodies.length
                : "không có bước dở dang"),
          },
          ...(stage === 2
            ? [
                {
                  label: "Pair acceleration từ body 0",
                  value:
                    "(" +
                    force.pair.x.toExponential(6) +
                    ", " +
                    force.pair.y.toExponential(6) +
                    ", " +
                    force.pair.z.toExponential(6) +
                    ") · norm=" +
                    vectorLength(force.pair).toExponential(6),
                },
              ]
            : []),
          ...(stage >= 3
            ? [
                {
                  label: "Direct acceleration của target " + scene.selected,
                  value:
                    "(" +
                    force.exact.acceleration.x.toExponential(3) +
                    ", " +
                    force.exact.acceleration.y.toExponential(3) +
                    ", " +
                    force.exact.acceleration.z.toExponential(3) +
                    ") · " +
                    force.exact.exactInteractions +
                    " sources",
                },
              ]
            : []),
          ...(stage >= 5
            ? [
                {
                  label: "Mass Octree / root mass",
                  value:
                    scene.tree.nodes.length +
                    " nodes · M=" +
                    scene.tree.nodes[0].totalMass.toFixed(5),
                },
              ]
            : []),
          ...(stage >= 6
            ? [
                {
                  label: "BH / sai số lực tại body đang theo dõi",
                  value:
                    "(" +
                    force.approximate.acceleration.x.toExponential(3) +
                    ", " +
                    force.approximate.acceleration.y.toExponential(3) +
                    ", " +
                    force.approximate.acceleration.z.toExponential(3) +
                    ") · |aBH|=" +
                    vectorLength(force.approximate.acceleration).toExponential(3) +
                    " · absolute=" +
                    force.absolute.toExponential(3) +
                    " · relative=" +
                    force.relative.toExponential(3),
                },
                {
                  label: "Visited / accepted / exact sources",
                  value:
                    force.approximate.visitedNodes +
                    " / " +
                    force.approximate.approximatedNodes +
                    " / " +
                    force.approximate.exactInteractions,
                },
              ]
            : []),
          ...(stage >= 10
            ? [
                {
                  label: "Năng lượng toàn hệ / momentum",
                  value: lastEnergy
                    ? "N=" +
                      lastEnergy.count +
                      " E=" +
                      lastEnergy.energy.toExponential(5) +
                      " |P|=" +
                      vectorLength(lastEnergy.momentum).toExponential(3) +
                      " tại t=" +
                      lastEnergy.time.toFixed(5)
                    : "Chưa đo. Bấm Đo năng lượng toàn hệ trước khi chạy để lấy mốc t=0.",
                },
              ]
            : []),
        ]}
      />
      <p>
        {scene.notice} Physics tiến theo fixed dt, có thể chậm hơn thời gian thực; không chạy vòng
        bù lag vô hạn.{" "}
        {reduced &&
          "Reduced motion: không tự chạy liên tục; các bước và phép đo hữu hạn vẫn dùng được."}
      </p>
      {scene.debug && stage >= 6 && (
        <p>
          Debug theo đúng traversal target: xanh = opened, vàng = accepted aggregate; tối đa 512 hộp
          mỗi loại. Không vẽ hộp của node khác rồi gọi đó là quyết định của target.
        </p>
      )}
      {scene.history.length > 0 && (
        <table>
          <caption>
            Diagnostics đầy đủ N tại từng snapshot; giới hạn 64 mẫu. Lực xấp xỉ và integrator đều có
            thể gây drift.
          </caption>
          <thead>
            <tr>
              <th>t</th>
              <th>E</th>
              <th>|P|</th>
              <th>COM (x,y,z)</th>
            </tr>
          </thead>
          <tbody>
            {scene.history.map((sample, i) => (
              <tr key={i}>
                <td>{sample.time.toFixed(5)}</td>
                <td>{sample.energy.toExponential(5)}</td>
                <td>{vectorLength(sample.momentum).toExponential(3)}</td>
                <td>
                  {sample.center.x.toFixed(4)}, {sample.center.y.toFixed(4)},{" "}
                  {sample.center.z.toFixed(4)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {job && (
        <Suspense fallback={<p>Đang tải bảng kiểm chứng…</p>}>
          <GalaxyResults job={job} />
        </Suspense>
      )}
    </div>
  );
}
