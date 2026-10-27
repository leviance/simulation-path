import {
  createGalaxy,
  invalidateExperiment,
  cancelPhysics,
  validateGalaxy,
  type GalaxyScene,
} from "../../lib/labs/galaxy/scene.ts";
import { dollyGalaxyCamera } from "../../lib/labs/galaxy/projection.ts";
import type { GalaxyJob } from "@/lib/labs/galaxy/jobs";
import type { GalaxyAction } from "./galaxy-controls";

export interface GalaxyActionContext {
  model: { current: GalaxyScene };
  jobRef: { current: GalaxyJob | null };
  requestEpoch: { current: number };
  setLoadingJob: (value: boolean) => void;
  publishJob: (value: GalaxyJob | null) => void;
  publish: () => void;
  release: () => void;
  reduced: boolean;
  stage: number;
  startMeasurement: (kind: GalaxyJob["kind"]) => Promise<void>;
}

export function disposeGalaxy(
  model: { current: GalaxyScene },
  jobRef: { current: GalaxyJob | null },
) {
  cancelPhysics(model.current);
  if (jobRef.current) jobRef.current.active = false;
}

export function performGalaxyAction(
  action: GalaxyAction,
  value: number,
  context: GalaxyActionContext,
) {
  const {
    model,
    jobRef,
    requestEpoch,
    setLoadingJob,
    publishJob,
    publish,
    release,
    reduced,
    stage,
    startMeasurement,
  } = context;

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
    current.camera = { yaw: 0.15, pitch: -0.85, distance: 2.6, x: 0, y: 0 };
    publish();
    return;
  }
  if (action === "debug") {
    current.debug = !current.debug;
    publish();
    return;
  }
  if (action === "zoomIn" || action === "zoomOut") {
    release();
    dollyGalaxyCamera(current.camera, action === "zoomIn" ? 1 : -1);
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
}
