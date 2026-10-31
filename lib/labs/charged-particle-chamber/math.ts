export interface Vec3 {
  x: number;
  y: number;
  z: number;
}
export interface Vec4 extends Vec3 {
  w: number;
}
export interface Particle {
  positionCharge: Vec4;
  velocityMass: Vec4;
}
export interface Fields {
  electric: Vec3;
  magnetic: Vec3;
  chargeScale: number;
}
export type Preset = "straight" | "circle" | "helix" | "electric";
export type Integrator = "boris" | "euler";
export interface Settings {
  count: number;
  seed: number;
  initialVelocity: Vec3;
  fields: Fields;
  dt: number;
  preset: Preset;
  phaseSpan: number;
}

export const DEMO_COUNT = 256;
export const PARTICLE_BYTES = 32;
export const LOCAL_SIZE = 256;
export const TRAIL_COUNT = 17;
export const TRAIL_CAPACITY = 256;
export const PROBE_COUNT = 33;

export const add = (a: Vec3, b: Vec3): Vec3 => ({ x: a.x + b.x, y: a.y + b.y, z: a.z + b.z });
export const sub = (a: Vec3, b: Vec3): Vec3 => ({ x: a.x - b.x, y: a.y - b.y, z: a.z - b.z });
export const mul = (a: Vec3, scale: number): Vec3 => ({
  x: a.x * scale,
  y: a.y * scale,
  z: a.z * scale,
});
export const dot = (a: Vec3, b: Vec3) => a.x * b.x + a.y * b.y + a.z * b.z;
export const cross = (a: Vec3, b: Vec3): Vec3 => ({
  x: a.y * b.z - a.z * b.y,
  y: a.z * b.x - a.x * b.z,
  z: a.x * b.y - a.y * b.x,
});
export const length = (v: Vec3) => Math.hypot(v.x, v.y, v.z);
export const finite = (v: Vec3) =>
  Number.isFinite(v.x) && Number.isFinite(v.y) && Number.isFinite(v.z);
export const normalize = (v: Vec3): Vec3 =>
  length(v) > 1e-10 ? mul(v, 1 / length(v)) : { x: 0, y: 0, z: 0 };
export const position = (p: Particle): Vec3 => ({
  x: p.positionCharge.x,
  y: p.positionCharge.y,
  z: p.positionCharge.z,
});
export const velocity = (p: Particle): Vec3 => ({
  x: p.velocityMass.x,
  y: p.velocityMass.y,
  z: p.velocityMass.z,
});
export const cloneParticle = (p: Particle): Particle => ({
  positionCharge: { ...p.positionCharge },
  velocityMass: { ...p.velocityMass },
});
export function cloneSettings(s: Settings): Settings {
  return {
    ...s,
    initialVelocity: { ...s.initialVelocity },
    fields: { ...s.fields, electric: { ...s.fields.electric }, magnetic: { ...s.fields.magnetic } },
  };
}

export function presetSettings(preset: Preset = "helix"): Settings {
  const s: Settings = {
    count: 1_000_000,
    seed: 0x38c0ffee,
    initialVelocity: { x: 2.2, y: 0.65, z: 0 },
    fields: {
      electric: { x: 0, y: 0, z: 0 },
      magnetic: { x: 0.35, y: 1.1, z: 0.3 },
      chargeScale: 1,
    },
    dt: 1 / 240,
    preset,
    phaseSpan: 6,
  };
  if (preset === "straight") {
    s.fields.magnetic = { x: 0, y: 0, z: 0 };
    s.initialVelocity = { x: 1.8, y: 0.35, z: 0 };
  }
  if (preset === "circle") {
    s.fields.magnetic = { x: 0, y: 1.2, z: 0 };
    s.initialVelocity = { x: 2.2, y: 0, z: 0 };
  }
  if (preset === "electric") {
    s.fields.magnetic = { x: 0, y: 0, z: 0 };
    s.fields.electric = { x: 0, y: 0.6, z: 0 };
    s.initialVelocity = { x: 1.3, y: 0, z: 0 };
  }
  return s;
}

