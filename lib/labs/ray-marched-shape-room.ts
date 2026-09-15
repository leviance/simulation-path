export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export interface Ray {
  origin: Vec3;
  direction: Vec3;
}

export interface OrbitCamera {
  target: Vec3;
  yaw: number;
  pitch: number;
  distance: number;
  verticalFieldOfViewRadians: number;
}

export interface SceneOptions {
  includeSphere: boolean;
  includeBox: boolean;
  includeTorus: boolean;
  includeRoom: boolean;
}

export interface SceneSample {
  distance: number;
  materialId: number;
}

export interface MarchSettings {
  maximumSteps: number;
  hitEpsilon: number;
  maximumDistance: number;
}

export interface MarchResult {
  hit: boolean;
  traveled: number;
  steps: number;
  materialId: number;
  position: Vec3;
}

export interface MarchTraceStep {
  position: Vec3;
  distance: number;
  traveled: number;
  step: number;
}

export const DEFAULT_CAMERA: OrbitCamera = {
  target: { x: 0, y: -0.1, z: -0.25 },
  yaw: 0,
  pitch: 0.08,
  distance: 4.5,
  verticalFieldOfViewRadians: Math.PI / 3,
};

export const FULL_SCENE: SceneOptions = {
  includeSphere: true,
  includeBox: true,
  includeTorus: true,
  includeRoom: true,
};

export const DEFAULT_MARCH_SETTINGS: MarchSettings = {
  maximumSteps: 96,
  hitEpsilon: 0.0015,
  maximumDistance: 20,
};

export function add(a: Vec3, b: Vec3): Vec3 {
  return { x: a.x + b.x, y: a.y + b.y, z: a.z + b.z };
}

export function subtract(a: Vec3, b: Vec3): Vec3 {
  return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
}

export function scale(vector: Vec3, scalar: number): Vec3 {
  return { x: vector.x * scalar, y: vector.y * scalar, z: vector.z * scalar };
}

export function dot(a: Vec3, b: Vec3) {
  return a.x * b.x + a.y * b.y + a.z * b.z;
}

export function cross(a: Vec3, b: Vec3): Vec3 {
  return {
    x: a.y * b.z - a.z * b.y,
    y: a.z * b.x - a.x * b.z,
    z: a.x * b.y - a.y * b.x,
  };
}

export function length(vector: Vec3) {
  return Math.hypot(vector.x, vector.y, vector.z);
}

export function normalize(vector: Vec3): Vec3 {
  const magnitude = length(vector);
  if (magnitude <= 1e-12) return { x: 0, y: 0, z: 0 };
  return scale(vector, 1 / magnitude);
}

export function cameraPosition(camera: OrbitCamera): Vec3 {
  const horizontal = Math.cos(camera.pitch) * camera.distance;
  return add(camera.target, {
    x: Math.sin(camera.yaw) * horizontal,
    y: Math.sin(camera.pitch) * camera.distance,
    z: Math.cos(camera.yaw) * horizontal,
  });
}

export function makeCameraRay(
  camera: OrbitCamera,
  pixelX: number,
  pixelY: number,
  framebufferWidth: number,
  framebufferHeight: number,
): Ray {
  const width = Math.max(1, framebufferWidth);
  const height = Math.max(1, framebufferHeight);
  const origin = cameraPosition(camera);
  const forward = normalize(subtract(camera.target, origin));
  const right = normalize(cross(forward, { x: 0, y: 1, z: 0 }));
  const up = normalize(cross(right, forward));
  const ndcX = 2 * ((pixelX + 0.5) / width) - 1;
  const ndcY = 1 - 2 * ((pixelY + 0.5) / height);
  const aspect = width / height;
  const tangent = Math.tan(camera.verticalFieldOfViewRadians * 0.5);
  return {
    origin,
    direction: normalize(
      add(forward, add(scale(right, ndcX * aspect * tangent), scale(up, ndcY * tangent))),
    ),
  };
}

