// Float32 arithmetic mirrors the C++ teaching model, not JS object heap layout.
const f = Math.fround;
export const nativeMaximumParticles = 1_000_000;
export const canvasMaximumParticles = 20_000;
export const fixedDt = f(1 / 120);
export const floatFields = [
  "positionX",
  "positionY",
  "positionZ",
  "velocityX",
  "velocityY",
  "velocityZ",
  "age",
  "lifetime",
  "hue",
] as const;
export type FloatField = (typeof floatFields)[number];
export type ParticleAoS = { id: number; generation: number } & Record<FloatField, number>;
export type ParticlesSoA = Record<FloatField, Float32Array> & {
  id: Uint32Array;
  generation: Uint32Array;
};
export type MemoryWorkload = "gravity-only" | "full-lifecycle";
export type Layout = "aos" | "soa";
export interface FountainConfig {
  seed: number;
  emitterX: number;
  emitterZ: number;
  launchSpeed: number;
  spread: number;
  gravity: number;
  lifetime: number;
  emissionRate: number;
}
export function defaultConfig(): FountainConfig {
  return {
    seed: 0x32c0ffee,
    emitterX: 0,
    emitterZ: 0,
    launchSpeed: 9,
    spread: 2,
    gravity: f(-9.81),
    lifetime: 2.5,
    emissionRate: 128,
  };
}
export function validateConfig(config: FountainConfig, dt = fixedDt) {
  if (!Object.values(config).every(Number.isFinite) || !Number.isFinite(dt))
    throw new Error("Non-finite fountain input");
  if (
    !Number.isInteger(config.seed) ||
    config.seed < 0 ||
    config.seed > 0xffffffff ||
    dt <= 0 ||
    dt > f(1 / 30) ||
    config.lifetime < 0.5 ||
    config.lifetime > 8 ||
    config.launchSpeed < 1 ||
    config.launchSpeed > 20 ||
    config.spread < 0 ||
    config.spread > 5 ||
    config.gravity < -20 ||
    config.gravity > 0 ||
    config.emissionRate < 0 ||
    config.emissionRate > 2_000_000 ||
    Math.abs(config.emitterX) > 10 ||
    Math.abs(config.emitterZ) > 10
  )
    throw new Error("Fountain parameter budget exceeded");
}
export function randomUnit(seed: number, id: number, generation: number, channel: number) {
  let value =
    (seed ^
      Math.imul(id, 0x9e3779b9) ^
      Math.imul(generation, 0x85ebca6b) ^
      Math.imul(channel, 0xc2b2ae35)) >>>
    0;
  value ^= value >>> 16;
  value = Math.imul(value, 0x7feb352d);
  value ^= value >>> 15;
  value = Math.imul(value, 0x846ca68b);
  value ^= value >>> 16;
  return f((value >>> 8) * (1 / 16777216));
}
export function emptyParticle(id: number): ParticleAoS {
  return {
    id,
    generation: 0,
    positionX: 0,
    positionY: 0,
    positionZ: 0,
    velocityX: 0,
    velocityY: 0,
    velocityZ: 0,
    age: 0,
    lifetime: 2.5,
    hue: 0,
  };
}
export function spawnParticle(id: number, generation: number, config: FountainConfig): ParticleAoS {
  const angle = f(randomUnit(config.seed, id, generation, 1) * f(2 * Math.PI));
  const radialSpeed = f(f(Math.sqrt(randomUnit(config.seed, id, generation, 2))) * config.spread);
  return {
    id,
    generation,
    positionX: f(config.emitterX),
    positionY: 0,
    positionZ: f(config.emitterZ),
    velocityX: f(f(Math.cos(angle)) * radialSpeed),
    velocityY: f(
      config.launchSpeed * f(f(0.85) + f(f(0.3) * randomUnit(config.seed, id, generation, 3))),
    ),
    velocityZ: f(f(Math.sin(angle)) * radialSpeed),
    age: 0,
    lifetime: f(
      config.lifetime * f(f(0.75) + f(f(0.5) * randomUnit(config.seed, id, generation, 4))),
    ),
    hue: randomUnit(config.seed, id, generation, 5),
  };
}
export function warmParticle(id: number, config: FountainConfig) {
  const particle = spawnParticle(id, 0, config);
  particle.age = f(randomUnit(config.seed, id, 0, 6) * particle.lifetime);
  particle.positionX = f(particle.positionX + f(particle.velocityX * particle.age));
  particle.positionY = f(
    f(particle.velocityY * particle.age) +
      f(f(f(f(0.5) * config.gravity) * particle.age) * particle.age),
  );
  particle.positionZ = f(particle.positionZ + f(particle.velocityZ * particle.age));
  particle.velocityY = f(particle.velocityY + f(config.gravity * particle.age));
  return particle;
}
export function makeParticlesAoS(
  count: number,
  config = defaultConfig(),
  warm = true,
): ParticleAoS[] {
  validateConfig(config);
  if (!Number.isInteger(count) || count < 1 || count > canvasMaximumParticles)
    throw new Error("Canvas particle budget: 1..20000; C++ provides 1000000");
  return Array.from({ length: count }, (_, id) =>
    warm ? warmParticle(id, config) : emptyParticle(id),
  );
}
export function integrateParticle(particle: ParticleAoS, dt: number, gravity: number) {
  particle.velocityY = f(particle.velocityY + f(gravity * dt));
  particle.positionX = f(particle.positionX + f(particle.velocityX * dt));
  particle.positionY = f(particle.positionY + f(particle.velocityY * dt));
  particle.positionZ = f(particle.positionZ + f(particle.velocityZ * dt));
  particle.age = f(particle.age + dt);
}
export function advanceParticle(
  particle: ParticleAoS,
  config: FountainConfig,
  dt = fixedDt,
  newlyEmitted = false,
): boolean {
  if (newlyEmitted) Object.assign(particle, spawnParticle(particle.id, 0, config));
  const remaining = f(particle.lifetime - particle.age);
  if (dt < remaining) {
    integrateParticle(particle, dt, config.gravity);
    return false;
  }
  if (particle.generation === 0xffffffff) throw new Error("Particle generation overflow");
  Object.assign(particle, spawnParticle(particle.id, particle.generation + 1, config));
  integrateParticle(particle, f(dt - remaining), config.gravity);
  return true;
}
export function planEmission(
  active: number,
  capacity: number,
  remainder: number,
  config: FountainConfig,
  dt = fixedDt,
) {
  validateConfig(config, dt);
  if (
    !Number.isInteger(active) ||
    !Number.isInteger(capacity) ||
    active < 0 ||
    active > capacity ||
    capacity > canvasMaximumParticles ||
    !Number.isFinite(remainder) ||
    remainder < 0 ||
    remainder >= 1
  )
    throw new Error("Invalid emission state");
  const available = remainder + config.emissionRate * dt;
  const births = Math.min(capacity - active, Math.floor(available));
  return {
    active: active + births,
    remainder: active + births === capacity ? 0 : available - Math.floor(available),
  };
}
export function makeEmptySoA(count: number): ParticlesSoA {
  if (!Number.isInteger(count) || count < 0 || count > canvasMaximumParticles)
    throw new Error("Canvas SoA allocation budget");
  return {
    id: new Uint32Array(count),
    generation: new Uint32Array(count),
    positionX: new Float32Array(count),
    positionY: new Float32Array(count),
    positionZ: new Float32Array(count),
    velocityX: new Float32Array(count),
    velocityY: new Float32Array(count),
    velocityZ: new Float32Array(count),
    age: new Float32Array(count),
    lifetime: new Float32Array(count),
    hue: new Float32Array(count),
  };
}
export function readParticle(source: ParticlesSoA, index: number): ParticleAoS {
  return {
    id: source.id[index],
    generation: source.generation[index],
    positionX: source.positionX[index],
    positionY: source.positionY[index],
    positionZ: source.positionZ[index],
    velocityX: source.velocityX[index],
    velocityY: source.velocityY[index],
    velocityZ: source.velocityZ[index],
    age: source.age[index],
    lifetime: source.lifetime[index],
    hue: source.hue[index],
  };
}
export function writeParticle(destination: ParticlesSoA, index: number, particle: ParticleAoS) {
  destination.id[index] = particle.id;
  destination.generation[index] = particle.generation;
  for (const field of floatFields) destination[field][index] = particle[field];
}
export function makeParticlesSoA(source: ParticleAoS[]) {
  const result = makeEmptySoA(source.length);
  for (let index = 0; index < source.length; index++) writeParticle(result, index, source[index]);
  return result;
}
export function validSoA(source: ParticlesSoA) {
  return (
    source.generation.length === source.id.length &&
    floatFields.every((field) => source[field].length === source.id.length)
  );
}
export function updateAoSRange(
  particles: ParticleAoS[],
  begin: number,
  end: number,
  config: FountainConfig,
  workload: MemoryWorkload,
  oldActive: number,
  dt = fixedDt,
) {
  let respawned = 0;
  if (workload === "gravity-only") {
    for (let index = begin; index < end; index++)
      particles[index].velocityY = f(particles[index].velocityY + f(config.gravity * dt));
  } else {
    for (let index = begin; index < end; index++) {
      if (advanceParticle(particles[index], config, dt, index >= oldActive)) respawned++;
    }
  }
  return respawned;
}
export function updateSoARange(
  particles: ParticlesSoA,
  begin: number,
  end: number,
  config: FountainConfig,
  workload: MemoryWorkload,
  oldActive: number,
  dt = fixedDt,
) {
  let respawned = 0;
  if (workload === "gravity-only") {
    for (let index = begin; index < end; index++)
      particles.velocityY[index] = f(particles.velocityY[index] + f(config.gravity * dt));
  } else {
    for (let index = begin; index < end; index++) {
      if (index >= oldActive || dt >= f(particles.lifetime[index] - particles.age[index])) {
        const particle = readParticle(particles, index);
        if (advanceParticle(particle, config, dt, index >= oldActive)) respawned++;
        writeParticle(particles, index, particle);
      } else {
        particles.velocityY[index] = f(particles.velocityY[index] + f(config.gravity * dt));
        particles.positionX[index] = f(
          particles.positionX[index] + f(particles.velocityX[index] * dt),
        );
        particles.positionY[index] = f(
          particles.positionY[index] + f(particles.velocityY[index] * dt),
        );
        particles.positionZ[index] = f(
          particles.positionZ[index] + f(particles.velocityZ[index] * dt),
        );
        particles.age[index] = f(particles.age[index] + dt);
      }
    }
  }
  return respawned;
}
export function finiteParticle(particle: ParticleAoS) {
  return (
    floatFields.every((field) => Number.isFinite(particle[field])) &&
    particle.age >= 0 &&
    particle.age < particle.lifetime
  );
}
export function particleDifference(first: ParticleAoS, second: ParticleAoS) {
  if (
    first.id !== second.id ||
    first.generation !== second.generation ||
    !finiteParticle(first) ||
    !finiteParticle(second)
  )
    return Infinity;
  return Math.max(...floatFields.map((field) => Math.abs(first[field] - second[field])));
}
export function maximumLayoutDifference(aos: ParticleAoS[], soa: ParticlesSoA) {
  if (!validSoA(soa) || aos.length !== soa.id.length) return Infinity;
  let maximum = 0;
  for (let index = 0; index < aos.length; index++)
    maximum = Math.max(maximum, particleDifference(aos[index], readParticle(soa, index)));
  return maximum;
}
export function particleChecksum(particle: ParticleAoS) {
  return (
    particle.positionX +
    2 * particle.positionY +
    3 * particle.positionZ +
    5 * particle.velocityX +
    7 * particle.velocityY +
    11 * particle.velocityZ +
    13 * particle.age +
    17 * particle.lifetime +
    19 * particle.hue
  );
}

