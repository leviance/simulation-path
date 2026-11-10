import { cross3, magnitude3, scale3, type Vec3 } from "../normal.ts";

export const fullTurn = 2 * Math.PI;

export interface SurfaceSample {
  position: Vec3;
  tangentU: Vec3;
  tangentV: Vec3;
}

export function unit(direction: Vec3): Vec3 {
  const magnitude = magnitude3(direction);
  if (!Number.isFinite(magnitude) || magnitude <= 1e-12) {
    throw new RangeError("Tangent hoặc normal không có hướng dùng được.");
  }
  return scale3(direction, 1 / magnitude);
}

export function samplePatch(u: number, v: number, height: number): SurfaceSample {
  const pi = Math.PI;
  const sinU = Math.sin(pi * u);
  const cosU = Math.cos(pi * u);
  const sinV = Math.sin(pi * v);
  const cosV = Math.cos(pi * v);
  return {
    position: { x: 3.1 * (u - 0.5), y: height * sinU * cosV, z: 2.5 * (v - 0.5) },
    tangentU: { x: 3.1, y: height * pi * cosU * cosV, z: 0 },
    tangentV: { x: 0, y: -height * pi * sinU * sinV, z: 2.5 },
  };
}

export function sampleTorus(
  u: number,
  v: number,
  majorRadius: number,
  tubeRadius: number,
): SurfaceSample {
  const cosU = Math.cos(u);
  const sinU = Math.sin(u);
  const cosV = Math.cos(v);
  const sinV = Math.sin(v);
  const ringRadius = majorRadius + tubeRadius * cosV;
  const radialDerivative = -tubeRadius * sinV;
  return {
    position: { x: ringRadius * cosU, y: tubeRadius * sinV, z: ringRadius * sinU },
    tangentU: { x: -ringRadius * sinU, y: 0, z: ringRadius * cosU },
    tangentV: { x: radialDerivative * cosU, y: tubeRadius * cosV, z: radialDerivative * sinU },
  };
}

// v is a signed distance from the centerline, not an angle.
export function sampleMobius(
  u: number,
  v: number,
  radius: number,
  halfTwists: number,
): SurfaceSample {
  const twistRate = 0.5 * halfTwists;
  const twistAngle = u * twistRate;
  const cosU = Math.cos(u);
  const sinU = Math.sin(u);
  const cosTwist = Math.cos(twistAngle);
  const sinTwist = Math.sin(twistAngle);
  const ringRadius = radius + v * cosTwist;
  const radialDerivative = -v * twistRate * sinTwist;
  return {
    position: { x: ringRadius * cosU, y: v * sinTwist, z: ringRadius * sinU },
    tangentU: {
      x: radialDerivative * cosU - ringRadius * sinU,
      y: v * twistRate * cosTwist,
      z: radialDerivative * sinU + ringRadius * cosU,
    },
    tangentV: { x: cosTwist * cosU, y: sinTwist, z: cosTwist * sinU },
  };
}

export function surfaceNormal(sample: SurfaceSample): Vec3 {
  return unit(cross3(sample.tangentV, sample.tangentU));
}
