import {
  collisionAdd,
  collisionSubtract,
  collisionDot,
  collisionLength,
  collisionScale,
  cloneCollisionBall,
  makeRichCollisionLattice,
  measureCollisionWorld,
  stepCollisionTank,
  planCollisionFixedSteps,
  integrateCollisionBall,
  resolveCollisionWall,
  findCollisionCircleContact,
  applyCollisionPairImpulse,
  correctCollisionPenetration,
  type CollisionBall,
  type CollisionStepStats,
  type CollisionVec2,
  type CircleContact,
} from "./collision-tank.ts";
import {
  makeTankSpheres,
  measureTankSpheres,
  stepTankSpheres,
  findTankSphereContact,
  tankAdd3,
  tankSub3,
  tankDot3,
  type TankSphere,
  type TankSphereStats,
  type TankVec3,
} from "./collision-spheres.ts";

export const TANK_BOUNDS = { minimumX: -10, minimumY: -6, maximumX: 10, maximumY: 6 };
export const TANK_STEPS = [1 / 60, 1 / 120, 1 / 240];
export interface TankCamera {
  yaw: number;
  pitch: number;
  distance: number;
}
export interface TankHistory {
  time: number;
  energy: number;
  penetration: number;
}
export interface TankScene {
  stage: number;
  spatial: boolean;
  count: number;
  elastic: boolean;
  correction: boolean;
  dtIndex: number;
  restitution: number;
  iterations: number;
  balls: CollisionBall[];
  spheres: TankSphere[];
  stats: CollisionStepStats;
  sphereStats: TankSphereStats;
  metrics: ReturnType<typeof measureCollisionWorld>;
  sphereMetrics: ReturnType<typeof measureTankSpheres>;
  initialEnergy: number;
  initialMomentum: CollisionVec2;
  initialMomentum3: TankVec3;
  wallImpulse: CollisionVec2;
  wallImpulse3: TankVec3;
  elapsed: number;
  steps: number;
  accumulator: number;
  droppedTime: number;
  substeps: number;
  paused: boolean;
  debug: boolean;
  fastRemaining: number;
  history: TankHistory[];
  message: string;
  camera: TankCamera;
  trace: {
    contact: CircleContact;
    normalSpeed: number;
    impulse: number;
    correction: number;
  } | null;
}
export const tankStage = (mode?: string) =>
  ({
    "collision-scene": 1,
    "collision-motion": 2,
    "collision-walls": 3,
    "collision-detection": 4,
    "collision-impulse": 5,
    "collision-correction": 6,
    "collision-bruteforce": 7,
    "collision-validation": 8,
    "collision-spheres": 9,
    "collision-camera": 10,
    "collision-final": 11,
  })[mode ?? "collision-final"] ?? 11;
