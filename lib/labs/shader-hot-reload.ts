export type ShaderStage = "vertex" | "fragment" | "link";
export type ShaderPreset = "solid" | "coordinates" | "pulse" | "rings";

export interface ShaderDiagnostic {
  stage: ShaderStage;
  line: number | null;
  message: string;
}

export interface ShaderSources {
  vertex: string;
  fragment: string;
}

export interface ShaderProgramState {
  generation: number;
  attempts: number;
  activeFingerprint: number;
  candidateFingerprint: number;
  lastReloadSucceeded: boolean;
  diagnostics: ShaderDiagnostic[];
  activeSources: ShaderSources;
}

export interface ShaderFileStamps {
  vertex: number;
  fragment: number;
}

export interface ShaderWatchState {
  initialized: boolean;
  observed: ShaderFileStamps;
  pending: boolean;
  changedAtMs: number;
}

export interface UniformSnapshot {
  timeSeconds: number;
  resolution: { x: number; y: number };
  mouse: { x: number; y: number };
}

export interface Rgb {
  red: number;
  green: number;
  blue: number;
}

export interface ShaderPreviewParameters {
  solidColor: Rgb;
  coordinateBlue: number;
  pulseBase: number;
  pulseAmplitude: number;
  pulseSpeed: number;
  pulseColor: Rgb;
  ringFrequency: number;
  ringSpeed: number;
  coldColor: Rgb;
  hotColor: Rgb;
  mouseFalloff: number;
  mouseGlowColor: Rgb;
}

export const defaultVertexShader = `#version 330 core
layout (location = 0) in vec3 aPosition;
layout (location = 1) in vec3 aColor;

uniform mat4 uMvp;

out vec3 vColor;
out vec3 vLocalPosition;

void main() {
    vColor = aColor;
    vLocalPosition = aPosition;
    gl_Position = uMvp * vec4(aPosition, 1.0);
}
`;

export const defaultFragmentShader = `#version 330 core
in vec3 vColor;
in vec3 vLocalPosition;

uniform float uTime;
uniform vec2 uResolution;
uniform vec2 uMouse;

out vec4 fragColor;

void main() {
    vec2 p = vLocalPosition.xy;
    float rings = 0.5 + 0.5 * cos(length(p) * 18.0 - uTime * 4.0);
    vec2 safeResolution = max(uResolution, vec2(1.0));
    vec2 mouseUv = uMouse / safeResolution;
    vec2 fragmentUv = gl_FragCoord.xy / safeResolution;
    float mouseGlow = max(0.0, 1.0 - distance(fragmentUv, mouseUv) * 5.0);
    vec3 cold = vec3(0.08, 0.18, 0.42);
    vec3 hot = vec3(1.0, 0.42, 0.18);
    vec3 color = mix(cold, hot, rings) * (0.55 + 0.45 * vColor);
    color += vec3(0.10, 0.16, 0.20) * mouseGlow;
    fragColor = vec4(color, 1.0);
}
`;

function lineOf(source: string, offset: number): number {
  return source.slice(0, offset).split("\n").length;
}

function braceDiagnostic(stage: ShaderStage, source: string): ShaderDiagnostic | null {
  let depth = 0;
  for (let index = 0; index < source.length; index += 1) {
    if (source[index] === "{") depth += 1;
    if (source[index] !== "}") continue;
    depth -= 1;
    if (depth < 0) {
      return { stage, line: lineOf(source, index), message: "Dấu } không có dấu { tương ứng." };
    }
  }
  if (depth !== 0) {
    return { stage, line: source.split("\n").length, message: "Khối lệnh chưa đóng đủ dấu }." };
  }
  return null;
}

function delimiterDiagnostic(
  stage: ShaderStage,
  source: string,
  opening: string,
  closing: string,
): ShaderDiagnostic | null {
  let depth = 0;
  for (let index = 0; index < source.length; index += 1) {
    if (source[index] === opening) depth += 1;
    if (source[index] !== closing) continue;
    depth -= 1;
    if (depth < 0) {
      return {
        stage,
        line: lineOf(source, index),
        message: `Dấu ${closing} không có dấu ${opening} tương ứng.`,
      };
    }
  }
  if (depth !== 0) {
    return {
      stage,
      line: source.split("\n").length,
      message: `Khối lệnh chưa đóng đủ dấu ${closing}.`,
    };
  }
  return null;
}

