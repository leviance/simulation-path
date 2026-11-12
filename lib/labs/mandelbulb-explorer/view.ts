import { defaultCamera } from "./camera.ts";
import { defaultSettings, type Settings } from "./math.ts";
export const modes = [
  "power",
  "rays",
  "distance",
  "normals",
  "camera",
  "work",
  "refine",
  "quality",
  "explorer",
] as const;
export type BulbMode = (typeof modes)[number];
export type ViewMode = "beauty" | "steps" | "iterations" | "states" | "normals";
export function bulbMode(value: string): BulbMode {
  return modes.find((mode) => mode === value) ?? "explorer";
}
export function initialSettings(mode: BulbMode): Settings {
  return {
    ...defaultSettings,
    slice: mode === "power",
    useDe: mode !== "rays",
    lighting: !["power", "rays", "distance"].includes(mode),
    occlusion: mode === "quality" || mode === "explorer",
  };
}
export function preset(index: number, mode: BulbMode) {
  const settings = initialSettings(mode),
    camera = defaultCamera();
  if (index === 1) {
    settings.power = 6;
    camera.yaw = 1.2;
  }
  if (index === 2) {
    camera.target = { x: 0.4, y: 0.2, z: 0.45 };
    camera.distance = 1.7;
    settings.palette = 1;
  }
  return { settings, camera };
}
export function stateName(state: number) {
  if (state & 16) return "invalid";
  if (state & 8) return "camera inside";
  if (state & 4) return "hết ray budget";
  if (state & 1) return "epsilon hit";
  return "miss";
}
