import type { HeatField } from "./model.ts";
type Rgb = readonly [number, number, number];
const palette: readonly Rgb[] = [
  [9, 21, 42],
  [18, 77, 129],
  [22, 155, 177],
  [246, 184, 70],
  [241, 98, 45],
  [255, 245, 205],
];
function mix(first: Rgb, second: Rgb, fraction: number): number[] {
  fraction = Math.max(0, Math.min(1, fraction));
  return first.map((value, index) => Math.round(value + (second[index] - value) * fraction));
}
export function heatColor(theta: number, experiment = false) {
  if (!Number.isFinite(theta)) return [255, 0, 255];
  if (experiment) {
    if (theta < 0.5) return mix([34, 106, 214], [212, 220, 231], (theta + 1) / 1.5);
    return mix([212, 220, 231], [242, 78, 51], (theta - 0.5) / 1.5);
  }
  const position = Math.max(0, Math.min(1, theta)) * 5;
  const segment = Math.min(4, Math.floor(position));
  return mix(palette[segment], palette[segment + 1], position - segment);
}
export function encodeRgba(
  field: HeatField,
  bytes: Uint8ClampedArray,
  experiment: boolean,
  showPins: boolean,
) {
  if (bytes.length !== field.current.length * 4)
    throw new Error("Ảnh RGBA phải có đúng bốn byte cho mỗi ô.");
  for (let y = 0; y < field.height; y++) {
    for (let x = 0; x < field.width; x++) {
      const index = y * field.width + x;
      let color = heatColor(field.current[index], experiment);
      if (showPins && field.pins[index] !== -1 && (x + y) % 4 === 0) color = [255, 255, 255];
      bytes[index * 4] = color[0];
      bytes[index * 4 + 1] = color[1];
      bytes[index * 4 + 2] = color[2];
      bytes[index * 4 + 3] = 255;
    }
  }
}
