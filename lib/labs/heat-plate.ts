export type Boundary = "insulated" | "cold";
export type HeatField = {
  width: number;
  height: number;
  current: Float64Array;
  next: Float64Array;
  tick: number;
};
export type HeatSettings = {
  diffusivity: number;
  dx: number;
  dy: number;
  dt: number;
  boundary: Boundary;
};
export const defaultSettings = (): HeatSettings => ({
  diffusivity: 6,
  dx: 1,
  dy: 1,
  dt: 1 / 30,
  boundary: "insulated",
});

export function createField(width = 64, height = 48): HeatField {
  if (
    !Number.isInteger(width) ||
    !Number.isInteger(height) ||
    width < 3 ||
    height < 3 ||
    width > 256 ||
    height > 256
  )
    throw new Error("Field dimensions must be integers in [3, 256]");
  return {
    width,
    height,
    current: new Float64Array(width * height),
    next: new Float64Array(width * height),
    tick: 0,
  };
}
export function contains(field: HeatField, x: number, y: number) {
  return (
    Number.isInteger(x) &&
    Number.isInteger(y) &&
    x >= 0 &&
    y >= 0 &&
    x < field.width &&
    y < field.height
  );
}
export function edge(field: HeatField, x: number, y: number) {
  return x === 0 || y === 0 || x === field.width - 1 || y === field.height - 1;
}
export function sample(field: HeatField, x: number, y: number) {
  return field.current[
    Math.max(0, Math.min(field.height - 1, y)) * field.width +
      Math.max(0, Math.min(field.width - 1, x))
  ];
}
export function makeField(preset = 0) {
  const field = createField();
  for (let y = 0; y < field.height; y += 1) {
    for (let x = 0; x < field.width; x += 1) {
      let value = 0;
      if (preset === 0 && x >= 28 && x < 36 && y >= 20 && y < 28) value = 1;
      if (preset === 1) value = 0.4;
      if (preset === 2 && x % 2 === y % 2) value = 1;
      field.current[y * field.width + x] = value;
    }
  }
  return field;
}
export function paintDisk(field: HeatField, cx: number, cy: number, radius: number, value: number) {
  if (!contains(field, cx, cy) || !Number.isFinite(value) || !Number.isFinite(radius)) return;
  radius = Math.max(0, Math.min(8, Math.floor(radius)));
  value = Math.max(0, Math.min(1, value));
  for (let dy = -radius; dy <= radius; dy += 1) {
    for (let dx = -radius; dx <= radius; dx += 1) {
      if (dx * dx + dy * dy <= radius * radius && contains(field, cx + dx, cy + dy))
        field.current[(cy + dy) * field.width + cx + dx] = value;
    }
  }
}
export function paintStroke(
  field: HeatField,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  radius: number,
  value: number,
) {
  if (!contains(field, x0, y0) || !contains(field, x1, y1)) return;
  const dx = x1 - x0;
  const dy = y1 - y0;
  const steps = Math.max(Math.abs(dx), Math.abs(dy));
  if (steps === 0) {
    paintDisk(field, x0, y0, radius, value);
    return;
  }
  for (let i = 0; i <= steps; i += 1) {
    const t = i / steps;
    paintDisk(field, Math.round(x0 + t * dx), Math.round(y0 + t * dy), radius, value);
  }
}
export function ratios(settings: HeatSettings, stage = 8) {
  return {
    rx: (settings.diffusivity * settings.dt) / (settings.dx * settings.dx),
    ry: stage >= 4 ? (settings.diffusivity * settings.dt) / (settings.dy * settings.dy) : 0,
  };
}
export function stable(settings: HeatSettings, stage = 8) {
  if (
    ![settings.diffusivity, settings.dx, settings.dy, settings.dt].every(Number.isFinite) ||
    settings.diffusivity < 0 ||
    settings.dx <= 0 ||
    settings.dy <= 0 ||
    settings.dt <= 0
  )
    return false;
  const { rx, ry } = ratios(settings, stage);
  return Number.isFinite(rx + ry) && rx + ry <= 0.5;
}
export function applyBoundary(field: HeatField, settings: HeatSettings) {
  if (settings.boundary !== "cold") return;
  for (let y = 0; y < field.height; y += 1) {
    for (let x = 0; x < field.width; x += 1) {
      if (edge(field, x, y)) field.current[y * field.width + x] = 0;
    }
  }
}
/** Read one time level, write the other; never clamp the numerical solution. */
export function diffuse(field: HeatField, settings: HeatSettings, stage = 8) {
  if (stage < 3 || !stable(settings, stage)) return false;
  if (stage >= 5) applyBoundary(field, settings);
  const { rx, ry } = ratios(settings, stage);
  for (let y = 0; y < field.height; y += 1) {
    for (let x = 0; x < field.width; x += 1) {
      const index = y * field.width + x;
      if (stage >= 5 && settings.boundary === "cold" && edge(field, x, y)) {
        field.next[index] = 0;
        continue;
      }
      const center = sample(field, x, y);
      const horizontal = sample(field, x - 1, y) - 2 * center + sample(field, x + 1, y);
      const vertical = sample(field, x, y - 1) - 2 * center + sample(field, x, y + 1);
      field.next[index] = center + rx * horizontal + ry * vertical;
    }
  }
  const old = field.current;
  field.current = field.next;
  field.next = old;
  field.tick = (field.tick + 1) >>> 0;
  return true;
}
export function measure(field: HeatField) {
  let minimum = field.current[0],
    maximum = field.current[0],
    sum = 0;
  for (const value of field.current) {
    minimum = Math.min(minimum, value);
    maximum = Math.max(maximum, value);
    sum += value;
  }
  return { minimum, maximum, mean: sum / field.current.length, sum };
}
export function planSteps(accumulator: number, elapsed: number, dt: number) {
  if (!Number.isFinite(dt) || dt <= 0) return { steps: 0, remainder: 0, dropped: 0 };
  if (!Number.isFinite(accumulator) || accumulator < 0 || accumulator >= dt) accumulator = 0;
  if (!Number.isFinite(elapsed) || elapsed < 0) elapsed = 0;
  const accepted = Math.min(elapsed, 0.25);
  const total = accumulator + accepted;
  const due = Math.floor((total + 1e-10) / dt);
  const steps = Math.min(due, 8);
  return {
    steps,
    remainder: Math.max(0, total - due * dt),
    dropped: elapsed - accepted + (due - steps) * dt,
  };
}
export function validatePlate() {
  let field = makeField();
  const settings = defaultSettings();
  const initialSum = measure(field).sum;
  let conserved = true,
    bounded = true,
    coldEdges = true,
    maxSumError = 0;
  for (let step = 0; step < 120; step += 1) {
    const accepted = diffuse(field, settings);
    const stats = measure(field);
    maxSumError = Math.max(maxSumError, Math.abs(stats.sum - initialSum));
    conserved = conserved && accepted && maxSumError < 1e-9;
    bounded = bounded && stats.minimum >= -1e-12 && stats.maximum <= 1 + 1e-12;
  }
  settings.boundary = "cold";
  field = makeField(1);
  applyBoundary(field, settings);
  let previousSum = measure(field).sum;
  for (let step = 0; step < 120; step += 1) {
    diffuse(field, settings);
    const sum = measure(field).sum;
    coldEdges = coldEdges && sum <= previousSum + 1e-9;
    previousSum = sum;
    for (let y = 0; y < field.height; y += 1)
      for (let x = 0; x < field.width; x += 1)
        if (edge(field, x, y) && sample(field, x, y) !== 0) coldEdges = false;
  }
  return { conserved, bounded, coldEdges, maxSumError };
}
export function heatColor(value: number) {
  if (!Number.isFinite(value)) return [255, 0, 255];
  const t = Math.max(0, Math.min(1, value));
  return [Math.round(20 + 235 * t), Math.round(35 + 175 * t), Math.round(90 - 50 * t)];
}
export function viewport(width: number, height: number) {
  const scale = Math.min(width / 64, height / 48);
  return { scale, x: (width - scale * 64) / 2, y: (height - scale * 48) / 2 };
}
export function pointerCell(width: number, height: number, px: number, py: number) {
  const view = viewport(width, height);
  const x = Math.floor((px - view.x) / view.scale),
    y = Math.floor((py - view.y) / view.scale);
  if (!Number.isFinite(x) || !Number.isFinite(y) || x < 0 || y < 0 || x >= 64 || y >= 48)
    return null;
  return { x, y };
}
