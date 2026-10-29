import { defaultSpeeds, type ShaderEffect, type UniformSnapshot } from "./types.ts";

export type ShaderColor = [number, number, number];

export function smoothRange(low: number, high: number, value: number): number {
  const t = Math.max(0, Math.min(1, (value - low) / (high - low)));
  return t * t * (3 - 2 * t);
}

function mixColor(a: ShaderColor, b: ShaderColor, t: number): ShaderColor {
  return a.map((channel, index) => channel + (b[index] - channel) * t) as ShaderColor;
}

// Math.imul preserves the uint32 overflow used by the GLSL and C++ hash.
export function hashCell(x: number, y: number): number {
  let hash = (Math.imul(x, 374761393) + Math.imul(y, 668265263)) >>> 0;
  hash = Math.imul(hash ^ (hash >>> 13), 1274126177) >>> 0;
  hash ^= hash >>> 16;
  return (hash & 65535) / 65535;
}

export function valueNoise(x: number, y: number): number {
  const cellX = Math.floor(x);
  const cellY = Math.floor(y);
  const fx = smoothRange(0, 1, x - cellX);
  const fy = smoothRange(0, 1, y - cellY);
  const bottom = hashCell(cellX, cellY) * (1 - fx) + hashCell(cellX + 1, cellY) * fx;
  const top = hashCell(cellX, cellY + 1) * (1 - fx) + hashCell(cellX + 1, cellY + 1) * fx;
  return bottom * (1 - fy) + top * fy;
}

export function fbm(x: number, y: number): number {
  let value = 0;
  let amplitude = 0.5;
  for (let octave = 0; octave < 5; octave += 1) {
    value += amplitude * valueNoise(x, y);
    x = x * 2.03 + 1.7;
    y = y * 2.03 - 2.1;
    amplitude *= 0.5;
  }
  return value;
}

export function mandelbrotOrbit(cx: number, cy: number) {
  let x = 0;
  let y = 0;
  let escaped = 0;
  for (let iteration = 0; iteration < 128; iteration += 1) {
    const nextX = x * x - y * y + cx;
    y = 2 * x * y + cy;
    x = nextX;
    if (x * x + y * y > 4) {
      escaped = iteration + 1;
      break;
    }
  }
  return { x, y, escaped };
}

// CPU teaching reference, not a GLSL interpreter. x/y are physical pixel
// centers with an OpenGL bottom-left origin, just like shader_effects.hpp.
export function referenceShaderColor(
  effect: ShaderEffect,
  x: number,
  y: number,
  uniforms: UniformSnapshot,
  speed = defaultSpeeds[effect],
): ShaderColor {
  const u = uniforms;
  const uvX = x / u.width;
  const uvY = y / u.height;
  const mouseX = u.mouseX / u.width;
  const mouseY = u.mouseY / u.height;
  const unit = Math.min(u.width, u.height);
  const px = (2 * x - u.width) / unit;
  const py = (2 * y - u.height) / unit;
  let color: ShaderColor;

  if (effect === "gradient") {
    const phase = uvY + 0.18 * Math.sin(uvX * 5 * u.zoom + u.time * speed);
    const glow = Math.exp(-20 * ((uvX - mouseX) ** 2 + (uvY - mouseY) ** 2));
    const dark = [0.025, 0.045, 0.13];
    const offsets = [0, 0.24, 0.44];
    const light = [0.12, 0.19, 0.2];
    color = dark.map((channel, index) => {
      const palette = 0.5 + 0.5 * Math.cos(6.2831853 * (phase + offsets[index]));
      return channel + (palette - channel) * (0.25 + 0.65 * uvY) + light[index] * glow;
    }) as ShaderColor;
  } else if (effect === "circle") {
    const centerX = ((2 * u.mouseX - u.width) / unit) * 0.55;
    const centerY = ((2 * u.mouseY - u.height) / unit) * 0.55;
    const distance = Math.hypot(px - centerX, py - centerY);
    const edge = distance - 0.5 * Math.sqrt(u.zoom);
    const aa = 2 / unit;
    const disc = 1 - smoothRange(-aa, aa, edge);
    const glow = Math.exp(-Math.abs(edge) * 18);
    const waves = 0.5 + 0.5 * Math.cos(distance * 22 - u.time * speed * 6);
    const inside = mixColor([0.08, 0.2, 0.45], [0.13, 0.65, 0.78], waves);
    const rim = [0.3, 0.75, 0.95];
    color = [0.025, 0.04, 0.095].map(
      (channel, index) => channel + disc * inside[index] + rim[index] * glow * 0.65,
    ) as ShaderColor;
  } else if (effect === "mandelbrot") {
    const orbit = mandelbrotOrbit(
      -0.6 + px * (1.35 / u.zoom) + (mouseX - 0.5) * 0.7,
      py * (1.35 / u.zoom) + (mouseY - 0.5) * 0.5,
    );
    color = [0.012, 0.018, 0.045];
    if (orbit.escaped > 0) {
      const smoothCount =
        orbit.escaped + 1 - Math.log2(Math.max(0.001, Math.log2(Math.hypot(orbit.x, orbit.y))));
      const phase = 0.035 * smoothCount + u.time * speed;
      color = [0, 0.18, 0.39].map(
        (offset) =>
          (0.5 + 0.5 * Math.cos(6.2831853 * (phase + offset))) *
          (0.45 + 0.55 * (1 - Math.exp(-orbit.escaped * 0.08))),
      ) as ShaderColor;
    }
  } else {
    const nx = px * 2.2 * u.zoom + (mouseX - 0.5) * 2;
    const ny = py * 2.2 * u.zoom + (mouseY - 0.5) * 2;
    const flowX = u.time * speed;
    const flowY = -u.time * speed * 0.7;
    const warp = fbm(nx + flowX, ny + flowY);
    const noise = fbm(nx + warp * 2.5 - flowX, ny - warp * 1.8 - flowY);
    const base = mixColor([0.025, 0.045, 0.13], [0.09, 0.69, 0.72], smoothRange(0.15, 0.78, noise));
    color = [0.82, 0.37, 0.12].map(
      (warm, index) => base[index] + warm * Math.max(0, noise) ** 5,
    ) as ShaderColor;
  }
  return color.map((channel) => Math.max(0, Math.min(1, channel))) as ShaderColor;
}