export function sdSphere(point: Vec3, center: Vec3, radius: number) {
  return length(subtract(point, center)) - radius;
}

export function sdBox(point: Vec3, center: Vec3, halfSize: Vec3) {
  const local = subtract(point, center);
  const q = {
    x: Math.abs(local.x) - halfSize.x,
    y: Math.abs(local.y) - halfSize.y,
    z: Math.abs(local.z) - halfSize.z,
  };
  const outside = {
    x: Math.max(q.x, 0),
    y: Math.max(q.y, 0),
    z: Math.max(q.z, 0),
  };
  return length(outside) + Math.min(Math.max(q.x, q.y, q.z), 0);
}

export function sdTorus(point: Vec3, center: Vec3, majorRadius: number, minorRadius: number) {
  const local = subtract(point, center);
  return Math.hypot(Math.hypot(local.x, local.z) - majorRadius, local.y) - minorRadius;
}

function nearer(current: SceneSample, candidate: SceneSample): SceneSample {
  return candidate.distance < current.distance ? candidate : current;
}

export function sampleScene(point: Vec3, options: SceneOptions = FULL_SCENE): SceneSample {
  let sample: SceneSample = { distance: Number.POSITIVE_INFINITY, materialId: 0 };
  if (options.includeSphere) {
    sample = {
      distance: sdSphere(point, { x: -1, y: -0.18, z: 0.15 }, 0.82),
      materialId: 1,
    };
  }
  if (options.includeBox) {
    sample = nearer(sample, {
      distance: sdBox(point, { x: 1, y: -0.32, z: 0.1 }, { x: 0.62, y: 0.68, z: 0.62 }),
      materialId: 2,
    });
  }
  if (options.includeTorus) {
    sample = nearer(sample, {
      distance: sdTorus(point, { x: 0.05, y: 0.32, z: -1.25 }, 0.72, 0.22),
      materialId: 3,
    });
  }
  if (options.includeRoom) {
    sample = nearer(sample, { distance: point.y + 1, materialId: 4 });
    sample = nearer(sample, { distance: 2.35 - point.y, materialId: 4 });
    sample = nearer(sample, { distance: point.z + 3.1, materialId: 4 });
    sample = nearer(sample, { distance: point.x + 3.5, materialId: 4 });
    sample = nearer(sample, { distance: 3.5 - point.x, materialId: 4 });
  }
  return sample;
}

export function marchRay(
  ray: Ray,
  settings: MarchSettings = DEFAULT_MARCH_SETTINGS,
  options: SceneOptions = FULL_SCENE,
): MarchResult {
  const result: MarchResult = {
    hit: false,
    traveled: 0,
    steps: 0,
    materialId: 0,
    position: ray.origin,
  };
  for (let step = 0; step < Math.max(0, settings.maximumSteps); step += 1) {
    result.position = add(ray.origin, scale(ray.direction, result.traveled));
    const sample = sampleScene(result.position, options);
    result.steps = step + 1;
    if (!Number.isFinite(sample.distance) || !Number.isFinite(length(result.position)))
      return result;
    if (sample.distance <= settings.hitEpsilon) {
      result.hit = true;
      result.materialId = sample.materialId;
      return result;
    }
    result.traveled += sample.distance;
    if (result.traveled >= settings.maximumDistance) {
      result.traveled = settings.maximumDistance;
      return result;
    }
  }
  return result;
}

export function traceRaySteps(
  ray: Ray,
  settings: MarchSettings = DEFAULT_MARCH_SETTINGS,
  options: SceneOptions = FULL_SCENE,
) {
  const trace: MarchTraceStep[] = [];
  let traveled = 0;
  for (let step = 0; step < Math.max(0, settings.maximumSteps); step += 1) {
    const position = add(ray.origin, scale(ray.direction, traveled));
    const sample = sampleScene(position, options);
    trace.push({ position, distance: sample.distance, traveled, step: step + 1 });
    if (!Number.isFinite(sample.distance) || sample.distance <= settings.hitEpsilon) break;
    traveled += sample.distance;
    if (traveled >= settings.maximumDistance) break;
  }
  return trace;
}

