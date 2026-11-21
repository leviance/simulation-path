// One coarse exposure of the same stars as the sharp image. No procedural sky.
// The padding allows light from a star just outside the viewport to cross its edge.
const margin = 10;
export function createLightField(width: number, height: number) {
  const cell = Math.max(3, Math.min(8, Math.round(height / 112)));
  const columns = Math.ceil(width / cell) + 2 * margin + 1;
  const rows = Math.ceil(height / cell) + 2 * margin + 1;
  const length = columns * rows * 3;
  return {
    cell,
    columns,
    rows,
    detail: new Float32Array(length),
    scratch: new Float32Array(length),
    veil: new Float32Array(length),
  };
}
export type GalaxyLightField = ReturnType<typeof createLightField>;

export function exposeStar(
  field: GalaxyLightField,
  x: number,
  y: number,
  red: number,
  green: number,
  blue: number,
) {
  const u = x / field.cell + margin - 0.5;
  const v = y / field.cell + margin - 0.5;
  const ix = Math.floor(u),
    iy = Math.floor(v);
  if (ix < 0 || iy < 0 || ix + 1 >= field.columns || iy + 1 >= field.rows) return;
  const fx = u - ix,
    fy = v - iy;
  // Bilinear deposition: a moving star never jumps bodily from one cell to the next.
  for (let dy = 0; dy <= 1; ++dy) {
    for (let dx = 0; dx <= 1; ++dx) {
      const weight = (dx === 0 ? 1 - fx : fx) * (dy === 0 ? 1 - fy : fy);
      const i = 3 * ((iy + dy) * field.columns + ix + dx);
      field.detail[i] += red * weight;
      field.detail[i + 1] += green * weight;
      field.detail[i + 2] += blue * weight;
    }
  }
}

function boxPass(
  input: Float32Array,
  output: Float32Array,
  length: number,
  lines: number,
  stride: number,
  lineStep: number,
  radius: number,
  centerWeight: number,
) {
  const inverse = 1 / (2 * radius + 1 + centerWeight);
  for (let line = 0; line < lines; ++line) {
    const base = line * lineStep;
    let red = 0,
      green = 0,
      blue = 0;
    for (let tap = 0; tap <= radius && tap < length; ++tap) {
      const i = base + tap * stride;
      red += input[i];
      green += input[i + 1];
      blue += input[i + 2];
    }
    for (let j = 0; j < length; ++j) {
      const i = base + j * stride;
      output[i] = (red + centerWeight * input[i]) * inverse;
      output[i + 1] = (green + centerWeight * input[i + 1]) * inverse;
      output[i + 2] = (blue + centerWeight * input[i + 2]) * inverse;
      if (j >= radius) {
        const leaving = i - radius * stride;
        red -= input[leaving];
        green -= input[leaving + 1];
        blue -= input[leaving + 2];
      }
      if (j + radius + 1 < length) {
        const entering = i + (radius + 1) * stride;
        red += input[entering];
        green += input[entering + 1];
        blue += input[entering + 2];
      }
    }
  }
}

function gather(
  field: GalaxyLightField,
  input: Float32Array,
  output: Float32Array,
  radius: number,
  centerWeight = 0,
) {
  const { columns, rows, scratch } = field;
  boxPass(input, scratch, columns, rows, 3, 3 * columns, radius, centerWeight);
  boxPass(scratch, output, rows, columns, 3 * columns, 3, radius, centerWeight);
}

function densityGain(samples: Float32Array, i: number, floor: number, knee: number) {
  const mean = (samples[i] + samples[i + 1] + samples[i + 2]) / 3;
  const excess = Math.max(0, mean - floor);
  return excess / (excess + knee);
}

export function developField(
  field: GalaxyLightField,
  light: Float32Array,
  width: number,
  height: number,
) {
  const { columns, cell, detail, veil } = field;
  // Keep the structure of nearby knots; two broader passes collect the faint disc.
  gather(field, detail, detail, 1, 1);
  gather(field, detail, veil, 3);
  gather(field, veil, veil, 3);
  for (let i = 0; i < detail.length; i += 3) {
    const local = detail[i] + detail[i + 1] + detail[i + 2];
    const envelope = veil[i] + veil[i + 1] + veil[i + 2];
    const ridge = Math.max(0, Math.min(1, (local - 0.3 * envelope) / (0.16 + 0.7 * envelope)));
    const neighbours = densityGain(veil, i, 0.024, 0.095);
    const narrow = 0.36 * neighbours * densityGain(detail, i, 0.055, 0.45);
    const wide = (0.075 + 0.12 * ridge) * densityGain(veil, i, 0.018, 0.38);
    for (let c = 0; c < 3; ++c) detail[i + c] = detail[i + c] * narrow + veil[i + c] * wide;
  }
  for (let y = 0; y < height; ++y) {
    const v = (y + 0.5) / cell + margin - 0.5,
      iy = Math.floor(v),
      fy = v - iy;
    for (let x = 0; x < width; ++x) {
      const u = (x + 0.5) / cell + margin - 0.5,
        ix = Math.floor(u),
        fx = u - ix;
      const a = 3 * (iy * columns + ix),
        b = a + 3 * columns;
      const pixel = 3 * (y * width + x);
      for (let c = 0; c < 3; ++c) {
        const top = detail[a + c] + fx * (detail[a + 3 + c] - detail[a + c]);
        const bottom = detail[b + c] + fx * (detail[b + 3 + c] - detail[b + c]);
        light[pixel + c] += top + fy * (bottom - top);
      }
    }
  }
}
