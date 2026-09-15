export interface ProjectileVec2 {
  x: number;
  y: number;
}

export interface ProjectileWorldView {
  screenOrigin: ProjectileVec2;
  pixelsPerMeter: number;
}

export interface ProjectileAim {
  velocity: ProjectileVec2;
  speed: number;
  angleRadians: number;
  valid: boolean;
}

export interface ProjectileLaunch {
  position: ProjectileVec2;
  velocity: ProjectileVec2;
  acceleration: ProjectileVec2;
}

export interface ProjectileState {
  position: ProjectileVec2;
  velocity: ProjectileVec2;
  elapsed: number;
  active: boolean;
}

export interface ProjectileStepPlan {
  steps: number;
  remainder: number;
  acceptedFrameTime: number;
  droppedTime: number;
}

export interface ProjectileImpactResult {
  state: ProjectileState;
  impacted: boolean;
  stepFraction: number;
  uncorrectedPosition: ProjectileVec2;
}

export const PROJECTILE_GRAVITY = -9.81;
export const PROJECTILE_EPSILON = 1e-9;

export function projectileAdd(left: ProjectileVec2, right: ProjectileVec2): ProjectileVec2 {
  return { x: left.x + right.x, y: left.y + right.y };
}

export function projectileSubtract(left: ProjectileVec2, right: ProjectileVec2): ProjectileVec2 {
  return { x: left.x - right.x, y: left.y - right.y };
}

export function projectileScale(vector: ProjectileVec2, scalar: number): ProjectileVec2 {
  return { x: vector.x * scalar, y: vector.y * scalar };
}

export function projectileLerp(
  start: ProjectileVec2,
  end: ProjectileVec2,
  amount: number,
): ProjectileVec2 {
  return projectileAdd(start, projectileScale(projectileSubtract(end, start), amount));
}

export function projectileLength(vector: ProjectileVec2) {
  return Math.hypot(vector.x, vector.y);
}

export function projectileWorldToScreen(
  worldPoint: ProjectileVec2,
  view: ProjectileWorldView,
): ProjectileVec2 {
  return {
    x: view.screenOrigin.x + worldPoint.x * view.pixelsPerMeter,
    y: view.screenOrigin.y - worldPoint.y * view.pixelsPerMeter,
  };
}

export function projectileScreenToWorld(
  screenPoint: ProjectileVec2,
  view: ProjectileWorldView,
): ProjectileVec2 | null {
  if (
    !Number.isFinite(view.pixelsPerMeter) ||
    Math.abs(view.pixelsPerMeter) <= PROJECTILE_EPSILON
  ) {
    return null;
  }
  return {
    x: (screenPoint.x - view.screenOrigin.x) / view.pixelsPerMeter,
    y: (view.screenOrigin.y - screenPoint.y) / view.pixelsPerMeter,
  };
}

export function projectileVelocityFromPolar(speed: number, angleRadians: number): ProjectileVec2 {
  if (!Number.isFinite(speed) || !Number.isFinite(angleRadians)) return { x: 0, y: 0 };
  return { x: speed * Math.cos(angleRadians), y: speed * Math.sin(angleRadians) };
}

export function projectileSpeedFromVelocity(velocity: ProjectileVec2) {
  return projectileLength(velocity);
}

export function projectileAngleFromVelocity(velocity: ProjectileVec2) {
  if (projectileLength(velocity) <= PROJECTILE_EPSILON) return 0;
  return Math.atan2(velocity.y, velocity.x);
}