export function validateSettings(s: Settings): string | null {
  if (
    !finite(s.initialVelocity) ||
    !finite(s.fields.electric) ||
    !finite(s.fields.magnetic) ||
    !Number.isFinite(s.fields.chargeScale) ||
    !Number.isFinite(s.dt) ||
    !Number.isFinite(s.phaseSpan)
  )
    return "Tham số phải là số hữu hạn.";
  if (!Number.isInteger(s.count) || s.count < 1 || s.count > 5_000_000)
    return "N phải là số nguyên từ 1 đến 5.000.000; không tự giảm N khi yêu cầu không hợp lệ.";
  if (!Number.isInteger(s.seed) || s.seed < 0 || s.seed > 0xffffffff)
    return "Seed phải là số nguyên uint32.";
  if (
    length(s.fields.electric) > 8 ||
    length(s.fields.magnetic) > 8 ||
    length(s.initialVelocity) > 20 ||
    Math.abs(s.fields.chargeScale) > 4 ||
    s.dt < 0.001 ||
    s.dt > 1 / 30 ||
    s.phaseSpan < 0 ||
    s.phaseSpan > 12
  )
    return "Tham số nằm ngoài miền đã công bố: |E|, |B| ≤ 8; |v| ≤ 20; |q scale| ≤ 4; 0,001 ≤ dt ≤ 1/30; pha 0–12 s.";
  return null;
}

export function random01(id: number, channel: number, seed: number) {
  let value = (id ^ Math.imul(channel, 0x9e3779b9) ^ seed) >>> 0;
  value = Math.imul(value ^ (value >>> 16), 0x7feb352d) >>> 0;
  value = Math.imul(value ^ (value >>> 15), 0x846ca68b) >>> 0;
  value = (value ^ (value >>> 16)) >>> 0;
  return (value & 0xffff) / 65535;
}

export function initialParticle(id: number, s: Settings): Particle {
  const charge = id % 2 === 0 ? 1 : -1;
  const scale = 0.97 + 0.06 * random01(id, 3, s.seed);
  const p: Particle = {
    positionCharge: {
      x: (random01(id, 0, s.seed) - 0.5) * 0.18,
      y: (random01(id, 1, s.seed) - 0.5) * 0.16,
      z: (random01(id, 2, s.seed) - 0.5) * 0.18,
      w: charge,
    },
    velocityMass: { ...mul(s.initialVelocity, scale), w: 0.98 + 0.04 * random01(id, 4, s.seed) },
  };
  if (id < 2) {
    p.positionCharge = { x: 0, y: 0, z: 0, w: charge };
    p.velocityMass = { ...s.initialVelocity, w: 1 };
  }
  return p;
}

export const validParticle = (p: Particle) =>
  finite(p.positionCharge) &&
  finite(p.velocityMass) &&
  Number.isFinite(p.positionCharge.w) &&
  Number.isFinite(p.velocityMass.w) &&
  p.velocityMass.w > 0;

export function lorentzAcceleration(p: Particle, fields: Fields): Vec3 {
  return mul(
    add(fields.electric, cross(velocity(p), fields.magnetic)),
    (p.positionCharge.w * fields.chargeScale) / p.velocityMass.w,
  );
}

function writeState(p: Particle, x: Vec3, v: Vec3) {
  p.positionCharge.x = x.x;
  p.positionCharge.y = x.y;
  p.positionCharge.z = x.z;
  p.velocityMass.x = v.x;
  p.velocityMass.y = v.y;
  p.velocityMass.z = v.z;
}

export function stepBoris(p: Particle, fields: Fields, dt: number): boolean {
  if (
    !validParticle(p) ||
    !finite(fields.electric) ||
    !finite(fields.magnetic) ||
    !Number.isFinite(fields.chargeScale) ||
    !Number.isFinite(dt) ||
    dt <= 0
  )
    return false;
  const oldVelocity = velocity(p);
  const halfImpulse = (0.5 * dt * p.positionCharge.w * fields.chargeScale) / p.velocityMass.w;
  const vMinus = add(oldVelocity, mul(fields.electric, halfImpulse));
  const t = mul(fields.magnetic, halfImpulse);
  const s = mul(t, 2 / (1 + dot(t, t)));
  const vPrime = add(vMinus, cross(vMinus, t));
  const vPlus = add(vMinus, cross(vPrime, s));
  const nextVelocity = add(vPlus, mul(fields.electric, halfImpulse));
  const nextPosition = add(position(p), mul(add(oldVelocity, nextVelocity), 0.5 * dt));
  if (!finite(nextPosition) || !finite(nextVelocity)) return false;
  writeState(p, nextPosition, nextVelocity);
  return true;
}

