import {
  createField,
  defaultSettings,
  measure,
  type HeatField,
  type HeatSettings,
} from "./model.ts";
import { diffuse } from "./solver.ts";

export function cosineBasis(
  x: number,
  y: number,
  width: number,
  height: number,
  modeX: number,
  modeY: number,
) {
  return (
    Math.cos((Math.PI * modeX * (x + 0.5)) / width) *
    Math.cos((Math.PI * modeY * (y + 0.5)) / height)
  );
}
export function cosineField(width: number, height: number, modeX: number, modeY: number) {
  const field = createField(width, height);
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++)
      field.current[y * width + x] = 0.5 + 0.25 * cosineBasis(x, y, width, height, modeX, modeY);
  return field;
}
export function discreteAmplification(
  settings: HeatSettings,
  width: number,
  height: number,
  modeX: number,
  modeY: number,
) {
  const rx = (settings.diffusivity * settings.dt) / (settings.dx * settings.dx);
  const ry = (settings.diffusivity * settings.dt) / (settings.dy * settings.dy);
  return (
    1 -
    4 * rx * Math.sin((Math.PI * modeX) / (2 * width)) ** 2 -
    4 * ry * Math.sin((Math.PI * modeY) / (2 * height)) ** 2
  );
}
export function continuousAmplitude(
  settings: HeatSettings,
  width: number,
  height: number,
  modeX: number,
  modeY: number,
  time: number,
) {
  const waveX = (Math.PI * modeX) / (width * settings.dx);
  const waveY = (Math.PI * modeY) / (height * settings.dy);
  return 0.25 * Math.exp(-settings.diffusivity * (waveX * waveX + waveY * waveY) * time);
}
export function maximumCosineError(
  field: HeatField,
  amplitude: number,
  modeX: number,
  modeY: number,
) {
  let maximum = 0;
  for (let y = 0; y < field.height; y++) {
    for (let x = 0; x < field.width; x++) {
      const expected = 0.5 + amplitude * cosineBasis(x, y, field.width, field.height, modeX, modeY);
      const actual = field.current[y * field.width + x];
      if (!Number.isFinite(actual) || !Number.isFinite(expected)) return Infinity;
      maximum = Math.max(maximum, Math.abs(actual - expected));
    }
  }
  return maximum;
}

/** Bounded fixtures; not a certificate for the interactive user's current field. */
export function validatePlate() {
  const settings = { ...defaultSettings(), diffusivity: 0.5, dx: 1, dy: 1, dt: 0.2 };
  const constant = createField(16, 16);
  constant.current.fill(0.4);
  let accepted = true;
  for (let step = 0; step < 20; step++) accepted = diffuse(constant, settings).advanced && accepted;
  const constantError = Math.max(...constant.current.map((value) => Math.abs(value - 0.4)));
  const impulse = createField(17, 17);
  impulse.current[8 * 17 + 8] = 1;
  for (let step = 0; step < 40; step++) accepted = diffuse(impulse, settings).advanced && accepted;
  const stats = measure(impulse, settings);
  let symmetryError = 0;
  for (let y = 0; y < 17; y++)
    for (let x = 0; x < 17; x++)
      symmetryError = Math.max(
        symmetryError,
        Math.abs(impulse.current[y * 17 + x] - impulse.current[y * 17 + 16 - x]),
      );
  settings.dx = 0.7;
  settings.dy = 0.9;
  settings.dt = 0.03;
  const cosine = cosineField(17, 13, 3, 2);
  const g = discreteAmplification(settings, 17, 13, 3, 2);
  for (let step = 0; step < 40; step++) accepted = diffuse(cosine, settings).advanced && accepted;
  const schemeError = maximumCosineError(cosine, 0.25 * g ** 40, 3, 2);
  const refinement = [16, 32, 64].map((size) => {
    settings.dx = settings.dy = 16 / size;
    settings.dt = (0.2 * settings.dx * settings.dx) / settings.diffusivity;
    const field = cosineField(size, size, 1, 1);
    const steps = Math.round(0.4 / settings.dt);
    for (let step = 0; step < steps; step++)
      accepted = diffuse(field, settings).advanced && accepted;
    return {
      size,
      h: settings.dx,
      dt: settings.dt,
      time: field.time,
      error: maximumCosineError(field, continuousAmplitude(settings, size, size, 1, 1, 0.4), 1, 1),
    };
  });
  const integralError = Math.abs(stats.integral - 1);
  const passed =
    accepted &&
    constantError <= 1e-14 &&
    stats.finite &&
    integralError <= 1e-10 &&
    symmetryError <= 1e-12 &&
    schemeError <= 2e-13 &&
    refinement.every((row) => Number.isFinite(row.error) && Math.abs(row.time - 0.4) <= 1e-14) &&
    refinement[1].error < refinement[0].error / 3 &&
    refinement[2].error < refinement[1].error / 3;
  return { passed, constantError, integralError, symmetryError, schemeError, refinement };
}
