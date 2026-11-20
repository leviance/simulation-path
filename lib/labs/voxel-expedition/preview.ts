import { trace, type Point, type View } from "./bank.ts";

function hash(x: number, z: number) {
  let b = (Math.imul(x, 0x8da6b343) ^ (Math.imul(z, 0xd8163841) + Math.imul(31, 0xcb1ab31f))) >>> 0;
  b = Math.imul((b ^ (b >>> 16)) >>> 0, 0x7feb352d) >>> 0;
  return (b ^ (b >>> 15)) >>> 0;
}
const base = [
  [0, 0, 0],
  [117, 159, 67],
  [133, 94, 65],
  [143, 148, 151],
  [224, 202, 145],
  [126, 86, 49],
  [77, 133, 57],
  [64, 153, 170],
];
const light = [0.61, 0.88, 1.04, 0.55, 0.61, 0.75];
export function bankImage(cells: Uint8Array, view: View, width: number, height: number) {
  const pixels = new Uint8ClampedArray(width * height * 4);
  const sy = Math.sin(view.yaw),
    cy = Math.cos(view.yaw),
    sp = Math.sin(view.pitch),
    cp = Math.cos(view.pitch);
  const focal = (0.5 * height) / Math.tan((65 * Math.PI) / 360);
  const d: Point = [0, 0, 0];
  for (let y = 0; y < height; y++) {
    const v = (height * 0.5 - y - 0.5) / focal;
    for (let x = 0; x < width; x++) {
      const u = (x + 0.5 - width * 0.5) / focal;
      d[0] = sy * cp + cy * u - sy * sp * v;
      d[1] = sp + cp * v;
      d[2] = cy * cp - sy * u - cy * sp * v;
      const hit = trace(cells, view.eye, d);
      const i = 4 * (y * width + x);
      if (!hit) {
        const t = Math.max(0, Math.min(1, (d[1] + 0.04) / 0.87));
        pixels[i] = 204 - 118 * t;
        pixels[i + 1] = 226 - 68 * t;
        pixels[i + 2] = 224 - 16 * t;
      } else {
        const { face, block } = hit;
        const wx = view.eye[0] + d[0] * hit.t,
          wy = view.eye[1] + d[1] * hit.t,
          wz = view.eye[2] + d[2] * hit.t;
        const tx = Math.floor((face < 2 ? wz : wx) * 16) & 15,
          ty = Math.floor((face === 2 || face === 3 ? wz : wy) * 16) & 15;
        let color = base[block],
          n = (hash(tx, ty) % 19) - 9;
        if (block === 1 && face !== 2 && (face === 3 || ty < 11)) color = base[2];
        if (block === 5) n += (hash(tx >> 1, ty >> 2) % 30) - 14;
        if (block === 7) n = n / 3 + ((ty + (tx >> 2)) % 8 === 0 ? 9 : 0);
        const s = light[face];
        pixels[i] = (color[0] + n) * s;
        pixels[i + 1] = (color[1] + n) * s;
        pixels[i + 2] = (color[2] + n) * s;
      }
      pixels[i + 3] = 255;
    }
  }
  return pixels;
}