export function projectileAimFromScreenDrag(
  screenOrigin: ProjectileVec2,
  screenPointer: ProjectileVec2,
  pixelsPerSpeed: number,
  minimumSpeed: number,
  maximumSpeed: number,
  minimumAngle: number,
  maximumAngle: number,
): ProjectileAim {
  if (!Number.isFinite(pixelsPerSpeed) || pixelsPerSpeed <= PROJECTILE_EPSILON) {
    return { velocity: { x: 0, y: 0 }, speed: 0, angleRadians: 0, valid: false };
  }
  const screenDelta = projectileSubtract(screenPointer, screenOrigin);
  const rawVelocity = { x: screenDelta.x / pixelsPerSpeed, y: -screenDelta.y / pixelsPerSpeed };
  const rawSpeed = projectileLength(rawVelocity);
  if (!Number.isFinite(rawSpeed) || rawSpeed <= PROJECTILE_EPSILON) {
    return { velocity: { x: 0, y: 0 }, speed: 0, angleRadians: 0, valid: false };
  }
  const safeMinimumSpeed = Math.min(minimumSpeed, maximumSpeed);
  const safeMaximumSpeed = Math.max(minimumSpeed, maximumSpeed);
  const safeMinimumAngle = Math.min(minimumAngle, maximumAngle);
  const safeMaximumAngle = Math.max(minimumAngle, maximumAngle);
  const speed = Math.min(safeMaximumSpeed, Math.max(safeMinimumSpeed, rawSpeed));
  const angleRadians = Math.min(
    safeMaximumAngle,
    Math.max(safeMinimumAngle, Math.atan2(rawVelocity.y, rawVelocity.x)),
  );
  return {
    velocity: projectileVelocityFromPolar(speed, angleRadians),
    speed,
    angleRadians,
    valid: true,
  };
}

export function analyticProjectilePosition(launch: ProjectileLaunch, elapsedSeconds: number) {
  const time = Math.max(0, elapsedSeconds);
  return projectileAdd(
    launch.position,
    projectileAdd(
      projectileScale(launch.velocity, time),
      projectileScale(launch.acceleration, 0.5 * time * time),
    ),
  );
}

export function analyticProjectileVelocity(launch: ProjectileLaunch, elapsedSeconds: number) {
  return projectileAdd(
    launch.velocity,
    projectileScale(launch.acceleration, Math.max(0, elapsedSeconds)),
  );
}

export function projectileTimeToApex(launch: ProjectileLaunch) {
  if (!Number.isFinite(launch.acceleration.y) || launch.acceleration.y >= -PROJECTILE_EPSILON) {
    return null;
  }
  const time = -launch.velocity.y / launch.acceleration.y;
  if (!Number.isFinite(time) || time < 0) return null;
  return time;
}

export function sampleAnalyticProjectile(
  launch: ProjectileLaunch,
  duration: number,
  segmentCount: number,
) {
  if (!Number.isFinite(duration) || duration < 0 || segmentCount < 1) return [];
  return Array.from({ length: segmentCount + 1 }, (_, index) =>
    analyticProjectilePosition(launch, (duration * index) / segmentCount),
  );
}

export function launchProjectileState(launch: ProjectileLaunch): ProjectileState {
  return {
    position: { ...launch.position },
    velocity: { ...launch.velocity },
    elapsed: 0,
    active: true,
  };
}

export function explicitEulerProjectileStep(
  state: ProjectileState,
  acceleration: ProjectileVec2,
  deltaSeconds: number,
): ProjectileState {
  if (!state.active || !Number.isFinite(deltaSeconds) || deltaSeconds <= 0) return state;
  return {
    position: projectileAdd(state.position, projectileScale(state.velocity, deltaSeconds)),
    velocity: projectileAdd(state.velocity, projectileScale(acceleration, deltaSeconds)),
    elapsed: state.elapsed + deltaSeconds,
    active: true,
  };
}

