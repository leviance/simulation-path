import {
  COLLISION_EPSILON,
  CollisionSeededRandom,
  collisionImpulseMagnitude,
  makeRichCollisionLattice,
  validCollisionSettings,
  type CollisionStepSettings,
} from "./collision-tank.ts";

export interface TankVec3 {
  x: number;
  y: number;
  z: number;
}
export interface TankSphere {
  position: TankVec3;
  velocity: TankVec3;
  radius: number;
  inverseMass: number;
  color: string;
  restitution: number;
}
export interface TankSphereContact {
  colliding: boolean;
  normal: TankVec3;
  penetration: number;
}
export const tankAdd3 = (a: TankVec3, b: TankVec3): TankVec3 => ({
  x: a.x + b.x,
  y: a.y + b.y,
  z: a.z + b.z,
});
export const tankSub3 = (a: TankVec3, b: TankVec3): TankVec3 => ({
  x: a.x - b.x,
  y: a.y - b.y,
  z: a.z - b.z,
});
export const tankMul3 = (a: TankVec3, s: number): TankVec3 => ({
  x: a.x * s,
  y: a.y * s,
  z: a.z * s,
});
export const tankDot3 = (a: TankVec3, b: TankVec3) => a.x * b.x + a.y * b.y + a.z * b.z;
export const tankCross3 = (a: TankVec3, b: TankVec3): TankVec3 => ({
  x: a.y * b.z - a.z * b.y,
  y: a.z * b.x - a.x * b.z,
  z: a.x * b.y - a.y * b.x,
});
export const tankFinite3 = (v: TankVec3) =>
  Number.isFinite(v.x) && Number.isFinite(v.y) && Number.isFinite(v.z);
