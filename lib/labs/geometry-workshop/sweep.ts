import { add3, cross3, dot3, magnitude3, scale3, subtract3, type Vec3 } from "../normal.ts";
import { usesSweep, validateSettings, type SurfaceSettings } from "./settings.ts";
import { fullTurn, unit, type SurfaceSample } from "./surfaces.ts";

export interface CurveSample {
  position: Vec3;
  derivative: Vec3;
  sectionRadius: number;
}

export interface SweepFrame {
  center: Vec3;
  tangent: Vec3;
  normal: Vec3;
  binormal: Vec3;
  sectionRadius: number;
  lengthFromStart: number;
}

export interface Sweep {
  frames: SweepFrame[];
  aspect: number;
  correction: number;
  closedSeam: boolean;
}

export function sampleShellCurve(s: number, settings: SurfaceSettings): CurveSample {
  const angleRate = fullTurn * settings.shellTurns;
  const angle = angleRate * s;
  const radialScale = Math.exp(settings.shellGrowth * (s - 1));
  const radius = settings.radius * radialScale;
  const radiusRate = settings.shellGrowth * radius;
  const height = 0.72 * settings.radius;
  const cosine = Math.cos(angle);
  const sine = Math.sin(angle);
  return {
    position: { x: radius * cosine, y: height * (1 - s), z: radius * sine },
    derivative: {
      x: radiusRate * cosine - radius * angleRate * sine,
      y: -height,
      z: radiusRate * sine + radius * angleRate * cosine,
    },
    sectionRadius: settings.thickness * radialScale,
  };
}

export function sampleKnotCurve(s: number, settings: SurfaceSettings): CurveSample {
  const t = fullTurn * s;
  const majorAngle = 2 * t;
  const minorAngle = settings.knotLobes * t;
  const minorRadius = 0.37 * settings.radius;
  const radial = settings.radius + minorRadius * Math.cos(minorAngle);
  const radialRate = -settings.knotLobes * minorRadius * Math.sin(minorAngle);
  const cosine = Math.cos(majorAngle);
  const sine = Math.sin(majorAngle);
  const derivativeT = {
    x: radialRate * cosine - 2 * radial * sine,
    y: settings.knotLobes * minorRadius * Math.cos(minorAngle),
    z: radialRate * sine + 2 * radial * cosine,
  };
  return {
    position: { x: radial * cosine, y: minorRadius * Math.sin(minorAngle), z: radial * sine },
    derivative: scale3(derivativeT, fullTurn),
    sectionRadius: settings.thickness,
  };
}

function rotateAboutAxis(vector: Vec3, axis: Vec3, angle: number): Vec3 {
  const cosine = Math.cos(angle);
  const sine = Math.sin(angle);
  return add3(
    add3(scale3(vector, cosine), scale3(cross3(axis, vector), sine)),
    scale3(axis, dot3(axis, vector) * (1 - cosine)),
  );
}

function projectOntoSection(direction: Vec3, tangent: Vec3): Vec3 {
  return unit(subtract3(direction, scale3(tangent, dot3(direction, tangent))));
}

export function transportNormal(previousNormal: Vec3, previousTangent: Vec3, tangent: Vec3): Vec3 {
  const axis = cross3(previousTangent, tangent);
  const sine = magnitude3(axis);
  const cosine = Math.max(-1, Math.min(1, dot3(previousTangent, tangent)));
  if (cosine < -0.9999) throw new RangeError("Hai tangent gần đối hướng.");
  if (sine <= 1e-10) return projectOntoSection(previousNormal, tangent);
  const normal = rotateAboutAxis(previousNormal, scale3(axis, 1 / sine), Math.atan2(sine, cosine));
  return projectOntoSection(normal, tangent);
}

function signedSectionAngle(from: Vec3, to: Vec3, tangent: Vec3): number {
  return Math.atan2(dot3(tangent, cross3(from, to)), dot3(from, to));
}

