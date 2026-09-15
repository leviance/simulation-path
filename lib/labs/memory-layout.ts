export const particleFieldNames = ["px", "py", "pz", "vx", "vy", "vz"] as const;

export type ParticleField = (typeof particleFieldNames)[number];
export type MemoryLayout = "aos" | "soa";
export type MemoryWorkload = "position-x" | "velocity-only" | "integrate";

export interface ParticlesAoS {
  count: number;
  data: Float32Array;
}

export interface ParticlesSoA {
  count: number;
  px: Float32Array;
  py: Float32Array;
  pz: Float32Array;
  vx: Float32Array;
  vy: Float32Array;
  vz: Float32Array;
}

export interface MemoryTrafficEstimate {
  layout: MemoryLayout;
  workload: MemoryWorkload;
  particleCount: number;
  fieldCount: number;
  usefulBytes: number;
  cacheLines: number;
  loadedBytes: number;
  efficiency: number;
}

const fieldsPerParticle = particleFieldNames.length;
const bytesPerFloat = Float32Array.BYTES_PER_ELEMENT;

class XorShift32 {
  private state: number;

  constructor(seed: number) {
    this.state = seed >>> 0;
    if (this.state === 0) this.state = 0x6d2b79f5;
  }

  nextU32() {
    let value = this.state;
    value ^= value << 13;
    value ^= value >>> 17;
    value ^= value << 5;
    this.state = value >>> 0;
    return this.state;
  }

  nextSigned() {
    return Math.fround((this.nextU32() / 0xffffffff) * 2 - 1);
  }
}

export function makeParticlesAoS(count: number, seed: number): ParticlesAoS {
  const safeCount = Math.max(0, Math.floor(count));
  const data = new Float32Array(safeCount * fieldsPerParticle);
  const random = new XorShift32(seed);
  for (let index = 0; index < safeCount; index += 1) {
    const base = index * fieldsPerParticle;
    data[base] = random.nextSigned();
    data[base + 1] = random.nextSigned();
    data[base + 2] = random.nextSigned();
    data[base + 3] = Math.fround(random.nextSigned() * 0.35);
    data[base + 4] = Math.fround(random.nextSigned() * 0.35);
    data[base + 5] = Math.fround(random.nextSigned() * 0.35);
  }
  return { count: safeCount, data };
}

export function makeParticlesSoA(aos: ParticlesAoS): ParticlesSoA {
  const soa: ParticlesSoA = {
    count: aos.count,
    px: new Float32Array(aos.count),
    py: new Float32Array(aos.count),
    pz: new Float32Array(aos.count),
    vx: new Float32Array(aos.count),
    vy: new Float32Array(aos.count),
    vz: new Float32Array(aos.count),
  };
  for (let index = 0; index < aos.count; index += 1) {
    const base = index * fieldsPerParticle;
    soa.px[index] = aos.data[base];
    soa.py[index] = aos.data[base + 1];
    soa.pz[index] = aos.data[base + 2];
    soa.vx[index] = aos.data[base + 3];
    soa.vy[index] = aos.data[base + 4];
    soa.vz[index] = aos.data[base + 5];
  }
  return soa;
}

export function cloneParticlesAoS(particles: ParticlesAoS): ParticlesAoS {
  return { count: particles.count, data: particles.data.slice() };
}

export function cloneParticlesSoA(particles: ParticlesSoA): ParticlesSoA {
  return {
    count: particles.count,
    px: particles.px.slice(),
    py: particles.py.slice(),
    pz: particles.pz.slice(),
    vx: particles.vx.slice(),
    vy: particles.vy.slice(),
    vz: particles.vz.slice(),
  };
}

function wrapCoordinate(value: number) {
  let wrapped = value;
  if (wrapped > 1) wrapped -= 2;
  if (wrapped < -1) wrapped += 2;
  return Math.fround(wrapped);
}

export function integrateAoS(particles: ParticlesAoS, dt: number) {
  const step = Math.fround(dt);
  for (let index = 0; index < particles.count; index += 1) {
    const base = index * fieldsPerParticle;
    particles.data[base] = wrapCoordinate(
      Math.fround(particles.data[base] + Math.fround(particles.data[base + 3] * step)),
    );
    particles.data[base + 1] = wrapCoordinate(
      Math.fround(particles.data[base + 1] + Math.fround(particles.data[base + 4] * step)),
    );
    particles.data[base + 2] = wrapCoordinate(
      Math.fround(particles.data[base + 2] + Math.fround(particles.data[base + 5] * step)),
    );
  }
}

export function integrateSoA(particles: ParticlesSoA, dt: number) {
  const step = Math.fround(dt);
  for (let index = 0; index < particles.count; index += 1) {
    particles.px[index] = wrapCoordinate(
      Math.fround(particles.px[index] + Math.fround(particles.vx[index] * step)),
    );
    particles.py[index] = wrapCoordinate(
      Math.fround(particles.py[index] + Math.fround(particles.vy[index] * step)),
    );
    particles.pz[index] = wrapCoordinate(
      Math.fround(particles.pz[index] + Math.fround(particles.vz[index] * step)),
    );
  }
}

