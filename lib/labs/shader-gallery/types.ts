export type ShaderEffect = "gradient" | "circle" | "mandelbrot" | "noise";
export interface ShaderSourcePair {
  vertex: string;
  fragment: string;
}
export interface GalleryView {
  time: number;
  mouseX: number;
  mouseY: number;
  zoom: number;
  paused: boolean;
}
export interface UniformSnapshot {
  time: number;
  width: number;
  height: number;
  mouseX: number;
  mouseY: number;
  zoom: number;
}
export interface GalleryProgram {
  generation: number;
  attempts: number;
  activeFingerprint: string;
  activeEffect: ShaderEffect;
  activeSpeed: number;
  activeSources: ShaderSourcePair;
  lastReloadSucceeded: boolean;
  diagnostic: string;
}
export type DemoFault = "compile" | "interface";
export interface SavedCandidate {
  effect: ShaderEffect;
  sources: ShaderSourcePair;
  version: number;
  fault?: DemoFault;
}
export const effectNames: Record<ShaderEffect, string> = {
  gradient: "Gradient Aurora",
  circle: "Circle Ripples",
  mandelbrot: "Mandelbrot",
  noise: "Noise Flow",
};
export const defaultSpeeds: Record<ShaderEffect, number> = {
  gradient: 0.65,
  circle: 0.8,
  mandelbrot: 0.12,
  noise: 0.18,
};
