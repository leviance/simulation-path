// Seed positions once. Rendering and the force solvers only ever see the live bodies.
const turn = 2 * Math.PI;
interface RandomSource {
  unit(): number;
}

export function sampleDiskRadius(unit: number) {
  const scale = 0.47,
    rim = 1.82;
  const cumulative = (x: number) => 1 - (1 + x) * Math.exp(-x);
  const target = unit * cumulative(rim / scale);
  let low = 0,
    high = rim;
  for (let pass = 0; pass < 16; pass++) {
    const middle = (low + high) / 2;
    if (cumulative(middle / scale) < target) low = middle;
    else high = middle;
  }
  return (low + high) / 2;
}

function smoothBand(t: number) {
  t = Math.min(1, Math.max(0, t));
  return t * t * (3 - 2 * t);
}

export function spiralRing(r: number) {
  const armA = 0.55 + 4.25 * Math.log1p(r / 0.27) + 0.16 * Math.sin(6.2 * r);
  const armB = 3.92 + 3.65 * Math.log1p(r / 0.22) - 0.2 * Math.sin(5.3 * r + 0.5);
  return {
    armA,
    armB,
    spurA: armA + 1.75 * (r - 0.56),
    spurB: armB - 1.95 * (r - 0.36),
    width: 0.22 + 0.12 / (r + 0.3),
    strengthA: 0.72 + 0.24 * Math.cos(10 * r + 0.4),
    strengthB: 0.65 + 0.22 * Math.sin(13 * r - 0.7),
    branchA: 0.67 * smoothBand((r - 0.56) / 0.27) * smoothBand((1.65 - r) / 0.44),
    branchB: 0.58 * smoothBand((r - 0.36) / 0.23) * smoothBand((1.14 - r) / 0.33),
    contrast: smoothBand((r - 0.12) / 0.3) * (1 - 0.45 * smoothBand((r - 1.4) / 0.42)),
  };
}

function ridgeAt(angle: number, center: number, width: number) {
  const turns = (angle - center) / turn;
  const offset = (turn * (turns - Math.floor(turns + 0.5))) / width;
  return Math.max(0, 1 - offset * offset) ** 2;
}

export function diskDensity(ring: ReturnType<typeof spiralRing>, angle: number) {
  const main =
    ring.strengthA * ridgeAt(angle, ring.armA, ring.width) +
    ring.strengthB * ridgeAt(angle, ring.armB, 1.22 * ring.width);
  const branches =
    ring.branchA * ridgeAt(angle, ring.spurA, 0.75 * ring.width) +
    ring.branchB * ridgeAt(angle, ring.spurB, 0.9 * ring.width);
  return 0.115 + ring.contrast * (main + branches);
}

export function sampleGalaxyPoint(id: number, random: RandomSource) {
  const radial = random.unit();
  const bulge = id % 5 === 0;
  const halo = !bulge && id % 23 === 0;
  if (bulge || halo) {
    let radius = 0.48 + 1.18 * Math.sqrt(radial),
      flatten = 0.86;
    if (bulge) {
      const scale = 0.16,
        rim = 0.66;
      const q = (Math.cbrt(radial) * rim) / Math.hypot(rim, scale);
      radius = (scale * q) / Math.sqrt(1 - q * q);
      flatten = 0.76;
    }
    const angle = turn * random.unit(),
      cosine = 2 * random.unit() - 1;
    return {
      planarRadius: radius * Math.sqrt(1 - cosine * cosine),
      angle,
      height: radius * cosine * flatten,
      speedRadius: Math.max(0.06, radius),
      verticalSpread: 0.36,
    };
  }
  const radius = sampleDiskRadius(radial),
    ring = spiralRing(radius);
  let angle = turn * random.unit();
  for (let attempt = 0; attempt < 32; attempt++) {
    const candidate = turn * random.unit();
    if (2.05 * random.unit() < diskDensity(ring, candidate)) {
      angle = candidate;
      break;
    }
  }
  const zNoise = 2 * (random.unit() + random.unit() + random.unit() - 1.5);
  const height = (0.03 + 0.03 * radius) * zNoise + 0.014 * radius * radius * Math.sin(angle - 0.65);
  return {
    planarRadius: radius,
    angle,
    height,
    speedRadius: Math.max(0.06, radius),
    verticalSpread: 0.045,
  };
}
