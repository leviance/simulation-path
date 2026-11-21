// A small screen-space exposure buffer. It starts empty every frame, and
// receives light only from droplets which passed this camera's depth test.
const cell = 6;
const kernel = [1, 4, 6, 4, 1];

export class SprayLight {
  columns: number;
  rows: number;
  light: Float32Array;
  across: Float32Array;
  smooth: Float32Array;
  count = 0;

  constructor(width: number, height: number) {
    this.columns = Math.ceil(width / cell) + 1;
    this.rows = Math.ceil(height / cell) + 1;
    const size = this.columns * this.rows;
    this.light = new Float32Array(size);
    this.across = new Float32Array(size);
    this.smooth = new Float32Array(size);
  }

  clear() {
    this.light.fill(0);
    this.count = 0;
  }

  record(x: number, y: number, brightness: number) {
    const u = x / cell,
      v = y / cell;
    const column = Math.floor(u),
      row = Math.floor(v);
    const fx = u - column,
      fy = v - row;
    const base = row * this.columns + column;
    this.light[base] += brightness * (1 - fx) * (1 - fy);
    this.light[base + 1] += brightness * fx * (1 - fy);
    this.light[base + this.columns] += brightness * (1 - fx) * fy;
    this.light[base + this.columns + 1] += brightness * fx * fy;
    this.count++;
  }

  develop(pixels: Uint32Array, width: number, height: number) {
    if (!this.count) return;
    const { columns, rows, across, light, smooth } = this;
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < columns; col++) {
        let sum = 0;
        for (let k = -2; k <= 2; k++)
          sum += kernel[k + 2] * light[row * columns + Math.max(0, Math.min(columns - 1, col + k))];
        across[row * columns + col] = sum / 16;
      }
    }
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < columns; col++) {
        let sum = 0;
        for (let k = -2; k <= 2; k++)
          sum += kernel[k + 2] * across[Math.max(0, Math.min(rows - 1, row + k)) * columns + col];
        smooth[row * columns + col] = sum / (16 + sum);
      }
    }
    for (let y = 0; y < height; y++) {
      const fy = (y % cell) / cell;
      const row = Math.floor(y / cell) * columns;
      for (let x = 0; x < width; x += cell) {
        const i = row + x / cell;
        const left = smooth[i] + fy * (smooth[i + columns] - smooth[i]);
        const right = smooth[i + 1] + fy * (smooth[i + 1 + columns] - smooth[i + 1]);
        if (Math.max(left, right) < 0.01) continue;
        for (let offset = 0; offset < cell && x + offset < width; offset++) {
          const strength = left + ((right - left) * offset) / cell;
          const index = y * width + x + offset;
          const old = pixels[index];
          const r = Math.min(255, (old & 255) + 32 * strength);
          const g = Math.min(255, ((old >>> 8) & 255) + 42 * strength);
          const b = Math.min(255, ((old >>> 16) & 255) + 46 * strength);
          pixels[index] = 0xff000000 | (b << 16) | (g << 8) | r;
        }
      }
    }
  }
}
