import {
  defaultConfig,
  fixedDt,
  makeParticlesAoS,
  makeEmptySoA,
  readParticle,
  writeParticle,
  planEmission,
  updateAoSRange,
  updateSoARange,
  type FountainConfig,
  type Layout,
  type ParticleAoS,
  type ParticlesSoA,
} from "./state.ts";

export interface Camera {
  yaw: number;
  pitch: number;
  distance: number;
  x: number;
  y: number;
  z: number;
}
interface Pending {
  kind: "physics" | "conversion";
  cursor: number;
  active: number;
  remainder: number;
  aos: ParticleAoS[];
  soa: ParticlesSoA;
  updated: number;
  respawned: number;
  copyMs: number;
  kernelMs: number;
  started: number;
  deadline: number;
}
export interface FountainScene {
  stage: number;
  preset: number;
  config: FountainConfig;
  count: number;
  active: number;
  layout: Layout;
  aos: ParticleAoS[];
  soa: ParticlesSoA;
  time: number;
  steps: number;
  revision: number;
  emissionRemainder: number;
  committedUpdated: number;
  born: number;
  respawned: number;
  copyMs: number;
  kernelMs: number;
  conversionMs: number;
  stepWallMs: number;
  paused: boolean;
  singleStep: boolean;
  jobPaused: boolean;
  pending: Pending | null;
  camera: Camera;
  selected: number;
  notice: string;
}
export const modes = [
  "layout-scene",
  "aos-layout",
  "aos-baseline",
  "soa-layout",
  "layout-agreement",
  "cache-lines",
  "layout-benchmark",
  "layout-validation",
] as const;
export function createFountain(
  stage = 8,
  preset = stage >= 8 ? 2 : stage >= 3 ? 1 : stage === 2 ? 0 : 3,
  settings: Partial<FountainConfig> = {},
): FountainScene {
  const count = [256, 2000, 20000, 256][preset];
  if (count === undefined) throw new Error("Unknown fountain preset");
  const cold = preset === 0;
  const config = { ...defaultConfig(), emissionRate: count * 0.5, ...settings };
  return {
    stage,
    preset,
    count,
    config,
    active: cold ? 0 : count,
    layout: "aos",
    aos: makeParticlesAoS(count, config, !cold),
    soa: makeEmptySoA(0),
    time: 0,
    steps: 0,
    revision: 0,
    emissionRemainder: 0,
    committedUpdated: 0,
    born: 0,
    respawned: 0,
    copyMs: 0,
    kernelMs: 0,
    conversionMs: 0,
    stepWallMs: 0,
    paused: true,
    singleStep: false,
    jobPaused: false,
    pending: null,
    camera: { yaw: 0.45, pitch: -0.38, distance: 14, x: 0, y: 1.9, z: 0 },
    selected: 0,
    notice: cold
      ? "Phát hạt từ pool trống; slot đã sinh sẽ được tái sử dụng."
      : "Khởi tạo warm: mọi slot đều sống. Chưa tiến thời gian.",
  };
}
export function particleAt(scene: FountainScene, index: number) {
  return scene.layout === "aos" ? scene.aos[index] : readParticle(scene.soa, index);
}
export function cancelPending(scene: FountainScene) {
  scene.pending = null;
  scene.paused = true;
  scene.singleStep = false;
  scene.jobPaused = false;
  scene.notice = "Đã hủy phần việc dở dang; giữ nguyên snapshot đã hoàn tất.";
}
export function beginPhysics(scene: FountainScene, now = performance.now()) {
  if (scene.stage < 2 || scene.pending) return false;
  if (scene.stage < 5 && scene.layout === "soa") {
    scene.paused = true;
    scene.singleStep = false;
    scene.notice = "Bài 04 mới chuyển dữ liệu. Chọn AoS để chạy; kernel SoA ở Bài 05.";
    return false;
  }
  const plan = planEmission(scene.active, scene.count, scene.emissionRemainder, scene.config);
  scene.pending = {
    kind: "physics",
    cursor: 0,
    active: plan.active,
    remainder: plan.remainder,
    aos: scene.layout === "aos" ? new Array<ParticleAoS>(scene.count) : [],
    soa: makeEmptySoA(scene.layout === "soa" ? scene.count : 0),
    updated: 0,
    respawned: 0,
    copyMs: 0,
    kernelMs: 0,
    started: now,
    deadline: now + 15000,
  };
  return true;
}
export function beginConversion(scene: FountainScene, now = performance.now()) {
  if (scene.stage < 4) return false;
  cancelPending(scene);
  scene.pending = {
    kind: "conversion",
    cursor: 0,
    active: scene.active,
    remainder: scene.emissionRemainder,
    aos: scene.layout === "soa" ? new Array<ParticleAoS>(scene.count) : [],
    soa: makeEmptySoA(scene.layout === "aos" ? scene.count : 0),
    updated: 0,
    respawned: 0,
    copyMs: 0,
    kernelMs: 0,
    started: now,
    deadline: now + 15000,
  };
  return true;
}
export function tickPending(scene: FountainScene, clock = () => performance.now(), budget = 5) {
  const pending = scene.pending;
  if (!pending) return false;
  if (clock() > pending.deadline) {
    cancelPending(scene);
    scene.notice = "Đã dừng ở giới hạn 15 giây; không commit bước đang dở.";
    return false;
  }
  if (scene.jobPaused || (pending.kind === "physics" && scene.paused && !scene.singleStep))
    return false;
  const until = clock() + budget;
  do {
    if (clock() > pending.deadline) {
      cancelPending(scene);
      scene.notice = "Đã dừng ở giới hạn 15 giây; không commit bước đang dở.";
      return false;
    }
    const end = Math.min(scene.count, pending.cursor + 512);
    const beforeCopy = clock();
    for (let index = pending.cursor; index < end; index++) {
      const particle = particleAt(scene, index);
      if (
        (pending.kind === "physics" && scene.layout === "aos") ||
        (pending.kind === "conversion" && scene.layout === "soa")
      )
        pending.aos[index] = { ...particle };
      else writeParticle(pending.soa, index, particle);
    }
    pending.copyMs += clock() - beforeCopy;
    if (pending.kind === "physics") {
      const updateEnd = Math.min(end, pending.active);
      if (pending.cursor < updateEnd) {
        const beforeUpdate = clock();
        if (scene.layout === "aos")
          pending.respawned += updateAoSRange(
            pending.aos,
            pending.cursor,
            updateEnd,
            scene.config,
            "full-lifecycle",
            scene.active,
          );
        else
          pending.respawned += updateSoARange(
            pending.soa,
            pending.cursor,
            updateEnd,
            scene.config,
            "full-lifecycle",
            scene.active,
          );
        pending.kernelMs += clock() - beforeUpdate;
        pending.updated += updateEnd - pending.cursor;
      }
    }
    pending.cursor = end;
  } while (pending.cursor < scene.count && clock() < until);
  if (pending.cursor < scene.count) return false;
  if (pending.kind === "conversion") {
    scene.layout = scene.layout === "aos" ? "soa" : "aos";
    if (scene.layout === "aos") scene.aos = pending.aos;
    else scene.soa = pending.soa;
    scene.conversionMs = pending.copyMs;
    scene.notice = "Đã đổi layout, giữ nguyên ID, generation, field, thời gian và emission carry.";
  } else {
    if (scene.layout === "aos") scene.aos = pending.aos;
    else scene.soa = pending.soa;
    scene.born = pending.active - scene.active;
    scene.active = pending.active;
    scene.emissionRemainder = pending.remainder;
    scene.steps++;
    scene.time += fixedDt;
    scene.committedUpdated = pending.updated;
    scene.respawned = pending.respawned;
    scene.copyMs = pending.copyMs;
    scene.kernelMs = pending.kernelMs;
    scene.stepWallMs = clock() - pending.started;
    scene.singleStep = false;
    scene.notice = "Đã cập nhật đủ " + pending.updated + " hạt sống và commit cả bước.";
  }
  scene.pending = null;
  scene.revision++;
  return true;
}