function statementDiagnostic(
  stage: Exclude<ShaderStage, "link">,
  source: string,
): ShaderDiagnostic | null {
  const lines = source.split("\n");
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index].replace(/\/\/.*$/, "").trim();
    if (
      line.length === 0 ||
      line.startsWith("#") ||
      line.endsWith(";") ||
      line.endsWith("{") ||
      line === "}" ||
      line.startsWith("else")
    ) {
      continue;
    }
    return {
      stage,
      line: index + 1,
      message: "Dòng lệnh có thể đang thiếu dấu ;.",
    };
  }
  return null;
}

export function validateShaderStage(
  stage: Exclude<ShaderStage, "link">,
  source: string,
): ShaderDiagnostic[] {
  const diagnostics: ShaderDiagnostic[] = [];
  const firstCodeLine = source
    .split("\n")
    .find((line) => line.trim().length > 0)
    ?.trim();
  if (firstCodeLine !== "#version 330 core") {
    diagnostics.push({
      stage,
      line: 1,
      message: "Dòng đầu tiên phải là #version 330 core.",
    });
  }
  if (!/\bvoid\s+main\s*\(\s*\)/.test(source)) {
    diagnostics.push({ stage, line: null, message: "Không tìm thấy hàm void main()." });
  }
  const brokenToken = source.indexOf("BROKEN_TOKEN");
  if (brokenToken >= 0) {
    diagnostics.push({
      stage,
      line: lineOf(source, brokenToken),
      message: "Token thử nghiệm xuất hiện ở vị trí không tạo thành câu lệnh GLSL hợp lệ.",
    });
  }
  const braces = braceDiagnostic(stage, source);
  if (braces) diagnostics.push(braces);
  const parentheses = delimiterDiagnostic(stage, source, "(", ")");
  if (parentheses) diagnostics.push(parentheses);
  const statement = statementDiagnostic(stage, source);
  if (statement) diagnostics.push(statement);
  if (stage === "vertex" && !/\bgl_Position\s*=/.test(source)) {
    diagnostics.push({ stage, line: null, message: "Vertex shader chưa ghi gl_Position." });
  }
  if (stage === "fragment" && !/\bfragColor\s*=/.test(source)) {
    diagnostics.push({ stage, line: null, message: "Fragment shader chưa ghi fragColor." });
  }
  return diagnostics;
}

function interfaceVariables(source: string, qualifier: "in" | "out"): Map<string, string> {
  const variables = new Map<string, string>();
  const expression = new RegExp(`\\b${qualifier}\\s+(\\w+)\\s+(\\w+)\\s*;`, "g");
  for (const match of source.matchAll(expression)) variables.set(match[2], match[1]);
  return variables;
}

export function validateProgramInterface(
  sources: ShaderSources,
  requiredUniforms: readonly string[] = ["uMvp"],
): ShaderDiagnostic[] {
  const diagnostics: ShaderDiagnostic[] = [];
  const vertexOutputs = interfaceVariables(sources.vertex, "out");
  const fragmentInputs = interfaceVariables(sources.fragment, "in");
  for (const [input, fragmentType] of fragmentInputs) {
    const vertexType = vertexOutputs.get(input);
    if (!vertexType) {
      diagnostics.push({
        stage: "link",
        line: null,
        message: `Fragment input ${input} không có vertex output cùng tên.`,
      });
    } else if (vertexType !== fragmentType) {
      diagnostics.push({
        stage: "link",
        line: null,
        message: `Varying ${input} khác kiểu: vertex là ${vertexType}, fragment là ${fragmentType}.`,
      });
    }
  }
  const combined = `${sources.vertex}\n${sources.fragment}`;
  for (const uniform of requiredUniforms) {
    const declaration = new RegExp(`\\buniform\\s+\\w+\\s+${uniform}\\s*;`);
    if (!declaration.test(combined)) {
      diagnostics.push({
        stage: "link",
        line: null,
        message: `Thiếu uniform bắt buộc ${uniform}.`,
      });
      continue;
    }
    const references = combined.match(new RegExp(`\\b${uniform}\\b`, "g")) ?? [];
    if (references.length < 2) {
      diagnostics.push({
        stage: "link",
        line: null,
        message: `Uniform ${uniform} đã khai báo nhưng chưa được dùng; driver có thể loại location này.`,
      });
    }
  }
  return diagnostics;
}

export function shaderFingerprint(sources: ShaderSources): number {
  let value = 2166136261;
  const text = `${sources.vertex}\u0000${sources.fragment}`;
  for (let index = 0; index < text.length; index += 1) {
    value ^= text.charCodeAt(index);
    value = Math.imul(value, 16777619);
  }
  return value >>> 0;
}

export function createShaderProgramState(sources: ShaderSources): ShaderProgramState {
  const fingerprint = shaderFingerprint(sources);
  return {
    generation: 1,
    attempts: 1,
    activeFingerprint: fingerprint,
    candidateFingerprint: fingerprint,
    lastReloadSucceeded: true,
    diagnostics: [],
    activeSources: sources,
  };
}