export function stepEuler(p: Particle, fields: Fields, dt: number): boolean {
  if (
    !validParticle(p) ||
    !finite(fields.electric) ||
    !finite(fields.magnetic) ||
    !Number.isFinite(fields.chargeScale) ||
    !Number.isFinite(dt) ||
    dt <= 0
  )
    return false;
  const x = add(position(p), mul(velocity(p), dt));
  const v = add(velocity(p), mul(lorentzAcceleration(p, fields), dt));
  if (!finite(x) || !finite(v)) return false;
  writeState(p, x, v);
  return true;
}

export function analyticState(
  initial: Particle,
  fields: Fields,
  time: number,
): { position: Vec3; velocity: Vec3 } {
  const x0 = position(initial),
    v0 = velocity(initial);
  const chargeOverMass = (initial.positionCharge.w * fields.chargeScale) / initial.velocityMass.w;
  const a = mul(fields.electric, chargeOverMass);
  const magnitude = length(fields.magnetic);
  if (magnitude < 1e-12 || Math.abs(chargeOverMass) < 1e-12) {
    return {
      position: add(add(x0, mul(v0, time)), mul(a, 0.5 * time * time)),
      velocity: add(v0, mul(a, time)),
    };
  }
  const axis = mul(fields.magnetic, 1 / magnitude),
    omega = chargeOverMass * magnitude;
  const parallelVelocity = mul(axis, dot(v0, axis));
  const parallelAcceleration = mul(axis, dot(a, axis));
  const drift = mul(cross(a, axis), 1 / omega);
  const perpendicular = sub(sub(v0, parallelVelocity), drift);
  const turn = cross(perpendicular, axis);
  const angle = omega * time,
    sine = Math.sin(angle),
    cosine = Math.cos(angle);
  const oneMinusCosine = 2 * Math.sin(angle / 2) ** 2;
  return {
    position: add(
      add(
        add(
          add(x0, mul(add(parallelVelocity, drift), time)),
          mul(parallelAcceleration, 0.5 * time * time),
        ),
        mul(perpendicular, sine / omega),
      ),
      mul(turn, oneMinusCosine / omega),
    ),
    velocity: add(
      add(
        add(add(parallelVelocity, mul(parallelAcceleration, time)), drift),
        mul(perpendicular, cosine),
      ),
      mul(turn, sine),
    ),
  };
}

export function preparedPhaseSpan(s: Settings) {
  return length(s.fields.electric) > 1e-7 ||
    length(s.fields.magnetic) < 1e-5 ||
    Math.abs(s.fields.chargeScale) < 1e-5
    ? 0
    : s.phaseSpan;
}

export function snapshotParticle(id: number, s: Settings): Particle {
  const p = initialParticle(id, s),
    span = preparedPhaseSpan(s);
  if (id < 2 || span === 0) return p;
  const state = analyticState(p, s.fields, span * random01(id, 5, s.seed));
  writeState(p, state.position, state.velocity);
  return p;
}

export interface ClockState {
  accumulator: number;
  discardedSeconds: number;
  simulatedSeconds: number;
  tick: number;
}
export const emptyClock = (): ClockState => ({
  accumulator: 0,
  discardedSeconds: 0,
  simulatedSeconds: 0,
  tick: 0,
});
export function advanceClock(
  clock: ClockState,
  wall: number,
  dt: number,
  paused: boolean,
  singleStep: boolean,
) {
  if (!Number.isFinite(wall) || !Number.isFinite(dt) || dt <= 0) return 0;
  if (paused) {
    clock.accumulator = 0;
    return singleStep ? 1 : 0;
  }
  const accepted = Math.max(0, Math.min(wall, 0.1));
  clock.discardedSeconds += Math.max(0, wall - accepted);
  clock.accumulator += accepted;
  const available = Math.floor(clock.accumulator / dt),
    steps = Math.min(8, available);
  clock.accumulator -= steps * dt;
  if (available > steps) {
    const discarded = (available - steps) * dt;
    clock.accumulator -= discarded;
    clock.discardedSeconds += discarded;
  }
  return steps;
}
export function commitClock(clock: ClockState, steps: number, dt: number) {
  clock.tick += steps;
  clock.simulatedSeconds = clock.tick * dt;
}

