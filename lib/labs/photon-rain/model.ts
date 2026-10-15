export type Point = readonly [number, number];
export interface Photon {
  position: Point;
  direction: Point;
}
export type Event = "emission" | "candidate" | "absorption" | "scatter" | "escape";
export type Status = "alive" | "absorbed" | "escaped" | "censored";
export interface Trace {
  vertices: { position: Point; event: Event }[];
  status: Status;
  collisions: number;
  scatters: number;
}
export interface Settings {
  muA: number;
  muS: number;
  seed: number;
  count: number;
  eventLimit: number;
}
export const left = -1.5,
  right = 1.5,
  bottom = -1,
  top = 1;
export const maximumPhotons = 8192,
  maximumEvents = 64;
export const defaultSettings: Settings = {
  muA: 0.4,
  muS: 0.9,
  seed: 42,
  count: 2048,
  eventLimit: 64,
};
export function settingsForStage(stage: number): Settings {
  return { ...defaultSettings, muS: stage >= 5 ? 0.9 : 0 };
}
export function validate(s: Settings, stage = 8) {
  if (![s.muA, s.muS].every(Number.isFinite) || s.muA < 0 || s.muA > 3 || s.muS < 0 || s.muS > 3)
    throw new RangeError("Coefficients must be finite and in [0,3]");
  if (
    !Number.isInteger(s.seed) ||
    s.seed < 0 ||
    s.seed > 0xffffffff ||
    !Number.isInteger(s.count) ||
    s.count < 1 ||
    s.count > maximumPhotons ||
    !Number.isInteger(s.eventLimit) ||
    s.eventLimit < 1 ||
    s.eventLimit > maximumEvents
  )
    throw new RangeError("Invalid seed or work budget");
  if (stage < 5 && s.muS !== 0) throw new RangeError("Scattering starts in lesson 5");
}
export const move = (position: Point, direction: Point, distance: number): Point => [
  position[0] + direction[0] * distance,
  position[1] + direction[1] * distance,
];