export function sumPositionXAoS(particles: ParticlesAoS) {
  let sum = 0;
  for (let index = 0; index < particles.count; index += 1) {
    sum += particles.data[index * fieldsPerParticle];
  }
  return sum;
}

export function sumPositionXSoA(particles: ParticlesSoA) {
  let sum = 0;
  for (let index = 0; index < particles.count; index += 1) sum += particles.px[index];
  return sum;
}

export function dampVelocitiesAoS(particles: ParticlesAoS, factor: number) {
  const damping = Math.fround(factor);
  for (let index = 0; index < particles.count; index += 1) {
    const base = index * fieldsPerParticle;
    particles.data[base + 3] = Math.fround(particles.data[base + 3] * damping);
    particles.data[base + 4] = Math.fround(particles.data[base + 4] * damping);
    particles.data[base + 5] = Math.fround(particles.data[base + 5] * damping);
  }
}

export function dampVelocitiesSoA(particles: ParticlesSoA, factor: number) {
  const damping = Math.fround(factor);
  for (let index = 0; index < particles.count; index += 1) {
    particles.vx[index] = Math.fround(particles.vx[index] * damping);
    particles.vy[index] = Math.fround(particles.vy[index] * damping);
    particles.vz[index] = Math.fround(particles.vz[index] * damping);
  }
}

export function maximumLayoutDifference(aos: ParticlesAoS, soa: ParticlesSoA) {
  if (aos.count !== soa.count) return Number.POSITIVE_INFINITY;
  let maximum = 0;
  for (let index = 0; index < aos.count; index += 1) {
    const base = index * fieldsPerParticle;
    for (let field = 0; field < fieldsPerParticle; field += 1) {
      const name = particleFieldNames[field];
      maximum = Math.max(maximum, Math.abs(aos.data[base + field] - soa[name][index]));
    }
  }
  return maximum;
}

export function fieldsForWorkload(workload: MemoryWorkload): readonly ParticleField[] {
  if (workload === "position-x") return ["px"];
  if (workload === "velocity-only") return ["vx", "vy", "vz"];
  return particleFieldNames;
}

export function estimateMemoryTraffic(
  layout: MemoryLayout,
  workload: MemoryWorkload,
  particleCount: number,
  cacheLineBytes = 64,
): MemoryTrafficEstimate {
  const count = Math.max(0, Math.floor(particleCount));
  const lineSize = Math.max(bytesPerFloat, Math.floor(cacheLineBytes));
  const fields = fieldsForWorkload(workload);
  let cacheLines = 0;
  if (layout === "soa") {
    const linesPerArray = Math.ceil((count * bytesPerFloat) / lineSize);
    cacheLines = linesPerArray * fields.length;
  } else {
    const strideBytes = fieldsPerParticle * bytesPerFloat;
    if (count > 0 && lineSize >= strideBytes) {
      const firstFieldIndex = particleFieldNames.indexOf(fields[0]);
      const lastFieldIndex = particleFieldNames.indexOf(fields[fields.length - 1]);
      const firstLine = Math.floor((firstFieldIndex * bytesPerFloat) / lineSize);
      const lastAddress = ((count - 1) * fieldsPerParticle + lastFieldIndex) * bytesPerFloat;
      const lastLine = Math.floor(lastAddress / lineSize);
      cacheLines = lastLine - firstLine + 1;
    } else {
      let previousLine = -1;
      for (let index = 0; index < count; index += 1) {
        for (const field of fields) {
          const fieldIndex = particleFieldNames.indexOf(field);
          const byteAddress = (index * fieldsPerParticle + fieldIndex) * bytesPerFloat;
          const line = Math.floor(byteAddress / lineSize);
          if (line !== previousLine) {
            cacheLines += 1;
            previousLine = line;
          }
        }
      }
    }
  }
  const usefulBytes = count * fields.length * bytesPerFloat;
  const loadedBytes = cacheLines * lineSize;
  let efficiency = 1;
  if (loadedBytes > 0) efficiency = usefulBytes / loadedBytes;
  return {
    layout,
    workload,
    particleCount: count,
    fieldCount: fields.length,
    usefulBytes,
    cacheLines,
    loadedBytes,
    efficiency,
  };
}

export function runAoSWorkload(particles: ParticlesAoS, workload: MemoryWorkload, dt = 1 / 120) {
  if (workload === "position-x") return sumPositionXAoS(particles);
  if (workload === "velocity-only") {
    dampVelocitiesAoS(particles, 0.9995);
    return sumPositionXAoS(particles);
  }
  integrateAoS(particles, dt);
  return sumPositionXAoS(particles);
}

export function runSoAWorkload(particles: ParticlesSoA, workload: MemoryWorkload, dt = 1 / 120) {
  if (workload === "position-x") return sumPositionXSoA(particles);
  if (workload === "velocity-only") {
    dampVelocitiesSoA(particles, 0.9995);
    return sumPositionXSoA(particles);
  }
  integrateSoA(particles, dt);
  return sumPositionXSoA(particles);
}
