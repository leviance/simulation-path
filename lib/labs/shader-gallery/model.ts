import { defaultVertexShader, fragmentTemplates } from "./sources.ts";
import {
  defaultSpeeds,
  type ShaderEffect,
  type ShaderSourcePair,
  type GalleryProgram,
  type SavedCandidate,
  type GalleryView,
  type UniformSnapshot,
} from "./types.ts";

export function shaderFingerprint(sources: ShaderSourcePair): string {
  let hash = BigInt("14695981039346656037");
  const prime = BigInt("1099511628211"),
    mask = BigInt("18446744073709551615");
  const encoder = new TextEncoder();
  for (const bytes of [
    encoder.encode(sources.vertex),
    new Uint8Array([0]),
    encoder.encode(sources.fragment),
  ]) {
    for (const byte of bytes) hash = ((hash ^ BigInt(byte)) * prime) & mask;
  }
  return hash.toString(16).padStart(16, "0");
}

// This is NOT a GLSL compiler. Only an unchanged known template with a new
// positive SPEED constant is accepted by the educational Canvas model.
export function inspectCanvasTemplate(source: string, effect: ShaderEffect) {
  if (source.length > 65536)
    return { supported: false as const, diagnostic: "Candidate vượt giới hạn 64 KiB của Canvas." };
  const pattern = /const\s+float\s+SPEED\s*=\s*((?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?)\s*;/;
  const match = source.match(pattern);
  const speed = match ? Number(match[1]) : NaN;
  if (!Number.isFinite(speed) || speed < 0.05 || speed > 4)
    return {
      supported: false as const,
      diagnostic: "Canvas chỉ hỗ trợ đổi SPEED trong [0.05, 4]. Compiler thật nằm ở bản C++.",
    };
  const normalized = (text: string) =>
    text.replaceAll("\r\n", "\n").replace(pattern, "const float SPEED = SUPPORTED;").trim();
  if (normalized(source) !== normalized(fragmentTemplates[effect]))
    return {
      supported: false as const,
      diagnostic:
        "Bản sửa nằm ngoài mẫu Canvas hỗ trợ. Không thể kết luận GLSL đúng/sai ở đây; hãy dùng compiler OpenGL của bản C++.",
    };
  return {
    supported: true as const,
    speed,
    diagnostic: "Khớp mẫu Canvas hỗ trợ; không phải kết quả compile GLSL.",
  };
}

export function createGalleryProgram(effect: ShaderEffect = "gradient"): GalleryProgram {
  const activeSources = { vertex: defaultVertexShader, fragment: fragmentTemplates[effect] };
  return {
    generation: 1,
    attempts: 0,
    activeFingerprint: shaderFingerprint(activeSources),
    activeEffect: effect,
    activeSpeed: defaultSpeeds[effect],
    activeSources,
    lastReloadSucceeded: true,
    diagnostic: "Bản mẫu ban đầu đang hiển thị bằng Canvas 2D.",
  };
}

export function tryGalleryCandidate(
  current: GalleryProgram,
  candidate: SavedCandidate,
): GalleryProgram {
  if (candidate.fault)
    return {
      ...current,
      attempts: current.attempts + 1,
      lastReloadSucceeded: false,
      diagnostic:
        candidate.fault === "compile"
          ? "Thí nghiệm mô phỏng lỗi compile: giữ last-good. Đây không phải log driver."
          : "Thí nghiệm mô phỏng lỗi interface: uniform sai type, giữ last-good. Bản C++ kiểm bằng reflection thật.",
    };
  const inspection = inspectCanvasTemplate(candidate.sources.fragment, candidate.effect);
  if (!inspection.supported || candidate.sources.vertex !== defaultVertexShader)
    return {
      ...current,
      attempts: current.attempts + 1,
      lastReloadSucceeded: false,
      diagnostic: inspection.diagnostic,
    };
  return {
    generation: current.generation + 1,
    attempts: current.attempts + 1,
    activeFingerprint: shaderFingerprint(candidate.sources),
    activeEffect: candidate.effect,
    activeSpeed: inspection.speed,
    activeSources: candidate.sources,
    lastReloadSucceeded: true,
    diagnostic: inspection.diagnostic,
  };
}

export function initialGalleryView(): GalleryView {
  return { time: 0, mouseX: 0.5, mouseY: 0.5, zoom: 1, paused: true };
}
export function makeGalleryUniforms(
  view: GalleryView,
  width: number,
  height: number,
): UniformSnapshot {
  if (
    width <= 0 ||
    height <= 0 ||
    ![width, height, view.time, view.mouseX, view.mouseY, view.zoom].every(Number.isFinite) ||
    view.zoom <= 0
  )
    throw Error("Uniform snapshot không hợp lệ");
  return {
    time: view.time,
    width,
    height,
    mouseX: Math.max(0, Math.min(1, view.mouseX)) * width,
    mouseY: (1 - Math.max(0, Math.min(1, view.mouseY))) * height,
    zoom: view.zoom,
  };
}
export function advanceGalleryView(view: GalleryView, dt: number): GalleryView {
  return view.paused || !Number.isFinite(dt) || dt <= 0
    ? view
    : { ...view, time: view.time + Math.min(0.05, dt) };
}
export function zoomGalleryView(view: GalleryView, wheel: number): GalleryView {
  if (!Number.isFinite(wheel)) return view;
  return {
    ...view,
    zoom: Math.max(
      0.25,
      Math.min(8, view.zoom * Math.exp(Math.max(-40, Math.min(40, wheel)) * 0.12)),
    ),
  };
}
