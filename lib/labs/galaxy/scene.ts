import {
  makeGalaxyBodies,
  buildMassOctree,
  barnesHutAcceleration,
  directAcceleration,
  allFiniteBodies,
  inspectMassOctree,
  softenedAcceleration,
  type Body3D,
  type BarnesHutTree,
  type Vec3,
} from "../barnes-hut-nbody.ts";

export const seed = 0x31c0ffee;
export const gravity = 0.001;
export const modes = [
  "nbody-scene",
  "nbody-pair-force",
  "nbody-direct",
  "nbody-fixed-step",
  "nbody-mass-tree",
  "nbody-opening",
  "nbody-self-force",
  "nbody-accuracy",
  "nbody-scaling",
  "nbody-validation",
] as const;
export interface Camera {
  yaw: number;
  pitch: number;
  distance: number;
  x: number;
  y: number;
}
export interface PhysicsTask {
  target: number;
  acceleration: Vec3[];
  deadline: number;
}
export interface EnergySample {
  time: number;
  energy: number;
  momentum: Vec3;
  center: Vec3;
  count: number;
}
export interface GalaxyScene {
  stage: number;
  preset: number;
  bodies: Body3D[];
  tree: BarnesHutTree;
  camera: Camera;
  theta: number;
  epsilon: number;
  dt: number;
  direct: boolean;
  selected: number;
  paused: boolean;
  steps: number;
  time: number;
  revision: number;
  physics: PhysicsTask | null;
  singleStep: boolean;
  trails: Vec3[][];
  history: EnergySample[];
  notice: string;
  debug: boolean;
}
export const vectorLength = (p: Vec3) => Math.hypot(p.x, p.y, p.z);
export function presetBodies(preset: number, count: number): Body3D[] {
  if (preset === 2) {
    const omega = Math.sqrt((2 * gravity) / (4 + 0.02 ** 2) ** 1.5);
    return [
      { position: { x: -1, y: 0, z: 0 }, velocity: { x: 0, y: -omega, z: 0 }, mass: 1 },
      { position: { x: 1, y: 0, z: 0 }, velocity: { x: 0, y: omega, z: 0 }, mass: 1 },
    ];
  }
  if (preset === 4)
    return [-1, 1, 0].map((x, i) => ({
      position: { x, y: i === 2 ? 1 : 0, z: 0 },
      velocity: { x: 0, y: 0, z: 0 },
      mass: 1,
    }));
  const bodies = makeGalaxyBodies(preset === 3 ? 256 : count, seed);
  if (preset === 1) {
    bodies.length = 0;
    for (let galaxy = 0; galaxy < 2; galaxy++) {
      const size = galaxy === 0 ? Math.floor(count / 2) : count - Math.floor(count / 2);
      const disk = makeGalaxyBodies(size, seed ^ Math.imul(galaxy, 0x9e3779b9));
      const side = galaxy === 0 ? -1 : 1;
      const tilt = galaxy === 0 ? -0.15 : 0.65;
      const rotate = (p: Vec3): Vec3 => ({
        x: p.x,
        y: p.y * Math.cos(tilt) - p.z * Math.sin(tilt),
        z: p.y * Math.sin(tilt) + p.z * Math.cos(tilt),
      });
      for (const body of disk) {
        const p = rotate(body.position);
        const v = rotate(body.velocity);
        const speedScale = Math.sqrt(0.5 / 0.45);
        bodies.push({
          position: { x: p.x * 0.45 + side * 0.6, y: p.y * 0.45 + side * 0.08, z: p.z * 0.45 },
          velocity: {
            x: v.x * speedScale - side * 0.1,
            y: v.y * speedScale + side * 0.06,
            z: v.z * speedScale,
          },
          mass: body.mass * 0.5,
        });
      }
    }
    const momentum = { x: 0, y: 0, z: 0 };
    let mass = 0;
    for (const body of bodies) {
      mass += body.mass;
      momentum.x += body.mass * body.velocity.x;
      momentum.y += body.mass * body.velocity.y;
      momentum.z += body.mass * body.velocity.z;
    }
    for (const body of bodies) {
      body.velocity.x -= momentum.x / mass;
      body.velocity.y -= momentum.y / mass;
      body.velocity.z -= momentum.z / mass;
    }
  }
  return bodies;
}
export function createGalaxy(stage = 10, preset = 0): GalaxyScene {
  const bodies = presetBodies(preset, stage >= 6 ? 4096 : 256);
  return {
    stage,
    preset,
    bodies,
    tree: buildMassOctree(bodies),
    camera: { yaw: 0.15, pitch: -0.85, distance: 2.6, x: 0, y: 0 },
    theta: 0.5,
    epsilon: 0.02,
    dt: 1 / 240,
    direct: stage < 6,
    selected: 1,
    paused: true,
    steps: 0,
    time: 0,
    revision: 0,
    physics: null,
    singleStep: false,
    trails: [],
    history: [],
    notice: "Dữ liệu 3D; G=0,001 theo reduced units. Chưa tiến thời gian.",
    debug: stage >= 5 && stage < 10,
  };
}
export function cancelPhysics(scene: GalaxyScene) {
  scene.physics = null;
  scene.singleStep = false;
  scene.paused = true;
}
export function invalidateExperiment(scene: GalaxyScene) {
  cancelPhysics(scene);
  scene.revision++;
  scene.history = [];
  scene.notice = "Đã đổi cấu hình; kết quả cũ được bỏ để tránh so nhầm snapshot.";
}
export function beginPhysics(scene: GalaxyScene, now = performance.now()) {
  if (scene.direct && scene.bodies.length > 256)
    throw new Error("Direct simulation giới hạn N≤256; dùng sampled reference ở hệ lớn.");
  scene.tree = buildMassOctree(scene.bodies);
  scene.physics = { target: 0, acceleration: [], deadline: now + 10000 };
}
// Work is sliced by target. A body never sees a mixture of old and new positions.
export function tickPhysics(scene: GalaxyScene, clock = () => performance.now(), budget = 6) {
  if (!scene.physics) beginPhysics(scene, clock());
  const task = scene.physics!;
  const until = clock() + budget;
  do {
    if (clock() > task.deadline) {
      cancelPhysics(scene);
      scene.notice = "Đã dừng bước physics vì vượt 10 giây; không ghi state dở dang.";
      return false;
    }
    const target = task.target;
    task.acceleration.push(
      (scene.direct
        ? directAcceleration(scene.bodies, target, gravity, scene.epsilon)
        : barnesHutAcceleration(
            scene.tree,
            scene.bodies,
            target,
            scene.theta,
            gravity,
            scene.epsilon,
          )
      ).acceleration,
    );
    task.target++;
    if (task.target === scene.bodies.length) break;
  } while (clock() < until);
  if (task.target < scene.bodies.length) return false;
  const next = scene.bodies.map((body, i) => {
    const a = task.acceleration[i],
      dt = scene.dt;
    const velocity = {
      x: body.velocity.x + a.x * dt,
      y: body.velocity.y + a.y * dt,
      z: body.velocity.z + a.z * dt,
    };
    return {
      mass: body.mass,
      velocity,
      position: {
        x: body.position.x + velocity.x * dt,
        y: body.position.y + velocity.y * dt,
        z: body.position.z + velocity.z * dt,
      },
    };
  });
  if (!allFiniteBodies(next)) {
    cancelPhysics(scene);
    scene.notice = "State không hữu hạn; giữ nguyên snapshot trước bước.";
    return false;
  }
  scene.bodies = next;
  scene.time += scene.dt;
  scene.steps++;
  scene.notice = "Đã commit đủ " + next.length + " body sau một fixed step; không trộn snapshot.";
  scene.revision++;
  scene.physics = null;
  scene.singleStep = false;
  scene.tree = buildMassOctree(next);
  const tracked = Math.min(24, next.length);
  scene.trails.push(
    Array.from({ length: tracked }, (_, i) => ({
      ...next[Math.floor((i * next.length) / tracked)].position,
    })),
  );
  if (scene.trails.length > 64) scene.trails.shift();
  return true;
}
export function selectedForce(
  scene: Pick<GalaxyScene, "bodies" | "selected" | "theta" | "epsilon" | "tree">,
) {
  const exact = directAcceleration(scene.bodies, scene.selected, gravity, scene.epsilon),
    trace = { opened: [] as number[], accepted: [] as number[] };
  const approximate = barnesHutAcceleration(
    scene.tree,
    scene.bodies,
    scene.selected,
    scene.theta,
    gravity,
    scene.epsilon,
    trace,
  );
  const difference = {
    x: approximate.acceleration.x - exact.acceleration.x,
    y: approximate.acceleration.y - exact.acceleration.y,
    z: approximate.acceleration.z - exact.acceleration.z,
  };
  const absolute = vectorLength(difference);
  return {
    exact,
    pair: softenedAcceleration(
      scene.bodies[scene.selected].position,
      scene.bodies[0].position,
      scene.bodies[0].mass,
      gravity,
      scene.epsilon,
    ),
    approximate,
    trace,
    absolute,
    relative: absolute / Math.max(vectorLength(exact.acceleration), 1e-12),
  };
}

export function validateGalaxy(scene: GalaxyScene) {
  const topology = inspectMassOctree(scene.tree, scene.bodies);
  const one = [{ position: { x: 0, y: 0, z: 0 }, velocity: { x: 0, y: 0, z: 0 }, mass: 1 }];
  const self = barnesHutAcceleration(buildMassOctree(one), one, 0, 1.2, gravity, scene.epsilon);
  return { ...topology, zeroSelfForce: vectorLength(self.acceleration) === 0 };
}