export const tankEmptyStats = (): CollisionStepStats => ({
  pairChecks: 0,
  contacts: 0,
  impulses: 0,
  wallHits: 0,
  maximumPenetration: 0,
  wallImpulse: { x: 0, y: 0 },
  debugContacts: [],
  valid: true,
});
const emptySphereStats = (): TankSphereStats => ({
  pairChecks: 0,
  contacts: 0,
  impulses: 0,
  wallImpulse: { x: 0, y: 0, z: 0 },
  debugContacts: [],
  valid: true,
});
export function stopTankScene(s: TankScene): TankScene {
  return { ...s, paused: true, accumulator: 0, fastRemaining: 0 };
}
export function measureTankBaseline(s: TankScene): TankScene {
  const metrics = measureCollisionWorld(s.balls),
    sphereMetrics = measureTankSpheres(s.spheres);
  const initialEnergy = s.spatial ? sphereMetrics.energy : metrics.kineticEnergy;
  return {
    ...stopTankScene(s),
    elapsed: 0,
    steps: 0,
    substeps: 0,
    droppedTime: 0,
    metrics,
    sphereMetrics,
    initialEnergy,
    initialMomentum: { ...metrics.totalMomentum },
    initialMomentum3: { ...sphereMetrics.momentum },
    wallImpulse: { x: 0, y: 0 },
    wallImpulse3: { x: 0, y: 0, z: 0 },
    stats: tankEmptyStats(),
    sphereStats: emptySphereStats(),
    history: [
      {
        time: 0,
        energy: initialEnergy,
        penetration: s.spatial ? sphereMetrics.penetration : metrics.maximumPenetration,
      },
    ],
  };
}
export function rebuildTankScene(s: TankScene): TankScene {
  let balls = makeRichCollisionLattice(0x00c0ffee, s.elastic).slice(0, s.count);
  if (s.stage === 3)
    balls = [
      {
        position: { x: -9.7, y: 0 },
        velocity: { x: -2, y: 0.8 },
        radius: 0.5,
        inverseMass: 1,
        color: "#61afef",
        restitution: 1,
      },
    ];
  if (s.stage >= 4 && s.stage < 7)
    balls = [
      {
        position: { x: -0.6, y: 0 },
        velocity: { x: 1.5, y: 0 },
        radius: 0.75,
        inverseMass: 1,
        color: "#ff7b72",
        restitution: 1,
      },
      {
        position: { x: 0.6, y: 0 },
        velocity: { x: -0.5, y: 0 },
        radius: 0.75,
        inverseMass: 0.5,
        color: "#53f0ae",
        restitution: 1,
      },
    ];
  const spheres = s.spatial ? makeTankSpheres(0x00c0ffee, s.elastic).slice(0, s.count) : [];
  let trace: TankScene["trace"] = null;
  if (s.stage >= 4 && s.stage < 7) {
    const contact = findCollisionCircleContact(balls[0], balls[1]);
    trace = {
      contact,
      normalSpeed: collisionDot(
        collisionSubtract(balls[1].velocity, balls[0].velocity),
        contact.normal,
      ),
      impulse: 0,
      correction: 0,
    };
  }
  return measureTankBaseline({ ...s, balls, spheres, trace, message: "" });
}
export function makeTankScene(stage = 11): TankScene {
  const scene: TankScene = {
    stage,
    spatial: false,
    count: 256,
    elastic: false,
    correction: true,
    dtIndex: 1,
    restitution: 1,
    iterations: 3,
    balls: [],
    spheres: [],
    stats: tankEmptyStats(),
    sphereStats: emptySphereStats(),
    metrics: measureCollisionWorld([]),
    sphereMetrics: measureTankSpheres([]),
    initialEnergy: 0,
    initialMomentum: { x: 0, y: 0 },
    initialMomentum3: { x: 0, y: 0, z: 0 },
    wallImpulse: { x: 0, y: 0 },
    wallImpulse3: { x: 0, y: 0, z: 0 },
    elapsed: 0,
    steps: 0,
    accumulator: 0,
    droppedTime: 0,
    substeps: 0,
    paused: true,
    debug: true,
    fastRemaining: 0,
    history: [],
    message: "",
    camera: { yaw: 0.7, pitch: 0.35, distance: 26 },
    trace: null,
  };
  return rebuildTankScene(scene);
}
export type TankSetting =
  "dtIndex" | "restitution" | "iterations" | "correction" | "dimension" | "count" | "elastic";
