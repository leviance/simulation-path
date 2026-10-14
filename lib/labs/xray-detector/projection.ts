import {
  at,
  detectorRay,
  materialLength,
  contains,
  objectBeam,
  validate,
  validateBeam,
  validateScene,
  type Beam,
  type Settings,
  type Material,
} from "./model.ts";
export interface Depth {
  low: number;
  high: number;
  samples: number;
}
export interface Sample {
  t: number;
  ds: number;
  muLow: number;
  low: number;
  high: number;
}
export interface Measurement {
  depth: Depth;
  ratio: number;
  intensity: number;
  logProjection: number;
  logClamped: boolean;
  profile: Sample[];
}
export function exactDepth(b: Beam, scene: Material[], strength: number): Depth {
  const depth = { low: 0, high: 0, samples: 0 };
  for (const m of scene) {
    const distance = materialLength(b, m);
    depth.low += strength * m.muLow * distance;
    depth.high += strength * m.muHigh * distance;
  }
  return depth;
}
export function midpointDepth(
  b: Beam,
  scene: Material[],
  strength: number,
  stepLength: number,
  record = false,
) {
  validateBeam(b);
  if (!Number.isFinite(stepLength) || stepLength < 0.05 || stepLength > 0.5)
    throw new RangeError("Step length must be 0.05..0.5");
  const count = Math.ceil(b.maximum / stepLength);
  if (count > 512) throw new RangeError("Sample budget exceeded");
  const depth = { low: 0, high: 0, samples: 0 },
    profile: Sample[] = [];
  for (let i = 0; i < count; i++) {
    const t = i * stepLength,
      ds = Math.min(stepLength, b.maximum - t),
      point = at(b, t + ds / 2);
    let muLow = 0,
      muHigh = 0;
    for (const m of scene)
      if (contains(m, point)) {
        muLow += strength * m.muLow;
        muHigh += strength * m.muHigh;
      }
    depth.low += muLow * ds;
    depth.high += muHigh * ds;
    depth.samples++;
    if (record) profile.push({ t: t + ds / 2, ds, muLow, low: depth.low, high: depth.high });
  }
  return { depth, profile };
}
export function transmission(d: Depth, s: Settings, stage = 8) {
  return stage >= 7 && s.spectral
    ? s.lowWeight * Math.exp(-d.low) + (1 - s.lowWeight) * Math.exp(-d.high)
    : Math.exp(-d.low);
}
export function measure(
  b: Beam,
  scene: Material[],
  s: Settings,
  stage = 8,
  record = false,
): Measurement {
  validate(s);
  validateScene(scene);
  validateBeam(b);
  const local = objectBeam(b, s.angle);
  let depth: Depth,
    profile: Sample[] = [];
  if (stage >= 5 && s.numeric) {
    const result = midpointDepth(local, scene, s.strength, s.stepLength, record);
    depth = result.depth;
    profile = result.profile;
  } else depth = exactDepth(local, scene, s.strength);
  const ratio = transmission(depth, s, stage);
  return {
    depth,
    ratio,
    intensity: s.exposure * ratio,
    logProjection: stage >= 6 ? -Math.log(Math.max(ratio, 1e-12)) : 0,
    logClamped: stage >= 6 && ratio < 1e-12,
    profile,
  };
}
export function brightness(
  x: number,
  y: number,
  width: number,
  height: number,
  scene: Material[],
  s: Settings,
  stage: number,
) {
  if (stage === 1)
    return x / width >= 25 / 80 &&
      x / width < 55 / 80 &&
      y / height >= 18 / 60 &&
      y / height < 42 / 60
      ? 0.35
      : 1;
  const b = detectorRay((x + 0.5) / width, (y + 0.5) / height);
  if (stage === 2) return Math.max(0, Math.min(1, 0.5 + b.direction[0]));
  if (stage === 3) return Math.min(1, materialLength(objectBeam(b, s.angle), scene[0]) / 4);
  const result = measure(b, scene, s, stage);
  let value = stage >= 6 && s.logView ? result.logProjection / s.logRange : result.ratio;
  value = Math.max(0, Math.min(1, value));
  return stage >= 6 && s.invert ? 1 - value : value;
}
export function audit() {
  const b: Beam = { origin: [0, 0, -6], direction: [0, 0, 1], maximum: 12 },
    scene: Material[] = [
      { minimum: [-1, -1, -0.55], maximum: [1, 1, 0.55], muLow: 0.55, muHigh: 0.18 },
    ];
  const s: Settings = {
    angle: 0,
    strength: 1,
    preset: 0,
    numeric: false,
    stepLength: 0.1,
    logView: false,
    invert: false,
    logRange: 4,
    spectral: false,
    lowWeight: 0.6,
    exposure: 10000,
  };
  const expected = measure(b, scene, s);
  if (
    Math.abs(expected.depth.low - 0.605) > 1e-12 ||
    Math.abs(expected.ratio - Math.exp(-0.605)) > 1e-12
  )
    throw new Error("Slab oracle failed");
  let maximumError = 0;
  for (const stepLength of [0.05, 0.11, 0.25]) {
    const error = Math.abs(
      measure(b, scene, { ...s, numeric: true, stepLength }).depth.low - 0.605,
    );
    if (error > 2 * stepLength * 0.55 + 1e-12) throw new Error("Boundary bound failed");
    maximumError = Math.max(maximumError, error);
  }
  return maximumError;
}