export function tankUnit3(v: TankVec3, fallback: TankVec3 = { x: 1, y: 0, z: 0 }) {
  const length = Math.sqrt(tankDot3(v, v));
  return Number.isFinite(length) && length > COLLISION_EPSILON
    ? tankMul3(v, 1 / length)
    : { ...fallback };
}
export function finiteTankSphere(b: TankSphere) {
  return (
    tankFinite3(b.position) &&
    tankFinite3(b.velocity) &&
    Number.isFinite(b.radius) &&
    b.radius > 0 &&
    Number.isFinite(b.inverseMass) &&
    b.inverseMass >= 0 &&
    Number.isFinite(b.restitution) &&
    b.restitution >= 0 &&
    b.restitution <= 1
  );
}
export function findTankSphereContact(a: TankSphere, b: TankSphere): TankSphereContact {
  const empty = { colliding: false, normal: { x: 1, y: 0, z: 0 }, penetration: 0 };
  if (!finiteTankSphere(a) || !finiteTankSphere(b)) return empty;
  const delta = tankSub3(b.position, a.position),
    d2 = tankDot3(delta, delta),
    radii = a.radius + b.radius;
  if (!Number.isFinite(d2) || !Number.isFinite(radii) || d2 >= radii * radii) return empty;
  if (d2 <= COLLISION_EPSILON ** 2)
    return {
      colliding: true,
      normal: tankUnit3(tankMul3(tankSub3(b.velocity, a.velocity), -1)),
      penetration: radii,
    };
  const distance = Math.sqrt(d2);
  return { colliding: true, normal: tankMul3(delta, 1 / distance), penetration: radii - distance };
}
function validContact(c: TankSphereContact) {
  return (
    c.colliding &&
    tankFinite3(c.normal) &&
    Math.abs(tankDot3(c.normal, c.normal) - 1) < 1e-8 &&
    Number.isFinite(c.penetration) &&
    c.penetration >= 0
  );
}
export function applyTankSphereImpulse(
  a: TankSphere,
  b: TankSphere,
  c: TankSphereContact,
  restitution: number,
) {
  if (!validContact(c) || !finiteTankSphere(a) || !finiteTankSphere(b)) return 0;
  const vn = tankDot3(tankSub3(b.velocity, a.velocity), c.normal);
  const j = collisionImpulseMagnitude(
    vn,
    a.inverseMass + b.inverseMass,
    restitution * Math.min(a.restitution, b.restitution),
  );
  if (!Number.isFinite(j)) return 0;
  const impulse = tankMul3(c.normal, j);
  a.velocity = tankSub3(a.velocity, tankMul3(impulse, a.inverseMass));
  b.velocity = tankAdd3(b.velocity, tankMul3(impulse, b.inverseMass));
  return j;
}
export function correctTankSphere(
  a: TankSphere,
  b: TankSphere,
  c: TankSphereContact,
  percentage: number,
  slop: number,
) {
  const sum = a.inverseMass + b.inverseMass;
  if (
    !validContact(c) ||
    !finiteTankSphere(a) ||
    !finiteTankSphere(b) ||
    !Number.isFinite(sum) ||
    sum <= COLLISION_EPSILON ||
    !Number.isFinite(percentage) ||
    !Number.isFinite(slop)
  )
    return;
  const amount =
    (Math.max(0, c.penetration - Math.max(0, slop)) * Math.max(0, Math.min(1, percentage))) / sum;
  a.position = tankSub3(a.position, tankMul3(c.normal, amount * a.inverseMass));
  b.position = tankAdd3(b.position, tankMul3(c.normal, amount * b.inverseMass));
}
export function makeTankSpheres(seed = 0x00c0ffee, elastic = false): TankSphere[] {
  const rng = new CollisionSeededRandom(seed),
    material = makeRichCollisionLattice(seed, elastic),
    bodies: TankSphere[] = [];
  for (let z = 0; z < 4; z++)
    for (let y = 0; y < 8; y++)
      for (let x = 0; x < 8; x++) {
        const index = bodies.length,
          nz = 2 * rng.nextUnit() - 1,
          angle = 2 * Math.PI * rng.nextUnit(),
          radial = Math.sqrt(Math.max(0, 1 - nz * nz)),
          speed = 2.2 * (0.75 + 0.5 * rng.nextUnit());
        bodies.push({
          position: { x: -7 + 2 * x, y: -4.375 + 1.25 * y, z: -4.5 + 3 * z },
          velocity: {
            x: speed * radial * Math.cos(angle),
            y: speed * radial * Math.sin(angle),
            z: speed * nz,
          },
          radius: 0.32 + 0.04 * (index % 4),
          inverseMass: material[index].inverseMass,
          color: material[index].color,
          restitution: material[index].restitution ?? 1,
        });
      }
  return bodies;
}
export function resolveTankSphereWalls(body: TankSphere, restitution: number): TankVec3 {
  if (
    !finiteTankSphere(body) ||
    !Number.isFinite(restitution) ||
    body.inverseMass === 0 ||
    body.radius >= 5
  )
    return { x: 0, y: 0, z: 0 };
  const previous = { ...body.velocity },
    e = Math.max(0, Math.min(1, restitution)) * body.restitution;
  for (const [axis, extent] of [
    ["x", 8],
    ["y", 5],
    ["z", 6],
  ] as const) {
    const limit = extent - body.radius;
    if (body.position[axis] < -limit) {
      body.position[axis] = -limit;
      if (body.velocity[axis] < 0) body.velocity[axis] = -body.velocity[axis] * e;
    }
    if (body.position[axis] > limit) {
      body.position[axis] = limit;
      if (body.velocity[axis] > 0) body.velocity[axis] = -body.velocity[axis] * e;
    }
  }
  return tankMul3(tankSub3(body.velocity, previous), 1 / body.inverseMass);
}
export interface TankSphereStats {
  pairChecks: number;
  contacts: number;
  impulses: number;
  wallImpulse: TankVec3;
  debugContacts: { point: TankVec3; normal: TankVec3; impulse: number }[];
  valid: boolean;
}
export function stepTankSpheres(source: TankSphere[], settings: CollisionStepSettings) {
  const stats: TankSphereStats = {
    pairChecks: 0,
    contacts: 0,
    impulses: 0,
    wallImpulse: { x: 0, y: 0, z: 0 },
    debugContacts: [],
    valid: true,
  };
  if (
    source.length > 512 ||
    !validCollisionSettings(settings) ||
    source.some((b) => !finiteTankSphere(b) || b.radius >= 5)
  )
    return { bodies: source, stats: { ...stats, valid: false } };
  const bodies = source.map((b) => ({
    ...b,
    position: { ...b.position },
    velocity: { ...b.velocity },
  }));
  for (const b of bodies)
    if (b.inverseMass > 0)
      b.position = tankAdd3(b.position, tankMul3(b.velocity, settings.deltaSeconds));
  for (let iteration = 0; iteration < settings.solverIterations; iteration++) {
    for (const b of bodies)
      stats.wallImpulse = tankAdd3(
        stats.wallImpulse,
        resolveTankSphereWalls(b, settings.restitution),
      );
    for (let i = 0; i < bodies.length; i++)
      for (let j = i + 1; j < bodies.length; j++) {
        stats.pairChecks++;
        const a = bodies[i],
          b = bodies[j],
          c = findTankSphereContact(a, b);
        if (!c.colliding) continue;
        stats.contacts++;
        const impulse = applyTankSphereImpulse(a, b, c, settings.restitution);
        if (impulse > 0) stats.impulses++;
        if (iteration === 0 && stats.debugContacts.length < 48)
          stats.debugContacts.push({
            point: tankAdd3(a.position, tankMul3(c.normal, a.radius)),
            normal: c.normal,
            impulse,
          });
        correctTankSphere(a, b, c, settings.correctionPercent, settings.penetrationSlop);
      }
  }
  for (const b of bodies)
    stats.wallImpulse = tankAdd3(
      stats.wallImpulse,
      resolveTankSphereWalls(b, settings.restitution),
    );
  return { bodies, stats };
}
export function measureTankSpheres(bodies: TankSphere[]) {
  let momentum: TankVec3 = { x: 0, y: 0, z: 0 },
    energy = 0,
    penetration = 0,
    overlaps = 0,
    finite = true;
  for (const b of bodies) {
    finite = finite && finiteTankSphere(b);
    if (b.inverseMass > 0) {
      momentum = tankAdd3(momentum, tankMul3(b.velocity, 1 / b.inverseMass));
      energy += (0.5 * tankDot3(b.velocity, b.velocity)) / b.inverseMass;
    }
  }
  for (let i = 0; i < bodies.length; i++)
    for (let j = i + 1; j < bodies.length; j++) {
      const c = findTankSphereContact(bodies[i], bodies[j]);
      if (c.colliding) {
        overlaps++;
        penetration = Math.max(penetration, c.penetration);
      }
    }
  return {
    momentum,
    energy,
    penetration,
    overlaps,
    finite: finite && Number.isFinite(energy) && tankFinite3(momentum),
  };
}
