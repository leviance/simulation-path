import {
  add,
  subtract,
  multiply,
  dot,
  length,
  detectorCount,
  sourceRadius,
  detectorRadius,
  detectorWidth,
  validateScene,
  type Point,
  type Disk,
} from "./model.ts";
export interface Beam {
  origin: Point;
  direction: Point;
  maximum: number;
}
export function detectorRay(angle: number, u: number): Beam {
  if (!Number.isFinite(angle) || !Number.isFinite(u) || u < 0 || u > 1)
    throw new RangeError("Invalid detector coordinate");
  const radial: Point = [Math.cos(angle), Math.sin(angle)];
  const tangent: Point = [-Math.sin(angle), Math.cos(angle)];
  const source = multiply(radial, sourceRadius);
  const detectorCentre = multiply(radial, -detectorRadius);
  const endpoint = add(detectorCentre, multiply(tangent, (u - 0.5) * detectorWidth));
  const delta = subtract(endpoint, source);
  const maximum = length(delta);
  return { origin: source, direction: multiply(delta, 1 / maximum), maximum };
}
export const at = (beam: Beam, distance: number) =>
  add(beam.origin, multiply(beam.direction, distance));
export function validateBeam(beam: Beam) {
  if (
    ![...beam.origin, ...beam.direction, beam.maximum].every(Number.isFinite) ||
    Math.abs(dot(beam.direction, beam.direction) - 1) > 1e-10 ||
    beam.maximum <= 0 ||
    beam.maximum > 12
  )
    throw new RangeError("Expected a finite normalized beam");
}
// Low-level chord calculation assumes a validated beam and disk.
export function chordLength(beam: Beam, disk: Disk) {
  const delta = subtract(disk.centre, beam.origin);
  const along = dot(delta, beam.direction);
  const perpendicularSquared = Math.max(0, dot(delta, delta) - along * along);
  const halfChordSquared = disk.radius ** 2 - perpendicularSquared;
  if (halfChordSquared <= 0) return 0;
  const halfChord = Math.sqrt(halfChordSquared);
  return Math.max(0, Math.min(beam.maximum, along + halfChord) - Math.max(0, along - halfChord));
}
export function measure(beam: Beam, scene: readonly Disk[], strength: number) {
  validateBeam(beam);
  validateScene(scene);
  if (!Number.isFinite(strength) || strength < 0 || strength > 2)
    throw new RangeError("Invalid strength");
  let tau = 0;
  for (const disk of scene) tau += strength * disk.mu * chordLength(beam, disk);
  const ratio = Math.exp(-tau);
  return { tau, ratio, projection: -Math.log(ratio) };
}
export function project(angle: number, scene: readonly Disk[], strength: number) {
  return Array.from({ length: detectorCount }, (_, column) =>
    measure(detectorRay(angle, (column + 0.5) / detectorCount), scene, strength),
  );
}
export function pointOffset(angle: number, point: Point) {
  if (![angle, ...point].every(Number.isFinite) || length(point) > 1.5)
    throw new RangeError("Point outside supported field of view");
  const radial: Point = [Math.cos(angle), Math.sin(angle)];
  const tangent: Point = [-Math.sin(angle), Math.cos(angle)];
  return (
    ((sourceRadius + detectorRadius) * dot(point, tangent)) / (sourceRadius - dot(point, radial))
  );
}