export function estimateNormal(point: Vec3, options: SceneOptions = FULL_SCENE, epsilon = 0.001) {
  const dx = { x: epsilon, y: 0, z: 0 };
  const dy = { x: 0, y: epsilon, z: 0 };
  const dz = { x: 0, y: 0, z: epsilon };
  return normalize({
    x:
      sampleScene(add(point, dx), options).distance -
      sampleScene(subtract(point, dx), options).distance,
    y:
      sampleScene(add(point, dy), options).distance -
      sampleScene(subtract(point, dy), options).distance,
    z:
      sampleScene(add(point, dz), options).distance -
      sampleScene(subtract(point, dz), options).distance,
  });
}

export function softShadow(
  origin: Vec3,
  direction: Vec3,
  maximumDistance: number,
  options: SceneOptions = FULL_SCENE,
  maximumSteps = 48,
) {
  let visibility = 1;
  let traveled = 0.02;
  for (let step = 0; step < maximumSteps && traveled < maximumDistance; step += 1) {
    const distance = sampleScene(add(origin, scale(direction, traveled)), options).distance;
    if (distance < 0.001) return 0;
    visibility = Math.min(visibility, (14 * distance) / traveled);
    traveled += Math.min(0.35, Math.max(0.01, distance));
  }
  return Math.min(1, Math.max(0, visibility));
}

export function validateRayMarchRoom() {
  const sphereCenter = { x: -1, y: -0.18, z: 0.15 };
  const sphereSurface = { x: -0.18, y: -0.18, z: 0.15 };
  const centerRay = makeCameraRay(DEFAULT_CAMERA, 479.5, 319.5, 960, 640);
  const sphereHit = marchRay({
    origin: { x: -1, y: -0.18, z: 4 },
    direction: { x: 0, y: 0, z: -1 },
  });
  const miss = marchRay(
    { origin: { x: 0, y: 0, z: 4 }, direction: { x: 0, y: 0, z: 1 } },
    { maximumSteps: 7, hitEpsilon: 0.0015, maximumDistance: 6 },
  );
  const normal = estimateNormal(sphereSurface);
  const shadow = softShadow({ x: 0, y: 0, z: 1.5 }, normalize({ x: -0.5, y: 0.8, z: 0.3 }), 8);
  return {
    centerRayFinite:
      Number.isFinite(length(centerRay.direction)) &&
      Math.abs(length(centerRay.direction) - 1) < 1e-9,
    sphereSignCorrect:
      sdSphere(sphereCenter, sphereCenter, 0.82) < 0 &&
      Math.abs(sdSphere(sphereSurface, sphereCenter, 0.82)) < 1e-9,
    sphereHitDetected: sphereHit.hit && sphereHit.materialId === 1,
    missStopsAtGuard: !miss.hit && miss.steps <= 7 && miss.traveled <= 6,
    normalPointsOutward: dot(normal, { x: 1, y: 0, z: 0 }) > 0.99,
    primitiveSurfacesCorrect:
      Math.abs(
        sdBox(
          { x: 1.62, y: -0.32, z: 0.1 },
          { x: 1, y: -0.32, z: 0.1 },
          { x: 0.62, y: 0.68, z: 0.62 },
        ),
      ) < 1e-9 &&
      Math.abs(
        sdTorus({ x: 0.99, y: 0.32, z: -1.25 }, { x: 0.05, y: 0.32, z: -1.25 }, 0.72, 0.22),
      ) < 1e-9,
    materialIdsStable:
      sampleScene(sphereCenter).materialId === 1 &&
      sampleScene({ x: 1, y: -0.32, z: 0.1 }).materialId === 2 &&
      sampleScene({ x: 0.77, y: 0.32, z: -1.25 }).materialId === 3,
    shadowBounded: shadow >= 0 && shadow <= 1,
  };
}
