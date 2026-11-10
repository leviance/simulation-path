export const shapeNames = {
  patch: "Mảnh mặt",
  torus: "Torus",
  mobius: "Dải Möbius",
  shell: "Vỏ ốc",
  knot: "Torus knot",
};

export type SurfaceKind = keyof typeof shapeNames;

export interface SurfaceSettings {
  kind: SurfaceKind;
  radius: number;
  thickness: number;
  halfTwists: number;
  uSegments: number;
  vSegments: number;
  shellTurns: number;
  shellGrowth: number;
  knotLobes: number;
  sectionTurns: number;
  patchHeight: number;
  correctKnotSeam: boolean;
  reverseWinding: boolean;
}

// Web teaches the same mesh rules on a smaller grid. Only native uses up to 256 × 256.
export const maxUSegments = 96;
export const maxVSegments = 40;
export const minSweepSegments = 64;

export function usesSweep(kind: SurfaceKind): boolean {
  return kind === "shell" || kind === "knot";
}

export function thicknessLimit(kind: SurfaceKind, radius: number): number {
  if (kind === "shell") return radius * 0.25;
  if (kind === "knot") return radius * 0.18;
  return radius * 0.45;
}

export function presetSettings(kind: SurfaceKind): SurfaceSettings {
  const settings: SurfaceSettings = {
    kind,
    radius: 1.6,
    thickness: 0.42,
    halfTwists: 1,
    uSegments: 48,
    vSegments: 24,
    shellTurns: 2.6,
    shellGrowth: 1.8,
    knotLobes: 3,
    sectionTurns: 0,
    patchHeight: 0.48,
    correctKnotSeam: true,
    reverseWinding: false,
  };
  if (kind === "patch") {
    settings.uSegments = 8;
    settings.vSegments = 6;
  }
  if (kind === "mobius") {
    settings.radius = 1.65;
    settings.thickness = 0.51;
    settings.uSegments = 64;
    settings.vSegments = 12;
  }
  if (kind === "shell") {
    settings.radius = 1.8;
    settings.thickness = 0.29;
    settings.uSegments = 80;
    settings.sectionTurns = 0.35;
  }
  if (kind === "knot") {
    settings.radius = 1.45;
    settings.thickness = 0.17;
    settings.uSegments = 80;
  }
  return settings;
}

function requireRange(value: number, min: number, max: number, label: string) {
  if (!Number.isFinite(value) || value < min || value > max) {
    throw new RangeError(label + " nằm ngoài miền hợp lệ.");
  }
}

export function validateSettings(settings: SurfaceSettings) {
  if (!Object.hasOwn(shapeNames, settings.kind)) throw new RangeError("Không có preset này.");
  const kind = settings.kind;
  const minU = usesSweep(kind) ? minSweepSegments : 8;
  requireRange(settings.radius, 0.6, 4, "Bán kính");
  requireRange(
    settings.thickness,
    0.04,
    thicknessLimit(kind, settings.radius),
    "Bán kính tiết diện",
  );
  requireRange(settings.uSegments, minU, maxUSegments, "Số ô theo u");
  requireRange(settings.vSegments, 4, maxVSegments, "Số ô theo v");
  if (!Number.isInteger(settings.uSegments) || !Number.isInteger(settings.vSegments)) {
    throw new RangeError("Số ô phải là số nguyên.");
  }
  if (kind === "patch") requireRange(settings.patchHeight, 0, 1.6, "Độ cao");
  if (kind === "mobius" && ![1, 3, 5].includes(settings.halfTwists)) {
    throw new RangeError("Möbius dùng 1, 3 hoặc 5 nửa vòng.");
  }
  if (usesSweep(kind)) requireRange(settings.sectionTurns, -2, 2, "Độ xoắn tiết diện");
  if (kind === "shell") {
    requireRange(settings.shellTurns, 1.25, 3.25, "Số vòng vỏ ốc");
    requireRange(settings.shellGrowth, 0.8, 2.5, "Tốc độ nở");
  }
  if (
    kind === "knot" &&
    (![3, 5].includes(settings.knotLobes) || !Number.isInteger(settings.sectionTurns))
  ) {
    throw new RangeError("Knot dùng 3 hoặc 5 múi và số vòng xoắn nguyên.");
  }
}

export function sameSettings(left: SurfaceSettings, right: SurfaceSettings): boolean {
  return (Object.keys(left) as Array<keyof SurfaceSettings>).every(
    (key) => left[key] === right[key],
  );
}
