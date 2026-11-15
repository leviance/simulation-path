export type Boundary = "insulated" | "rim";
export type BrushMode = "temperature" | "heater" | "unpin";
export type Point = { x: number; y: number };
export type HeatSettings = {
  diffusivity: number;
  dt: number;
  dx: number;
  dy: number;
  boundary: Boundary;
  experiment: boolean;
};
export type HeatField = {
  width: number;
  height: number;
  current: Float64Array;
  next: Float64Array;
  pins: Int8Array;
  tick: number;
  time: number;
  experimentSteps: number;
};

export const defaultSettings = (): HeatSettings => ({
  diffusivity: 1.5,
  dt: 1 / 30,
  dx: 0.5,
  dy: 0.5,
  boundary: "insulated",
  experiment: false,
});

export function createField(width = 32, height = 32): HeatField {
  if (![width, height].every((value) => Number.isInteger(value) && value >= 1 && value <= 512))
    throw new Error("Mỗi chiều lưới phải là số nguyên từ 1 đến 512.");
  const size = width * height;
  return {
    width,
    height,
    current: new Float64Array(size),
    next: new Float64Array(size),
    pins: new Int8Array(size).fill(-1),
    tick: 0,
    time: 0,
    experimentSteps: 0,
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

export function applyBoundary(field: HeatField, settings: HeatSettings) {
  if (settings.boundary !== "rim") return;
  for (let y = 0; y < field.height; y++) {
    for (let x = 0; x < field.width; x++) {
      if (!edge(field, x, y)) continue;
      const index = y * field.width + x;
      field.current[index] = 0;
      field.pins[index] = -1;
    }
  }
}

export function paintDisk(
  field: HeatField,
  settings: HeatSettings,
  cx: number,
  cy: number,
  radius: number,
  value: number,
  mode: BrushMode = "temperature",
  stage = 9,
) {
  if (!contains(field, cx, cy) || !Number.isFinite(value) || !Number.isFinite(radius)) return;
  radius = Math.max(0, Math.min(24, Math.floor(radius)));
  value = Math.max(0, Math.min(1, value));
  for (let offsetY = -radius; offsetY <= radius; offsetY++) {
    for (let offsetX = -radius; offsetX <= radius; offsetX++) {
      const x = cx + offsetX;
      const y = cy + offsetY;
      if (offsetX * offsetX + offsetY * offsetY > radius * radius || !contains(field, x, y))
        continue;
      const index = y * field.width + x;
      if (stage >= 5) {
        if (settings.boundary === "rim" && edge(field, x, y)) {
          field.current[index] = 0;
          field.pins[index] = -1;
          continue;
        }
        if (mode === "unpin") {
          field.pins[index] = -1;
          continue;
        }
        field.pins[index] = -1;
        if (mode === "heater") field.pins[index] = Number(value >= 0.5);
      }
      field.current[index] = value;
    }
  }
}

export function paintStroke(
  field: HeatField,
  settings: HeatSettings,
  from: Point,
  to: Point,
  radius: number,
  value: number,
  mode: BrushMode = "temperature",
  stage = 9,
) {
  if (!contains(field, from.x, from.y) || !contains(field, to.x, to.y)) return;
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const steps = Math.max(Math.abs(dx), Math.abs(dy));
  if (steps === 0) {
    paintDisk(field, settings, to.x, to.y, radius, value, mode, stage);
    return;
  }
  for (let step = 0; step <= steps; step++) {
    const fraction = step / steps;
    paintDisk(
      field,
      settings,
      Math.round(from.x + fraction * dx),
      Math.round(from.y + fraction * dy),
      radius,
      value,
      mode,
      stage,
    );
  }
}

export function measure(field: HeatField, settings: HeatSettings) {
  let minimum = field.current[0];
  let maximum = minimum;
  let sum = 0;
  let correction = 0;
  let activePins = 0;
  let finite = true;
  for (let index = 0; index < field.current.length; index++) {
    const value = field.current[index];
    if (!Number.isFinite(value)) {
      finite = false;
      continue;
    }
    minimum = Math.min(minimum, value);
    maximum = Math.max(maximum, value);
    const adjusted = value - correction;
    const total = sum + adjusted;
    correction = total - sum - adjusted;
    sum = total;
    if (field.pins[index] !== -1) activePins++;
  }
  const integral = sum * settings.dx * settings.dy;
  return {
    minimum,
    maximum,
    sum,
    mean: sum / field.current.length,
    integral,
    activePins,
    finite: finite && Number.isFinite(integral),
  };
}