export function planProjectileFixedSteps(
  accumulator: number,
  frameSeconds: number,
  fixedDeltaSeconds: number,
  maximumSteps: number,
  maximumFrameSeconds: number,
): ProjectileStepPlan {
  if (
    !Number.isFinite(accumulator) ||
    accumulator < 0 ||
    !Number.isFinite(frameSeconds) ||
    frameSeconds < 0 ||
    !Number.isFinite(fixedDeltaSeconds) ||
    fixedDeltaSeconds <= 0 ||
    maximumSteps <= 0 ||
    !Number.isFinite(maximumFrameSeconds) ||
    maximumFrameSeconds <= 0
  ) {
    return { steps: 0, remainder: 0, acceptedFrameTime: 0, droppedTime: 0 };
  }

  const acceptedFrameTime = Math.min(frameSeconds, maximumFrameSeconds);
  let available = accumulator + acceptedFrameTime;
  const availableSteps = Math.floor((available + PROJECTILE_EPSILON) / fixedDeltaSeconds);
  const steps = Math.min(availableSteps, maximumSteps);
  available -= steps * fixedDeltaSeconds;
  let droppedTime = Math.max(0, frameSeconds - acceptedFrameTime);
  if (availableSteps > maximumSteps) {
    const discardedSteps = availableSteps - maximumSteps;
    droppedTime += discardedSteps * fixedDeltaSeconds;
    available -= discardedSteps * fixedDeltaSeconds;
  }
  if (available < 0 && available > -PROJECTILE_EPSILON) available = 0;
  return { steps, remainder: available, acceptedFrameTime, droppedTime };
}

export function solveProjectileGroundImpactTime(launch: ProjectileLaunch, groundY: number) {
  const a = 0.5 * launch.acceleration.y;
  const b = launch.velocity.y;
  const c = launch.position.y - groundY;
  if (![a, b, c].every(Number.isFinite)) return null;
  if (Math.abs(a) <= PROJECTILE_EPSILON) {
    if (Math.abs(b) <= PROJECTILE_EPSILON) return null;
    const root = -c / b;
    return root > PROJECTILE_EPSILON ? root : null;
  }
  const discriminant = b * b - 4 * a * c;
  if (!Number.isFinite(discriminant) || discriminant < 0) return null;
  const squareRoot = Math.sqrt(Math.max(0, discriminant));
  const roots = [(-b - squareRoot) / (2 * a), (-b + squareRoot) / (2 * a)].filter(
    (root) => root > PROJECTILE_EPSILON && Number.isFinite(root),
  );
  return roots.length > 0 ? Math.min(...roots) : null;
}

export function explicitEulerProjectileStepToGround(
  state: ProjectileState,
  acceleration: ProjectileVec2,
  deltaSeconds: number,
  groundY: number,
): ProjectileImpactResult {
  const candidate = explicitEulerProjectileStep(state, acceleration, deltaSeconds);
  if (
    candidate === state ||
    state.position.y < groundY ||
    candidate.position.y > groundY ||
    state.position.y - candidate.position.y <= PROJECTILE_EPSILON
  ) {
    return {
      state: candidate,
      impacted: false,
      stepFraction: 1,
      uncorrectedPosition: candidate.position,
    };
  }

  const fraction = Math.min(
    1,
    Math.max(0, (state.position.y - groundY) / (state.position.y - candidate.position.y)),
  );
  const position = projectileLerp(state.position, candidate.position, fraction);
  position.y = groundY;
  return {
    state: {
      position,
      velocity: projectileLerp(state.velocity, candidate.velocity, fraction),
      elapsed: state.elapsed + deltaSeconds * fraction,
      active: false,
    },
    impacted: true,
    stepFraction: fraction,
    uncorrectedPosition: candidate.position,
  };
}

export function projectilePositionError(numerical: ProjectileVec2, analytic: ProjectileVec2) {
  return projectileLength(projectileSubtract(numerical, analytic));
}

export function compareProjectileState(launch: ProjectileLaunch, numerical: ProjectileState) {
  const analytic = analyticProjectilePosition(launch, numerical.elapsed);
  return {
    analytic,
    numerical: numerical.position,
    elapsed: numerical.elapsed,
    error: projectilePositionError(numerical.position, analytic),
  };
}
