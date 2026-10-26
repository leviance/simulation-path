import {
  buildMassOctree,
  directAcceleration,
  barnesHutAcceleration,
  systemDiagnostics,
  stepBodiesSymplecticEuler,
  type Body3D,
  type Vec3,
  type BarnesHutTree,
} from "../barnes-hut-nbody.ts";
import {
  gravity,
  presetBodies,
  vectorLength,
  type GalaxyScene,
  type EnergySample,
} from "./scene.ts";

export interface SweepRow {
  theta: number;
  absolute: number;
  normalized: number;
  meanRelative: number;
  maximumRelative: number;
  work: number;
  visited: number;
}
export interface RuntimeRow {
  count: number;
  direct: number;
  directMin: number;
  directMax: number;
  tree: number;
  treeMin: number;
  treeMax: number;
  build: number;
  directWork: number;
  treeWork: number;
  checksum: number;
}
export interface TimestepRow {
  dt: number;
  error: number;
  energyDrift: number;
}
export interface GalaxyJob {
  kind: "sweep" | "energy" | "runtime" | "dt";
  active: boolean;
  paused: boolean;
  revision: number;
  time: number;
  deadline: number;
  notice: string;
  bodies: Body3D[];
  tree: BarnesHutTree;
  epsilon: number;
  theta: number;
  target: number;
  pass: number;
  method: number;
  sizeIndex: number;
  work: number;
  milliseconds: number;
  checksum: number;
  build: number;
  targets: number[];
  reference: Vec3[];
  squaredError: number;
  squaredReference: number;
  relativeSum: number;
  relativeMaximum: number;
  visited: number;
  sweeps: SweepRow[];
  runtime: RuntimeRow[];
  directTimes: number[];
  treeTimes: number[];
  directWork: number;
  potential: number;
  energy?: EnergySample;
  timestep: TimestepRow[];
}
export function startGalaxyJob(
  scene: GalaxyScene,
  kind: GalaxyJob["kind"],
  now = performance.now(),
): GalaxyJob {
  scene.paused = true;
  scene.physics = null;
  scene.singleStep = false;
  const job: GalaxyJob = {
    kind,
    active: true,
    paused: false,
    revision: scene.revision,
    time: scene.time,
    deadline: now + 30000,
    notice:
      kind === "runtime"
        ? "Đang đo Direct và Barnes–Hut trên các bộ dữ liệu được tạo lại từ cùng seed."
        : kind === "dt"
          ? "Đang so sánh ba bước thời gian trên bài toán hai vật có nghiệm đối chiếu."
          : "Đang tính trên snapshot cố định; có thể tạm dừng hoặc hủy.",
    bodies: scene.bodies,
    tree: scene.tree,
    epsilon: scene.epsilon,
    theta: scene.theta,
    target: 0,
    pass: 0,
    method: 0,
    sizeIndex: 0,
    work: 0,
    milliseconds: 0,
    checksum: 0,
    build: 0,
    targets: [],
    reference: [],
    squaredError: 0,
    squaredReference: 0,
    relativeSum: 0,
    relativeMaximum: 0,
    visited: 0,
    sweeps: [],
    runtime: [],
    directTimes: [],
    treeTimes: [],
    directWork: 0,
    potential: 0,
    timestep: [],
  };
  const candidates = [
    scene.selected,
    ...Array.from({ length: 32 }, (_, i) => Math.floor((i * scene.bodies.length) / 32)),
  ];
  job.targets = [...new Set(candidates)].slice(0, Math.min(32, scene.bodies.length));
  if (kind === "runtime") prepareRuntime(job, () => performance.now());
  return job;
}
function prepareRuntime(job: GalaxyJob, clock: () => number) {
  job.bodies = presetBodies(0, [256, 512, 1024][job.sizeIndex]);
  const started = clock();
  job.tree = buildMassOctree(job.bodies);
  job.build = clock() - started;
  job.pass = 0;
  job.method = 0;
  job.target = 0;
  job.milliseconds = 0;
  job.work = 0;
  job.checksum = 0;
  job.directTimes = [];
  job.treeTimes = [];
}
function sweepUnit(job: GalaxyJob) {
  const angles = [0.25, 0.5, 0.8, 1.1],
    id = job.targets[job.target];
  if (job.pass === 0)
    job.reference[job.target] = directAcceleration(
      job.bodies,
      id,
      gravity,
      job.epsilon,
    ).acceleration;
  const exact = job.reference[job.target],
    approximate = barnesHutAcceleration(
      job.tree,
      job.bodies,
      id,
      angles[job.pass],
      gravity,
      job.epsilon,
    );
  const difference = Math.hypot(
      approximate.acceleration.x - exact.x,
      approximate.acceleration.y - exact.y,
      approximate.acceleration.z - exact.z,
    ),
    reference = vectorLength(exact),
    relative = difference / Math.max(reference, 1e-12);
  job.squaredError += difference ** 2;
  job.squaredReference += reference ** 2;
  job.relativeSum += relative;
  job.relativeMaximum = Math.max(job.relativeMaximum, relative);
  job.work += approximate.exactInteractions + approximate.approximatedNodes;
  job.visited += approximate.visitedNodes;
  if (++job.target === job.targets.length) {
    const count = job.targets.length;
    job.sweeps.push({
      theta: angles[job.pass],
      absolute: Math.sqrt(job.squaredError / count),
      normalized: Math.sqrt(job.squaredError / Math.max(job.squaredReference, count * 1e-24)),
      meanRelative: job.relativeSum / count,
      maximumRelative: job.relativeMaximum,
      work: job.work,
      visited: job.visited,
    });
    job.target = 0;
    job.pass++;
    job.squaredError = 0;
    job.squaredReference = 0;
    job.relativeSum = 0;
    job.relativeMaximum = 0;
    job.work = 0;
    job.visited = 0;
    job.active = job.pass < 4;
  }
}
function energyUnit(job: GalaxyJob) {
  const a = job.bodies[job.target];
  for (let second = job.target + 1; second < job.bodies.length; second++) {
    const b = job.bodies[second],
      r2 =
        (a.position.x - b.position.x) ** 2 +
        (a.position.y - b.position.y) ** 2 +
        (a.position.z - b.position.z) ** 2;
    job.potential -= (gravity * a.mass * b.mass) / Math.sqrt(r2 + job.epsilon ** 2);
  }
  if (++job.target === job.bodies.length) {
    let kinetic = 0,
      mass = 0;
    const momentum = { x: 0, y: 0, z: 0 },
      center = { x: 0, y: 0, z: 0 };
    for (const body of job.bodies) {
      mass += body.mass;
      kinetic += 0.5 * body.mass * vectorLength(body.velocity) ** 2;
      for (const axis of ["x", "y", "z"] as const) {
        momentum[axis] += body.mass * body.velocity[axis];
        center[axis] += body.mass * body.position[axis];
      }
    }
    for (const axis of ["x", "y", "z"] as const) center[axis] /= mass;
    job.energy = {
      time: job.time,
      energy: kinetic + job.potential,
      momentum,
      center,
      count: job.bodies.length,
    };
    job.active = false;
  }
}
function runtimeUnit(job: GalaxyJob, clock: () => number) {
  const started = clock(),
    result =
      job.method === 0
        ? directAcceleration(job.bodies, job.target, gravity, job.epsilon)
        : barnesHutAcceleration(job.tree, job.bodies, job.target, job.theta, gravity, job.epsilon);
  job.milliseconds += clock() - started;
  job.checksum += result.acceleration.x + result.acceleration.y + result.acceleration.z;
  job.work += result.exactInteractions + result.approximatedNodes;
  if (++job.target < job.bodies.length) return;
  if (job.pass > 0) (job.method === 0 ? job.directTimes : job.treeTimes).push(job.milliseconds);
  if (job.method === 0) job.directWork = job.work;
  if (++job.method === 2) {
    job.method = 0;
    job.pass++;
  }
  if (job.pass === 6) {
    const direct = job.directTimes.sort((a, b) => a - b),
      tree = job.treeTimes.sort((a, b) => a - b);
    job.runtime.push({
      count: job.bodies.length,
      direct: direct[2],
      directMin: direct[0],
      directMax: direct[4],
      tree: tree[2],
      treeMin: tree[0],
      treeMax: tree[4],
      build: job.build,
      directWork: job.directWork,
      treeWork: job.work,
      checksum: job.checksum,
    });
    if (++job.sizeIndex === 3) {
      job.active = false;
      return;
    }
    prepareRuntime(job, clock);
  }
  job.target = 0;
  job.milliseconds = 0;
  job.checksum = 0;
  job.work = 0;
}
export function timestepRow(count: number): TimestepRow {
  const initial = presetBodies(2, 2),
    omega = Math.abs(initial[0].velocity.y),
    initialEnergy = systemDiagnostics(initial, gravity, 0.02).totalEnergy;
  let bodies = initial;
  for (let step = 0; step < count; step++)
    bodies = stepBodiesSymplecticEuler(bodies, 1 / count, 0.5, gravity, 0.02, true);
  return {
    dt: 1 / count,
    error: Math.hypot(
      bodies[0].position.x + Math.cos(omega),
      bodies[0].position.y + Math.sin(omega),
      bodies[0].position.z,
    ),
    energyDrift:
      (systemDiagnostics(bodies, gravity, 0.02).totalEnergy - initialEnergy) /
      Math.abs(initialEnergy),
  };
}
export function tickGalaxyJob(
  job: GalaxyJob,
  revision: number,
  clock = () => performance.now(),
  budget = 6,
) {
  if (!job.active || job.paused) return;
  if (job.revision !== revision) {
    job.active = false;
    job.notice = "Đã bỏ kết quả vì snapshot thay đổi.";
    return;
  }
  const until = clock() + budget;
  do {
    if (clock() > job.deadline) {
      job.active = false;
      job.notice = "Đã dừng ở giới hạn 30 giây; bảng hiện tại chưa phải kết quả hoàn tất.";
      return;
    }
    if (job.kind === "sweep") sweepUnit(job);
    else if (job.kind === "energy") energyUnit(job);
    else if (job.kind === "runtime") runtimeUnit(job, clock);
    else {
      job.timestep.push(timestepRow([60, 120, 240][job.pass++]));
      job.active = job.pass < 3;
    }
  } while (job.active && clock() < until);
  if (!job.active)
    job.notice =
      job.kind === "runtime"
        ? "Đã đo đủ ba quy mô. Thời gian chỉ phản ánh lần chạy này, không chứng minh solver luôn nhanh hơn."
        : job.kind === "dt"
          ? "Đã so sánh đủ ba dt tại cùng thời điểm T=1."
          : "Đã tính xong trên snapshot đã ghi.";
}
