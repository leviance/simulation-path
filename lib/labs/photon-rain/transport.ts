import {
  left,
  right,
  bottom,
  top,
  maximumPhotons,
  move,
  validate,
  type Settings,
  type Point,
  type Photon,
  type Trace,
} from "./model.ts";
export class Random {
  state: number;
  constructor(seed: number) {
    this.state = seed >>> 0;
    if (this.state === 0) this.state = 0x6d2b79f5;
  }
  next() {
    let state = this.state;
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    this.state = state >>> 0;
    return this.state;
  }
  uniform() {
    return (this.next() + 0.5) / 4294967296;
  }
}
export function photonSeed(seed: number, id: number) {
  if (!Number.isInteger(id) || id < 0 || id >= maximumPhotons)
    throw new RangeError("Invalid photon id");
  // MurmurHash3 fmix32, public domain; match uint32 wrap in C++.
  let value = (seed + Math.imul(0x9e3779b9, id + 1)) >>> 0;
  value ^= value >>> 16;
  value = Math.imul(value, 0x85ebca6b);
  value ^= value >>> 13;
  value = Math.imul(value, 0xc2b2ae35);
  value ^= value >>> 16;
  return value >>> 0;
}
export function launch(random: Random): Photon {
  return { position: [left, 0.75 * (2 * random.uniform() - 1)], direction: [1, 0] };
}
export function freePath(muT: number, u: number) {
  if (!Number.isFinite(muT) || muT < 0 || muT > 6 || !Number.isFinite(u) || u <= 0 || u >= 1)
    throw new RangeError("Invalid exponential sample");
  if (muT === 0) return Infinity;
  return -Math.log1p(-u) / muT;
}
export function sampleFirst(settings: Settings, id: number) {
  validate(settings);
  const random = new Random(photonSeed(settings.seed, id)),
    photon = launch(random),
    u = random.uniform();
  return { photon, u, distance: freePath(settings.muA + settings.muS, u) };
}
export function exitDistance(photon: Photon) {
  const p = photon.position,
    d = photon.direction;
  if (
    ![...p, ...d].every(Number.isFinite) ||
    p[0] < left - 1e-10 ||
    p[0] > right + 1e-10 ||
    p[1] < bottom - 1e-10 ||
    p[1] > top + 1e-10 ||
    Math.abs(d[0] ** 2 + d[1] ** 2 - 1) > 1e-10
  )
    throw new RangeError("Expected inside photon and unit direction");
  let distance = Infinity;
  for (let axis = 0; axis < 2; axis++) {
    if (d[axis] === 0) continue;
    let boundary = axis === 0 ? right : top;
    if (d[axis] < 0) boundary = axis === 0 ? left : bottom;
    distance = Math.min(distance, (boundary - p[axis]) / d[axis]);
  }
  return Math.max(0, distance);
}
export function sampleFlight(photon: Photon, random: Random, settings: Settings) {
  const boundary = exitDistance(photon),
    muT = settings.muA + settings.muS;
  const sampled = muT > 0 ? freePath(muT, random.uniform()) : Infinity;
  let endpoint = move(photon.position, photon.direction, Math.min(sampled, boundary));
  const escaped = sampled >= boundary;
  if (escaped)
    endpoint = [
      Math.max(left, Math.min(right, endpoint[0])),
      Math.max(bottom, Math.min(top, endpoint[1])),
    ];
  return { endpoint, sampled, boundary, escaped };
}
export function firstFlight(settings: Settings, id: number) {
  validate(settings);
  const random = new Random(photonSeed(settings.seed, id));
  return sampleFlight(launch(random), random, settings);
}
export function scatterDirection(u: number): Point {
  if (!Number.isFinite(u) || u <= 0 || u >= 1) throw new RangeError("Invalid scattering sample");
  const angle = 2 * Math.PI * u;
  return [Math.cos(angle), Math.sin(angle)];
}
export function tracePhoton(settings: Settings, id: number, stage = 8): Trace {
  validate(settings, stage);
  const random = new Random(photonSeed(settings.seed, id));
  const value = launch(random);
  const trace: Trace = {
    vertices: [{ position: value.position, event: "emission" }],
    status: "alive",
    collisions: 0,
    scatters: 0,
  };
  const limit = stage >= 5 ? settings.eventLimit : 1;
  for (let event = 0; event < limit; event++) {
    const flight = sampleFlight(value, random, settings);
    value.position = flight.endpoint;
    if (flight.escaped) {
      trace.vertices.push({ position: value.position, event: "escape" });
      trace.status = "escaped";
      return trace;
    }
    trace.collisions++;
    if (stage < 5 || random.uniform() < settings.muA / (settings.muA + settings.muS)) {
      trace.vertices.push({ position: value.position, event: "absorption" });
      trace.status = "absorbed";
      return trace;
    }
    trace.scatters++;
    trace.vertices.push({ position: value.position, event: "scatter" });
    value.direction = scatterDirection(random.uniform());
  }
  trace.status = "censored";
  return trace;
}