export interface ComputeLimits {
  major: number;
  minor: number;
  maximumBlockBytes: number;
  maximumGroupsX: number;
  maximumLocalX: number;
  maximumInvocations: number;
  storageBindings: number;
  computeStorageBlocks: number;
}
export function makeBudget(s: Settings, limits: ComputeLimits) {
  const groups = Math.ceil(s.count / LOCAL_SIZE),
    stateBytes = s.count * PARTICLE_BYTES;
  const reservedBytes =
    3 * stateBytes +
    2 * PROBE_COUNT * PARTICLE_BYTES +
    TRAIL_COUNT * TRAIL_CAPACITY * PARTICLE_BYTES +
    4096 +
    64 * 1024 ** 2;
  const reason = validateSettings(s);
  const validLimits = Object.values(limits).every(Number.isFinite);
  const supported =
    !reason &&
    validLimits &&
    (limits.major > 4 || (limits.major === 4 && limits.minor >= 3)) &&
    limits.maximumLocalX >= 256 &&
    limits.maximumInvocations >= 256 &&
    limits.storageBindings >= 3 &&
    limits.computeStorageBlocks >= 2 &&
    stateBytes <= limits.maximumBlockBytes &&
    groups <= limits.maximumGroupsX &&
    reservedBytes <= 640 * 1024 ** 2;
  return {
    supported: Boolean(supported),
    reason:
      reason ??
      (supported
        ? "Yêu cầu nằm trong các giới hạn giả định đã nhập."
        : "Không đủ giới hạn đã nhập; giữ nguyên yêu cầu, không tự hạ N."),
    groups,
    stateBytes,
    reservedBytes,
    tailLanes: groups * LOCAL_SIZE - s.count,
  };
}

export interface Camera {
  target: Vec3;
  yaw: number;
  pitch: number;
  distance: number;
}
export const defaultCamera = (): Camera => ({
  target: { x: 1.3, y: 5.2, z: 1.1 },
  yaw: -0.85,
  pitch: 0.25,
  distance: 17,
});
export function cameraBasis(camera: Camera) {
  const horizontal = camera.distance * Math.cos(camera.pitch);
  const eye = add(camera.target, {
    x: horizontal * Math.cos(camera.yaw),
    y: camera.distance * Math.sin(camera.pitch),
    z: horizontal * Math.sin(camera.yaw),
  });
  const forward = normalize(sub(camera.target, eye));
  const right = normalize(cross(forward, { x: 0, y: 1, z: 0 }));
  return { eye, forward, right, up: cross(right, forward) };
}
export function cameraSpace(point: Vec3, camera: Camera) {
  const basis = cameraBasis(camera),
    delta = sub(point, basis.eye);
  return { x: dot(delta, basis.right), y: dot(delta, basis.up), z: dot(delta, basis.forward) };
}
export function projectPoint(point: Vec3, camera: Camera, width: number, height: number) {
  const p = cameraSpace(point, camera),
    focal = height / (2 * Math.tan(0.48));
  if (p.z <= 0.05 || p.z >= 2000) return { x: 0, y: 0, depth: p.z, scale: 0, visible: false };
  const x = width / 2 + (p.x * focal) / p.z,
    y = height / 2 - (p.y * focal) / p.z;
  return {
    x,
    y,
    depth: p.z,
    scale: focal / p.z,
    visible: x >= 0 && x <= width && y >= 0 && y <= height,
  };
}
export function orbit(camera: Camera, dx: number, dy: number) {
  camera.yaw -= dx * 0.007;
  camera.pitch = Math.max(-1.45, Math.min(1.45, camera.pitch + dy * 0.007));
}
export function pan(camera: Camera, dx: number, dy: number) {
  const basis = cameraBasis(camera);
  camera.target = add(
    camera.target,
    add(
      mul(basis.right, -dx * camera.distance * 0.0014),
      mul(basis.up, dy * camera.distance * 0.0014),
    ),
  );
}
export function zoom(camera: Camera, wheel: number) {
  camera.distance = Math.max(0.35, Math.min(400, camera.distance * Math.exp(-wheel * 0.14)));
}