export function transactionalShaderReload(
  state: ShaderProgramState,
  candidate: ShaderSources,
  requiredUniforms: readonly string[] = ["uMvp"],
): ShaderProgramState {
  const diagnostics = [
    ...validateShaderStage("vertex", candidate.vertex),
    ...validateShaderStage("fragment", candidate.fragment),
  ];
  if (diagnostics.length === 0) {
    diagnostics.push(...validateProgramInterface(candidate, requiredUniforms));
  }
  const candidateFingerprint = shaderFingerprint(candidate);
  if (diagnostics.length > 0) {
    return {
      ...state,
      attempts: state.attempts + 1,
      candidateFingerprint,
      lastReloadSucceeded: false,
      diagnostics,
    };
  }
  return {
    generation: state.generation + 1,
    attempts: state.attempts + 1,
    activeFingerprint: candidateFingerprint,
    candidateFingerprint,
    lastReloadSucceeded: true,
    diagnostics: [],
    activeSources: candidate,
  };
}

export function createShaderWatchState(): ShaderWatchState {
  return {
    initialized: false,
    observed: { vertex: 0, fragment: 0 },
    pending: false,
    changedAtMs: 0,
  };
}

export function observeShaderFiles(
  state: ShaderWatchState,
  stamps: ShaderFileStamps,
  nowMs: number,
  debounceMs: number,
): { state: ShaderWatchState; shouldReload: boolean } {
  if (!state.initialized) {
    return {
      state: { initialized: true, observed: stamps, pending: false, changedAtMs: nowMs },
      shouldReload: false,
    };
  }
  const changed =
    stamps.vertex !== state.observed.vertex || stamps.fragment !== state.observed.fragment;
  if (changed) {
    return {
      state: { initialized: true, observed: stamps, pending: true, changedAtMs: nowMs },
      shouldReload: false,
    };
  }
  if (state.pending && nowMs - state.changedAtMs >= debounceMs) {
    return { state: { ...state, pending: false }, shouldReload: true };
  }
  return { state, shouldReload: false };
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

function mix(left: number, right: number, amount: number): number {
  return left + (right - left) * amount;
}

const NUMBER = "([-+]?(?:\\d+(?:\\.\\d*)?|\\.\\d+))";

const defaultPreviewParameters: ShaderPreviewParameters = {
  solidColor: { red: 0.28, green: 0.62, blue: 0.95 },
  coordinateBlue: 0.35,
  pulseBase: 0.62,
  pulseAmplitude: 0.38,
  pulseSpeed: 3,
  pulseColor: { red: 0.95, green: 0.36, blue: 0.55 },
  ringFrequency: 18,
  ringSpeed: 4,
  coldColor: { red: 0.08, green: 0.18, blue: 0.42 },
  hotColor: { red: 1, green: 0.42, blue: 0.18 },
  mouseFalloff: 5,
  mouseGlowColor: { red: 0.1, green: 0.16, blue: 0.2 },
};

function matchedNumber(source: string, expression: RegExp, fallback: number): number {
  const match = source.match(expression);
  if (!match) return fallback;
  const value = Number(match[1]);
  return Number.isFinite(value) ? value : fallback;
}

function matchedColor(source: string, name: string, fallback: Rgb): Rgb {
  const expression = new RegExp(
    `\\bvec3\\s+${name}\\s*=\\s*vec3\\s*\\(\\s*${NUMBER}\\s*,\\s*${NUMBER}\\s*,\\s*${NUMBER}\\s*\\)`,
  );
  const match = source.match(expression);
  if (!match) return fallback;
  return { red: Number(match[1]), green: Number(match[2]), blue: Number(match[3]) };
}

function matchedMouseGlowColor(source: string, fallback: Rgb): Rgb {
  const expression = new RegExp(
    `color\\s*\\+=\\s*vec3\\s*\\(\\s*${NUMBER}\\s*,\\s*${NUMBER}\\s*,\\s*${NUMBER}\\s*\\)\\s*\\*\\s*mouseGlow`,
  );
  const match = source.match(expression);
  if (!match) return fallback;
  return { red: Number(match[1]), green: Number(match[2]), blue: Number(match[3]) };
}

export function shaderPreviewParameters(source: string): ShaderPreviewParameters {
  const defaults = defaultPreviewParameters;
  const solid = source.match(
    new RegExp(`fragColor\\s*=\\s*vec4\\s*\\(\\s*${NUMBER}\\s*,\\s*${NUMBER}\\s*,\\s*${NUMBER}`),
  );
  const pulseColor = source.match(
    new RegExp(
      `vec3\\s*\\(\\s*${NUMBER}\\s*,\\s*${NUMBER}\\s*,\\s*${NUMBER}\\s*\\)\\s*\\*\\s*pulse`,
    ),
  );
  return {
    solidColor: solid
      ? { red: Number(solid[1]), green: Number(solid[2]), blue: Number(solid[3]) }
      : defaults.solidColor,
    coordinateBlue: matchedNumber(
      source,
      new RegExp(`fragColor\\s*=\\s*vec4\\s*\\(\\s*uv\\s*,\\s*${NUMBER}`),
      defaults.coordinateBlue,
    ),
    pulseBase: matchedNumber(
      source,
      new RegExp(`float\\s+pulse\\s*=\\s*${NUMBER}`),
      defaults.pulseBase,
    ),
    pulseAmplitude: matchedNumber(
      source,
      new RegExp(`float\\s+pulse[^;]*?\\+\\s*${NUMBER}\\s*\\*\\s*sin`),
      defaults.pulseAmplitude,
    ),
    pulseSpeed: matchedNumber(
      source,
      new RegExp(`sin\\s*\\(\\s*uTime\\s*\\*\\s*${NUMBER}`),
      defaults.pulseSpeed,
    ),
    pulseColor: pulseColor
      ? { red: Number(pulseColor[1]), green: Number(pulseColor[2]), blue: Number(pulseColor[3]) }
      : defaults.pulseColor,
    ringFrequency: matchedNumber(
      source,
      new RegExp(`length\\s*\\(\\s*p\\s*\\)\\s*\\*\\s*${NUMBER}`),
      defaults.ringFrequency,
    ),
    ringSpeed: matchedNumber(source, new RegExp(`uTime\\s*\\*\\s*${NUMBER}`), defaults.ringSpeed),
    coldColor: matchedColor(source, "cold", defaults.coldColor),
    hotColor: matchedColor(source, "hot", defaults.hotColor),
    mouseFalloff: matchedNumber(
      source,
      new RegExp(`distance\\s*\\([^)]*\\)\\s*\\*\\s*${NUMBER}`),
      defaults.mouseFalloff,
    ),
    mouseGlowColor: matchedMouseGlowColor(source, defaults.mouseGlowColor),
  };
}

export function inferShaderPreset(source: string): ShaderPreset {
  if (source.includes("length(p)") || source.includes("rings")) return "rings";
  if (/\bfloat\s+pulse\b/.test(source) && source.includes("sin")) return "pulse";
  if (/\bvec2\s+uv\b/.test(source) || /vec4\s*\(\s*uv\s*,/.test(source)) {
    return "coordinates";
  }
  return "solid";
}

export function evaluateShaderPreset(
  preset: ShaderPreset,
  u: number,
  v: number,
  uniforms: UniformSnapshot,
  source = "",
): Rgb {
  const parameters = shaderPreviewParameters(source);
  const x = u * 2 - 1;
  const y = v * 2 - 1;
  if (preset === "solid") return { ...parameters.solidColor };
  if (preset === "coordinates") {
    return { red: clamp01(u), green: clamp01(v), blue: clamp01(parameters.coordinateBlue) };
  }
  if (preset === "pulse") {
    const pulse =
      parameters.pulseBase +
      parameters.pulseAmplitude * Math.sin(uniforms.timeSeconds * parameters.pulseSpeed);
    return {
      red: clamp01(parameters.pulseColor.red * pulse),
      green: clamp01(parameters.pulseColor.green * pulse),
      blue: clamp01(parameters.pulseColor.blue * pulse),
    };
  }
  const distance = Math.hypot(x, y);
  const rings =
    0.5 +
    0.5 *
      Math.cos(distance * parameters.ringFrequency - uniforms.timeSeconds * parameters.ringSpeed);
  const mouseX = uniforms.mouse.x / Math.max(1, uniforms.resolution.x);
  const mouseY = uniforms.mouse.y / Math.max(1, uniforms.resolution.y);
  const mouseGlow = clamp01(1 - Math.hypot(u - mouseX, v - mouseY) * parameters.mouseFalloff);
  return {
    red: clamp01(
      mix(parameters.coldColor.red, parameters.hotColor.red, rings) +
        parameters.mouseGlowColor.red * mouseGlow,
    ),
    green: clamp01(
      mix(parameters.coldColor.green, parameters.hotColor.green, rings) +
        parameters.mouseGlowColor.green * mouseGlow,
    ),
    blue: clamp01(
      mix(parameters.coldColor.blue, parameters.hotColor.blue, rings) +
        parameters.mouseGlowColor.blue * mouseGlow,
    ),
  };
}
