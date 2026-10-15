import {
  detectorCount,
  detectorWidth,
  sourceRadius,
  detectorRadius,
  makeScene,
  validate,
  type Disk,
  type Settings,
} from "./model.ts";
import { detectorRay, measure, project } from "./projection.ts";
export function viewAngle(row: number, views: number) {
  if (![30, 60, 120].includes(views) || !Number.isInteger(row) || row < 0 || row >= views)
    throw new RangeError("Invalid view index");
  return (2 * Math.PI * row) / views;
}
export interface Scan {
  settings: Readonly<Settings>;
  scene: Disk[];
  values: Float64Array;
  acquired: number;
}
export function makeScan(settings: Settings): Scan {
  validate(settings);
  return {
    settings: { ...settings },
    scene: makeScene(settings.preset),
    values: new Float64Array(detectorCount * settings.views).fill(NaN),
    acquired: 0,
  };
}
export function acquireOne(scan: Scan) {
  if (scan.acquired >= scan.settings.views) return false;
  const row = project(
    viewAngle(scan.acquired, scan.settings.views),
    scan.scene,
    scan.settings.strength,
  );
  for (let column = 0; column < detectorCount; column++)
    scan.values[column + detectorCount * scan.acquired] = row[column].projection;
  scan.acquired++;
  return true;
}
export function advance(scan: Scan, budget: number) {
  if (!Number.isInteger(budget) || budget < 0 || budget > 2)
    throw new RangeError("At most two views per frame");
  let completed = 0;
  while (completed < budget && acquireOne(scan)) completed++;
  return completed;
}
export function samplingAngle(coarseRow: number) {
  return viewAngle(coarseRow * 4, 120) - viewAngle(coarseRow, 30);
}
export function audit() {
  let maximumError = 0;
  for (let row = 0; row < 30; row++)
    for (let column = 0; column < detectorCount; column++) {
      const s = ((column + 0.5) / detectorCount - 0.5) * detectorWidth;
      const distance = (sourceRadius * Math.abs(s)) / Math.hypot(sourceRadius + detectorRadius, s);
      const expected = distance < 1 ? Math.sqrt(1 - distance * distance) : 0;
      const actual = measure(
        detectorRay(viewAngle(row, 30), (column + 0.5) / detectorCount),
        makeScene(0),
        1,
      );
      maximumError = Math.max(maximumError, Math.abs(actual.projection - expected));
    }
  if (maximumError > 1e-10) throw new Error("Circular phantom oracle failed");
  return maximumError;
}
