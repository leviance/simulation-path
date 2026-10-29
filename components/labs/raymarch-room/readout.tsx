import {
  makeCameraRay,
  cameraForward,
  cameraRight,
  cameraUp,
  add,
  scale,
  normalize,
  length,
  type Vec3,
} from "@/lib/labs/raymarch-room/geometry";
import { SPHERE_CENTER, SPHERE_ONLY, sdSphere } from "@/lib/labs/raymarch-room/scene";
import { traceRay, marchRay, estimateNormal } from "@/lib/labs/raymarch-room/tracing";
import {
  intersectSphere,
  tangentDistanceBound,
  normalAngularError,
} from "@/lib/labs/raymarch-room/oracle";
import { sampleSize } from "@/lib/labs/raymarch-room/image";
import { inspectionRay, type RoomSession } from "@/lib/labs/raymarch-room/session";
import type { CanvasSize } from "../lab-shared";
const vec = (p: Vec3) => `(${p.x.toFixed(3)}, ${p.y.toFixed(3)}, ${p.z.toFixed(3)})`;
export function RoomReadout({
  state: s,
  size,
  capturing,
}: {
  state: RoomSession;
  size: CanvasSize;
  capturing: boolean;
}) {
  const ray = makeCameraRay(
    s.camera,
    s.selectedPixel.x * size.width - 0.5,
    s.selectedPixel.y * size.height - 0.5,
    size.width,
    size.height,
  );
  const result = marchRay(ray, s.settings, s.scene);
  const rows: { label: string; value: string }[] = [];
  if (s.stage === 1) {
    const width = Math.round(size.width * size.dpr),
      height = Math.round(size.height * size.dpr);
    const x = Math.min(width - 1, Math.floor(s.selectedPixel.x * width)) + 0.5,
      y = height - (Math.min(height - 1, Math.floor(s.selectedPixel.y * height)) + 0.5);
    rows.push({
      label: "Fragment / UV / NDC",
      value: `(${x.toFixed(1)}, ${y.toFixed(1)})px · UV (${(x / width).toFixed(3)}, ${(y / height).toFixed(3)}) · NDC (${((2 * x) / width - 1).toFixed(3)}, ${((2 * y) / height - 1).toFixed(3)})`,
    });
  }
  if (s.stage === 2)
    rows.push({
      label: "Basis forward / right / up",
      value: `${vec(cameraForward(s.camera))} / ${vec(cameraRight(s.camera))} / ${vec(cameraUp(s.camera))}`,
    });
  if (s.stage === 3)
    rows.push({
      label: "Sphere signed distance",
      value: `${sdSphere(s.samplePoint, SPHERE_CENTER, s.scene.sphereRadius).toFixed(6)}m · điểm ${vec(s.samplePoint)} · z cố định 0.15m`,
    });
  if (s.stage === 4) {
    const traced = traceRay(inspectionRay(s), s.settings, {
      ...SPHERE_ONLY,
      sphereRadius: s.scene.sphereRadius,
    });
    const shown = traced.trace.slice(0, s.traceVisible),
      last = shown.at(-1);
    rows.push({
      label: "Mẫu đang xem",
      value: last
        ? `${last.step} · SDF ${last.distance.toFixed(6)}m · traveled ${last.traveled.toFixed(6)}m`
        : "Chưa sample; nhấn Một mẫu hoặc N.",
    });
    rows.push({
      label: "Stop reason",
      value:
        shown.length === traced.trace.length
          ? traced.result.status
          : "Chưa đọc hết các mẫu; không kết luận hit.",
    });
  }
  if (s.stage >= 5)
    rows.push({
      label: "Tia được chọn: status / material / t",
      value: `${result.status} · ID ${result.materialId} · ${result.traveled.toFixed(6)}m · ${result.steps}/${s.settings.maximumSteps} primary samples`,
    });
  if (s.stage >= 5 && result.hit)
    rows.push({
      label: "Normal tại điểm chạm",
      value: vec(estimateNormal(result.position, s.scene, s.settings.normalEpsilon)),
    });
  if (s.stage === 2 || s.stage >= 9)
    rows.push({
      label: "Camera position / hướng tia chọn",
      value: `${vec(s.camera.position)} · ${vec(ray.direction)} · |dir| ${length(ray.direction).toFixed(6)}`,
    });
  if (s.stage >= 10) {
    const testRay = inspectionRay(s),
      scene = { ...SPHERE_ONLY, sphereRadius: s.scene.sphereRadius };
    const exact = intersectSphere(testRay, SPHERE_CENTER, scene.sphereRadius),
      measured = marchRay(testRay, s.settings, scene);
    rows.push({
      label: "Oracle riêng: sphere-only",
      value: `analytic ${exact.hit ? exact.distance.toFixed(6) + "m" : "miss"} · march ${measured.status}, t=${measured.traveled.toFixed(6)}m`,
    });
    rows.push({
      label: "Sai số dọc tia / bound tiếp tuyến",
      value: `${exact.hit && measured.hit ? Math.abs(exact.distance - measured.traveled).toFixed(6) + "m" : "không có hai hit để đo Δt"} · sqrt bound ${tangentDistanceBound(scene.sphereRadius, s.settings.hitEpsilon).toFixed(6)}m`,
    });
    const surface = add(
      SPHERE_CENTER,
      scale(normalize({ x: 0.3, y: 0.4, z: 0.5 }), scene.sphereRadius),
    );
    const error = normalAngularError(
      estimateNormal(surface, scene, s.settings.normalEpsilon),
      surface,
      SPHERE_CENTER,
    );
    rows.push({
      label: "Sai số normal sphere (điểm chuẩn riêng)",
      value: `${error.toExponential(4)}rad · normal epsilon ${s.settings.normalEpsilon}m`,
    });
  }
  if (s.stage >= 8)
    rows.push({
      label: "Clock đèn / Pause",
      value: `${s.elapsedSeconds.toFixed(2)}s · ${s.paused ? "đang dừng" : "đang chạy"} · camera/input không bị khóa`,
    });
  const samples = sampleSize(size.width, size.height);
  rows.push({
    label: "Ngân sách / pointer",
    value: `${samples.width}×${samples.height} camera samples (tối đa 6.144); ≤256 primary + 64 shadow; ${capturing ? "đang capture" : "đã nhả"}. Canvas 2D, không phải GPU benchmark.`,
  });
  return (
    <dl className="lab-readout" aria-live={s.paused ? "polite" : "off"}>
      {rows.map((r) => (
        <div key={r.label}>
          <dt>{r.label}</dt>
          <dd>{r.value}</dd>
        </div>
      ))}
    </dl>
  );
}