// Compare quantities in their own units; the raw maximum difference is diagnostic only.
export function particleErrorRatio(first: ParticleAoS, second: ParticleAoS) {
  if (!Number.isFinite(particleDifference(first, second))) return Infinity;
  let maximum = 0;
  for (const field of floatFields) {
    const absolute = field === "hue" ? 1e-7 : field === "age" || field === "lifetime" ? 1e-6 : 1e-5;
    const allowed = absolute + 1e-6 * Math.max(Math.abs(first[field]), Math.abs(second[field]));
    maximum = Math.max(maximum, Math.abs(first[field] - second[field]) / allowed);
  }
  return maximum;
}
export function modelTraffic(count: number, layout: Layout, workload: MemoryWorkload) {
  if (!Number.isInteger(count) || count < 0 || count > nativeMaximumParticles)
    throw new Error("Traffic model budget");
  const usefulBytes = count * (workload === "gravity-only" ? 4 : 44);
  let uniqueLines = 0;
  if (count > 0) {
    if (workload === "gravity-only")
      uniqueLines =
        layout === "aos"
          ? Math.floor((24 + (count - 1) * 44) / 64) + 1
          : Math.ceil((count * 4) / 64);
    else
      uniqueLines =
        layout === "aos" ? Math.ceil(usefulBytes / 64) : 11 * Math.ceil((count * 4) / 64);
  }
  return {
    usefulBytes,
    uniqueLines,
    loadedBytes: uniqueLines * 64,
    upperBound: workload === "full-lifecycle",
  };
}