export function buildSweepFrames(settings: SurfaceSettings): Sweep {
  validateSettings(settings);
  if (!usesSweep(settings.kind)) throw new RangeError("Preset này không quét tiết diện.");
  const closed = settings.kind === "knot";
  const evaluate = closed ? sampleKnotCurve : sampleShellCurve;
  const frames: SweepFrame[] = [];
  for (let row = 0; row <= settings.uSegments; ++row) {
    let s = row / settings.uSegments;
    if (closed && row === settings.uSegments) s = 0;
    const curve = evaluate(s, settings);
    const tangent = unit(curve.derivative);
    const previous = frames.at(-1);
    let normal: Vec3;
    let lengthFromStart = 0;
    if (previous) {
      normal = transportNormal(previous.normal, previous.tangent, tangent);
      lengthFromStart =
        previous.lengthFromStart + magnitude3(subtract3(curve.position, previous.center));
    } else {
      let reference = { x: 0, y: 1, z: 0 };
      if (Math.abs(tangent.y) > 0.9) reference = { x: 1, y: 0, z: 0 };
      normal = projectOntoSection(reference, tangent);
    }
    frames.push({
      center: curve.position,
      tangent,
      normal,
      binormal: cross3(tangent, normal),
      sectionRadius: curve.sectionRadius,
      lengthFromStart,
    });
  }

  const last = frames.length - 1;
  const totalLength = frames[last].lengthFromStart;
  if (!Number.isFinite(totalLength) || totalLength <= 1e-12) {
    throw new RangeError("Đường tâm không có độ dài dùng được.");
  }
  let correction = 0;
  if (closed) {
    correction = signedSectionAngle(frames[last].normal, frames[0].normal, frames[0].tangent);
  }
  const closedSeam = closed && settings.correctKnotSeam;
  let appliedCorrection = 0;
  if (closedSeam) appliedCorrection = correction;
  for (const frame of frames) {
    const angle =
      ((appliedCorrection + fullTurn * settings.sectionTurns) * frame.lengthFromStart) /
      totalLength;
    frame.normal = projectOntoSection(
      rotateAboutAxis(frame.normal, frame.tangent, angle),
      frame.tangent,
    );
    frame.binormal = cross3(frame.tangent, frame.normal);
  }
  // With correction disabled the teaching view leaves the two unmatched rims visible.
  if (closedSeam) frames[last] = { ...frames[0], lengthFromStart: totalLength };
  return { frames, aspect: closed ? 0.82 : 0.72, correction, closedSeam };
}

export function sectionPoint(
  frame: SweepFrame,
  cosine: number,
  sine: number,
  aspect: number,
): Vec3 {
  const offset = add3(scale3(frame.normal, cosine), scale3(frame.binormal, aspect * sine));
  return add3(frame.center, scale3(offset, frame.sectionRadius));
}

export function sampleSweep(sweep: Sweep, row: number, angleV: number): SurfaceSample {
  const { frames, aspect, closedSeam } = sweep;
  const last = frames.length - 1;
  const cosine = Math.cos(angleV);
  const sine = Math.sin(angleV);
  let previous = Math.max(0, row - 1);
  let next = Math.min(last, row + 1);
  let intervals = next - previous;
  if (closedSeam && (row === 0 || row === last)) {
    previous = last - 1;
    next = 1;
    intervals = 2;
  }
  const frame = frames[row];
  const left = sectionPoint(frames[previous], cosine, sine, aspect);
  const right = sectionPoint(frames[next], cosine, sine, aspect);
  return {
    position: sectionPoint(frame, cosine, sine, aspect),
    tangentU: scale3(subtract3(right, left), last / intervals),
    tangentV: scale3(
      add3(scale3(frame.normal, -sine), scale3(frame.binormal, aspect * cosine)),
      frame.sectionRadius,
    ),
  };
}
