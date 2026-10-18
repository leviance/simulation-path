export type PixelPattern = "solid" | "gradient" | "checker" | "noise";
export type RgbaChannels = { r: number; g: number; b: number; a: number };
export type PixelBuffer = { width: number; height: number; pixels: Uint32Array };

export const maximumPixelCount = 16 * 1024 * 1024;

export function packRgba(red: number, green: number, blue: number, alpha = 255): number {
  for (const channel of [red, green, blue, alpha]) {
    if (!Number.isInteger(channel) || channel < 0 || channel > 255) {
      throw new RangeError("RGBA channels must be integers from 0 to 255");
    }
  }
  return ((red << 24) | (green << 16) | (blue << 8) | alpha) >>> 0;
}

export function unpackRgba(color: number): RgbaChannels {
  return { r: color >>> 24, g: (color >>> 16) & 255, b: (color >>> 8) & 255, a: color & 255 };
}

export function createPixelBuffer(width: number, height: number): PixelBuffer {
  if (
    !Number.isInteger(width) ||
    !Number.isInteger(height) ||
    width <= 0 ||
    height <= 0 ||
    width > maximumPixelCount / height
  ) {
    throw new RangeError("Positive dimensions and at most 16777216 pixels are required");
  }
  return { width, height, pixels: new Uint32Array(width * height) };
}

// Như C++: chỉ gọi index sau khi đã xác nhận tọa độ hợp lệ.
export function pixelIndex(width: number, x: number, y: number): number {
  return y * width + x;
}

export function containsPixel(buffer: PixelBuffer, x: number, y: number): boolean {
  return (
    Number.isInteger(x) &&
    Number.isInteger(y) &&
    x >= 0 &&
    y >= 0 &&
    x < buffer.width &&
    y < buffer.height
  );
}

// Giá trị trả về chỉ giúp giao diện báo phép ghi được nhận hay bị bỏ qua.
export function putPixel(buffer: PixelBuffer, x: number, y: number, color: number): boolean {
  if (!containsPixel(buffer, x, y)) return false;
  buffer.pixels[pixelIndex(buffer.width, x, y)] = color;
  return true;
}

export function paintPixelPattern(
  buffer: PixelBuffer,
  pattern: PixelPattern,
  options: { color?: number; cell?: number; seed?: number } = {},
): void {
  if (pattern === "solid") {
    buffer.pixels.fill(options.color ?? packRgba(83, 240, 174));
    return;
  }
  if (pattern === "noise") {
    let state = (options.seed ?? 17) >>> 0;
    // Một lượt duyệt, không tạo lại toàn bộ chuỗi cho từng pixel.
    for (let index = 0; index < buffer.pixels.length; index += 1) {
      state = (Math.imul(state, 1_664_525) + 1_013_904_223) >>> 0;
      const value = state >>> 24;
      buffer.pixels[index] = packRgba(value, Math.floor(value / 2), 255 - value);
    }
    return;
  }
  const cell = Math.max(1, Math.trunc(options.cell ?? 32));
  if (!Number.isFinite(cell)) throw new RangeError("Cell size must be finite");
  for (let y = 0; y < buffer.height; y += 1) {
    for (let x = 0; x < buffer.width; x += 1) {
      let color: number;
      if (pattern === "gradient") {
        const red = Math.floor((255 * x) / Math.max(1, buffer.width - 1));
        const green = Math.floor((255 * y) / Math.max(1, buffer.height - 1));
        color = packRgba(red, green, 180);
      } else {
        const odd = (Math.floor(x / cell) + Math.floor(y / cell)) % 2 !== 0;
        color = odd ? packRgba(31, 43, 68) : packRgba(83, 240, 174);
      }
      putPixel(buffer, x, y, color);
    }
  }
}

export function packedHex(color: number): string {
  return `0x${(color >>> 0).toString(16).toUpperCase().padStart(8, "0")}`;
}