export function editTankScene(s: TankScene, key: TankSetting, value: number): TankScene {
  if (!Number.isFinite(value)) return s;
  if (key === "dimension") {
    if (s.stage < 10 || ![2, 3].includes(value)) return s;
    return rebuildTankScene({ ...s, spatial: value === 3 });
  }
  if (key === "count" && ![64, 256].includes(value)) return s;
  if (key === "dtIndex" && (!Number.isInteger(value) || value < 0 || value >= TANK_STEPS.length))
    return s;
  if (key === "iterations" && (!Number.isInteger(value) || value < 1 || value > 8)) return s;
  if (key === "restitution" && (value < 0 || value > 1)) return s;
  if (key === "elastic") return rebuildTankScene({ ...s, elastic: !!value, restitution: 1 });
  if (key === "correction") return rebuildTankScene({ ...s, correction: !!value });
  return rebuildTankScene({ ...s, [key]: value });
}
export function tickTankScene(s: TankScene): TankScene {
  if (s.stage < 2) return s;
  const dt = TANK_STEPS[s.dtIndex];
  if (!Number.isFinite(dt))
    return { ...stopTankScene(s), message: "dt không hợp lệ; bước đã bị từ chối." };
  const settings = {
    deltaSeconds: dt,
    restitution: s.restitution,
    solverIterations: s.iterations,
    correctionPercent: s.correction ? 0.8 : 0,
    penetrationSlop: 0.001,
  };
  let next = { ...s };
  if (s.spatial && s.stage >= 10) {
    const result = stepTankSpheres(s.spheres, settings);
    if (!result.stats.valid)
      return { ...stopTankScene(s), message: "State 3D không hợp lệ, chưa cập nhật." };
    next = {
      ...next,
      spheres: result.bodies,
      sphereStats: result.stats,
      sphereMetrics: measureTankSpheres(result.bodies),
      wallImpulse3: tankAdd3(s.wallImpulse3, result.stats.wallImpulse),
    };
  } else {
    let balls = s.balls.map(cloneCollisionBall),
      stats = tankEmptyStats();
    if (s.stage >= 7) {
      const result = stepCollisionTank(s.balls, TANK_BOUNDS, settings);
      if (!result.stats.valid)
        return { ...stopTankScene(s), message: "State 2D không hợp lệ, chưa cập nhật." };
      balls = result.balls;
      stats = result.stats;
    } else {
      for (const ball of balls) {
        integrateCollisionBall(ball, dt);
        if (s.stage >= 3) resolveCollisionWall(ball, TANK_BOUNDS, s.restitution);
      }
      if (s.stage >= 4 && balls.length === 2) {
        const contact = findCollisionCircleContact(balls[0], balls[1]);
        const normalSpeed = collisionDot(
          collisionSubtract(balls[1].velocity, balls[0].velocity),
          contact.normal,
        );
        const impulse =
          s.stage >= 5 ? applyCollisionPairImpulse(balls[0], balls[1], contact, s.restitution) : 0;
        const correction =
          s.stage >= 6 && s.correction
            ? correctCollisionPenetration(balls[0], balls[1], contact, 0.8, 0.001)
            : 0;
        next.trace = { contact, normalSpeed, impulse, correction };
      }
    }
    next = {
      ...next,
      balls,
      stats,
      metrics: s.stage >= 8 ? measureCollisionWorld(balls) : s.metrics,
      wallImpulse: collisionAdd(s.wallImpulse, stats.wallImpulse),
    };
  }
  next.elapsed = s.elapsed + dt;
  next.steps = s.steps + 1;
  next.substeps = s.substeps + 1;
  if (s.stage >= 8)
    next.history = [
      ...s.history,
      {
        time: next.elapsed,
        energy: next.spatial ? next.sphereMetrics.energy : next.metrics.kineticEnergy,
        penetration: next.spatial
          ? next.sphereMetrics.penetration
          : next.metrics.maximumPenetration,
      },
    ].slice(-601);
  return next;
}
export function stepTankScene(s: TankScene) {
  return tickTankScene({ ...stopTankScene(s), substeps: 0 });
}
export function requestTankFast(s: TankScene): TankScene {
  if (s.stage < 8) return s;
  return { ...stopTankScene(s), fastRemaining: Math.round(2 / TANK_STEPS[s.dtIndex]) };
}
export function advanceTankFrame(s: TankScene, frameSeconds: number): TankScene {
  let next = { ...s, substeps: 0 };
  if (next.fastRemaining > 0) {
    const count = Math.min(4, next.fastRemaining);
    for (let i = 0; i < count; i++) {
      const previousSteps = next.steps;
      next = tickTankScene(next);
      if (next.steps === previousSteps) {
        next.fastRemaining = 0;
        break;
      }
      next = { ...next, fastRemaining: next.fastRemaining - 1 };
    }
    return next;
  }
  if (next.paused) return next;
  const plan = planCollisionFixedSteps(
    next.accumulator,
    frameSeconds,
    TANK_STEPS[s.dtIndex],
    4,
    0.05,
  );
  next = { ...next, accumulator: plan.remainder, droppedTime: next.droppedTime + plan.droppedTime };
  for (let i = 0; i < plan.steps; i++) next = tickTankScene(next);
  return next;
}
export function tankMomentumResidual(s: TankScene) {
  if (s.spatial) {
    const v = tankSub3(tankSub3(s.sphereMetrics.momentum, s.initialMomentum3), s.wallImpulse3);
    return Math.sqrt(tankDot3(v, v));
  }
  return collisionLength(
    collisionSubtract(collisionSubtract(s.metrics.totalMomentum, s.initialMomentum), s.wallImpulse),
  );
}
export function spawnTankBodies(s: TankScene): TankScene {
  if (s.stage < 11) return s;
  const balls = [...s.balls],
    spheres = [...s.spheres];
  let added = 0;
  if (s.spatial) {
    for (const b of makeTankSpheres(0x00c0ffef, s.elastic)) {
      b.position.x += 1;
      if (b.position.x + b.radius > 8) continue;
      if (
        spheres.length < 512 &&
        spheres.every((other) => !findTankSphereContact(b, other).colliding)
      ) {
        spheres.push(b);
        if (++added === 16) break;
      }
    }
  } else {
    for (const b of makeRichCollisionLattice(0x00c0ffef, s.elastic)) {
      b.position = { x: -b.position.x + 0.55, y: -b.position.y };
      if (b.position.x + b.radius > 10) continue;
      if (
        balls.length < 512 &&
        balls.every((other) => !findCollisionCircleContact(b, other).colliding)
      ) {
        balls.push(b);
        if (++added === 16) break;
      }
    }
  }
  const next = measureTankBaseline({ ...s, balls, spheres });
  return {
    ...next,
    message: added
      ? "Đã thêm " + added + " vật thể; bắt đầu lại mốc đo."
      : "Không có chỗ trống hoặc đã đạt giới hạn 512 vật thể.",
  };
}
export function kickTankBall(s: TankScene, index: number, change: CollisionVec2): TankScene {
  if (
    s.spatial ||
    s.stage < 11 ||
    !Number.isInteger(index) ||
    index < 0 ||
    index >= s.balls.length ||
    ![change.x, change.y].every(Number.isFinite)
  )
    return s;
  let delta = { ...change };
  const speed = collisionLength(delta);
  if (speed > 6) delta = collisionScale(delta, 6 / speed);
  const balls = s.balls.map(cloneCollisionBall);
  balls[index].velocity = collisionAdd(balls[index].velocity, delta);
  return {
    ...measureTankBaseline({ ...s, balls }),
    message: "Kick là tác động bên ngoài; đã bắt đầu lại mốc đo.",
  };
}
export function orbitTankCamera(
  s: TankScene,
  yaw: number,
  pitch: number,
  distance = s.camera.distance,
): TankScene {
  if (![yaw, pitch, distance].every(Number.isFinite) || s.stage < 10) return s;
  return {
    ...s,
    camera: {
      yaw: ((((yaw + Math.PI) % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI)) - Math.PI,
      pitch: Math.max(-1.2, Math.min(1.2, pitch)),
      distance: Math.max(22, Math.min(38, distance)),
    },
  };
}
